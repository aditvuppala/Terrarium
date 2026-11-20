"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import gtfsStopsJson from "@/data/processed/gtfs-stops.json";
import placesJson from "@/data/processed/places.json";
import {
  BUILDINGS_BY_CODE,
  EMPTY_CATEGORIES,
  EMPTY_COURSES,
  EMPTY_RESULTS,
  PLACE_CATEGORY_LABELS,
} from "@/components/shared/constants";
import { BuildingIcon, BusIcon, PinIcon } from "@/components/ui/Icons";
import type { PlaceCategory, ScoredListing, UMBuilding } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

const ANN_ARBOR: [number, number] = [42.2808, -83.743];

interface RawGtfsStop {
  stopId: string;
  stopName: string;
  agency: "TheRide" | "UM";
  lat: number;
  lng: number;
  routes: { routeId: string; routeName: string; headsigns: string[] }[];
}

interface RawPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
}

/* Filter GTFS stops to Ann Arbor campus & residential area so map rendering stays instant */
const CORE_STOPS: RawGtfsStop[] = (gtfsStopsJson as RawGtfsStop[]).filter(
  (s) => s.lat >= 42.24 && s.lat <= 42.315 && s.lng >= -83.79 && s.lng <= -83.69,
);

const ALL_PLACES: RawPlace[] = placesJson as RawPlace[];

function createListingIcon(item: ScoredListing, selected: boolean): L.DivIcon {
  const { listing, score, rank } = item;
  const isMock = listing.provenance.isSynthetic;
  const isTop3 = rank <= 3;

  const shapeClass = isMock ? "terrarium-pin--mock" : "terrarium-pin--real";
  const toneClass = selected
    ? "terrarium-pin--selected"
    : isTop3
      ? "terrarium-pin--top"
      : "terrarium-pin--default";

  const rankPrefix = isTop3 ? `<span style="opacity:0.82;font-weight:600;font-size:11px">#${rank}</span>` : "";

  return L.divIcon({
    className: "terrarium-pin-wrapper",
    html: `<div class="terrarium-pin ${shapeClass} ${toneClass}">${rankPrefix}<span>${Math.round(score)}</span></div>`,
    iconSize: selected ? [62, 38] : isTop3 ? [56, 32] : [46, 32],
    iconAnchor: selected ? [31, 19] : isTop3 ? [28, 16] : [23, 16],
  });
}

function createBuildingIcon(code: string, confirmed: boolean): L.DivIcon {
  const borderStyle = confirmed ? "2px solid #16241B" : "2px dashed #7A3415";
  const bg = confirmed ? "#DFEAE2" : "#FBF1E8";
  const color = confirmed ? "#16241B" : "#7A3415";
  return L.divIcon({
    className: "terrarium-pin-wrapper",
    html: `<div style="display:inline-flex;align-items:center;justify-content:center;padding:3px 8px;border-radius:6px;background:${bg};color:${color};border:${borderStyle};font:700 11px var(--font-sans,sans-serif);white-space:nowrap;box-shadow:0 2px 5px rgba(22,36,27,0.16)">${code}</div>`,
    iconSize: [48, 24],
    iconAnchor: [24, 12],
  });
}

function MapViewportSync({ selectedListing }: { selectedListing: ScoredListing | null }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  useEffect(() => {
    if (!selectedListing) return;
    const { lat, lng } = selectedListing.listing;
    const target = L.latLng(lat, lng);
    if (!map.getBounds().pad(-0.18).contains(target)) {
      map.panTo(target, { animate: true });
    }
  }, [map, selectedListing]);

  return null;
}

