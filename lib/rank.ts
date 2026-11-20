/**
 * Deterministic ranker. Same profile + same data => same output, every time.
 * Every number here is explainable; constants marked (assumption) are estimates
 * we state openly in the UI via `detail` / `dataQuality`.
 *
 * Overview
 *   - Score each priority in profile.priorities (0..1) with a status
 *     (met / partial / unmet / unknown) and a plain-language detail.
 *   - weight = 2^-(rank-1): #1 counts 1, #2 counts 0.5, #3 counts 0.25, ...
 *   - score = round(100 * Σ w·s / Σ w)
 *   - Dealbreakers: a listing fails if any dealbreaker criterion is "unmet"
 *     ("unknown" passes but is listed in shortfalls).
 *   - Sort: passes first, then score desc, then rentMin asc (then id, for stability).
 */
import { confidence } from "@/lib/confidence";
import {
  CAMPUS_CENTROIDS,
  BUS_WAIT_MIN,
  busRideMin,
  clamp01,
  driveMin,
  walkMetersBetween,
  walkMinFromMeters,
  type Point,
} from "@/lib/geo";
import {
  DEFAULT_PROFILE,
  type CriterionResult,
  type Listing,
  type ListingEnrichment,
  type PlaceCategory,
  type Priority,
  type PriorityKey,
  type RankResponse,
  type ScoredListing,
  type UMBuilding,
  type UserProfile,
} from "@/lib/schemas";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Walk up to this many minutes; beyond it, take the bus (or drive if hasCar). */
const MAX_WALK_MIN = 20;
/** Monthly utilities estimate (assumption): $90, or $50 if the listing includes some utilities. */
const UTILITIES_EST = 90;
const UTILITIES_EST_PARTIAL = 50;
/** Monthly parking estimate for car owners when parking isn't included (assumption). */
const PARKING_EST = 110;
/** Over-budget tolerance for "partial". */
const BUDGET_SLACK = 150;
/** "Nearby" for places = within a 10-minute walk. */
const NEARBY_PLACE_MIN = 10;
/** Walk from the alighting stop to a non-building destination (assumption). */
const DEST_STOP_WALK_MIN = 5;
/** If no stop within 800 m, assume this walk to reach one (≈1 km). */
const FAR_STOP_WALK_MIN = 13;
/** Comfortable floor area per person (assumption). */
const SQFT_PER_PERSON = 350;

const LABELS: Record<PriorityKey, string> = {
  commute: "Commute",
  cost: "Cost",
  roommates: "Fits your group",
  nearby_places: "Places nearby",
  transit_access: "Bus access",
  parking: "Parking",
  furnished: "Furnished",
  pets: "Pets",
  in_unit_laundry: "In-unit laundry",
  lease_fit: "Lease fit",
  space: "Space",
};
export const priorityLabel = (k: PriorityKey) => LABELS[k];

const PLACE_LABEL: Record<PlaceCategory, [string, string]> = {
  bar: ["bar", "bars"],
  restaurant: ["restaurant", "restaurants"],
  cafe: ["cafe", "cafes"],
  fast_food: ["fast-food spot", "fast food"],
  grocery: ["grocery store", "grocery stores"],
  gym: ["gym", "gyms"],
};
const placeWord = (c: PlaceCategory, n = 2) => PLACE_LABEL[c][n === 1 ? 0 : 1];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const mins = (n: number) => (n < 1 ? "under 1 min" : `${Math.round(n)} min`);
const weightFor = (rank: number) => 2 ** -(rank - 1);
const listedQuality = (l: Listing): CriterionResult["dataQuality"] => (l.provenance.isSynthetic ? "synthetic" : "listed");
const bedsText = (n: number) => (n === 0 ? "studio" : `${n} bedroom${n === 1 ? "" : "s"}`);
const peopleText = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;
const bedRange = (l: Listing) => (l.bedsMin === l.bedsMax ? bedsText(l.bedsMax) : `${bedsText(l.bedsMin)}–${bedsText(l.bedsMax)}`);

/** Effective priority list: deduped by key, sorted by rank; defaults if empty. */
function effectivePriorities(profile: UserProfile): Priority[] {
  const src = profile.priorities.length ? profile.priorities : DEFAULT_PROFILE.priorities;
  const seen = new Set<PriorityKey>();
  return [...src]
    .sort((a, b) => a.rank - b.rank)
    .filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)));
}

