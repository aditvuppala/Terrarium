"use client";

import "leaflet/dist/leaflet.css";
import "./map.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { EMPTY_COURSES, EMPTY_RESULTS, formatListingPrice } from "@/components/shared/constants";
import {
  ROUTE_COLORS,
  ROUTE_KINDS,
  ROUTE_LABELS,
  buildHouseRoutes,
  curvedPath,
  formatMin,
  type HouseRoutes,
  type RouteKind,
  type RouteTarget,
} from "@/components/map/houseRoutes";
import { GOLD, RANK_GRADIENT_CSS, TOP_TIER, rankColor } from "@/components/map/rankColors";
import { useTheme } from "@/components/map/useTheme";
import {
  OverlayControl,
  OverlayLayer,
  useOverlayData,
  type OverlayId,
} from "@/components/map/MapOverlays";
import { CAMPUS_CENTROIDS } from "@/lib/geo";
import type { ScoredListing } from "@/lib/schemas";
import { useTerrarium } from "@/lib/store";

const ANN_ARBOR: [number, number] = [42.2808, -83.743];

// Minimal gray canvas basemaps (light + dark) that work without an API key.
// (CARTO's no-label tiles now serve an "API key required" watermark without a key.)
const TILE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const TILE_URL = {
  light: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
} as const;

/** Subtle place names on the label-free basemap, so students still know where campus is. */
const AREA_LABELS: { name: string; lat: number; lng: number }[] = [
  { name: "Central Campus", ...CAMPUS_CENTROIDS.central },
  { name: "North Campus", lat: 42.2935, lng: -83.7165 },
  { name: "Downtown", lat: 42.2806, lng: -83.7494 },
];

function areaLabelIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: "rm-area-wrapper",
    html: `<span class="rm-area">${name}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
const AREA_ICONS = AREA_LABELS.map((a) => ({ ...a, icon: areaLabelIcon(a.name) }));

function listingIcon(
  item: ScoredListing,
  index: number,
  total: number,
  state: "default" | "focused" | "dimmed",
): L.DivIcon {
  const { listing, score, rank } = item;
  const classes = [
    "rm-pin",
    listing.provenance.isSynthetic ? "rm-pin--mock" : "rm-pin--real",
    rank <= TOP_TIER ? "rm-pin--top" : "",
    state === "focused" ? "rm-pin--focused" : "",
    state === "dimmed" ? "rm-pin--dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const label =
    state === "focused"
      ? `<span class="rm-pin__rank">#${rank}</span><span>${Math.round(score)}</span>`
      : `<span>${Math.round(score)}</span>`;
  return L.divIcon({
    className: "rm-pin-wrapper",
    html: `<div class="${classes}" style="--rm-pin:${rankColor(index, total)};--rm-gold:${GOLD}">${label}</div>`,
    iconSize: [40, 28],
    iconAnchor: [20, 14],
  });
}

