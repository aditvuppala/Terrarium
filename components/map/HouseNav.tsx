"use client";

import { useEffect } from "react";
import { fetchEnrichment } from "@/components/map/useListingEnrichment";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/ui/Icons";
import { useTerrarium } from "@/lib/store";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * House view controls, floating over the top-left of the map:
 * back to all homes (X / Escape) and previous / next in rank order (buttons / arrow keys).
 */
export default function HouseNav() {
  const selectedId = useTerrarium((s) => s.selectedListingId);
  const results = useTerrarium((s) => s.rankResponse?.results);
  const setSelectedListingId = useTerrarium((s) => s.setSelectedListingId);
  const step = useTerrarium((s) => s.stepSelectedListing);

  const index = results && selectedId ? results.findIndex((r) => r.listing.id === selectedId) : -1;
  const total = results?.length ?? 0;
  const open = index >= 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (isTypingTarget(e.target)) return;
      const t = e.target instanceof HTMLElement ? e.target : null;
      // Leave keys alone inside menus, dialogs and listboxes owned by other components.
      if (t?.closest('[role="dialog"], [role="menu"], [role="listbox"], [role="slider"]')) return;
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedListingId(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setSelectedListingId, step]);

  // Warm the neighbors so arrowing through houses feels instant.
  useEffect(() => {
    if (!results || index < 0) return;
    for (const j of [index + 1, index - 1]) {
      const r = results[j];
      if (r) fetchEnrichment(r.listing.id).catch(() => {});
    }
  }, [results, index]);

  if (!open || !results) return null;
  const current = results[index];

  return (
    <div
      role="toolbar"
      aria-label="House view"
      data-house-nav
      className="absolute left-3 top-3 z-[900] flex items-center gap-1 rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-1 text-[#16241B] shadow-lg"
    >
      <button
        type="button"
        onClick={() => setSelectedListingId(null)}
        aria-label="Close house view and return to all listings (Escape)"
        title="Back to all homes (Esc)"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold hover:bg-[#E6ECE1]"
      >
        <CloseIcon size={16} />
        <span className="hidden sm:inline">All homes</span>
      </button>
      <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-[#C8D3C1]" />
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index === 0}
        aria-label="Previous listing in rank order (Left arrow)"
        title="Previous (←)"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#E6ECE1] disabled:opacity-35 disabled:hover:bg-transparent"
      >
        <ChevronLeftIcon size={18} />
      </button>
      <span
        aria-live="polite"
        className="min-w-[72px] px-1 text-center text-xs font-semibold tabular-nums"
      >
        <span className="sr-only">{current.listing.name}, </span>#{current.rank}
        <span className="font-normal text-[#3D5245]"> of {total}</span>
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={index === total - 1}
        aria-label="Next listing in rank order (Right arrow)"
        title="Next (→)"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[#E6ECE1] disabled:opacity-35 disabled:hover:bg-transparent"
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
