import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getActiveListings, getEnrichment } from "@/lib/data";
import { rank } from "@/lib/rank";
import { RankRequestSchema, RankResponseSchema, type ListingEnrichment } from "@/lib/schemas";

export async function POST(req: Request) {
  const parsed = RankRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "Invalid RankRequest", parsed.error.issues);

  // Quarantined listings never reach the ranker or the client.
  const listings = (await getActiveListings()).filter((l) => l.scam.status !== "quarantined");
  const enrichments = (await Promise.all(listings.map((l) => getEnrichment(l.id)))).filter(
    (e): e is ListingEnrichment => e !== null,
  );

  return jsonOk(RankResponseSchema, rank(parsed.data.profile, listings, enrichments));
}
