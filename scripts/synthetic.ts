/**
 * Step 3: synthetic listings to reach 50 total.
 *
 * Deterministic (seeded PRNG) so every rebuild yields the same data.
 * Every listing: provenance.isSynthetic = true, sourceName "Synthetic (Terrarium team)",
 * placeholder photos only. Addresses are real Ann Arbor streets with plausible
 * house numbers; the listings themselves are invented.
 *
 * Mix: ~6 legitimate subleases and exactly 5 deliberate scams (below-market
 * price, "abroad, keys mailed", wire/Zelle/gift-card deposits, a reused
 * description, urgency) so the scam filter has something to catch.
 *
 * In:  data/processed/real.json (to size the set and match price distribution)
 * Out: data/processed/synthetic.json
 */
import path from "node:path";
import { z } from "zod";
import { DraftListing } from "./lib/types";
import { PROCESSED, readJsonValidated, writeJson } from "./lib/util";

const TARGET_TOTAL = 50;
const SOURCE = "Synthetic (Terrarium team)";
const RETRIEVED = "2026-11-20";

type Hood = "Central" | "North" | "Kerrytown" | "Burns Park" | "Lower Town" | "Packard" | "Farther out";

/** Real streets, plausible numbers. Geocoded in step 4 (failures are fixed by editing this list). */
const ADDRESSES: [Hood, string][] = [
  ["Central", "721 Church St"],
  ["Central", "917 S Forest Ave"],
  ["Central", "1103 S University Ave"],
  ["Central", "830 Hill St"],
  ["Central", "520 Thompson St"],
  ["Central", "913 Oakland Ave"],
  ["Central", "615 Packard St"],
  ["Central", "336 E William St"],
  ["Central", "1015 E Huron St"],
  ["Central", "711 Monroe St"],
  ["North", "2120 Plymouth Rd"],
  ["North", "1717 Broadway St"],
  ["North", "2335 Hubbard St"],
  ["North", "1800 Lake Lila Ln"],
  ["North", "2600 Plymouth Rd"],
  ["North", "1500 Murfin Ave"],
  ["North", "2100 Fuller Ct"],
  ["Kerrytown", "418 N Fifth Ave"],
  ["Kerrytown", "520 Detroit St"],
  ["Kerrytown", "615 N Division St"],
  ["Kerrytown", "412 Catherine St"],
  ["Kerrytown", "507 E Kingsley St"],
  ["Burns Park", "1220 Wells St"],
  ["Burns Park", "1508 Granger Ave"],
  ["Burns Park", "1405 Cambridge Rd"],
  ["Burns Park", "1100 Olivia Ave"],
  ["Burns Park", "905 Lincoln Ave"],
  ["Lower Town", "1000 Wall St"],
  ["Lower Town", "1104 Broadway St"],
  ["Lower Town", "1300 Broadway St"],
  ["Lower Town", "1220 Maiden Ln"],
  ["Lower Town", "1010 Pontiac Trl"],
  ["Packard", "1300 Packard St"],
  ["Packard", "1100 Brooklyn Ave"],
  ["Packard", "1012 Woodlawn Ave"],
  ["Packard", "1400 Packard St"],
  ["Packard", "1520 Packard St"],
  ["Farther out", "3200 Washtenaw Ave"],
  ["Farther out", "2200 S Main St"],
  ["Farther out", "3000 Packard St"],
  ["Farther out", "1450 Pauline Blvd"],
  ["Farther out", "3000 Stone School Rd"],
  ["Farther out", "2800 S State St"],
  ["Farther out", "1000 Barton Dr"],
  ["Farther out", "3500 Platt Rd"],
  ["Farther out", "2700 Packard St"],
  ["Farther out", "1600 Dhu Varren Rd"],
];

/** Index into ADDRESSES -> role. Everything else is a regular listing. */
const SUBLEASES = new Set([1, 11, 19, 24, 33, 38]);
const SCAMS: Record<number, ScamKind> = { 3: "abroad_wire", 20: "zelle_urgent", 25: "missionary_a", 14: "missionary_b", 35: "deployment" };
type ScamKind = "abroad_wire" | "zelle_urgent" | "missionary_a" | "missionary_b" | "deployment";

/* ---------------- seeded PRNG ---------------- */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261120);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const round25 = (x: number) => Math.round(x / 25) * 25;
const tri = (pYes: number, pNo: number) => {
  const r = rand();
  return r < pYes ? "yes" : r < pYes + pNo ? "no" : "unknown";
};

