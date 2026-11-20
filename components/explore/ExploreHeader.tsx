"use client";

import Link from "next/link";
import PriorityStrip from "@/components/explore/PriorityStrip";
import ToolsMenu from "@/components/tools/ToolsMenu";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { YEAR_LABELS } from "@/components/shared/constants";
import { TerrariumMark } from "@/components/ui/Icons";
import { useTerrarium } from "@/lib/store";

export default function ExploreHeader() {
  const year = useTerrarium((s) => s.profile.year);
  const major = useTerrarium((s) => s.profile.major);
  const rankResponse = useTerrarium((s) => s.rankResponse);
  const isRanking = useTerrarium((s) => s.isRanking);

  const confidence = rankResponse?.confidence ?? 0;
  const confidenceHint =
    rankResponse?.confidenceHint ?? "Ranking Ann Arbor listings for your profile...";

  const profileSummary = [
    year ? YEAR_LABELS[year].label : null,
    major ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="border-b border-[#C8D3C1] bg-[#F3F5EF] px-4 py-3 sm:px-6">
      {/* Top Row: Brand + Fit Confidence Meter + Profile Link */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ToolsMenu />
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl px-2 py-1 text-[#16241B] hover:bg-[#E6ECE1]"
          >
            <TerrariumMark size={28} />
            <span className="font-heading text-xl font-bold tracking-tight">
              Terrarium
            </span>
          </Link>

          <Link
            href="/onboarding"
            className="inline-flex min-h-[44px] items-center rounded-full border border-[#C8D3C1] bg-[#FCFDFB] px-3.5 py-1.5 text-xs font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
          >
            {profileSummary || "Set year & major"}
          </Link>

          {isRanking && (
            <span
              role="status"
              aria-live="polite"
              className="rounded-full bg-[#DFEAE2] px-2.5 py-1 text-xs font-semibold text-[#1C452C]"
            >
              Re-ranking...
            </span>
          )}
        </div>

        {/* Fit Confidence Meter (all values from RankResponse) */}
        <div className="flex min-w-[260px] flex-1 flex-col gap-1 rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-3.5 py-2 sm:max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#16241B]">
              Fit confidence
            </span>
            <span className="text-sm font-bold tabular-nums text-[#2F6B47]">
              {rankResponse ? `${Math.round(confidence)}%` : "—"}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Fit confidence"
            aria-valuenow={Math.round(confidence)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full overflow-hidden rounded-full bg-[#DCE5D5]"
          >
            <div
              className="h-full rounded-full bg-[#2F6B47] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
            />
          </div>

          <p className="text-xs leading-snug text-[#3D5245]">{confidenceHint}</p>
        </div>
      </div>

      {/* Bottom Row: Priorities Strip */}
      <div className="mt-3 border-t border-[#DCE5D5] pt-2.5">
        <PriorityStrip />
      </div>
    </header>
  );
}
