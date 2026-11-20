"use client";

import { useState, type Ref } from "react";
import { CheckIcon, WarningIcon } from "@/components/ui/Icons";
import { formatCents, type SplitInput, type SplitResult } from "@/lib/split";

const signed = (c: number) => (c > 0 ? `+${formatCents(c)}` : c < 0 ? `−${formatCents(-c)}` : formatCents(0));

export function summaryText(input: SplitInput, result: SplitResult): string {
  const lines = [`Rent split: ${formatCents(input.totalCents)} a month`, ""];
  for (const row of result.rows) {
    const room = input.rooms[row.room];
    lines.push(
      `${input.people[row.person].name}: ${room.name}${room.note ? ` (${room.note})` : ""} for ${formatCents(row.price)}`,
    );
  }
  lines.push(
    "",
    `Total: ${formatCents(result.prices.reduce((a, b) => a + b, 0))}`,
    "",
    "Why it's fair: everyone values their own room at its price at least as much as any other room at that room's price, so nobody would want to swap.",
    "",
    "Made with the Terrarium rent splitter.",
  );
  return lines.join("\n");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers/contexts without the async clipboard API.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/** Step 3: who gets which room for how much, the envy check, and why it's fair. */
export default function SplitResults({
  input,
  result,
  onEdit,
  headingRef,
}: {
  input: SplitInput;
  result: SplitResult;
  onEdit: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
    const [copyStatus, setCopyStatus] = useState<"" | "copied" | "failed">("");
    const n = input.rooms.length;
    const people = input.people.map((p) => p.name);
    const roomLabel = (r: number) => input.rooms[r].name;
    const negative = result.prices.some((p) => p < 0);

    const copy = async () => {
      setCopyStatus((await copyText(summaryText(input, result))) ? "copied" : "failed");
    };

    return (
      <section aria-labelledby="split-results-heading" className="rounded-3xl border border-[#2F6B47] bg-[#FCFDFB] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="split-results-heading"
              ref={headingRef}
              tabIndex={-1}
              className="font-heading text-2xl font-bold text-[#16241B] outline-none"
            >
              3. The fair split
            </h2>
            <p className="mt-1 text-[#3D5245] tabular-nums">
              {formatCents(input.totalCents)} a month, split {n} ways. Nobody would rather swap.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2F6B47] px-4 font-semibold text-white hover:bg-[#245538]"
            >
              {copyStatus === "copied" ? <CheckIcon size={16} /> : null}
              {copyStatus === "copied" ? "Copied" : "Copy summary"}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="min-h-[44px] rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-4 font-semibold text-[#16241B] hover:border-[#2F6B47] hover:bg-[#DFEAE2]"
            >
              Edit bids
            </button>
          </div>
        </div>
        <p role="status" className="sr-only">
          {copyStatus === "copied"
            ? "Summary copied to the clipboard."
            : copyStatus === "failed"
              ? "Couldn't copy. Select the summary text instead."
              : ""}
        </p>
        {copyStatus === "failed" && (
          <p className="mt-2 text-sm font-medium text-[#7A3415]">
            Your browser blocked copying. Here is the text to copy by hand:
            <textarea
              readOnly
              aria-label="Split summary"
              value={summaryText(input, result)}
              rows={n + 7}
              className="mt-1 block w-full rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] p-2 font-normal text-[#16241B]"
            />
          </p>
        )}

        <ul className={`mt-5 grid gap-3 sm:grid-cols-2 ${n === 4 ? "lg:grid-cols-4" : n === 2 ? "" : "lg:grid-cols-3"}`}>
          {result.rows.map((row) => {
            const note = input.rooms[row.room].note;
            return (
              <li key={row.person} className="rounded-2xl border border-[#C8D3C1] bg-[#F3F5EF] p-4">
                <p className="text-lg leading-snug text-[#16241B]">
                  <span className="font-heading font-bold">{people[row.person]}</span> gets{" "}
                  <span className="font-semibold">{roomLabel(row.room)}</span> for{" "}
                  <span className="mt-0.5 block font-heading text-2xl font-bold tabular-nums text-[#2F6B47]">
                    {formatCents(row.price)}
                  </span>
                </p>
                {note && <p className="mt-0.5 text-sm text-[#3D5245]">{note}</p>}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-[#FCFDFB] px-3 py-2">
                    <dt className="text-[#3D5245]">Their bid</dt>
                    <dd className="font-semibold tabular-nums text-[#16241B]">{formatCents(row.bid)}</dd>
                  </div>
                  <div className="rounded-xl bg-[#FCFDFB] px-3 py-2">
                    <dt className="text-[#3D5245]">Surplus</dt>
                    <dd className="font-semibold tabular-nums text-[#16241B]">{signed(row.surplus)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-[#3D5245] tabular-nums">
          Prices add up to exactly {formatCents(result.prices.reduce((a, b) => a + b, 0))}. Surplus is what a room
          was worth to its new tenant minus what they pay for it.
        </p>

        {negative && (
          <div className="mt-4 flex gap-2 rounded-2xl border border-[#DFB391] bg-[#FBF1E8] p-3 text-sm text-[#7A3415]">
            <WarningIcon size={18} className="mt-0.5 shrink-0" />
            <p>
              One room came out below $0. That happens when bids are very lopsided: the others value their rooms so
              highly that paying the last person to take the least wanted room is the fair outcome. If that feels
              off, revisit the bids together.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-[#DFEAE2] p-4 text-[#16241B]">
          <h3 className="font-heading text-lg font-bold">Why this is fair</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
            <li>
              Rooms are matched to people so that the bids for the rooms people actually get add up to as much as
              possible. Each room goes where it is valued most, given everyone else&apos;s wishes.
            </li>
            <li>
              Prices are set so that everyone likes their own room at its price at least as much as any other room
              at that room&apos;s price. Nobody would trade places, even if they could.
            </li>
            <li>
              Within the range of prices where that holds, the split sits in the middle instead of favoring anyone,
              and the prices add up to the rent to the cent.
            </li>
          </ul>
        </div>

        <h3 className="mt-6 font-heading text-lg font-bold text-[#16241B]">Envy check</h3>
        <p className="mt-1 text-sm text-[#3D5245]">
          Each row shows how good every room would be for that person: their bid for the room minus its price. Their
          own room (highlighted) is always the best or tied for best.
        </p>
        <div className="relative mt-3 overflow-x-auto rounded-2xl border border-[#C8D3C1]">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Surplus for each roommate in every room. A roommate&apos;s own room is marked.
            </caption>
            <thead>
              <tr className="border-b border-[#C8D3C1] bg-[#F3F5EF]">
                <th scope="col" className="px-3 py-2.5 font-semibold text-[#3D5245]">
                  Roommate
                </th>
                {input.rooms.map((room, r) => (
                  <th key={r} scope="col" className="px-3 py-2.5 text-right font-semibold whitespace-nowrap text-[#16241B]">
                    {room.name}
                    <span className="block font-normal text-[#3D5245] tabular-nums">{formatCents(result.prices[r])}</span>
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 font-semibold text-[#3D5245]">
                  Verdict
                </th>
              </tr>
            </thead>
            <tbody>
              {result.surplus.map((row, i) => {
                const own = result.roomOf[i];
                const best = Math.max(...row);
                const envy = best - row[own];
                return (
                  <tr key={i} className="border-b border-[#C8D3C1] last:border-b-0 bg-[#FCFDFB]">
                    <th scope="row" className="px-3 py-2.5 font-semibold whitespace-nowrap text-[#16241B]">
                      {people[i]}
                    </th>
                    {row.map((s, r) => (
                      <td
                        key={r}
                        className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${
                          r === own ? "bg-[#DFEAE2] font-bold text-[#2F6B47]" : "text-[#16241B]"
                        }`}
                      >
                        {signed(s)}
                        {r === own && <span className="sr-only"> (their room)</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {envy <= 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#2F6B47]">
                          <CheckIcon size={15} />
                          {row.filter((s) => s === best).length > 1 ? "Tied for best" : "Best for them"}
                        </span>
                      ) : (
                        <span className="font-semibold text-[#7A3415]">Within 1¢ (rounding)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {result.maxEnvyCents > 0 && (
          <p className="mt-2 text-sm text-[#3D5245]">
            Rent can&apos;t always be split into whole cents with zero difference. The leftover cent went where it
            matters least, so no one is off by more than 1¢.
          </p>
        )}
      </section>
    );
}
