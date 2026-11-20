/**
 * Builds data/um-buildings.json.
 *
 * Source: OpenStreetMap building centroids (one Overpass query, cached in
 * data/cache/osm-buildings.json), matched by name. Any building we can't match
 * keeps the hand-entered approximate coordinate below and is listed in
 * data/um-buildings.sources.json so the README can say which is which.
 *
 * Usage: npx tsx scripts/buildings-osm.ts
 */
import path from "node:path";
import { z } from "zod";
import { UMBuilding } from "@/lib/schemas";
import { DATA, USER_AGENT, readCache, writeCache, writeJson } from "./lib/util";

type Campus = z.infer<typeof UMBuilding>["campus"];
interface Seed {
  code: string;
  name: string;
  campus: Campus;
  /** OSM names to try, case-insensitive exact match after normalization. */
  osm: string[];
  /** Hand-entered fallback (approximate). */
  approx: [number, number];
}

const SEEDS: Seed[] = [
  // Central Campus
  { code: "AH", name: "Angell Hall", campus: "central", osm: ["Angell Hall"], approx: [42.2765, -83.7398] },
  { code: "MH", name: "Mason Hall", campus: "central", osm: ["Mason Hall"], approx: [42.2772, -83.7392] },
  { code: "HH", name: "Haven Hall", campus: "central", osm: ["Haven Hall"], approx: [42.2768, -83.7389] },
  { code: "TISCH", name: "Tisch Hall", campus: "central", osm: ["Tisch Hall"], approx: [42.2762, -83.7388] },
  { code: "MLB", name: "Modern Languages Building", campus: "central", osm: ["Modern Languages Building"], approx: [42.2793, -83.7366] },
  { code: "LSA", name: "LSA Building", campus: "central", osm: ["LSA Building", "Literature, Science, and the Arts Building", "College of Literature, Science, and the Arts"], approx: [42.2763, -83.7406] },
  { code: "CHEM", name: "Chemistry Building", campus: "central", osm: ["Chemistry Building", "Department of Chemistry Building"], approx: [42.2785, -83.7368] },
  { code: "DENN", name: "Dennison Building", campus: "central", osm: ["Dennison Building", "David M. Dennison Building"], approx: [42.2779, -83.7363] },
  { code: "WEIS", name: "Weiser Hall", campus: "central", osm: ["Weiser Hall"], approx: [42.2759, -83.7378] },
  { code: "RAND", name: "Randall Laboratory", campus: "central", osm: ["Randall Laboratory", "Harrison M. Randall Laboratory", "Randall Lab"], approx: [42.2775, -83.7357] },
  { code: "WH", name: "West Hall", campus: "central", osm: ["West Hall"], approx: [42.2756, -83.7364] },
  { code: "EH", name: "East Hall", campus: "central", osm: ["East Hall"], approx: [42.2753, -83.7346] },
  { code: "LORCH", name: "Lorch Hall", campus: "central", osm: ["Lorch Hall"], approx: [42.2752, -83.7393] },
  { code: "USB", name: "Undergraduate Science Building", campus: "central", osm: ["Undergraduate Science Building"], approx: [42.2789, -83.7354] },
  { code: "BSB", name: "Biological Sciences Building", campus: "central", osm: ["Biological Sciences Building"], approx: [42.2775, -83.7348] },
  { code: "SHAP", name: "Shapiro Undergraduate Library", campus: "central", osm: ["Shapiro Undergraduate Library", "Harold T. Shapiro Undergraduate Library", "Shapiro Library"], approx: [42.2759, -83.7371] },
  { code: "HATCH", name: "Hatcher Graduate Library", campus: "central", osm: ["Hatcher Graduate Library", "Harlan Hatcher Graduate Library"], approx: [42.2764, -83.7381] },
  { code: "UNION", name: "Michigan Union", campus: "central", osm: ["Michigan Union"], approx: [42.2751, -83.7416] },
  { code: "LEAGUE", name: "Michigan League", campus: "central", osm: ["Michigan League"], approx: [42.2788, -83.7377] },
  { code: "RACK", name: "Rackham Building", campus: "central", osm: ["Rackham Building", "Horace H. Rackham School of Graduate Studies"], approx: [42.2799, -83.7375] },
  { code: "HUTCH", name: "Hutchins Hall (Law)", campus: "central", osm: ["Hutchins Hall"], approx: [42.2736, -83.7393] },
  { code: "ROSS", name: "Ross School of Business", campus: "central", osm: ["Ross School of Business", "Stephen M. Ross School of Business", "Ross School of Business Building"], approx: [42.2729, -83.7377] },
  { code: "WEILL", name: "Weill Hall (Ford School)", campus: "central", osm: ["Weill Hall", "Joan and Sanford Weill Hall", "Gerald R. Ford School of Public Policy - Weill Hall"], approx: [42.2727, -83.7358] },
  { code: "SEB", name: "School of Education Building", campus: "central", osm: ["School of Education Building", "School of Education"], approx: [42.2741, -83.7362] },
  { code: "TAP", name: "Tappan Hall", campus: "central", osm: ["Tappan Hall"], approx: [42.2745, -83.7372] },
  { code: "NQ", name: "North Quad", campus: "central", osm: ["North Quadrangle", "North Quad"], approx: [42.2808, -83.7401] },
  { code: "EQ", name: "East Quad", campus: "central", osm: ["East Quadrangle", "East Quad"], approx: [42.2726, -83.7353] },
  { code: "SQ", name: "South Quad", campus: "central", osm: ["South Quadrangle", "South Quad"], approx: [42.2737, -83.7419] },
  { code: "PALM", name: "Palmer Commons", campus: "central", osm: ["Palmer Commons"], approx: [42.2805, -83.7337] },
  { code: "SPH", name: "School of Public Health", campus: "central", osm: ["School of Public Health I", "School of Public Health", "SPH I", "Thomas Francis Jr. Public Health Building"], approx: [42.2808, -83.7298] },
  { code: "IMSB", name: "Intramural Sports Building", campus: "central", osm: ["Intramural Sports Building", "IM Building"], approx: [42.2706, -83.7406] },
  // Medical
  { code: "UH", name: "University Hospital", campus: "medical", osm: ["University Hospital"], approx: [42.2836, -83.7294] },
  { code: "THL", name: "Taubman Health Sciences Library", campus: "medical", osm: ["Taubman Health Sciences Library"], approx: [42.2832, -83.7343] },
  { code: "NUR", name: "School of Nursing", campus: "medical", osm: ["School of Nursing", "Nursing Building", "School of Nursing Building"], approx: [42.2829, -83.7348] },
  { code: "DENT", name: "School of Dentistry", campus: "central", osm: ["School of Dentistry", "Dental Building"], approx: [42.2804, -83.7348] },
  { code: "PHARM", name: "College of Pharmacy", campus: "central", osm: ["College of Pharmacy", "College of Pharmacy Building"], approx: [42.2803, -83.7356] },
  // North Campus
  { code: "BBB", name: "Bob and Betty Beyster Building", campus: "north", osm: ["Bob and Betty Beyster Building", "Beyster Building"], approx: [42.2929, -83.7163] },
  { code: "EECS", name: "EECS Building", campus: "north", osm: ["EECS Building", "Electrical Engineering and Computer Science Building"], approx: [42.2925, -83.7144] },
  { code: "DOW", name: "Dow Building", campus: "north", osm: ["Herbert H. Dow Building", "Dow Building", "H. H. Dow Building"], approx: [42.2928, -83.7155] },
  { code: "GGBL", name: "G.G. Brown Laboratory", campus: "north", osm: ["G. G. Brown Laboratory", "G.G. Brown Laboratory", "George Granger Brown Laboratory"], approx: [42.2935, -83.7139] },
  { code: "FXB", name: "François-Xavier Bagnoud Building", campus: "north", osm: ["François-Xavier Bagnoud Building", "Francois-Xavier Bagnoud Building", "FXB"], approx: [42.2935, -83.7121] },
  { code: "LEC", name: "Lurie Engineering Center", campus: "north", osm: ["Lurie Engineering Center", "Ann and Robert H. Lurie Engineering Center"], approx: [42.2911, -83.7139] },
  { code: "IOE", name: "Industrial and Operations Engineering Building", campus: "north", osm: ["Industrial and Operations Engineering Building", "IOE Building"], approx: [42.2913, -83.7106] },
  { code: "CHRYS", name: "Chrysler Center", campus: "north", osm: ["Chrysler Center", "Walter E. Chrysler Center"], approx: [42.2908, -83.7171] },
  { code: "DUDE", name: "Duderstadt Center", campus: "north", osm: ["Duderstadt Center", "James and Anne Duderstadt Center"], approx: [42.2912, -83.7171] },
  { code: "PIER", name: "Pierpont Commons", campus: "north", osm: ["Pierpont Commons"], approx: [42.2914, -83.7174] },
  { code: "FMCRB", name: "Ford Motor Company Robotics Building", campus: "north", osm: ["Ford Motor Company Robotics Building", "Ford Robotics Building"], approx: [42.2944, -83.7108] },
  { code: "GFL", name: "Gorguze Family Laboratory", campus: "north", osm: ["Gorguze Family Laboratory"], approx: [42.2937, -83.7128] },
  { code: "ARCH", name: "Art and Architecture Building", campus: "north", osm: ["Art and Architecture Building", "Art & Architecture Building"], approx: [42.2885, -83.7172] },
  { code: "MOORE", name: "Earl V. Moore Building (Music)", campus: "north", osm: ["Earl V. Moore Building", "Moore Building"], approx: [42.2903, -83.7212] },
  { code: "WALG", name: "Walgreen Drama Center", campus: "north", osm: ["Walgreen Drama Center", "Charles R. Walgreen, Jr. Drama Center"], approx: [42.2918, -83.7189] },
  { code: "NCRB", name: "North Campus Recreation Building", campus: "north", osm: ["North Campus Recreation Building"], approx: [42.2953, -83.7206] },
  { code: "BURS", name: "Bursley Hall", campus: "north", osm: ["Bursley Hall", "Bursley Residence Hall"], approx: [42.2941, -83.7213] },
  // South
  { code: "CRISLER", name: "Crisler Center", campus: "south", osm: ["Crisler Center", "Crisler Arena"], approx: [42.2659, -83.7487] },
];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

