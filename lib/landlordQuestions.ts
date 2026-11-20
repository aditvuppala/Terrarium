/**
 * "Questions to ask the landlord" for a listing, generated deterministically
 * from what the listing doesn't say (unknown facts) and from nearby city
 * construction. Pure; safe to import on the client.
 */
import type { Listing, ListingEnrichment, UserProfile } from "@/lib/schemas";

export interface LandlordQuestion {
  id: string;
  question: string;
  /** Why we're suggesting it: what's missing or notable for this listing. */
  why: string;
}

/** Same radius the ranking uses for "construction nearby". */
const CONSTRUCTION_NEAR_M = 200;

const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s);

export function landlordQuestions(
  l: Listing,
  e: ListingEnrichment | null | undefined,
  profile: Pick<UserProfile, "hasCar" | "hasPet" | "wantsFurnished" | "roommates">,
): LandlordQuestion[] {
  const q: LandlordQuestion[] = [];
  const add = (id: string, question: string, why: string) => q.push({ id, question, why });

  if (l.priceBasis === "unknown") {
    add(
      "price-basis",
      "Is the rent per person or for the whole unit?",
      "The listing doesn't say, and it changes your share a lot.",
    );
  }
  if (l.utilitiesIncluded.length === 0) {
    add(
      "utilities",
      "Which utilities are included, and what do the others usually cost per month in winter?",
      "The listing doesn't list any included utilities; we're estimating them.",
    );
  }
  if (l.parking === "unknown" && profile.hasCar !== false) {
    add("parking", "Is parking available, and what does it cost per month?", "The listing doesn't mention parking.");
  }
  if (l.petsAllowed === "unknown" && profile.hasPet === true) {
    add("pets", "Are pets allowed, and are there pet fees or extra deposit?", "You have a pet and the listing doesn't say.");
  }
  if (l.inUnitLaundry === "unknown") {
    add("laundry", "Is there a washer and dryer in the unit, or shared laundry?", "The listing doesn't say.");
  }
  if (l.furnished === "unknown" && profile.wantsFurnished !== null) {
    add("furnished", "Does it come furnished? What furniture exactly?", "The listing doesn't say.");
  }
  if (l.leaseType === "unknown") {
    add("lease-type", "Is this a full lease or a sublease?", "The listing doesn't say.");
  }
  if (!l.leaseStart || !l.leaseEnd) {
    add("lease-dates", "What are the exact lease start and end dates?", "The listing doesn't give both dates.");
  }
  if (l.sqftMin === null && l.sqftMax === null) {
    add("sqft", "How many square feet is the unit, and how big are the bedrooms?", "The listing doesn't give square footage.");
  }
  if (l.bathsMin === null && l.bathsMax === null) {
    add("baths", "How many bathrooms are there?", "The listing doesn't say.");
  }

  const near = (e?.construction ?? []).filter((c) => c.distanceMeters <= CONSTRUCTION_NEAR_M);
  if (near.length) {
    const c = near[0];
    add(
      "construction",
      `The city lists ${c.projectType.toLowerCase()} on ${titleCase(c.name)} nearby. How will it affect noise and access, and when does it end?`,
      c.distanceMeters === 0 ? "An active city project covers this address." : `An active city project is about ${Math.round(c.distanceMeters)} m away.`,
    );
  }

  // Always worth asking before signing.
  add(
    "deposit",
    "How much is the security deposit, and will you give me a move-in inventory checklist to fill out?",
    "Documenting the unit at move-in is how you get your deposit back. The Deposit vault can help.",
  );
  return q;
}
