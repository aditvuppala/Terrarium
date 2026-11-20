/**
 * Hand-drawn landmark vignettes for the major map. All shapes are original
 * inline SVG drawn for this project (simplified silhouettes of the real
 * buildings); no external assets are used.
 */
import type { ArtId } from "./zones";

const INK = "#1D3935";
const SNOW = "#F7F3EC";
const STONE = "#ECE1CD";
const STONE_LIGHT = "#F4ECDD";
const STONE_SHADE = "#C9B596";
const BRICK = "#B65A3C";
const BRICK_LIGHT = "#C9774F";
const BRICK_DARK = "#9A4730";
const GLASS = "#9CCBC5";
const GLASS_DARK = "#3E6E6B";
const PATINA = "#86BBA6";
const ROOF = "#24484A";
const WATER = "#A8D8CF";
const GRASS = "#3F7069";
const GOLD = "#F2C14E";

export const ART_VIEWBOX: Record<ArtId, { w: number; h: number }> = {
  north: { w: 200, h: 112 },
  medical: { w: 140, h: 112 },
  lsa: { w: 220, h: 120 },
  ross: { w: 136, h: 112 },
  "central-schools": { w: 140, h: 112 },
};

const line = { stroke: INK, strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Ground({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={rx} ry="7" fill={GRASS} />
      <ellipse cx={cx - rx * 0.45} cy={cy - 1} rx={rx * 0.22} ry="2.2" fill={SNOW} opacity="0.55" />
      <ellipse cx={cx + rx * 0.5} cy={cy + 1} rx={rx * 0.16} ry="1.8" fill={SNOW} opacity="0.5" />
    </>
  );
}

/** Snowy cap along a flat roof. */
function SnowCap({ x, y, w }: { x: number; y: number; w: number }) {
  return <rect x={x} y={y - 2.4} width={w} height="3" rx="1.5" fill={SNOW} />;
}

/** A row of small windows. */
function WindowRow({
  x,
  y,
  count,
  gap,
  w = 4,
  h = 5,
  fill = GLASS_DARK,
}: {
  x: number;
  y: number;
  count: number;
  gap: number;
  w?: number;
  h?: number;
  fill?: string;
}) {
  return (
    <g fill={fill}>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x + i * gap} y={y} width={w} height={h} rx="0.6" />
      ))}
    </g>
  );
}

