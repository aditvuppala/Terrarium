/**
 * The "house view" route targets: class buildings, nearest bus stops and food.
 * We have no routing engine, so these are drawn as gentle curves and every time
 * is an estimate (from enrichment, or straight line x 1.3 at 80 m/min).
 */
import { BUILDINGS_BY_CODE } from "@/components/shared/constants";
import { CAMPUS_CENTROIDS, walkMetersBetween, walkMinFromMeters } from "@/lib/geo";
import type { Course, Listing, ListingEnrichment, PlaceCategory, UserProfile } from "@/lib/schemas";

export type RouteKind = "classes" | "buses" | "food";

export interface RouteTarget {
  id: string;
  kind: RouteKind;
  /** Short label for map chips (building code, stop name, place name). */
  label: string;
  /** Longer description for tooltips and the panel. */
  detail: string;
  lat: number;
  lng: number;
  walkMin: number;
  busMin: number | null;
  /** Bus route names (buses only). */
  routes: string[];
  /** Course codes (classes only). */
  courses: string[];
  /** True when the destination itself is a guess (campus centroid, unconfirmed building). */
  approximate: boolean;
}

export interface HouseRoutes {
  classes: RouteTarget[];
  buses: RouteTarget[];
  food: RouteTarget[];
  /** Where the class targets came from, for honest UI copy. */
  classBasis: "courses" | "campus";
}

export const ROUTE_KINDS: RouteKind[] = ["classes", "buses", "food"];

export const ROUTE_LABELS: Record<RouteKind, string> = {
  classes: "Classes",
  buses: "Bus stops",
  food: "Food",
};

/** Line colors, tuned for the light and dark basemaps. */
export const ROUTE_COLORS: Record<"light" | "dark", Record<RouteKind, string>> = {
  light: { classes: "#2563C9", buses: "#7C3AED", food: "#D9541E" },
  dark: { classes: "#6EA8FF", buses: "#B59CFF", food: "#FF9A62" },
};

const FOOD_CATEGORIES: PlaceCategory[] = ["restaurant", "cafe", "fast_food", "grocery"];
export const FOOD_LABELS: Partial<Record<PlaceCategory, string>> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  fast_food: "Fast food",
  grocery: "Grocery",
};

const MAX_BUSES = 3;
const MAX_FOOD = 6;

function estimateWalk(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  return walkMinFromMeters(walkMetersBetween(from, to));
}

function classTargets(
  listing: Listing,
  enrichment: ListingEnrichment | undefined,
  courses: Course[],
  majorCampus: UserProfile["majorCampus"],
): { targets: RouteTarget[]; basis: HouseRoutes["classBasis"] } {
  const btByCode = new Map((enrichment?.buildingTimes ?? []).map((b) => [b.buildingCode, b]));
  const grouped = new Map<string, RouteTarget>();
  for (const c of courses) {
    if (!c.buildingCode) continue;
    const b = BUILDINGS_BY_CODE.get(c.buildingCode);
    if (!b) continue;
    const existing = grouped.get(b.code);
    if (existing) {
      if (!existing.courses.includes(c.code)) existing.courses.push(c.code);
      existing.approximate = existing.approximate || !c.confirmed;
      continue;
    }
    const bt = btByCode.get(b.code);
    grouped.set(b.code, {
      id: `class-${b.code}`,
      kind: "classes",
      label: b.code,
      detail: b.name,
      lat: b.lat,
      lng: b.lng,
      walkMin: bt?.walkMin ?? estimateWalk(listing, b),
      busMin: bt?.busMin ?? null,
      routes: [],
      courses: [c.code],
      approximate: !c.confirmed,
    });
  }
  if (grouped.size > 0) {
    return {
      targets: [...grouped.values()].sort((a, b) => a.walkMin - b.walkMin),
      basis: "courses",
    };
  }

  const campuses: { key: "central" | "north"; name: string }[] =
    majorCampus === "north"
      ? [{ key: "north", name: "North Campus" }]
      : majorCampus === "both"
        ? [
            { key: "central", name: "Central Campus" },
            { key: "north", name: "North Campus" },
          ]
        : [{ key: "central", name: "Central Campus" }];
  return {
    targets: campuses.map(({ key, name }) => {
      const p = CAMPUS_CENTROIDS[key];
      return {
        id: `campus-${key}`,
        kind: "classes" as const,
        label: name,
        detail: majorCampus ? `${name} (from your major)` : `${name} (default until you add classes)`,
        lat: p.lat,
        lng: p.lng,
        walkMin: estimateWalk(listing, p),
        busMin: null,
        routes: [],
        courses: [],
        approximate: true,
      };
    }),
    basis: "campus",
  };
}

export function buildHouseRoutes(
  listing: Listing,
  enrichment: ListingEnrichment | undefined,
  courses: Course[],
  majorCampus: UserProfile["majorCampus"],
): HouseRoutes {
  const { targets: classes, basis } = classTargets(listing, enrichment, courses, majorCampus);

  const buses: RouteTarget[] = (enrichment?.stops ?? [])
    .slice()
    .sort((a, b) => a.walkMin - b.walkMin)
    .slice(0, MAX_BUSES)
    .map((s) => ({
      id: `stop-${s.stopId}`,
      kind: "buses" as const,
      label: s.stopName,
      detail: `${s.stopName} (${s.agency === "UM" ? "U-M Transit" : "TheRide"})`,
      lat: s.lat,
      lng: s.lng,
      walkMin: s.walkMin,
      busMin: null,
      routes: [...new Set(s.routes.map((r) => r.routeName))],
      courses: [],
      approximate: false,
    }));

  // A handful of the nearest food places, always including the nearest grocery store.
  const foodPool = (enrichment?.places ?? [])
    .filter((p) => FOOD_CATEGORIES.includes(p.category))
    .sort((a, b) => a.walkMin - b.walkMin);
  const nearestGrocery = foodPool.find((p) => p.category === "grocery");
  const picked = foodPool.slice(0, MAX_FOOD);
  if (nearestGrocery && !picked.includes(nearestGrocery)) {
    picked.splice(MAX_FOOD - 1, 1, nearestGrocery);
  }
  const food: RouteTarget[] = picked.map((p, i) => ({
    id: `food-${i}-${p.name}`,
    kind: "food" as const,
    label: p.name,
    detail: `${p.name} · ${FOOD_LABELS[p.category] ?? p.category}`,
    lat: p.lat,
    lng: p.lng,
    walkMin: p.walkMin,
    busMin: null,
    routes: [],
    courses: [],
    approximate: false,
  }));

  return { classes, buses, food, classBasis: basis };
}

export function formatMin(min: number): string {
  if (min < 1) return "<1 min";
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = Math.round(min - h * 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return `${Math.round(min)} min`;
}

/** Gently curved line between two points (quadratic bezier, sampled). */
export function curvedPath(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  bend: number,
  samples = 28,
): [number, number][] {
  const k = Math.cos((from.lat * Math.PI) / 180);
  // Work in an approximately metric plane so the bend looks even in every direction.
  const ax = from.lng * k;
  const ay = from.lat;
  const bx = to.lng * k;
  const by = to.lat;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const cx = mx - dy * bend;
  const cy = my + dx * bend;
  const pts: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    const x = u * u * ax + 2 * u * t * cx + t * t * bx;
    const y = u * u * ay + 2 * u * t * cy + t * t * by;
    pts.push([y, x / k]);
  }
  return pts;
}
