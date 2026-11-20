"use client";

import { create } from "zustand";
import type { z } from "zod";
import { normalizeCourseCodeClient } from "@/components/shared/constants";
import {
  Course,
  DEFAULT_PROFILE,
  Priority,
  RankResponse,
  type ChatMessage as ChatMessageSchema,
  type ChatResponse,
  type ListingEnrichment,
  type PriorityKey,
  type ProfilePatch,
  type RankRequest,
  type UserProfile,
} from "@/lib/schemas";

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type NextQuestion = ChatResponse["nextQuestion"];

const RANK_DEBOUNCE_MS = 250;

let rankDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let rankAbortController: AbortController | null = null;

interface TerrariumState {
  /* Core in-memory profile & ranking state (never persisted to storage) */
  profile: UserProfile;
  messages: ChatMessage[];
  nextQuestion: NextQuestion;
  chatBootstrapped: boolean;
  rankResponse: RankResponse | null;
  isRanking: boolean;
  rankError: string | null;
  /** The listing open in "house view" (map focused on it + details panel). null = main map. */
  selectedListingId: string | null;
  /** The last listing shown in house view, so the ranked list can return focus to it on close. */
  lastViewedListingId: string | null;
  chatOpen: boolean;
  enrichmentById: Record<string, ListingEnrichment>;

  /* Profile & ranking actions */
  setProfile: (profile: UserProfile) => void;
  patchProfile: (patch: ProfilePatch) => void;
  reorderPriorities: (orderedKeys: PriorityKey[]) => void;
  toggleDealbreaker: (key: PriorityKey) => void;
  addPriority: (key: PriorityKey, dealbreaker?: boolean) => void;
  removePriority: (key: PriorityKey) => void;

  /* Course management actions */
  mergeCourses: (incoming: Course[]) => void;
  upsertCourse: (course: Course, index?: number) => void;
  removeCourse: (index: number) => void;
  confirmCourse: (index: number) => void;
  confirmAllCourses: () => void;

  /* Chat & UI actions */
  appendMessage: (message: ChatMessage) => void;
  setNextQuestion: (q: NextQuestion) => void;
  setChatBootstrapped: (bootstrapped: boolean) => void;
  askChatAboutPlaceCategories: () => void;
  setRankResponse: (res: RankResponse | null) => void;
  ensureRanked: () => void;
  setSelectedListingId: (id: string | null) => void;
  /** Move house view to the previous (-1) or next (+1) listing in rank order. Clamps at the ends. */
  stepSelectedListing: (delta: -1 | 1) => void;
  setChatOpen: (open: boolean) => void;
  cacheEnrichment: (id: string, enrichment: ListingEnrichment) => void;
}

function cleanPatch(patch: ProfilePatch): Partial<UserProfile> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<UserProfile>;
}