/** Partial result before rank/weight are attached. */
type Scored = Omit<CriterionResult, "key" | "rank" | "weight"> & {
  /** One plain sentence used in shortfalls when status isn't "met". */
  shortfall: string;
  /** Short positive phrase for the headline. */
  highlight: string;
};

/* ------------------------------------------------------------------ */
/* Commute                                                             */
/* ------------------------------------------------------------------ */

interface Target {
  label: string;
  point: Point;
  weight: number;
  buildingCode: string | null;
}

interface Trip {
  minutes: number;
  mode: "walk" | "bus" | "drive";
}

/** Readable building name; short code when the name is long (e.g. "BBB"). */
const buildingLabel = (b: UMBuilding) => (b.name.length <= 24 ? b.name : b.code);

/**
 * basis: what the targets are, for multi-target text ("your 3 class buildings").
 * note: why we chose them, for fallbacks ("no classes entered yet"); null when from the user's own data.
 */
function commuteTargets(
  profile: UserProfile,
  buildingsByCode: Map<string, UMBuilding>,
): { targets: Target[]; basis: string; note: string | null } {
  const targets: Target[] = [];
  for (const c of profile.courses) {
    const b = c.buildingCode ? buildingsByCode.get(c.buildingCode) : undefined;
    if (b) targets.push({ label: buildingLabel(b), point: b, weight: c.confirmed ? 2 : 1, buildingCode: b.code });
  }
  for (const f of profile.frequentPlaces) {
    if (f.lat !== null && f.lng !== null) targets.push({ label: f.label, point: { lat: f.lat, lng: f.lng }, weight: 1, buildingCode: null });
  }
  if (targets.length) {
    const nClasses = new Set(targets.filter((t) => t.buildingCode).map((t) => t.buildingCode)).size;
    const nPlaces = targets.filter((t) => !t.buildingCode).length;
    const parts = [nClasses ? `${nClasses} class building${nClasses === 1 ? "" : "s"}` : "", nPlaces ? `${nPlaces} place${nPlaces === 1 ? "" : "s"} you go often` : ""];
    return { targets, basis: `your ${parts.filter(Boolean).join(" and ")}`, note: null };
  }
  const fromMajor = "based on your major; add classes for exact times";
  if (profile.majorCampus === "north")
    return { targets: [{ label: "North Campus", point: CAMPUS_CENTROIDS.north, weight: 1, buildingCode: null }], basis: "North Campus", note: fromMajor };
  if (profile.majorCampus === "both")
    return {
      targets: [
        { label: "North Campus", point: CAMPUS_CENTROIDS.north, weight: 1, buildingCode: null },
        { label: "Central Campus", point: CAMPUS_CENTROIDS.central, weight: 1, buildingCode: null },
      ],
      basis: "North and Central Campus",
      note: fromMajor,
    };
  if (profile.majorCampus === "central")
    return { targets: [{ label: "Central Campus", point: CAMPUS_CENTROIDS.central, weight: 1, buildingCode: null }], basis: "Central Campus", note: fromMajor };
  return {
    targets: [{ label: "Central Campus", point: CAMPUS_CENTROIDS.central, weight: 1, buildingCode: null }],
    basis: "Central Campus",
    note: "no classes or campus entered yet",
  };
}

function tripTo(l: Listing, e: ListingEnrichment | undefined, t: Target, hasCar: boolean): Trip {
  const here = { lat: l.lat, lng: l.lng };
  const bt = t.buildingCode ? e?.buildingTimes.find((b) => b.buildingCode === t.buildingCode) : undefined;
  const walk = bt?.walkMin ?? walkMinFromMeters(walkMetersBetween(here, t.point));
  if (walk <= MAX_WALK_MIN) return { minutes: walk, mode: "walk" };
  if (hasCar) return { minutes: driveMin(here, t.point), mode: "drive" };
  if (bt?.busMin != null) return { minutes: bt.busMin, mode: "bus" };
  const toStop = e?.stops[0]?.walkMin ?? FAR_STOP_WALK_MIN;
  return { minutes: toStop + BUS_WAIT_MIN + busRideMin(here, t.point) + DEST_STOP_WALK_MIN, mode: "bus" };
}

