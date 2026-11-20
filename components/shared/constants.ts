import type { z } from "zod";
import courseBuildingsJson from "@/data/course-buildings.json";
import buildingsJson from "@/data/um-buildings.json";
import {
  Course,
  Priority,
  PriorityKey,
  UMBuilding,
  type Campus,
  type ChatMessage as ChatMessageSchema,
  type CriterionResult,
  type Listing,
  type PlaceCategory,
  type ProfilePatch,
  type ScoredListing,
  type UserProfile,
  type Year,
} from "@/lib/schemas";

export type ChatMessageItem = z.infer<typeof ChatMessageSchema>;

/* Stable fallback arrays for Zustand selectors to prevent infinite re-renders */
export const EMPTY_RESULTS: ScoredListing[] = [];
export const EMPTY_MESSAGES: ChatMessageItem[] = [];
export const EMPTY_COURSES: Course[] = [];
export const EMPTY_PRIORITIES: Priority[] = [];
export const EMPTY_CATEGORIES: PlaceCategory[] = [];

export const BUILDINGS: UMBuilding[] = buildingsJson.map((b) => UMBuilding.parse(b));
export const BUILDINGS_BY_CODE = new Map<string, UMBuilding>(BUILDINGS.map((b) => [b.code, b]));

export const COURSE_BUILDING_GUESSES: Record<string, string> = Object.fromEntries(
  Object.entries(courseBuildingsJson).filter(([k]) => !k.startsWith("_")),
) as Record<string, string>;

export const YEAR_LABELS: Record<Year, { label: string; subtitle: string }> = {
  first_year: { label: "First-year", subtitle: "Planning your first off-campus place" },
  sophomore: { label: "Sophomore", subtitle: "Balancing sophomore lectures and roommates" },
  junior: { label: "Junior", subtitle: "Upper-level labs, seminars, or one-term subleases" },
  senior: { label: "Senior", subtitle: "Capstone schedule and favorite neighborhood spots" },
  grad: { label: "Graduate", subtitle: "Research labs, hospital, or quieter blocks" },
};

export const CAMPUS_LABELS: Record<Campus, string> = {
  north: "North Campus",
  central: "Central Campus",
  both: "North & Central Campus",
};

export const PRIORITY_LABELS: Record<PriorityKey, string> = {
  commute: "Commute",
  cost: "Cost",
  roommates: "Roommates",
  nearby_places: "Nearby places",
  transit_access: "Transit access",
  parking: "Parking",
  furnished: "Furnished",
  pets: "Pets",
  in_unit_laundry: "In-unit laundry",
  lease_fit: "Lease fit",
  space: "Space",
};

export const ALL_PRIORITY_KEYS: PriorityKey[] = PriorityKey.options;

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  grocery: "Grocery stores",
  cafe: "Cafes",
  restaurant: "Restaurants",
  bar: "Bars",
  fast_food: "Fast food",
  gym: "Gyms",
};

export const DATA_QUALITY_LABELS: Record<CriterionResult["dataQuality"], string> = {
  listed: "listed",
  estimated: "estimated",
  synthetic: "synthetic",
  missing: "missing",
};

export const LEASE_TYPE_LABELS: Record<Listing["leaseType"], string> = {
  main: "Full lease",
  sublease: "Sublease",
  unknown: "Lease type not listed",
};

export const PRICE_BASIS_LABELS: Record<Listing["priceBasis"], string> = {
  per_unit: "per unit",
  per_bed: "per bed",
  per_room: "per room",
  unknown: "price basis unknown",
};

export function normalizeCourseCodeClient(raw: string): string {
  const m = raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .trim()
    .match(/^([A-Z]+)\s*(\d{3}[A-Z]?)$/);
  return m ? `${m[1]} ${m[2]}` : raw.toUpperCase().replace(/\s+/g, " ").trim();
}

export function guessBuildingClient(code: string): string | null {
  const subject = normalizeCourseCodeClient(code).split(" ")[0];
  const guessed = COURSE_BUILDING_GUESSES[subject];
  return guessed && BUILDINGS_BY_CODE.has(guessed) ? guessed : null;
}

