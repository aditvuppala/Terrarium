/**
 * Decorative landing-page backdrop: sky up top, then a meadow with a winding
 * river (flat illustration style) with forest right up to the banks, framed by
 * tall forests.
 * Pure SVG + CSS (see globals.css `.tr-*`), no client JS. Night mode is driven
 * entirely by CSS from the `data-night` attribute that <NightScene> sets on the
 * page wrapper.
 *
 * - <SkyDecor>: sun, moon, stars, night sky + drifting clouds (the sky band).
 * - <RiverValley>: meadow + river; fills its (relative) parent, horizon at top.
 *   A tall pine tree line rises a little above the horizon (SVG overflow).
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

const fmt = (n: number) => n.toFixed(1);

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

/**
 * Deterministic star field for the night sky (viewBox 1440 x 520, drawn at 1:1
 * and centered, like the hero column). Stars skip the block where the hero
 * copy sits so none of them cross the letters.
 */
const STARS = (() => {
  const r = rng(7);
  const stars: { x: number; y: number; rad: number; twinkle?: string }[] = [];
  while (stars.length < 64) {
    const x = r() * 1440;
    const y = 8 + Math.pow(r(), 1.3) * 400; // denser up high
    const rad = 0.7 + r() * 1.3;
    if (x > 330 && x < 1050 && y > 42 && y < 348) continue;
    const i = stars.length;
    stars.push({ x, y, rad, twinkle: i % 4 === 0 ? `tr-twinkle tr-twinkle-${i % 3}` : undefined });
  }
  return stars;
})();

function Moon() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" focusable="false">
      <circle cx="32" cy="32" r="31" fill="#F4F1E1" />
      <circle cx="22" cy="24" r="6" fill="#E0DCC6" />
      <circle cx="40" cy="40" r="8" fill="#E0DCC6" />
      <circle cx="42" cy="19" r="3.5" fill="#E0DCC6" />
      <circle cx="21" cy="44" r="3" fill="#E0DCC6" />
    </svg>
  );
}

export function SkyDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* night sky, sunset glow and stars fade in over the day gradient */}
      <div className="tr-night-sky absolute inset-0 bg-linear-to-b from-[#0B1630] via-[#16284A] to-[#2A4166]" />
      <div className="tr-dusk absolute inset-x-0 top-0 h-[600px]" />
      <svg
        viewBox="0 0 1440 520"
        preserveAspectRatio="xMidYMin slice"
        className="tr-stars absolute inset-x-0 top-0 h-[520px] w-full"
        focusable="false"
      >
        {STARS.map((s, i) => (
          <circle key={i} cx={fmt(s.x)} cy={fmt(s.y)} r={fmt(s.rad)} fill="#FFFDF2" className={s.twinkle} />
        ))}
      </svg>

      <div className="tr-sun absolute right-[22%] top-10 hidden h-20 w-20 rounded-full bg-[#FBD978] shadow-[0_0_60px_24px_rgba(251,217,120,0.5)] sm:block" />
      <div className="tr-moon absolute right-[24%] top-12 hidden h-16 w-16 rounded-full shadow-[0_0_48px_14px_rgba(226,234,255,0.25)] sm:block">
        <Moon />
      </div>

      <div className="tr-clouds">
        <Cloud className="tr-drift absolute right-[30%] top-36 hidden opacity-95 md:block" width={130} />
        <Cloud className="tr-drift-slow absolute right-[16%] top-56 hidden opacity-85 lg:block" width={100} />
      </div>
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

const RIVER_PATH = (() => {
  const left = RIVER_PTS.map((p) => `${fmt(p.x - p.w / 2)} ${p.y}`);
  const right = [...RIVER_PTS].reverse().map((p) => `${fmt(p.x + p.w / 2)} ${p.y}`);
  return `M${left.join(" L")} L${right.join(" L")} Z`;
})();