/* ---------------- pricing ---------------- */
// Per-unit monthly rent by bedroom count, anchored on the real listings (studio–2 bed, $1,100–$2,200).
const BASE: Record<number, [number, number]> = {
  0: [1000, 1300],
  1: [1150, 1650],
  2: [1550, 2250],
  3: [2150, 3000],
  4: [2700, 3800],
  5: [3200, 4500],
};
const HOOD_FACTOR: Record<Hood, number> = {
  Central: 1.1,
  North: 0.95,
  Kerrytown: 1.05,
  "Burns Park": 1.0,
  "Lower Town": 0.97,
  Packard: 0.95,
  "Farther out": 0.82,
};
const BEDS_BY_HOOD: Record<Hood, number[]> = {
  Central: [0, 1, 1, 2, 2, 3, 4],
  North: [1, 1, 2, 2, 3],
  Kerrytown: [0, 1, 1, 2],
  "Burns Park": [2, 3, 3, 4, 5],
  "Lower Town": [1, 2, 2, 3],
  Packard: [1, 2, 3, 3, 4],
  "Farther out": [1, 1, 2, 2, 3],
};

const PLACEHOLDER_PHOTOS = [1, 2, 3, 4, 5, 6].map((i) => `/photos/placeholder-${i}.svg`);
const placeholderPhotos = () =>
  [pick(PLACEHOLDER_PHOTOS), pick(PLACEHOLDER_PHOTOS)]
    .filter((u, i, a) => a.indexOf(u) === i)
    .map((url) => ({ url, credit: "Placeholder image (not the actual unit)" }));

const bedLabel = (b: number) => (b === 0 ? "Studio" : `${b}BR`);
const KIND_BY_BEDS = (b: number) => (b >= 3 ? pick(["House", "Duplex", "Townhouse"]) : pick(["Apartment", "Flat", "Apartment"]));
const UTILS = ["heat", "water", "trash", "internet", "sewer"];

function describe(hood: Hood, beds: number, f: { furnished: string; parking: string; pets: string; laundry: string; utils: string[] }, sub: boolean): string {
  const where: Record<Hood, string> = {
    Central: "a short walk to the Diag and State Street",
    North: "near North Campus and the Bursley-Baits bus line",
    Kerrytown: "steps from the Kerrytown market and shops",
    "Burns Park": "on a quiet tree-lined street in Burns Park",
    "Lower Town": "in Lower Town, close to the Broadway bridge",
    Packard: "along the Packard corridor with quick bus access to campus",
    "Farther out": "in a quieter area with more space for the money",
  };
  const bits = [
    `${sub ? "Sublease available: " : ""}${bedLabel(beds)} ${beds >= 3 ? "home" : "unit"} ${where[hood]}.`,
    f.furnished === "yes" ? "Comes furnished." : f.furnished === "no" ? "Unfurnished." : "",
    f.laundry === "yes" ? "Washer and dryer in unit." : f.laundry === "no" ? "Shared laundry in the building." : "",
    f.parking === "yes" ? "One off-street parking spot included." : f.parking === "no" ? "No parking; street permit only." : "",
    f.pets === "yes" ? "Cats and small dogs OK with deposit." : f.pets === "no" ? "No pets." : "",
    f.utils.length ? `Rent includes ${f.utils.join(", ")}.` : "Tenant pays utilities.",
    sub ? "Tour available by appointment through the leasing office." : "Showings available weekdays; apply online through the management company.",
  ];
  return bits.filter(Boolean).join(" ");
}

/* ---------------- scam copy ---------------- */
const MISSIONARY_TEXT =
  "Beautiful home, fully furnished, all utilities included. Our family is away on a missionary trip overseas so we can't show the house, but once your deposit is received we will have the keys mailed to you. Deposit must be paid with gift cards (Target or Amazon) to save on bank fees.";

const SCAM_COPY: Record<ScamKind, { beds: number; rent: number; text: string; photos?: string[] }> = {
  abroad_wire: {
    beds: 2,
    rent: 700,
    text: "Spacious 2BR right by campus, utilities included. I am currently abroad for work so I cannot show the apartment in person, but I will mail you the keys once the deposit is received by wire transfer. Serious students only.",
    photos: ["/photos/stock-reused.svg"],
  },
  zelle_urgent: {
    beds: 1,
    rent: 550,
    text: "Cute 1BR in Kerrytown, all utilities included!! First come first served, lots of interest. Text me at (734) 555-0142 and send the deposit today via Zelle to hold it before someone else does.",
  },
  missionary_a: { beds: 3, rent: 950, text: MISSIONARY_TEXT },
  missionary_b: { beds: 3, rent: 900, text: MISSIONARY_TEXT },
  deployment: {
    beds: 1,
    rent: 1200,
    text: "Quiet 1BR on Packard. I'm on military deployment right now and can't show the unit. Deposit today via Western Union and I'll send the lease and keys. Text me at (734) 555-0199, first come first served.",
    photos: ["/photos/stock-reused.svg"],
  },
};

