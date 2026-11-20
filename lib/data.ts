/**
 * Repository layer. Every read of listings, enrichment, or buildings goes
 * through this interface. Backed by SQLite (data/terrarium.db, built by
 * `npm run db:build`). Rows are validated against lib/schemas.ts on the way out.
 * Server-only.
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { buildings, enrichment, listings } from "@/lib/db/schema";
import { Listing, ListingEnrichment, UMBuilding } from "@/lib/schemas";

export interface Repository {
  /** Listings shown to students: scam.status "active" only. */
  getActiveListings(): Promise<Listing[]>;
  /** Any listing by id, including quarantined ones. */
  getListing(id: string): Promise<Listing | null>;
  getEnrichment(id: string): Promise<ListingEnrichment | null>;
  getAllEnrichment(): Promise<ListingEnrichment[]>;
  getBuildings(): Promise<UMBuilding[]>;
}

type ListingRow = typeof listings.$inferSelect;

function toListing(row: ListingRow): Listing {
  const { isSynthetic: _s, scamStatus: _st, ...rest } = row;
  return Listing.parse(rest);
}

const sqliteRepository: Repository = {
  async getActiveListings() {
    return getDb().select().from(listings).where(eq(listings.scamStatus, "active")).all().map(toListing);
  },
  async getListing(id) {
    const row = getDb().select().from(listings).where(eq(listings.id, id)).get();
    return row ? toListing(row) : null;
  },
  async getEnrichment(id) {
    const row = getDb().select().from(enrichment).where(eq(enrichment.listingId, id)).get();
    return row ? ListingEnrichment.parse(row) : null;
  },
  async getAllEnrichment() {
    return getDb().select().from(enrichment).all().map((r) => ListingEnrichment.parse(r));
  },
  async getBuildings() {
    return getDb().select().from(buildings).all().map((r) => UMBuilding.parse(r));
  },
};

/** The active repository. Swap the implementation here, nowhere else. */
export const repo: Repository = sqliteRepository;

export const getActiveListings = () => repo.getActiveListings();
export const getListing = (id: string) => repo.getListing(id);
export const getEnrichment = (id: string) => repo.getEnrichment(id);
export const getAllEnrichment = () => repo.getAllEnrichment();
export const getBuildings = () => repo.getBuildings();
