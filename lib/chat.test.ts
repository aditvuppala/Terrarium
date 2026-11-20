import { describe, expect, it } from "vitest";
import { answeringField, nextField, normalizeCourseCode, questionFor, sanitizePatch } from "@/lib/chat";
import { DEFAULT_PROFILE, type UMBuilding, type UserProfile } from "@/lib/schemas";

const P: UserProfile = { ...DEFAULT_PROFILE, major: "Economics", majorCampus: "central" };
const ask = (text: string) => ({ role: "assistant" as const, text });
const say = (text: string) => ({ role: "user" as const, text });
const B: UMBuilding[] = [
  { code: "BBB", name: "Bob and Betty Beyster Building", campus: "north", lat: 42.29, lng: -83.71 },
  { code: "LORCH", name: "Lorch Hall", campus: "central", lat: 42.27, lng: -83.73 },
];

describe("chat question flow", () => {
  it("asks campus confirmation first, then classes", () => {
    expect(nextField(P, [])).toBe("campus");
    const campusQ = questionFor("campus", P)!.text;
    expect(campusQ).toMatch(/Central Campus/);
    const msgs = [ask(campusQ), say("yes")];
    expect(answeringField(msgs)).toBe("campus");
    expect(nextField(P, msgs)).toBe("classes");
  });

  it("never re-asks a field the user skipped", () => {
    const msgs = [ask(questionFor("campus", P)!.text), say("yes"), ask(questionFor("classes", P)!.text), say("skip")];
    expect(nextField(P, msgs)).toBe("budgetMax");
  });

  it("ignores statements that merely mention a topic", () => {
    expect(nextField(P, [ask("Nice, Central Campus has lots of bars.")])).toBe("campus");
  });

  it("returns null when everything is known or asked", () => {
    const full: UserProfile = {
      ...P,
      courses: [{ code: "ECON 401", term: "current", buildingCode: "LORCH", source: "typed", confirmed: true }],
      frequentPlaces: [{ label: "job", lat: null, lng: null, timesPerWeek: 2 }],
      budgetMax: 1500, roommates: 1, hasCar: false, placeCategories: ["cafe"], wantsFurnished: false, hasPet: false,
      leaseTypePref: "main", moveInBy: "2027-08-01",
      priorities: [{ key: "cost", rank: 1, dealbreaker: false, source: "chat", note: null }],
    };
    expect(nextField(full, [])).toBeNull();
  });
});

describe("sanitizePatch", () => {
  it("drops nulls, merges courses, fixes building codes and priority ranks", () => {
    const profile: UserProfile = { ...P, courses: [{ code: "ECON 401", term: "current", buildingCode: "LORCH", source: "typed", confirmed: true }] };
    const patch = sanitizePatch(
      {
        budgetMax: null,
        courses: [
          { code: "eecs281", term: "current", buildingCode: null, source: "typed", confirmed: true },
          { code: "PHIL 101", term: "current", buildingCode: "NOPE", source: "typed", confirmed: true },
        ],
        priorities: [
          { key: "cost", rank: 3, dealbreaker: true, source: "default", note: "must be cheap" },
          { key: "commute", rank: 1, dealbreaker: false, source: "chat", note: null },
          { key: "cost", rank: 5, dealbreaker: false, source: "chat", note: null },
        ],
      },
      profile,
      B,
    );
    expect("budgetMax" in patch).toBe(false);
    expect(patch.courses!.map((c) => c.code)).toEqual(["ECON 401", "EECS 281", "PHIL 101"]);
    const eecs = patch.courses!.find((c) => c.code === "EECS 281")!;
    expect(eecs.buildingCode).toBe("BBB"); // guessed from data/course-buildings.json
    expect(eecs.confirmed).toBe(false);
    expect(patch.courses!.find((c) => c.code === "PHIL 101")!.buildingCode).toBeNull(); // unknown code dropped, no guess in B
    expect(patch.priorities!.map((p) => [p.key, p.rank, p.source, p.dealbreaker])).toEqual([
      ["commute", 1, "chat", false],
      ["cost", 2, "chat", true],
    ]);
  });

  it("normalizes course codes", () => {
    expect(normalizeCourseCode("eecs-281")).toBe("EECS 281");
    expect(normalizeCourseCode("STATS250")).toBe("STATS 250");
  });
});
