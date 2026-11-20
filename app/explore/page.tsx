"use client";

import { useEffect } from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import ListingCard from "@/components/listing/ListingCard";
import MapPanel from "@/components/map/MapPanel";
import { RankResponseSchema, type RankRequest } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

export default function Explore() {
  const profile = useTerrarium((s) => s.profile);
  const setRankResponse = useTerrarium((s) => s.setRankResponse);

  // Re-rank whenever the profile changes.
  useEffect(() => {
    const controller = new AbortController();
    const body: RankRequest = { profile };
    fetch("/api/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`rank ${r.status}`))))
      .then((json) => setRankResponse(RankResponseSchema.parse(json)))
      .catch((err) => {
        if (!controller.signal.aborted) console.error(err);
      });
    return () => controller.abort();
  }, [profile, setRankResponse]);

  return (
    <main className="flex h-screen w-full">
      <section className="relative h-full w-3/5">
        <MapPanel />
        <ListingCard />
      </section>
      <section className="h-full w-2/5 border-l">
        <ChatPanel />
      </section>
    </main>
  );
}
