/**
 * POST /api/lease -> LeaseReviewResponse
 *   multipart/form-data, field "file": the lease (PDF, PNG or JPEG, <= 10 MB), or
 *   application/json LeaseSampleRequest {"sample": true}: review the built-in fictional sample lease.
 *
 * Gemini does two narrow jobs: (1) transcribe the lease, (2) map clauses to rule ids from
 * lib/lease/rules.ts with exact quotes. lib/lease/review.ts drops unknown rule ids and quotes
 * that aren't in the text, and runs the deterministic checks.
 * Errors: 415 wrong type, 413 too big, 422 unreadable / not a lease.
 * Privacy: the file and its text live in memory for this request only. Never stored, never logged.
 * Mocks (NEXT_PUBLIC_USE_MOCKS=true or no Gemini key): mocks/lease.json, still run through review.ts.
 */
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { generateJson, shouldUseMocks } from "@/lib/gemini";
import { EXTRACT_SYSTEM, ExtractOutput, MapOutput, mapSystemPrompt } from "@/lib/lease/model";
import { buildReview } from "@/lib/lease/review";
import { LeaseReviewResponse, LeaseSampleRequest } from "@/lib/schemas";
import mockLease from "@/mocks/lease.json";

const MAX_BYTES = 10 * 1024 * 1024;
const MIN_TEXT_CHARS = 200;

type Kind = "application/pdf" | "image/png" | "image/jpeg";

/** Trust the bytes, not just the browser's label. */
function sniff(bytes: Uint8Array): Kind | null {
  const starts = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
  if (starts([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  return null;
}

const TYPE_ERROR = "Please upload a PDF, PNG or JPEG. (iPhone photos in HEIC: take a screenshot of the photo, or set Camera > Formats to Most Compatible.)";

function mockMapping() {
  return MapOutput.parse({ findings: mockLease.findings, amounts: mockLease.amounts });
}

/** Never let an internal error message (which could echo lease text) reach logs or the client. */
function failed(where: string): Response {
  console.error(`[lease] ${where} failed`);
  return jsonError(500, "Something went wrong reviewing this lease. Please try again.");
}

async function mapClauses(text: string): Promise<MapOutput | null> {
  return generateJson({
    system: mapSystemPrompt(),
    parts: [{ text: `LEASE TEXT:\n<<<\n${text}\n>>>` }],
    schema: MapOutput,
    temperature: 0,
    label: "lease-map",
  });
}

async function reviewSample(): Promise<Response> {
  const text = mockLease.text;
  if (shouldUseMocks()) {
    return jsonOk(LeaseReviewResponse, buildReview({ text, mapping: mockMapping(), source: "sample", demo: true }));
  }
  const mapping = await mapClauses(text);
  return jsonOk(
    LeaseReviewResponse,
    buildReview({
      text,
      mapping: mapping ?? mockMapping(),
      source: "sample",
      demo: mapping === null,
      warnings: mapping === null ? ["The AI reviewer didn't respond, so this shows our saved review of the sample lease."] : [],
    }),
  );
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const parsed = LeaseSampleRequest.safeParse(await readJson(req));
    if (!parsed.success) return jsonError(400, "Expected {\"sample\": true} or a multipart upload", parsed.error.issues);
    try {
      return await reviewSample();
    } catch {
      return failed("sample review");
    }
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "Expected multipart/form-data with a `file` field");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(400, "`file` is required");
  if (file.size > MAX_BYTES) return jsonError(413, "That file is over 10 MB. Try a smaller PDF, or photos of the pages one at a time.");
  if (file.size === 0) return jsonError(422, "That file is empty.");

  // Read into memory only; never written anywhere.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return jsonError(415, TYPE_ERROR);

  try {
    if (shouldUseMocks()) {
      return jsonOk(
        LeaseReviewResponse,
        buildReview({
          text: mockLease.text,
          mapping: mockMapping(),
          source: "sample",
          demo: true,
          warnings: ["Demo mode: the AI reader is off, so we didn't read your file. This is the review of our fictional sample lease."],
        }),
      );
    }

    const extracted = await generateJson({
      system: EXTRACT_SYSTEM,
      parts: [{ inlineData: { mimeType: kind, data: Buffer.from(bytes).toString("base64") } }, { text: "Transcribe this lease." }],
      schema: ExtractOutput,
      temperature: 0,
      label: "lease-extract",
    });
    if (!extracted) return jsonError(422, "We couldn't read this file. Try a clearer photo or the original PDF.");
    const text = extracted.text.trim();
    if (!extracted.isLease) return jsonError(422, "This doesn't look like a lease. Upload the rental agreement itself.");
    if (!extracted.readable || text.length < MIN_TEXT_CHARS) {
      return jsonError(422, "We couldn't read enough of this file. Try a sharper, well-lit photo, or the original PDF.");
    }

    const mapping = await mapClauses(text);
    const warnings = extracted.problems.slice(0, 5);
    if (kind !== "application/pdf") warnings.push("This was a photo, so we only checked the page(s) in it.");
    if (!mapping) warnings.push("The clause check didn't finish, so only the automatic number checks ran. Try again in a minute.");

    return jsonOk(LeaseReviewResponse, buildReview({ text, mapping, source: "upload", demo: false, warnings }));
  } catch {
    return failed("upload review");
  }
}