const tripPhrase = (trip: Trip, label: string) =>
  `about ${mins(trip.minutes)} ${trip.mode === "walk" ? "walk" : trip.mode === "bus" ? "by bus" : "by car"} to ${label}`;

function scoreCommute(l: Listing, e: ListingEnrichment | undefined, profile: UserProfile, buildingsByCode: Map<string, UMBuilding>): Scored {
  const { targets, basis, note } = commuteTargets(profile, buildingsByCode);
  const hasCar = profile.hasCar === true;
  const trips = targets.map((t) => ({ t, trip: tripTo(l, e, t, hasCar) }));
  const totalW = trips.reduce((s, x) => s + x.t.weight, 0);
  const avg = trips.reduce((s, x) => s + x.trip.minutes * x.t.weight, 0) / totalW;
  const worst = trips.reduce((a, b) => (b.trip.minutes > a.trip.minutes ? b : a));
  const score = clamp01(1 - (avg - 5) / 35);
  const status = avg <= 15 ? "met" : avg <= 25 ? "partial" : "unmet";

  const single = trips.length === 1 || new Set(trips.map((x) => x.t.label)).size === 1;
  const detail = single
    ? `${cap(tripPhrase(worst.trip, worst.t.label))}${note ? ` (${note})` : ""}.`
    : `Average ${mins(avg)} to ${basis}; longest is ${tripPhrase(worst.trip, worst.t.label)}${note ? ` (${note})` : ""}.`;
  return {
    score,
    status,
    detail,
    dataQuality: "estimated",
    shortfall: `${cap(tripPhrase(worst.trip, worst.t.label))}.`,
    highlight: single ? tripPhrase(worst.trip, worst.t.label) : `${mins(avg)} average commute`,
  };
}

/* ------------------------------------------------------------------ */
/* Cost                                                                */
/* ------------------------------------------------------------------ */

interface CostBreakdown {
  monthly: number;
  share: number;
  utilities: number;
  parking: number;
  assumedPerUnit: boolean;
}

export function monthlyCost(l: Listing, profile: UserProfile): CostBreakdown {
  const people = (profile.roommates ?? 0) + 1;
  const perPerson = l.priceBasis === "per_bed" || l.priceBasis === "per_room";
  const split = Math.max(1, Math.min(people, l.bedsMax));
  const share = perPerson ? l.rentMin : l.rentMin / split;
  const utilities = l.utilitiesIncluded.length ? UTILITIES_EST_PARTIAL : UTILITIES_EST;
  const parking = profile.hasCar === true && l.parking !== "yes" ? PARKING_EST : 0;
  return { monthly: Math.round(share + utilities + parking), share, utilities, parking, assumedPerUnit: l.priceBasis === "unknown" };
}

function scoreCost(l: Listing, profile: UserProfile, allMonthly: number[]): Scored {
  const c = monthlyCost(l, profile);
  const people = (profile.roommates ?? 0) + 1;
  const parts = [
    `About ${usd(c.monthly)}/mo for your share`,
    `(${usd(c.share)} rent${people > 1 && l.priceBasis !== "per_bed" && l.priceBasis !== "per_room" ? ` split ${Math.max(1, Math.min(people, l.bedsMax))} ways` : ""} + ~${usd(c.utilities)} utilities est.${c.parking ? ` + ~${usd(c.parking)} parking est.` : ""})`,
  ];
  let detail = parts.join(" ");
  if (c.assumedPerUnit) detail += ". Listing doesn't say if rent is per unit or per bed; we assumed per unit";

  const budget = profile.budgetMax;
  if (budget !== null && budget > 0) {
    const over = c.monthly - budget;
    const score = c.monthly <= budget ? 0.85 + (0.15 * (budget - c.monthly)) / budget : Math.max(0, 0.85 - over / 500);
    const status = c.monthly <= budget ? "met" : over <= BUDGET_SLACK ? "partial" : "unmet";
    return {
      score: clamp01(score),
      status,
      detail: `${detail}${over > 0 ? `; ${usd(over)}/mo over your budget` : `; ${usd(-over)}/mo under your budget`}.`,
      dataQuality: listedQuality(l),
      shortfall: `${usd(over)}/mo over your budget.`,
      highlight: `${usd(c.monthly)}/mo, within budget`,
    };
  }
  // No budget: cheaper than more listings = better.
  const cheaper = allMonthly.filter((m) => m < c.monthly).length;
  const percentile = allMonthly.length > 1 ? cheaper / (allMonthly.length - 1) : 0;
  return {
    score: clamp01(1 - percentile),
    status: "met",
    detail: `${detail}. Cheaper than ${Math.round((1 - percentile) * 100)}% of listings.`,
    dataQuality: listedQuality(l),
    shortfall: "",
    highlight: `${usd(c.monthly)}/mo for your share`,
  };
}

