/**
 * Quote grounding: find a model-supplied quote in the extracted lease text, ignoring case,
 * whitespace runs and typographic quote/dash variants. Returns offsets into the ORIGINAL text,
 * so the UI can highlight exactly that span. A quote that can't be found is dropped by the caller.
 */

const CHAR_MAP: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": "'",
  "′": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "″": '"',
  "‐": "-",
  "‑": "-",
  "‒": "-",
  "–": "-",
  "—": "-",
  "−": "-",
  " ": " ",
};

/** Shortest quote (after normalising) we accept, so trivial matches like "rent" can't ground a finding. */
export const MIN_QUOTE_CHARS = 12;

/** Normalised text plus, for each normalised char, its index in the original string. */
export function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    ch = CHAR_MAP[ch] ?? ch;
    if (/\s/.test(ch)) {
      pendingSpace = norm.length > 0;
      continue;
    }
    if (pendingSpace) {
      norm += " ";
      map.push(i - 1);
      pendingSpace = false;
    }
    const lower = ch.toLowerCase();
    // toLowerCase can (rarely) change length; keep a 1:1 map.
    for (const c of lower) {
      norm += c;
      map.push(i);
    }
  }
  return { norm, map };
}

export function normalize(text: string): string {
  return normalizeWithMap(text).norm;
}

/** Strip wrapping quote marks the model sometimes adds around a quote. */
function cleanQuote(quote: string): string {
  return normalize(quote).replace(/^["'\s]+|["'\s]+$/g, "");
}

export interface QuoteMatch {
  start: number;
  end: number; // exclusive
  quote: string; // the verbatim slice of the original text
}

/** Find `quote` in `text`. `from` lets callers find a later occurrence. */
export function findQuote(text: string, quote: string, from = 0): QuoteMatch | null {
  const q = cleanQuote(quote);
  if (q.length < MIN_QUOTE_CHARS) return null;
  const { norm, map } = normalizeWithMap(text);
  const normFrom = map.findIndex((orig) => orig >= from);
  if (normFrom < 0) return null;
  const idx = norm.indexOf(q, normFrom);
  if (idx < 0) return null;
  const start = map[idx];
  const end = map[idx + q.length - 1] + 1;
  return { start, end, quote: text.slice(start, end) };
}

/** Grow a span to the sentence (or line) around it, for highlighting a short regex hit. */
export function expandToSentence(text: string, start: number, end: number): QuoteMatch {
  // A "." between digits ($1,350.00) or after a section number ("4.") isn't a sentence end.
  const isBoundary = (i: number) => {
    const c = text[i];
    if (c === "\n" || c === ";") return true;
    if (c !== ".") return false;
    return !(/\d/.test(text[i + 1] ?? "") || (/\d/.test(text[i - 1] ?? "") && /^\s*$/.test(text.slice(text.lastIndexOf("\n", i) + 1, i).replace(/\d+/g, ""))));
  };
  let s = start;
  while (s > 0 && !isBoundary(s - 1)) s--;
  while (s < start && /\s/.test(text[s])) s++;
  let e = end;
  if (!(e > 0 && isBoundary(e - 1))) {
    while (e < text.length && !isBoundary(e)) e++;
    if (e < text.length && text[e] === ".") e++;
  }
  return { start: s, end: e, quote: text.slice(s, e) };
}

/** True if the normalised text contains the phrase (used for "required notice present?" checks). */
export function containsPhrase(text: string, phrase: string): boolean {
  return normalize(text).includes(normalize(phrase));
}
