/**
 * Ranking tests against the committed dataset (data/processed + data/um-buildings.json),
 * so they exercise exactly what the app serves.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { confidence } from "@/lib/confidence";
import { rank } from "@/lib/rank";
import { DEFAULT_PROFILE, Listing, ListingEnrichment, RankResponse, UMBuilding, type UserProfile } from "@/lib/schemas";

const load = <T extends z.ZodType>(rel: string, schema: T): z.infer<T> =>
  schema.parse(JSON.parse(readFileSync(path.join(__dirname, "..", rel), "utf8")));

const listings = load("data/processed/listings.json", z.array(Listing));
const enrichment = load("data/processed/enrichment.json", z.array(ListingEnrichment));
const buildings = load("data/um-buildings.json", z.array(UMBuilding));
const run = (p: UserProfile) => RankResponse.parse(rank(p, listings, enrichment, buildings));
const ids = (r: ReturnType<typeof run>, n = Infinity) => r.results.slice(0, n).map((x) => x.listing.id);

/** North Campus CS sophomore: no car, $1,200 budget, 1 roommate. */
const csNorth: UserProfile = {
  ...DEFAULT_PROFILE,
  year: "sophomore",
  major: "Computer Science (Engineering)",
  majorCampus: "north",
  courses: [
    { code: "EECS 281", term: "current", buildingCode: "BBB", source: "typed", confirmed: true },
    { code: "EECS 370", term: "current", buildingCode: "DOW", source: "typed", confirmed: true },
    { code: "MATH 214", term: "current", buildingCode: "EH", source: "guess", confirmed: false },
  ],
  budgetMax: 1200,
  roommates: 1,
  hasCar: false,
  priorities: [
    { key: "commute", rank: 1, dealbreaker: false, source: "chat", note: null },
    { key: "cost", rank: 2, dealbreaker: false, source: "chat", note: null },
    { key: "transit_access", rank: 3, dealbreaker: false, source: "chat", note: null },
  ],
};

/** Central Campus Econ junior: car, $1,800 budget, solo, wants bars + restaurants. */
const econCentral: UserProfile = {
  ...DEFAULT_PROFILE,
  year: "junior",
  major: "Economics",
  majorCampus: "central",
  courses: [
    { code: "ECON 401", term: "current", buildingCode: "LORCH", source: "typed", confirmed: true },
    { code: "STATS 250", term: "current", buildingCode: "WH", source: "typed", confirmed: true },
  ],
  budgetMax: 1800,
  roommates: 0,
  hasCar: true,
  placeCategories: ["bar", "restaurant"],
  priorities: [
    { key: "nearby_places", rank: 1, dealbreaker: false, source: "chat", note: "wants to be near bars and restaurants" },
    { key: "commute", rank: 2, dealbreaker: false, source: "chat", note: null },
    { key: "parking", rank: 3, dealbreaker: false, source: "chat", note: null },
    { key: "cost", rank: 4, dealbreaker: false, source: "chat", note: null },
  ],
};

