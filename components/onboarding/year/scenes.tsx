import type { CSSProperties, ReactNode } from "react";
import "./adventure.css";
import styles from "./styles";

/*
 * Five flat-vector scenes on a shared 400x400 canvas. Key content sits in
 * y 90-310 so the phone banner crop (16:9, centered) keeps the hero visible.
 * Any element animated with CSS has no SVG `transform` attribute; its origin
 * is set in user units through `o()` / `m()`.
 */

const C = {
  skin: "#E7AF88",
  skinShade: "#CF9670",
  hair: "#3B2A22",
  orange: "#E8783F",
  orangeDark: "#C65F2C",
  red: "#C8513A",
  redDark: "#A13F2C",
  pants: "#34415A",
  pantsDark: "#273248",
  boot: "#4A3328",
  moss: "#2F6B47",
  mossDark: "#245538",
  mustard: "#D9A441",
  mustardDark: "#B8872F",
  steel: "#3E4B58",
  white: "#FFFFFF",
};

type MotionVars = {
  a?: string;
  dur?: string;
  delay?: string;
  h?: string;
  x?: string;
};

/** Motion style: transform origin in SVG user units + CSS custom properties. */
function m(x: number, y: number, vars: MotionVars = {}): CSSProperties {
  const style: Record<string, string> = { transformOrigin: `${x}px ${y}px` };
  if (vars.a) style["--a"] = vars.a;
  if (vars.dur) style["--dur"] = vars.dur;
  if (vars.delay) style["--delay"] = vars.delay;
  if (vars.h) style["--h"] = vars.h;
  if (vars.x) style["--x"] = vars.x;
  return style as CSSProperties;
}

