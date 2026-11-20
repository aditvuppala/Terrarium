/**
 * Chat logic for /api/chat. The server decides WHAT to ask next (deterministic);
 * Gemini only extracts what the user said and phrases the reply.
 *
 * Question order: campus confirmation -> classes -> budgetMax -> roommates -> hasCar
 *   -> placeCategories -> priorities (top 3 + dealbreakers) -> furnished -> pets
 *   -> leaseTypePref -> moveInBy -> frequentPlaces.
 * A field is asked when it's still missing AND hasn't been asked yet in this
 * conversation (so declining a question never causes a loop).
 */
import { z } from "zod";
import courseBuildingsJson from "@/data/course-buildings.json";
import { generateJson } from "@/lib/gemini";
import {
  ChatRequest,
  ChatResponse,
  Course,
  PlaceCategory,
  Priority,
  ProfilePatch,
  type UMBuilding,
  type UserProfile,
} from "@/lib/schemas";

export type ChatRequestT = z.infer<typeof ChatRequest>;
export type ChatResponseT = z.infer<typeof ChatResponse>;
type Msg = ChatRequestT["messages"][number];
type NextQuestion = NonNullable<ChatResponseT["nextQuestion"]>;

export const FIELDS = [
  "campus",
  "classes",
  "budgetMax",
  "roommates",
  "hasCar",
  "placeCategories",
  "priorities",
  "furnished",
  "pets",
  "leaseTypePref",
  "moveInBy",
  "frequentPlaces",
] as const;
export type Field = (typeof FIELDS)[number];

const campusName = (c: UserProfile["majorCampus"]) => (c === "north" ? "North Campus" : c === "central" ? "Central Campus" : "both North and Central Campus");

interface FieldSpec {
  missing: (p: UserProfile) => boolean;
  /** Recognizes an assistant message that asked this question (Gemini phrasing varies). */
  askedPattern: RegExp;
  question: (p: UserProfile) => NextQuestion;
  /** What to tell Gemini to look for in the user's answer. */
  extractHint: string;
}

const SPECS: Record<Field, FieldSpec> = {
  campus: {
    missing: (p) => p.majorCampus === null || p.courses.length === 0,
    askedPattern: /\bcampus\b/i,
    question: (p) =>
      p.majorCampus
        ? {
            text: `Since you're studying ${p.major ?? "your major"}, most of your classes are probably on ${campusName(p.majorCampus)}. Is that right?`,
            quickReplies: ["Yes, that's right", "Mostly Central Campus", "Mostly North Campus", "Both"],
          }
        : { text: "Which campus are most of your classes on?", quickReplies: ["North Campus", "Central Campus", "Both"] },
    extractHint: 'majorCampus ("north" | "central" | "both")',
  },
  classes: {
    missing: (p) => p.courses.length === 0,
    askedPattern: /\b(class(es)?|courses?|backpack|schedule)\b/i,
    question: () => ({
      text: "What classes are you taking? You can upload a screenshot of your Backpack schedule, or type course codes like EECS 281.",
      quickReplies: ["Upload Backpack screenshot", "I'll type them", "Skip for now"],
    }),
    extractHint: "courses (code like \"EECS 281\", term current|next, buildingCode if the user names a building)",
  },
  budgetMax: {
    missing: (p) => p.budgetMax === null,
    askedPattern: /\b(budget|per month|a month|\/mo|rent)\b/i,
    question: () => ({ text: "What's the most you want to pay per month for your share of rent?", quickReplies: ["Under $900", "Up to $1,200", "Up to $1,600", "Up to $2,000"] }),
    extractHint: "budgetMax (USD per month for the user's share; use the upper bound of a range)",
  },
  roommates: {
    missing: (p) => p.roommates === null,
    askedPattern: /\broommates?\b/i,
    question: () => ({ text: "How many roommates will you live with?", quickReplies: ["Just me", "1 roommate", "2 roommates", "3 or more"] }),
    extractHint: "roommates (number of OTHER people; living alone = 0)",
  },
  hasCar: {
    missing: (p) => p.hasCar === null,
    askedPattern: /\bcar\b/i,
    question: () => ({ text: "Will you have a car in Ann Arbor?", quickReplies: ["Yes", "No"] }),
    extractHint: "hasCar (boolean)",
  },
  placeCategories: {
    missing: (p) => p.placeCategories.length === 0,
    askedPattern: /\b(kinds of places|places nearby|nearby|within a short walk)\b/i,
    question: () => ({
      text: "Which kinds of places do you want within a short walk?",
      quickReplies: ["Grocery stores", "Cafes", "Restaurants and bars", "Gyms", "None of these"],
    }),
    extractHint: `placeCategories (only from: ${PlaceCategory.options.join(", ")}; only what the user names)`,
  },
  priorities: {
    missing: (p) => !p.priorities.some((x) => x.source === "chat" || x.source === "user_reordered"),
    askedPattern: /\b(matters most|most important|top 3|top three|priorit)/i,
    question: () => ({
      text: "What matters most to you? Name your top 3, and tell me if any of them is a must-have.",
      quickReplies: ["Short commute", "Low cost", "Near bus routes", "Parking", "In-unit laundry"],
    }),
    extractHint: "priorities (ranked list; dealbreaker true for must/can't; note = user's own words)",
  },
  furnished: {
    missing: (p) => p.wantsFurnished === null,
    askedPattern: /\bfurnish/i,
    question: () => ({ text: "Do you want the place to come furnished?", quickReplies: ["Furnished", "Unfurnished", "Don't care"] }),
    extractHint: "wantsFurnished (boolean; leave out if they don't care)",
  },
  pets: {
    missing: (p) => p.hasPet === null,
    askedPattern: /\bpets?\b/i,
    question: () => ({ text: "Will you have a pet?", quickReplies: ["Yes", "No"] }),
    extractHint: "hasPet (boolean)",
  },
  leaseTypePref: {
    missing: (p) => p.leaseTypePref === null,
    askedPattern: /\b(sublease|sublet|full.?year|lease type|full lease)\b/i,
    question: () => ({ text: "Are you looking for a full-year lease or a sublease?", quickReplies: ["Full lease", "Sublease", "Either"] }),
    extractHint: 'leaseTypePref ("main" for a full lease, "sublease", or "either")',
  },
  moveInBy: {
    missing: (p) => p.moveInBy === null,
    askedPattern: /\bmove.?in\b/i,
    question: () => ({ text: "When do you need to move in by?", quickReplies: ["January 2027", "May 2027", "August 2027", "Not sure yet"] }),
    extractHint: "moveInBy (ISO date YYYY-MM-DD; a month means its 1st day)",
  },
  frequentPlaces: {
    missing: (p) => p.frequentPlaces.length === 0,
    askedPattern: /\b(go often|regularly|anywhere else)\b/i,
    question: () => ({ text: "Anywhere else you go often, like a job or a gym? Tell me where.", quickReplies: ["No, that's it", "I have a job", "I go to a gym"] }),
    extractHint: "frequentPlaces (label in the user's words; lat/lng null unless given; timesPerWeek if stated)",
  },
};

