/**
 * Step 7: active City of Ann Arbor construction near each listing.
 *
 * Source: the city's "Active Construction Projects" layer, the data behind
 * https://www.a2gov.org/A2ConstructionStatus (ArcGIS FeatureServer, polygons).
 * Fetched once and cached in data/cache/construction.geojson; delete the cache
 * to refresh. Projects typed "Project Complete" are dropped.
 *
 * For each listing, every remaining project within 250 m (straight line from
 * the listing point to the project polygon; 0 if inside) is written to
 * enrichment.construction, nearest first.
 *
 * In:  data/processed/listings.json, data/processed/enrichment.json
 * Out: data/processed/enrichment.json (construction filled in),
 *      data/processed/construction-source.json (snapshot metadata)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { round1 } from "@/lib/geo";
import { Listing, ListingEnrichment, type NearbyConstruction } from "@/lib/schemas";
import { CACHE, PROCESSED, USER_AGENT, readJsonValidated, today, writeJson } from "./lib/util";

const LAYER =
  "https://utility.arcgis.com/usrsvcs/servers/bac25e1cf14b41b5bf2a62fc9a59f2d4/rest/services/ConstructionProjects/FeatureServer/0";
const QUERY = `${LAYER}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`;
const CACHE_FILE = path.join(CACHE, "construction.geojson");
const RADIUS_M = 250;

type Ring = [number, number][]; // [lng, lat]
const Feature = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  properties: z.object({
    OBJECTID_1: z.number(),
    DBID: z.string().nullable(),
    Location: z.string().nullable(),
    ProjectType: z.string().nullable(),
    Description: z.string().nullable(),
    Hyperlink: z.string().nullable(),
  }),
  geometry: z
    .union([
      z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))) }),
      z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(z.tuple([z.number(), z.number()])))) }),
    ])
    .nullable(),
});
const FeatureCollection = z.object({ type: z.literal("FeatureCollection"), features: z.array(Feature) });

async function loadLayer(): Promise<{ fc: z.infer<typeof FeatureCollection>; fetchedOn: string }> {
  if (existsSync(CACHE_FILE)) {
    const cached = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    return { fc: FeatureCollection.parse(cached.data), fetchedOn: cached.fetchedOn };
  }
  console.log("  fetching City of Ann Arbor construction layer…");
  const res = await fetch(QUERY, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Construction layer: HTTP ${res.status}`);
  const fc = FeatureCollection.parse(await res.json());
  const fetchedOn = today();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify({ fetchedOn, data: fc }) + "\n");
  return { fc, fetchedOn };
}

/* ---------- geometry: local flat projection is plenty at city scale ---------- */

const M_PER_DEG_LAT = 111_320;
const toXY = (lng: number, lat: number, lat0: number): [number, number] => [
  lng * M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180),
  lat * M_PER_DEG_LAT,
];

function segDist(p: [number, number], a: [number, number], b: [number, number]): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const dx = b[0] - ax;
  const dy = b[1] - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Distance in meters from a point to a set of polygon rings (even-odd fill); 0 if inside. */
function distanceToRings(lat: number, lng: number, rings: Ring[]): number {
  const p = toXY(lng, lat, lat);
  let inside = false;
  let best = Infinity;
  for (const ring of rings) {
    const pts = ring.map(([x, y]) => toXY(x, y, lat));
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
      best = Math.min(best, segDist(p, pts[j], pts[i]));
    }
  }
  return inside ? 0 : best;
}

const clean = (s: string | null | undefined) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length ? t : null;
};

async function main() {
  const listings = readJsonValidated(path.join(PROCESSED, "listings.json"), z.array(Listing));
  const enrichment = readJsonValidated(path.join(PROCESSED, "enrichment.json"), z.array(ListingEnrichment.omit({ construction: true })));
  const { fc, fetchedOn } = await loadLayer();

  const projects = fc.features.flatMap((f) => {
    const p = f.properties;
    const type = clean(p.ProjectType);
    if (!f.geometry || !type || /complete/i.test(type)) return [];
    const rings: Ring[] = f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat();
    const name = clean(p.Location) ?? clean(p.DBID) ?? `${type} project`;
    return [{ projectId: `a2:${p.OBJECTID_1}`, name, projectType: type, note: clean(p.Description), url: clean(p.Hyperlink), rings }];
  });
  console.log(`  ${fc.features.length} features, ${projects.length} active projects (fetched ${fetchedOn})`);

  const byId = new Map(listings.map((l) => [l.id, l]));
  let withAny = 0;
  const out = enrichment.map((e) => {
    const l = byId.get(e.listingId);
    if (!l) return { ...e, construction: [] };
    const near: NearbyConstruction[] = projects
      .map(({ rings, ...rest }) => ({ ...rest, distanceMeters: round1(distanceToRings(l.lat, l.lng, rings)) }))
      .filter((c) => c.distanceMeters <= RADIUS_M)
      .sort((a, b) => a.distanceMeters - b.distanceMeters || a.projectId.localeCompare(b.projectId));
    if (near.length) withAny++;
    return ListingEnrichment.parse({ ...e, construction: near });
  });

  writeJson(path.join(PROCESSED, "enrichment.json"), out);
  writeJson(path.join(PROCESSED, "construction-source.json"), {
    source: "City of Ann Arbor, Active Construction Projects (https://www.a2gov.org/A2ConstructionStatus)",
    layer: LAYER,
    fetchedOn,
    activeProjects: projects.length,
    radiusMeters: RADIUS_M,
  });
  console.log(`✓ construction: ${withAny}/${out.length} listings have an active project within ${RADIUS_M} m`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
