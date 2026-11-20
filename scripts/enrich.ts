/**
 * Step 6: per-listing enrichment.
 *
 * - stops: TheRide GTFS + U-M Transit Services GTFS (data/gtfs/*.zip, downloaded if missing).
 *   stops -> stop_times -> trips -> routes; keep the 5 nearest stops within 800 m,
 *   each with route names and distinct trip_headsigns.
 * - places: ONE Overpass query for the Ann Arbor bounding box (cached in
 *   data/cache/places.json); keep places within 1 km of each listing.
 * - buildingTimes: to every building in data/um-buildings.json.
 *     walkMin = straight line × 1.3 / 80 m per min
 *     busMin  = walk to nearest stop + 8 min wait + ride at 20 km/h + walk from the stop
 *               nearest the building; only when walkMin > 20, else null. method "estimate".
 *
 * In:  data/processed/listings.json, data/um-buildings.json, data/gtfs/*.zip
 * Out: data/processed/enrichment.json, gtfs-stops.json, places.json
 */
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  ANN_ARBOR_BBOX,
  BUS_WAIT_MIN,
  busRideMin,
  haversineMeters,
  inAnnArbor,
  round1,
  walkMetersBetween,
  walkMinFromMeters,
  type Point,
} from "@/lib/geo";
import { Listing, ListingEnrichment, NearbyPlace, NearbyStop, PlaceCategory, UMBuilding } from "@/lib/schemas";
import { DATA, GTFS_DIR, PROCESSED, USER_AGENT, readCache, readJsonValidated, writeCache, writeJson } from "./lib/util";

const FEEDS = [
  { agency: "TheRide", file: "theride.zip", url: "https://www.theride.org/sites/default/files/google/google_transit.zip" },
  // U-M Transit Services via the Mobility Database mirror (feed mdb-2072).
  { agency: "UM", file: "umich.zip", url: "https://files.mobilitydatabase.org/mdb-2072/latest.zip" },
] as const;
type Agency = (typeof FEEDS)[number]["agency"];

/** U-M charter/test/training routes that aren't real service. */
const EXCLUDED_ROUTES = new Set(["99995", "99997", "99998", "99999"]);

export interface GtfsStop {
  stopId: string;
  stopName: string;
  agency: Agency;
  lat: number;
  lng: number;
  routes: { routeId: string; routeName: string; headsigns: string[] }[];
}

type Row = Record<string, string>;
const csv = (zip: AdmZip, name: string): Row[] => {
  const entry = zip.getEntry(name);
  if (!entry) throw new Error(`GTFS file missing: ${name}`);
  return parse(entry.getData().toString("utf8").replace(/^﻿/, ""), { columns: true, skip_empty_lines: true, relax_column_count: true });
};