/**
 * Which field an assistant message asked about. Only messages containing a "?" count,
 * and each maps to ONE field: the first match in question order (so "most of your
 * classes are on North Campus, right?" is the campus question, not the classes one).
 */
function fieldAsked(text: string): Field | null {
  if (!text.includes("?")) return null;
  return FIELDS.find((f) => SPECS[f].askedPattern.test(text)) ?? null;
}

export function wasAsked(field: Field, messages: Msg[]): boolean {
  return messages.some((m) => m.role === "assistant" && fieldAsked(m.text) === field);
}

/** The field the user's latest message is most likely answering (the last one asked). */
export function answeringField(messages: Msg[]): Field | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "assistant") continue;
    const f = fieldAsked(messages[i].text);
    if (f) return f;
  }
  return null;
}

export function nextField(profile: UserProfile, messages: Msg[]): Field | null {
  return FIELDS.find((f) => SPECS[f].missing(profile) && !wasAsked(f, messages)) ?? null;
}

export function questionFor(field: Field | null, profile: UserProfile): NextQuestion | null {
  return field ? SPECS[field].question(profile) : null;
}

/* ------------------------------------------------------------------ */
/* Patch cleanup                                                       */
/* ------------------------------------------------------------------ */

const COURSE_BUILDINGS: Record<string, string> = Object.fromEntries(
  Object.entries(courseBuildingsJson).filter(([k]) => !k.startsWith("_")),
) as Record<string, string>;

/** "eecs281" / "EECS-281" -> "EECS 281" */
export function normalizeCourseCode(code: string): string {
  const m = code.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").trim().match(/^([A-Z]+)\s*(\d{3}[A-Z]?)$/);
  return m ? `${m[1]} ${m[2]}` : code.toUpperCase().replace(/\s+/g, " ").trim();
}

/** Most likely building for a course subject; null if we have no guess. */
export function guessBuilding(code: string, known: Set<string>): string | null {
  const subject = normalizeCourseCode(code).split(" ")[0];
  const b = COURSE_BUILDINGS[subject];
  return b && known.has(b) ? b : null;
}

/**
 * Make Gemini's patch safe to apply with "replace" semantics:
 * - drop nulls / empty arrays (Gemini must only SET what the user said),
 * - list fields (courses, frequentPlaces, placeCategories) are MERGED into the existing profile,
 * - priorities get unique ranks 1..n and source "chat",
 * - building codes must exist.
 */
