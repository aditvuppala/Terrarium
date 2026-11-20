/**
 * Map overlays for the explore map (components/map/MapOverlays.tsx).
 *
 * 1. Nightlife density: named OSM bars & pubs from data/processed/places.json
 *    (category "bar" = amenity=bar|pub, © OpenStreetMap contributors via Overpass),
 *    counted on a ~250 m grid over ANN_ARBOR_BBOX. Each cell stores the bars inside
 *    it and the bars within 400 m of its center (the value the map colors by).
 *    Cells with 0 bars within 400 m are omitted (transparent).
 *
 * 2. Student population share: ACS 5-year table B14001 (school enrollment by level,
 *    population 3+) per census tract in Washtenaw County, MI (26161), joined by GEOID
 *    to TIGERweb tract polygons that intersect ANN_ARBOR_BBOX.
 *      total = B14001_001E, undergrad = B14001_008E, grad/professional = B14001_009E
 *      share = (undergrad + grad) / total
 *    Values come from the Census Data API when it answers (it now requires a key:
 *    set CENSUS_API_KEY), otherwise from Census Reporter's keyless mirror of the same
 *    ACS table (api.censusreporter.org). The source actually used is written into the
 *    output's metadata.
 *
 * Raw downloads are cached in data/cache/overlays-*.json (delete to refresh).
 * Out: public/overlays/nightlife.geojson, public/overlays/students.geojson
 */
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { ANN_ARBOR_BBOX, haversineMeters } from "../lib/geo";
import { PROCESSED, ROOT, USER_AGENT, readCache, readJson, today, writeCache } from "./lib/util";

const OUT_DIR = path.join(ROOT, "public", "overlays");
const CELL_M = 250;
const NEAR_M = 400;
const STATE = "26";
const COUNTY = "161";
/** Newest first. ACS 2021-2025 5-year is scheduled for Dec 2026. */
const VINTAGES = [2025, 2024, 2023];

type Position = [number, number];
interface Feature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

const round = (n: number, d = 5) => Math.round(n * 10 ** d) / 10 ** d;

function writeGeoJson(name: string, metadata: Record<string, unknown>, features: Feature[]) {
  mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, name);
  writeFileSync(file, JSON.stringify({ type: "FeatureCollection", metadata, features }) + "\n");
  console.log(`  wrote ${path.relative(ROOT, file)} (${(statSync(file).size / 1024).toFixed(1)} KB, ${features.length} features)`);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "manual" });
  if (res.status !== 200) throw new Error(`${res.status} ${res.headers.get("location") ?? ""} for ${url}`);
  return (await res.json()) as T;
}

/* ---------------- 1. Nightlife ---------------- */

interface Place {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

function buildNightlife() {
  console.log("Nightlife density (OSM bars & pubs)");
  const places = readJson<Place[]>(path.join(PROCESSED, "places.json"));
  const bars = places.filter((p) => p.category === "bar");
  const b = ANN_ARBOR_BBOX;
  const midLat = (b.south + b.north) / 2;
  const dLat = CELL_M / 111_320;
  const dLng = CELL_M / (111_320 * Math.cos((midLat * Math.PI) / 180));
  const rows = Math.ceil((b.north - b.south) / dLat);
  const cols = Math.ceil((b.east - b.west) / dLng);

  const features: Feature[] = [];
  let maxNear = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s = b.south + r * dLat;
      const w = b.west + c * dLng;
      const n = s + dLat;
      const e = w + dLng;
      const center = { lat: s + dLat / 2, lng: w + dLng / 2 };
      const inCell = bars.filter((p) => p.lat >= s && p.lat < n && p.lng >= w && p.lng < e).length;
      const near = bars.filter((p) => haversineMeters(center, p) <= NEAR_M).length;
      if (near === 0) continue;
      maxNear = Math.max(maxNear, near);
      const ring: Position[] = [
        [round(w), round(s)],
        [round(e), round(s)],
        [round(e), round(n)],
        [round(w), round(n)],
        [round(w), round(s)],
      ];
      features.push({
        type: "Feature",
        properties: { kind: "cell", count: inCell, within400m: near },
        geometry: { type: "Polygon", coordinates: [ring] },
      });
    }
  }
  for (const p of bars) {
    features.push({
      type: "Feature",
      properties: { kind: "bar", name: p.name, id: p.id },
      geometry: { type: "Point", coordinates: [round(p.lng), round(p.lat)] },
    });
  }
  console.log(`  ${bars.length} bars/pubs, ${rows}x${cols} grid, max ${maxNear} within ${NEAR_M} m of a cell center`);
  writeGeoJson(
    "nightlife.geojson",
    {
      title: "Nightlife density (bars & pubs)",
      source: "© OpenStreetMap contributors (ODbL), via the Overpass API (data/processed/places.json)",
      osmTags: "amenity=bar, amenity=pub (named only)",
      method: `Grid of ~${CELL_M} m cells over the Ann Arbor bounding box; within400m = bars/pubs within ${NEAR_M} m (straight line) of the cell center; count = bars/pubs inside the cell. Cells with within400m = 0 are omitted.`,
      barCount: bars.length,
      maxWithin400m: maxNear,
      retrieved: today(),
    },
    features,
  );
}

