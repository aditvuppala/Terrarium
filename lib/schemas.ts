/**
 * Terrarium — shared contract between frontend and backend.
 * Lives at lib/schemas.ts. BOTH sides import from here.
 * Rule: change this file only after telling the other person.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Small shared enums                                                  */
/* ------------------------------------------------------------------ */

export const Campus = z.enum(["north", "central", "both"]);
export type Campus = z.infer<typeof Campus>;

export const Year = z.enum(["first_year", "sophomore", "junior", "senior", "grad"]);
export type Year = z.infer<typeof Year>;

/** For listing facts that are often not stated. Never guess: use "unknown". */
export const TriState = z.enum(["yes", "no", "unknown"]);
export type TriState = z.infer<typeof TriState>;

export const LeaseType = z.enum(["main", "sublease", "unknown"]);
export const PriceBasis = z.enum(["per_unit", "per_bed", "per_room", "unknown"]);

export const PlaceCategory = z.enum(["bar", "restaurant", "cafe", "fast_food", "grocery", "gym"]);
export type PlaceCategory = z.infer<typeof PlaceCategory>;

/* ------------------------------------------------------------------ */
/* Provenance: every listing says where it came from and if it's real   */
/* ------------------------------------------------------------------ */

export const Provenance = z.object({
  sourceName: z.string(),            // "U-M Off-Campus Housing" | "Synthetic (Terrarium team)"
  sourceUrl: z.string().nullable(),  // listing page, null for synthetic
  retrievedAt: z.string(),           // ISO date, e.g. "2026-11-19"
  isSynthetic: z.boolean(),          // UI must show a "Mock listing" badge when true
});
export type Provenance = z.infer<typeof Provenance>;

/* ------------------------------------------------------------------ */
/* Scam assessment (computed at ingestion, never at request time)       */
/* ------------------------------------------------------------------ */

export const ScamAssessment = z.object({
  score: z.number().min(0).max(1),        // 0 = clean, 1 = almost certainly a scam
  level: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()),           // human-readable, shown to judges
  ruleHits: z.array(z.string()),          // ids of deterministic rules that fired
  status: z.enum(["active", "quarantined"]), // quarantined = hidden from map, kept in DB
});
export type ScamAssessment = z.infer<typeof ScamAssessment>;

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

export const Photo = z.object({
  url: z.string(),               // original image URL (hotlinked) or /photos/... for our own
  credit: z.string().nullable(), // e.g. "via U-M Off-Campus Housing"
});

export const Listing = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),

  rentMin: z.number(),           // USD per month, as listed
  rentMax: z.number(),
  priceBasis: PriceBasis,
  rentNegotiable: TriState,

  bedsMin: z.number(),           // 0 = studio
  bedsMax: z.number(),
  bathsMin: z.number().nullable(),
  bathsMax: z.number().nullable(),
  sqftMin: z.number().nullable(),
  sqftMax: z.number().nullable(),

  leaseType: LeaseType,
  leaseStart: z.string().nullable(), // ISO date
  leaseEnd: z.string().nullable(),
  leaseMonths: z.number().nullable(),

  furnished: TriState,
  parking: TriState,
  petsAllowed: TriState,
  inUnitLaundry: TriState,
  utilitiesIncluded: z.array(z.string()), // ["heat","water","internet",...]; [] if not stated

  description: z.string(),
  photos: z.array(Photo),
  provenance: Provenance,
  scam: ScamAssessment,
});
export type Listing = z.infer<typeof Listing>;

/* ------------------------------------------------------------------ */
/* Enrichment: precomputed per listing by scripts/enrich.ts             */
/* ------------------------------------------------------------------ */

export const NearbyStop = z.object({
  stopId: z.string(),
  stopName: z.string(),
  agency: z.enum(["TheRide", "UM"]),
  lat: z.number(),
  lng: z.number(),
  walkMeters: z.number(),
  walkMin: z.number(),
  routes: z.array(z.object({
    routeId: z.string(),
    routeName: z.string(),
    headsigns: z.array(z.string()), // "where it runs to"
  })),
});

export const NearbyPlace = z.object({
  name: z.string(),
  category: PlaceCategory,
  lat: z.number(),
  lng: z.number(),
  walkMeters: z.number(),
  walkMin: z.number(),
});

export const BuildingTime = z.object({
  buildingCode: z.string(),
  walkMin: z.number(),
  busMin: z.number().nullable(), // null if no sensible bus option
  method: z.enum(["osrm", "estimate"]), // "estimate" = straight line x 1.3
});