export const useTerrarium = create<TerrariumState>()((set, get) => {
  const scheduleRank = (delayMs = RANK_DEBOUNCE_MS) => {
    if (typeof window === "undefined") return;
    if (rankDebounceTimer) {
      clearTimeout(rankDebounceTimer);
      rankDebounceTimer = null;
    }
    set({ isRanking: true, rankError: null });

    rankDebounceTimer = setTimeout(async () => {
      rankDebounceTimer = null;
      if (rankAbortController) {
        rankAbortController.abort();
      }
      const controller = new AbortController();
      rankAbortController = controller;

      const body: z.infer<typeof RankRequest> = { profile: get().profile };
      try {
        const res = await fetch("/api/rank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Ranking request failed (${res.status})`);
        }
        const parsed = RankResponse.parse(await res.json());
        if (!controller.signal.aborted) {
          set({ rankResponse: parsed, isRanking: false, rankError: null });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          set({
            isRanking: false,
            rankError: err instanceof Error ? err.message : "Could not rank listings",
          });
        }
      }
    }, delayMs);
  };

  return {
    profile: DEFAULT_PROFILE,
    messages: [],
    nextQuestion: null,
    chatBootstrapped: false,
    rankResponse: null,
    isRanking: false,
    rankError: null,
    selectedListingId: null,
    lastViewedListingId: null,
    chatOpen: true,
    enrichmentById: {},

    setProfile: (profile) => {
      set({ profile });
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    patchProfile: (patch) => {
      const cleaned = cleanPatch(patch);
      if (Object.keys(cleaned).length === 0) return;
      set((s) => ({
        profile: {
          ...s.profile,
          ...cleaned,
          // Per contract: priorities REPLACES the list when present in patch
          priorities: cleaned.priorities !== undefined ? cleaned.priorities : s.profile.priorities,
        },
      }));
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    reorderPriorities: (orderedKeys) => {
      set((s) => {
        const byKey = new Map(s.profile.priorities.map((p) => [p.key, p]));
        const nextPriorities: Priority[] = orderedKeys
          .map((key) => byKey.get(key))
          .filter((p): p is Priority => Boolean(p))
          .map((p, idx) =>
            Priority.parse({
              ...p,
              rank: idx + 1,
              source: "user_reordered",
            }),
          );
        if (nextPriorities.length === 0) return s;
        return {
          profile: {
            ...s.profile,
            priorities: nextPriorities,
          },
        };
      });
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    toggleDealbreaker: (key) => {
      set((s) => {
        const nextPriorities = s.profile.priorities
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((p, idx) =>
            Priority.parse({
              ...p,
              rank: idx + 1,
              dealbreaker: p.key === key ? !p.dealbreaker : p.dealbreaker,
              source: "user_reordered",
            }),
          );
        return {
          profile: {
            ...s.profile,
            priorities: nextPriorities,
          },
        };
      });
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    addPriority: (key, dealbreaker = false) => {
      set((s) => {
        if (s.profile.priorities.some((p) => p.key === key)) return s;
        const sorted = s.profile.priorities.slice().sort((a, b) => a.rank - b.rank);
        const nextPriorities = [
          ...sorted.map((p, idx) => Priority.parse({ ...p, rank: idx + 1, source: "user_reordered" })),
          Priority.parse({
            key,
            rank: sorted.length + 1,
            dealbreaker,
            source: "user_reordered",
            note: null,
          }),
        ];
        return {
          profile: {
            ...s.profile,
            priorities: nextPriorities,
          },
        };
      });
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    removePriority: (key) => {
      set((s) => {
        if (s.profile.priorities.length <= 1) return s;
        const remaining = s.profile.priorities
          .filter((p) => p.key !== key)
          .sort((a, b) => a.rank - b.rank)
          .map((p, idx) => Priority.parse({ ...p, rank: idx + 1, source: "user_reordered" }));
        return {
          profile: {
            ...s.profile,
            priorities: remaining,
          },
        };
      });
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    mergeCourses: (incoming) => {
      set((s) => {
        const merged = new Map(s.profile.courses.map((c) => [`${c.code}|${c.term}`, c]));
        for (const raw of incoming) {
          const code = normalizeCourseCodeClient(raw.code);
          const parsed = Course.parse({ ...raw, code });
          merged.set(`${parsed.code}|${parsed.term}`, parsed);
        }
        return {
          profile: {
            ...s.profile,
            courses: [...merged.values()],
          },
        };
      });
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    upsertCourse: (course, index) => {
      set((s) => {
        const normalized = Course.parse({
          ...course,
          code: normalizeCourseCodeClient(course.code),
        });
        const next = [...s.profile.courses];
        if (typeof index === "number" && index >= 0 && index < next.length) {
          next[index] = normalized;
        } else {
          const dupIdx = next.findIndex((c) => c.code === normalized.code && c.term === normalized.term);
          if (dupIdx >= 0) next[dupIdx] = normalized;
          else next.push(normalized);
        }
        return {
          profile: {
            ...s.profile,
            courses: next,
          },
        };
      });
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    removeCourse: (index) => {
      set((s) => ({
        profile: {
          ...s.profile,
          courses: s.profile.courses.filter((_, i) => i !== index),
        },
      }));
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    confirmCourse: (index) => {
      set((s) => ({
        profile: {
          ...s.profile,
          courses: s.profile.courses.map((c, i) => (i === index ? { ...c, confirmed: true } : c)),
        },
      }));
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    confirmAllCourses: () => {
      set((s) => ({
        profile: {
          ...s.profile,
          courses: s.profile.courses.map((c) => ({ ...c, confirmed: true })),
        },
      }));
      scheduleRank(RANK_DEBOUNCE_MS);
    },

    appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
    setNextQuestion: (nextQuestion) => set({ nextQuestion }),
    setChatBootstrapped: (chatBootstrapped) => set({ chatBootstrapped }),

    askChatAboutPlaceCategories: () => {
      const placeQuestion: NonNullable<NextQuestion> = {
        text: "Which kinds of places do you want within a short walk?",
        quickReplies: ["Grocery stores", "Cafes", "Restaurants and bars", "Gyms", "None of these"],
      };
      set((s) => {
        const lastAssistant = [...s.messages].reverse().find((m) => m.role === "assistant");
        const alreadyAsking = lastAssistant?.text === placeQuestion.text;
        return {
          chatOpen: true,
          nextQuestion: placeQuestion,
          chatBootstrapped: true,
          messages: alreadyAsking
            ? s.messages
            : [...s.messages, { role: "assistant", text: placeQuestion.text }],
        };
      });
    },

    setRankResponse: (rankResponse) => set({ rankResponse, isRanking: false }),

    ensureRanked: () => {
      const { rankResponse, isRanking } = get();
      if (!rankResponse && !isRanking && !rankDebounceTimer) {
        scheduleRank(0);
      }
    },

    setSelectedListingId: (selectedListingId) =>
      set((s) => ({
        selectedListingId,
        lastViewedListingId: selectedListingId ?? s.selectedListingId ?? s.lastViewedListingId,
      })),
    stepSelectedListing: (delta) => {
      const { rankResponse, selectedListingId } = get();
      const results = rankResponse?.results ?? [];
      if (!selectedListingId || results.length === 0) return;
      const idx = results.findIndex((r) => r.listing.id === selectedListingId);
      if (idx < 0) return;
      const next = Math.max(0, Math.min(results.length - 1, idx + delta));
      if (next === idx) return;
      const id = results[next].listing.id;
      set({ selectedListingId: id, lastViewedListingId: id });
    },
    setChatOpen: (chatOpen) => set({ chatOpen }),
    cacheEnrichment: (id, enrichment) =>
      set((s) => ({ enrichmentById: { ...s.enrichmentById, [id]: enrichment } })),
  };
});