/* ---------------- 2. Student share ---------------- */

interface TractRow {
  geoid: string;
  total: number;
  undergrad: number;
  grad: number;
}
interface AcsResult {
  vintage: number;
  label: string;
  via: string;
  rows: TractRow[];
}

async function fetchAcsCensusApi(): Promise<AcsResult | null> {
  const key = process.env.CENSUS_API_KEY;
  for (const y of VINTAGES) {
    const url =
      `https://api.census.gov/data/${y}/acs/acs5?get=NAME,B14001_001E,B14001_008E,B14001_009E` +
      `&for=tract:*&in=state:${STATE}&in=county:${COUNTY}` +
      (key ? `&key=${encodeURIComponent(key)}` : "");
    try {
      const table = await getJson<string[][]>(url);
      const [head, ...body] = table;
      const ix = (k: string) => head.indexOf(k);
      return {
        vintage: y,
        label: `ACS ${y} 5-year (${y - 4}-${y})`,
        via: `U.S. Census Bureau Data API (api.census.gov/data/${y}/acs/acs5)`,
        rows: body.map((r) => ({
          geoid: r[ix("state")] + r[ix("county")] + r[ix("tract")],
          total: Number(r[ix("B14001_001E")]),
          undergrad: Number(r[ix("B14001_008E")]),
          grad: Number(r[ix("B14001_009E")]),
        })),
      };
    } catch (err) {
      console.log(`  Census API ${y}: ${(err as Error).message.split(" for ")[0]}`);
    }
  }
  return null;
}

interface CensusReporter {
  release: { id: string; name: string; years: string };
  tables: { B14001: { columns: Record<string, { name: string }> } };
  data: Record<string, { B14001: { estimate: Record<string, number> } }>;
}

async function fetchAcsCensusReporter(): Promise<AcsResult> {
  const url = `https://api.censusreporter.org/1.0/data/show/latest?table_ids=B14001&geo_ids=140|05000US${STATE}${COUNTY}`;
  const j = await getJson<CensusReporter>(url);
  // Check the columns are the ones we expect (same labels as the Census API variables).
  const cols = j.tables.B14001.columns;
  const expect: Record<string, string> = {
    B14001001: "Total:",
    B14001008: "Enrolled in college, undergraduate years",
    B14001009: "Graduate or professional school",
  };
  for (const [k, v] of Object.entries(expect)) {
    if (cols[k]?.name !== v) throw new Error(`Census Reporter column ${k} is "${cols[k]?.name}", expected "${v}"`);
  }
  const m = /^acs(\d{4})_5yr$/.exec(j.release.id);
  if (!m) throw new Error(`unexpected Census Reporter release ${j.release.id}`);
  const y = Number(m[1]);
  return {
    vintage: y,
    label: `${j.release.name} (${j.release.years})`,
    via: `Census Reporter API (api.censusreporter.org, release ${j.release.id}), a keyless mirror of the Census Bureau's ACS tables`,
    rows: Object.entries(j.data).map(([gid, d]) => ({
      geoid: gid.replace(/^14000US/, ""),
      total: d.B14001.estimate.B14001001,
      undergrad: d.B14001.estimate.B14001008,
      grad: d.B14001.estimate.B14001009,
    })),
  };
}

interface TractGeo {
  features: { properties: { GEOID: string; NAME: string }; geometry: { type: string; coordinates: unknown } }[];
}