/** An active City of Ann Arbor construction project near a listing (scripts/construction.ts). */
export const NearbyConstruction = z.object({
  projectId: z.string(),                 // "a2:<OBJECTID>"
  name: z.string(),                      // "S Main St - New Sidewalk Construction"
  projectType: z.string(),               // city's category: "Sidewalk Construction", "Utility Work", ...
  note: z.string().nullable(),           // city's own description, e.g. "Project to be completed in spring of 2027"
  url: z.string().nullable(),            // city project page
  distanceMeters: z.number(),            // straight line to the project area; 0 = listing is inside it
});
export type NearbyConstruction = z.infer<typeof NearbyConstruction>;

export const ListingEnrichment = z.object({
  listingId: z.string(),
  stops: z.array(NearbyStop),            // nearest ~5 within 800 m
  places: z.array(NearbyPlace),          // all categories within 1 km; UI filters
  buildingTimes: z.array(BuildingTime),  // to every building in data/um-buildings.json
  construction: z.array(NearbyConstruction), // active city projects within 250 m, nearest first
});
export type ListingEnrichment = z.infer<typeof ListingEnrichment>;

export const UMBuilding = z.object({
  code: z.string(),   // e.g. "BBB"
  name: z.string(),
  campus: z.enum(["north", "central", "medical", "south", "other"]),
  lat: z.number(),
  lng: z.number(),
});
export type UMBuilding = z.infer<typeof UMBuilding>;

/* ------------------------------------------------------------------ */
/* User profile & priorities                                           */
/* ------------------------------------------------------------------ */

/** Fixed list so ranking stays deterministic. Free text goes in `note`. */
export const PriorityKey = z.enum([
  "commute",          // time to class buildings / frequent places
  "cost",             // monthly total vs budget
  "roommates",        // matches desired household size
  "nearby_places",    // user-chosen PlaceCategory list
  "transit_access",   // nearby bus stops/routes (matters most with no car)
  "parking",
  "furnished",
  "pets",
  "in_unit_laundry",
  "lease_fit",        // lease type + move-in / end dates
  "space",            // beds/baths/sqft
  "construction",     // active city road/sidewalk/utility projects near the listing
]);
export type PriorityKey = z.infer<typeof PriorityKey>;

export const Priority = z.object({
  key: PriorityKey,
  rank: z.number().int().min(1),     // 1 = most important; unique within a profile
  dealbreaker: z.boolean(),          // true = hard filter (see ranking rules)
  source: z.enum(["default", "onboarding", "chat", "user_reordered"]),
  note: z.string().nullable(),       // user's own words, shown in UI
});
export type Priority = z.infer<typeof Priority>;

export const Course = z.object({
  code: z.string(),                  // "EECS 281"
  term: z.enum(["current", "next"]),
  buildingCode: z.string().nullable(),
  source: z.enum(["backpack_screenshot", "typed", "guess"]),
  confirmed: z.boolean(),            // guesses start false; UI asks user to confirm
});
export type Course = z.infer<typeof Course>;

export const FrequentPlace = z.object({
  label: z.string(),                 // "job in Kerrytown", "IM Building gym"
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  timesPerWeek: z.number().nullable(),
});

export const UserProfile = z.object({
  year: Year.nullable(),
  major: z.string().nullable(),
  majorCampus: Campus.nullable(),
  courses: z.array(Course),
  frequentPlaces: z.array(FrequentPlace),

  budgetMax: z.number().nullable(),        // USD/month for the user's share
  roommates: z.number().int().nullable(),  // number of OTHER people
  hasCar: z.boolean().nullable(),
  placeCategories: z.array(PlaceCategory), // asked in chat, never assumed
  wantsFurnished: z.boolean().nullable(),
  hasPet: z.boolean().nullable(),
  leaseTypePref: z.enum(["main", "sublease", "either"]).nullable(),
  moveInBy: z.string().nullable(),         // ISO date

  priorities: z.array(Priority),
});
export type UserProfile = z.infer<typeof UserProfile>;

/** Zero information => closeness + cheapness (the "default constructor"). */
export const DEFAULT_PROFILE: UserProfile = {
  year: null, major: null, majorCampus: null, courses: [], frequentPlaces: [],
  budgetMax: null, roommates: null, hasCar: null, placeCategories: [],
  wantsFurnished: null, hasPet: null, leaseTypePref: null, moveInBy: null,
  priorities: [
    { key: "commute", rank: 1, dealbreaker: false, source: "default", note: null },
    { key: "cost", rank: 2, dealbreaker: false, source: "default", note: null },
  ],
};

/** What Gemini returns from /api/chat. Every field optional; `priorities`, if present, REPLACES the list. */
export const ProfilePatch = UserProfile.partial();
export type ProfilePatch = z.infer<typeof ProfilePatch>;

/* ------------------------------------------------------------------ */
/* Ranking output                                                       */
/* ------------------------------------------------------------------ */

