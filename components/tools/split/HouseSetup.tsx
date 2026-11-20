"use client";

import { MAX_PEOPLE, MIN_PEOPLE } from "@/lib/split";
import { MoneyInput } from "./BidInputs";
import { cellInvalid, type Draft } from "./model";

const COUNTS = Array.from({ length: MAX_PEOPLE - MIN_PEOPLE + 1 }, (_, i) => MIN_PEOPLE + i);

const fieldClass =
  "min-h-[44px] w-full rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-3 py-2 text-base text-[#16241B] placeholder:text-[#3D5245]/60 hover:border-[#2F6B47]";

/** Step 1: total rent, how many people, room names/notes and roommate names. */
export default function HouseSetup({
  draft,
  rentError,
  onRent,
  onCount,
  onRoom,
  onPerson,
}: {
  draft: Draft;
  rentError: string | null;
  onRent: (v: string) => void;
  onCount: (n: number) => void;
  onRoom: (r: number, patch: Partial<Draft["rooms"][number]>) => void;
  onPerson: (i: number, name: string) => void;
}) {
  const n = draft.rooms.length;
  const rentInvalid = !!rentError || (draft.rent.trim() !== "" && cellInvalid(draft.rent));
  return (
    <section aria-labelledby="split-house-heading" className="rounded-3xl border border-[#C8D3C1] bg-[#FCFDFB] p-5 sm:p-6">
      <h2 id="split-house-heading" className="font-heading text-xl font-bold text-[#16241B]">
        1. The house
      </h2>

      <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,16rem)_1fr]">
        <div>
          <label htmlFor="split-rent" className="block font-semibold text-[#16241B]">
            Total monthly rent
          </label>
          <MoneyInput
            id="split-rent"
            value={draft.rent}
            onChange={onRent}
            placeholder="3,600"
            invalid={rentInvalid}
            describedBy={rentError ? "split-rent-error" : undefined}
            className="mt-1.5"
          />
          {rentError && (
            <p id="split-rent-error" className="mt-1.5 text-sm font-medium text-[#7A3415]">
              {rentError}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="font-semibold text-[#16241B]">Roommates (one room each)</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {COUNTS.map((c) => (
              <label
                key={c}
                className={`inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl border px-3 font-semibold tabular-nums has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#2F6B47] ${
                  c === n
                    ? "border-[#2F6B47] bg-[#2F6B47] text-white"
                    : "border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
                }`}
              >
                <input
                  type="radio"
                  name="split-count"
                  value={c}
                  checked={c === n}
                  onChange={() => onCount(c)}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <fieldset>
          <legend className="font-heading text-lg font-bold text-[#16241B]">Rooms</legend>
          <p className="text-sm text-[#3D5245]">Add a note for anything that sets a room apart.</p>
          <ul className="mt-3 space-y-2.5">
            {draft.rooms.map((room, r) => (
              <li key={r} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
                <div>
                  <label htmlFor={`split-room-${r}`} className="sr-only">
                    Room {r + 1} name
                  </label>
                  <input
                    id={`split-room-${r}`}
                    type="text"
                    value={room.name}
                    placeholder={`Room ${r + 1}`}
                    onChange={(e) => onRoom(r, { name: e.target.value })}
                    className={`${fieldClass} font-semibold`}
                  />
                </div>
                <div>
                  <label htmlFor={`split-room-note-${r}`} className="sr-only">
                    Room {r + 1} note (optional)
                  </label>
                  <input
                    id={`split-room-note-${r}`}
                    type="text"
                    value={room.note}
                    placeholder={r === 0 ? "e.g. private bath" : "Note (optional)"}
                    onChange={(e) => onRoom(r, { note: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="font-heading text-lg font-bold text-[#16241B]">Roommates</legend>
          <p className="text-sm text-[#3D5245]">First names are plenty.</p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            {draft.people.map((name, i) => (
              <li key={i}>
                <label htmlFor={`split-person-${i}`} className="sr-only">
                  Roommate {i + 1} name
                </label>
                <input
                  id={`split-person-${i}`}
                  type="text"
                  autoComplete="off"
                  value={name}
                  placeholder={`Roommate ${i + 1}`}
                  onChange={(e) => onPerson(i, e.target.value)}
                  className={fieldClass}
                />
              </li>
            ))}
          </ul>
        </fieldset>
      </div>
    </section>
  );
}
