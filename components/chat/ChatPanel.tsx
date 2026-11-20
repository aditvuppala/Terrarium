"use client";

import { useState } from "react";
import { ChatResponseSchema, type ChatMessage, type ChatRequest } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

/** STUB chat panel: message list + input that calls /api/chat. */
export default function ChatPanel() {
  const messages = useTerrarium((s) => s.messages);
  const append = useTerrarium((s) => s.appendMessage);
  const patchProfile = useTerrarium((s) => s.patchProfile);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const content = draft.trim();
    if (!content || pending) return;
    const userMsg: ChatMessage = { role: "user", content };
    append(userMsg);
    setDraft("");
    setPending(true);
    setError(null);

    const { profile, selectedListingId } = useTerrarium.getState();
    const body: ChatRequest = { messages: [...messages, userMsg], profile, selectedListingId };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`chat ${res.status}`);
      const reply = ChatResponseSchema.parse(await res.json());
      append(reply.message);
      if (reply.profilePatch) patchProfile(reply.profilePatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <li key={i} className={m.role === "user" ? "text-right" : ""}>
            <span className="inline-block rounded border px-3 py-2">{m.content}</span>
          </li>
        ))}
        {pending && <li className="text-sm">…</li>}
        {error && <li className="text-sm text-red-600">{error}</li>}
      </ul>
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about housing…"
          className="flex-1 rounded border px-2 py-1"
        />
        <button type="submit" disabled={pending} className="rounded border px-3 py-1 disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
