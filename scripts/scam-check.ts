/**
 * Step 5: scam assessment. Deterministic rules first, then Gemini.
 *
 *   R1 rent < 60% of the median rent for the same bedroom count (per-unit equivalent)
 *   R2 payment red flags: wire, Western Union, gift card, crypto, Zelle/Venmo deposit
 *   R3 "abroad / out of the country / missionary / military deployment", "can't show", "keys mailed"
 *   R4 description or photo URL duplicated on a listing at a different address
 *   R5 pressure / off-platform: "deposit today", "first come first served", "text me at" + urgency
 *   R6 address doesn't geocode to Ann Arbor
 *
 * ruleScore = min(1, 0.35 × hits). Gemini sees the listing, the hits, and the comparable
 * median and returns {score, reasons}. final = max(ruleScore, geminiScore).
 * level: <0.4 low, <0.7 medium, ≥0.7 high. High → status "quarantined" (kept, hidden from map).
 * Nothing is ever deleted. Gemini results are cached in data/cache/scam.json.
 *
 * In:  data/processed/geocoded.json    Out: data/processed/listings.json
 */
import path from "node:path";
import { z } from "zod";
import { generateJson, getGeminiConfig } from "@/lib/gemini";
import { Listing, type ScamAssessment } from "@/lib/schemas";
import { GeocodedListing } from "./lib/types";
import { PROCESSED, median, readCache, readJsonValidated, sha, writeCache, writeJson } from "./lib/util";

/** Per-unit equivalent so per-bed listings aren't mistaken for below-market ones. */
const unitRent = (l: GeocodedListing) =>
  l.priceBasis === "per_bed" || l.priceBasis === "per_room" ? l.rentMin * Math.max(1, l.bedsMax) : l.rentMin;

const normText = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normAddr = (s: string) => normText(s.split(",")[0]);
const isPlaceholderPhoto = (url: string) => url.startsWith("/photos/placeholder-");

