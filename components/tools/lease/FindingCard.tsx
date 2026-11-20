"use client";

import type { Ref } from "react";
import { ExternalLinkIcon } from "@/components/ui/Icons";
import type { LeaseFinding } from "@/lib/schemas";

export default function FindingCard({
  finding,
  number,
  active,
  onSelect,
  ref,
}: {
  finding: LeaseFinding;
  number: number;
  active: boolean;
  onSelect: () => void;
  ref?: Ref<HTMLLIElement>;
}) {
  const { rule, quote, detail, method } = finding;
  return (
    <li
      ref={ref}
      onClick={onSelect}
      className={`scroll-mt-4 cursor-pointer rounded-2xl border bg-[#FCFDFB] p-4 transition-shadow sm:p-5 ${
        active ? "border-[#7A3415] shadow-[0_0_0_1px_#7A3415]" : "border-[#C8D3C1] hover:border-[#DFB391]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
            active ? "bg-[#7A3415] text-white" : "bg-[#FBF1E8] text-[#7A3415] ring-1 ring-[#DFB391]"
          }`}
        >
          {number}
        </span>
        <span className="rounded-full bg-[#DFEAE2] px-2.5 py-0.5 text-xs font-semibold text-[#2F6B47]">
          {rule.jurisdiction === "michigan" ? "Michigan law" : "Ann Arbor ordinance"}
        </span>
        {method === "deterministic" && (
          <span className="rounded-full border border-[#C8D3C1] px-2.5 py-0.5 text-xs font-semibold text-[#3D5245]">
            {quote ? "Number check" : "Not found in your lease"}
          </span>
        )}
      </div>

      <h3 className="font-heading mt-2.5 text-lg font-bold leading-snug text-[#16241B]">{rule.title}</h3>
      <a
        href={rule.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-[#2F6B47] underline decoration-[#2F6B47]/40 underline-offset-2 hover:decoration-[#2F6B47]"
      >
        {rule.citation}
        <ExternalLinkIcon size={13} />
        <span className="sr-only">(official text, opens in a new tab)</span>
      </a>

      {detail && <p className="mt-3 text-sm font-semibold leading-relaxed text-[#7A3415]">{detail}</p>}

      {quote && (
        <blockquote
          className={`mt-3 border-l-[3px] border-[#DFB391] pl-3 text-sm italic leading-relaxed text-[#3D5245] ${active ? "" : "line-clamp-2"}`}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
      )}

      <p className="mt-3 text-sm leading-relaxed text-[#16241B]">{rule.explanation}</p>

      {active && (
        <>
          <div className="mt-3 rounded-xl bg-[#DFEAE2] px-3 py-2.5 text-sm leading-relaxed text-[#16241B]">
            <span className="font-semibold text-[#245538]">Ask your landlord: </span>
            {rule.askLandlord}
          </div>
          {rule.appliesNote && <p className="mt-2.5 text-xs leading-relaxed text-[#3D5245]">{rule.appliesNote}</p>}
        </>
      )}

      {!active && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="mt-3 inline-flex min-h-[36px] items-center rounded-lg px-2 text-sm font-semibold text-[#2F6B47] hover:bg-[#DFEAE2] lg:-ml-2"
        >
          {quote ? "Show in lease & what to ask" : "What to ask"}
        </button>
      )}
    </li>
  );
}
