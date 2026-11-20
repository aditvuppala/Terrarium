/** Small helpers shared by route handlers. Server-only. */
import type { z } from "zod";

/** Error body for every non-2xx response. (Not part of lib/schemas.ts; frontend should just read `error`.) */
export interface ApiError {
  error: string;
  details?: unknown;
}

export function jsonError(status: number, error: string, details?: unknown): Response {
  const body: ApiError = details === undefined ? { error } : { error, details };
  return Response.json(body, { status });
}

/** Validate an outgoing payload; a failure here is a server bug (500), not a client error. */
export function jsonOk<T extends z.ZodType>(schema: T, data: z.input<T>): Response {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error("Response failed schema validation", parsed.error.issues);
    return jsonError(500, "Response failed schema validation", parsed.error.issues);
  }
  return Response.json(parsed.data);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

/** Turn a thrown error into a 500 with a readable message (e.g. "run npm run db:build"). */
export function serverError(err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  console.error(err);
  return jsonError(500, message);
}
