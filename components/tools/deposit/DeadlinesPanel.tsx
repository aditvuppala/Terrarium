"use client";

import { ExternalLinkIcon } from "@/components/ui/Icons";
import { ACT_URL, computeDeadlines, daysUntil, formatIsoDate } from "@/lib/deposit/deadlines";

function relative(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 0) return `in ${days} days`;
  return days === -1 ? "yesterday" : `${-days} days ago`;
}

const input =
  "mt-1 block min-h-[44px] w-full rounded-xl border border-[#C8D3C1] bg-white px-3 text-[#16241B] focus:border-[#2F6B47] focus:outline-2 focus:outline-[#2F6B47]/30";

export default function DeadlinesPanel({
  leaseStart,
  leaseEnd,
  today,
  onChange,
}: {
  leaseStart: string;
  leaseEnd: string;
  /** Local YYYY-MM-DD, or null before the client has mounted. */
  today: string | null;
  onChange: (patch: { leaseStart?: string; leaseEnd?: string }) => void;
}) {
  const deadlines = computeDeadlines(leaseStart, leaseEnd);

  return (
    <section aria-labelledby="dep-deadlines" className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4 sm:p-5">
      <h2 id="dep-deadlines" className="font-heading text-xl font-bold text-[#16241B]">
        Michigan deposit deadlines
      </h2>
      <p className="mt-1 text-sm text-[#3D5245]">From the Security Deposit Act. Add your dates to see them on a calendar (optional).</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dep-lease-start" className="text-sm font-semibold text-[#16241B]">
            Lease start
          </label>
          <input
            id="dep-lease-start"
            type="date"
            value={leaseStart}
            onChange={(e) => onChange({ leaseStart: e.target.value })}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="dep-lease-end" className="text-sm font-semibold text-[#16241B]">
            Lease end
          </label>
          <input
            id="dep-lease-end"
            type="date"
            value={leaseEnd}
            min={leaseStart || undefined}
            onChange={(e) => onChange({ leaseEnd: e.target.value })}
            className={input}
          />
        </div>
      </div>

      <ol className="mt-4 space-y-3">
        {deadlines.map((d) => {
          const rel = d.date && today ? daysUntil(d.date, today) : null;
          const soon = rel !== null && rel >= 0 && rel <= 7;
          return (
            <li
              key={d.id}
              className={`rounded-xl border p-3 ${soon ? "border-[#DFB391] bg-[#FBF1E8]" : "border-[#C8D3C1] bg-white"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-[#3D5245]">
                  {d.who} · {d.from === "notice" ? `${d.days} days after the list arrives` : `${d.days} days after ${d.from === "start" ? "move-in" : "move-out"}`}
                </p>
              </div>
              <p className="mt-0.5 font-semibold text-[#16241B]">{d.title}</p>
              {d.date && (
                <p className={`mt-1 text-sm font-semibold ${soon ? "text-[#7A3415]" : "text-[#2F6B47]"}`}>
                  {formatIsoDate(d.date)} {rel !== null && <span className="font-normal">({relative(rel)})</span>}
                </p>
              )}
              <p className="mt-1 text-sm leading-relaxed text-[#3D5245]">{d.detail}</p>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-[32px] items-center gap-1 text-sm font-semibold text-[#2F6B47] underline underline-offset-2 hover:text-[#245538]"
              >
                {d.section}
                <ExternalLinkIcon size={12} />
                <span className="sr-only"> (official text, opens in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[#3D5245]">
        <li>
          Move-out dates count from when you actually move out, which can be earlier than your lease end. Dates here are calendar days.
        </li>
        <li>
          A deposit can&apos;t be more than 1½ months&apos; rent (
          <a className="text-[#2F6B47] underline" href="https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-602" target="_blank" rel="noopener noreferrer">
            MCL 554.602
          </a>
          ).
        </li>
        <li>
          Give your forwarding address in writing, answer a damages list by mail, and keep copies of both.
        </li>
      </ul>

      <p className="mt-4 border-t border-[#C8D3C1] pt-3 text-xs text-[#3D5245]">
        General information, not legal advice. Read the{" "}
        <a className="font-semibold text-[#2F6B47] underline" href={ACT_URL} target="_blank" rel="noopener noreferrer">
          full Act (MCL 554.601–554.616)
        </a>{" "}
        or ask U-M Student Legal Services about your situation.
      </p>
    </section>
  );
}
