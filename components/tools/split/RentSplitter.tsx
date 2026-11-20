"use client";

import { useEffect, useRef, useState } from "react";
import { WarningIcon } from "@/components/ui/Icons";
import { solveSplit, type SplitInput, type SplitIssue, type SplitResult } from "@/lib/split";
import { BidTable, PersonBidCard } from "./BidInputs";
import HouseSetup from "./HouseSetup";
import { checkDraft, emptyDraft, evenAll, evenRow, rentCents, resizeDraft, type Draft } from "./model";
import PassThePhone from "./PassThePhone";
import SplitResults from "./SplitResults";

type Mode = "together" | "private";

/** The whole rent splitter: house setup, bids, and the result. All client-side. */
export default function RentSplitter() {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [mode, setMode] = useState<Mode>("together");
  const [issues, setIssues] = useState<SplitIssue[]>([]);
  const [solved, setSolved] = useState<{ input: SplitInput; result: SplitResult } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const bidsRef = useRef<HTMLHeadingElement>(null);

  /** Every edit invalidates a shown result and earlier error list. */
  const edit = (next: (d: Draft) => Draft) => {
    setDraft(next);
    setSolved(null);
    setIssues([]);
  };

  const onBid = (person: number, room: number, value: string) =>
    edit((d) => ({
      ...d,
      bids: d.bids.map((row, i) => (i === person ? row.map((v, r) => (r === room ? value : v)) : row)),
    }));

  const compute = () => {
    const { input, issues: found } = checkDraft(draft);
    setIssues(found);
    if (!input) {
      setSolved(null);
      return;
    }
    setSolved({ input, result: solveSplit(input) });
  };

  // Move focus to whatever just appeared: the error list or the result heading.
  useEffect(() => {
    if (issues.length) errorRef.current?.focus();
  }, [issues]);
  useEffect(() => {
    if (!solved) return;
    const el = resultRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [solved]);

  const rentIssue = issues.find((i) => i.code === "rent");
  const n = draft.rooms.length;
  const hasRent = rentCents(draft) !== null;

  return (
    <div className="space-y-6">
      <HouseSetup
        draft={draft}
        rentError={rentIssue ? rentIssue.message : null}
        onRent={(v) => edit((d) => ({ ...d, rent: v }))}
        onCount={(c) => edit((d) => resizeDraft(d, c))}
        onRoom={(r, patch) => edit((d) => ({ ...d, rooms: d.rooms.map((x, i) => (i === r ? { ...x, ...patch } : x)) }))}
        onPerson={(i, name) => edit((d) => ({ ...d, people: d.people.map((x, j) => (j === i ? name : x)) }))}
      />

      <section aria-labelledby="split-bids-heading" className="rounded-3xl border border-[#C8D3C1] bg-[#FCFDFB] p-5 sm:p-6">
        <h2 id="split-bids-heading" ref={bidsRef} tabIndex={-1} className="font-heading text-xl font-bold text-[#16241B] outline-none">
          2. Bids
        </h2>
        <p className="mt-1 max-w-3xl text-[#3D5245]">
          Each roommate splits the <strong className="font-semibold text-[#16241B]">whole rent</strong> across the
          rooms by what each room is worth to them. A room you love gets more, a room you&apos;d rather not have gets
          less. Be honest: the split works best when bids reflect what you actually think.
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-[#16241B]">How are you entering bids?</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-2xl sm:inline-grid border border-[#C8D3C1] bg-[#F3F5EF] p-1">
            {(
              [
                ["together", "Everyone together"],
                ["private", "Pass the phone"],
              ] as const
            ).map(([value, text]) => (
              <label
                key={value}
                className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-3 text-center text-sm sm:px-4 font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#2F6B47] ${
                  mode === value ? "bg-[#2F6B47] text-white" : "text-[#16241B] hover:bg-[#DFEAE2]"
                }`}
              >
                <input
                  type="radio"
                  name="split-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setSolved(null);
                    setIssues([]);
                  }}
                  className="sr-only"
                />
                {text}
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-sm text-[#3D5245]">
            {mode === "private"
              ? "Each person enters their bids alone, then hands the phone on. Switching back to everyone together shows all bids."
              : "Fill in the grid together. Want bids kept secret until the end? Pass the phone, and each person bids privately."}
          </p>
        </fieldset>

        <div className="mt-5">
          {mode === "together" ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => edit(evenAll)}
                  disabled={!hasRent}
                  className="min-h-[44px] rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-4 text-sm font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start everyone from an even split
                </button>
                <span className="text-sm text-[#3D5245]">
                  {hasRent ? "Then move money toward the rooms each person prefers." : "Enter the total rent first."}
                </span>
              </div>
              <div className="hidden md:block">
                <BidTable draft={draft} onBid={onBid} />
              </div>
              <div className="space-y-3 md:hidden">
                {draft.people.map((_, i) => (
                  <PersonBidCard
                    key={i}
                    draft={draft}
                    person={i}
                    scope="card"
                    onBid={onBid}
                    onEven={(p) => edit((d) => evenRow(d, p))}
                  />
                ))}
              </div>
            </>
          ) : (
            <PassThePhone
              key={n}
              draft={draft}
              onBid={onBid}
              onEven={(p) => edit((d) => evenRow(d, p))}
              onAllDone={compute}
            />
          )}
        </div>

        {issues.length > 0 && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-5 rounded-2xl border border-[#DFB391] bg-[#FBF1E8] p-4 text-[#7A3415] outline-none"
          >
            <p className="flex items-center gap-2 font-semibold">
              <WarningIcon size={18} />
              {issues.length === 1 ? "One thing to fix first" : `${issues.length} things to fix first`}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
              {issues.map((i, k) => (
                <li key={k}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}

        {mode === "together" && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={compute}
              className="min-h-[48px] w-full rounded-xl bg-[#2F6B47] px-6 font-semibold text-white hover:bg-[#245538] sm:w-auto"
            >
              Find the fair split
            </button>
          </div>
        )}
      </section>

      {solved && (
        <SplitResults
          input={solved.input}
          result={solved.result}
          headingRef={resultRef}
          onEdit={() => {
            bidsRef.current?.focus();
            bidsRef.current?.scrollIntoView({ block: "start" });
          }}
        />
      )}
    </div>
  );
}