async function main() {
  const real = readJsonValidated(path.join(PROCESSED, "real.json"), z.array(DraftListing));
  const count = Math.max(0, TARGET_TOTAL - real.length);
  if (count > ADDRESSES.length) throw new Error(`Need ${count} synthetic addresses, only ${ADDRESSES.length} defined`);

  const out: DraftListing[] = [];
  for (let i = 0; i < count; i++) {
    const [hood, street] = ADDRESSES[i];
    const id = `syn-${String(i + 1).padStart(2, "0")}`;
    const address = `${street}, Ann Arbor, MI`;
    const scam = SCAMS[i];
    const sub = SUBLEASES.has(i);

    let beds = pick(BEDS_BY_HOOD[hood]);
    const perBed = !scam && !sub && hood === "Central" && beds >= 3 && rand() < 0.6;

    const furnished = sub ? (rand() < 0.8 ? "yes" : "no") : tri(0.2, 0.6);
    const parking = hood === "Central" || hood === "Kerrytown" ? tri(0.25, 0.6) : tri(0.7, 0.2);
    const pets = tri(0.35, 0.45);
    const laundry = tri(0.5, 0.4);
    const utils = UTILS.filter(() => rand() < 0.3);

    let rentMin: number;
    let rentMax: number;
    let description: string;
    let photos = placeholderPhotos();

    if (scam) {
      const s = SCAM_COPY[scam];
      beds = s.beds;
      rentMin = rentMax = s.rent;
      description = s.text;
      if (s.photos) photos = s.photos.map((url) => ({ url, credit: "Placeholder image (not the actual unit)" }));
    } else {
      const [lo, hi] = BASE[beds];
      const base = between(lo, hi) * HOOD_FACTOR[hood] * (sub ? 0.9 : 1);
      if (perBed) {
        rentMin = round25(base / beds);
        rentMax = round25((base / beds) * 1.08);
      } else {
        rentMin = round25(base);
        rentMax = rand() < 0.5 ? rentMin : round25(base * between(1.03, 1.12));
      }
      description = describe(hood, beds, { furnished, parking, pets, laundry, utils }, sub);
    }

    const sqft = beds === 0 ? Math.round(between(380, 520)) : Math.round(between(420, 520) * beds + between(0, 250));
    const subWinter = sub && rand() < 0.5;

    out.push(
      DraftListing.parse({
        id,
        name: `${street.replace(/^\d+\s+/, "")} ${bedLabel(beds)} ${scam ? "Apartment" : KIND_BY_BEDS(beds)}`,
        address,
        lat: null,
        lng: null,
        rentMin,
        rentMax,
        priceBasis: perBed ? "per_bed" : "per_unit",
        rentNegotiable: scam ? "yes" : tri(0.1, 0.5),
        bedsMin: beds,
        bedsMax: beds,
        bathsMin: beds >= 3 ? 2 : 1,
        bathsMax: beds >= 4 ? 2.5 : beds >= 3 ? 2 : 1,
        sqftMin: rand() < 0.75 ? sqft : null,
        sqftMax: null,
        leaseType: sub ? "sublease" : "main",
        leaseStart: sub ? (subWinter ? "2027-01-01" : "2027-05-01") : rand() < 0.7 ? "2027-08-25" : "2027-09-01",
        leaseEnd: sub ? (subWinter ? "2027-04-30" : "2027-08-15") : "2028-08-15",
        leaseMonths: sub ? (subWinter ? 4 : 3.5) : 12,
        furnished: scam ? "yes" : furnished,
        parking,
        petsAllowed: pets,
        inUnitLaundry: laundry,
        utilitiesIncluded: scam ? ["heat", "water", "electric", "internet"] : utils,
        description,
        photos,
        provenance: { sourceName: SOURCE, sourceUrl: null, retrievedAt: RETRIEVED, isSynthetic: true },
      }),
    );
    // keep sqftMax consistent with sqftMin
    const last = out[out.length - 1];
    last.sqftMax = last.sqftMin;
  }

  writeJson(path.join(PROCESSED, "synthetic.json"), out);
  console.log(`  ${out.length} synthetic listings (${[...SUBLEASES].filter((i) => i < count).length} subleases, ${Object.keys(SCAMS).filter((i) => +i < count).length} deliberate scams)`);
}

main();