export function sanitizePatch(raw: z.infer<typeof ProfilePatch>, profile: UserProfile, buildings: UMBuilding[]): z.infer<typeof ProfilePatch> {
  const known = new Set(buildings.map((b) => b.code));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  const patch = out as z.infer<typeof ProfilePatch>;

  if (patch.courses) {
    const merged = new Map(profile.courses.map((c) => [`${c.code}|${c.term}`, c]));
    for (const c of patch.courses) {
      const code = normalizeCourseCode(c.code);
      let buildingCode = c.buildingCode && known.has(c.buildingCode) ? c.buildingCode : null;
      let source = c.source;
      let confirmed = c.source === "guess" ? false : c.confirmed;
      if (!buildingCode) {
        buildingCode = guessBuilding(code, known);
        if (buildingCode) confirmed = false; // building is our guess; ask the user to confirm
        if (source !== "typed") source = "guess";
      }
      merged.set(`${code}|${c.term}`, Course.parse({ ...c, code, buildingCode, source, confirmed }));
    }
    patch.courses = [...merged.values()];
  }
  if (patch.frequentPlaces) {
    const labels = new Set(patch.frequentPlaces.map((f) => f.label.toLowerCase()));
    patch.frequentPlaces = [...profile.frequentPlaces.filter((f) => !labels.has(f.label.toLowerCase())), ...patch.frequentPlaces];
  }
  if (patch.placeCategories) {
    patch.placeCategories = [...new Set([...profile.placeCategories, ...patch.placeCategories])];
  }
  if (patch.priorities) {
    const seen = new Set<string>();
    patch.priorities = [...patch.priorities]
      .sort((a, b) => a.rank - b.rank)
      .filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)))
      .map((p, i) => Priority.parse({ ...p, rank: i + 1, source: "chat", note: p.note ?? null }));
  }
  return ProfilePatch.parse(patch);
}

export function applyPatch(profile: UserProfile, patch: z.infer<typeof ProfilePatch>): UserProfile {
  return { ...profile, ...patch } as UserProfile;
}

/* ------------------------------------------------------------------ */
/* Gemini                                                              */
/* ------------------------------------------------------------------ */

export const GeminiChatOutput = z.object({
  reply: z.string().min(1),
  profilePatch: ProfilePatch,
  nextQuestion: z.object({ text: z.string().min(1), quickReplies: z.array(z.string()).min(2).max(5) }).nullable(),
});

export function systemPrompt(args: {
  profile: UserProfile;
  answering: Field | null;
  next: Field | null;
  nextTemplate: NextQuestion | null;
  buildings: UMBuilding[];
}): string {
  const { profile, answering, next, nextTemplate, buildings } = args;
  const guessesAllowed = profile.year !== null && profile.major !== null && profile.courses.length === 0;
  return `You are Terrarium's housing assistant for University of Michigan students choosing housing in Ann Arbor.

YOUR JOB EACH TURN
1. Extract ONLY what the user actually said into "profilePatch" (fields of the UserProfile schema). Leave out every field the user didn't mention. Never fill a field from assumptions.
2. Write "reply": 1-3 short, friendly sentences acknowledging what they told you. No lists.
3. Write "nextQuestion": ask about the field the server chose (below), in your own words, with 2-5 short "quickReplies" chips.${next ? "" : ' The server has nothing left to ask, so set "nextQuestion" to null.'}

RULES
- Never infer or record demographics or sensitive traits (race, religion, gender, health, disability, citizenship, etc.).
- If the user says what matters most, set "priorities" as a ranked list (rank 1 = most important) using only these keys: commute, cost, roommates, nearby_places, transit_access, parking, furnished, pets, in_unit_laundry, lease_fit, space, construction. Put their own words in "note". "Must", "need", "can't", "has to" -> "dealbreaker": true. Use "source": "chat".
- placeCategories must come from the user; never assume which places they like.
- Courses the user types: "source": "typed", "confirmed": true; set "buildingCode" only if they name a building (codes below).${guessesAllowed ? `
- The user's year and major are known and they have no courses yet. You MAY propose likely classes/buildings for a ${profile.year} ${profile.major} student as "source": "guess", "confirmed": false, and ask them to confirm.` : ""}
- Never invent facts about specific listings, prices, or availability.
- Dates as YYYY-MM-DD.

CONTEXT
Current profile (JSON): ${JSON.stringify(profile)}
The user's latest message is probably answering: ${answering ? SPECS[answering].extractHint : "nothing specific"}.
Server-chosen next question field: ${next ? `${next}. Suggested wording: "${nextTemplate?.text}"; chips like ${JSON.stringify(nextTemplate?.quickReplies)}` : "none"}.
U-M building codes: ${buildings.map((b) => `${b.code}=${b.name}`).join("; ")}.`;
}

export async function geminiChat(req: ChatRequestT, buildings: UMBuilding[]): Promise<z.infer<typeof GeminiChatOutput> | null> {
  const answering = answeringField(req.messages);
  const next = nextField(req.profile, req.messages);
  const history = req.messages.slice(0, -1).map((m) => ({ role: m.role === "assistant" ? ("model" as const) : ("user" as const), text: m.text }));
  const last = req.messages[req.messages.length - 1];
  return generateJson({
    system: systemPrompt({ profile: req.profile, answering, next, nextTemplate: questionFor(next, req.profile), buildings }),
    history,
    parts: [{ text: last?.role === "user" ? last.text : "(The user hasn't said anything yet. Greet them briefly.)" }],
    schema: GeminiChatOutput,
    temperature: 0.3,
    label: "chat",
  });
}