export function formatListingPrice(listing: Listing): string {
  const min = `$${Math.round(listing.rentMin).toLocaleString("en-US")}`;
  const max = `$${Math.round(listing.rentMax).toLocaleString("en-US")}`;
  return listing.rentMin === listing.rentMax ? `${min}/mo` : `${min}–${max}/mo`;
}

export function formatListingBeds(listing: Listing): string {
  const fmt = (n: number) => (n === 0 ? "Studio" : `${n} ${n === 1 ? "bed" : "beds"}`);
  return listing.bedsMin === listing.bedsMax
    ? fmt(listing.bedsMax)
    : `${listing.bedsMin === 0 ? "Studio" : listing.bedsMin}–${listing.bedsMax} beds`;
}

export function formatNullableRange(min: number | null, max: number | null, unit: string): string {
  if (min === null && max === null) return "Not listed";
  if (min !== null && max !== null) {
    if (min === max) return `${min.toLocaleString("en-US")} ${unit}`;
    return `${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")} ${unit}`;
  }
  const val = min ?? max;
  return val !== null ? `${val.toLocaleString("en-US")} ${unit}` : "Not listed";
}

/* ------------------------------------------------------------------ */
/* Question counter (mirrors lib/chat.ts deterministic question order) */
/* ------------------------------------------------------------------ */

type QuestionField =
  | "campus"
  | "classes"
  | "budgetMax"
  | "roommates"
  | "hasCar"
  | "placeCategories"
  | "priorities"
  | "furnished"
  | "pets"
  | "leaseTypePref"
  | "moveInBy"
  | "frequentPlaces";

const QUESTION_SPECS: { field: QuestionField; missing: (p: UserProfile) => boolean; pattern: RegExp }[] = [
  { field: "campus", missing: (p) => p.majorCampus === null || p.courses.length === 0, pattern: /\bcampus\b/i },
  { field: "classes", missing: (p) => p.courses.length === 0, pattern: /\b(class(es)?|courses?|backpack|schedule)\b/i },
  { field: "budgetMax", missing: (p) => p.budgetMax === null, pattern: /\b(budget|per month|a month|\/mo|rent)\b/i },
  { field: "roommates", missing: (p) => p.roommates === null, pattern: /\broommates?\b/i },
  { field: "hasCar", missing: (p) => p.hasCar === null, pattern: /\bcar\b/i },
  { field: "placeCategories", missing: (p) => p.placeCategories.length === 0, pattern: /\b(kinds of places|places nearby|nearby|within a short walk)\b/i },
  {
    field: "priorities",
    missing: (p) => !p.priorities.some((x) => x.source === "chat" || x.source === "user_reordered"),
    pattern: /\b(matters most|most important|top 3|top three|priorit)/i,
  },
  { field: "furnished", missing: (p) => p.wantsFurnished === null, pattern: /\bfurnish/i },
  { field: "pets", missing: (p) => p.hasPet === null, pattern: /\bpets?\b/i },
  { field: "leaseTypePref", missing: (p) => p.leaseTypePref === null, pattern: /\b(sublease|sublet|full.?year|lease type|full lease)\b/i },
  { field: "moveInBy", missing: (p) => p.moveInBy === null, pattern: /\bmove.?in\b/i },
  { field: "frequentPlaces", missing: (p) => p.frequentPlaces.length === 0, pattern: /\b(go often|regularly|anywhere else)\b/i },
];

export function detectAskedField(text: string): QuestionField | null {
  if (!text.includes("?")) return null;
  return QUESTION_SPECS.find((s) => s.pattern.test(text))?.field ?? null;
}

export function countQuestionsLeft(
  profile: UserProfile,
  messages: ChatMessageItem[],
  hasActiveQuestion: boolean,
): number {
  const asked = new Set<QuestionField>();
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    const f = detectAskedField(m.text);
    if (f) asked.add(f);
  }
  const unaskedMissing = QUESTION_SPECS.filter((s) => s.missing(profile) && !asked.has(s.field)).length;
  return unaskedMissing + (hasActiveQuestion ? 1 : 0);
}

/* ------------------------------------------------------------------ */
/* Client fallback parser ONLY used when /api/chat runs in mock mode    */
/* (where server returns mockChat.reply + empty profilePatch: {})       */
/* ------------------------------------------------------------------ */

