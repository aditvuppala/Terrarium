/**
 * Marker colors by rank position: #1 is green, the last result is near-black.
 * Uses the position among the current results (not the score), so the gradient
 * always spans the full range no matter how close the scores are.
 * Every stop keeps white text at >= 4.5:1 contrast.
 */
const STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0, rgb: [0x15, 0x80, 0x3d] }, // green
  { at: 0.4, rgb: [0x1d, 0x5c, 0x36] },
  { at: 0.75, rgb: [0x20, 0x33, 0x28] },
  { at: 1, rgb: [0x11, 0x14, 0x12] }, // near-black
];

export const TOP_TIER = 10;
export const GOLD = "#D9A938";

function hex(n: number): string {
  return Math.round(n).toString(16).padStart(2, "0");
}

/** index = 0-based position in the ranked results; total = number of results. */
export function rankColor(index: number, total: number): string {
  const t = total <= 1 ? 0 : Math.max(0, Math.min(1, index / (total - 1)));
  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1];
    const b = STOPS[i];
    if (t <= b.at) {
      const k = (t - a.at) / (b.at - a.at);
      const rgb = a.rgb.map((c, j) => c + (b.rgb[j] - c) * k);
      return `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`;
    }
  }
  const last = STOPS[STOPS.length - 1].rgb;
  return `#${hex(last[0])}${hex(last[1])}${hex(last[2])}`;
}

/** CSS gradient matching rankColor, for legends. */
export const RANK_GRADIENT_CSS = `linear-gradient(90deg, ${STOPS.map(
  (s) => `#${hex(s.rgb[0])}${hex(s.rgb[1])}${hex(s.rgb[2])} ${Math.round(s.at * 100)}%`,
).join(", ")})`;
