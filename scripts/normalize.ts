/**
 * Step 2: normalize hand-entered real listings.
 *
 * Gemini reads ONLY the listing's description and fills fields the hand entry
 * left unknown: rentNegotiable, leaseType, leaseStart/End, furnished,
 * utilitiesIncluded, parking, petsAllowed, inUnitLaundry. Anything the text
 * doesn't state stays "unknown"/null. Fields already filled by hand always win.
 * Results are cached by (model, description) in data/cache/normalize.json.
 *
 * In:  data/raw/um.json      Out: data/processed/real.json
 */
import path from "node:path";
import { z } from "zod";
import { generateJson, getGeminiConfig } from "@/lib/gemini";
import { LeaseType, TriState } from "@/lib/schemas";
import { DraftListing } from "./lib/types";
import { PROCESSED, RAW, readCache, readJsonValidated, sha, writeCache, writeJson } from "./lib/util";

const Extracted = z.object({
  rentNegotiable: TriState,
  leaseType: LeaseType,
  leaseStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  leaseEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  furnished: TriState,
  utilitiesIncluded: z.array(z.enum(["heat", "water", "electric", "gas", "internet", "trash", "sewer", "cable"])),
  parking: TriState,
  petsAllowed: TriState,
  inUnitLaundry: TriState,
});
type Extracted = z.infer<typeof Extracted>;

const SYSTEM = `You extract structured facts from an apartment listing description for University of Michigan students.
Rules:
- Use ONLY what the description text explicitly says. Do not use outside knowledge about the building, landlord, or area.
- If the text does not clearly state a fact, use "unknown" (or null for dates, [] for utilities). Never guess.
- leaseType: "sublease" only if it says sublease/sublet/takeover; "main" only if it describes a standard lease from the landlord.
- Dates as YYYY-MM-DD. If only a month is given (e.g. "August 2027"), use the 1st of that month.
- inUnitLaundry "yes" only for washer/dryer inside the unit; shared/coin laundry is "no".`;

async function main() {
  const raw = readJsonValidated(path.join(RAW, "um.json"), z.array(DraftListing));
  const cfg = getGeminiConfig();
  const cache = readCache<Record<string, Extracted>>("normalize.json", {});
  if (!cfg) console.warn("  GEMINI_API_KEY/GEMINI_MODEL not set: skipping Gemini extraction; unknown fields stay unknown.");

  const out: DraftListing[] = [];
  for (const l of raw) {
    let ex: Extracted | null = null;
    if (l.description.trim() && cfg) {
      const key = sha(`${cfg.model}\n${l.description}`);
      ex = cache[key] ?? null;
      if (!ex) {
        ex = await generateJson({
          system: SYSTEM,
          parts: [{ text: `Description:\n"""${l.description}"""` }],
          schema: Extracted,
          temperature: 0,
          label: `normalize:${l.id}`,
        });
        if (ex) cache[key] = ex;
      }
    }
    const pick = <K extends keyof Extracted>(k: K, cur: unknown) =>
      cur === "unknown" || cur === null || (Array.isArray(cur) && cur.length === 0) ? ex?.[k] ?? cur : cur;
    out.push(
      DraftListing.parse({
        ...l,
        rentNegotiable: pick("rentNegotiable", l.rentNegotiable),
        leaseType: pick("leaseType", l.leaseType),
        leaseStart: pick("leaseStart", l.leaseStart),
        leaseEnd: pick("leaseEnd", l.leaseEnd),
        furnished: pick("furnished", l.furnished),
        utilitiesIncluded: pick("utilitiesIncluded", l.utilitiesIncluded),
        parking: pick("parking", l.parking),
        petsAllowed: pick("petsAllowed", l.petsAllowed),
        inUnitLaundry: pick("inUnitLaundry", l.inUnitLaundry),
      }),
    );
    console.log(`  ${l.id}: ${l.description.trim() ? (ex ? "extracted" : "no extraction") : "no description"}`);
  }
  writeCache("normalize.json", cache);
  writeJson(path.join(PROCESSED, "real.json"), out);
}

main();
