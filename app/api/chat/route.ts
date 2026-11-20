import { jsonError, jsonOk, readJson } from "@/lib/api";
import { shouldUseMocks } from "@/lib/gemini";
import { ChatRequestSchema, ChatResponseSchema } from "@/lib/schemas";
import mockChat from "@/mocks/chat.json";

export async function POST(req: Request) {
  const parsed = ChatRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "Invalid ChatRequest", parsed.error.issues);

  // JSON imports widen literals (role: string), so parse the mock before returning it.
  if (shouldUseMocks()) return jsonOk(ChatResponseSchema, ChatResponseSchema.parse(mockChat));

  return jsonError(501, "Gemini chat not implemented yet");
}
