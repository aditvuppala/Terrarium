/** GET /api/listings/[id] -> ListingDetailResponse, or 404 (unknown or quarantined). */
import { jsonError, jsonOk, serverError } from "@/lib/api";
import { getEnrichment, getListing } from "@/lib/data";
import { ListingDetailResponse } from "@/lib/schemas";

export async function GET(_req: Request, ctx: RouteContext<"/api/listings/[id]">) {
  const { id } = await ctx.params;
  try {
    const listing = await getListing(id);
    // Quarantined listings stay in the DB (with reasons) but are never served to students.
    if (!listing || listing.scam.status === "quarantined") return jsonError(404, "Listing not found");
    const enrichment = await getEnrichment(id);
    if (!enrichment) return jsonError(500, `No enrichment for ${id}. Run \`npm run db:build\`.`);
    return jsonOk(ListingDetailResponse, { listing, enrichment });
  } catch (err) {
    return serverError(err);
  }
}
