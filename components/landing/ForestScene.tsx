/**
 * Decorative landing-page backdrop: sky up top, then a meadow with a winding
 * river (flat illustration style) with forest right up to the banks, framed by
 * tall forests.
 * Pure SVG + CSS animations (see globals.css `.tr-*`), no client JS.
 *
 * - <SkyDecor>: sun + drifting clouds (sits in the sky band).
 * - <RiverValley>: meadow + river; fills its (relative) parent, horizon at top.
 * - <SideTrees>: full-height tree walls on the left/right edges. On narrower
 *   screens they slide partly off-screen so they never cover the content.
 */

const TRUNK = "#6E4F3A";

/** Small deterministic PRNG so the scene renders identically on every load. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function Pine({
  x,
  base,
  h,
  w,
  color,
  seed = 1,
}: {
  x: number;
  base: number;
  h: number;
  w: number;
  color: string;
  seed?: number;
}) {
  const r = rng(seed);
  const tiers = [
    { apex: base - h * 0.42, bottom: base - h * 0.05, hw: w },
    { apex: base - h * 0.62, bottom: base - h * 0.22, hw: w * 0.84 },
    { apex: base - h * 0.82, bottom: base - h * 0.4, hw: w * 0.66 },
    { apex: base - h, bottom: base - h * 0.6, hw: w * 0.46 },
  ];
  return (
    <g>
      <rect x={x - w * 0.1} y={base - h * 0.08} width={w * 0.2} height={h * 0.09} rx={3} fill={TRUNK} />
      {tiers.map((t, i) => {
        const tierH = t.bottom - t.apex;
        // needle tufts: little chevrons scattered on the lit (left) side
        const marks = Array.from({ length: 3 }, () => {
          const fy = 0.45 + r() * 0.45;
          const my = t.apex + tierH * fy;
          const mx = x - t.hw * fy * (0.25 + r() * 0.5);
          const s = Math.max(4, w * 0.07);
          return `M${mx - s} ${my - s * 0.4} L${mx} ${my + s * 0.35} L${mx + s} ${my - s * 0.4}`;
        });
        return (
          <g key={i}>
            <polygon
              points={`${x},${t.apex} ${x - t.hw},${t.bottom} ${x + t.hw},${t.bottom}`}
              fill={color}
              stroke={color}
              strokeWidth={8}
              strokeLinejoin="round"
            />
            {/* shaded right half */}
            <polygon
              points={`${x},${t.apex} ${x + t.hw},${t.bottom} ${x},${t.bottom}`}
              fill="#0B2A17"
              opacity={0.16}
              stroke="#0B2A17"
              strokeOpacity={0.16}
              strokeWidth={8}
              strokeLinejoin="round"
            />
            {/* ragged lower edge */}
            <path
              d={`M${x - t.hw} ${t.bottom} l${t.hw * 0.25} -${tierH * 0.08} l${t.hw * 0.25} ${tierH * 0.06} l${t.hw * 0.25} -${tierH * 0.07} l${t.hw * 0.25} ${tierH * 0.06} l${t.hw * 0.25} -${tierH * 0.07} l${t.hw * 0.25} ${tierH * 0.06} l${t.hw * 0.25} -${tierH * 0.07} l${t.hw * 0.25} ${tierH * 0.08}`}
              fill="none"
              stroke="#0B2A17"
              strokeOpacity={0.18}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <path d={marks.join(" ")} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

function Bush({ x, base, r, color }: { x: number; base: number; r: number; color: string }) {
  return (
    <g>
      <g fill={color}>
        <circle cx={x - r * 0.8} cy={base - r * 0.55} r={r * 0.7} />
        <circle cx={x + r * 0.8} cy={base - r * 0.5} r={r * 0.65} />
        <circle cx={x} cy={base - r * 0.8} r={r} />
        <rect x={x - r * 1.4} y={base - r * 0.6} width={r * 2.8} height={r * 0.6} rx={r * 0.3} />
      </g>
      <circle cx={x - r * 0.3} cy={base - r * 1.15} r={r * 0.28} fill="#FFFFFF" opacity={0.2} />
    </g>
  );
}

function Cloud({ className = "", width = 160 }: { className?: string; width?: number }) {
  return (
    <svg viewBox="0 0 160 60" width={width} className={className} aria-hidden="true" focusable="false">
      <g fill="#FFFFFF">
        <circle cx="48" cy="34" r="20" />
        <circle cx="80" cy="26" r="24" />
        <circle cx="112" cy="36" r="17" />
        <rect x="30" y="34" width="100" height="20" rx="10" />
      </g>
    </svg>
  );
}

