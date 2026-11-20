/**
 * The FIXED list of lease rules the reviewer checks. The model may only point at these ids;
 * it never writes rules, citations or explanations. Every entry was checked against the
 * primary source linked in `sourceUrl` (Michigan Legislature MCL pages; City of Ann Arbor
 * ordinance texts) in Nov 2026. Explanations are paraphrases, not legal advice.
 */
import type { LeaseRule } from "@/lib/schemas";

/** Internal rule shape: the public LeaseRule plus a hint for the model (never shown in the UI). */
export interface LeaseRuleDef extends LeaseRule {
  /** What a matching clause looks like, for the clause-mapping prompt. */
  lookFor: string;
  /** "model": the model may map clauses to it. "deterministic": only server code raises it. "both": either. */
  checkedBy: "model" | "deterministic" | "both";
}

const mcl = (section: string) => `https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-${section}`;
/** ORD-24-03: the current text of Ann Arbor City Code § 8:530 (adopted March 4, 2024). */
const A2_8530 = "https://a2gov.org/media/yp5mecxm/ord-24-03-approval-notice.pdf";
/** ORD-26-04: the current text of Ann Arbor City Code § 8:532 (adopted Feb 2, 2026, effective Aug 1, 2026). */
const A2_8532 = "https://www.a2gov.org/media/s2xa1bqy/ord-26-04-approval-notice.pdf";

const A2_ONLY = "Ann Arbor rule: applies only to rentals inside Ann Arbor city limits.";