export const CriterionResult = z.object({
  key: PriorityKey,
  rank: z.number(),
  weight: z.number(),                                   // 2^-(rank-1), see rank rules
  score: z.number().min(0).max(1),
  status: z.enum(["met", "partial", "unmet", "unknown"]),
  detail: z.string(),                                   // "$140 over budget", "No in-unit laundry listed"
  dataQuality: z.enum(["listed", "estimated", "synthetic", "missing"]),
});
export type CriterionResult = z.infer<typeof CriterionResult>;

export const ScoredListing = z.object({
  listing: Listing,
  score: z.number().min(0).max(100),
  rank: z.number().int(),
  criteria: z.array(CriterionResult),   // ordered by priority rank
  shortfalls: z.array(z.string()),      // plain sentences for every partial/unmet/unknown criterion
  headline: z.string(),                 // one line: why it ranks here
  passesDealbreakers: z.boolean(),
});
export type ScoredListing = z.infer<typeof ScoredListing>;

/* ------------------------------------------------------------------ */
/* API contract                                                         */
/* ------------------------------------------------------------------ */

// POST /api/rank
export const RankRequest = z.object({ profile: UserProfile });
export const RankResponse = z.object({
  results: z.array(ScoredListing),      // active listings only, sorted by rank
  confidence: z.number().min(0).max(100),
  confidenceHint: z.string(),
  nearMissesOnly: z.boolean(),          // true if no listing passed all dealbreakers
  generatedAt: z.string(),
});
export type RankResponse = z.infer<typeof RankResponse>;

// GET /api/listings/[id]
export const ListingDetailResponse = z.object({
  listing: Listing,
  enrichment: ListingEnrichment,
});

// POST /api/chat
export const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});
export const ChatRequest = z.object({
  profile: UserProfile,
  messages: z.array(ChatMessage),       // full history, newest last
});
export const ChatResponse = z.object({
  reply: z.string(),
  profilePatch: ProfilePatch,           // {} if nothing changed
  nextQuestion: z.object({
    text: z.string(),
    quickReplies: z.array(z.string()),  // chips; user can still type
  }).nullable(),
});
export type ChatResponse = z.infer<typeof ChatResponse>;

// POST /api/backpack  (multipart/form-data, field "image")
export const BackpackResponse = z.object({
  courses: z.array(Course),             // source "backpack_screenshot", confirmed false
  warnings: z.array(z.string()),        // "Couldn't read building for STATS 250"
});

/* ------------------------------------------------------------------ */
/* Lease review  (POST /api/lease; rules live in lib/lease/rules.ts)    */
/* ------------------------------------------------------------------ */

export const LeaseRule = z.object({
  id: z.string(),
  jurisdiction: z.enum(["michigan", "ann_arbor"]),
  title: z.string(),
  citation: z.string(),                 // "MCL 554.633(1)(e)"
  sourceUrl: z.string().url(),          // official text
  explanation: z.string(),              // plain English, paraphrased from the source
  askLandlord: z.string(),
  appliesNote: z.string().nullable(),   // scope caveat, e.g. "Ann Arbor city limits only"
});
export type LeaseRule = z.infer<typeof LeaseRule>;

export const LeaseFinding = z.object({
  id: z.string(),
  rule: LeaseRule,
  method: z.enum(["model", "deterministic"]),
  quote: z.string().nullable(),         // verbatim slice of `text`; null for "not found" checks
  start: z.number().int().min(0).nullable(), // offsets into LeaseReviewResponse.text
  end: z.number().int().min(0).nullable(),
  detail: z.string().nullable(),        // deterministic specifics, e.g. "$2,700 deposit is 2× the $1,350 rent"
});
export type LeaseFinding = z.infer<typeof LeaseFinding>;

export const LeaseFacts = z.object({
  monthlyRent: z.number().nullable(),
  securityDeposit: z.number().nullable(),
  applicationFee: z.number().nullable(),
});
export type LeaseFacts = z.infer<typeof LeaseFacts>;

// POST /api/lease: multipart/form-data field "file" (PDF/PNG/JPEG, <= 10 MB), or JSON LeaseSampleRequest
export const LeaseSampleRequest = z.object({ sample: z.literal(true) });
export const LeaseReviewResponse = z.object({
  source: z.enum(["upload", "sample"]),
  demo: z.boolean(),                    // true when mocks were used
  text: z.string(),                     // extracted lease text (never stored)
  findings: z.array(LeaseFinding),      // ordered by position in text; "not found" checks last
  facts: LeaseFacts,
  warnings: z.array(z.string()),
});
export type LeaseReviewResponse = z.infer<typeof LeaseReviewResponse>;
