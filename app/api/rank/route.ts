/** POST /api/rank  RankRequest -> RankResponse (active listings only, deterministic). */
import { jsonError, jsonOk, readJson, serverError } from "@/lib/api";
import { getActiveListings, getAllEnrichment, getBuildings } from "@/lib/data";
import { rank } from "@/lib/rank";
import { RankRequest, RankResponse } from "@/lib/schemas";

export async function POST(req: Request) {
  const parsed = RankRequest.safeParse(await readJson(req));
  if (!parsed.success) return jsonError(400, "Invalid RankRequest", parsed.error.issues);

  try {
    const [listings, enrichment, buildings] = await Promise.all([getActiveListings(), getAllEnrichment(), getBuildings()]);
    return jsonOk(RankResponse, rank(parsed.data.profile, listings, enrichment, buildings));
  } catch (err) {
    return serverError(err);
  }
}