export function SkyDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute right-[22%] top-10 hidden h-20 w-20 rounded-full bg-[#FBD978] shadow-[0_0_60px_24px_rgba(251,217,120,0.5)] sm:block" />
      <Cloud className="tr-drift absolute right-[30%] top-36 hidden opacity-95 md:block" width={130} />
      <Cloud className="tr-drift-slow absolute right-[16%] top-56 hidden opacity-85 lg:block" width={100} />
    </div>
  );
}

// ---------- River geometry (viewBox 1440 x 620, horizon at y = 40) ----------
const VB_W = 1440;
const VB_H = 620;
const HORIZON = 40;

type Pt = { x: number; y: number; w: number };

/** Centerline + width sampled from the horizon to the bottom edge. */
const RIVER_PTS: Pt[] = (() => {
  const pts: Pt[] = [];
  for (let y = HORIZON + 6; y <= VB_H + 10; y += 6) {
    const t = (y - HORIZON) / (VB_H - HORIZON); // 0 at horizon → 1 at bottom
    const amp = 40 + t * 300; // bends get wider as they come closer
    const x = VB_W / 2 + amp * Math.sin(t * 9.2 + 0.4) - 40 * t;
    const w = 78 + t * 570; // wide, gentle perspective, mostly flat
    pts.push({ x, y, w });
  }
  return pts;
})();

const fmt = (n: number) => n.toFixed(1);

const RIVER_PATH = (() => {
  const left = RIVER_PTS.map((p) => `${fmt(p.x - p.w / 2)} ${p.y}`);
  const right = [...RIVER_PTS].reverse().map((p) => `${fmt(p.x + p.w / 2)} ${p.y}`);
  return `M${left.join(" L")} L${right.join(" L")} Z`;
})();

/** Path along the river offset by `f` (-0.5..0.5 of its width). */
const laneAt = (f: number) =>
  "M" + RIVER_PTS.map((p) => `${fmt(p.x + p.w * f)} ${p.y}`).join(" L");

const FLOW_LANES = [
  { d: laneAt(-0.22), cls: "" },
  { d: laneAt(0.05), cls: "tr-delay-1" },
  { d: laneAt(0.26), cls: "tr-delay-2" },
];

/** River center/width at any y (linear interpolation of RIVER_PTS). */
function riverAt(y: number) {
  const i = Math.max(0, Math.min(RIVER_PTS.length - 2, Math.floor((y - RIVER_PTS[0].y) / 6)));
  const a = RIVER_PTS[i];
  const b = RIVER_PTS[i + 1];
  const k = Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y)));
  return { x: a.x + (b.x - a.x) * k, w: a.w + (b.w - a.w) * k };
}

/** Forest filling both banks, from the shoreline out to the edges, back to front. */
const BANK_TREES = (() => {
  const r = rng(21);
  const palette = ["#2F7D4A", "#3D8A55", "#4F9A5E", "#245538", "#5FA368"];
  const trees: { x: number; base: number; h: number; w: number; color: string }[] = [];
  let y = HORIZON + 14;
  while (y < VB_H + 30) {
    const t = Math.min(1, (y - HORIZON) / (VB_H - HORIZON));
    const h = 20 + t * 95;
    const w = h * 0.3;
    const river = riverAt(Math.min(y, VB_H));
    const gap = 4 + t * 10;
    for (const side of [-1, 1]) {
      // start at the shoreline and walk outward to the page edge
      let x = river.x + side * (river.w / 2 + gap + w * 0.6);
      while (side < 0 ? x > -w : x < VB_W + w) {
        const tx = x + (r() - 0.5) * w * 0.5;
        // skip trees whose crown would hang over the water further upstream
        const crown = riverAt(Math.max(HORIZON, y - h * 0.7));
        const clear = Math.abs(tx - crown.x) > crown.w / 2 + w * 0.7;
        const jitterY = (r() - 0.5) * 6;
        const scale = 0.82 + r() * 0.36;
        const color = palette[Math.floor(r() * palette.length)];
        if (clear) trees.push({
          x: tx,
          base: y + jitterY,
          h: h * scale,
          w,
          color,
        });
        x += side * w * (1.25 + r() * 0.5);
      }
    }
    y += 10 + t * 46;
  }
  return trees.sort((p, q) => p.base - q.base);
})();

