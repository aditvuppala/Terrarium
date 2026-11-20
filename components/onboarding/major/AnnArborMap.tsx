"use client";

import { useId } from "react";
import { ART_VIEWBOX, BuildingArt } from "./buildings";
import { groupMajors, type MajorGroup } from "./zones";
import "./ann-arbor-map.css";

/*
 * Styles live in a plain, `aamap-`-prefixed CSS file: this repo's turbopack
 * `*.css` rule (next.config.ts) bypasses CSS-module class scoping.
 */

const VB_W = 800;
const VB_H = 640;

const INK = "#1D3935";
const LAND = "#2F5A55";
const CREAM = "#F6E7D2";
const PEACH = "#EDB892";
const RUST = "#B65A3C";
const WATER = "#A8D8CF";
const ROAD = "#E7CDB4";
const LABEL = "#F3E4D8";

const RIVER_D =
  "M -10 92 C 70 88 120 160 176 212 C 232 262 304 276 380 262 C 444 250 486 226 536 236 C 590 246 630 268 680 280 C 726 290 760 292 810 296";

const ROADS = {
  main: "M 140 14 C 141 200 142 420 144 626",
  state: "M 364 262 C 365 380 366 500 368 626",
  washtenaw: "M 560 418 C 640 420 720 426 786 436",
  fuller: "M 604 330 C 628 300 640 270 652 244 C 672 206 716 196 786 194",
};

/** Pines: [x, y, scale]. y is the base of the trunk. */
const PINES: [number, number, number][] = [
  // north-west, above the river
  [40, 62, 1], [72, 48, 1.1], [110, 72, 0.9], [150, 56, 1.05], [190, 90, 0.95], [230, 60, 1.1],
  [262, 102, 0.9], [300, 70, 1], [332, 122, 1.1], [372, 86, 0.9], [410, 132, 1], [430, 62, 0.95],
  [222, 152, 0.9], [282, 172, 1], [342, 194, 0.9], [402, 204, 1], [440, 192, 0.85], [182, 132, 0.85],
  [118, 112, 0.9],
  // north-east, around North Campus
  [752, 62, 1], [772, 112, 1.1], [748, 160, 0.95], [702, 234, 0.9], [762, 242, 1], [736, 266, 0.85],
  // west woods, south of the river
  [34, 200, 1.1], [62, 226, 0.95], [40, 284, 1], [78, 304, 1.15], [56, 364, 0.95], [30, 424, 1],
  [68, 452, 1.1], [38, 504, 0.95], [76, 520, 0.85], [160, 498, 0.9], [196, 526, 1], [224, 482, 0.9],
  [236, 566, 1], [204, 604, 0.95], [244, 616, 0.85], [176, 572, 0.9],
  // between the river and Central
  [404, 340, 0.9], [440, 330, 0.85], [432, 404, 0.8],
  // the Arb, east of the hospital
  [648, 350, 0.9], [680, 378, 1], [706, 342, 1.05], [734, 360, 0.95], [766, 342, 1.1], [756, 392, 0.9],
  [714, 402, 0.85],
  // south-east
  [772, 478, 1], [766, 522, 0.9], [566, 560, 0.85],
];

/** Downtown storefronts along Main St: [x, y, w, h, fill]. */
const SHOPS: [number, number, number, number, string][] = [
  [96, 304, 22, 30, PEACH],
  [96, 340, 22, 40, CREAM],
  [96, 386, 22, 26, RUST],
  [96, 418, 22, 30, CREAM],
  [154, 300, 22, 44, CREAM],
  [154, 350, 22, 28, RUST],
  [154, 384, 22, 34, PEACH],
  [154, 424, 22, 24, CREAM],
];

interface AnnArborMapProps {
  groups: MajorGroup[];
  /** Group whose panel is open. */
  openId: string | null;
  /** Group under the pointer / keyboard focus. */
  hoverId: string | null;
  /** Groups matching the search box (null = no active search). */
  matchIds: Set<string> | null;
  /** Group that holds the previously saved major. */
  currentId: string | null;
  panelId: string;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
}

function CompassRose() {
  const long = [0, 90, 180, 270];
  const short = [45, 135, 225, 315];
  return (
    <g transform="translate(744 584)" aria-hidden="true">
      <circle r="34" fill={LAND} opacity="0.55" />
      <circle r="27" fill="none" stroke={LABEL} strokeWidth="1.4" opacity="0.9" />
      <circle r="23" fill="none" stroke={LABEL} strokeWidth="0.8" strokeDasharray="1.5 3" opacity="0.8" />
      {short.map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M 0 -17 L 3.4 -3.4 L 0 0 Z" fill="#86BBA6" />
          <path d="M 0 -17 L -3.4 -3.4 L 0 0 Z" fill="#5E968A" />
        </g>
      ))}
      {long.map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M 0 -27 L 5 -5 L 0 0 Z" fill={a === 0 ? RUST : LABEL} />
          <path d="M 0 -27 L -5 -5 L 0 0 Z" fill={a === 0 ? "#8E3F27" : "#CDB9A6"} />
        </g>
      ))}
      <circle r="3" fill={LABEL} stroke={INK} strokeWidth="1" />
      <text y="-37" textAnchor="middle" fontSize="13" fill={LABEL} className="aamap-title">
        N
      </text>
    </g>
  );
}

