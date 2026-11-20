/**
 * Step 1: U-M Off-Campus Housing listings.
 *
 * Before any automated access, this checks robots.txt and the site's Terms of
 * Use. As of 2026-11-20 the governing terms (RentCollegePads / StarRez, linked
 * from offcampushousing.umich.edu) forbid "any robot, spider, or other
 * automatic device, process, or means to access the Website for any purpose,
 * including monitoring or copying any of the material on the Website."
 *
 * So this script does NOT scrape. It re-checks the terms (in case they change),
 * prints instructions, and leaves data/raw/um.json, which the team fills in by
 * hand, untouched. Facts only (address, rent, beds, etc.), no landlord contact
 * info, and no copied photos or descriptions.
 *
 * Usage: npx tsx scripts/scrape-um.ts
 */
import path from "node:path";
import { z } from "zod";
import { DraftListing } from "./lib/types";
import { RAW, USER_AGENT, readJsonValidated } from "./lib/util";

const ROBOTS = "https://offcampushousing.umich.edu/robots.txt";
const TERMS = "https://www.rentcollegepads.com/terms";
const FORBIDS = /robot,\s*spider,\s*or other automatic device/i;

async function termsForbidAutomation(): Promise<boolean | null> {
  try {
    const robots = await fetch(ROBOTS, { headers: { "User-Agent": USER_AGENT } }).then((r) => r.text());
    console.log(`robots.txt: ${robots.split("\n").filter((l) => /^disallow/i.test(l)).length} Disallow rules (listing detail pages ?property_id= are disallowed)`);
    // The terms page is JavaScript-rendered; the clause text is present in the HTML payload.
    const html = await fetch(TERMS, { headers: { "User-Agent": USER_AGENT } }).then((r) => r.text());
    if (FORBIDS.test(html)) return true;
    return null; // couldn't confirm either way from raw HTML
  } catch (e) {
    console.warn("Could not fetch robots/terms:", e);
    return null;
  }
}

async function main() {
  const forbids = await termsForbidAutomation();
  console.log("");
  console.log("STOP: automated access to offcampushousing.umich.edu is not allowed.");
  console.log(`  Terms of Use (${TERMS}) prohibit robots/spiders/automatic means to access or copy the site.`);
  if (forbids === null) console.log("  (Could not re-confirm the clause from raw HTML this run; it was confirmed manually on 2026-11-20.)");
  console.log("");
  console.log("Enter real listings by hand instead:");
  console.log("  1. Browse the site normally in a browser.");
  console.log("  2. Add one object per listing to data/raw/um.json (copy an existing entry).");
  console.log("     Facts only. Unknown -> \"unknown\" or null. No landlord names/phones/emails.");
  console.log("     Leave photos [] and write the description in your own words (or leave \"\").");
  console.log("  3. Run `npm run pipeline`.");

  const file = path.join(RAW, "um.json");
  const listings = readJsonValidated(file, z.array(DraftListing));
  console.log(`\ndata/raw/um.json currently has ${listings.length} hand-entered real listings (validated).`);
}

main();