/* ------------------------------------------------------------------ */
/* Other criteria                                                      */
/* ------------------------------------------------------------------ */

function scoreRoommates(l: Listing, roommates: number): Scored {
  const need = roommates + 1;
  const max = Math.max(1, l.bedsMax);
  const fits = l.bedsMin <= need && need <= max;
  const detail = fits
    ? `Has ${bedRange(l)} for ${peopleText(need)}.`
    : need > max
      ? `Only ${bedsText(l.bedsMax)} for ${peopleText(need)}.`
      : `Smallest option is ${bedsText(l.bedsMin)}; you need ${need}.`;
  return {
    score: fits ? 1 : 0,
    status: fits ? "met" : "unmet",
    detail,
    dataQuality: listedQuality(l),
    shortfall: detail,
    highlight: `room for ${peopleText(need)}`,
  };
}

function scoreNearbyPlaces(e: ListingEnrichment | undefined, cats: PlaceCategory[]): Scored {
  const found = cats.map((c) => ({ c, n: (e?.places ?? []).filter((p) => p.category === c && p.walkMin <= NEARBY_PLACE_MIN).length }));
  const have = found.filter((f) => f.n > 0);
  const missing = found.filter((f) => f.n === 0);
  const score = have.length / cats.length;
  const status = score === 1 ? "met" : score > 0 ? "partial" : "unmet";
  const detail =
    (have.length ? `Within a 10-min walk: ${have.map((f) => `${f.n} ${placeWord(f.c, f.n)}`).join(", ")}.` : "") +
    (missing.length ? `${have.length ? " " : ""}None within 10 min: ${missing.map((f) => placeWord(f.c)).join(", ")}.` : "");
  return {
    score,
    status,
    detail,
    dataQuality: "estimated",
    shortfall: `No ${missing.map((f) => placeWord(f.c)).join(" or ")} within a 10-minute walk.`,
    highlight: have.map((f) => placeWord(f.c)).join(" and ") + " nearby",
  };
}

function scoreTransit(e: ListingEnrichment | undefined): Scored {
  const stop = e?.stops[0];
  if (!stop) {
    return { score: 0, status: "unmet", detail: "No bus stop within 800 m.", dataQuality: "estimated", shortfall: "No bus stop within 800 m.", highlight: "" };
  }
  const routes = [...new Set(e!.stops.flatMap((s) => s.routes.map((r) => r.routeName)))];
  const score = clamp01(1 - (stop.walkMin - 2) / 12);
  const status = stop.walkMin <= 5 ? "met" : stop.walkMin <= 10 ? "partial" : "unmet";
  const routeText = routes.slice(0, 5).join(", ") + (routes.length > 5 ? `, +${routes.length - 5} more` : "");
  return {
    score,
    status,
    detail: `Nearest stop ${mins(stop.walkMin)} walk (${stop.stopName}). Routes nearby: ${routeText}.`,
    dataQuality: "estimated",
    shortfall: `Nearest bus stop is a ${mins(stop.walkMin)} walk.`,
    highlight: `${mins(stop.walkMin)} to a bus stop`,
  };
}

function scoreTriState(l: Listing, value: "yes" | "no" | "unknown", want: boolean, what: { yes: string; no: string; unknown: string; highlight: string }): Scored {
  if (value === "unknown") {
    return { score: 0.5, status: "unknown", detail: `Listing doesn't say ${what.unknown}.`, dataQuality: "missing", shortfall: `Listing doesn't say ${what.unknown}.`, highlight: "" };
  }
  const good = (value === "yes") === want;
  const detail = value === "yes" ? what.yes : what.no;
  return { score: good ? 1 : 0, status: good ? "met" : "unmet", detail, dataQuality: listedQuality(l), shortfall: detail, highlight: what.highlight };
}