async function ensureFeed(feed: (typeof FEEDS)[number]): Promise<string> {
  const file = path.join(GTFS_DIR, feed.file);
  if (!existsSync(file)) {
    console.log(`  downloading ${feed.agency} GTFS…`);
    const res = await fetch(feed.url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`GTFS download failed (${feed.agency}): ${res.status}`);
    mkdirSync(GTFS_DIR, { recursive: true });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

async function loadStops(): Promise<GtfsStop[]> {
  const all: GtfsStop[] = [];
  for (const feed of FEEDS) {
    const zip = new AdmZip(await ensureFeed(feed));
    const routes = new Map<string, string>();
    for (const r of csv(zip, "routes.txt")) {
      if (EXCLUDED_ROUTES.has(r.route_id)) continue;
      const short = r.route_short_name?.trim();
      const long = r.route_long_name?.trim();
      routes.set(r.route_id, feed.agency === "UM" ? long || short : [short, long].filter(Boolean).join(" "));
    }
    const trips = new Map<string, { routeId: string; headsign: string }>();
    for (const t of csv(zip, "trips.txt")) {
      if (routes.has(t.route_id)) trips.set(t.trip_id, { routeId: t.route_id, headsign: (t.trip_headsign ?? "").trim() });
    }
    // stop -> route -> headsigns
    const served = new Map<string, Map<string, Set<string>>>();
    for (const st of csv(zip, "stop_times.txt")) {
      const trip = trips.get(st.trip_id);
      if (!trip) continue;
      let byRoute = served.get(st.stop_id);
      if (!byRoute) served.set(st.stop_id, (byRoute = new Map()));
      let hs = byRoute.get(trip.routeId);
      if (!hs) byRoute.set(trip.routeId, (hs = new Set()));
      if (trip.headsign) hs.add(trip.headsign);
    }
    let kept = 0;
    for (const s of csv(zip, "stops.txt")) {
      if (s.location_type && s.location_type !== "0") continue;
      const p = { lat: +s.stop_lat, lng: +s.stop_lon };
      const byRoute = served.get(s.stop_id);
      if (!byRoute || !inAnnArbor(p)) continue;
      all.push({
        stopId: `${feed.agency}:${s.stop_id}`,
        stopName: s.stop_name.trim(),
        agency: feed.agency,
        lat: p.lat,
        lng: p.lng,
        routes: [...byRoute.entries()]
          .map(([routeId, hs]) => ({ routeId, routeName: routes.get(routeId)!, headsigns: [...hs].sort() }))
          .sort((a, b) => a.routeName.localeCompare(b.routeName, "en", { numeric: true })),
      });
      kept++;
    }
    console.log(`  ${feed.agency}: ${routes.size} routes, ${kept} served stops in Ann Arbor`);
  }
  return all;
}

/* ---------------- places (Overpass) ---------------- */
interface OsmEl {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
export interface Place {
  id: string;
  name: string;
  category: z.infer<typeof PlaceCategory>;
  lat: number;
  lng: number;
}

function categorize(tags: Record<string, string>): Place["category"] | null {
  switch (tags.amenity) {
    case "bar":
    case "pub":
      return "bar";
    case "restaurant":
      return "restaurant";
    case "cafe":
      return "cafe";
    case "fast_food":
      return "fast_food";
  }
  if (tags.shop === "supermarket" || tags.shop === "grocery") return "grocery";
  if (tags.leisure === "fitness_centre") return "gym";
  return null;
}

async function loadPlaces(): Promise<Place[]> {
  let els = readCache<OsmEl[] | null>("places.json", null);
  if (!els) {
    const b = ANN_ARBOR_BBOX;
    const bbox = `${b.south},${b.west},${b.north},${b.east}`;
    const q = `[out:json][timeout:90];(
      nwr["amenity"~"^(bar|pub|restaurant|cafe|fast_food)$"](${bbox});
      nwr["shop"~"^(supermarket|grocery)$"](${bbox});
      nwr["leisure"="fitness_centre"](${bbox});
    );out center tags;`;
    console.log("  querying Overpass for places…");
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
    els = ((await res.json()) as { elements: OsmEl[] }).elements;
    writeCache("places.json", els);
  }
  const places: Place[] = [];
  for (const el of els) {
    const lat = el.center?.lat ?? el.lat;
    const lng = el.center?.lon ?? el.lon;
    const name = el.tags?.name?.trim();
    const category = el.tags ? categorize(el.tags) : null;
    if (lat === undefined || lng === undefined || !name || !category) continue;
    places.push({ id: `osm:${el.type}/${el.id}`, name, category, lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
  }
  return places;
}

/* ---------------- main ---------------- */
function nearest<T extends Point>(p: Point, xs: T[]): { item: T; meters: number } | null {
  let best: { item: T; meters: number } | null = null;
  for (const x of xs) {
    const m = walkMetersBetween(p, x);
    if (!best || m < best.meters) best = { item: x, meters: m };
  }
  return best;
}

async function main() {
  const listings = readJsonValidated(path.join(PROCESSED, "listings.json"), z.array(Listing));
  const buildings = readJsonValidated(path.join(DATA, "um-buildings.json"), z.array(UMBuilding));
  const stops = await loadStops();
  const places = await loadPlaces();
  console.log(`  ${places.length} named places in the Ann Arbor bounding box`);

  const out: ListingEnrichment[] = [];
  for (const l of listings) {
    const here = { lat: l.lat, lng: l.lng };

    const nearbyStops: z.infer<typeof NearbyStop>[] = stops
      .map((s) => ({ s, meters: walkMetersBetween(here, s) }))
      .filter((x) => haversineMeters(here, x.s) <= 800)
      .sort((a, b) => a.meters - b.meters)
      .slice(0, 5)
      .map(({ s, meters }) => ({ ...s, walkMeters: Math.round(meters), walkMin: round1(walkMinFromMeters(meters)) }));

    const nearbyPlaces: z.infer<typeof NearbyPlace>[] = places
      .filter((p) => haversineMeters(here, p) <= 1000)
      .map((p) => {
        const meters = walkMetersBetween(here, p);
        return { name: p.name, category: p.category, lat: p.lat, lng: p.lng, walkMeters: Math.round(meters), walkMin: round1(walkMinFromMeters(meters)) };
      })
      .sort((a, b) => a.walkMeters - b.walkMeters);

    const originStop = nearest(here, stops);
    const buildingTimes = buildings.map((b) => {
      const walkMin = walkMinFromMeters(walkMetersBetween(here, b));
      let busMin: number | null = null;
      if (walkMin > 20 && originStop) {
        const destStop = nearest(b, stops)!;
        busMin =
          walkMinFromMeters(originStop.meters) + BUS_WAIT_MIN + busRideMin(originStop.item, destStop.item) + walkMinFromMeters(destStop.meters);
      }
      return { buildingCode: b.code, walkMin: round1(walkMin), busMin: busMin === null ? null : round1(busMin), method: "estimate" as const };
    });

    // construction is filled in by the next step (scripts/construction.ts)
    out.push(ListingEnrichment.parse({ listingId: l.id, stops: nearbyStops, places: nearbyPlaces, buildingTimes, construction: [] }));
  }

  writeJson(path.join(PROCESSED, "enrichment.json"), out);
  writeJson(path.join(PROCESSED, "gtfs-stops.json"), stops);
  writeJson(path.join(PROCESSED, "places.json"), places);
  const noStops = out.filter((e) => e.stops.length === 0).length;
  console.log(`  enriched ${out.length} listings (${noStops} with no stop within 800 m)`);
}

main();