async function fetchTracts(vintage: number): Promise<{ geo: TractGeo; service: string }> {
  // TIGERweb publishes a service per ACS vintage; fall back to older ones (2020 tracts are
  // used for ACS 2020+ releases).
  for (const v of [vintage, vintage - 1, 2023, 2022]) {
    const service = `tigerWMS_ACS${v}`;
    const b = ANN_ARBOR_BBOX;
    const url =
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/${service}/MapServer/8/query` +
      `?where=${encodeURIComponent(`STATE='${STATE}' AND COUNTY='${COUNTY}'`)}` +
      `&geometry=${b.west},${b.south},${b.east},${b.north}&geometryType=esriGeometryEnvelope&inSR=4326` +
      `&spatialRel=esriSpatialRelIntersects&outFields=GEOID,NAME&returnGeometry=true&outSR=4326` +
      `&maxAllowableOffset=0.00008&f=geojson`;
    try {
      const geo = await getJson<TractGeo>(url);
      if (geo.features?.length) return { geo, service };
    } catch (err) {
      console.log(`  TIGERweb ${service}: ${(err as Error).message.split(" for ")[0]}`);
    }
  }
  throw new Error("TIGERweb returned no tracts");
}

function roundCoords(c: unknown): unknown {
  if (typeof c === "number") return round(c);
  if (Array.isArray(c)) {
    const out = c.map(roundCoords);
    // Drop consecutive duplicate positions created by rounding.
    if (out.length && Array.isArray(out[0]) && typeof (out[0] as unknown[])[0] === "number") {
      return out.filter((p, i) => i === 0 || JSON.stringify(p) !== JSON.stringify(out[i - 1]));
    }
    return out;
  }
  return c;
}

async function buildStudents() {
  console.log("Student population share (ACS B14001)");
  let acs = readCache<AcsResult | null>("overlays-acs.json", null);
  if (!acs) {
    acs = (await fetchAcsCensusApi()) ?? (await fetchAcsCensusReporter());
    writeCache("overlays-acs.json", acs);
  }
  console.log(`  ${acs.rows.length} Washtenaw tracts from ${acs.label} via ${acs.via.split(" (")[0]}`);

  let tracts = readCache<{ geo: TractGeo; service: string } | null>("overlays-tracts.json", null);
  if (!tracts) {
    tracts = await fetchTracts(acs.vintage);
    writeCache("overlays-tracts.json", tracts);
  }
  const byId = new Map(acs.rows.map((r) => [r.geoid, r]));
  const features: Feature[] = [];
  let missing = 0;
  for (const f of tracts.geo.features) {
    const row = byId.get(f.properties.GEOID);
    if (!row) {
      missing++;
      continue;
    }
    const students = row.undergrad + row.grad;
    features.push({
      type: "Feature",
      properties: {
        geoid: f.properties.GEOID,
        name: f.properties.NAME,
        total: row.total,
        undergrad: row.undergrad,
        grad: row.grad,
        share: row.total > 0 ? round(students / row.total, 3) : null,
      },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
    });
  }
  if (missing) console.log(`  ${missing} tract polygons had no ACS row (dropped)`);
  const top = [...features]
    .sort((a, b) => Number(b.properties.share) - Number(a.properties.share))
    .slice(0, 5)
    .map((f) => `${f.properties.name} ${(Number(f.properties.share) * 100).toFixed(0)}%`);
  console.log(`  highest share: ${top.join(", ")}`);
  writeGeoJson(
    "students.geojson",
    {
      title: "Share of residents enrolled in college or grad school, by census tract",
      source: `U.S. Census Bureau, American Community Survey 5-year estimates, ${acs.label}, table B14001`,
      vintage: acs.vintage,
      variables: {
        total: "B14001_001E Total (population 3 years and over)",
        undergrad: "B14001_008E Enrolled in college, undergraduate years",
        grad: "B14001_009E Graduate or professional school",
      },
      share: "(undergrad + grad) / total; estimates carry margins of error (not included)",
      valuesVia: acs.via,
      geometry: `U.S. Census Bureau TIGERweb (${tracts.service}, layer 8 Census Tracts), tracts in Washtenaw County, MI intersecting the Ann Arbor bounding box; simplified and rounded to 5 decimals`,
      retrieved: today(),
    },
    features,
  );
}

async function main() {
  buildNightlife();
  await buildStudents();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
