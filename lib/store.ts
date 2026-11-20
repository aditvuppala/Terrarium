"use client";

import { create } from "zustand";
import type { z } from "zod";
import { DEFAULT_PROFILE, type ChatMessage as ChatMessageSchema, type RankResponse, type UserProfile } from "@/lib/schemas";

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

interface TerrariumState {
  profile: UserProfile;
  messages: ChatMessage[];
  rankResponse: RankResponse | null;
  selectedListingId: string | null;
  chatOpen: boolean;

  setProfile: (profile: UserProfile) => void;
  patchProfile: (patch: Partial<UserProfile>) => void;
  appendMessage: (message: ChatMessage) => void;
  setRankResponse: (res: RankResponse | null) => void;
  setSelectedListingId: (id: string | null) => void;
  setChatOpen: (open: boolean) => void;
}

export const useTerrarium = create<TerrariumState>()((set) => ({
  profile: DEFAULT_PROFILE,
  messages: [],
  rankResponse: null,
  selectedListingId: null,
  chatOpen: true,

  setProfile: (profile) => set({ profile }),
  patchProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
  appendMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  setRankResponse: (rankResponse) => set({ rankResponse }),
  setSelectedListingId: (selectedListingId) => set({ selectedListingId }),
  setChatOpen: (chatOpen) => set({ chatOpen }),
}));
