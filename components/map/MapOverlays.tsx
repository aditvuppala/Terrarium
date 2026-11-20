"use client";

/**
 * Optional explore-map overlays (off by default). Data is precomputed by
 * scripts/overlays.ts into public/overlays/*.geojson and fetched on first toggle.
 *
 * Layers draw on the map's canvas renderer and are sent to the back, so house-view
 * routes stay on top; listing pins are DOM markers above every canvas, so overlays
 * never take their clicks.
 */
import L from "leaflet";
import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import type { Theme } from "@/components/ui/theme";

export type OverlayId = "nightlife" | "students";
export const OVERLAY_IDS: OverlayId[] = ["nightlife", "students"];

interface OverlayMeta {
  source: string;
  vintage?: number;
  retrieved: string;
}
export interface OverlayData extends GeoJSON.FeatureCollection {
  metadata: OverlayMeta;
}

interface Bin {
  min: number;
  label: string;
}

const NIGHTLIFE_BINS: Bin[] = [
  { min: 1, label: "1" },
  { min: 2, label: "2–4" },
  { min: 5, label: "5–8" },
  { min: 9, label: "9+" },
];
const STUDENT_BINS: Bin[] = [
  { min: 0, label: "< 10%" },
  { min: 0.1, label: "10–25%" },
  { min: 0.25, label: "25–50%" },
  { min: 0.5, label: "50–75%" },
  { min: 0.75, label: "75%+" },
];

const PALETTE: Record<OverlayId, Record<Theme, string[]>> = {
  nightlife: {
    light: ["#FBD9A8", "#F4A261", "#E0663A", "#B0302F"],
    dark: ["#6B3A1F", "#A85A2A", "#E0823F", "#FFB36B"],
  },
  students: {
    light: ["#E4EDF8", "#B8CEEB", "#7FA6D6", "#4775BB", "#233F8C"],
    dark: ["#1D2942", "#2A4575", "#3D66A8", "#6D95D8", "#AFC9F2"],
  },
};

export const OVERLAY_INFO: Record<
  OverlayId,
  { pill: string; title: string; note: string; bins: Bin[] }
> = {
  nightlife: {
    pill: "Nightlife",
    title: "Nightlife density (bars & pubs)",
    note: "Shows where bars cluster: bars & pubs within 400 m.",
    bins: NIGHTLIFE_BINS,
  },
  students: {
    pill: "Students",
    title: "Share of residents enrolled in college or grad school",
    note: "Where students live, by census tract.",
    bins: STUDENT_BINS,
  },
};

function binIndex(bins: Bin[], v: number): number {
  let i = 0;
  for (let k = 0; k < bins.length; k++) if (v >= bins[k].min) i = k;
  return i;
}

/** "ACS 2020–2024 5-year" for vintage 2024. */
export function acsLabel(vintage: number | undefined): string {
  return vintage ? `ACS ${vintage - 4}–${vintage} 5-year` : "ACS 5-year";
}

function attributionFor(id: OverlayId, meta: OverlayMeta): string {
  return id === "nightlife"
    ? 'Bars &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    : `U.S. Census Bureau ACS 5-year ${meta.vintage ?? ""}`.trim();
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/* ------------------------------------------------------------------ */
/* Data loading                                                         */
/* ------------------------------------------------------------------ */

const requests = new Map<OverlayId, Promise<OverlayData>>();

function loadOverlay(id: OverlayId): Promise<OverlayData> {
  let p = requests.get(id);
  if (!p) {
    p = fetch(`/overlays/${id}.geojson`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<OverlayData>;
    });
    p.catch(() => requests.delete(id)); // allow a retry on the next toggle
    requests.set(id, p);
  }
  return p;
}

export type OverlayStatus = "idle" | "loading" | "ready" | "error";

/** Fetches the active overlay on first use; returns its data and load status. */
export function useOverlayData(active: OverlayId | null): {
  data: OverlayData | null;
  status: OverlayStatus;
} {
  const [loaded, setLoaded] = useState<Partial<Record<OverlayId, OverlayData | "error">>>({});
  const entry = active ? loaded[active] : undefined;

  useEffect(() => {
    if (!active || (entry && entry !== "error")) return;
    let cancelled = false;
    loadOverlay(active).then(
      (d) => !cancelled && setLoaded((m) => ({ ...m, [active]: d })),
      () => !cancelled && setLoaded((m) => ({ ...m, [active]: "error" })),
    );
    return () => {
      cancelled = true;
    };
  }, [active, entry]);

  if (!active) return { data: null, status: "idle" };
  if (entry === "error") return { data: null, status: "error" };
  if (!entry) return { data: null, status: "loading" };
  return { data: entry, status: "ready" };
}

/* ------------------------------------------------------------------ */
/* Leaflet layer                                                        */
/* ------------------------------------------------------------------ */

const BAR_DOTS_MIN_ZOOM = 15;

