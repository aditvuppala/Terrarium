import { jsonError, jsonOk } from "@/lib/api";
import { getEnrichment, getListing } from "@/lib/data";
import { ListingDetailResponseSchema } from "@/lib/schemas";

export async function GET(_req: Request, ctx: RouteContext<"/api/listings/[id]">) {
  const { id } = await ctx.params;
  const listing = await getListing(id);
  // Quarantined listings are hidden everywhere, so treat them as not found.
  if (!listing || listing.scam.status === "quarantined") return jsonError(404, "Listing not found");

  const enrichment = await getEnrichment(id);
  return jsonOk(ListingDetailResponseSchema, { listing, enrichment });
}
