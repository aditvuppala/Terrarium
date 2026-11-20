/**
 * Terrarium shared contract.
 *
 * PROVISIONAL DRAFT: written during skeleton setup because the original
 * lib/schemas.ts was not in the repo. Review it, then freeze it.
 * After that, change it only when frontend and backend owners both agree.
 *
 * Conventions:
 * - Unknown facts are `null` (numbers/booleans) or "unknown" (enums), never guessed.
 * - Coordinates are WGS84 decimal degrees.
 * - Money is whole USD per month.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLngSchema>;

export const CampusSchema = z.enum(["central", "north", "south", "medical"]);
export type Campus = z.infer<typeof CampusSchema>;

export const ScamStatusSchema = z.enum(["clear", "flagged", "quarantined", "unknown"]);
export type ScamStatus = z.infer<typeof ScamStatusSchema>;

export const TriStateSchema = z.enum(["yes", "no", "unknown"]);
export type TriState = z.infer<typeof TriStateSchema>;

export const LaundrySchema = z.enum(["in_unit", "on_site", "none", "unknown"]);
export type Laundry = z.infer<typeof LaundrySchema>;

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

export const ListingSourceSchema = z.object({
  /** e.g. "U-M Off-Campus Housing" or "synthetic" */
  name: z.string(),
  url: z.url().nullable(),
  /** ISO date (YYYY-MM-DD) the data was retrieved */
  retrievedAt: z.string().nullable(),
});
export type ListingSource = z.infer<typeof ListingSourceSchema>;

export const ScamCheckSchema = z.object({
  status: ScamStatusSchema,
  reasons: z.array(z.string()),
});
export type ScamCheck = z.infer<typeof ScamCheckSchema>;

export const ListingSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  address: z.string(),
  location: LatLngSchema,
  /** Monthly rent range in USD; null when unknown */
  priceMin: z.number().int().nonnegative().nullable(),
  priceMax: z.number().int().nonnegative().nullable(),
  /** Bedroom range; 0 = studio; null when unknown */
  bedsMin: z.number().int().nonnegative().nullable(),
  bedsMax: z.number().int().nonnegative().nullable(),
  bathsMin: z.number().nonnegative().nullable(),
  laundry: LaundrySchema,
  parking: TriStateSchema,
  petsAllowed: TriStateSchema,
  furnished: TriStateSchema,
  /** true = generated demo data, false = real listing */
  isSynthetic: z.boolean(),
  active: z.boolean(),
  source: ListingSourceSchema,
  scam: ScamCheckSchema,
});
export type Listing = z.infer<typeof ListingSchema>;

export const UMBuildingSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  campus: CampusSchema,
  location: LatLngSchema,
});
export type UMBuilding = z.infer<typeof UMBuildingSchema>;

export const BuildingCommuteSchema = z.object({
  buildingId: z.string(),
  walkMinutes: z.number().nonnegative().nullable(),
  busMinutes: z.number().nonnegative().nullable(),
});
export type BuildingCommute = z.infer<typeof BuildingCommuteSchema>;

export const ListingEnrichmentSchema = z.object({
  listingId: z.string(),
  commutes: z.array(BuildingCommuteSchema),
  /** Walking minutes to nearest full-service grocery store */
  groceryWalkMinutes: z.number().nonnegative().nullable(),
  /** 0 (quiet) – 1 (loud) */
  noiseScore: z.number().min(0).max(1).nullable(),
  /** Short neutral summary for the side card / chat */
  summary: z.string().nullable(),
  generatedAt: z.string(),
});
export type ListingEnrichment = z.infer<typeof ListingEnrichmentSchema>;

/* ------------------------------------------------------------------ */
/* User profile                                                        */
/* ------------------------------------------------------------------ */

export const YearSchema = z.enum(["freshman", "sophomore", "junior", "senior", "grad"]);
export type Year = z.infer<typeof YearSchema>;