export default function AnnArborMap({
  groups,
  openId,
  hoverId,
  matchIds,
  currentId,
  panelId,
  onToggle,
  onHover,
}: AnnArborMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pineId = `aa-pine-${uid}`;
  const landClip = `aa-land-${uid}`;
  const riverId = `aa-river-${uid}`;

  return (
    <div className="aamap-frame">
      <svg
        className="aamap-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label="Illustrated map of Ann Arbor: the Huron River crosses the north of town, North Campus lies above it, the Medical Campus just below it, Central Campus in the middle next to Downtown, and the stadium to the south-west."
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={landClip}>
            <rect x="14" y="14" width={VB_W - 28} height={VB_H - 28} rx="10" />
          </clipPath>
          <path id={riverId} d={RIVER_D} />
          <g id={pineId}>
            <path
              d="M0 -30 L7 -19 L4 -19 L10 -10 L6 -10 L12 0 L-12 0 L-6 -10 L-10 -10 L-4 -19 L-7 -19 Z"
              fill="#18322F"
            />
            <rect x="-1.6" y="0" width="3.2" height="4" fill="#18322F" />
            <ellipse cx="-3.5" cy="-18.5" rx="2.4" ry="1.1" fill="#F7F3EC" />
            <ellipse cx="5" cy="-9.6" rx="2.6" ry="1.1" fill="#F7F3EC" />
            <ellipse cx="-7" cy="-9.2" rx="1.8" ry="0.9" fill="#F7F3EC" />
            <ellipse cx="0" cy="-28" rx="1.6" ry="0.9" fill="#F7F3EC" />
            <ellipse cx="8.5" cy="-0.6" rx="2" ry="0.9" fill="#F7F3EC" />
          </g>
        </defs>

        {/* poster frame + land */}
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="#F3E4D8" />
        <rect x="14" y="14" width={VB_W - 28} height={VB_H - 28} rx="10" fill={LAND} />

        <g clipPath={`url(#${landClip})`}>
          {/* soft rolling ground */}
          <g fill="#356660">
            <ellipse cx="590" cy="110" rx="250" ry="110" />
            <ellipse cx="440" cy="450" rx="250" ry="160" />
            <ellipse cx="90" cy="570" rx="110" ry="60" />
          </g>
          <g fill="#2A524D">
            <ellipse cx="80" cy="400" rx="100" ry="190" />
            <ellipse cx="740" cy="390" rx="80" ry="60" />
          </g>

          {/* highlight glows behind the groups */}
          {groups.map((g) => {
            const vb = ART_VIEWBOX[g.art];
            const h = (g.w * vb.h) / vb.w;
            const on = g.id === openId || g.id === hoverId;
            const match = matchIds?.has(g.id) ?? false;
            const cls = ["aamap-glow", on ? "aamap-glow-on" : match ? "aamap-glow-match" : ""].join(" ");
            return (
              <ellipse
                key={g.id}
                cx={g.x}
                cy={g.y + 6}
                rx={g.w * 0.62}
                ry={h * 0.7}
                fill="#FBF3EA"
                className={cls}
              />
            );
          })}

          {/* roads (drawn under the river except Fuller, which bridges it) */}
          <g fill="none" stroke={ROAD} strokeLinecap="round" opacity="0.62">
            <path d={ROADS.main} strokeWidth="6" />
            <path d={ROADS.state} strokeWidth="5" />
            <path d={ROADS.washtenaw} strokeWidth="5" />
          </g>

          {/* Huron River */}
          <use href={`#${riverId}`} fill="none" stroke="#24484A" strokeWidth="26" strokeLinecap="round" />
          <use href={`#${riverId}`} fill="none" stroke={WATER} strokeWidth="20" strokeLinecap="round" />
          <use
            href={`#${riverId}`}
            fill="none"
            stroke="#E2F4F0"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="22 22"
            className="aamap-shimmer"
          />
          <use
            href={`#${riverId}`}
            fill="none"
            stroke="#C9EAE3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="8 36"
            strokeDashoffset="14"
            transform="translate(0 5)"
            className="aamap-shimmer-slow"
          />

          {/* bridges: Main St and Fuller Rd over the river */}
          <g strokeLinecap="round">
            <path d="M 140 160 L 140 200" stroke={INK} strokeWidth="11" opacity="0.8" />
            <path d="M 140 160 L 140 200" stroke={ROAD} strokeWidth="7" />
            <path d={ROADS.fuller} fill="none" stroke={INK} strokeWidth="9" opacity="0.35" />
            <path d={ROADS.fuller} fill="none" stroke={ROAD} strokeWidth="6" opacity="0.85" />
          </g>

          {/* North Campus pond */}
          <ellipse cx="752" cy="206" rx="20" ry="8" fill={WATER} stroke="#24484A" strokeWidth="2" />

          {/* pines */}
          {PINES.map(([x, y, s], i) => (
            <use key={i} href={`#${pineId}`} transform={`translate(${x} ${y}) scale(${s})`} />
          ))}

          {/* Downtown storefronts */}
          <g stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
            {SHOPS.map(([x, y, w, h, fill], i) => (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} fill={fill} />
                <rect x={x - 1.5} y={y - 3} width={w + 3} height="3" fill="#F7F3EC" stroke="none" />
              </g>
            ))}
          </g>
          <g fill={INK} opacity="0.5">
            {SHOPS.map(([x, y], i) => (
              <g key={i}>
                <rect x={x + 5} y={y + 7} width="5" height="6" />
                <rect x={x + 13} y={y + 7} width="5" height="6" />
              </g>
            ))}
          </g>

          {/* the stadium bowl */}
          <g stroke={INK} strokeWidth="1.8">
            <ellipse cx="84" cy="574" rx="56" ry="28" fill={CREAM} />
            <ellipse cx="84" cy="576" rx="40" ry="17" fill="#6E9A6B" />
            <path d="M 56 576 H 112 M 84 562 V 590" stroke="#F7F3EC" strokeWidth="1.2" opacity="0.8" />
          </g>

          {/* hand-lettered labels */}
          <g className="aamap-hand" fill={LABEL}>
            <text fontSize="15" dy="-16">
              <textPath href={`#${riverId}`} startOffset="12%">
                Huron River
              </textPath>
            </text>
            <text x="138" y="290" fontSize="15" textAnchor="middle">Downtown</text>
            <text x="452" y="302" fontSize="14" textAnchor="end">Medical Campus</text>
            <text x="548" y="618" fontSize="15">Central Campus</text>
            <text x="84" y="534" fontSize="14" textAnchor="middle">Stadium</text>
            <text x="736" y="322" fontSize="12" textAnchor="middle" opacity="0.9">the Arb</text>
            <g fontSize="11" opacity="0.85">
              <text transform="translate(134 520) rotate(-89)">Main St</text>
              <text transform="translate(378 400) rotate(-89)">State St</text>
              <text transform="translate(706 420) rotate(3)">Washtenaw</text>
              <text transform="translate(694 186) rotate(-2)">Plymouth Rd</text>
            </g>
          </g>

          <CompassRose />
        </g>
      </svg>

      {/* clickable groups: building art + label */}
      {groups.map((g, i) => {
        const vb = ART_VIEWBOX[g.art];
        const h = (g.w * vb.h) / vb.w;
        const isOpen = g.id === openId;
        const isHot = g.id === hoverId;
        const isMatch = matchIds?.has(g.id) ?? false;
        const isDim = matchIds !== null && !isMatch && !isOpen;
        const count = groupMajors(g).length;
        const cls = [
          "aamap-group",
          isOpen ? "aamap-group-active" : "",
          isHot ? "aamap-group-hot" : "",
          isMatch ? "aamap-group-match" : "",
          isDim ? "aamap-group-dim" : "",
        ].join(" ");
        return (
          <button
            key={g.id}
            type="button"
            data-group={g.id}
            className={cls}
            style={{
              left: `${((g.x - g.w / 2) / VB_W) * 100}%`,
              top: `${((g.y - h / 2) / VB_H) * 100}%`,
              width: `${(g.w / VB_W) * 100}%`,
            }}
            aria-label={`${g.title}, ${count} major${count === 1 ? "" : "s"}${
              g.id === currentId ? ", includes your current major" : ""
            }${isMatch ? ", matches your search" : ""}`}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => onToggle(g.id)}
            onMouseEnter={() => onHover(g.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(g.id)}
            onBlur={() => onHover(null)}
          >
            <svg className="aamap-art" viewBox={`0 0 ${vb.w} ${vb.h}`} aria-hidden="true">
              <BuildingArt art={g.art} />
            </svg>
            <span className="aamap-tag" aria-hidden="true">
              <span className="aamap-badge">{i + 1}</span>
              <span className="aamap-label">{g.label}</span>
              {count > 1 && <span className="aamap-count">{count}</span>}
              {g.id === currentId && <span className="aamap-current" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