const RE = {
  payment: /\b(wire transfer|wire the|by wire|western union|moneygram|gift ?cards?|bitcoin|crypto(currency)?)\b/i,
  p2pDeposit: /\b(zelle|venmo|cash ?app)\b/i,
  deposit: /\bdeposit\b/i,
  absent: /\b(abroad|out of (the )?country|overseas|missionary|military|deploy(ed|ment))\b/i,
  cantShow: /\b(can'?t|cannot|unable to) (show|tour)\b|\bkeys?\b[^.]{0,30}\bmail(ed)?\b|\bmail(ed)?\b[^.]{0,20}\bkeys?\b/i,
  urgentPhrase: /\b(deposit today|first come,? first serve[d]?)\b/i,
  textMe: /\btext me at\b/i,
  urgency: /\b(today|asap|right away|hurry|lots of interest|won'?t last|before someone else)\b/i,
};

interface RuleOutcome {
  hits: string[];
  reasons: string[];
}

function runRules(l: GeocodedListing, all: GeocodedListing[], medians: Map<number, number | null>): RuleOutcome {
  const hits: string[] = [];
  const reasons: string[] = [];
  const d = l.description;

  const med = medians.get(l.bedsMin) ?? null;
  if (med !== null && unitRent(l) < 0.6 * med) {
    hits.push("R1");
    reasons.push(`Rent ($${unitRent(l)}/mo) is under 60% of the typical $${Math.round(med)}/mo for a ${l.bedsMin === 0 ? "studio" : `${l.bedsMin}-bedroom`} here.`);
  }
  if (RE.payment.test(d) || (RE.p2pDeposit.test(d) && RE.deposit.test(d))) {
    hits.push("R2");
    reasons.push("Asks for payment by wire, Western Union, gift card, crypto, or a Zelle/Venmo deposit, which can't be reversed.");
  }
  if (RE.absent.test(d) || RE.cantShow.test(d)) {
    hits.push("R3");
    reasons.push("Owner says they are away and can't show the unit, or offers to mail the keys.");
  }
  const myAddr = normAddr(l.address);
  const myText = normText(d);
  const dupText = myText.length >= 40 && all.some((o) => o.id !== l.id && normAddr(o.address) !== myAddr && normText(o.description) === myText);
  const myPhotos = l.photos.map((p) => p.url).filter((u) => !isPlaceholderPhoto(u));
  const dupPhoto = myPhotos.some((u) => all.some((o) => o.id !== l.id && normAddr(o.address) !== myAddr && o.photos.some((p) => p.url === u)));
  if (dupText || dupPhoto) {
    hits.push("R4");
    reasons.push(`The same ${dupText ? "description" : "photo"} appears on a listing at a different address.`);
  }
  if (RE.urgentPhrase.test(d) || (RE.textMe.test(d) && RE.urgency.test(d))) {
    hits.push("R5");
    reasons.push("Pressures you to pay quickly or move the conversation off the platform.");
  }
  if (!l.geocode.ok || !l.geocode.inAnnArbor) {
    hits.push("R6");
    reasons.push(l.geocode.ok ? "Address is not in Ann Arbor." : "Address could not be found; the map pin is approximate.");
  }
  return { hits, reasons };
}

const GeminiScam = z.object({
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()).max(5),
});
type GeminiScam = z.infer<typeof GeminiScam>;

const SYSTEM = `You assess rental listings in Ann Arbor, Michigan for signs of rental scams, to protect University of Michigan students.
You get one listing (JSON), the ids of deterministic red-flag rules that already fired, and the median rent for comparable listings.
Return JSON {score, reasons}: score 0 (clearly legitimate) to 1 (almost certainly a scam); reasons are 0-3 short, plain sentences a student can understand.
Base your judgment ONLY on the listing content provided. Do not invent facts. Missing details alone are not evidence of a scam.`;

const level = (s: number): ScamAssessment["level"] => (s < 0.4 ? "low" : s < 0.7 ? "medium" : "high");

async function main() {
  const listings = readJsonValidated(path.join(PROCESSED, "geocoded.json"), z.array(GeocodedListing));
  const cfg = getGeminiConfig();
  if (!cfg) console.warn("  GEMINI_API_KEY/GEMINI_MODEL not set: using deterministic rules only.");
  const cache = readCache<Record<string, GeminiScam>>("scam.json", {});

  const medians = new Map<number, number | null>();
  for (const beds of new Set(listings.map((l) => l.bedsMin))) {
    const group = listings.filter((l) => l.bedsMin === beds).map(unitRent);
    medians.set(beds, group.length >= 3 ? median(group) : null);
  }

  const out: z.infer<typeof Listing>[] = [];
  for (const l of listings) {
    const { hits, reasons } = runRules(l, listings, medians);
    const ruleScore = Math.min(1, 0.35 * hits.length);

    let gem: GeminiScam | null = null;
    if (cfg) {
      const { geocode: _g, photos: _p, ...core } = l;
      const payload = { listing: core, ruleHits: hits, comparableMedianRent: medians.get(l.bedsMin) ?? null };
      const key = sha(`${cfg.model}\n${JSON.stringify(payload)}`);
      gem = cache[key] ?? null;
      if (!gem) {
        gem = await generateJson({ system: SYSTEM, parts: [{ text: JSON.stringify(payload) }], schema: GeminiScam, temperature: 0, label: `scam:${l.id}` });
        if (gem) {
          cache[key] = gem;
          writeCache("scam.json", cache);
        }
      }
    }

    const score = Math.round(Math.max(ruleScore, gem?.score ?? 0) * 100) / 100;
    const allReasons = [...reasons, ...(gem?.reasons ?? [])].filter((r, i, a) => a.indexOf(r) === i);
    const lvl = level(score);
    const { geocode: _geo, ...rest } = l;
    out.push(
      Listing.parse({
        ...rest,
        scam: { score, level: lvl, reasons: allReasons, ruleHits: hits, status: lvl === "high" ? "quarantined" : "active" },
      }),
    );
  }

  writeJson(path.join(PROCESSED, "listings.json"), out);
  const q = out.filter((l) => l.scam.status === "quarantined");
  const med = out.filter((l) => l.scam.level === "medium");
  console.log(`  ${out.length} listings: ${q.length} quarantined, ${med.length} medium, ${out.length - q.length - med.length} low`);
  for (const l of [...q, ...med]) console.log(`    ${l.scam.level.padEnd(6)} ${l.id} [${l.scam.ruleHits.join(",")}] score ${l.scam.score}`);
}

main();