describe("rank", () => {
  it("returns only active listings, each with a valid score and rank", () => {
    const r = run(csNorth);
    const active = listings.filter((l) => l.scam.status === "active");
    expect(r.results).toHaveLength(active.length);
    expect(r.results.some((x) => x.listing.scam.status === "quarantined")).toBe(false);
    r.results.forEach((x, i) => expect(x.rank).toBe(i + 1));
  });

  it("is deterministic", () => {
    expect(ids(run(csNorth))).toEqual(ids(run(csNorth)));
  });

  it("gives the two student profiles different top 3s", () => {
    const a = ids(run(csNorth), 3);
    const b = ids(run(econCentral), 3);
    expect(a).not.toEqual(b);
    expect(a.filter((id) => b.includes(id)).length).toBeLessThan(3);
  });

  it("changes the CS profile's ranking when cost moves from #2 to #1", () => {
    const before = ids(run(csNorth));
    const costFirst: UserProfile = {
      ...csNorth,
      priorities: [
        { key: "cost", rank: 1, dealbreaker: false, source: "user_reordered", note: null },
        { key: "commute", rank: 2, dealbreaker: false, source: "user_reordered", note: null },
        { key: "transit_access", rank: 3, dealbreaker: false, source: "user_reordered", note: null },
      ],
    };
    expect(ids(run(costFirst))).not.toEqual(before);
  });

  it("uses weights 2^-(rank-1) and orders criteria by priority", () => {
    const top = run(econCentral).results[0];
    expect(top.criteria.map((c) => c.key)).toEqual(["nearby_places", "commute", "parking", "cost"]);
    expect(top.criteria.map((c) => c.weight)).toEqual([1, 0.5, 0.25, 0.125]);
  });

  it("writes a shortfall for every partial/unmet/unknown criterion", () => {
    for (const r of run(csNorth).results) {
      const notMet = r.criteria.filter((c) => c.status !== "met").length;
      expect(r.shortfalls.length).toBe(notMet);
    }
  });

  it("puts listings that pass dealbreakers first, and flags near-misses", () => {
    const strict: UserProfile = {
      ...csNorth,
      priorities: csNorth.priorities.map((p) => (p.key === "cost" ? { ...p, dealbreaker: true } : p)),
    };
    const r = run(strict);
    const firstFail = r.results.findIndex((x) => !x.passesDealbreakers);
    if (firstFail >= 0) expect(r.results.slice(firstFail).every((x) => !x.passesDealbreakers)).toBe(true);

    const impossible: UserProfile = { ...strict, budgetMax: 100 };
    const r2 = run(impossible);
    expect(r2.nearMissesOnly).toBe(true);
    expect(r2.results.length).toBeGreaterThan(0);
  });

  it("marks synthetic listing facts as synthetic and unknown facts as missing", () => {
    const p: UserProfile = { ...csNorth, priorities: [{ key: "in_unit_laundry", rank: 1, dealbreaker: false, source: "chat", note: null }] };
    for (const r of run(p).results) {
      const c = r.criteria[0];
      if (r.listing.inUnitLaundry === "unknown") {
        expect(c.status).toBe("unknown");
        expect(c.score).toBe(0.5);
        expect(c.dataQuality).toBe("missing");
        expect(r.shortfalls[0]).toMatch(/doesn't say/);
      } else {
        expect(c.dataQuality).toBe(r.listing.provenance.isSynthetic ? "synthetic" : "listed");
      }
    }
  });

  it("scores construction by distance to the nearest active city project", () => {
    const p: UserProfile = { ...csNorth, priorities: [{ key: "construction", rank: 1, dealbreaker: true, source: "chat", note: null }] };
    const r = run(p);
    const byId = new Map(enrichment.map((e) => [e.listingId, e]));
    let sawUnmet = false;
    for (const x of r.results) {
      const c = x.criteria[0];
      const nearest = byId.get(x.listing.id)?.construction[0]?.distanceMeters ?? Infinity;
      expect(c.dataQuality).toBe("estimated");
      if (nearest <= 60) {
        sawUnmet = true;
        expect(c.status).toBe("unmet");
        expect(x.passesDealbreakers).toBe(false);
        expect(x.shortfalls[0]).toMatch(/on this block/);
      } else if (nearest <= 200) {
        expect(c.status).toBe("partial");
        expect(c.score).toBe(0.5);
      } else {
        expect(c.status).toBe("met");
        expect(x.shortfalls).toEqual([]);
      }
    }
    expect(sawUnmet).toBe(true);
    // dealbreaker: every listing with construction on its block sorts after the rest
    const firstFail = r.results.findIndex((x) => !x.passesDealbreakers);
    expect(r.results.slice(firstFail).every((x) => !x.passesDealbreakers)).toBe(true);
  });

  it("falls back to commute + cost for the default profile", () => {
    const r = run(DEFAULT_PROFILE);
    expect(r.results[0].criteria.map((c) => c.key)).toEqual(["commute", "cost"]);
  });
});

describe("confidence", () => {
  it("starts at 10 and asks for classes first", () => {
    const c = confidence(DEFAULT_PROFILE);
    expect(c.value).toBe(10);
    expect(c.hint).toMatch(/classes/);
  });
  it("adds up the documented points", () => {
    expect(confidence(csNorth).value).toBe(10 + 15 + 5 + 20 + 15 + 10 + 5 + 10);
    expect(confidence(econCentral).value).toBe(10 + 15 + 5 + 20 + 15 + 10 + 5 + 5 + 10);
  });
});
