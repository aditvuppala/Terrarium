"use client";

import { useEffect, useRef } from "react";
import { EMPTY_RESULTS, formatListingBeds, formatListingPrice } from "@/components/shared/constants";
import { GOLD, RANK_GRADIENT_CSS, TOP_TIER, rankColor } from "@/components/map/rankColors";
import { useTerrarium } from "@/lib/store";

/** The ranked list beside the map. Clicking a row opens house view for that listing. */
export default function RankedList() {
  const results = useTerrarium((s) => s.rankResponse?.results ?? EMPTY_RESULTS);
  const isRanking = useTerrarium((s) => s.isRanking);
  const setSelectedListingId = useTerrarium((s) => s.setSelectedListingId);
  const listRef = useRef<HTMLOListElement>(null);

  // Coming back from house view: put focus (and the scroll position) on the house just viewed.
  useEffect(() => {
    const id = useTerrarium.getState().lastViewedListingId;
    if (!id || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLButtonElement>(
      `[data-listing-row="${CSS.escape(id)}"]`,
    );
    if (!row) return;
    row.scrollIntoView({ block: "nearest" });
    const active = document.activeElement;
    if (!active || active === document.body) row.focus({ preventScroll: true });
  }, []);

  const total = results.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#FCFDFB] text-[#16241B]">
      <div className="border-b border-[#E6ECE1] px-4 pb-3 pt-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-heading text-base font-bold">Ranked for you</h2>
          <span className="text-xs text-[#3D5245]">
            {total > 0 ? `${total} homes` : isRanking ? "Ranking..." : ""}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#3D5245]">
          <span>Best</span>
          <span
            aria-hidden="true"
            className="inline-block h-1.5 flex-1 rounded-full"
            style={{ background: RANK_GRADIENT_CSS }}
          />
          <span>Lowest</span>
          <span className="ml-1 inline-flex items-center gap-1">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full bg-[#15803D]"
              style={{ boxShadow: `0 0 0 1px #fff, 0 0 0 2.5px ${GOLD}` }}
            />
            Top 10
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="space-y-2 p-4" aria-busy={isRanking}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-[#E6ECE1]" />
          ))}
        </div>
      ) : (
        <ol ref={listRef} aria-label="Listings in rank order" className="flex-1 overflow-y-auto p-2">
          {results.map((r, i) => {
            const isMock = r.listing.provenance.isSynthetic;
            const top = r.rank <= TOP_TIER;
            return (
              <li key={r.listing.id}>
                <button
                  type="button"
                  data-listing-row={r.listing.id}
                  onClick={() => setSelectedListingId(r.listing.id)}
                  aria-label={`Rank ${r.rank}: ${r.listing.name}, score ${Math.round(r.score)}, ${formatListingPrice(r.listing)}${isMock ? ", mock listing" : ""}. Open house view.`}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[#F3F5EF]"
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-7 min-w-9 shrink-0 items-center justify-center px-1.5 text-xs font-bold tabular-nums text-white ${
                      isMock ? "rounded-[5px]" : "rounded-full"
                    }`}
                    style={{
                      background: rankColor(i, total),
                      boxShadow: top ? `0 0 0 1.5px #fff, 0 0 0 3px ${GOLD}` : undefined,
                    }}
                  >
                    {r.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#16241B]">
                      {r.listing.name}
                    </span>
                    <span className="block truncate text-xs text-[#3D5245]">
                      {formatListingPrice(r.listing)} · {formatListingBeds(r.listing)}
                      {isMock ? " · Mock" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums text-[#16241B]">
                      {Math.round(r.score)}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-[#3D5245]">
                      score
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