export function OverlayLayer({
  id,
  data,
  theme,
}: {
  id: OverlayId;
  data: OverlayData;
  theme: Theme;
}) {
  const map = useMap();

  useEffect(() => {
    const colors = PALETTE[id][theme];
    const bins = OVERLAY_INFO[id].bins;
    const edge = theme === "dark" ? "#0F1612" : "#FFFFFF";
    const fillOpacity = theme === "dark" ? 0.55 : 0.5;

    const areas = L.geoJSON(data, {
      filter: (f) => f.geometry.type !== "Point",
      style: (f) => {
        const p = f?.properties ?? {};
        const v = id === "nightlife" ? Number(p.within400m) : p.share;
        if (v === null || v === undefined || Number.isNaN(v)) {
          return { stroke: true, color: edge, weight: 0.8, fillOpacity: 0 };
        }
        const color = colors[binIndex(bins, Number(v))];
        return id === "nightlife"
          ? { stroke: false, fillColor: color, fillOpacity }
          : { color: edge, weight: 0.8, opacity: 0.7, fillColor: color, fillOpacity };
      },
      onEachFeature: (f, layer) => {
        const p = f.properties ?? {};
        let html: string;
        if (id === "nightlife") {
          const n = Number(p.within400m);
          html = `<div class="font-semibold">${n} bar${n === 1 ? "" : "s"} &amp; pubs within 400 m</div>`;
        } else {
          const share = p.share === null ? "no estimate" : `${Math.round(Number(p.share) * 100)}%`;
          html =
            `<div class="font-semibold">${esc(String(p.name))}</div>` +
            `<div>${share} enrolled in college or grad school</div>` +
            `<div class="text-[#3D5245]">${acsLabel(data.metadata.vintage)} estimate</div>`;
        }
        layer.bindTooltip(html, { className: "terrarium-tooltip", sticky: true });
      },
    });

    const dots = L.geoJSON(data, {
      filter: (f) => f.geometry.type === "Point",
      pointToLayer: (f, latlng) =>
        L.circleMarker(latlng, {
          radius: 3.5,
          weight: 1.5,
          color: edge,
          fillColor: colors[colors.length - 1],
          fillOpacity: 1,
        }).bindTooltip(esc(String(f.properties?.name ?? "Bar")), {
          className: "terrarium-tooltip",
          direction: "top",
          offset: [0, -4],
        }),
    });

    const attribution = attributionFor(id, data.metadata);
    map.attributionControl?.addAttribution(attribution);
    areas.addTo(map);
    areas.bringToBack();

    const syncDots = () => {
      const show = id === "nightlife" && map.getZoom() >= BAR_DOTS_MIN_ZOOM;
      if (show && !map.hasLayer(dots)) {
        dots.addTo(map);
        dots.bringToBack();
        areas.bringToBack();
      } else if (!show && map.hasLayer(dots)) {
        dots.remove();
      }
    };
    syncDots();
    map.on("zoomend", syncDots);

    return () => {
      map.off("zoomend", syncDots);
      dots.remove();
      areas.remove();
      map.attributionControl?.removeAttribution(attribution);
    };
  }, [map, id, data, theme]);

  return null;
}

/* ------------------------------------------------------------------ */
/* Toggles + legend                                                     */
/* ------------------------------------------------------------------ */

export function OverlayControl({
  active,
  onChange,
  status,
  data,
  theme,
}: {
  active: OverlayId | null;
  onChange: (id: OverlayId | null) => void;
  status: OverlayStatus;
  data: OverlayData | null;
  theme: Theme;
}) {
  const info = active ? OVERLAY_INFO[active] : null;
  return (
    <div className="absolute right-3 top-3 z-[850] flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-1.5 sm:max-w-[260px]">
      <div
        role="group"
        aria-label="Map overlays"
        className="flex gap-1 rounded-full border border-[#C8D3C1] bg-[#FCFDFB] p-1 text-[11px] font-semibold text-[#16241B] shadow-md"
      >
        {OVERLAY_IDS.map((id) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              title={OVERLAY_INFO[id].title}
              onClick={() => onChange(on ? null : id)}
              className="rm-ov-pill inline-flex min-h-[30px] items-center gap-1.5 rounded-full px-2.5 transition-colors"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: PALETTE[id].light[PALETTE[id].light.length - 2] }}
              />
              {OVERLAY_INFO[id].pill}
            </button>
          );
        })}
      </div>

      {active && info && (
        <div
          aria-live="polite"
          className="pointer-events-none w-full rounded-xl border border-[#C8D3C1] bg-[#FCFDFB] px-2.5 py-2 text-[11px] text-[#16241B] shadow-md"
        >
          <div className="font-semibold leading-snug">{info.title}</div>
          {status === "loading" && <div className="mt-1 text-[#3D5245]">Loading…</div>}
          {status === "error" && (
            <div className="mt-1 text-[#84231F]">Couldn&apos;t load this layer. Toggle to retry.</div>
          )}
          {status === "ready" && (
            <>
              <div className="mt-1.5 flex">
                {info.bins.map((b, i) => (
                  <div key={b.label} className="min-w-0 flex-1">
                    <div
                      aria-hidden="true"
                      className="h-2.5"
                      style={{
                        background: PALETTE[active][theme][i],
                        opacity: 0.85,
                        borderRadius:
                          i === 0 ? "4px 0 0 4px" : i === info.bins.length - 1 ? "0 4px 4px 0" : 0,
                      }}
                    />
                    <div className="mt-0.5 text-center text-[10px] tabular-nums text-[#3D5245]">
                      {b.label}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[10.5px] leading-snug text-[#3D5245]">{info.note}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-[#3D5245]">
                {active === "nightlife"
                  ? "© OpenStreetMap contributors"
                  : `U.S. Census Bureau, ${acsLabel(data?.metadata.vintage)}`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
