import { describe, expect, it } from "vitest";
import mockLease from "@/mocks/lease.json";
import { LeaseReviewResponse } from "@/lib/schemas";
import { checkApplicationFee, checkDeposit, dollarAmounts, findAmountByPattern, resolveAmount, verifyClaim } from "./checks";
import { containsPhrase, expandToSentence, findQuote } from "./match";
import { MapOutput } from "./model";
import { addMonths, renewDates } from "./renew";
import { buildReview } from "./review";
import { LEASE_RULES, MODEL_RULES } from "./rules";

describe("findQuote", () => {
  const text = "1. LIABILITY\nLandlord   shall NOT be liable\n for any  injury, loss or damage.\n2. PETS";

  it("matches ignoring case and whitespace, returning offsets into the original", () => {
    const m = findQuote(text, "landlord shall not be liable for any injury, loss or damage.");
    expect(m).not.toBeNull();
    expect(text.slice(m!.start, m!.end)).toBe(m!.quote);
    expect(m!.quote.startsWith("Landlord")).toBe(true);
    expect(m!.quote.endsWith("damage.")).toBe(true);
  });

  it("treats curly quotes and dashes like straight ones, and strips wrapping quotes", () => {
    const t = "Tenant’s guests — including visitors — must sign in.";
    expect(findQuote(t, "\"tenant's guests - including visitors - must sign in.\"")).not.toBeNull();
  });

  it("rejects paraphrases, ellipses and too-short quotes", () => {
    expect(findQuote(text, "Landlord is not liable for injuries")).toBeNull();
    expect(findQuote(text, "Landlord shall not ... damage.")).toBeNull();
    expect(findQuote(text, "PETS")).toBeNull();
  });

  it("can search from an offset", () => {
    const t = "Rent is due monthly. Rent is due monthly.";
    const first = findQuote(t, "rent is due monthly.")!;
    const second = findQuote(t, "rent is due monthly.", first.end)!;
    expect(second.start).toBeGreaterThan(first.start);
  });

  it("containsPhrase / expandToSentence", () => {
    expect(containsPhrase("comply with the TRUTH  IN\nRENTING Act", "truth in renting")).toBe(true);
    const t = "First thing. The security deposit is $900 total. Last.";
    const s = expandToSentence(t, t.indexOf("security"), t.indexOf("$900") + 4);
    expect(s.quote).toBe("The security deposit is $900 total.");
    const t2 = "5. DEPOSIT\nTenant shall pay a security deposit of $2,700.00 upon signing. Refunds take 60 days.";
    const s2 = expandToSentence(t2, t2.indexOf("security"), t2.indexOf("$2,700.00") + 9);
    expect(s2.quote).toBe("Tenant shall pay a security deposit of $2,700.00 upon signing.");
    // an already-complete sentence isn't grown into the next one
    const full = "Tenant shall pay a security deposit of $2,700.00 upon signing.";
    expect(expandToSentence(t2, t2.indexOf(full), t2.indexOf(full) + full.length).quote).toBe(full);
  });
});

describe("amounts", () => {
  it("parses dollar amounts", () => {
    expect(dollarAmounts("$1,350.00 and $ 75 and $2,700.5")).toEqual([1350, 75, 2700.5]);
  });

  it("finds rent, deposit and application fee by pattern", () => {
    const t = "Tenant shall pay monthly rent of $1,200. A security deposit in the amount of $1,800.00 is due. Application fee: $40.";
    expect(findAmountByPattern(t, "monthlyRent")?.amount).toBe(1200);
    expect(findAmountByPattern(t, "securityDeposit")?.amount).toBe(1800);
    expect(findAmountByPattern(t, "applicationFee")?.amount).toBe(40);
    expect(findAmountByPattern("Rent of $950 per month is due on the 1st.", "monthlyRent")?.amount).toBe(950);
  });

  it("only trusts a model claim whose quote is in the text and contains the amount", () => {
    const t = "Tenant shall pay monthly rent of $1,200.";
    expect(verifyClaim(t, { amount: 1200, quote: "monthly rent of $1,200" })?.amount).toBe(1200);
    expect(verifyClaim(t, { amount: 1500, quote: "monthly rent of $1,200" })).toBeNull();
    expect(verifyClaim(t, { amount: 1200, quote: "rent is twelve hundred dollars" })).toBeNull();
    // falls back to the pattern
    expect(resolveAmount(t, "monthlyRent", { amount: 1500, quote: "nope nope nope" })?.amount).toBe(1200);
  });
});

describe("deterministic checks", () => {
  it("deposit cap is 1.5 x monthly rent", () => {
    expect(checkDeposit(1000, 1500).violates).toBe(false);
    expect(checkDeposit(1000, 1500.01).violates).toBe(true);
    expect(checkDeposit(1350, 2700).detail).toContain("$2,025");
    expect(checkDeposit(null, 2700).violates).toBeNull();
    expect(checkDeposit(1350, null).violates).toBeNull();
  });

  it("Ann Arbor application fee cap is $50", () => {
    expect(checkApplicationFee(50).violates).toBe(false);
    expect(checkApplicationFee(75).violates).toBe(true);
    expect(checkApplicationFee(null).violates).toBeNull();
  });
});

