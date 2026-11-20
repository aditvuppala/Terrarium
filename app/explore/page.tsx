"use client";

import { useEffect } from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import ExploreFooter from "@/components/explore/ExploreFooter";
import ExploreHeader from "@/components/explore/ExploreHeader";
import ListingCard from "@/components/listing/ListingCard";
import MapPanel from "@/components/map/MapPanel";
import { WarningIcon } from "@/components/ui/Icons";
import { useTerrarium } from "@/lib/store";

export default function ExplorePage() {
  const ensureRanked = useTerrarium((s) => s.ensureRanked);
  const nearMissesOnly = useTerrarium((s) => s.rankResponse?.nearMissesOnly ?? false);
  const rankError = useTerrarium((s) => s.rankError);
  const chatOpen = useTerrarium((s) => s.chatOpen);

  useEffect(() => {
    ensureRanked();
  }, [ensureRanked]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F3F5EF] text-[#16241B] min-[1000px]:h-screen min-[1000px]:overflow-hidden">
      {/* Header: Confidence Meter + Drag-to-Reorder Priorities Strip */}
      <ExploreHeader />

      {/* Near-Misses Dealbreaker Banner */}
      {nearMissesOnly && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2.5 border-b border-[#DFB391] bg-[#FBF1E8] px-4 py-2.5 text-sm font-semibold text-[#7A3415] sm:px-6"
        >
          <WarningIcon size={18} className="shrink-0" />
          <span>Nothing meets all your dealbreakers. These are the closest matches.</span>
        </div>
      )}

      {rankError && (
        <div
          role="alert"
          className="border-b border-[#E2B4B1] bg-[#FBECEB] px-4 py-2 text-xs font-medium text-[#84231F] sm:px-6"
        >
          {rankError}
        </div>
      )}

      {/* Main 60/40 Split Workspace (stacks vertically under 1000px) */}
      <main className="flex flex-1 flex-col min-[1000px]:min-h-0 min-[1000px]:flex-row">
        <section
          aria-label="Ranked Ann Arbor housing map"
          className={`relative h-[58vh] min-h-[380px] w-full min-[1000px]:h-full min-[1000px]:min-h-0 ${
            chatOpen ? "min-[1000px]:w-3/5" : "min-[1000px]:flex-1"
          }`}
        >
          <MapPanel />
          <ListingCard />
        </section>

        <ChatPanel />
      </main>

      {/* Credits & Provenance Footer */}
      <ExploreFooter />
    </div>
  );
}
