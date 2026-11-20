/**
 * Repository layer. Every read of listings, enrichment, or buildings goes
 * through this interface, so the JSON files can later be replaced by a DB
 * without touching callers. Server-only (uses fs).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  ListingEnrichmentSchema,
  ListingSchema,
  UMBuildingSchema,
  type Listing,
  type ListingEnrichment,
  type UMBuilding,
} from "@/lib/schemas";

export interface Repository {
  getActiveListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
  getEnrichment(id: string): Promise<ListingEnrichment | null>;
  getBuildings(): Promise<UMBuilding[]>;
}

const SEED_DIR = path.join(process.cwd(), "data", "seed");

async function readSeed<T extends z.ZodType>(file: string, schema: T): Promise<z.infer<T>> {
  const raw = await readFile(path.join(SEED_DIR, file), "utf8");
  return schema.parse(JSON.parse(raw));
}

const jsonRepository: Repository = {
  async getActiveListings() {
    const all = await readSeed("listings.json", z.array(ListingSchema));
    return all.filter((l) => l.active);
  },
  async getListing(id) {
    const all = await readSeed("listings.json", z.array(ListingSchema));
    return all.find((l) => l.id === id) ?? null;
  },
  async getEnrichment(id) {
    const all = await readSeed("enrichment.json", z.array(ListingEnrichmentSchema));
    return all.find((e) => e.listingId === id) ?? null;
  },
  async getBuildings() {
    return readSeed("buildings.json", z.array(UMBuildingSchema));
  },
};

/** The active repository. Swap the implementation here, nowhere else. */
export const repo: Repository = jsonRepository;

export const getActiveListings = () => repo.getActiveListings();
export const getListing = (id: string) => repo.getListing(id);
export const getEnrichment = (id: string) => repo.getEnrichment(id);
export const getBuildings = () => repo.getBuildings();
