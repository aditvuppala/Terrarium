"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { RankedListing } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

// Stable reference: a fresh `[]` inside a zustand selector causes an infinite render loop.
const NO_RESULTS: RankedListing[] = [];
const ANN_ARBOR: [number, number] = [42.2808, -83.743];

// divIcon avoids Leaflet's default PNG marker, which breaks under bundlers.
function scoreIcon(score: number, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${selected ? "#00274c" : "#ffcb05"};color:${selected ? "#fff" : "#000"};border:1px solid #000;border-radius:9999px;padding:2px 6px;font:600 12px sans-serif;white-space:nowrap">${Math.round(score)}</div>`,
    iconSize: [32, 20],
    iconAnchor: [16, 10],
  });
}

export default function RankMap() {
  const results = useTerrarium((s) => s.rankResponse?.results ?? NO_RESULTS);
  const selectedId = useTerrarium((s) => s.selectedListingId);
  const select = useTerrarium((s) => s.setSelectedListingId);

  return (
    <MapContainer center={ANN_ARBOR} zoom={14} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {results.map(({ listing, score }) => (
        <Marker
          key={listing.id}
          position={[listing.location.lat, listing.location.lng]}
          icon={scoreIcon(score, listing.id === selectedId)}
          eventHandlers={{ click: () => select(listing.id) }}
        />
      ))}
    </MapContainer>
  );
}