function RoundTree({ x, y, r = 6 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <rect x={x - 0.9} y={y - 2} width="1.8" height="6" fill={INK} />
      <circle cx={x} cy={y - r} r={r} fill="#1F3D39" stroke={INK} strokeWidth="1" />
      <ellipse cx={x - r * 0.35} cy={y - r * 1.55} rx={r * 0.45} ry={r * 0.2} fill={SNOW} />
      <ellipse cx={x + r * 0.45} cy={y - r * 0.8} rx={r * 0.3} ry={r * 0.15} fill={SNOW} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* North Campus: Duderstadt Center, Lurie Bell Tower + fountain,       */
/* Art & Architecture Building                                         */
/* ------------------------------------------------------------------ */
function NorthArt() {
  return (
    <g>
      <Ground cx={100} cy={104} rx={97} />

      {/* Duderstadt Center: long, low, ribbon of glass under a dark roof slab */}
      <g {...line}>
        <rect x="8" y="64" width="84" height="36" fill={STONE} />
        <rect x="8" y="70" width="84" height="15" fill={GLASS_DARK} />
        <rect x="8" y="89" width="84" height="11" fill={GLASS} />
        <rect x="4" y="59" width="92" height="5" fill={ROOF} />
        {/* rounded glass prow on the east end */}
        <path d="M 92 64 H 96 A 8 18 0 0 1 96 100 H 92 Z" fill={GLASS} />
      </g>
      <SnowCap x={5} y={59} w={90} />
      <g stroke={GLASS} strokeWidth="0.9" opacity="0.9">
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d={`M ${16 + i * 8} 70 V 85`} />
        ))}
      </g>
      <g stroke={GLASS_DARK} strokeWidth="0.8" opacity="0.6">
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d={`M ${16 + i * 8} 89 V 100`} />
        ))}
      </g>
      <path d="M 14 72 L 22 83 M 40 72 L 48 83 M 66 72 L 74 83" stroke="#CFEAE5" strokeWidth="1.2" opacity="0.55" />

      {/* Lurie Bell Tower: slender shaft, open belfry, steep spire */}
      <g {...line}>
        <path d="M 105 100 L 107 44 H 121 L 123 100 Z" fill={STONE_LIGHT} />
        <rect x="104" y="27" width="20" height="17" fill={STONE_LIGHT} />
        <rect x="101.5" y="24" width="25" height="4" fill={ROOF} />
        <path d="M 103 24 L 114 0.5 L 125 24 Z" fill={PATINA} />
      </g>
      <path d="M 114 2 V 24" stroke={INK} strokeWidth="0.8" opacity="0.5" />
      <path d="M 108.5 24 L 114 8 M 119.5 24 L 114 8" stroke="#B8DCCD" strokeWidth="0.9" opacity="0.9" />
      {/* belfry openings with bells */}
      <g fill={INK}>
        <path d="M 107.5 42 V 32 A 2.5 2.5 0 0 1 112.5 32 V 42 Z" />
        <path d="M 115.5 42 V 32 A 2.5 2.5 0 0 1 120.5 32 V 42 Z" />
      </g>
      <g fill={GOLD}>
        <path d="M 108.6 39 Q 110 33.5 111.4 39 Z" />
        <path d="M 116.6 39 Q 118 33.5 119.4 39 Z" />
      </g>
      <path d="M 111 50 V 94 M 117 50 V 94" stroke={STONE_SHADE} strokeWidth="1.4" />
      <SnowCap x={102.5} y={24} w={23} />
      {/* fountain at the foot */}
      <ellipse cx="114" cy="104" rx="13" ry="3.2" fill={WATER} stroke={INK} strokeWidth="1.1" />
      <path
        d="M 114 103 C 113 98 111 96 108 96 M 114 103 C 115 98 117 96 120 96 M 114 103 V 95"
        stroke="#E2F4F0"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Art & Architecture Building: brick block with long window bands */}
      <g {...line}>
        <rect x="132" y="52" width="62" height="48" fill={BRICK} />
        <rect x="129" y="48" width="68" height="5" fill={ROOF} />
        <rect x="155" y="86" width="16" height="14" fill={GLASS} />
      </g>
      <SnowCap x={130} y={48} w={66} />
      <g fill={STONE_LIGHT}>
        <rect x="136" y="58" width="54" height="5" />
        <rect x="136" y="68" width="54" height="5" />
        <rect x="136" y="78" width="54" height="5" />
      </g>
      <g stroke={BRICK_DARK} strokeWidth="1">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M ${142 + i * 7} 58 V 83`} />
        ))}
      </g>
      <path d="M 163 86 V 100" stroke={INK} strokeWidth="0.8" />

      <RoundTree x={100} y={102} r={5} />
      <RoundTree x={198} y={102} r={5.5} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Medical Campus: University Hospital tower + Mott Children's curve   */
/* ------------------------------------------------------------------ */
function MedicalArt() {
  return (
    <g>
      <Ground cx={70} cy={104} rx={68} />

      {/* University Hospital: tall block with a rooftop penthouse */}
      <g {...line}>
        <rect x="26" y="12" width="26" height="9" fill={STONE} />
        <rect x="8" y="20" width="62" height="80" fill={STONE_LIGHT} />
        <rect x="6" y="18" width="66" height="4" fill={ROOF} />
        <rect x="28" y="88" width="22" height="12" fill={GLASS} />
      </g>
      <SnowCap x={7} y={18} w={64} />
      <SnowCap x={27} y={12} w={24} />
      {Array.from({ length: 7 }, (_, r) => (
        <WindowRow key={r} x={13 + (r < 2 ? 18 : 0)} y={27 + r * 8.5} count={r < 2 ? 4 : 6} gap={9} w={5} h={4.5} />
      ))}
      {/* hospital cross sign */}
      <g>
        <rect x="11" y="25" width="15" height="15" rx="2.5" fill={BRICK} stroke={INK} strokeWidth="1.2" />
        <path d="M 18.5 28.5 V 36.5 M 14.5 32.5 H 22.5" stroke={SNOW} strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <path d="M 39 88 V 100" stroke={INK} strokeWidth="0.8" />

      {/* Mott Children's Hospital: curved glass front with colorful panels */}
      <g {...line}>
        <path d="M 70 40 C 92 28 116 28 134 38 V 100 H 70 Z" fill={GLASS} />
      </g>
      <g fill="none" stroke="#6FA9A3" strokeWidth="1">
        <path d="M 70 52 C 92 41 116 41 134 50" />
        <path d="M 70 64 C 92 53 116 53 134 62" />
        <path d="M 70 76 C 92 65 116 65 134 74" />
        <path d="M 70 88 C 92 77 116 77 134 86" />
      </g>
      <g stroke={INK} strokeWidth="0.6">
        <rect x="76" y="44" width="7" height="6" fill={GOLD} transform="rotate(-14 79 47)" />
        <rect x="98" y="47" width="7" height="6" fill="#EDB892" transform="rotate(-4 101 50)" />
        <rect x="118" y="58" width="7" height="6" fill={BRICK} transform="rotate(8 121 61)" />
        <rect x="86" y="64" width="7" height="6" fill={BRICK} transform="rotate(-10 89 67)" />
        <rect x="110" y="70" width="7" height="6" fill={GOLD} transform="rotate(4 113 73)" />
        <rect x="78" y="80" width="7" height="6" fill="#EDB892" transform="rotate(-12 81 83)" />
        <rect x="124" y="84" width="6" height="6" fill="#EDB892" transform="rotate(8 127 87)" />
      </g>
      <path d="M 70 40 C 92 28 116 28 134 38" fill="none" stroke={SNOW} strokeWidth="3" strokeLinecap="round" />
      <path d="M 74 48 L 84 60 M 104 46 L 114 58" stroke="#E2F4F0" strokeWidth="1.2" opacity="0.6" />
      <rect x="66" y="92" width="30" height="3.5" fill={ROOF} stroke={INK} strokeWidth="1" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* LSA: Angell Hall portico, Burton Memorial Tower, Hatcher, the Diag  */
/* ------------------------------------------------------------------ */
function LsaArt() {
  const cols = Array.from({ length: 8 }, (_, i) => 27 + i * 10.4);
  return (
    <g>
      <Ground cx={110} cy={112} rx={108} />
      {/* the Diag: crossing paths in front */}
      <path
        d="M 22 117 L 196 107 M 30 106 L 204 118"
        stroke="#E7CDB4"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Angell Hall: wide stone hall with an 8-column portico, no pediment */}
      <g {...line}>
        <rect x="4" y="44" width="116" height="62" fill={STONE} />
        <rect x="2" y="39" width="120" height="6" fill={STONE_LIGHT} />
        <rect x="22" y="56" width="82" height="42" fill={STONE_SHADE} />
        <rect x="19" y="46" width="88" height="10" fill={STONE_LIGHT} />
        <rect x="16" y="98" width="94" height="4" fill={STONE_LIGHT} />
        <rect x="12" y="102" width="102" height="4" fill={STONE_LIGHT} />
      </g>
      <SnowCap x={3} y={39} w={118} />
      <path d="M 21 51 H 105" stroke={INK} strokeWidth="0.7" opacity="0.5" />
      {/* doors behind the columns */}
      <g fill={ROOF} opacity="0.85">
        <rect x="38" y="74" width="6" height="24" />
        <rect x="59" y="74" width="8" height="24" />
        <rect x="82" y="74" width="6" height="24" />
      </g>
      {cols.map((x) => (
        <g key={x}>
          <rect x={x} y="57" width="5" height="41" fill={SNOW} stroke={INK} strokeWidth="0.9" />
          <rect x={x - 1} y="56" width="7" height="2.4" fill={STONE_LIGHT} stroke={INK} strokeWidth="0.7" />
          <path d={`M ${x + 2.5} 60 V 96`} stroke={STONE_SHADE} strokeWidth="0.8" />
        </g>
      ))}
      {/* wing windows */}
      <WindowRow x={7} y={60} count={1} gap={0} w={5} h={8} />
      <WindowRow x={7} y={76} count={1} gap={0} w={5} h={8} />
      <WindowRow x={110} y={60} count={1} gap={0} w={5} h={8} />
      <WindowRow x={110} y={76} count={1} gap={0} w={5} h={8} />

      {/* Burton Memorial Tower: art-deco shaft, clock, stepped crown */}
      <g {...line}>
        <rect x="130" y="100" width="44" height="6" fill={STONE_LIGHT} />
        <rect x="137" y="30" width="30" height="70" fill={STONE_LIGHT} />
        <rect x="140" y="21" width="24" height="10" fill={STONE_LIGHT} />
        <rect x="144" y="13" width="16" height="9" fill={STONE_LIGHT} />
        <rect x="147.5" y="6" width="9" height="8" fill={STONE_LIGHT} />
      </g>
      <SnowCap x={140.5} y={21} w={23} />
      <SnowCap x={144.5} y={13} w={15} />
      <SnowCap x={147.5} y={6} w={9} />
      <SnowCap x={137.5} y={30} w={29} />
      <g fill={STONE_SHADE}>
        <rect x="141.5" y="50" width="3" height="46" />
        <rect x="150.5" y="50" width="3" height="46" />
        <rect x="159.5" y="50" width="3" height="46" />
        <rect x="149.5" y="15.5" width="1.6" height="5" />
        <rect x="153" y="15.5" width="1.6" height="5" />
      </g>
      <circle cx="152" cy="40" r="6.5" fill={SNOW} stroke={INK} strokeWidth="1.2" />
      <path d="M 152 40 V 35.8 M 152 40 L 155 41.6" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <rect x="148" y="90" width="8" height="10" fill={ROOF} stroke={INK} strokeWidth="1" />

      {/* Hatcher Graduate Library: brick with tall arched windows */}
      <g {...line}>
        <rect x="178" y="56" width="38" height="50" fill={BRICK_LIGHT} />
        <rect x="175" y="52" width="44" height="5" fill={STONE_LIGHT} />
      </g>
      <SnowCap x={176} y={52} w={42} />
      <g fill={GLASS_DARK} stroke={INK} strokeWidth="0.7">
        {[183, 194, 205].map((x) => (
          <path key={x} d={`M ${x} 98 V 68 A 3.5 3.5 0 0 1 ${x + 7} 68 V 98 Z`} />
        ))}
      </g>

      <RoundTree x={126} y={110} r={5.5} />
      <RoundTree x={10} y={113} r={5} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Ross School of Business: limestone block + glass Winter Garden      */
/* ------------------------------------------------------------------ */
function RossArt() {
  return (
    <g>
      <Ground cx={68} cy={104} rx={66} />
      {/* main limestone block with penthouse */}
      <g {...line}>
        <rect x="16" y="15" width="30" height="10" fill={STONE} />
        <rect x="8" y="24" width="46" height="76" fill={STONE} />
      </g>
      <SnowCap x={16.5} y={15} w={29} />
      <SnowCap x={8.5} y={24} w={45} />
      <g fill={GLASS_DARK}>
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x="12" y={30 + i * 9} width="38" height="4.2" rx="0.5" />
        ))}
      </g>
      <g stroke={STONE} strokeWidth="1.1">
        <path d="M 21.5 30 V 92 M 31 30 V 92 M 40.5 30 V 92" />
      </g>

      {/* Winter Garden atrium: sloped glass */}
      <g {...line}>
        <path d="M 54 40 L 100 58 V 100 H 54 Z" fill={GLASS} />
      </g>
      <g stroke="#6FA9A3" strokeWidth="0.9">
        <path d="M 63 43.5 V 100 M 72 47 V 100 M 81 50.6 V 100 M 90 54 V 100" />
        <path d="M 54 60 L 100 72 M 54 80 L 100 86" />
      </g>
      <path d="M 58 50 L 70 74 M 76 56 L 88 82" stroke="#E2F4F0" strokeWidth="1.4" opacity="0.6" />
      <path d="M 54 40 L 100 58" stroke={SNOW} strokeWidth="2.8" strokeLinecap="round" />

      {/* east wing with vertical fins */}
      <g {...line}>
        <rect x="100" y="52" width="30" height="48" fill={STONE} />
        <rect x="100" y="88" width="30" height="12" fill={GLASS} />
      </g>
      <SnowCap x={100.5} y={52} w={29} />
      <g stroke={STONE_SHADE} strokeWidth="2">
        <path d="M 106 58 V 84 M 113 58 V 84 M 120 58 V 84 M 126 58 V 84" />
      </g>
      <g fill={GLASS_DARK}>
        <rect x="107.5" y="58" width="4" height="26" />
        <rect x="114.5" y="58" width="4" height="26" />
        <rect x="121.5" y="58" width="3" height="26" />
      </g>
      <rect x="70" y="93" width="16" height="7" fill={ROOF} stroke={INK} strokeWidth="1" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Central Campus schools: North Quad tower (UMSI) + Weill Hall (Ford) */
/* ------------------------------------------------------------------ */
function CentralSchoolsArt() {
  return (
    <g>
      <Ground cx={70} cy={104} rx={68} />

      {/* North Quad: brick wing with a slate roof and a corner tower */}
      <g {...line}>
        <path d="M 4 54 L 12 43 H 70 L 78 54 Z" fill={ROOF} />
        <rect x="6" y="54" width="70" height="46" fill={BRICK} />
      </g>
      <path d="M 12 43 H 70" stroke={SNOW} strokeWidth="3" strokeLinecap="round" />
      <path d="M 9 49 L 14 45 M 62 47 L 70 47" stroke={SNOW} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      {[60, 72, 84].map((y) => (
        <WindowRow key={y} x={46} y={y} count={3} gap={9} w={5} h={7} fill={STONE_LIGHT} />
      ))}
      <WindowRow x={10} y={60} count={1} gap={0} w={5} h={7} fill={STONE_LIGHT} />
      <WindowRow x={10} y={72} count={1} gap={0} w={5} h={7} fill={STONE_LIGHT} />
      <g {...line}>
        <rect x="22" y="22" width="20" height="78" fill={BRICK_DARK} />
        <rect x="20" y="20" width="24" height="4" fill={STONE_LIGHT} />
        <path d="M 20 20 L 32 1 L 44 20 Z" fill={PATINA} />
      </g>
      <path d="M 26 20 L 32 6" stroke="#B8DCCD" strokeWidth="1" />
      <SnowCap x={20.5} y={20} w={23} />
      <circle cx="32" cy="32" r="4.5" fill={SNOW} stroke={INK} strokeWidth="1" />
      <path d="M 32 32 V 29.2 M 32 32 L 34 33" stroke={INK} strokeWidth="0.9" strokeLinecap="round" />
      <g fill={STONE_LIGHT} stroke={INK} strokeWidth="0.6">
        <path d="M 29 62 V 46 A 3 3 0 0 1 35 46 V 62 Z" />
        <rect x="28" y="86" width="8" height="14" fill={ROOF} />
      </g>

      {/* Weill Hall: brick with a full-height glass corner */}
      <g {...line}>
        <rect x="80" y="44" width="54" height="56" fill={BRICK_LIGHT} />
        <rect x="112" y="44" width="22" height="56" fill={GLASS} />
        <rect x="78" y="40" width="58" height="4.5" fill={ROOF} />
      </g>
      <SnowCap x={79} y={40} w={56} />
      {[52, 64, 76].map((y) => (
        <WindowRow key={y} x={85} y={y} count={3} gap={8.5} w={5} h={6} />
      ))}
      <g stroke="#6FA9A3" strokeWidth="0.9">
        <path d="M 112 55 H 134 M 112 66 H 134 M 112 77 H 134 M 112 88 H 134 M 123 44 V 100" />
      </g>
      <path d="M 115 48 L 122 60 M 125 70 L 132 82" stroke="#E2F4F0" strokeWidth="1.2" opacity="0.6" />
      <rect x="92" y="88" width="12" height="12" fill={ROOF} stroke={INK} strokeWidth="1" />
    </g>
  );
}

export function BuildingArt({ art }: { art: ArtId }) {
  switch (art) {
    case "north":
      return <NorthArt />;
    case "medical":
      return <MedicalArt />;
    case "lsa":
      return <LsaArt />;
    case "ross":
      return <RossArt />;
    case "central-schools":
      return <CentralSchoolsArt />;
  }
}
