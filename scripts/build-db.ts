/**
 * `npm run db:build`: recreate data/terrarium.db from data/ in one go.
 * Offline and deterministic: reads only committed files (data/processed/*.json,
 * data/um-buildings.json). To refresh those, run `npm run pipeline`.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DDL, buildings, enrichment, gtfsStopRoutes, gtfsStops, listings, places } from "@/lib/db/schema";
import { Listing, ListingEnrichment, PlaceCategory, UMBuilding } from "@/lib/schemas";
import { DATA, PROCESSED, readJsonValidated } from "./lib/util";

const GtfsStopFile = z.array(
  z.object({
    stopId: z.string(),
    stopName: z.string(),
    agency: z.enum(["TheRide", "UM"]),
    lat: z.number(),
    lng: z.number(),
    routes: z.array(z.object({ routeId: z.string(), routeName: z.string(), headsigns: z.array(z.string()) })),
  }),
);
const PlaceFile = z.array(z.object({ id: z.string(), name: z.string(), category: PlaceCategory, lat: z.number(), lng: z.number() }));

const DB_FILE = path.join(DATA, "terrarium.db");

function main() {
  const L = readJsonValidated(path.join(PROCESSED, "listings.json"), z.array(Listing));
  const E = readJsonValidated(path.join(PROCESSED, "enrichment.json"), z.array(ListingEnrichment));
  const B = readJsonValidated(path.join(DATA, "um-buildings.json"), z.array(UMBuilding));
  const S = readJsonValidated(path.join(PROCESSED, "gtfs-stops.json"), GtfsStopFile);
  const P = readJsonValidated(path.join(PROCESSED, "places.json"), PlaceFile);

  const ids = new Set(L.map((l) => l.id));
  const missing = [...ids].filter((id) => !E.some((e) => e.listingId === id));
  if (missing.length) throw new Error(`Listings without enrichment: ${missing.join(", ")}. Run \`npm run pipeline\`.`);

  for (const f of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) if (existsSync(f)) rmSync(f);
  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = DELETE");
  sqlite.exec(DDL);
  const db = drizzle(sqlite);

  db.transaction((tx) => {
    for (const l of L) {
      tx.insert(listings).values({ ...l, isSynthetic: l.provenance.isSynthetic, scamStatus: l.scam.status }).run();
    }
    for (const e of E) tx.insert(enrichment).values(e).run();
    for (const b of B) tx.insert(buildings).values(b).run();
    for (const s of S) {
      tx.insert(gtfsStops).values({ stopId: s.stopId, agency: s.agency, stopName: s.stopName, lat: s.lat, lng: s.lng }).run();
      for (const r of s.routes) tx.insert(gtfsStopRoutes).values({ stopId: s.stopId, ...r }).run();
    }
    for (const p of P) tx.insert(places).values(p).run();
  });

  const count = (t: string) => (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
  const q = (sqlite.prepare(`SELECT COUNT(*) AS n FROM listings WHERE scam_status = 'quarantined'`).get() as { n: number }).n;
  const syn = (sqlite.prepare(`SELECT COUNT(*) AS n FROM listings WHERE is_synthetic = 1`).get() as { n: number }).n;
  console.log(`✓ data/terrarium.db`);
  console.log(`  listings ${count("listings")} (${L.length - syn} real, ${syn} synthetic, ${q} quarantined)`);
  console.log(`  enrichment ${count("enrichment")} · buildings ${count("buildings")} · gtfs_stops ${count("gtfs_stops")} · gtfs_stop_routes ${count("gtfs_stop_routes")} · places ${count("places")}`);
  sqlite.close();
}
main();
