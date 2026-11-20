"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/ui/Icons";
import { PersonBidCard } from "./BidInputs";
import { personIssues, personName, rentCents, type Draft } from "./model";

/**
 * Private bidding: one roommate at a time sees and edits only their own bids. Between turns a
 * hand-off screen hides everything, so the next person never sees the previous person's numbers.
 * The parent keys this component by the roommate count, so progress resets when that changes.
 */
export default function PassThePhone({
  draft,
  onBid,
  onEven,
  onAllDone,
}: {
  draft: Draft;
  onBid: (person: number, room: number, value: string) => void;
  onEven: (person: number) => void;
  /** Everyone has entered balanced bids. */
  onAllDone: () => void;
}) {
  const n = draft.people.length;
  const [turn, setTurn] = useState(0);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<boolean[]>(() => Array<boolean>(n).fill(false));
  const [errors, setErrors] = useState<string[]>([]);
  const focusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    focusRef.current?.focus();
  }, [turn, open]);

  const allDone = done.length === n && done.every(Boolean);
  const name = personName(draft, Math.min(turn, n - 1));

  const finishTurn = () => {
    const issues = personIssues(draft, turn);
    setErrors(issues);
    if (issues.length) return;
    const next = done.map((d, i) => d || i === turn);
    setDone(next);
    setOpen(false);
    const nextTurn = next.findIndex((d) => !d);
    setTurn(nextTurn === -1 ? n : nextTurn);
  };

  const redo = (i: number) => {
    setDone(done.map((d, j) => d && j !== i));
    setTurn(i);
    setOpen(false);
    setErrors([]);
  };

  return (
    <div className="space-y-4">
      <ol aria-label="Who has bid" className="flex flex-wrap gap-2">
        {draft.people.map((_, i) => (
          <li
            key={i}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
              done[i]
                ? "border-[#2F6B47] bg-[#DFEAE2] text-[#2F6B47]"
                : i === turn
                  ? "border-[#16241B] bg-[#FCFDFB] text-[#16241B]"
                  : "border-[#C8D3C1] bg-[#FCFDFB] text-[#3D5245]"
            }`}
          >
            {done[i] && <CheckIcon size={14} />}
            {personName(draft, i)}
            <span className="sr-only">{done[i] ? " (done)" : i === turn ? " (up now)" : " (waiting)"}</span>
          </li>
        ))}
      </ol>

      {allDone || turn >= n ? (
        <div className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-5 text-center">
          <h3
            ref={(el) => {
              focusRef.current = el;
            }}
            tabIndex={-1}
            className="font-heading text-xl font-bold text-[#16241B] outline-none"
          >
            Everyone has bid
          </h3>
          <p className="mt-1 text-[#3D5245]">Put the phone where everyone can see it, then reveal the split.</p>
          <button
            type="button"
            onClick={onAllDone}
            className="mt-4 min-h-[48px] rounded-xl bg-[#2F6B47] px-5 font-semibold text-white hover:bg-[#245538]"
          >
            Reveal the fair split
          </button>
          <p className="mt-4 text-sm text-[#3D5245]">
            Someone wants to change their bids?{" "}
            {draft.people.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => redo(i)}
                className="mx-0.5 min-h-[44px] rounded-lg px-2 font-semibold text-[#2F6B47] underline underline-offset-2 hover:bg-[#DFEAE2]"
              >
                Redo {personName(draft, i)}
              </button>
            ))}
          </p>
        </div>
      ) : !open ? (
        <div className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-6 text-center">
          <h3
            ref={(el) => {
              focusRef.current = el;
            }}
            tabIndex={-1}
            className="font-heading text-2xl font-bold text-[#16241B] outline-none"
          >
            Pass the phone to {name}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-[#3D5245]">
            Everyone else, look away. {name} will only see their own bids, and they are hidden again before the next
            person.
          </p>
          <button
            type="button"
            onClick={() => {
              setErrors([]);
              setOpen(true);
            }}
            disabled={rentCents(draft) === null}
            className="mt-4 min-h-[48px] rounded-xl bg-[#2F6B47] px-5 font-semibold text-white hover:bg-[#245538] disabled:cursor-not-allowed disabled:opacity-50"
          >
            I&apos;m {name}, show my bids
          </button>
          {rentCents(draft) === null && (
            <p className="mt-2 text-sm text-[#7A3415]">Enter the total rent above first.</p>
          )}
        </div>
      ) : (
        <div
          ref={(el) => {
            focusRef.current = el;
          }}
          tabIndex={-1}
          className="space-y-3 outline-none"
          aria-label={`${name}'s private bids`}
          role="group"
        >
          <p className="text-[#3D5245]">
            {name}, split the{" "}
            <span className="font-semibold text-[#16241B]">whole rent</span> across the rooms by what each is worth to
            you. Nobody else will see these numbers until the split is revealed.
          </p>
          <PersonBidCard draft={draft} person={turn} scope="private" onBid={onBid} onEven={onEven} />
          {errors.length > 0 && (
            <div role="alert" className="rounded-xl border border-[#DFB391] bg-[#FBF1E8] p-3 text-sm text-[#7A3415]">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={finishTurn}
            className="min-h-[48px] w-full rounded-xl bg-[#2F6B47] px-5 font-semibold text-white hover:bg-[#245538] sm:w-auto"
          >
            Done, hide my bids
          </button>
        </div>
      )}
    </div>
  );
}
