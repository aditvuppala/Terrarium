/**
 * Deterministic lease checks (no LLM): dollar amounts found in the text, compared with
 * the limits in MCL 554.602 (deposit <= 1.5 x monthly rent) and Ann Arbor § 8:532(4) (application fee <= $50).
 */
import { findQuote, type QuoteMatch } from "./match";

export interface AmountClaim {
  amount: number;
  quote: string;
}

export interface ResolvedAmount {
  amount: number;
  match: QuoteMatch;
}

export const DEPOSIT_MULTIPLE = 1.5;
export const A2_APPLICATION_FEE_CAP = 50;

/** All dollar amounts in a string: "$1,350.00" -> 1350. */
export function dollarAmounts(s: string): number[] {
  const out: number[] = [];
  for (const m of s.matchAll(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g)) {
    const whole = Number(m[1].replace(/,/g, ""));
    const cents = m[2] ? Number(m[2].padEnd(2, "0")) / 100 : 0;
    out.push(whole + cents);
  }
  return out;
}

const AMOUNT = String.raw`\$\s?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?`;

/** Regex fallbacks, used when the model didn't give a verifiable amount. Each must name the thing before the amount. */
const PATTERNS = {
  monthlyRent: [
    new RegExp(String.raw`monthly rent[^$\n.]{0,60}${AMOUNT}`, "i"),
    new RegExp(String.raw`rent (?:of|is|shall be|in the amount of)[^$\n.]{0,40}${AMOUNT}[^.\n]{0,30}(?:per|a|each|/)\s?month`, "i"),
    new RegExp(String.raw`${AMOUNT}[^.\n]{0,20}(?:per|a|each|/)\s?month[^.\n]{0,20}rent`, "i"),
  ],
  securityDeposit: [new RegExp(String.raw`security deposit[^$\n.]{0,80}${AMOUNT}`, "i")],
  applicationFee: [new RegExp(String.raw`application (?:fee|charge)[^$\n.]{0,60}${AMOUNT}`, "i")],
} as const;

export type AmountKey = keyof typeof PATTERNS;

/** A model claim counts only if its quote is really in the text AND contains that dollar amount. */
export function verifyClaim(text: string, claim: AmountClaim | null | undefined): ResolvedAmount | null {
  if (!claim || !(claim.amount > 0)) return null;
  const match = findQuote(text, claim.quote);
  if (!match) return null;
  if (!dollarAmounts(match.quote).some((a) => Math.abs(a - claim.amount) < 0.005)) return null;
  return { amount: claim.amount, match };
}

export function findAmountByPattern(text: string, key: AmountKey): ResolvedAmount | null {
  for (const re of PATTERNS[key]) {
    const m = re.exec(text);
    if (!m) continue;
    // Every pattern puts the amount we want first in the match.
    const amount = dollarAmounts(m[0])[0];
    if (!(amount > 0)) continue;
    return { amount, match: { start: m.index, end: m.index + m[0].length, quote: m[0] } };
  }
  return null;
}

export function resolveAmount(text: string, key: AmountKey, claim: AmountClaim | null | undefined): ResolvedAmount | null {
  return verifyClaim(text, claim) ?? findAmountByPattern(text, key);
}

export function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export interface DeterministicResult {
  /** null when we couldn't find both numbers, so we can't say either way. */
  violates: boolean | null;
  detail: string | null;
}

export function checkDeposit(rent: number | null, deposit: number | null): DeterministicResult {
  if (rent == null || deposit == null || rent <= 0) return { violates: null, detail: null };
  const cap = Math.round(rent * DEPOSIT_MULTIPLE * 100) / 100;
  if (deposit <= cap + 0.005) return { violates: false, detail: null };
  const ratio = Math.round((deposit / rent) * 100) / 100;
  return {
    violates: true,
    detail: `The lease lists a ${formatMoney(deposit)} security deposit and ${formatMoney(rent)} monthly rent. That's ${ratio}× the rent; the most Michigan allows is ${formatMoney(cap)}.`,
  };
}

export function checkApplicationFee(fee: number | null): DeterministicResult {
  if (fee == null) return { violates: null, detail: null };
  if (fee <= A2_APPLICATION_FEE_CAP + 0.005) return { violates: false, detail: null };
  return {
    violates: true,
    detail: `The lease lists a ${formatMoney(fee)} application fee; Ann Arbor caps it at ${formatMoney(A2_APPLICATION_FEE_CAP)}, so ${formatMoney(fee - A2_APPLICATION_FEE_CAP)} is over the limit.`,
  };
}