function scoreLeaseFit(l: Listing, profile: UserProfile): Scored {
  const notes: string[] = [];
  let fail = false;
  let unknown = false;
  const pref = profile.leaseTypePref;
  if (pref && pref !== "either") {
    if (l.leaseType === "unknown") {
      unknown = true;
      notes.push("Listing doesn't say if it's a sublease or a full lease");
    } else if (l.leaseType !== pref) {
      fail = true;
      notes.push(`It's a ${l.leaseType === "sublease" ? "sublease" : "full lease"}; you want a ${pref === "sublease" ? "sublease" : "full lease"}`);
    } else notes.push(`${l.leaseType === "sublease" ? "Sublease" : "Full lease"}, as you want`);
  }
  if (profile.moveInBy) {
    if (!l.leaseStart) {
      unknown = true;
      notes.push("Listing doesn't give a start date");
    } else if (l.leaseStart > profile.moveInBy) {
      fail = true;
      notes.push(`Starts ${l.leaseStart}, after your move-in date ${profile.moveInBy}`);
    } else notes.push(`Starts ${l.leaseStart}, by your move-in date`);
  }
  const detail = notes.join(". ") + ".";
  if (fail) return { score: 0, status: "unmet", detail, dataQuality: listedQuality(l), shortfall: detail, highlight: "" };
  if (unknown) return { score: 0.5, status: "unknown", detail, dataQuality: "missing", shortfall: detail, highlight: "" };
  return { score: 1, status: "met", detail, dataQuality: listedQuality(l), shortfall: "", highlight: "lease dates fit" };
}

