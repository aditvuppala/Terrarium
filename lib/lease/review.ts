/**
 * Turn extracted lease text + the model's clause mapping into a grounded LeaseReviewResponse.
 * - Drops any finding whose ruleId isn't in lib/lease/rules.ts (or is deterministic-only).
 * - Drops any finding whose quote can't be found in the text (case/whitespace-insensitive).
 * - Runs the deterministic checks (deposit cap, application fee cap, Truth in Renting notice),
 *   which override the model for those rules whenever the numbers are known.
 */
import type { LeaseFinding, LeaseReviewResponse } from "@/lib/schemas";
import { checkApplicationFee, checkDeposit, resolveAmount, type ResolvedAmount } from "./checks";
import { containsPhrase, expandToSentence, findQuote } from "./match";
import type { MapOutput } from "./model";
import { publicRule, RULES_BY_ID } from "./rules";

/** Below this many characters we assume we only saw part of the lease and skip "required notice missing" checks. */
const MIN_TEXT_FOR_MISSING_CHECKS = 1500;

type Draft = Omit<LeaseFinding, "id">;

export interface BuildReviewInput {
  text: string;
  mapping: MapOutput | null;
  source: LeaseReviewResponse["source"];
  demo: boolean;
  warnings?: string[];
}

function spanFor(text: string, r: ResolvedAmount): { quote: string; start: number; end: number } {
  const s = expandToSentence(text, r.match.start, r.match.end);
  return { quote: s.quote, start: s.start, end: s.end };
}

export function buildReview({ text, mapping, source, demo, warnings = [] }: BuildReviewInput): LeaseReviewResponse {
  const drafts: Draft[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const f of mapping?.findings ?? []) {
    const rule = RULES_BY_ID.get(f.ruleId);
    if (!rule || rule.checkedBy === "deterministic") {
      dropped++;
      continue;
    }
    const m = findQuote(text, f.quote);
    if (!m) {
      dropped++;
      continue;
    }
    const key = `${rule.id}|${m.start}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push({ rule: publicRule(rule), method: "model", quote: m.quote, start: m.start, end: m.end, detail: null });
  }

  const rent = resolveAmount(text, "monthlyRent", mapping?.amounts.monthlyRent);
  const deposit = resolveAmount(text, "securityDeposit", mapping?.amounts.securityDeposit);
  const appFee = resolveAmount(text, "applicationFee", mapping?.amounts.applicationFee);

  const applyDeterministic = (ruleId: string, result: { violates: boolean | null; detail: string | null }, at: ResolvedAmount | null) => {
    if (result.violates === null) return; // numbers unknown: keep whatever the model grounded
    // Numbers known: the arithmetic decides, not the model.
    for (let i = drafts.length - 1; i >= 0; i--) if (drafts[i].rule.id === ruleId) drafts.splice(i, 1);
    if (!result.violates || !at) return;
    const rule = RULES_BY_ID.get(ruleId)!;
    drafts.push({ rule: publicRule(rule), method: "deterministic", ...spanFor(text, at), detail: result.detail });
  };
  applyDeterministic("deposit_cap", checkDeposit(rent?.amount ?? null, deposit?.amount ?? null), deposit);
  applyDeterministic("a2_application_fee", checkApplicationFee(appFee?.amount ?? null), appFee);

  if (text.trim().length >= MIN_TEXT_FOR_MISSING_CHECKS && !containsPhrase(text, "truth in renting")) {
    const rule = RULES_BY_ID.get("truth_in_renting_notice")!;
    drafts.push({
      rule: publicRule(rule),
      method: "deterministic",
      quote: null,
      start: null,
      end: null,
      detail: "We couldn't find the words \"Truth in Renting\" anywhere in your lease's text.",
    });
  }

  drafts.sort((a, b) => (a.start ?? Number.MAX_SAFE_INTEGER) - (b.start ?? Number.MAX_SAFE_INTEGER) || (a.end ?? 0) - (b.end ?? 0));

  const outWarnings = [...warnings];
  if (dropped > 0) {
    outWarnings.push(
      `We left out ${dropped} possible ${dropped === 1 ? "match" : "matches"} we couldn't tie to an exact passage in your lease.`,
    );
  }

  return {
    source,
    demo,
    text,
    findings: drafts.map((d, i) => ({ id: `f${i + 1}`, ...d })),
    facts: {
      monthlyRent: rent?.amount ?? null,
      securityDeposit: deposit?.amount ?? null,
      applicationFee: appFee?.amount ?? null,
    },
    warnings: outWarnings,
  };
}
