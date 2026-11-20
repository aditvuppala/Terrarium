"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at import time, so it must never render on the server.
const RankMap = dynamic(() => import("@/components/map/RankMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Loading map…</div>,
});

export default function MapPanel() {
  return <RankMap />;
}
