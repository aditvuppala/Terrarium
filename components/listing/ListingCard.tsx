"use client";

import { useTerrarium } from "@/lib/store";

/** STUB side card for the selected marker. */
export default function ListingCard() {
  const selectedId = useTerrarium((s) => s.selectedListingId);
  const result = useTerrarium((s) => s.rankResponse?.results.find((r) => r.listing.id === selectedId));
  const close = useTerrarium((s) => s.setSelectedListingId);

  if (!result) return null;
  const { listing, score } = result;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-64 rounded border bg-background p-3 shadow">
      <button onClick={() => close(null)} className="float-right text-sm" aria-label="Close">
        ✕
      </button>
      <h2 className="font-semibold">{listing.name}</h2>
      <p>Score: {Math.round(score)}</p>
      <p className="text-sm">{listing.isSynthetic ? "Mock listing" : "Real listing"}</p>
    </div>
  );
}
