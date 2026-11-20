/** Intermediate shapes used between pipeline stages. Final output is lib/schemas.ts `Listing`. */
import { z } from "zod";
import { Listing } from "@/lib/schemas";

/** A listing before geocoding and scam assessment. Hand-entered or generated. */
export const DraftListing = Listing.omit({ scam: true, lat: true, lng: true }).extend({
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type DraftListing = z.infer<typeof DraftListing>;

export const GeocodeResult = z.object({
  ok: z.boolean(),
  inAnnArbor: z.boolean(),
  source: z.enum(["given", "census", "nominatim", "failed"]),
  matchedAddress: z.string().nullable(),
});
export type GeocodeResult = z.infer<typeof GeocodeResult>;

export const GeocodedListing = DraftListing.extend({
  lat: z.number(),
  lng: z.number(),
  geocode: GeocodeResult,
});
export type GeocodedListing = z.infer<typeof GeocodedListing>;
