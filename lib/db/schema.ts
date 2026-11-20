/**
 * SQLite tables (Drizzle). Arrays/objects are JSON text columns.
 * The DB is a build artifact: `npm run db:build` recreates data/terrarium.db
 * from data/processed/*.json and data/um-buildings.json.
 */
import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Listing, ListingEnrichment } from "@/lib/schemas";

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    rentMin: real("rent_min").notNull(),
    rentMax: real("rent_max").notNull(),
    priceBasis: text("price_basis").notNull(),
    rentNegotiable: text("rent_negotiable").notNull(),
    bedsMin: real("beds_min").notNull(),
    bedsMax: real("beds_max").notNull(),
    bathsMin: real("baths_min"),
    bathsMax: real("baths_max"),
    sqftMin: real("sqft_min"),
    sqftMax: real("sqft_max"),
    leaseType: text("lease_type").notNull(),
    leaseStart: text("lease_start"),
    leaseEnd: text("lease_end"),
    leaseMonths: real("lease_months"),
    furnished: text("furnished").notNull(),
    parking: text("parking").notNull(),
    petsAllowed: text("pets_allowed").notNull(),
    inUnitLaundry: text("in_unit_laundry").notNull(),
    utilitiesIncluded: text("utilities_included", { mode: "json" }).$type<Listing["utilitiesIncluded"]>().notNull(),
    description: text("description").notNull(),
    photos: text("photos", { mode: "json" }).$type<Listing["photos"]>().notNull(),
    provenance: text("provenance", { mode: "json" }).$type<Listing["provenance"]>().notNull(),
    isSynthetic: integer("is_synthetic", { mode: "boolean" }).notNull(),
    scam: text("scam", { mode: "json" }).$type<Listing["scam"]>().notNull(),
    scamStatus: text("scam_status").notNull(),
  },
  (t) => [index("listings_scam_status").on(t.scamStatus)],
);

export const enrichment = sqliteTable("enrichment", {
  listingId: text("listing_id").primaryKey().references(() => listings.id),
  stops: text("stops", { mode: "json" }).$type<ListingEnrichment["stops"]>().notNull(),
  places: text("places", { mode: "json" }).$type<ListingEnrichment["places"]>().notNull(),
  buildingTimes: text("building_times", { mode: "json" }).$type<ListingEnrichment["buildingTimes"]>().notNull(),
});

export const buildings = sqliteTable("buildings", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  campus: text("campus").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const gtfsStops = sqliteTable("gtfs_stops", {
  stopId: text("stop_id").primaryKey(), // "<agency>:<gtfs stop_id>"
  agency: text("agency").notNull(),
  stopName: text("stop_name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

export const gtfsStopRoutes = sqliteTable(
  "gtfs_stop_routes",
  {
    stopId: text("stop_id").notNull().references(() => gtfsStops.stopId),
    routeId: text("route_id").notNull(),
    routeName: text("route_name").notNull(),
    headsigns: text("headsigns", { mode: "json" }).$type<string[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.stopId, t.routeId] })],
);

export const places = sqliteTable("places", {
  id: text("id").primaryKey(), // "osm:node/123"
  name: text("name").notNull(),
  category: text("category").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
});

/** DDL kept next to the Drizzle definitions; scripts/build-db.ts runs it on a fresh file. */
export const DDL = `
CREATE TABLE listings (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
  rent_min REAL NOT NULL, rent_max REAL NOT NULL, price_basis TEXT NOT NULL, rent_negotiable TEXT NOT NULL,
  beds_min REAL NOT NULL, beds_max REAL NOT NULL, baths_min REAL, baths_max REAL, sqft_min REAL, sqft_max REAL,
  lease_type TEXT NOT NULL, lease_start TEXT, lease_end TEXT, lease_months REAL,
  furnished TEXT NOT NULL, parking TEXT NOT NULL, pets_allowed TEXT NOT NULL, in_unit_laundry TEXT NOT NULL,
  utilities_included TEXT NOT NULL, description TEXT NOT NULL, photos TEXT NOT NULL, provenance TEXT NOT NULL,
  is_synthetic INTEGER NOT NULL, scam TEXT NOT NULL, scam_status TEXT NOT NULL
);
CREATE INDEX listings_scam_status ON listings (scam_status);
CREATE TABLE enrichment (
  listing_id TEXT PRIMARY KEY REFERENCES listings(id), stops TEXT NOT NULL, places TEXT NOT NULL, building_times TEXT NOT NULL
);
CREATE TABLE buildings (code TEXT PRIMARY KEY, name TEXT NOT NULL, campus TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL);
CREATE TABLE gtfs_stops (stop_id TEXT PRIMARY KEY, agency TEXT NOT NULL, stop_name TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL);
CREATE TABLE gtfs_stop_routes (
  stop_id TEXT NOT NULL REFERENCES gtfs_stops(stop_id), route_id TEXT NOT NULL, route_name TEXT NOT NULL, headsigns TEXT NOT NULL,
  PRIMARY KEY (stop_id, route_id)
);
CREATE TABLE places (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL);
`;
