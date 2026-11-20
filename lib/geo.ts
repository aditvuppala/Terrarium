/** Small geo helpers shared by scripts and lib/rank.ts. Pure functions. */

export interface Point {
  lat: number;
  lng: number;
}

export function haversineMeters(a: Point, b: Point): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Street-network detour factor applied to straight-line distance. */
export const DETOUR = 1.3;
/** Walking speed, meters per minute (~4.8 km/h). */
export const WALK_M_PER_MIN = 80;
/** Average wait for a bus, minutes (assumption). */
export const BUS_WAIT_MIN = 8;
/** Average in-service bus speed, km/h (assumption). */
export const BUS_KMH = 20;
/** Average in-town driving speed, km/h (assumption), plus parking overhead. */
export const DRIVE_KMH = 30;
export const DRIVE_PARK_MIN = 5;

export const walkMetersBetween = (a: Point, b: Point) => haversineMeters(a, b) * DETOUR;
export const walkMinFromMeters = (m: number) => m / WALK_M_PER_MIN;

export function busRideMin(a: Point, b: Point): number {
  return ((haversineMeters(a, b) * DETOUR) / 1000 / BUS_KMH) * 60;
}

export function driveMin(a: Point, b: Point): number {
  return ((haversineMeters(a, b) * DETOUR) / 1000 / DRIVE_KMH) * 60 + DRIVE_PARK_MIN;
}

export const round1 = (x: number) => Math.round(x * 10) / 10;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Rough Ann Arbor bounding box (south, west, north, east). */
export const ANN_ARBOR_BBOX = { south: 42.215, west: -83.8, north: 42.33, east: -83.665 } as const;

export function inAnnArbor(p: Point): boolean {
  const b = ANN_ARBOR_BBOX;
  return p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east;
}

/** Campus centroids used when we know the campus but no specific buildings. */
export const CAMPUS_CENTROIDS = {
  central: { lat: 42.277, lng: -83.7382 },
  north: { lat: 42.2915, lng: -83.7166 },
} as const;
