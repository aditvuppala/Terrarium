"use client";

import { Fragment, useMemo, type RefObject } from "react";
import type { LeaseFinding } from "@/lib/schemas";

interface Segment {
  start: number;
  end: number;
  ids: string[];
  /** Findings whose span starts here (get a number badge). */
  starts: string[];
}

/** Split the text at every finding boundary; overlapping findings share segments. */
function segment(text: string, findings: LeaseFinding[]): Segment[] {
  const spans = findings.filter((f) => f.start !== null && f.end !== null && f.end > f.start);
  const cuts = new Set([0, text.length]);
  for (const f of spans) {
    cuts.add(f.start!);
    cuts.add(f.end!);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [start, end] = [points[i], points[i + 1]];
    const covering = spans.filter((f) => f.start! <= start && f.end! >= end);
    out.push({
      start,
      end,
      ids: covering.map((f) => f.id),
      starts: covering.filter((f) => f.start === start).map((f) => f.id),
    });
  }
  return out;
}

export default function LeaseTextView({
  text,
  findings,
  activeId,
  onSelect,
  markRefs,
}: {
  text: string;
  findings: LeaseFinding[];
  activeId: string | null;
  onSelect: (ids: string[]) => void;
  markRefs: RefObject<Map<string, HTMLElement>>;
}) {
  const segments = useMemo(() => segment(text, findings), [text, findings]);
  const number = useMemo(() => new Map(findings.map((f, i) => [f.id, i + 1])), [findings]);

  return (
    <div className="whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-[#16241B]">
      {segments.map((s) => {
        const slice = text.slice(s.start, s.end);
        if (s.ids.length === 0) return <Fragment key={s.start}>{slice}</Fragment>;
        const active = activeId !== null && s.ids.includes(activeId);
        return (
          <mark
            key={s.start}
            ref={(el) => {
              for (const id of s.starts) {
                if (el) markRefs.current.set(id, el);
                else markRefs.current.delete(id);
              }
            }}
            role="button"
            tabIndex={s.starts.length ? 0 : -1}
            aria-label={s.starts.length ? `Flagged clause ${s.starts.map((id) => number.get(id)).join(", ")}` : undefined}
            onClick={() => onSelect(s.ids)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(s.ids);
              }
            }}
            className={`cursor-pointer rounded-[3px] px-0.5 text-[#16241B] transition-colors [box-decoration-break:clone] ${
              active
                ? "bg-[#F6D8BF] shadow-[inset_0_-2px_0_#7A3415]"
                : "bg-[#FBF1E8] shadow-[inset_0_-2px_0_#DFB391] hover:bg-[#F8E3D1]"
            }`}
          >
            {s.starts.map((id) => (
              <span
                key={id}
                aria-hidden="true"
                className={`mr-1 inline-flex h-[18px] min-w-[18px] -translate-y-px items-center justify-center rounded-full px-1 align-middle text-[11px] font-bold leading-none ${
                  id === activeId ? "bg-[#7A3415] text-white" : "bg-[#DFB391] text-[#7A3415]"
                }`}
              >
                {number.get(id)}
              </span>
            ))}
            {slice}
          </mark>
        );
      })}
    </div>
  );
}