interface OsmEl {
  type: string;
  id: number;
  center?: { lat: number; lon: number };
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

async function fetchOsmBuildings(): Promise<OsmEl[]> {
  const cached = readCache<OsmEl[] | null>("osm-buildings.json", null);
  if (cached) return cached;
  // U-M campuses only (Central/Medical/North/South), named buildings.
  const q = `[out:json][timeout:60];(way["building"]["name"](42.262,-83.752,42.300,-83.700);relation["building"]["name"](42.262,-83.752,42.300,-83.700););out center tags;`;
  console.log("  querying Overpass for named buildings…");
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(q),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const els = ((await res.json()) as { elements: OsmEl[] }).elements;
  writeCache("osm-buildings.json", els);
  return els;
}

async function main() {
  let els: OsmEl[] = [];
  try {
    els = await fetchOsmBuildings();
  } catch (e) {
    console.warn("  Overpass failed; using hand-entered coordinates for all buildings.", e);
  }
  const byName = new Map<string, OsmEl>();
  for (const el of els) {
    for (const key of ["name", "alt_name", "official_name", "short_name"]) {
      const v = el.tags?.[key];
      if (v && !byName.has(norm(v))) byName.set(norm(v), el);
    }
  }

  const out: z.infer<typeof UMBuilding>[] = [];
  const sources: Record<string, string> = {};
  for (const s of SEEDS) {
    const hit = s.osm.map((n) => byName.get(norm(n))).find(Boolean);
    const lat = hit?.center?.lat ?? hit?.lat;
    const lng = hit?.center?.lon ?? hit?.lon;
    if (hit && lat !== undefined && lng !== undefined) {
      out.push({ code: s.code, name: s.name, campus: s.campus, lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
      sources[s.code] = `OpenStreetMap ${hit.type}/${hit.id} ("${hit.tags?.name}")`;
    } else {
      out.push({ code: s.code, name: s.name, campus: s.campus, lat: s.approx[0], lng: s.approx[1] });
      sources[s.code] = "hand-entered approximate coordinate";
    }
  }
  z.array(UMBuilding).parse(out);
  writeJson(path.join(DATA, "um-buildings.json"), out);
  writeJson(path.join(DATA, "um-buildings.sources.json"), sources);
  const manual = Object.entries(sources).filter(([, v]) => v.startsWith("hand"));
  console.log(`  ${out.length} buildings, ${out.length - manual.length} from OSM, ${manual.length} hand-entered: ${manual.map(([k]) => k).join(", ")}`);
}

main();