function routeEndIcon(target: RouteTarget, color: string): L.DivIcon {
  const text =
    target.kind === "classes"
      ? `${escapeHtml(target.label)} · ${formatMin(target.walkMin)}`
      : formatMin(target.walkMin);
  return L.divIcon({
    className: "rm-end-wrapper",
    html: `<span class="rm-end rm-end--${target.kind}" style="--rm-route:${color}">${text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/* ------------------------------------------------------------------ */
/* Viewport: initial fit, house-view zoom in, restore on exit           */
/* ------------------------------------------------------------------ */

function ViewController({
  results,
  focused,
  routes,
  enrichmentLoaded,
}: {
  results: ScoredListing[];
  focused: ScoredListing | null;
  routes: HouseRoutes | null;
  enrichmentLoaded: boolean;
}) {
  const map = useMap();
  const savedView = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const fittedKey = useRef<string | null>(null);
  const didInitialFit = useRef(false);

  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);

  // First time results arrive: frame every listing.
  useEffect(() => {
    if (didInitialFit.current || results.length === 0 || focused) return;
    didInitialFit.current = true;
    const bounds = L.latLngBounds(results.map((r) => [r.listing.lat, r.listing.lng]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15, animate: false });
  }, [map, results, focused]);

  const focusedId = focused?.listing.id ?? null;

  // Enter / leave house view.
  useEffect(() => {
    if (!focusedId) {
      fittedKey.current = null;
      map.keyboard?.enable();
      const saved = savedView.current;
      if (saved) {
        savedView.current = null;
        map.flyTo(saved.center, saved.zoom, { duration: 0.6 });
      }
      return;
    }
    if (!savedView.current) {
      savedView.current = { center: map.getCenter(), zoom: map.getZoom() };
    }
    // Arrow keys belong to house navigation while a house is open.
    map.keyboard?.disable();
  }, [map, focusedId]);

  // Frame the house and its routes; refit once more when the enrichment arrives.
  useEffect(() => {
    if (!focused || !routes) return;
    const key = `${focused.listing.id}|${enrichmentLoaded}`;
    if (fittedKey.current === key) return;
    fittedKey.current = key;
    const h = L.latLng(focused.listing.lat, focused.listing.lng);
    const pts: L.LatLngExpression[] = [h];
    // Local stops and food: mirror them around the house so it stays centered.
    for (const t of [...routes.buses, ...routes.food]) {
      pts.push([t.lat, t.lng], [2 * h.lat - t.lat, 2 * h.lng - t.lng]);
    }
    for (const t of routes.classes) pts.push([t.lat, t.lng]);
    const bounds = L.latLngBounds(pts).pad(0.04);
    map.flyToBounds(bounds, { padding: [64, 64], maxZoom: 17, duration: 0.7 });
  }, [map, focused, routes, enrichmentLoaded]);

  return null;
}

/* ------------------------------------------------------------------ */
/* House view routes                                                    */
/* ------------------------------------------------------------------ */

function RouteLayer({
  from,
  targets,
  color,
  casing,
}: {
  from: { lat: number; lng: number };
  targets: RouteTarget[];
  color: string;
  casing: string;
}) {
  return (
    <>
      {targets.map((t, i) => {
        const path = curvedPath(from, t, (i % 2 === 0 ? 1 : -1) * (0.12 + 0.04 * (i % 3)));
        const tip = (
          <div>
            <div className="font-semibold">{t.detail}</div>
            <div className="text-[#3D5245]">
              ~{formatMin(t.walkMin)} estimated walk
              {t.busMin !== null ? ` · ~${formatMin(t.busMin)} by bus` : ""}
            </div>
            {t.courses.length > 0 && (
              <div className="text-[#3D5245]">Classes: {t.courses.join(", ")}</div>
            )}
            {t.routes.length > 0 && (
              <div className="text-[#3D5245]">Routes: {t.routes.join(", ")}</div>
            )}
            {t.approximate && t.kind === "classes" && (
              <div className="text-[#7A3415]">Approximate destination</div>
            )}
          </div>
        );
        return (
          <RouteLine
            key={t.id}
            path={path}
            target={t}
            color={color}
            casing={casing}
            tip={tip}
          />
        );
      })}
    </>
  );
}

function RouteLine({
  path,
  target,
  color,
  casing,
  tip,
}: {
  path: [number, number][];
  target: RouteTarget;
  color: string;
  casing: string;
  tip: ReactNode;
}) {
  const endIcon = useMemo(() => routeEndIcon(target, color), [target, color]);
  return (
    <>
      <Polyline
        positions={path}
        interactive={false}
        pathOptions={{ color: casing, weight: 7, opacity: 0.75, lineCap: "round" }}
      />
      <Polyline
        positions={path}
        pathOptions={{
          color,
          weight: 3.5,
          opacity: 0.95,
          dashArray: target.kind === "classes" ? "10 7" : "6 6",
          lineCap: "round",
        }}
      >
        <Tooltip className="terrarium-tooltip" sticky>
          {tip}
        </Tooltip>
      </Polyline>
      <CircleMarker
        center={[target.lat, target.lng]}
        radius={target.kind === "classes" ? 7 : 5.5}
        pathOptions={{ color: casing, weight: 2, fillColor: color, fillOpacity: 1 }}
      >
        <Tooltip className="terrarium-tooltip" direction="top" offset={[0, -8]}>
          {tip}
        </Tooltip>
      </CircleMarker>
      {(target.kind === "classes" || target.kind === "buses") && (
        <Marker
          position={[target.lat, target.lng]}
          icon={endIcon}
          interactive={false}
          keyboard={false}
          zIndexOffset={-200}
        />
      )}
    </>
  );
}

function RouteLegend({
  routes,
  visible,
  onToggle,
  colors,
}: {
  routes: HouseRoutes;
  visible: Record<RouteKind, boolean>;
  onToggle: (k: RouteKind) => void;
  colors: Record<RouteKind, string>;
}) {
  return (
    <div className="rm-legend absolute bottom-3 left-3 z-[850] max-w-[calc(100%-5rem)] rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-2.5 py-2 text-[11px] text-[#16241B] shadow-md">
      <div role="group" aria-label="Show or hide routes" className="flex flex-wrap gap-1.5">
        {ROUTE_KINDS.map((k) => {
          const n = routes[k].length;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={visible[k]}
              onClick={() => onToggle(k)}
              disabled={n === 0}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2 py-1 font-semibold transition-opacity disabled:cursor-default disabled:opacity-40 ${
                visible[k]
                  ? "border-[#C8D3C1] bg-[#F3F5EF]"
                  : "border-[#E6ECE1] bg-[#FCFDFB] opacity-55"
              }`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-[3px] w-4 rounded-full"
                style={{ background: colors[k] }}
              />
              <span>
                {k === "classes" && routes.classBasis === "campus" ? "Campus" : ROUTE_LABELS[k]}
              </span>
              <span className="tabular-nums text-[#3D5245]">{n}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 hidden text-[10.5px] leading-snug text-[#3D5245] sm:block">
        Lines are sketches, not street routes. Times are estimated walks.
      </p>
    </div>
  );
}

function RankLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[850] rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-3 py-2 text-[11px] text-[#16241B] shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Best</span>
        <span
          aria-hidden="true"
          className="inline-block h-2 w-24 rounded-full"
          style={{ background: RANK_GRADIENT_CSS }}
        />
        <span className="font-semibold">Lowest</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[#3D5245]">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-4 rounded-full"
            style={{ background: "#15803D", boxShadow: `0 0 0 1.5px #fff, 0 0 0 3px ${GOLD}` }}
          />
          Top 10
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-4 rounded-full bg-[#3D5245]" />
          Real
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-4 rounded-[3px] bg-[#3D5245]" />
          Mock
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Map                                                                  */
/* ------------------------------------------------------------------ */

const ALL_VISIBLE: Record<RouteKind, boolean> = { classes: true, buses: true, food: true };

export default function RankMap() {
  const results = useTerrarium((s) => s.rankResponse?.results ?? EMPTY_RESULTS);
  const selectedId = useTerrarium((s) => s.selectedListingId);
  const setSelectedListingId = useTerrarium((s) => s.setSelectedListingId);
  const courses = useTerrarium((s) => s.profile.courses ?? EMPTY_COURSES);
  const majorCampus = useTerrarium((s) => s.profile.majorCampus);
  const enrichment = useTerrarium((s) => (selectedId ? s.enrichmentById[selectedId] : undefined));
  const theme = useTheme();
  const [visible, setVisible] = useState<Record<RouteKind, boolean>>(ALL_VISIBLE);
  const [overlay, setOverlay] = useState<OverlayId | null>(null);
  const overlayData = useOverlayData(overlay);

  const focusedIndex = useMemo(
    () => (selectedId ? results.findIndex((r) => r.listing.id === selectedId) : -1),
    [results, selectedId],
  );
  const focused = focusedIndex >= 0 ? results[focusedIndex] : null;

  const routes = useMemo(
    () => (focused ? buildHouseRoutes(focused.listing, enrichment, courses, majorCampus) : null),
    [focused, enrichment, courses, majorCampus],
  );

  // Icons are rebuilt only when ranking, focus or result count changes.
  const icons = useMemo(() => {
    const total = results.length;
    return results.map((item, index) =>
      listingIcon(
        item,
        index,
        total,
        !focused ? "default" : item.listing.id === focused.listing.id ? "focused" : "dimmed",
      ),
    );
  }, [results, focused]);

  // Draw worst first so better listings sit on top.
  const drawOrder = useMemo(() => results.map((_, i) => results.length - 1 - i), [results]);

  const colors = ROUTE_COLORS[theme];
  const casing = theme === "dark" ? "#0F1612" : "#FFFFFF";

  return (
    <div className={`rm-root relative h-full w-full ${focused ? "rm-root--house" : ""}`}>
      <MapContainer
        center={ANN_ARBOR}
        zoom={14}
        maxZoom={18}
        zoomControl={false}
        preferCanvas
        className="h-full w-full"
        aria-label={
          focused
            ? `Map focused on ${focused.listing.name} with estimated routes`
            : "Map of ranked Ann Arbor listings"
        }
      >
        <ZoomControl position="bottomright" />
        <ViewController
          results={results}
          focused={focused}
          routes={routes}
          enrichmentLoaded={Boolean(enrichment)}
        />

        <TileLayer
          key={theme}
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL[theme]}
          maxNativeZoom={16}
          maxZoom={18}
        />

        {overlay && overlayData.data && (
          <OverlayLayer id={overlay} data={overlayData.data} theme={theme} />
        )}

        {AREA_ICONS.map((a) => (
          <Marker
            key={a.name}
            position={[a.lat, a.lng]}
            icon={a.icon}
            interactive={false}
            keyboard={false}
            zIndexOffset={-1000}
          />
        ))}

        {focused &&
          routes &&
          ROUTE_KINDS.filter((k) => visible[k]).map((k) => (
            <RouteLayer
              key={`${focused.listing.id}-${k}`}
              from={focused.listing}
              targets={routes[k]}
              color={colors[k]}
              casing={casing}
            />
          ))}

        {drawOrder.map((index) => {
          const item = results[index];
          const isFocused = focused?.listing.id === item.listing.id;
          return (
            <Marker
              key={item.listing.id}
              position={[item.listing.lat, item.listing.lng]}
              icon={icons[index]}
              title={`#${item.rank} ${item.listing.name}, score ${Math.round(item.score)}`}
              zIndexOffset={isFocused ? 2000 : 1000 - index}
              eventHandlers={{
                click: () => setSelectedListingId(item.listing.id),
              }}
            >
              {!isFocused && (
                <Tooltip className="terrarium-tooltip" direction="top" offset={[0, -14]}>
                  <div>
                    <div className="font-semibold">
                      #{item.rank} {item.listing.name}
                    </div>
                    <div className="text-[#3D5245]">
                      Score {Math.round(item.score)} · {formatListingPrice(item.listing)}
                      {item.listing.provenance.isSynthetic ? " · Mock listing" : ""}
                    </div>
                  </div>
                </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      <OverlayControl
        active={overlay}
        onChange={setOverlay}
        status={overlayData.status}
        data={overlayData.data}
        theme={theme}
      />

      {focused && routes ? (
        <RouteLegend
          routes={routes}
          visible={visible}
          colors={colors}
          onToggle={(k) => setVisible((v) => ({ ...v, [k]: !v[k] }))}
        />
      ) : (
        <RankLegend />
      )}
    </div>
  );
}