function scoreSpace(l: Listing, profile: UserProfile): Scored {
  const people = (profile.roommates ?? 0) + 1;
  const max = Math.max(1, l.bedsMax);
  if (max < people) {
    const d = `Only ${bedsText(l.bedsMax)} for ${peopleText(people)}.`;
    return { score: 0, status: "unmet", detail: d, dataQuality: listedQuality(l), shortfall: d, highlight: "" };
  }
  const sqft = l.sqftMax ?? l.sqftMin;
  if (sqft === null) {
    const d = `Enough bedrooms (${bedRange(l)}), but the listing doesn't give square footage.`;
    return { score: 0.5, status: "unknown", detail: d, dataQuality: "missing", shortfall: "Listing doesn't give square footage.", highlight: "" };
  }
  const per = sqft / people;
  const [score, status] = per >= SQFT_PER_PERSON ? [1, "met" as const] : per >= 250 ? [0.6, "partial" as const] : [0.3, "partial" as const];
  const d = `${bedRange(l)}, about ${Math.round(sqft)} sq ft (${Math.round(per)} per person).`;
  return { score, status, detail: cap(d), dataQuality: listedQuality(l), shortfall: `About ${Math.round(per)} sq ft per person.`, highlight: `${Math.round(sqft)} sq ft` };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

/** Criteria we can't score without some profile input are left out, not guessed. */
function isSkipped(key: PriorityKey, profile: UserProfile): boolean {
  switch (key) {
    case "roommates":
      return profile.roommates === null;
    case "nearby_places":
      return profile.placeCategories.length === 0;
    case "furnished":
      return profile.wantsFurnished === null;
    case "pets":
      return profile.hasPet !== true;
    case "lease_fit":
      return profile.leaseTypePref === null && profile.moveInBy === null;
    default:
      return false;
  }
}

function scoreCriterion(
  key: PriorityKey,
  l: Listing,
  e: ListingEnrichment | undefined,
  profile: UserProfile,
  ctx: { buildingsByCode: Map<string, UMBuilding>; allMonthly: number[] },
): Scored | null {
  switch (key) {
    case "commute":
      return scoreCommute(l, e, profile, ctx.buildingsByCode);
    case "cost":
      return scoreCost(l, profile, ctx.allMonthly);
    case "roommates":
      return profile.roommates === null ? null : scoreRoommates(l, profile.roommates);
    case "nearby_places":
      return profile.placeCategories.length ? scoreNearbyPlaces(e, profile.placeCategories) : null;
    case "transit_access":
      return scoreTransit(e);
    case "parking":
      return scoreTriState(l, l.parking, true, { yes: "Parking included.", no: "Listing says no parking.", unknown: "whether parking is available", highlight: "parking included" });
    case "furnished":
      if (profile.wantsFurnished === null) return null;
      return scoreTriState(l, l.furnished, profile.wantsFurnished, { yes: "Comes furnished.", no: "Unfurnished.", unknown: "whether it's furnished", highlight: profile.wantsFurnished ? "furnished" : "unfurnished" });
    case "pets":
      if (profile.hasPet !== true) return null;
      return scoreTriState(l, l.petsAllowed, true, { yes: "Pets allowed.", no: "No pets allowed.", unknown: "if pets are allowed", highlight: "pets allowed" });
    case "in_unit_laundry":
      return scoreTriState(l, l.inUnitLaundry, true, { yes: "Washer/dryer in unit.", no: "No in-unit laundry.", unknown: "if there's in-unit laundry", highlight: "in-unit laundry" });
    case "lease_fit":
      return profile.leaseTypePref === null && profile.moveInBy === null ? null : scoreLeaseFit(l, profile);
    case "space":
      return scoreSpace(l, profile);
  }
}

export function rank(
  profile: UserProfile,
  listings: Listing[],
  enrichments: ListingEnrichment[],
  buildings: UMBuilding[],
): RankResponse {
  const active = listings.filter((l) => l.scam.status === "active");
  const enrichById = new Map(enrichments.map((e) => [e.listingId, e]));
  const ctx = {
    buildingsByCode: new Map(buildings.map((b) => [b.code, b])),
    allMonthly: active.map((l) => monthlyCost(l, profile).monthly),
  };

  // Skipping depends only on the profile (e.g. "pets" with no pet). If every
  // chosen priority is skipped, fall back to the defaults (commute, cost).
  const chosen = effectivePriorities(profile).filter((p) => !isSkipped(p.key, profile));
  const priorities = chosen.length ? chosen : DEFAULT_PROFILE.priorities;
  const hasDealbreakers = priorities.some((p) => p.dealbreaker);

  const scoreOne = (l: Listing) => {
    const e = enrichById.get(l.id);
    const scored = priorities.flatMap((p) => {
      const s = scoreCriterion(p.key, l, e, profile, ctx);
      return s ? [{ p, s }] : [];
    });

    const criteria: CriterionResult[] = scored.map(({ p, s }) => ({
      key: p.key,
      rank: p.rank,
      weight: weightFor(p.rank),
      score: Math.round(s.score * 1000) / 1000,
      status: s.status,
      detail: s.detail,
      dataQuality: s.dataQuality,
    }));
    const sumW = criteria.reduce((a, c) => a + c.weight, 0);
    const score = Math.round((100 * criteria.reduce((a, c) => a + c.weight * c.score, 0)) / sumW);
    const passes = !scored.some(({ p, s }) => p.dealbreaker && s.status === "unmet");
    const short = scored.filter(({ s }) => s.status !== "met" && s.shortfall);
    const shortfalls = short.map(({ s }) => s.shortfall);

    const strongest = scored
      .filter(({ s }) => (s.status === "met" || s.status === "partial") && s.highlight)
      .sort((a, b) => weightFor(b.p.rank) * b.s.score - weightFor(a.p.rank) * a.s.score)[0];
    const biggest = [...short].sort((a, b) => weightFor(b.p.rank) * (1 - b.s.score) - weightFor(a.p.rank) * (1 - a.s.score))[0];
    return { l, score, criteria, shortfalls, passes, strongest, biggest };
  };

  const rows = active.map(scoreOne).sort(
    (a, b) => Number(b.passes) - Number(a.passes) || b.score - a.score || a.l.rentMin - b.l.rentMin || a.l.id.localeCompare(b.l.id),
  );

  const results: ScoredListing[] = rows.map((r, i) => {
    const pos = i + 1;
    const lead = r.strongest ? cap(r.strongest.s.highlight) : `Score ${r.score}`;
    const tail = r.biggest ? `; but ${lowerFirst(r.biggest.s.shortfall.replace(/\.$/, ""))}` : "";
    return {
      listing: r.l,
      score: r.score,
      rank: pos,
      criteria: r.criteria,
      shortfalls: r.shortfalls,
      headline: `#${pos}: ${lead}${tail}${r.passes ? "" : " (misses a dealbreaker)"}.`,
      passesDealbreakers: r.passes,
    };
  });

  const conf = confidence(profile);
  return {
    results,
    confidence: conf.value,
    confidenceHint: conf.hint,
    nearMissesOnly: hasDealbreakers && results.length > 0 && results.every((r) => !r.passesDealbreakers),
    generatedAt: new Date().toISOString(),
  };
}

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