export const CriterionKeySchema = z.enum(["commute", "cost", "space", "amenities", "quiet", "grocery"]);
export type CriterionKey = z.infer<typeof CriterionKeySchema>;

/** Relative importance per criterion, 0–1. Missing keys mean "don't care". */
export const PriorityWeightsSchema = z.partialRecord(CriterionKeySchema, z.number().min(0).max(1));
export type PriorityWeights = z.infer<typeof PriorityWeightsSchema>;

export const UserProfileSchema = z.object({
  year: YearSchema.nullable(),
  major: z.string().nullable(),
  /** Max monthly rent the student will pay (their share), USD */
  budgetMax: z.number().int().positive().nullable(),
  bedroomsWanted: z.number().int().nonnegative().nullable(),
  /** UMBuilding ids the student visits often (from onboarding or backpack) */
  frequentBuildingIds: z.array(z.string()),
  priorities: PriorityWeightsSchema,
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const DEFAULT_PROFILE: UserProfile = {
  year: null,
  major: null,
  budgetMax: null,
  bedroomsWanted: null,
  frequentBuildingIds: [],
  priorities: { commute: 0.5, cost: 0.5 },
};

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

export const CriterionScoreSchema = z.object({
  key: CriterionKeySchema,
  label: z.string(),
  /** Normalized 0–1, higher is better for the student */
  score: z.number().min(0).max(1),
  /** Weight actually used, 0–1 */
  weight: z.number().min(0).max(1),
  explanation: z.string(),
});
export type CriterionScore = z.infer<typeof CriterionScoreSchema>;

export const RankedListingSchema = z.object({
  listing: ListingSchema,
  /** Overall 0–100 */
  score: z.number().min(0).max(100),
  criteria: z.array(CriterionScoreSchema),
});
export type RankedListing = z.infer<typeof RankedListingSchema>;

export const ConfidenceSchema = z.object({
  /** 0–100: how well we know the student's priorities */
  value: z.number().min(0).max(100),
  /** What to ask next to raise confidence */
  hint: z.string(),
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const RankRequestSchema = z.object({
  profile: UserProfileSchema,
});
export type RankRequest = z.infer<typeof RankRequestSchema>;

export const RankResponseSchema = z.object({
  /** Sorted best-first */
  results: z.array(RankedListingSchema),
  confidence: ConfidenceSchema,
  generatedAt: z.string(),
});
export type RankResponse = z.infer<typeof RankResponseSchema>;

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export const ChatRoleSchema = z.enum(["user", "assistant"]);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  profile: UserProfileSchema,
  /** Listing the user is looking at, if any */
  selectedListingId: z.string().nullable(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  message: ChatMessageSchema.extend({ role: z.literal("assistant") }),
  /** Fields the assistant inferred from the conversation; merge into profile */
  profilePatch: UserProfileSchema.partial().nullable(),
  /** Quick-reply chips */
  suggestions: z.array(z.string()),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

/* ------------------------------------------------------------------ */
/* Backpack (schedule screenshot -> courses)                           */
/* ------------------------------------------------------------------ */

export const WeekdaySchema = z.enum(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const CourseSchema = z.object({
  /** e.g. "EECS 281" */
  code: z.string(),
  title: z.string().nullable(),
  days: z.array(WeekdaySchema),
  /** Matched UMBuilding id, or null if unrecognized */
  buildingId: z.string().nullable(),
});
export type Course = z.infer<typeof CourseSchema>;

export const BackpackResponseSchema = z.object({
  courses: z.array(CourseSchema),
  warnings: z.array(z.string()),
});
export type BackpackResponse = z.infer<typeof BackpackResponseSchema>;

/* ------------------------------------------------------------------ */
/* Listing detail                                                      */
/* ------------------------------------------------------------------ */

export const ListingDetailResponseSchema = z.object({
  listing: ListingSchema,
  enrichment: ListingEnrichmentSchema.nullable(),
});
export type ListingDetailResponse = z.infer<typeof ListingDetailResponseSchema>;

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