export const LEASE_RULES: LeaseRuleDef[] = [
  /* ---------------- Michigan: Security Deposit Act ---------------- */
  {
    id: "deposit_cap",
    jurisdiction: "michigan",
    title: "Security deposit above 1½ months' rent",
    citation: "MCL 554.602",
    sourceUrl: mcl("602"),
    explanation:
      "In Michigan a security deposit can't be more than one and a half months' rent. Under the deposit law, prepaid rent beyond the first month counts toward that limit too.",
    askLandlord: "Can you lower the deposit to no more than 1½ months' rent, as MCL 554.602 requires?",
    appliesNote: null,
    lookFor:
      "A security deposit (or required prepaid rent beyond the first month) larger than 1.5 times the monthly rent. Only flag it if both amounts are stated and the deposit is clearly larger.",
    checkedBy: "both",
  },
  {
    id: "deposit_timeline",
    jurisdiction: "michigan",
    title: "Deposit deadlines longer than the law allows",
    citation: "MCL 554.609, 554.613",
    sourceUrl: mcl("609"),
    explanation:
      "After you move out, the landlord has 30 days to mail you an itemized list of damages they want to take from the deposit, and 45 days to return the rest or file in court. A lease can't stretch these deadlines, because it can't waive your deposit rights (MCL 554.633(1)(b)).",
    askLandlord: "Can the lease say the deposit timeline follows MCL 554.609 and 554.613 (30-day itemized list, 45 days to return or sue)?",
    appliesNote: null,
    lookFor:
      "A clause giving the landlord more than 30 days after move-out to send the damage list, or more than 45 days to return the deposit.",
    checkedBy: "model",
  },
  {
    id: "deposit_waiver",
    jurisdiction: "michigan",
    title: "Waives your security deposit rights",
    citation: "MCL 554.633(1)(b)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't waive your rights under Michigan's security deposit law, for example by making the deposit non-refundable or letting the landlord keep it without the itemized damage list the law requires.",
    askLandlord: "Can you remove this clause? Michigan's deposit law (MCL 554.601–.616) can't be waived in a lease.",
    appliesNote: null,
    lookFor:
      "The security deposit is non-refundable, kept automatically, forfeited without an itemized list, or the tenant waives deposit rights. Do NOT flag a separate non-refundable cleaning fee under this rule.",
    checkedBy: "model",
  },
  /* ---------------- Michigan: Truth in Renting Act ---------------- */
  {
    id: "repair_remedy_waiver",
    jurisdiction: "michigan",
    title: "Waives your remedies for repairs and habitability",
    citation: "MCL 554.633(1)(a)",
    sourceUrl: mcl("633"),
    explanation:
      "Michigan landlords must keep rentals fit to live in and in reasonable repair (MCL 554.139). A lease can't waive or change what you can do when they don't.",
    askLandlord: "Can you remove this clause? The landlord's repair duties under MCL 554.139 can't be waived.",
    appliesNote: null,
    lookFor:
      "The tenant accepts the unit as-is and waives repair claims, gives up remedies for a unit that is unfit or out of repair, or must make all repairs with no landlord duty to repair.",
    checkedBy: "model",
  },
  {
    id: "confession_of_judgment",
    jurisdiction: "michigan",
    title: "Confession of judgment",
    citation: "MCL 554.633(1)(d)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't make you agree ahead of time that a court judgment can be entered against you (a \"confession of judgment\").",
    askLandlord: "Can you remove the confession-of-judgment clause? Michigan law doesn't allow it in a lease.",
    appliesNote: null,
    lookFor: "The tenant confesses judgment, or authorizes judgment to be entered against them without a hearing.",
    checkedBy: "model",
  },
  {
    id: "exculpatory",
    jurisdiction: "michigan",
    title: "Landlord not liable for their own negligence",
    citation: "MCL 554.633(1)(e)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't excuse the landlord from responsibility for failing to do, or carelessly doing, what the law requires of them. There is a narrow exception for some insured fire or casualty losses.",
    askLandlord: "Can you remove or narrow this clause? A lease can't excuse the landlord's own negligence (MCL 554.633(1)(e)).",
    appliesNote: null,
    lookFor:
      "The landlord is not liable for injury, damage or loss, including loss caused by the landlord's negligence or failure to repair, or the tenant holds the landlord harmless for the landlord's own acts.",
    checkedBy: "model",
  },
  {
    id: "jury_and_notice_waiver",
    jurisdiction: "michigan",
    title: "Waives jury trial or legal notice",
    citation: "MCL 554.633(1)(f)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't make you give up a jury trial, or any notice or court procedure the law requires, in a lawsuit about the lease.",
    askLandlord: "Can you remove this waiver? Michigan law doesn't let a lease waive jury trial or required notice.",
    appliesNote: null,
    lookFor: "The tenant waives a jury trial, waives notice to quit or other legally required notice, or waives court procedures.",
    checkedBy: "model",
  },
  {
    id: "attorney_fees",
    jurisdiction: "michigan",
    title: "You pay the landlord's lawyer fees",
    citation: "MCL 554.633(1)(g)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't make you pay the landlord's attorney fees or legal costs beyond what a statute allows. Costs a court awards under the law are a separate matter.",
    askLandlord: "Can you remove the attorney-fee clause, or limit it to what Michigan statutes allow?",
    appliesNote: null,
    lookFor: "The tenant must pay the landlord's attorney fees, legal fees, collection costs or court costs.",
    checkedBy: "model",
  },
  {
    id: "lien_on_property",
    jurisdiction: "michigan",
    title: "Landlord gets a claim on your belongings",
    citation: "MCL 554.633(1)(h)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't give the landlord a security interest (a lien) in your personal property to cover rent or other charges, unless a law specifically allows it.",
    askLandlord: "Can you remove the clause giving you a lien on my belongings?",
    appliesNote: null,
    lookFor: "The landlord has a lien or security interest in the tenant's belongings, or may hold or sell them for unpaid rent.",
    checkedBy: "model",
  },
  {
    id: "rent_acceleration",
    jurisdiction: "michigan",
    title: "All remaining rent due at once",
    citation: "MCL 554.633(1)(i)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can make the rest of the rent due early after a breach only if it also says you may not owe all of it, because the landlord must try to limit their losses, and that either side can ask a court to decide what's owed.",
    askLandlord: "Can the acceleration clause add the statement Michigan law requires (MCL 554.633(1)(i))?",
    appliesNote: null,
    lookFor:
      "After a default, all rent for the rest of the term becomes due immediately, WITHOUT a statement that the tenant may not be liable for all of it because of the landlord's duty to mitigate and that either party may ask a court to decide.",
    checkedBy: "model",
  },
  {
    id: "eviction_rights_waiver",
    jurisdiction: "michigan",
    title: "Waives your rights in an eviction",
    citation: "MCL 554.633(1)(j)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't waive or change your rights about possession or eviction under Michigan's eviction and anti-lockout laws. A landlord has to go through court to take the unit back.",
    askLandlord: "Can you remove this clause? Evictions have to go through the court process.",
    appliesNote: null,
    lookFor:
      "The landlord may change the locks, remove the tenant's belongings, shut off utilities, or retake the unit without a court order, or the tenant waives eviction rights.",
    checkedBy: "model",
  },
  {
    id: "no_mitigation",
    jurisdiction: "michigan",
    title: "Landlord doesn't have to try to re-rent",
    citation: "MCL 554.633(1)(k)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't release either side from the duty to limit (mitigate) damages. For example, if you leave early, the landlord still has to make reasonable efforts to re-rent the unit.",
    askLandlord: "Can you remove the clause saying you have no duty to re-rent or reduce damages?",
    appliesNote: null,
    lookFor: "The landlord has no duty to re-rent the unit or to mitigate damages if the tenant leaves early.",
    checkedBy: "model",
  },
  {
    id: "unilateral_changes",
    jurisdiction: "michigan",
    title: "Landlord can change the lease without your OK",
    citation: "MCL 554.633(1)(l)",
    sourceUrl: mcl("633"),
    explanation:
      "Once the lease starts, the landlord can't change it without your written consent. The law has narrow exceptions (for example, changes required by law or rules that protect health and safety) that need at least 30 days' written notice.",
    askLandlord: "Can the lease say changes need my written consent, except the narrow cases MCL 554.633(1)(l) allows?",
    appliesNote: null,
    lookFor:
      "The landlord may change, add to, or amend the lease terms, fees or rules at any time, or without the tenant's written consent.",
    checkedBy: "model",
  },
  {
    id: "power_of_attorney",
    jurisdiction: "michigan",
    title: "You give the landlord power of attorney",
    citation: "MCL 554.633(1)(n)",
    sourceUrl: mcl("633"),
    explanation: "A lease can't require you to give the landlord a power of attorney (the right to act or sign on your behalf).",
    askLandlord: "Can you remove the power-of-attorney clause?",
    appliesNote: null,
    lookFor: "The tenant appoints the landlord as attorney-in-fact or gives the landlord power of attorney.",
    checkedBy: "model",
  },
  {
    id: "payment_method_fees",
    jurisdiction: "michigan",
    title: "Fees on every way to pay rent",
    citation: "MCL 554.633(1)(o)",
    sourceUrl: mcl("633"),
    explanation:
      "A lease can't put an extra fee on every way of paying rent. If you're allowed more than one payment method, at least one must be free.",
    askLandlord: "Which way can I pay rent without a fee? Michigan law requires at least one.",
    appliesNote: null,
    lookFor: "Every allowed rent payment method carries a fee, or the only allowed method has a convenience/processing fee.",
    checkedBy: "model",
  },
  {
    id: "truth_in_renting_notice",
    jurisdiction: "michigan",
    title: "Required Truth in Renting notice not found",
    citation: "MCL 554.634",
    sourceUrl: mcl("634"),
    explanation:
      "Michigan leases must include, in a prominent place and in at least 12-point type, a notice that Michigan law sets rights and obligations for parties to rental agreements, that the agreement must comply with the Truth in Renting Act, and that you may want to ask a lawyer about any provision. The lease must also give a name and address for sending notices to the landlord.",
    askLandlord: "Where is the Truth in Renting Act notice (MCL 554.634)? Can you add it?",
    appliesNote: "We searched the text we extracted. If it's on a page you didn't upload, this may not apply.",
    lookFor: "",
    checkedBy: "deterministic",
  },
  /* ---------------- Ann Arbor City Code, Chapter 105 ---------------- */
  {
    id: "a2_early_showing",
    jurisdiction: "ann_arbor",
    title: "Showing or re-leasing your unit too early",
    citation: "Ann Arbor City Code § 8:530",
    sourceUrl: A2_8530,
    explanation:
      "In Ann Arbor, a landlord can't enter to show your unit to prospective tenants until 210 days into your current lease, and can't sign a lease for the next term with someone else before then unless they have good cause not to renew. This can't be waived in the lease.",
    askLandlord: "Can the showing clause follow Ann Arbor's rule: no showings or new leases until 210 days into my lease?",
    appliesNote: `${A2_ONLY} Covers leases of 8 months or more signed or renewed after March 2024; not subleases, co-ops, fraternities or sororities.`,
    lookFor:
      "The landlord may show the unit to prospective tenants, or lease it for the next term, earlier than 210 days into the current lease (e.g. any time, or after 60/90/120 days).",
    checkedBy: "model",
  },
  {
    id: "a2_renewal_rights",
    jurisdiction: "ann_arbor",
    title: "Renewal deadline too short or renewal rights waived",
    citation: "Ann Arbor City Code § 8:530",
    sourceUrl: A2_8530,
    explanation:
      "In Ann Arbor, a landlord can't offer a renewal earlier than 180 days from the start of your lease, and can't require you to accept a renewal offer sooner than 30 days after it's sent. You can't waive these rights in the lease.",
    askLandlord: "Can the renewal clause give me at least 30 days to decide, with no offer before 180 days into the lease?",
    appliesNote: `${A2_ONLY} Covers leases of 8 months or more signed or renewed after March 2024; not subleases, co-ops, fraternities or sororities.`,
    lookFor:
      "The tenant must accept or decline a renewal in fewer than 30 days after an offer, must decide on renewal earlier than 180 days into the lease, or waives the right to renew.",
    checkedBy: "model",
  },
  {
    id: "a2_pretenancy_fee",
    jurisdiction: "ann_arbor",
    title: "Pre-tenancy fee (holding, waitlist, move-in…)",
    citation: "Ann Arbor City Code § 8:532(5)",
    sourceUrl: A2_8532,
    explanation:
      "Ann Arbor bans pre-tenancy fees: fees charged before the lease starts, such as wait-list, holding, option, preparation or move-in fees. Rent, a security deposit paid after the lease is fully signed, and an application fee of up to $50 aren't pre-tenancy fees.",
    askLandlord: "Can you remove this fee? Ann Arbor City Code § 8:532 prohibits pre-tenancy fees.",
    appliesNote: A2_ONLY,
    lookFor:
      "A holding fee, reservation fee, wait-list fee, option fee, preparation/turnover fee, move-in fee, or any other fee charged before the lease term starts (not rent, not the security deposit, not the application fee).",
    checkedBy: "model",
  },
  {
    id: "a2_application_fee",
    jurisdiction: "ann_arbor",
    title: "Application fee over $50",
    citation: "Ann Arbor City Code § 8:532(4)",
    sourceUrl: A2_8532,
    explanation:
      "In Ann Arbor, a rental application fee can't be more than $50, and it must be fully refunded if you aren't offered a unit.",
    askLandlord: "Can you refund the part of the application fee above $50 (Ann Arbor City Code § 8:532)?",
    appliesNote: A2_ONLY,
    lookFor: "A rental application or screening fee over $50 per applicant.",
    checkedBy: "both",
  },
  {
    id: "a2_mandatory_fee",
    jurisdiction: "ann_arbor",
    title: "Required fee charged on top of rent",
    citation: "Ann Arbor City Code § 8:532(6)(a)",
    sourceUrl: A2_8532,
    explanation:
      "In Ann Arbor, fees every tenant has to pay (that you can't reasonably avoid) must be built into the base rent, not charged separately. Utility charges and the security deposit don't count as these fees.",
    askLandlord: "Can this required fee be folded into the base rent, as Ann Arbor City Code § 8:532(6)(a) requires?",
    appliesNote: `${A2_ONLY} This part took effect August 1, 2026, for leases signed or renewed after that.`,
    lookFor:
      "A required recurring or one-time fee every tenant must pay in addition to rent, such as an amenity, administrative, technology, community or service fee. Not utilities (water, sewer, electricity, gas, internet, trash), not the deposit, not optional fees like pet or parking fees.",
    checkedBy: "model",
  },
  {
    id: "a2_parking_fee",
    jurisdiction: "ann_arbor",
    title: "Parking fee even if you don't park",
    citation: "Ann Arbor City Code § 8:532(6)(d)",
    sourceUrl: A2_8532,
    explanation:
      "In Ann Arbor, a landlord can't charge you for car or bike parking if you haven't agreed to use it or don't use it.",
    askLandlord: "I won't use parking. Can you remove the parking fee (Ann Arbor City Code § 8:532(6)(d))?",
    appliesNote: `${A2_ONLY} This part took effect August 1, 2026, for leases signed or renewed after that.`,
    lookFor: "Every tenant is charged for vehicle or bicycle parking whether or not they use it.",
    checkedBy: "model",
  },
];

export const RULES_BY_ID = new Map(LEASE_RULES.map((r) => [r.id, r]));

/** Public shape (what the API returns and the UI shows). */
export function publicRule(r: LeaseRuleDef): LeaseRule {
  return {
    id: r.id,
    jurisdiction: r.jurisdiction,
    title: r.title,
    citation: r.citation,
    sourceUrl: r.sourceUrl,
    explanation: r.explanation,
    askLandlord: r.askLandlord,
    appliesNote: r.appliesNote,
  };
}

/** Rules the model may point at. */
export const MODEL_RULES = LEASE_RULES.filter((r) => r.checkedBy !== "deterministic");

export const STUDENT_LEGAL_SERVICES_URL = "https://studentlegalservices.umich.edu/";
