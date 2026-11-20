"use client";

import { CheckIcon, WarningIcon } from "@/components/ui/Icons";
import { formatCents } from "@/lib/split";
import { bidSum, cellInvalid, personName, rentCents, roomName, type Draft } from "./model";

/** A "$" text field for money. Text input (not type=number) so "1,200.50" works everywhere. */
export function MoneyInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  className = "",
  ariaLabel,
  placeholder = "0",
  onFocus,
  onBlur,
}: {
  onFocus?: () => void;
  onBlur?: () => void;
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#3D5245]">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`min-h-[44px] w-full rounded-xl border bg-[#FCFDFB] py-2 pl-7 pr-3 text-right text-base tabular-nums text-[#16241B] placeholder:text-[#3D5245]/50 ${
          invalid ? "border-[#B5562B] bg-[#FBF1E8]" : "border-[#C8D3C1] hover:border-[#2F6B47]"
        }`}
      />
    </div>
  );
}

/** "$212.50 left to assign" / "All assigned" / "$40.00 over" for one roommate. */
export function Remaining({ draft, person, id }: { draft: Draft; person: number; id: string }) {
  const total = rentCents(draft);
  const hasBad = draft.bids[person].some(cellInvalid);
  const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums";
  if (hasBad) {
    return (
      <span id={id} className={`${base} bg-[#FBF1E8] text-[#7A3415]`}>
        <WarningIcon size={15} /> Fix the highlighted amount
      </span>
    );
  }
  if (total === null) {
    return (
      <span id={id} className={`${base} bg-[#E6ECE1] text-[#3D5245]`}>
        Set the rent first
      </span>
    );
  }
  const left = total - bidSum(draft, person);
  if (left === 0) {
    return (
      <span id={id} className={`${base} bg-[#DFEAE2] text-[#2F6B47]`}>
        <CheckIcon size={15} /> All {formatCents(total)} assigned
      </span>
    );
  }
  if (left > 0) {
    return (
      <span id={id} className={`${base} bg-[#E6ECE1] text-[#16241B]`}>
        {formatCents(left)} left to assign
      </span>
    );
  }
  return (
    <span id={id} className={`${base} bg-[#FBF1E8] text-[#7A3415]`}>
      <WarningIcon size={15} /> {formatCents(-left)} over the rent
    </span>
  );
}

export const remainingId = (scope: string, person: number) => `split-${scope}-left-${person}`;
export const cellId = (scope: string, person: number, room: number) => `split-${scope}-bid-${person}-${room}`;

/** One roommate's bids as a stacked card (phones, and pass-the-phone mode). */
export function PersonBidCard({
  draft,
  person,
  scope,
  onBid,
  onEven,
  headingLevel = 3,
  onFocusRoom,
}: {
  onFocusRoom?: (room: number | null) => void;
  draft: Draft;
  person: number;
  /** Prefix that keeps input ids unique when several layouts exist. */
  scope: string;
  onBid: (person: number, room: number, value: string) => void;
  onEven: (person: number) => void;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const leftId = remainingId(scope, person);
  return (
    <section
      aria-labelledby={`split-${scope}-person-${person}`}
      className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading id={`split-${scope}-person-${person}`} className="font-heading text-lg font-bold text-[#16241B]">
          {personName(draft, person)}
        </Heading>
        <div aria-live="polite">
          <Remaining draft={draft} person={person} id={leftId} />
        </div>
      </div>
      <ul className="mt-3 space-y-2.5">
        {draft.rooms.map((room, r) => {
          const id = cellId(scope, person, r);
          return (
            <li key={r} className="flex items-center justify-between gap-3">
              <label htmlFor={id} className="min-w-0 text-[#16241B]">
                <span className="block font-semibold">{roomName(draft, r)}</span>
                {room.note.trim() && <span className="block text-sm text-[#3D5245]">{room.note.trim()}</span>}
              </label>
              <MoneyInput
                id={id}
                value={draft.bids[person][r]}
                onChange={(v) => onBid(person, r, v)}
                invalid={cellInvalid(draft.bids[person][r])}
                describedBy={leftId}
                onFocus={() => onFocusRoom?.(r)}
                onBlur={() => onFocusRoom?.(null)}
                className="w-36 shrink-0"
              />
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onEven(person)}
        disabled={rentCents(draft) === null}
        className="mt-3 min-h-[44px] rounded-xl px-3 text-sm font-semibold text-[#2F6B47] hover:bg-[#DFEAE2] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Start from an even split
      </button>
    </section>
  );
}

/** Desktop bid grid: roommates down the side, rooms across the top. */
export function BidTable({
  draft,
  onBid,
  onFocusRoom,
}: {
  draft: Draft;
  onBid: (person: number, room: number, value: string) => void;
  onFocusRoom?: (room: number | null) => void;
}) {
  const scope = "grid";
  return (
    <div className="relative overflow-x-auto rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB]">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          What each room is worth to each roommate. Each row must add up to the total rent.
        </caption>
        <thead>
          <tr className="border-b border-[#C8D3C1] bg-[#F3F5EF]">
            <th scope="col" className="px-4 py-3 text-sm font-semibold text-[#3D5245]">
              Roommate
            </th>
            {draft.rooms.map((room, r) => (
              <th key={r} scope="col" className="px-2 py-3 text-sm">
                <span className="block font-semibold text-[#16241B]">{roomName(draft, r)}</span>
                <span className="block min-h-[1.25rem] font-normal text-[#3D5245]">{room.note.trim()}</span>
              </th>
            ))}
            <th scope="col" className="px-4 py-3 text-sm font-semibold text-[#3D5245]">
              Left to assign
            </th>
          </tr>
        </thead>
        <tbody>
          {draft.people.map((_, i) => (
            <tr key={i} className="border-b border-[#C8D3C1] last:border-b-0">
              <th scope="row" className="px-4 py-2.5 font-semibold whitespace-nowrap text-[#16241B]">
                {personName(draft, i)}
              </th>
              {draft.rooms.map((_, r) => (
                <td key={r} className="px-2 py-2.5">
                  <MoneyInput
                    id={cellId(scope, i, r)}
                    ariaLabel={`${personName(draft, i)}'s bid for ${roomName(draft, r)}`}
                    value={draft.bids[i][r]}
                    onChange={(v) => onBid(i, r, v)}
                    invalid={cellInvalid(draft.bids[i][r])}
                    describedBy={remainingId(scope, i)}
                    onFocus={() => onFocusRoom?.(r)}
                    onBlur={() => onFocusRoom?.(null)}
                    className="min-w-[7.5rem]"
                  />
                </td>
              ))}
              <td className="px-4 py-2.5 whitespace-nowrap">
                <Remaining draft={draft} person={i} id={remainingId(scope, i)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