export function extractMockFallbackPatch(
  userText: string,
  answeringQuestionText: string | null,
  profile: UserProfile,
): ProfilePatch {
  const t = userText.trim();
  const lower = t.toLowerCase();
  const field = answeringQuestionText ? detectAskedField(answeringQuestionText) : null;
  const patch: ProfilePatch = {};

  if (/^(skip|skip for now|not sure|not sure yet|no,? that'?s it|none of these|don'?t care)$/i.test(t)) {
    return patch;
  }

  // Campus
  if (field === "campus" || /\b(north campus|central campus)\b/i.test(t)) {
    if (/\bboth\b/i.test(t)) patch.majorCampus = "both";
    else if (/\bnorth\b/i.test(t)) patch.majorCampus = "north";
    else if (/\bcentral\b/i.test(t)) patch.majorCampus = "central";
    else if (/^yes\b/i.test(t) && profile.majorCampus) patch.majorCampus = profile.majorCampus;
  }

  // Courses typed in chat (e.g. "EECS 281, MATH 214")
  if (!/\bup\s+to\s+\$?\d/i.test(t) && !/\bunder\s+\$?\d/i.test(t)) {
    const courseMatches = [...t.toUpperCase().matchAll(/\b([A-Z]{2,8})\s*-?\s*(\d{3}[A-Z]?)\b/g)];
    if (
      courseMatches.length > 0 &&
      (field === "classes" || courseMatches.some((m) => m[1] in COURSE_BUILDING_GUESSES))
    ) {
      const merged = new Map(profile.courses.map((c) => [`${c.code}|${c.term}`, c]));
      const term: Course["term"] = /\b(next|winter)\b/i.test(t) ? "next" : "current";
      for (const m of courseMatches) {
        if (!(m[1] in COURSE_BUILDING_GUESSES) && field !== "classes") continue;
        const code = `${m[1]} ${m[2]}`;
        const bldg = guessBuildingClient(code);
        merged.set(
          `${code}|${term}`,
          Course.parse({
            code,
            term,
            buildingCode: bldg,
            source: bldg ? "guess" : "typed",
            confirmed: !bldg,
          }),
        );
      }
      if (merged.size > profile.courses.length) patch.courses = [...merged.values()];
    }
  }

  // Budget
  if (field === "budgetMax" || /\$\s*\d|\bbudget\b|\bunder\s+\$?\d|\bup to\s+\$?\d/i.test(t)) {
    const numMatch = t.replace(/,/g, "").match(/\$?\s*(\d{3,4})/);
    if (numMatch) {
      const val = Number(numMatch[1]);
      if (val >= 300 && val <= 6000) patch.budgetMax = val;
    }
  }

  // Roommates
  if (field === "roommates" || /\broommates?\b|\bjust me\b|\bliving alone\b|\bsolo\b/i.test(t)) {
    if (/\b(just me|solo|alone|0|zero|no roommate)\b/i.test(lower)) patch.roommates = 0;
    else if (/\b3 or more\b/i.test(lower)) patch.roommates = 3;
    else {
      const rm = lower.match(/\b([1-6])\b/);
      if (rm) patch.roommates = Number(rm[1]);
    }
  }

  // Car
  if (field === "hasCar") {
    if (/^(yes|yep|yeah|i have a car|with a car)\b/i.test(lower)) patch.hasCar = true;
    else if (/^(no|nope|no car|without a car)\b/i.test(lower)) patch.hasCar = false;
  }

  // Place categories
  const cats = new Set<PlaceCategory>(profile.placeCategories);
  let addedCat = false;
  if (/\bgrocer/i.test(lower)) { cats.add("grocery"); addedCat = true; }
  if (/\bcafes?\b|\bcoffee\b/i.test(lower)) { cats.add("cafe"); addedCat = true; }
  if (/\brestaurants?\b/i.test(lower)) { cats.add("restaurant"); addedCat = true; }
  if (/\bbars?\b|\bnightlife\b/i.test(lower)) { cats.add("bar"); addedCat = true; }
  if (/\bfast[- ]?food\b/i.test(lower)) { cats.add("fast_food"); addedCat = true; }
  if (/\bgyms?\b|\bfitness\b/i.test(lower) && field === "placeCategories") { cats.add("gym"); addedCat = true; }
  if (addedCat) patch.placeCategories = [...cats];

  // Priorities
  const mentionedPriorities: PriorityKey[] = [];
  const keyPatterns: [PriorityKey, RegExp][] = [
    ["commute", /\bcommute\b|\bclose\b|\bwalk\b/i],
    ["cost", /\bcost\b|\bcheap\b|\bprice\b|\brent\b|\bafford/i],
    ["transit_access", /\bbus\b|\btransit\b/i],
    ["parking", /\bparking\b/i],
    ["in_unit_laundry", /\blaundry\b|\bwasher\b/i],
    ["furnished", /\bfurnish/i],
    ["pets", /\bpets?\b|\bdog\b|\bcat\b/i],
    ["nearby_places", /\bnearby\b|\brestaurants?\b|\bgrocer/i],
    ["roommates", /\broommates?\b|\bgroup\b/i],
    ["lease_fit", /\blease\b|\bsublease\b/i],
    ["space", /\bspace\b|\bsq\s*ft\b|\blarge\b/i],
  ];
  if (field === "priorities" || /\b(must|dealbreaker|matters most|top priority)\b/i.test(lower)) {
    for (const [key, rx] of keyPatterns) {
      if (rx.test(lower)) mentionedPriorities.push(key);
    }
    if (mentionedPriorities.length > 0) {
      const isDealbreaker = /\b(must|need|can't|cannot|dealbreaker|has to)\b/i.test(lower);
      const existingRest = profile.priorities.filter((p) => !mentionedPriorities.includes(p.key));
      const nextList: Priority[] = [
        ...mentionedPriorities.map((key, idx) =>
          Priority.parse({
            key,
            rank: idx + 1,
            dealbreaker: idx === 0 ? isDealbreaker : false,
            source: "chat",
            note: idx === 0 ? t.slice(0, 60) : null,
          }),
        ),
        ...existingRest.map((p, idx) =>
          Priority.parse({
            ...p,
            rank: mentionedPriorities.length + idx + 1,
            source: "chat",
          }),
        ),
      ];
      patch.priorities = nextList;
    }
  }

  // Furnished
  if (field === "furnished") {
    if (/^unfurnished\b/i.test(lower)) patch.wantsFurnished = false;
    else if (/^furnished\b|\byes\b/i.test(lower)) patch.wantsFurnished = true;
  }

  // Pets
  if (field === "pets") {
    if (/^(yes|yep|yeah|i have a pet)\b/i.test(lower)) patch.hasPet = true;
    else if (/^(no|nope)\b/i.test(lower)) patch.hasPet = false;
  }

  // Lease type
  if (field === "leaseTypePref") {
    if (/\bsublease\b|\bsublet\b/i.test(lower)) patch.leaseTypePref = "sublease";
    else if (/\bfull\b|\bmain\b/i.test(lower)) patch.leaseTypePref = "main";
    else if (/\beither\b/i.test(lower)) patch.leaseTypePref = "either";
  }

  // Move-in date
  if (field === "moveInBy") {
    if (/january\s*2027/i.test(lower)) patch.moveInBy = "2027-01-01";
    else if (/may\s*2027/i.test(lower)) patch.moveInBy = "2027-05-01";
    else if (/august\s*2027/i.test(lower)) patch.moveInBy = "2027-08-01";
    else if (/^\d{4}-\d{2}-\d{2}$/.test(t)) patch.moveInBy = t;
  }

  // Frequent places
  if (field === "frequentPlaces" && t.length > 1 && !/^no\b/i.test(lower)) {
    const matchBldg = BUILDINGS.find(
      (b) => lower.includes(b.name.toLowerCase()) || lower.includes(b.code.toLowerCase()),
    );
    patch.frequentPlaces = [
      ...profile.frequentPlaces,
      {
        label: t,
        lat: matchBldg ? matchBldg.lat : null,
        lng: matchBldg ? matchBldg.lng : null,
        timesPerWeek: null,
      },
    ];
  }

  return patch;
}
