/**
 * Thin Gemini wrapper (server/scripts only; reads GEMINI_API_KEY).
 *
 * generateJson():
 *   1. asks for application/json with a JSON Schema derived from the Zod schema;
 *   2. if the API rejects that schema, retries with the shape described in the prompt;
 *   3. always validates with Zod; on a validation failure retries once;
 *   4. returns null if it still fails, so callers fall back deterministically.
 */
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { z } from "zod";

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

/** Returns null when Gemini isn't configured, so callers can fall back. */
export function getGeminiConfig(): GeminiConfig | null {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

/**
 * Claude (Anthropic) as an alternative provider. When ANTHROPIC_API_KEY is set it
 * takes precedence over Gemini. ANTHROPIC_MODEL is optional (default below).
 */
const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";
export function getClaudeConfig(): { model: string } | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return { model: process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL };
}

/** Mocks are used when explicitly requested or when no model provider is configured. */
export function shouldUseMocks(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true" || (getGeminiConfig() === null && getClaudeConfig() === null);
}

let anthropic: Anthropic | null = null;

/** Gemini-style parts -> Claude content blocks (text, images, PDFs). */
function toClaudeContent(parts: Part[]): Anthropic.ContentBlockParam[] {
  const out: Anthropic.ContentBlockParam[] = [];
  for (const p of parts) {
    if (p.inlineData?.data && p.inlineData.mimeType) {
      const { mimeType, data } = p.inlineData;
      if (mimeType === "application/pdf") {
        out.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
      } else {
        out.push({
          type: "image",
          source: { type: "base64", media_type: mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp", data },
        });
      }
    } else if (p.text) {
      out.push({ type: "text", text: p.text });
    }
  }
  return out;
}

/** One Claude call; returns the response text (JSON is requested via the system prompt). */
async function callClaude(
  model: string,
  system: string,
  history: { role: "user" | "model"; text: string }[],
  parts: Part[],
): Promise<string> {
  anthropic ??= new Anthropic();
  const messages: Anthropic.MessageParam[] = history.map((h) => ({
    role: h.role === "model" ? "assistant" : "user",
    content: h.text,
  }));
  if (messages[0]?.role === "assistant") messages.unshift({ role: "user", content: "(start of conversation)" });
  messages.push({ role: "user", content: toClaudeContent(parts) });
  // Streaming avoids HTTP timeouts on long outputs (e.g. a full lease transcription).
  const msg = await anthropic.messages
    .stream({
      model,
      max_tokens: 32000,
      system,
      output_config: { effort: "low" },
      messages,
    })
    .finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("model declined the request");
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

let client: { key: string; ai: GoogleGenAI } | null = null;
function getClient(cfg: GeminiConfig): GoogleGenAI {
  if (!client || client.key !== cfg.apiKey) client = { key: cfg.apiKey, ai: new GoogleGenAI({ apiKey: cfg.apiKey }) };
  return client.ai;
}

export interface GenerateJsonOptions<T extends z.ZodType> {
  system: string;
  /** Earlier conversation turns (optional), oldest first. */
  history?: { role: "user" | "model"; text: string }[];
  /** Text and/or inline image parts for the final user turn. */
  parts: Part[];
  schema: T;
  temperature?: number;
  /** Log label for debugging. */
  label?: string;
}

/** Gemini wants alternating turns starting with "user"; merge/pad as needed. */
function toContents(history: { role: "user" | "model"; text: string }[]): Content[] {
  const out: Content[] = [];
  for (const h of history) {
    const last = out[out.length - 1];
    if (last && last.role === h.role) last.parts!.push({ text: h.text });
    else out.push({ role: h.role, parts: [{ text: h.text }] });
  }
  if (out[0]?.role === "model") out.unshift({ role: "user", parts: [{ text: "(start of conversation)" }] });
  // The final turn we add is "user"; avoid two user turns in a row.
  if (out[out.length - 1]?.role === "user") out.push({ role: "model", parts: [{ text: "(waiting for your next message)" }] });
  return out;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  return JSON.parse(trimmed);
}

function isSchemaRejection(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /schema/i.test(msg) && !/api key/i.test(msg);
}

let schemaUnsupported = false;

export async function generateJson<T extends z.ZodType>(opts: GenerateJsonOptions<T>): Promise<z.infer<T> | null> {
  const claude = getClaudeConfig();
  const cfg = getGeminiConfig();
  if (!claude && !cfg) return null;
  const jsonSchema = z.toJSONSchema(opts.schema, { target: "draft-7", unrepresentable: "any" });

  if (claude) {
    const system = `${opts.system}

Respond with ONLY a JSON value (no prose, no code fences) matching this JSON Schema:
${JSON.stringify(jsonSchema)}`;
    return retryValidate(opts, (extraNote) =>
      callClaude(claude.model, system, opts.history ?? [], extraNote ? [...opts.parts, { text: extraNote }] : opts.parts),
    );
  }
  const ai = getClient(cfg!);

  const call = async (withSchema: boolean, extraNote?: string): Promise<string> => {
    const system = withSchema
      ? opts.system
      : `${opts.system}\n\nRespond with ONLY a JSON value matching this JSON Schema:\n${JSON.stringify(jsonSchema)}`;
    const parts = extraNote ? [...opts.parts, { text: extraNote }] : opts.parts;
    const res = await ai.models.generateContent({
      model: cfg!.model,
      contents: [...toContents(opts.history ?? []), { role: "user", parts }],
      config: {
        systemInstruction: system,
        temperature: opts.temperature ?? 0.2,
        responseMimeType: "application/json",
        ...(withSchema ? { responseJsonSchema: jsonSchema } : {}),
      },
    });
    return res.text ?? "";
  };

  const attempt = async (extraNote?: string): Promise<string> => {
    if (!schemaUnsupported) {
      try {
        return await call(true, extraNote);
      } catch (err) {
        if (!isSchemaRejection(err)) throw err;
        console.warn(`[gemini${opts.label ? `:${opts.label}` : ""}] schema rejected, describing it in the prompt instead`);
        schemaUnsupported = true;
      }
    }
    return call(false, extraNote);
  };

  return retryValidate(opts, attempt);
}

/** Call, parse JSON, validate with Zod; retry once with the validation error; null on failure. */
async function retryValidate<T extends z.ZodType>(
  opts: GenerateJsonOptions<T>,
  attempt: (extraNote?: string) => Promise<string>,
): Promise<z.infer<T> | null> {
  let lastError = "";
  for (let i = 0; i < 2; i++) {
    try {
      const text = await attempt(i === 0 ? undefined : `Your previous answer was invalid (${lastError}). Return valid JSON only.`);
      const parsed = opts.schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).slice(0, 3).join("; ");
    } catch (err) {
      // JSON parse errors can quote the model's output (e.g. lease text): never log that.
      lastError = err instanceof SyntaxError ? "invalid JSON" : err instanceof Error ? err.message : String(err);
    }
    console.warn(`[llm${opts.label ? `:${opts.label}` : ""}] attempt ${i + 1} failed: ${lastError}`);
  }
  return null;
}
