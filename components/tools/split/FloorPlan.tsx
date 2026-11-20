"use client";

import { useEffect, useState } from "react";
import { centsToInput } from "@/lib/split";
import type { Draft } from "./model";

/** Prefilled 4-bedroom demo house: rent, names, room notes and plausible bids. */
export function demoDraft(): Draft {
  const bids = [
    [1200, 850, 800, 750],
    [1000, 950, 850, 800],
    [1100, 800, 900, 800],
    [950, 900, 900, 850],
  ];
  return {
    rent: "3600",
    rooms: [
      { name: "Front bedroom", note: "private bath" },
      { name: "Middle bedroom", note: "big closet" },
      { name: "Corner bedroom", note: "" },
      { name: "Back bedroom", note: "smallest" },
    ],
    people: ["Alex", "Priya", "Jordan", "Sam"],
    bids: bids.map((row) => row.map((d) => centsToInput(d * 100))),
  };
}

type Box = { x: number; y: number; w: number; h: number };

/** Bedrooms in room order (0..3), drawn on a 600x340 plan. */
const BEDROOMS: (Box & { size: string })[] = [
  { x: 10, y: 10, w: 230, h: 180, size: "15 × 12 ft" },
  { x: 240, y: 10, w: 180, h: 180, size: "12 × 12 ft" },
  { x: 420, y: 10, w: 170, h: 110, size: "11 × 9 ft" },
  { x: 470, y: 190, w: 120, h: 140, size: "9 × 9 ft" },
];
const SHARED: (Box & { label: string })[] = [
  { x: 10, y: 190, w: 290, h: 140, label: "Living room" },
  { x: 300, y: 190, w: 170, h: 140, label: "Kitchen" },
  { x: 420, y: 120, w: 170, h: 70, label: "Shared bath" },
];

/** Simple, clean SVG plan of the demo house. `active` room is highlighted. */
export function DemoFloorPlan({ draft, active }: { draft: Draft; active: number | null }) {
  const name = (r: number) => draft.rooms[r]?.name.trim() || `Room ${r + 1}`;
  return (
    <figure className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-3">
      <svg viewBox="0 0 600 340" className="h-auto w-full" role="img" aria-labelledby="split-plan-title">
        <title id="split-plan-title">
          Floor plan of a 4-bedroom house: {BEDROOMS.map((_, r) => name(r)).join(", ")}, plus a shared living room,
          kitchen and bath.
        </title>
        {SHARED.map((s) => (
          <g key={s.label}>
            <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#EDF2E8" stroke="#16241B" strokeWidth={3} />
            <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 5} textAnchor="middle" fontSize={15} fill="#3D5245">
              {s.label}
            </text>
          </g>
        ))}
        {BEDROOMS.map((b, r) => {
          const on = active === r;
          return (
            <g key={r}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={on ? "#BFD8C7" : "#FCFDFB"}
                stroke={on ? "#2F6B47" : "#16241B"}
                strokeWidth={on ? 5 : 3}
              />
              <text x={b.x + 12} y={b.y + 28} fontSize={b.w < 150 ? 13 : 16} fontWeight={700} fill="#16241B">
                {name(r)}
              </text>
              <text x={b.x + 14} y={b.y + 48} fontSize={13} fill="#3D5245">
                {b.size}
              </text>
            </g>
          );
        })}
        {/* Private bath inside the front bedroom */}
        <rect x={160} y={110} width={80} height={80} fill="#EDF2E8" stroke="#16241B" strokeWidth={2} />
        <text x={200} y={146} textAnchor="middle" fontSize={12} fill="#3D5245">
          Private
        </text>
        <text x={200} y={162} textAnchor="middle" fontSize={12} fill="#3D5245">
          bath
        </text>
        {/* Front door */}
        <line x1={100} y1={330} x2={150} y2={330} stroke="#FCFDFB" strokeWidth={5} />
        <text x={125} y={322} textAnchor="middle" fontSize={11} fill="#3D5245">
          Front door
        </text>
      </svg>
      <figcaption className="mt-1 text-sm text-[#3D5245]">Demo house. Not to scale.</figcaption>
    </figure>
  );
}

export type UploadedPlan = { url: string; name: string; kind: "image" | "pdf" };

/** File picker for a floor plan. The file is kept in memory as an object URL only. */
export function PlanUpload({ plan, onPlan }: { plan: UploadedPlan | null; onPlan: (p: UploadedPlan | null) => void }) {
  const [error, setError] = useState("");
  // Release the in-memory copy when it is replaced or the page goes away.
  useEffect(() => () => {
    if (plan) URL.revokeObjectURL(plan.url);
  }, [plan]);

  return (
    <div className="rounded-2xl border border-[#C8D3C1] bg-[#FCFDFB] p-4">
      <label htmlFor="split-plan-file" className="font-semibold text-[#16241B]">
        Floor plan (PNG, JPEG or PDF)
      </label>
      <p id="split-plan-help" className="text-sm text-[#3D5245]">
        Shown here for reference only. It stays in this browser tab and is never uploaded or saved.
      </p>
      <input
        id="split-plan-file"
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        aria-describedby="split-plan-help"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const kind = f.type === "application/pdf" ? "pdf" : f.type === "image/png" || f.type === "image/jpeg" ? "image" : null;
          if (!kind) {
            setError("Please choose a PNG, JPEG or PDF file.");
            return;
          }
          setError("");
          onPlan({ url: URL.createObjectURL(f), name: f.name, kind });
        }}
        className="mt-2 block w-full text-sm text-[#16241B] file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-[#2F6B47] file:px-4 file:font-semibold file:text-white hover:file:bg-[#245538]"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-[#7A3415]">
          {error}
        </p>
      )}
      {plan?.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL, not optimizable
        <img src={plan.url} alt={`Your floor plan: ${plan.name}`} className="mt-3 max-h-96 w-full rounded-xl border border-[#C8D3C1] object-contain" />
      )}
      {plan?.kind === "pdf" && (
        <p className="mt-3">
          <a
            href={plan.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#C8D3C1] bg-[#DFEAE2] px-4 text-sm font-semibold text-[#16241B] hover:border-[#2F6B47]"
          >
            PDF: {plan.name} <span className="font-normal text-[#3D5245]">(open)</span>
          </a>
        </p>
      )}
    </div>
  );
}
