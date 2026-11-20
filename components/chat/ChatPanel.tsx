"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import CourseManager from "@/components/chat/CourseManager";
import {
  EMPTY_MESSAGES,
  countQuestionsLeft,
  extractMockFallbackPatch,
} from "@/components/shared/constants";
import {
  ChatBubbleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SendIcon,
} from "@/components/ui/Icons";
import { ChatResponse, type ChatRequest } from "@/lib/schemas";
import { useTerrarium, type ChatMessage } from "@/lib/store";

export default function ChatPanel() {
  const profile = useTerrarium((s) => s.profile);
  const messages = useTerrarium((s) => s.messages ?? EMPTY_MESSAGES);
  const nextQuestion = useTerrarium((s) => s.nextQuestion);
  const chatBootstrapped = useTerrarium((s) => s.chatBootstrapped);
  const chatOpen = useTerrarium((s) => s.chatOpen);

  const appendMessage = useTerrarium((s) => s.appendMessage);
  const setNextQuestion = useTerrarium((s) => s.setNextQuestion);
  const setChatBootstrapped = useTerrarium((s) => s.setChatBootstrapped);
  const patchProfile = useTerrarium((s) => s.patchProfile);
  const setChatOpen = useTerrarium((s) => s.setChatOpen);

  const [draft, setDraft] = useState<string>("");
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const questionsLeft = useMemo(
    () => countQuestionsLeft(profile, messages, nextQuestion !== null),
    [profile, messages, nextQuestion],
  );

  /* Bootstrap initial deterministic question on first visit to /explore */
  useEffect(() => {
    // Read the live store value, not the render-time one: effects can run twice
    // (React dev double-mount, or two mounted panels) before a re-render.
    if (chatBootstrapped || useTerrarium.getState().chatBootstrapped) return;
    setChatBootstrapped(true);

    const state = useTerrarium.getState();
    const body: z.infer<typeof ChatRequest> = {
      profile: state.profile,
      messages: state.messages,
    };

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`chat ${res.status}`))))
      .then((json) => {
        const parsed = ChatResponse.parse(json);
        const isMockCanned = parsed.reply.startsWith("(Mock reply:");
        const intro = isMockCanned
          ? "Hi! Answer a few quick questions below (or type anything in your own words) and we will refine your housing rankings live."
          : parsed.reply;
        appendMessage({ role: "assistant", text: intro });
        if (parsed.nextQuestion) {
          appendMessage({ role: "assistant", text: parsed.nextQuestion.text });
          setNextQuestion(parsed.nextQuestion);
        }
        if (Object.keys(parsed.profilePatch).length > 0) {
          patchProfile(parsed.profilePatch);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [chatBootstrapped, setChatBootstrapped, appendMessage, setNextQuestion, patchProfile]);

  /* Scroll newest message into view */
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending]);

  async function sendUserText(rawText: string) {
    const content = rawText.trim();
    if (!content || pending) return;

    // Special convenience if user clicks "Upload Backpack screenshot" quick-reply chip
    if (/^upload backpack screenshot$/i.test(content)) {
      const fileEl = document.getElementById("backpack-file-upload") as HTMLInputElement | null;
      fileEl?.click();
    }

    const previousQuestionText = nextQuestion?.text ?? null;
    const userMsg: ChatMessage = { role: "user", text: content };
    const preSendState = useTerrarium.getState();
    const historyWithUser = [...preSendState.messages, userMsg];

    appendMessage(userMsg);
    setNextQuestion(null);
    setDraft("");
    setPending(true);
    setError(null);

    try {
      // Check if mock fallback applies before/after calling /api/chat
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: preSendState.profile,
          messages: historyWithUser,
        } satisfies z.infer<typeof ChatRequest>),
      });
      if (!res.ok) throw new Error(`Chat request failed (${res.status})`);
      const reply = ChatResponse.parse(await res.json());

      // Determine effective patch: always trust server profilePatch; if running in mock mode
      // (where server returns mockChat.reply + {}), extract simple user answers deterministically
      // so mock mode updates profile & re-ranks pins smoothly.
      let effectivePatch = reply.profilePatch;
      const isMockReply =
        reply.reply.startsWith("(Mock reply:") &&
        Object.keys(reply.profilePatch).length === 0;

      if (isMockReply) {
        effectivePatch = extractMockFallbackPatch(
          content,
          previousQuestionText,
          preSendState.profile,
        );
      }

      appendMessage({ role: "assistant", text: reply.reply });

      if (Object.keys(effectivePatch).length > 0) {
        patchProfile(effectivePatch);
      }

      if (reply.nextQuestion) {
        appendMessage({ role: "assistant", text: reply.nextQuestion.text });
        setNextQuestion(reply.nextQuestion);
      } else {
        setNextQuestion(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong sending your message.");
    } finally {
      setPending(false);
    }
  }

  /* Slim Collapsed Right Rail */
  if (!chatOpen) {
    return (
      <aside
        aria-label="Collapsed housing assistant rail"
        className="flex w-full items-center justify-between border-t border-[#C8D3C1] bg-[#FCFDFB] px-3 py-2 min-[1000px]:h-full min-[1000px]:w-14 min-[1000px]:flex-col min-[1000px]:border-l min-[1000px]:border-t-0 min-[1000px]:px-1.5 min-[1000px]:py-4"
      >
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label={`Expand chat assistant (${questionsLeft} ${questionsLeft === 1 ? "question" : "questions"} left)`}
          className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#E6ECE1] px-3 py-2 text-xs font-semibold text-[#16241B] hover:bg-[#DFEAE2] min-[1000px]:w-11 min-[1000px]:flex-col min-[1000px]:px-1 min-[1000px]:py-3"
        >
          <ChevronLeftIcon size={16} className="hidden min-[1000px]:block" />
          <ChatBubbleIcon size={20} className="shrink-0 text-[#2F6B47]" />
          <span className="min-[1000px]:[writing-mode:vertical-rl] min-[1000px]:rotate-180">
            {questionsLeft} {questionsLeft === 1 ? "question" : "questions"} left
          </span>
        </button>
      </aside>
    );
  }

  return (
    <section
      aria-label="Housing assistant chat"
      className="flex h-full min-h-[440px] w-full flex-col border-t border-[#C8D3C1] bg-[#FCFDFB] min-[1000px]:min-h-0 min-[1000px]:w-2/5 min-[1000px]:border-l min-[1000px]:border-t-0"
    >
      {/* Chat Panel Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#C8D3C1] bg-[#F3F5EF] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <ChatBubbleIcon size={19} className="text-[#2F6B47]" />
          <div>
            <h2 className="font-heading text-base font-bold leading-tight text-[#16241B]">
              Housing assistant
            </h2>
            <p className="text-xs text-[#3D5245]">
              {questionsLeft > 0
                ? `${questionsLeft} ${questionsLeft === 1 ? "question" : "questions"} left to sharpen fit`
                : "Profile complete — keep chatting anytime"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setChatOpen(false)}
          aria-label="Collapse chat to right rail"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-3 text-xs font-semibold text-[#16241B] hover:bg-[#E6ECE1]"
        >
          <span className="hidden sm:inline">Collapse</span>
          <ChevronRightIcon size={16} />
        </button>
      </div>

      {/* Backpack Screenshot Upload + Confirmable Course List */}
      <CourseManager />

      {/* Message History (assistant left, user right, newest at bottom) */}
      <div
        role="log"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const isLatestQuestion =
            !isUser &&
            idx === messages.length - 1 &&
            nextQuestion !== null &&
            msg.text === nextQuestion.text;

          return (
            <div key={idx} className="space-y-2">
              <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "rounded-br-sm bg-[#2F6B47] text-white"
                      : "rounded-bl-sm border border-[#C8D3C1] bg-[#F3F5EF] text-[#16241B]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>

              {/* Quick-Reply Chips for the active nextQuestion */}
              {isLatestQuestion && nextQuestion && nextQuestion.quickReplies.length > 0 && (
                <div
                  role="group"
                  aria-label="Suggested quick replies"
                  className="flex flex-wrap gap-2 pl-1 pt-0.5"
                >
                  {nextQuestion.quickReplies.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={pending}
                      onClick={() => void sendUserText(chip)}
                      className="inline-flex min-h-[44px] items-center rounded-full border border-[#2F6B47] bg-[#FCFDFB] px-4 py-2 text-xs font-semibold text-[#16241B] transition-colors hover:bg-[#2F6B47] hover:text-white disabled:opacity-45"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-[#C8D3C1] bg-[#F3F5EF] px-4 py-2.5 text-xs font-medium text-[#3D5245]">
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#E2B4B1] bg-[#FBECEB] px-3.5 py-2.5 text-xs font-medium text-[#84231F]"
          >
            {error}
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Free-text Input + Send Button (Enter sends) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendUserText(draft);
        }}
        className="flex items-center gap-2 border-t border-[#C8D3C1] bg-[#F3F5EF] p-3"
      >
        <label htmlFor="terrarium-chat-input" className="sr-only">
          Tell Terrarium about your housing preferences
        </label>
        <input
          id="terrarium-chat-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tell us budget, roommates, must-haves..."
          className="min-h-[46px] flex-1 rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-3.5 text-sm text-[#16241B] placeholder:text-[#3D5245]/70 focus:border-[#2F6B47] focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          aria-label="Send message"
          className="inline-flex min-h-[46px] min-w-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#2F6B47] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#245538] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <SendIcon size={17} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </section>
  );
}
