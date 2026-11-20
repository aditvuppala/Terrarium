"use client";

import { useEffect, useState } from "react";
import { ListingDetailResponse, type ListingEnrichment } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

/* One request per listing at a time, shared by every caller. */
const inflight = new Map<string, Promise<ListingEnrichment>>();

export function fetchEnrichment(id: string): Promise<ListingEnrichment> {
  const cached = useTerrarium.getState().enrichmentById[id];
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(id);
  if (pending) return pending;
  const p = fetch(`/api/listings/${encodeURIComponent(id)}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load listing details (${res.status})`);
      return res.json();
    })
    .then((json) => {
      const parsed = ListingDetailResponse.parse(json);
      useTerrarium.getState().cacheEnrichment(id, parsed.enrichment);
      return parsed.enrichment;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/** Loads (and caches in the store) the enrichment for a listing. */
export function useListingEnrichment(id: string | null): {
  enrichment: ListingEnrichment | undefined;
  error: string | null;
} {
  const enrichment = useTerrarium((s) => (id ? s.enrichmentById[id] : undefined));
  const [errorFor, setErrorFor] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!id || enrichment) return;
    let alive = true;
    fetchEnrichment(id).catch((err: unknown) => {
      if (alive) {
        setErrorFor({ id, message: err instanceof Error ? err.message : "Could not load details" });
      }
    });
    return () => {
      alive = false;
    };
  }, [id, enrichment]);

  return { enrichment, error: errorFor && errorFor.id === id ? errorFor.message : null };
}
