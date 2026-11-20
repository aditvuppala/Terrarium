/**
 * Thin Gemini wrapper. NOT CALLED YET: /api/chat serves mocks/chat.json.
 * Server-only: never import from a client component (it reads the API key).
 */

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

/** Returns null when Gemini isn't configured, so callers can fall back to mocks. */
export function getGeminiConfig(): GeminiConfig | null {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

export function shouldUseMocks(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true" || !process.env.GEMINI_API_KEY;
}

/** Placeholder for the real call (REST or @google/genai). */
export async function generate(_prompt: string): Promise<string> {
  throw new Error("lib/gemini.ts: generate() is not implemented yet");
}
