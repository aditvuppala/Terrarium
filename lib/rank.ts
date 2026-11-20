/**
 * STUB ranker: 50/50 closeness to Central Campus + cheapness.
 * Pure function, so it's easy to unit-test and to swap for the real one.
 */
import { confidence } from "@/lib/confidence";
import type {
  CriterionScore,
  Listing,
  ListingEnrichment,
  RankResponse,
  UserProfile,
} from "@/lib/schemas";

const CENTRAL_CAMPUS = { lat: 42.277, lng: -83.7382 };
/** Distances at or beyond this get a commute score of 0. */
const MAX_KM = 5;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Representative price: midpoint of range, or whichever end is known. */
function repPrice(l: Listing): number | null {
  if (l.priceMin !== null && l.priceMax !== null) return (l.priceMin + l.priceMax) / 2;
  return l.priceMin ?? l.priceMax;
}

export function rank(
  profile: UserProfile,
  listings: Listing[],
  // Unused by the stub; the real ranker will read commute/grocery/noise here.
  _enrichments: ListingEnrichment[],
): RankResponse {
  const prices = listings.map(repPrice).filter((p): p is number => p !== null);
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 0;

  const W_COMMUTE = 0.5;
  const W_COST = 0.5;

  const results = listings
    .map((listing) => {
      const km = haversineKm(listing.location, CENTRAL_CAMPUS);
      const commute = clamp01(1 - km / MAX_KM);

      const price = repPrice(listing);
      // Unknown price is neutral (0.5); a single price point is the cheapest (1).
      const cost = price === null ? 0.5 : hi === lo ? 1 : clamp01(1 - (price - lo) / (hi - lo));

      const criteria: CriterionScore[] = [
        {
          key: "commute",
          label: "Commute",
          score: commute,
          weight: W_COMMUTE,
          explanation: `${km.toFixed(1)} km from Central Campus (straight line).`,
        },
        {
          key: "cost",
          label: "Cost",
          score: cost,
          weight: W_COST,
          explanation:
            price === null ? "Price unknown." : `About $${Math.round(price)}/mo (midpoint of listed range).`,
        },
      ];

      const score = Math.round((W_COMMUTE * commute + W_COST * cost) * 1000) / 10;
      return { listing, score, criteria };
    })
    .sort((a, b) => b.score - a.score);

  return {
    results,
    confidence: confidence(profile),
    generatedAt: new Date().toISOString(),
  };
}
