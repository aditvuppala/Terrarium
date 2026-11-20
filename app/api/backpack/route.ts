/**
 * POST /api/backpack  multipart/form-data, field "image" (PNG/JPEG, <= 5 MB) -> BackpackResponse
 *
 * Gemini reads course codes, the term (if visible), and building/room (if visible).
 * Courses without a building get a guess from data/course-buildings.json (source "guess").
 * Everything returned is confirmed: false. The image is never stored.
 * Mocks (NEXT_PUBLIC_USE_MOCKS=true or no Gemini key): mocks/backpack.json.
 */
import { z } from "zod";
import { jsonError, jsonOk, serverError } from "@/lib/api";
import { guessBuilding, normalizeCourseCode } from "@/lib/chat";
import { getBuildings } from "@/lib/data";
import { generateJson, shouldUseMocks } from "@/lib/gemini";
import { BackpackResponse, type Course } from "@/lib/schemas";
import mockBackpack from "@/mocks/backpack.json";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

const VisionOutput = z.object({
  courses: z.array(
    z.object({
      code: z.string().min(2),
      term: z.enum(["current", "next", "unknown"]),
      buildingCode: z.string().nullable(),
      buildingText: z.string().nullable(),
      room: z.string().nullable(),
    }),
  ),
  unreadable: z.array(z.string()),
});

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "Expected multipart/form-data with an `image` field");
  }
  const image = form.get("image");
  if (!(image instanceof File)) return jsonError(400, "`image` file is required");
  if (!TYPES.has(image.type)) return jsonError(415, "Image must be PNG or JPEG");
  if (image.size > MAX_BYTES) return jsonError(413, "Image must be 5 MB or smaller");

  try {
    if (shouldUseMocks()) return jsonOk(BackpackResponse, BackpackResponse.parse(mockBackpack));

    const buildings = await getBuildings();
    const known = new Set(buildings.map((b) => b.code));
    // Read into memory only; never written anywhere.
    const data = Buffer.from(await image.arrayBuffer()).toString("base64");

    const out = await generateJson({
      system: `You read screenshots of University of Michigan class schedules (Wolverine Access / Backpack).
List every course you can see. Rules:
- code: subject + number, e.g. "EECS 281". Skip discussion/lab duplicates of the same course.
- term: "current" or "next" only if the screenshot shows which term it is relative to the other courses (e.g. two terms side by side, Fall vs Winter); otherwise "unknown".
- buildingText: the building/location text exactly as shown, or null if not visible. room: room number if visible.
- buildingCode: the matching code from this list ONLY if the location clearly matches; otherwise null:
${buildings.map((b) => `${b.code} = ${b.name}`).join("\n")}
- unreadable: short notes for anything you could not read (e.g. "Third course code is cut off").
Do not guess course codes or buildings that are not visible.`,
      parts: [{ inlineData: { mimeType: image.type === "image/jpg" ? "image/jpeg" : image.type, data } }, { text: "Extract the courses from this schedule." }],
      schema: VisionOutput,
      temperature: 0,
      label: "backpack",
    });

    if (!out) {
      return jsonOk(BackpackResponse, { courses: [], warnings: ["Couldn't read this screenshot. Try a clearer image, or type your classes instead."] });
    }

    const warnings = [...out.unreadable];
    const courses = new Map<string, Course>();
    for (const c of out.courses) {
      const code = normalizeCourseCode(c.code);
      const term: Course["term"] = c.term === "next" ? "next" : "current";
      let buildingCode = c.buildingCode && known.has(c.buildingCode) ? c.buildingCode : null;
      let source: Course["source"] = "backpack_screenshot";
      if (!buildingCode) {
        if (c.buildingText) warnings.push(`Couldn't match "${c.buildingText}" for ${code} to a building we know.`);
        buildingCode = guessBuilding(code, known);
        if (buildingCode) source = "guess";
        else warnings.push(`Couldn't find a building for ${code}.`);
      }
      courses.set(`${code}|${term}`, { code, term, buildingCode, source, confirmed: false });
    }
    if (out.courses.some((c) => c.term === "unknown")) warnings.push("Couldn't tell which term some classes are for; we assumed this term.");
    const guessed = [...courses.values()].filter((c) => c.source === "guess").map((c) => c.code);
    if (guessed.length) warnings.push(`We guessed the building for ${guessed.join(", ")} from the subject. Please confirm.`);
    if (courses.size === 0) warnings.push("We didn't find any course codes in this image.");

    return jsonOk(BackpackResponse, { courses: [...courses.values()], warnings });
  } catch (err) {
    return serverError(err);
  }
}