export default function RankMap() {
  const results = useTerrarium((s) => s.rankResponse?.results ?? EMPTY_RESULTS);
  const selectedId = useTerrarium((s) => s.selectedListingId);
  const setSelectedListingId = useTerrarium((s) => s.setSelectedListingId);
  const courses = useTerrarium((s) => s.profile.courses ?? EMPTY_COURSES);
  const placeCategories = useTerrarium((s) => s.profile.placeCategories ?? EMPTY_CATEGORIES);
  const frequentPlaces = useTerrarium((s) => s.profile.frequentPlaces);
  const enrichmentById = useTerrarium((s) => s.enrichmentById);
  const askChatAboutPlaceCategories = useTerrarium((s) => s.askChatAboutPlaceCategories);

  const [showBusStops, setShowBusStops] = useState<boolean>(false);
  const [showUserPlaces, setShowUserPlaces] = useState<boolean>(false);
  const [showClassBuildings, setShowClassBuildings] = useState<boolean>(true);

  const selectedScored = useMemo(
    () => results.find((r) => r.listing.id === selectedId) ?? null,
    [results, selectedId],
  );

  const selectedEnrichment = selectedId ? enrichmentById[selectedId] : undefined;

  const classBuildingItems = useMemo(() => {
    const grouped = new Map<
      string,
      { building: UMBuilding; codes: string[]; allConfirmed: boolean }
    >();
    for (const c of courses) {
      if (!c.buildingCode) continue;
      const b = BUILDINGS_BY_CODE.get(c.buildingCode);
      if (!b) continue;
      const existing = grouped.get(b.code);
      if (existing) {
        if (!existing.codes.includes(c.code)) existing.codes.push(c.code);
        existing.allConfirmed = existing.allConfirmed && c.confirmed;
      } else {
        grouped.set(b.code, {
          building: b,
          codes: [c.code],
          allConfirmed: c.confirmed,
        });
      }
    }
    return [...grouped.values()];
  }, [courses]);

  const filteredCategoryPlaces = useMemo(() => {
    if (!showUserPlaces || placeCategories.length === 0) return [];
    const allowed = new Set(placeCategories);
    return ALL_PLACES.filter((p) => allowed.has(p.category));
  }, [showUserPlaces, placeCategories]);

  const pinnedFrequentPlaces = useMemo(
    () =>
      showUserPlaces
        ? frequentPlaces.filter(
            (p): p is { label: string; lat: number; lng: number; timesPerWeek: number | null } =>
              p.lat !== null && p.lng !== null,
          )
        : [],
    [showUserPlaces, frequentPlaces],
  );

  const highlightedStopIds = useMemo(
    () => new Set(selectedEnrichment?.stops.map((s) => s.stopId) ?? []),
    [selectedEnrichment],
  );

  /* Render lower-ranked pins first so top-3 and selected pins sit cleanly on top */
  const orderedForMap = useMemo(
    () => [...results].reverse(),
    [results],
  );

  return (
    <div className="relative h-full w-full">
      {/* Optional Layer Toggles */}
      <div
        role="group"
        aria-label="Map layer toggles"
        className="absolute left-3 top-3 z-[900] flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={showBusStops}
          onClick={() => setShowBusStops((v) => !v)}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
            showBusStops
              ? "border-[#2F6B47] bg-[#2F6B47] text-white"
              : "border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:bg-[#E6ECE1]"
          }`}
        >
          <BusIcon size={15} />
          <span>Bus stops</span>
        </button>

        <button
          type="button"
          aria-pressed={showUserPlaces}
          onClick={() => setShowUserPlaces((v) => !v)}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
            showUserPlaces
              ? "border-[#2F6B47] bg-[#2F6B47] text-white"
              : "border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:bg-[#E6ECE1]"
          }`}
        >
          <PinIcon size={15} />
          <span>My places</span>
        </button>

        <button
          type="button"
          aria-pressed={showClassBuildings}
          onClick={() => setShowClassBuildings((v) => !v)}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors ${
            showClassBuildings
              ? "border-[#2F6B47] bg-[#2F6B47] text-white"
              : "border-[#C8D3C1] bg-[#FCFDFB] text-[#16241B] hover:bg-[#E6ECE1]"
          }`}
        >
          <BuildingIcon size={15} />
          <span>Class buildings</span>
          {classBuildingItems.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                showClassBuildings ? "bg-white/20 text-white" : "bg-[#DFEAE2] text-[#1C452C]"
              }`}
            >
              {classBuildingItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Helper note if user toggles on an empty user-places layer */}
      {showUserPlaces &&
        filteredCategoryPlaces.length === 0 &&
        pinnedFrequentPlaces.length === 0 && (
          <div className="absolute left-3 top-16 z-[900] flex max-w-xs items-center gap-2.5 rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-3.5 py-2 text-xs text-[#3D5245] shadow-md">
            <span>No place categories chosen yet.</span>
            <button
              type="button"
              onClick={askChatAboutPlaceCategories}
              className="min-h-[36px] shrink-0 rounded-lg bg-[#2F6B47] px-2.5 py-1 font-semibold text-white hover:bg-[#245538]"
            >
              Choose in chat
            </button>
          </div>
        )}

      {/* Compact Map Legend (Bottom-Left) */}
      <div className="pointer-events-none absolute bottom-6 left-3 z-[850] hidden rounded-xl border border-[#C8D3C1] bg-[#FCFDFB]/95 px-3 py-2 text-[11px] text-[#16241B] shadow-sm sm:block">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-full border border-[#16241B] bg-[#2F6B47]" />
            <span>Top 3</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-full border-2 border-[#16241B] bg-[#FCFDFB]" />
            <span>Real listing</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 rounded-[3px] border-2 border-dashed border-[#3D5245] bg-[#FCFDFB]" />
            <span>Mock listing</span>
          </span>
        </div>
      </div>

      <MapContainer
        center={ANN_ARBOR}
        zoom={14}
        zoomControl={false}
        preferCanvas
        className="h-full w-full"
      >
        <ZoomControl position="bottomleft" />
        <MapViewportSync selectedListing={selectedScored} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Optional Layer 1: Bus Stops */}
        {showBusStops &&
          CORE_STOPS.map((stop) => {
            const isNearSelected = highlightedStopIds.has(stop.stopId);
            const isUM = stop.agency === "UM";
            return (
              <CircleMarker
                key={stop.stopId}
                center={[stop.lat, stop.lng]}
                radius={isNearSelected ? 7 : 4.5}
                pathOptions={{
                  color: isNearSelected ? "#16241B" : isUM ? "#1C452C" : "#3D5245",
                  fillColor: isNearSelected ? "#2F6B47" : isUM ? "#2F6B47" : "#6A8273",
                  fillOpacity: isNearSelected ? 0.95 : 0.7,
                  weight: isNearSelected ? 2 : 1,
                }}
              >
                <Tooltip className="terrarium-tooltip" direction="top" offset={[0, -6]}>
                  <div>
                    <div className="font-semibold">
                      {stop.stopName} ({stop.agency === "UM" ? "U-M Transit" : "TheRide"})
                    </div>
                    {stop.routes.length > 0 && (
                      <div className="text-[#3D5245]">
                        {stop.routes
                          .slice(0, 3)
                          .map((r) => r.routeName)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {/* Optional Layer 2: User's Places (selected categories + frequentPlaces) */}
        {showUserPlaces &&
          filteredCategoryPlaces.map((place) => (
            <CircleMarker
              key={place.id}
              center={[place.lat, place.lng]}
              radius={5.5}
              pathOptions={{
                color: "#7A3415",
                fillColor: "#FBF1E8",
                fillOpacity: 0.92,
                weight: 1.8,
              }}
            >
              <Tooltip className="terrarium-tooltip" direction="top" offset={[0, -6]}>
                <div>
                  <span className="font-semibold">{place.name}</span>
                  <span className="ml-1.5 text-[#3D5245]">
                    · {PLACE_CATEGORY_LABELS[place.category]}
                  </span>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

        {pinnedFrequentPlaces.map((fp, idx) => (
          <CircleMarker
            key={`fp-${fp.label}-${idx}`}
            center={[fp.lat, fp.lng]}
            radius={7}
            pathOptions={{
              color: "#16241B",
              fillColor: "#2F6B47",
              fillOpacity: 0.95,
              weight: 2,
            }}
          >
            <Tooltip className="terrarium-tooltip" direction="top" offset={[0, -8]}>
              <div className="font-semibold">Your place: {fp.label}</div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Optional Layer 3: User's Class Buildings */}
        {showClassBuildings &&
          classBuildingItems.map(({ building, codes, allConfirmed }) => (
            <Marker
              key={`bldg-${building.code}`}
              position={[building.lat, building.lng]}
              icon={createBuildingIcon(building.code, allConfirmed)}
              zIndexOffset={400}
            >
              <Tooltip className="terrarium-tooltip" direction="top" offset={[0, -12]}>
                <div>
                  <div className="font-semibold">
                    {building.name} ({building.code})
                  </div>
                  <div className="text-[#3D5245]">
                    Classes: {codes.join(", ")}
                    {!allConfirmed ? " · Please confirm in chat" : ""}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          ))}

        {/* Listing Score Markers */}
        {orderedForMap.map((item) => {
          const isSelected = item.listing.id === selectedId;
          const isTop3 = item.rank <= 3;
          return (
            <Marker
              key={item.listing.id}
              position={[item.listing.lat, item.listing.lng]}
              icon={createListingIcon(item, isSelected)}
              zIndexOffset={isSelected ? 1000 : isTop3 ? 700 - item.rank : 100}
              eventHandlers={{
                click: () => setSelectedListingId(item.listing.id),
              }}
            >
              <Tooltip className="terrarium-tooltip" direction="top" offset={[0, -16]}>
                <div>
                  <div className="font-semibold">
                    #{item.rank} {item.listing.name}
                  </div>
                  <div className="text-[#3D5245]">
                    Score {Math.round(item.score)} ·{" "}
                    {item.listing.provenance.isSynthetic ? "Mock listing" : "Real listing"}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