function Limb({ d, color, w }: { d: string; color: string; w: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Sky({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#${id})`} />
    </>
  );
}

function Cloud({ x, y, s = 1, fill = C.white }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
      <rect x="-34" y="-8" width="68" height="18" rx="9" />
      <circle cx="-10" cy="-10" r="14" />
      <circle cx="12" cy="-6" r="10" />
    </g>
  );
}

function Pine({ x, y, h, fill }: { x: number; y: number; h: number; fill: string }) {
  const w = h * 0.36;
  return (
    <g>
      <rect x={x - 2.5} y={y - h * 0.2} width="5" height={h * 0.22} fill="#5A3F2E" />
      <path
        d={`M${x} ${y - h} L${x + w * 0.62} ${y - h * 0.56} L${x + w * 0.38} ${y - h * 0.56} L${x + w} ${y - h * 0.16} L${x - w} ${y - h * 0.16} L${x - w * 0.38} ${y - h * 0.56} L${x - w * 0.62} ${y - h * 0.56} Z`}
        fill={fill}
      />
    </g>
  );
}

/** Wrapper for the hero of a scene: hops in when the scene activates. */
function Hero({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g className={styles.pop} style={m(x, y)}>
      {children}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Freshman: a casual walk                                             */
/* ------------------------------------------------------------------ */

export function WalkScene({ uid }: { uid: string }) {
  const hipX = 198;
  const hipY = 266;
  const shX = 198;
  const shY = 228;
  const walk = "1.05s";
  const half = "-0.525s";
  return (
    <>
      <Sky id={`${uid}-sky`} top="#F9E6CC" bottom="#EEF3E6" />
      <circle cx="292" cy="122" r="58" fill="#F6C978" opacity="0.22" />
      <circle cx="292" cy="122" r="36" fill="#F5C46E" />

      <g className={styles.drift} style={m(0, 0, { dur: "11s", x: "16px" })}>
        <Cloud x={92} y={112} s={0.9} />
        <Cloud x={238} y={176} s={0.6} fill="#FFFDF8" />
      </g>

      <g fill="none" stroke="#6E8574" strokeWidth="2" strokeLinecap="round" className={styles.drift} style={m(0, 0, { dur: "7s", x: "10px" })}>
        <path d="M150 96 q5 -5 10 0 q5 -5 10 0" />
        <path d="M178 84 q4 -4 8 0 q4 -4 8 0" />
      </g>

      {/* far hills */}
      <path d="M0 238 C 60 206 120 210 170 232 C 222 254 282 200 400 222 V400 H0 Z" fill="#CADBC4" />
      <rect x="97" y="200" width="6" height="26" rx="2" fill="#86664E" />
      <circle cx="100" cy="194" r="18" fill="#93B58D" />
      <circle cx="94" cy="188" r="7" fill="#A9C6A2" />
      {/* mid hills */}
      <path d="M0 272 C 90 240 170 250 240 268 C 300 284 350 256 400 258 V400 H0 Z" fill="#A6C49F" />
      <Pine x={334} y={262} h={46} fill="#5F8A66" />
      <Pine x={356} y={264} h={34} fill="#6C9672" />
      <Pine x={44} y={258} h={30} fill="#6C9672" />
      {/* foreground */}
      <path d="M0 296 C 120 282 280 286 400 298 V400 H0 Z" fill="#88AE84" />
      <path
        d="M-20 346 C 80 320 150 311 220 310 C 290 309 340 297 420 289"
        fill="none"
        stroke="#EEE1C6"
        strokeWidth="26"
        strokeLinecap="round"
      />
      {/* tufts + flowers */}
      <g fill="#6F9A6C">
        <path d="M70 300 l4 -12 l3 12 l4 -9 l2 9 z" />
        <path d="M306 330 l4 -12 l3 12 l4 -9 l2 9 z" />
        <path d="M140 352 l4 -12 l3 12 l4 -9 l2 9 z" />
      </g>
      <circle cx="78" cy="290" r="3.2" fill={C.orange} />
      <circle cx="314" cy="320" r="3.2" fill="#F2C14E" />
      <circle cx="150" cy="343" r="3.2" fill="#F2F2EA" />

      <ellipse cx="200" cy="311" rx="26" ry="4.5" fill="#24412E" opacity="0.16" />

      <Hero x={200} y={310}>
        <g className={styles.bob} style={m(200, 300, { dur: "0.525s", h: "-3px" })}>
          {/* back arm */}
          <g className={styles.swing} style={m(shX, shY, { a: "24deg", dur: walk, delay: half })}>
            <Limb d={`M${shX} ${shY} L${shX} ${shY + 28}`} color={C.orangeDark} w={9} />
            <circle cx={shX} cy={shY + 31} r="4.6" fill={C.skinShade} />
          </g>
          {/* back leg */}
          <g className={styles.swing} style={m(hipX, hipY, { a: "-22deg", dur: walk, delay: half })}>
            <Limb d={`M${hipX} ${hipY} L${hipX} ${hipY + 36}`} color={C.pantsDark} w={11} />
            <ellipse cx={hipX + 4} cy={hipY + 40} rx="8.5" ry="4.6" fill={C.boot} />
          </g>
          {/* tiny daypack */}
          <rect x="174" y="226" width="12" height="28" rx="5" fill={C.moss} />
          {/* torso */}
          <rect x="185" y="220" width="27" height="51" rx="12" fill={C.orange} />
          <path d="M190 230 q8 6 16 0" fill="none" stroke={C.orangeDark} strokeWidth="2" strokeLinecap="round" />
          <path d="M188 228 L190 252" stroke={C.mossDark} strokeWidth="3" strokeLinecap="round" />
          {/* front leg */}
          <g className={styles.swing} style={m(hipX, hipY, { a: "-22deg", dur: walk })}>
            <Limb d={`M${hipX} ${hipY} L${hipX} ${hipY + 36}`} color={C.pants} w={11} />
            <ellipse cx={hipX + 4} cy={hipY + 40} rx="8.5" ry="4.6" fill={C.boot} />
          </g>
          {/* neck + head */}
          <rect x="194" y="208" width="8" height="14" rx="3" fill={C.skinShade} />
          <circle cx="200" cy="203" r="12.5" fill={C.skin} />
          <path d="M187.6 205 A12.5 12.5 0 0 1 212.2 199.6 C 206 197.5 201 199.4 198 204 C 195.6 207.8 191 209.6 187.6 205 Z" fill={C.hair} />
          {/* front arm with coffee */}
          <g className={styles.swing} style={m(shX, shY, { a: "24deg", dur: walk })}>
            <Limb d={`M${shX} ${shY} L${shX} ${shY + 28}`} color={C.orange} w={9} />
            <circle cx={shX} cy={shY + 31} r="4.6" fill={C.skin} />
            <rect x={shX - 1} y={shY + 23} width="10" height="13" rx="2.5" fill="#FFFDF8" />
            <rect x={shX - 1} y={shY + 27} width="10" height="4" fill={C.moss} />
          </g>
        </g>
      </Hero>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sophomore: hiking up a slope                                        */
/* ------------------------------------------------------------------ */

export function HikeScene({ uid }: { uid: string }) {
  const hipX = 198;
  const hipY = 266;
  const shX = 200;
  const shY = 228;
  const step = "1.7s";
  const half = "-0.85s";
  return (
    <>
      <Sky id={`${uid}-sky`} top="#DCE7EC" bottom="#F4EEE2" />
      <circle cx="96" cy="104" r="22" fill="#F7D9A0" />
      <g className={styles.drift} style={m(0, 0, { dur: "12s", x: "12px" })}>
        <Cloud x={70} y={150} s={0.55} />
      </g>

      <path d="M0 252 L60 204 L110 232 L170 176 L230 226 L280 194 L340 232 L400 204 V400 H0 Z" fill="#C6D2D4" />
      {/* peak 1 */}
      <path d="M26 400 L26 290 L146 118 L266 290 L266 400 Z" fill="#94A9B0" />
      <path d="M146 118 L266 290 L266 400 L196 400 L196 290 Z" fill="#7F959D" />
      <path d="M146 118 L178 164 L167 158 L157 172 L146 158 L134 170 L127 157 L116 162 Z" fill="#F7FAFB" />
      {/* peak 2 */}
      <path d="M168 400 L168 290 L294 92 L420 290 L420 400 Z" fill="#A6B8BE" />
      <path d="M294 92 L420 290 L420 400 L334 400 L334 290 Z" fill="#8DA3AA" />
      <path d="M294 92 L330 148 L317 141 L306 156 L294 141 L281 153 L271 139 L260 145 Z" fill="#F7FAFB" />
      <path d="M294 92 L294 66" stroke="#3D5245" strokeWidth="2" strokeLinecap="round" />
      <path d="M294 66 L314 71 L294 77 Z" fill={C.orange} className={styles.flutter} style={m(294, 71)} />

      {/* slope */}
      <path d="M-10 350 L410 258 V400 H-10 Z" fill="#8BA78D" />
      <path d="M-10 350 L410 258 L410 266 L-10 360 Z" fill="#9DB89E" />
      <path d="M-10 384 L410 300 V400 H-10 Z" fill="#7B9880" />
      <path d="M332 278 l12 -6 l14 2 l6 8 l-30 6 z" fill="#F4F7F6" />
      <path d="M100 340 l8 -9 l12 1 l6 8 z" fill="#9AA3A0" />
      <path d="M262 300 l6 -7 l9 1 l4 6 z" fill="#9AA3A0" />
      <Pine x={34} y={360} h={44} fill="#4E7059" />
      <Pine x={366} y={300} h={38} fill="#4E7059" />

      <ellipse cx="200" cy="306" rx="24" ry="4" fill="#24412E" opacity="0.16" transform="rotate(-12 200 306)" />

      <Hero x={200} y={306}>
        <g transform="rotate(9 200 306)">
          <g className={styles.bob} style={m(200, 300, { dur: "0.85s", h: "-2.5px" })}>
            {/* back pole arm */}
            <g className={styles.swing} style={m(shX, shY, { a: "14deg", dur: step, delay: half })}>
              <path d={`M${shX + 12} ${shY + 26} L${shX + 24} ${shY + 82}`} stroke="#59636B" strokeWidth="3" strokeLinecap="round" />
              <Limb d={`M${shX} ${shY} L${shX + 8} ${shY + 16} L${shX + 12} ${shY + 27}`} color={C.redDark} w={8.5} />
              <circle cx={shX + 12} cy={shY + 28} r="4.4" fill={C.skinShade} />
            </g>
            {/* back leg */}
            <g className={styles.swing} style={m(hipX, hipY, { a: "-14deg", dur: step, delay: half })}>
              <Limb d={`M${hipX} ${hipY} L${hipX + 2} ${hipY + 34}`} color={C.pantsDark} w={12} />
              <rect x={hipX - 6} y={hipY + 32} width="18" height="9" rx="4" fill={C.boot} />
            </g>
            {/* big pack */}
            <rect x="162" y="203" width="30" height="58" rx="10" fill={C.mustard} />
            <rect x="167" y="232" width="20" height="18" rx="5" fill={C.mustardDark} />
            <rect x="159" y="194" width="36" height="14" rx="7" fill={C.moss} />
            <path d="M163 201 h28" stroke={C.mossDark} strokeWidth="2" />
            <rect x="160" y="258" width="34" height="9" rx="4.5" fill="#E7DCC4" />
            {/* torso */}
            <rect x="187" y="220" width="26" height="50" rx="11" fill={C.red} />
            <path d="M192 223 L194 262" stroke={C.mustardDark} strokeWidth="3.5" strokeLinecap="round" />
            {/* front leg */}
            <g className={styles.swing} style={m(hipX, hipY, { a: "-14deg", dur: step })}>
              <Limb d={`M${hipX} ${hipY} L${hipX + 2} ${hipY + 34}`} color={C.pants} w={12} />
              <rect x={hipX - 6} y={hipY + 32} width="18" height="9" rx="4" fill={C.boot} />
            </g>
            {/* head + beanie */}
            <rect x="197" y="208" width="8" height="14" rx="3" fill={C.skinShade} />
            <circle cx="203" cy="203" r="12" fill={C.skin} />
            <path d="M190.6 201 A12.4 12.4 0 0 1 215.4 201 Z" fill={C.orange} />
            <rect x="189.5" y="198.5" width="27" height="5" rx="2.5" fill={C.orangeDark} />
            <circle cx="203" cy="187" r="4" fill={C.orange} />
            <path d="M190.6 204 C 192 212 196 213 198 209 Z" fill={C.hair} />
            {/* front pole arm */}
            <g className={styles.swing} style={m(shX, shY, { a: "14deg", dur: step })}>
              <path d={`M${shX + 12} ${shY + 26} L${shX + 24} ${shY + 82}`} stroke="#6B757D" strokeWidth="3" strokeLinecap="round" />
              <Limb d={`M${shX} ${shY} L${shX + 8} ${shY + 16} L${shX + 12} ${shY + 27}`} color={C.red} w={8.5} />
              <circle cx={shX + 12} cy={shY + 28} r="4.4" fill={C.skin} />
            </g>
          </g>
          {/* breath in the cold */}
          <circle cx="220" cy="204" r="4" fill={C.white} className={styles.puff} style={m(220, 204)} />
          <circle cx="222" cy="200" r="3" fill={C.white} className={styles.puff} style={m(222, 200, { delay: "-1.2s" })} />
        </g>
      </Hero>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Junior: rock climbing                                               */
/* ------------------------------------------------------------------ */

const HOLDS: Array<[number, number, string, number]> = [
  [236, 160, "#E8783F", 20],
  [312, 200, "#3FA7A0", -15],
  [246, 297, "#F2C14E", 10],
  [292, 302, "#8E6BBE", -20],
  [334, 132, "#D9534F", 30],
  [222, 96, "#3FA7A0", 0],
  [356, 262, "#F2C14E", 25],
  [282, 126, "#8E6BBE", -10],
  [372, 70, "#E8783F", 15],
  [212, 352, "#D9534F", -25],
  [336, 352, "#3FA7A0", 10],
  [266, 64, "#F2C14E", -30],
  [366, 186, "#E8783F", 0],
  [214, 228, "#8E6BBE", 15],
];

export function ClimbScene({ uid }: { uid: string }) {
  return (
    <>
      <Sky id={`${uid}-sky`} top="#F7E4CF" bottom="#F2E8DA" />
      <circle cx="74" cy="118" r="28" fill="#F4C27A" />
      <g className={styles.drift} style={m(0, 0, { dur: "10s", x: "10px" })}>
        <Cloud x={92} y={170} s={0.55} fill="#FFF8EE" />
      </g>
      {/* desert mesas */}
      <path d="M0 300 L0 230 L40 226 L54 202 L100 200 L114 232 L170 240 L170 400 L0 400 Z" fill="#DDC2A8" />
      <path d="M0 332 L30 284 L80 294 L120 272 L180 300 L180 400 L0 400 Z" fill="#C9A98E" />
      <path d="M0 362 L60 340 L140 352 L190 340 L190 400 L0 400 Z" fill="#B3937A" />

      {/* rock wall */}
      <path d="M168 400 L150 340 L172 290 L156 230 L182 170 L170 110 L196 50 L186 0 L400 0 L400 400 Z" fill="#A4A9AC" />
      <path d="M168 400 L150 340 L172 290 L156 230 L182 170 L170 110 L196 50 L186 0 L206 0 L216 52 L192 112 L204 170 L178 232 L194 290 L174 340 L190 400 Z" fill="#BBBFC1" />
      <path d="M300 0 L362 0 L342 82 L310 60 Z" fill="#92989B" />
      <path d="M330 156 L400 136 L400 240 L352 222 Z" fill="#969C9F" />
      <path d="M226 316 L300 334 L274 400 L218 400 Z" fill="#989EA1" />
      <path d="M240 20 L262 0 L282 0 Z" fill="#B3B7B9" />
      <g fill="none" stroke="#898F92" strokeWidth="2" strokeLinecap="round">
        <path d="M250 110 l14 18 l-4 20 l10 14" />
        <path d="M360 300 l-12 16 l4 22" />
        <path d="M318 240 l10 10" />
      </g>

      {/* holds */}
      {HOLDS.map(([x, y, color, r]) => (
        <g key={`${x}-${y}`} transform={`rotate(${r} ${x} ${y})`}>
          <ellipse cx={x + 1.5} cy={y + 2.5} rx="7.5" ry="5" fill="#000" opacity="0.16" />
          <ellipse cx={x} cy={y} rx="7.5" ry="5" fill={color} />
          <ellipse cx={x - 2} cy={y - 1.5} rx="2.6" ry="1.5" fill="#fff" opacity="0.35" />
        </g>
      ))}

      {/* anchor + rope */}
      <circle cx="282" cy="40" r="5" fill="#6E767B" />
      <path d="M282 40 a6 8 0 1 0 0.1 0" fill="none" stroke="#C9CDD0" strokeWidth="2.5" />
      <g className={styles.sway} style={m(282, 46)}>
        <path d="M282 50 C 304 150 338 260 316 404" fill="none" stroke="#C3463A" strokeWidth="3.5" strokeLinecap="round" />
      </g>

      <Hero x={270} y={300}>
        <g className={styles.rise} style={m(270, 240)}>
          <path d="M282 50 C 280 130 274 190 270 240" fill="none" stroke="#C3463A" strokeWidth="3.5" strokeLinecap="round" />
          {/* legs */}
          <Limb d="M263 246 L241 264 L246 292" color={C.pants} w={11} />
          <Limb d="M278 246 L300 270 L292 298" color={C.pants} w={11} />
          <ellipse cx="248" cy="296" rx="8" ry="5" fill={C.red} />
          <ellipse cx="292" cy="301" rx="8" ry="5" fill={C.red} />
          {/* left arm on orange hold */}
          <Limb d="M260 204 L243 186 L237 164" color={C.skin} w={8} />
          <circle cx="237" cy="161" r="5" fill={C.skin} />
          {/* torso, harness */}
          <rect x="257" y="194" width="26" height="54" rx="11" fill={C.orange} />
          <path d="M263 196 L270 214 L277 196" fill="none" stroke={C.orangeDark} strokeWidth="2" strokeLinejoin="round" />
          <rect x="256" y="237" width="28" height="7" rx="3.5" fill={C.steel} />
          <circle cx="270" cy="242" r="4" fill="none" stroke="#C3463A" strokeWidth="3" />
          <rect x="276" y="243" width="9" height="11" rx="3.5" fill={C.moss} />
          {/* head + helmet (seen from behind) */}
          <rect x="266" y="184" width="8" height="12" rx="3" fill={C.skinShade} />
          <circle cx="270" cy="181" r="12" fill={C.hair} />
          <path d="M257.5 180 A12.5 12.5 0 0 1 282.5 180 Z" fill="#F2C14E" />
          <path d="M270 168 L270 180" stroke="#D9A73A" strokeWidth="2" />
          <rect x="256.5" y="178.5" width="27" height="3.5" rx="1.75" fill="#D9A73A" />
          {/* right arm reaching for the next hold */}
          <g className={styles.reach} style={m(281, 204)}>
            <Limb d="M281 204 L299 216 L311 202" color={C.skin} w={8} />
            <circle cx="312" cy="200" r="5" fill={C.skin} />
          </g>
        </g>
        {/* chalk puff from the left hand */}
        <circle cx="236" cy="156" r="5" fill="#FFFFFF" className={styles.chalk} style={m(236, 156)} />
      </Hero>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Senior: ice climbing                                                */
/* ------------------------------------------------------------------ */

const FLAKES: Array<[number, number, number]> = [
  [30, 30, 2.2], [92, 70, 1.6], [150, 20, 2.4], [210, 90, 1.8], [270, 40, 2.2], [340, 80, 1.6], [380, 20, 2],
  [60, 150, 1.8], [130, 190, 2.2], [190, 150, 1.6], [250, 210, 2], [320, 170, 2.4], [370, 230, 1.8],
  [20, 260, 2], [100, 300, 1.6], [170, 330, 2.2], [230, 280, 1.8], [300, 330, 2], [360, 360, 1.6], [70, 380, 2.2],
];

function Crampon({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 9} y={y - 5} width="19" height="10" rx="4" fill={C.boot} />
      <path d={`M${x - 7} ${y + 5} l2 4 l2 -4 l2 4 l2 -4 l2 4 l2 -4 l2 4 l2 -4`} fill="none" stroke="#C9D2D8" strokeWidth="1.8" strokeLinejoin="round" />
      <path d={`M${x + 10} ${y - 2} l6 1 M${x + 10} ${y + 2} l6 1.5`} stroke="#C9D2D8" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

function IceAxe({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  // shaft from (x1,y1) grip to (x2,y2) head; pick points right/down, adze left/up
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={C.steel} strokeWidth="4" />
      <path d={`M${x1 - 1} ${y1 + 2} L${x1 + 0.6} ${y1 - 6}`} stroke={C.orange} strokeWidth="5" />
      <path d={`M${x2 - 7} ${y2 + 1} L${x2} ${y2} Q ${x2 + 11} ${y2 + 1} ${x2 + 16} ${y2 + 10}`} fill="none" stroke="#7D8A95" strokeWidth="4" />
      <rect x={x2 - 10} y={y2 - 2} width="5" height="6" rx="1.5" fill="#7D8A95" />
    </g>
  );
}

export function IceScene({ uid }: { uid: string }) {
  const flakes = (dy: number) =>
    FLAKES.map(([x, y, r]) => <circle key={`${x}-${y}-${dy}`} cx={x} cy={y + dy} r={r} />);
  return (
    <>
      <Sky id={`${uid}-sky`} top="#CCDCE7" bottom="#EAF1F5" />
      <circle cx="104" cy="100" r="26" fill="#F6F8FA" opacity="0.9" />
      <circle cx="104" cy="100" r="40" fill="#F6F8FA" opacity="0.25" />

      {/* distant peaks */}
      <path d="M0 270 L70 168 L120 222 L176 148 L250 270 L250 400 L0 400 Z" fill="#B2C5D2" />
      <path d="M70 168 L88 194 L80 192 L72 200 L64 190 L57 192 Z" fill="#F4F8FB" />
      <path d="M176 148 L198 178 L188 174 L178 186 L168 176 L160 172 Z" fill="#F4F8FB" />
      <path d="M0 322 L52 262 L110 304 L170 252 L240 310 L240 400 L0 400 Z" fill="#93ADBF" />
      <Pine x={40} y={340} h={40} fill="#4F6E7B" />
      <Pine x={72} y={346} h={30} fill="#5C7C89" />
      <Pine x={196} y={330} h={34} fill="#5C7C89" />
      <path d="M0 352 C 80 338 160 342 260 352 V400 H0 Z" fill="#EEF4F7" />

      {/* ice cliff */}
      <path d="M266 400 L252 340 L260 290 L248 240 L258 180 L246 120 L264 60 L252 0 L400 0 L400 400 Z" fill="#BEDFEE" />
      <path d="M252 0 L264 60 L246 120 L258 180 L248 240 L260 290 L252 340 L266 400 L284 400 L274 340 L282 290 L270 240 L280 180 L268 120 L284 60 L272 0 Z" fill="#E7F5FB" />
      <path d="M322 0 L362 0 L346 92 L316 72 Z" fill="#9FCBE0" />
      <path d="M300 150 L380 122 L400 200 L340 232 Z" fill="#A9D3E6" />
      <path d="M312 300 L372 280 L362 380 L300 400 Z" fill="#9ECADF" />
      <path d="M352 32 L372 46 L360 70 Z" fill="#D4ECF6" />
      {/* snowy ledge with icicles */}
      <path d="M292 240 Q 330 230 370 238 L370 246 L292 246 Z" fill="#FFFFFF" />
      <path d="M296 246 l4 18 l4 -18 z M310 246 l3 12 l3 -12 z M324 246 l5 22 l5 -22 z M342 246 l3 14 l3 -14 z M356 246 l4 17 l4 -17 z" fill="#E3F3FA" />
      <path d="M262 60 l5 20 l5 -20 z M248 120 l4 16 l4 -16 z" fill="#E3F3FA" />
      {/* impact cracks */}
      <g fill="none" stroke="#8FBCD2" strokeWidth="1.6" strokeLinecap="round">
        <path d="M268 172 l7 -3 M268 172 l3 6" />
      </g>

      <Hero x={232} y={300}>
        {/* rope trailing down */}
        <path d="M226 250 C 210 300 196 340 170 404" fill="none" stroke="#F2C14E" strokeWidth="3" strokeLinecap="round" />
        {/* far leg, kicked in high */}
        <Limb d="M228 248 L248 236 L247 264" color={C.pantsDark} w={11} />
        <Crampon x={250} y={267} />
        {/* back arm with planted axe */}
        <IceAxe x1={248} y1={190} x2={255} y2={164} />
        <Limb d="M234 214 L240 200 L247 188" color={C.redDark} w={8.5} />
        <circle cx="247.5" cy="187" r="4.6" fill={C.boot} />
        {/* pack */}
        <rect x="204" y="204" width="18" height="38" rx="7" fill={C.moss} />
        <rect x="203" y="198" width="20" height="9" rx="4.5" fill={C.mossDark} />
        {/* torso */}
        <Limb d="M226 248 L232 210" color={C.red} w={25} />
        <path d="M232 202 L238 238" stroke={C.redDark} strokeWidth="2" strokeLinecap="round" />
        <rect x="214" y="243" width="26" height="7" rx="3.5" fill={C.steel} transform="rotate(-8 227 246)" />
        {/* near leg */}
        <Limb d="M224 252 L240 278 L244 299" color={C.pants} w={11} />
        <Crampon x={247} y={302} />
        {/* head + helmet + goggles strap */}
        <rect x="232" y="192" width="8" height="12" rx="3" fill={C.skinShade} />
        <circle cx="238" cy="188" r="11.5" fill={C.skin} />
        <path d="M225.5 188 A12.5 12.5 0 0 1 250.5 188 Z" fill={C.orange} />
        <rect x="226" y="186" width="24" height="3.5" rx="1.75" fill={C.orangeDark} />
        <rect x="241" y="189.5" width="10" height="5" rx="2.5" fill="#4C6A80" />
        {/* swinging arm + axe */}
        <g className={styles.axe} style={m(233, 208)}>
          <IceAxe x1={229} y1={160} x2={236} y2={130} />
          <Limb d="M233 208 L222 184 L229 162" color={C.red} w={8.5} />
          <circle cx="229.5" cy="160" r="4.6" fill={C.boot} />
        </g>
        {/* ice chips at impact */}
        <g className={styles.chips} style={m(258, 140)} fill="#FFFFFF">
          <path d="M256 136 l3 3 l-3 3 l-3 -3 z" />
          <path d="M248 146 l2.4 2.4 l-2.4 2.4 l-2.4 -2.4 z" />
          <circle cx="252" cy="134" r="1.8" fill="#CFEAF5" />
        </g>
      </Hero>

      {/* snowfall: two stacked copies loop seamlessly */}
      <g className={styles.fall} style={m(0, 0, { dur: "9s" })} fill="#FFFFFF" opacity="0.9">
        {flakes(0)}
        {flakes(-400)}
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Grad / professional / other: a bear                                 */
/* ------------------------------------------------------------------ */

export function BearScene({ uid }: { uid: string }) {
  const fur = "#7B4F33";
  const furFar = "#5E3B26";
  const furShade = "#6A432B";
  const muzzle = "#B5835C";
  return (
    <>
      <Sky id={`${uid}-sky`} top="#F4D3B6" bottom="#F4EBDD" />
      <circle cx="118" cy="196" r="64" fill="#F3B77A" opacity="0.28" />
      <circle cx="118" cy="196" r="42" fill="#F2AE6C" opacity="0.85" />
      <circle cx="84" cy="84" r="1.8" fill="#FFF6E8" className={styles.twinkle} />
      <circle cx="320" cy="72" r="1.6" fill="#FFF6E8" className={styles.twinkle} style={m(320, 72, { delay: "-1.2s" })} />
      <circle cx="252" cy="104" r="1.4" fill="#FFF6E8" className={styles.twinkle} style={m(252, 104, { delay: "-0.6s" })} />

      {/* layered mountains */}
      <path d="M0 268 L82 176 L150 238 L232 146 L322 244 L400 188 V400 H0 Z" fill="#B7BFC4" />
      <path d="M232 146 L256 172 L244 170 L234 182 L224 170 L212 168 Z" fill="#F7F3EE" />
      <path d="M82 176 L100 196 L90 194 L82 202 L74 194 L66 194 Z" fill="#F7F3EE" />
      <path d="M0 292 L60 250 L132 286 L202 238 L282 286 L352 248 L400 270 V400 H0 Z" fill="#90A597" />
      {[
        [14, 300, 50], [40, 302, 62], [66, 300, 44], [300, 302, 48], [326, 302, 64], [354, 300, 52], [384, 302, 44],
      ].map(([x, y, h]) => (
        <Pine key={x} x={x} y={y} h={h} fill={x % 4 === 0 ? "#3F5E4B" : "#4B6D57"} />
      ))}
      <path d="M0 298 C 120 288 280 288 400 298 V400 H0 Z" fill="#7E9670" />
      <path d="M0 336 C 140 324 260 326 400 336 V400 H0 Z" fill="#6F8864" />
      <g fill="#5F7A55">
        <path d="M60 330 l4 -12 l3 12 l4 -9 l2 9 z" />
        <path d="M330 344 l4 -12 l3 12 l4 -9 l2 9 z" />
      </g>

      <ellipse cx="204" cy="306" rx="96" ry="7" fill="#2B3A25" opacity="0.2" />

      <Hero x={204} y={306}>
        <g transform="translate(-14 0)">
          {/* far legs */}
          <rect x="132" y="246" width="24" height="58" rx="11" fill={furFar} />
          <rect x="240" y="246" width="22" height="58" rx="10" fill={furFar} />
          {/* tail */}
          <circle cx="112" cy="232" r="7" fill={furShade} />
          {/* body (breathing) */}
          <g className={styles.breathe} style={m(194, 300)}>
            <path
              d="M112 246 C 106 212 138 196 172 196 C 196 184 232 176 256 194 C 272 206 280 226 278 246 C 276 268 254 274 232 272 L 152 272 C 128 272 114 264 112 246 Z"
              fill={fur}
            />
            <path d="M150 268 C 180 276 230 276 262 266 C 250 274 236 276 222 276 L 160 276 Z" fill={furShade} />
            <path d="M190 192 C 210 184 236 182 252 194" fill="none" stroke="#8C5D3E" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
          </g>
          {/* near legs */}
          <ellipse cx="156" cy="248" rx="30" ry="26" fill={fur} />
          <rect x="144" y="250" width="27" height="56" rx="12" fill={fur} />
          <rect x="254" y="244" width="25" height="62" rx="11" fill={fur} />
          <g stroke="#E9DCC8" strokeWidth="1.6" strokeLinecap="round">
            <path d="M163 306 l2 -4 M168 306 l2 -4" />
            <path d="M272 306 l2 -4 M277 306 l2 -4" />
          </g>
          {/* head */}
          <g className={styles.nod} style={m(272, 230)}>
            <g className={styles.ear} style={m(286, 204)}>
              <circle cx="286" cy="202" r="9" fill={fur} />
              <circle cx="286" cy="202" r="4.5" fill={furFar} />
            </g>
            <ellipse cx="294" cy="226" rx="28" ry="23" fill={fur} />
            <ellipse cx="320" cy="234" rx="17" ry="11.5" fill={muzzle} />
            <ellipse cx="335" cy="229" rx="5" ry="4" fill="#2A1C14" />
            <circle cx="306" cy="218" r="2.8" fill="#2A1C14" />
            <path d="M316 243 q6 2 12 -1" fill="none" stroke="#7B4F33" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </g>
      </Hero>

      {/* a butterfly checking out the bear */}
      <g className={styles.float} style={m(344, 196)}>
        <g className={styles.flap} style={m(344, 196)}>
          <ellipse cx="338" cy="192" rx="6" ry="8" fill={C.orange} transform="rotate(-20 338 192)" />
          <ellipse cx="350" cy="192" rx="6" ry="8" fill={C.orange} transform="rotate(20 350 192)" />
          <ellipse cx="339" cy="202" rx="4" ry="5" fill="#F2C14E" />
          <ellipse cx="349" cy="202" rx="4" ry="5" fill="#F2C14E" />
        </g>
        <rect x="343" y="188" width="2.4" height="17" rx="1.2" fill="#3B2A22" />
      </g>
    </>
  );
}