describe("buildReview", () => {
  const base = "Tenant shall pay monthly rent of $1,000. The security deposit is $1,200. ".padEnd(1600, "Filler clause text. ");

  it("drops unknown rule ids, deterministic-only ids, and ungrounded quotes", () => {
    const r = buildReview({
      text: base + " Tenant waives the right to a trial by jury.",
      source: "upload",
      demo: false,
      mapping: {
        findings: [
          { ruleId: "made_up_rule", quote: "Tenant waives the right to a trial by jury." },
          { ruleId: "truth_in_renting_notice", quote: "Tenant waives the right to a trial by jury." },
          { ruleId: "attorney_fees", quote: "Tenant pays all attorney fees." },
          { ruleId: "jury_and_notice_waiver", quote: "tenant waives the right to a trial by jury." },
          { ruleId: "jury_and_notice_waiver", quote: "Tenant waives the right to a trial by jury." },
        ],
        amounts: { monthlyRent: null, securityDeposit: null, applicationFee: null },
      },
    });
    const ids = r.findings.map((f) => f.rule.id);
    expect(ids).toEqual(["jury_and_notice_waiver", "truth_in_renting_notice"]);
    expect(r.warnings.join(" ")).toContain("3 possible matches");
    const jury = r.findings[0];
    expect(r.text.slice(jury.start!, jury.end!)).toBe(jury.quote);
  });

  it("arithmetic overrides the model on the deposit cap", () => {
    const r = buildReview({
      text: base + " Truth in Renting Act notice.",
      source: "upload",
      demo: false,
      mapping: {
        findings: [{ ruleId: "deposit_cap", quote: "The security deposit is $1,200." }],
        amounts: { monthlyRent: null, securityDeposit: null, applicationFee: null },
      },
    });
    // $1,200 <= 1.5 x $1,000, so the model's flag is removed
    expect(r.findings).toEqual([]);
    expect(r.facts).toEqual({ monthlyRent: 1000, securityDeposit: 1200, applicationFee: null });
  });

  it("flags an over-cap deposit even if the model missed it", () => {
    const r = buildReview({
      text: "Tenant shall pay monthly rent of $1,000. The security deposit is $2,000.",
      source: "upload",
      demo: false,
      mapping: null,
    });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ method: "deterministic", quote: "The security deposit is $2,000." });
  });

  it("does not claim the Truth in Renting notice is missing from a short excerpt", () => {
    const r = buildReview({ text: "A short photo of one page.", source: "upload", demo: false, mapping: null });
    expect(r.findings).toEqual([]);
  });
});

describe("rules and mock", () => {
  it("rule ids are unique and every rule links to an official source", () => {
    expect(new Set(LEASE_RULES.map((r) => r.id)).size).toBe(LEASE_RULES.length);
    for (const r of LEASE_RULES) {
      expect(r.sourceUrl).toMatch(/^https:\/\/(www\.)?(legislature\.mi\.gov|a2gov\.org)\//);
      if (r.checkedBy !== "deterministic") expect(r.lookFor.length).toBeGreaterThan(10);
    }
    expect(MODEL_RULES.some((r) => r.id === "truth_in_renting_notice")).toBe(false);
  });

  it("every mock finding is grounded, and the sample review validates", () => {
    const mapping = MapOutput.parse({ findings: mockLease.findings, amounts: mockLease.amounts });
    const r = LeaseReviewResponse.parse(buildReview({ text: mockLease.text, mapping, source: "sample", demo: true }));
    expect(r.warnings).toEqual([]);
    const ids = r.findings.map((f) => f.rule.id);
    expect(ids).toContain("deposit_cap");
    expect(ids).toContain("a2_application_fee");
    expect(ids).toContain("truth_in_renting_notice");
    expect(r.findings.filter((f) => f.rule.id === "a2_application_fee")).toHaveLength(1);
    expect(r.findings.find((f) => f.rule.id === "a2_application_fee")!.method).toBe("deterministic");
    expect(r.findings).toHaveLength(mockLease.findings.length + 2);
    for (const f of r.findings) if (f.quote) expect(r.text.slice(f.start!, f.end!)).toBe(f.quote);
  });
});

describe("right-to-renew dates", () => {
  it("adds months with clamping", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2027-09-01", 12)).toBe("2028-09-01");
  });

  it("computes the § 8:530 dates for a 12-month lease", () => {
    const d = renewDates("2027-09-01", 12)!;
    expect(d.covered).toBe(true);
    expect(d.leaseEnd).toBe("2028-08-31");
    expect(d.earliestOffer).toBe("2028-02-28"); // 180 days after Sept 1, 2027
    expect(d.earliestAcceptDeadline).toBe("2028-03-29");
    expect(d.earliestShowing).toBe("2028-03-29"); // 210 days
  });

  it("starts the clock at the final 12 months of a longer lease, and skips short leases", () => {
    expect(renewDates("2027-01-01", 24)!.clockStart).toBe("2028-01-01");
    expect(renewDates("2027-01-01", 6)!.covered).toBe(false);
    expect(renewDates("not a date", 12)).toBeNull();
  });
});