/** Lightweight pine for the dense bank forest (no needle marks). */
function BankPine({ x, base, h, w, color }: { x: number; base: number; h: number; w: number; color: string }) {
  const tiers = [
    [base - h * 0.5, base - h * 0.04, w],
    [base - h * 0.76, base - h * 0.32, w * 0.76],
    [base - h, base - h * 0.58, w * 0.52],
  ];
  return (
    <g>
      <rect x={x - w * 0.09} y={base - h * 0.08} width={w * 0.18} height={h * 0.08} fill={TRUNK} />
      {tiers.map(([apex, bottom, hw], i) => (
        <g key={i}>
          <polygon points={`${x},${apex} ${x - hw},${bottom} ${x + hw},${bottom}`} fill={color} stroke={color} strokeWidth={3} strokeLinejoin="round" />
          <polygon points={`${x},${apex} ${x + hw},${bottom} ${x},${bottom}`} fill="#0B2A17" opacity={0.16} />
        </g>
      ))}
    </g>
  );
}

export function RiverValley() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMin slice"
        className="h-full w-full"
        focusable="false"
      >
        {/* distant hills on the horizon */}
        <path d="M0 50 C220 0 420 20 620 30 S1060 -8 1440 34 V620 H0 Z" fill="#B7DCA0" />
        <path d="M0 62 C300 36 560 46 720 44 S1180 38 1440 62 V620 H0 Z" fill="#A6D38C" />
        {/* meadow bands (flat) */}
        <path d="M0 200 C360 176 1080 190 1440 210 V620 H0 Z" fill="#9CCB80" />
        <path d="M0 420 C360 400 1080 410 1440 430 V620 H0 Z" fill="#8FC274" />

        {/* shore edge */}
        <path d={RIVER_PATH} fill="#2E6B5E" stroke="#2E6B5E" strokeWidth="8" strokeLinejoin="round" />
        {/* water: flat fill + lighter inner channel */}
        <path d={RIVER_PATH} fill="#2F7FA0" />
        {RIVER_PTS.length > 0 && (
          <path
            d={
              "M" +
              RIVER_PTS.map((p) => `${fmt(p.x - p.w * 0.28)} ${p.y}`).join(" L") +
              " L" +
              [...RIVER_PTS].reverse().map((p) => `${fmt(p.x + p.w * 0.18)} ${p.y}`).join(" L") +
              " Z"
            }
            fill="#3B8FAF"
          />
        )}

        {/* flowing current */}
        {FLOW_LANES.map((f) => (
          <path
            key={f.cls || "base"}
            d={f.d}
            className={`tr-flow ${f.cls}`}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.55"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="34 170"
          />
        ))}

        {/* forest right up to the banks */}
        {BANK_TREES.map((t, i) => (
          <BankPine key={`bank-${i}`} {...t} />
        ))}
      </svg>
    </div>
  );
}

function TreeWall({ side }: { side: "left" | "right" }) {
  // Drawn for the left edge (x=0 is the outside); mirrored for the right.
  return (
    <svg
      viewBox="0 0 320 900"
      preserveAspectRatio={side === "left" ? "xMinYMax meet" : "xMaxYMax meet"}
      className={`absolute bottom-0 h-full w-auto ${
        side === "left"
          ? "left-0 -translate-x-[74%] md:-translate-x-[42%] xl:-translate-x-[12%]"
          : "right-0 translate-x-[74%] md:translate-x-[42%] xl:translate-x-[12%]"
      }`}
      focusable="false"
    >
      <g transform={side === "right" ? "translate(320 0) scale(-1 1)" : undefined}>
        {/* back row (lighter, reaches past the top) */}
        <Pine x={120} base={560} h={620} w={96} color="#5FA368" seed={3} />
        <Pine x={230} base={700} h={520} w={84} color="#4F9A5E" seed={5} />
        <Pine x={30} base={420} h={520} w={90} color="#4F9A5E" seed={9} />
        {/* middle row */}
        <Pine x={60} base={760} h={720} w={110} color="#2F7D4A" seed={11} />
        <Pine x={200} base={850} h={560} w={92} color="#3D8A55" seed={13} />
        {/* front row (darkest, anchored to the bottom) */}
        <Pine x={20} base={910} h={640} w={110} color="#1F6340" seed={17} />
        <Pine x={130} base={910} h={380} w={78} color="#245538" seed={19} />
        <Bush x={260} base={905} r={38} color="#5DAE6A" />
        <Bush x={190} base={912} r={30} color="#3D8A55" />
      </g>
    </svg>
  );
}

export function SideTrees() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <TreeWall side="left" />
      <TreeWall side="right" />
    </div>
  );
}
