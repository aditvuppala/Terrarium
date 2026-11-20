import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { landlordQuestions } from "@/lib/landlordQuestions";
import { Listing, ListingEnrichment, type UserProfile } from "@/lib/schemas";

const load = <T extends z.ZodType>(rel: string, schema: T): z.infer<T> =>
  schema.parse(JSON.parse(readFileSync(path.join(__dirname, "..", rel), "utf8")));
const listings = load("data/processed/listings.json", z.array(Listing));
const enrichment = load("data/processed/enrichment.json", z.array(ListingEnrichment));
const byId = new Map(enrichment.map((e) => [e.listingId, e]));
const profile: Pick<UserProfile, "hasCar" | "hasPet" | "wantsFurnished" | "roommates"> = {
  hasCar: null,
  hasPet: null,
  wantsFurnished: null,
  roommates: null,
};

describe("landlordQuestions", () => {
  it("always ends with the deposit question and never repeats an id", () => {
    for (const l of listings) {
      const qs = landlordQuestions(l, byId.get(l.id), profile);
      expect(qs.at(-1)?.id).toBe("deposit");
      expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length);
    }
  });

  it("asks about exactly the facts the listing leaves unknown", () => {
    const base = listings[0];
    const known: Listing = {
      ...base,
      priceBasis: "per_unit",
      utilitiesIncluded: ["water"],
      parking: "yes",
      inUnitLaundry: "yes",
      leaseType: "main",
      leaseStart: "2027-08-25",
      leaseEnd: "2028-08-20",
      sqftMin: 800,
      sqftMax: 800,
      bathsMin: 1,
      bathsMax: 1,
    };
    const none = { ...byId.get(base.id)!, construction: [] };
    expect(landlordQuestions(known, none, profile).map((q) => q.id)).toEqual(["deposit"]);
    const unknownLaundry = landlordQuestions({ ...known, inUnitLaundry: "unknown" }, none, profile).map((q) => q.id);
    expect(unknownLaundry).toEqual(["laundry", "deposit"]);
  });

  it("only asks about pets/parking/furniture when they matter to the student", () => {
    const l: Listing = { ...listings[0], petsAllowed: "unknown", parking: "unknown", furnished: "unknown" };
    const ids = (p: typeof profile) => landlordQuestions(l, null, p).map((q) => q.id);
    expect(ids({ ...profile, hasPet: false, hasCar: false })).not.toContain("pets");
    expect(ids({ ...profile, hasPet: false, hasCar: false })).not.toContain("parking");
    expect(ids({ ...profile, hasPet: true })).toContain("pets");
    expect(ids(profile)).not.toContain("furnished");
    expect(ids({ ...profile, wantsFurnished: true })).toContain("furnished");
  });

  it("mentions nearby city construction", () => {
    const withC = enrichment.find((e) => e.construction.some((c) => c.distanceMeters <= 200))!;
    const l = listings.find((x) => x.id === withC.listingId)!;
    const c = landlordQuestions(l, withC, profile).find((q) => q.id === "construction");
    expect(c?.question).toMatch(/nearby/);
  });
});
