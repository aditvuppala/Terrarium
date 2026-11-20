"use client";

import { useId, useState } from "react";
import { ExternalLinkIcon } from "@/components/ui/Icons";
import { ACCEPT_MIN_DAYS, RENEW_OFFER_DAYS, renewDates, SHOWING_DAYS } from "@/lib/lease/renew";
import { RULES_BY_ID } from "@/lib/lease/rules";

const SOURCE = RULES_BY_ID.get("a2_renewal_rights")!.sourceUrl;

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function RenewCalculator() {
  const startId = useId();
  const monthsId = useId();
  const [start, setStart] = useState("");
  const [months, setMonths] = useState(12);
  const dates = start ? renewDates(start, months) : null;

  const rows: { label: string; rule: string; value: string | null }[] = [
    {
      label: "Earliest your landlord can offer a renewal",
      rule: `${RENEW_OFFER_DAYS} days after your lease starts`,
      value: dates?.earliestOffer ?? null,
    },
    {
      label: "Earliest deadline they can give you to accept",
      rule: `at least ${ACCEPT_MIN_DAYS} days after the offer is sent (shown for an offer on the earliest day)`,
      value: dates?.earliestAcceptDeadline ?? null,
    },
    {
      label: "Earliest they can show your place to new tenants or sign with someone else",
      rule: `${SHOWING_DAYS} days into your lease`,
      value: dates?.earliestShowing ?? null,
    },
  ];

  return (
    <section className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-5 sm:p-6" aria-labelledby={`${startId}-h`}>
      <h2 id={`${startId}-h`} className="font-heading text-xl font-bold text-[#16241B]">
        Right-to-Renew dates
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[#3D5245]">
        Ann Arbor&rsquo;s ordinance says when a landlord may offer a renewal or show your place. Enter your lease start to see your dates.
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        <label htmlFor={startId} className="text-sm font-semibold text-[#16241B]">
          Lease start date
          <input
            id={startId}
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 block min-h-[44px] w-full rounded-xl border border-[#C8D3C1] bg-white px-3 text-base text-[#16241B] focus:border-[#2F6B47] focus:outline-none focus:ring-2 focus:ring-[#2F6B47]/30"
          />
        </label>
        <label htmlFor={monthsId} className="text-sm font-semibold text-[#16241B]">
          Length
          <select
            id={monthsId}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-1 block min-h-[44px] rounded-xl border border-[#C8D3C1] bg-white px-3 text-base text-[#16241B] focus:border-[#2F6B47] focus:outline-none focus:ring-2 focus:ring-[#2F6B47]/30"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} mo
              </option>
            ))}
          </select>
        </label>
      </div>

      {dates && !dates.covered ? (
        <p className="mt-4 rounded-xl border border-[#DFB391] bg-[#FBF1E8] px-3 py-2.5 text-sm text-[#7A3415]">{dates.note}</p>
      ) : (
        <dl className="mt-4 divide-y divide-[#C8D3C1]/70 rounded-xl border border-[#C8D3C1]">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <dt className="text-sm text-[#16241B]">
                {r.label}
                <span className="block text-xs text-[#3D5245]">{r.rule}</span>
              </dt>
              <dd className={`shrink-0 text-sm font-bold ${r.value ? "text-[#2F6B47]" : "text-[#3D5245]/70"}`}>
                {r.value ? fmt(r.value) : "Pick a date"}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-3 text-xs leading-relaxed text-[#3D5245]">
        {dates?.covered && dates.note ? `${dates.note} ` : ""}
        Covers Ann Arbor leases of 8+ months signed or renewed since March 2024 (not subleases, co-ops, fraternities or sororities).
        Day counts can be off by one depending on how the first day is counted.{" "}
        <a href={SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-[#2F6B47] underline underline-offset-2">
          Ann Arbor City Code § 8:530
          <ExternalLinkIcon size={12} />
        </a>
      </p>
    </section>
  );
}
