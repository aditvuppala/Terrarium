"use client";

import { useEffect, useRef, useState } from "react";
import AdventureIllustration from "@/components/onboarding/year/AdventureIllustration";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/Icons";
import type { Year } from "@/lib/schemas";

export interface YearStepProps {
  selectedYear: Year | null;
  /** Called when the user picks a year; the parent saves it and advances. */
  onPick: (year: Year) => void;
  /** Advance without changing the year (shown once a year is selected). */
  onContinue: () => void;
}

const CARDS: Array<{ year: Year; label: string; blurb: string; level: number }> = [
  { year: "first_year", label: "Freshman", blurb: "First lease, fresh start", level: 1 },
  { year: "sophomore", label: "Sophomore", blurb: "Leaving the dorms behind", level: 2 },
  { year: "junior", label: "Junior", blurb: "You know the ropes, mostly", level: 3 },
  { year: "senior", label: "Senior", blurb: "One last Ann Arbor lease", level: 4 },
];

/** Pause after a pick so the scene change lands before the parent advances. */
const PICK_DELAY_MS = 800;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2F6B47]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFDFB]";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Four tiny peaks; filled ones show how intense the year gets. */
function Peaks({ level, active }: { level: number; active: boolean }) {
  return (
    <svg width="44" height="10" viewBox="0 0 44 10" aria-hidden="true" className="shrink-0">
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M${i * 11} 10 L${i * 11 + 5} 1 L${i * 11 + 10} 10 Z`}
          fill={i < level ? (active ? "#2F6B47" : "#E8783F") : "#DCE5D5"}
        />
      ))}
    </svg>
  );
}

/** Onboarding step 1: "What year are you?" */
export default function YearStep({ selectedYear, onPick, onContinue }: YearStepProps) {
  const [preview, setPreview] = useState<Year | null>(null);
  const [pending, setPending] = useState<Year | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const picked = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const chosen = pending ?? selectedYear;
  const scene: Year = pending ?? preview ?? selectedYear ?? "first_year";

  function pick(year: Year) {
    if (picked.current) return; // already on our way out; ignore double clicks
    picked.current = true;
    setPending(year);
    if (prefersReducedMotion()) {
      onPick(year);
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onPick(year);
    }, PICK_DELAY_MS);
  }

  function previewProps(year: Year) {
    return {
      onPointerEnter: () => setPreview(year),
      onPointerLeave: () => setPreview((p) => (p === year ? null : p)),
      onFocus: () => setPreview(year),
      onBlur: () => setPreview((p) => (p === year ? null : p)),
    };
  }

  const gradActive = chosen === "grad";

  return (
    <div>
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        <div className="lg:col-start-1 lg:row-start-1">
          <h1 className="font-heading text-2xl font-bold text-[#16241B] sm:text-3xl">What year are you?</h1>
          <p className="mt-2 text-sm text-[#3D5245]">
            Pick the option that best fits your upcoming Ann Arbor lease.
          </p>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pl-2">
          <AdventureIllustration scene={scene} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <div role="group" aria-label="Class year choices" className="grid grid-cols-2 gap-3 sm:gap-4">
            {CARDS.map(({ year, label, blurb, level }) => {
              const active = chosen === year;
              return (
                <button
                  key={year}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pick(year)}
                  {...previewProps(year)}
                  className={`group relative flex min-h-[112px] flex-col justify-between rounded-2xl border-2 p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 sm:min-h-[128px] sm:p-5 ${focusRing} ${
                    active
                      ? "border-[#2F6B47] bg-[#DFEAE2] shadow-[0_6px_18px_-10px_rgba(47,107,71,0.6)]"
                      : "border-[#C8D3C1] bg-[#F3F5EF] hover:-translate-y-0.5 hover:border-[#2F6B47] hover:bg-[#EDF2E8] hover:shadow-[0_8px_20px_-14px_rgba(22,36,27,0.5)]"
                  }`}
                >
                  <Peaks level={level} active={active} />
                  <span className="mt-3 block">
                    <span className="font-heading block text-lg font-bold leading-tight text-[#16241B] sm:text-xl">
                      {label}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-[#3D5245] sm:text-sm">{blurb}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${
                      active ? "scale-100 bg-[#2F6B47] text-white opacity-100" : "scale-75 opacity-0"
                    }`}
                  >
                    <CheckIcon size={14} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center sm:justify-start">
            <button
              type="button"
              aria-pressed={gradActive}
              onClick={() => pick("grad")}
              {...previewProps("grad")}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold underline decoration-2 underline-offset-4 transition-colors ${focusRing} ${
                gradActive
                  ? "text-[#2F6B47] decoration-[#2F6B47]"
                  : "text-[#2F6B47] decoration-[#2F6B47]/30 hover:text-[#245538] hover:decoration-[#245538]"
              }`}
            >
              {gradActive && <CheckIcon size={15} />}
              <span>Grad, professional, or other</span>
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedYear && (
        <div className="mt-8 flex justify-end border-t border-[#E6ECE1] pt-5">
          <button
            type="button"
            onClick={onContinue}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2F6B47] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#245538] ${focusRing}`}
          >
            <span>Continue</span>
            <ChevronRightIcon size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
