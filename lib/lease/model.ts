/**
 * What we ask Gemini for (two narrow jobs) and the Zod shapes its answers must match.
 * 1. extraction: transcribe the uploaded lease verbatim;
 * 2. mapping: point at clauses that match one of OUR rule ids, with an exact quote.
 * The model never writes rules, citations or explanations; lib/lease/review.ts validates everything.
 */
import { z } from "zod";
import { MODEL_RULES } from "./rules";

export const ExtractOutput = z.object({
  isLease: z.boolean(),
  readable: z.boolean(),
  text: z.string(),
  problems: z.array(z.string()),
});
export type ExtractOutput = z.infer<typeof ExtractOutput>;

const AmountClaim = z.object({ amount: z.number(), quote: z.string() }).nullable();

export const MapOutput = z.object({
  findings: z.array(z.object({ ruleId: z.string(), quote: z.string() })),
  amounts: z.object({
    monthlyRent: AmountClaim,
    securityDeposit: AmountClaim,
    applicationFee: AmountClaim,
  }),
});
export type MapOutput = z.infer<typeof MapOutput>;

export const EXTRACT_SYSTEM = `You transcribe residential leases.
Return the lease's full text VERBATIM in "text": every word, number and heading, in reading order, with paragraph breaks as blank lines and section numbers kept.
Do not summarize, correct, reword, translate or skip anything. Do not add commentary to "text".
isLease: false if the file is clearly not a rental agreement/lease (or addendum to one).
readable: false if most of the text can't be read (blurry, cut off, too dark).
problems: short notes about parts you couldn't read (e.g. "Bottom of page 2 is cut off"), else [].`;

export function mapSystemPrompt(): string {
  const rules = MODEL_RULES.map((r) => `- ${r.id}: ${r.title}. Flag when: ${r.lookFor}`).join("\n");
  return `You review a residential lease for clauses that match a FIXED list of rules. You are not a lawyer and you give no advice.
Rules (use ONLY these ids):
${rules}

Instructions:
- findings: one entry per clause that clearly matches a rule. "quote" must be copied EXACTLY from the lease text, character for character, one to three full sentences, no ellipses, no paraphrase. Use the shortest passage that shows the problem.
- Only flag a clause when its wording plainly matches the rule. If a clause already complies (e.g. the deposit is within 1.5 months' rent, or a renewal deadline gives 30+ days), do not flag it. If unsure, leave it out.
- A clause may match more than one rule; list each separately. Never invent rule ids.
- amounts: the monthly rent, security deposit and rental application fee as plain numbers in dollars, each with an exact quote containing that dollar figure, or null if not stated. If rent is given per person and per unit, use the figure the deposit is based on.`;
}