const RIVER_CHANNEL =
  "M" +
  RIVER_PTS.map((p) => `${fmt(p.x - p.w * 0.28)} ${p.y}`).join(" L") +
  " L" +
  [...RIVER_PTS].reverse().map((p) => `${fmt(p.x + p.w * 0.18)} ${p.y}`).join(" L") +
  " Z";

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

/** Where the river meets the horizon; the tree line is lowest around here. */
const FAR_X = RIVER_PTS[0].x;

const smooth = (a: number, b: number, v: number) => {
  const k = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/**
 * How far (viewBox units) tree tops may rise above the horizon at x. Kept low
 * through the middle so nothing sits behind the hero copy, rising toward the
 * edges where the tree line meets the full-height tree walls.
 */
const skyCap = (x: number) => 42 + 120 * smooth(300, 720, Math.abs(x - FAR_X));

/** Mix two #rrggbb colors (k = 0 → a, 1 → b). */
function mix(a: string, b: string, k: number) {
  const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Atmospheric haze color that distant trees fade toward. */
const HAZE = "#A9CDB4";

/** Outline of a slender, tiered pine as one closed subpath. */
function pineOutline(x: number, base: number, h: number, w: number) {
  const n = 4;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 1; i <= n; i++) {
    const y = base - h + h * 0.94 * (i / n);
    const hw = w * (0.35 + 0.65 * (i / n));
    left.push(`${fmt(x - hw)} ${fmt(y)}`);
    right.unshift(`${fmt(x + hw)} ${fmt(y)}`);
    if (i < n) {
      const iy = y - h * 0.035;
      left.push(`${fmt(x - hw * 0.45)} ${fmt(iy)}`);
      right.unshift(`${fmt(x + hw * 0.45)} ${fmt(iy)}`);
    }
  }
  return `M${fmt(x)} ${fmt(base - h)} L${left.join(" L")} L${fmt(x)} ${fmt(base)} L${right.join(" L")} Z`;
}

/**
 * Far tree line: three silhouette layers (hazy at the back, deeper in front),
 * each drawn as a single <path> so the DOM stays small.
 */
const FAR_LAYERS = [
  { seed: 31, base: HORIZON + 6, rise: 1.0, color: mix("#5E9E73", HAZE, 0.6), band: 30 },
  { seed: 37, base: HORIZON + 16, rise: 0.86, color: mix("#4A8F60", HAZE, 0.4), band: 30 },
  { seed: 41, base: HORIZON + 28, rise: 0.72, color: mix("#3D8455", HAZE, 0.2), band: 34 },
].map((layer) => {
  const r = rng(layer.seed);
  const parts: string[] = [];
  let x = -30 + r() * 10;
  while (x < VB_W + 30) {
    // height above this layer's base; tops never rise past the sky cap
    const h = (skyCap(x) * layer.rise + (layer.base - HORIZON)) * (0.6 + r() * 0.4);
    const w = Math.max(6, h * 0.2);
    parts.push(pineOutline(x, layer.base, h, w));
    x += w * (0.9 + r() * 0.6);
  }
  // forest floor under the layer
  parts.push(`M-40 ${layer.base - 2} H${VB_W + 40} V${layer.base + layer.band} H-40 Z`);
  return { d: parts.join(" "), color: layer.color };
});

/** Forest filling both banks, from the shoreline out to the edges, back to front. */
const BANK_TREES = (() => {
  const r = rng(21);
  const palette = ["#2F7D4A", "#3D8A55", "#4F9A5E", "#245538", "#5FA368"];
  const trees: { x: number; base: number; h: number; w: number; color: string; shade: number }[] = [];
  let y = HORIZON + 36;
  while (y < VB_H + 30) {
    const t = Math.min(1, (y - HORIZON) / (VB_H - HORIZON));
    // tall, slender pines even at the back; taller still up front
    const tallH = 60 + t * 120;
    const haze = Math.pow(1 - t, 2.4) * 0.5;
    const river = riverAt(Math.min(y, VB_H));
    const gap = 4 + t * 10;
    const w0 = tallH * 0.26;
    for (const side of [-1, 1]) {
      // start at the shoreline and walk outward to the page edge
      let x = river.x + side * (river.w / 2 + gap + w0 * 0.6);
      while (side < 0 ? x > -w0 : x < VB_W + w0) {
        const tx = x + (r() - 0.5) * w0 * 0.5;
        const base = y + (r() - 0.5) * 6;
        const scale = 0.8 + r() * 0.36;
        const color = palette[Math.floor(r() * palette.length)];
        // never poke higher into the sky than the tree line allows
        const h = Math.min(tallH * scale, base - HORIZON + skyCap(tx) * 0.9);
        const w = Math.max(6, h * 0.26);
        // skip trees whose crown would hang over the water further upstream
        const crown = riverAt(Math.max(HORIZON, base - h * 0.55));
        const clear = Math.abs(tx - crown.x) > crown.w / 2 + w * 0.7;
        if (clear) trees.push({ x: tx, base, h, w, color: mix(color, HAZE, haze), shade: haze > 0.2 ? 0.09 : 0.16 });
        x += side * w0 * (1.2 + r() * 0.45);
      }
    }
    y += 12 + t * 44;
  }
  return trees.sort((p, q) => p.base - q.base);
})();

/** Lightweight pine for the dense bank forest: trunk, body and shade (3 nodes). */
function BankPine({ x, base, h, w, color, shade }: { x: number; base: number; h: number; w: number; color: string; shade: number }) {
  const tiers = [
    [base - h * 0.46, base - h * 0.04, w],
    [base - h * 0.72, base - h * 0.3, w * 0.76],
    [base - h, base - h * 0.55, w * 0.52],
  ];
  const body = tiers.map(([a, b, hw]) => `M${fmt(x)} ${fmt(a)} L${fmt(x - hw)} ${fmt(b)} L${fmt(x + hw)} ${fmt(b)}Z`).join("");
  const dark = tiers.map(([a, b, hw]) => `M${fmt(x)} ${fmt(a)} L${fmt(x + hw)} ${fmt(b)} L${fmt(x)} ${fmt(b)}Z`).join("");
  return (
    <>
      <rect x={fmt(x - w * 0.09)} y={fmt(base - h * 0.08)} width={fmt(w * 0.18)} height={fmt(h * 0.08)} fill={TRUNK} />
      <path d={body} fill={color} stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <path d={dark} fill="#0B2A17" opacity={shade} />
    </>
  );
}

export function RiverValley() {
  return (
    <div aria-hidden="true" className="tr-land pointer-events-none absolute inset-0">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMin slice"
        className="h-full w-full overflow-visible"
        focusable="false"
      >
        {/* distant hills on the horizon */}
        <path d="M0 50 C220 0 420 20 620 30 S1060 -8 1440 34 V620 H0 Z" fill="#B7DCA0" />
        <path d="M0 62 C300 36 560 46 720 44 S1180 38 1440 62 V620 H0 Z" fill="#A6D38C" />
        {/* meadow bands (flat) */}
        <path d="M0 200 C360 176 1080 190 1440 210 V620 H0 Z" fill="#9CCB80" />
        <path d="M0 420 C360 400 1080 410 1440 430 V620 H0 Z" fill="#8FC274" />

        {/* tall tree line all the way back, rising above the horizon */}
        {FAR_LAYERS.map((l, i) => (
          <path key={`far-${i}`} d={l.d} fill={l.color} />
        ))}

        {/* shore edge */}
        <path d={RIVER_PATH} fill="#2E6B5E" stroke="#2E6B5E" strokeWidth="8" strokeLinejoin="round" />
        {/* water: flat fill + lighter inner channel */}
        <path d={RIVER_PATH} fill="#2F7FA0" />
        <path d={RIVER_CHANNEL} fill="#3B8FAF" />

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
    <div aria-hidden="true" className="tr-land pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <TreeWall side="left" />
      <TreeWall side="right" />
    </div>
  );
}
