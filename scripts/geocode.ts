/**
 * Step 4: geocode every listing without lat/lng.
 *
 * 1. US Census Geocoder (no key).
 * 2. Fallback: Nominatim (OpenStreetMap), at most 1 request/second, descriptive User-Agent.
 * Results are cached in data/cache/geocode.json (keyed by address), so reruns make no requests.
 * A failure, or a result outside Ann Arbor, is recorded and becomes scam rule R6 in step 5.
 *
 * In:  data/processed/real.json + synthetic.json    Out: data/processed/geocoded.json
 */
import path from "node:path";
import { z } from "zod";
import { inAnnArbor } from "@/lib/geo";
import { DraftListing, GeocodedListing, type GeocodeResult } from "./lib/types";
import { PROCESSED, USER_AGENT, readCache, readJsonValidated, sleep, writeCache, writeJson } from "./lib/util";

interface CacheEntry {
  lat: number | null;
  lng: number | null;
  source: "census" | "nominatim" | "failed";
  matchedAddress: string | null;
}

/** Where to drop a pin we couldn't locate (downtown Ann Arbor). Flagged by R6. */
const FALLBACK = { lat: 42.2808, lng: -83.743 };

async function census(address: string): Promise<CacheEntry | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Census ${res.status}`);
  const json = (await res.json()) as {
    result?: { addressMatches?: { matchedAddress: string; coordinates: { x: number; y: number } }[] };
  };
  const m = json.result?.addressMatches?.[0];
  return m ? { lat: m.coordinates.y, lng: m.coordinates.x, source: "census", matchedAddress: m.matchedAddress } : null;
}

let lastNominatim = 0;
async function nominatim(address: string): Promise<CacheEntry | null> {
  const wait = 1100 - (Date.now() - lastNominatim);
  if (wait > 0) await sleep(wait);
  lastNominatim = Date.now();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const m = json[0];
  return m ? { lat: +m.lat, lng: +m.lon, source: "nominatim", matchedAddress: m.display_name } : null;
}

async function main() {
  const drafts = [
    ...readJsonValidated(path.join(PROCESSED, "real.json"), z.array(DraftListing)),
    ...readJsonValidated(path.join(PROCESSED, "synthetic.json"), z.array(DraftListing)),
  ];
  const cache = readCache<Record<string, CacheEntry>>("geocode.json", {});
  let requests = 0;

  const out: GeocodedListing[] = [];
  for (const l of drafts) {
    let geo: GeocodeResult;
    let lat: number;
    let lng: number;

    if (l.lat !== null && l.lng !== null) {
      ({ lat, lng } = { lat: l.lat, lng: l.lng });
      geo = { ok: true, inAnnArbor: inAnnArbor({ lat, lng }), source: "given", matchedAddress: null };
    } else {
      let hit = cache[l.address];
      if (!hit) {
        requests++;
        let r: CacheEntry | null = null;
        try {
          r = await census(l.address);
        } catch (e) {
          console.warn(`  census error for ${l.address}:`, (e as Error).message);
        }
        if (!r) {
          try {
            r = await nominatim(l.address);
          } catch (e) {
            console.warn(`  nominatim error for ${l.address}:`, (e as Error).message);
          }
        }
        hit = r ?? { lat: null, lng: null, source: "failed", matchedAddress: null };
        cache[l.address] = hit;
        writeCache("geocode.json", cache);
      }
      if (hit.lat !== null && hit.lng !== null) {
        lat = hit.lat;
        lng = hit.lng;
        geo = { ok: true, inAnnArbor: inAnnArbor({ lat, lng }), source: hit.source, matchedAddress: hit.matchedAddress };
      } else {
        ({ lat, lng } = FALLBACK);
        geo = { ok: false, inAnnArbor: false, source: "failed", matchedAddress: null };
      }
    }
    if (!geo.ok || !geo.inAnnArbor) console.warn(`  ⚠ ${l.id} "${l.address}": ${geo.ok ? "outside Ann Arbor" : "could not geocode"}`);
    out.push(GeocodedListing.parse({ ...l, lat: +lat.toFixed(6), lng: +lng.toFixed(6), geocode: geo }));
  }

  writeJson(path.join(PROCESSED, "geocoded.json"), out);
  const by = (s: string) => out.filter((l) => l.geocode.source === s).length;
  console.log(`  ${out.length} listings: census ${by("census")}, nominatim ${by("nominatim")}, given ${by("given")}, failed ${by("failed")} (${requests} new lookups)`);
}

main();
