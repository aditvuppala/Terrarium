"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useState } from "react";

function MapLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#E6ECE1] text-sm font-medium text-[#3D5245]">
      Loading Ann Arbor map...
    </div>
  );
}

// Leaflet touches `window` at import time, so it must never render on the server.
const RankMap = dynamic(() => import("@/components/map/RankMap"), {
  ssr: false,
  loading: MapLoading,
});

export default function MapPanel() {
  // With Cache Components, Next.js hides visited pages with <Activity> instead of
  // unmounting them. react-leaflet can't survive that: re-showing the page re-runs its
  // effects on a map that was already removed ("Map container is being reused by another
  // instance"). So unmount the map while hidden and mount a fresh one when shown again.
  // See node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md
  const [mountId, setMountId] = useState(0);

  useLayoutEffect(() => {
    // Intentional: this effect is the only signal that the page was shown again.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMountId((n) => n + 1);
    return () => setMountId(0);
  }, []);

  if (mountId === 0) return <MapLoading />;
  return <RankMap key={mountId} />;
}
