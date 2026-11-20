/**
 * POST /api/chat  ChatRequest -> ChatResponse
 *
 * Mocks (NEXT_PUBLIC_USE_MOCKS=true or no Gemini key): canned reply, empty patch,
 * but a REAL deterministic nextQuestion, so the frontend can build the full flow.
 * Otherwise Gemini extracts the patch and phrases the reply; the server picks the field.
 * On Gemini failure (after one retry): "Sorry, could you rephrase that?" + deterministic question.
 */
import { jsonError, jsonOk, readJson, serverError } from "@/lib/api";
import { applyPatch, geminiChat, nextField, questionFor, sanitizePatch, type ChatResponseT } from "@/lib/chat";
import { getBuildings } from "@/lib/data";
import { shouldUseMocks } from "@/lib/gemini";
import { ChatRequest, ChatResponse } from "@/lib/schemas";
import mockChat from "@/mocks/chat.json";

export async function POST(req: Request) {
  const parsed = ChatRequest.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "Invalid ChatRequest", parsed.error.issues);
  const body = parsed.data;

  try {
    if (shouldUseMocks()) {
      const res: ChatResponseT = {
        reply: mockChat.reply,
        profilePatch: {},
        nextQuestion: questionFor(nextField(body.profile, body.messages), body.profile),
      };
      return jsonOk(ChatResponse, res);
    }

    const buildings = await getBuildings();
    const plannedNext = nextField(body.profile, body.messages);
    const out = await geminiChat(body, buildings);

    if (!out) {
      return jsonOk(ChatResponse, {
        reply: "Sorry, could you rephrase that?",
        profilePatch: {},
        nextQuestion: questionFor(plannedNext, body.profile),
      });
    }

    const patch = sanitizePatch(out.profilePatch, body.profile, buildings);
    const updated = applyPatch(body.profile, patch);
    // If the user already answered the planned field (e.g. volunteered it), move on deterministically.
    const actualNext = nextField(updated, body.messages);
    const nextQuestion = actualNext === plannedNext && out.nextQuestion ? out.nextQuestion : questionFor(actualNext, updated);

    return jsonOk(ChatResponse, { reply: out.reply, profilePatch: patch, nextQuestion });
  } catch (err) {
    return serverError(err);
  }
}
