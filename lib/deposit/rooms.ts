import type { Room, VaultState } from "./types";

/** Things worth capturing in every room. Kitchens and bathrooms get a few extras. */
const BASE = ["Walls & ceiling", "Floors / carpet", "Windows & screens", "Doors & locks", "Outlets & lights", "Existing damage (close-up)"];

const EXTRA: Record<string, string[]> = {
  kitchen: ["Fridge (inside & out)", "Stove & oven", "Sink & faucet", "Cabinets & counters", "Dishwasher / microwave"],
  bath: ["Toilet", "Tub / shower & grout", "Sink & vanity", "Mirror & fan"],
  bed: ["Closet", "Blinds / curtains"],
  living: ["Smoke detector", "Thermostat", "Front door & peephole"],
};

export function suggestionsFor(roomName: string): string[] {
  const n = roomName.toLowerCase();
  const extra =
    /kitchen/.test(n) ? EXTRA.kitchen
    : /bath|toilet|restroom/.test(n) ? EXTRA.bath
    : /bed/.test(n) ? EXTRA.bed
    : /living|entry|hall/.test(n) ? EXTRA.living
    : [];
  return [...BASE, ...extra];
}

export function newId(prefix = "id"): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}

export const DEFAULT_ROOMS: Room[] = [
  { id: "room-entry", name: "Entry / Living room" },
  { id: "room-kitchen", name: "Kitchen" },
  { id: "room-bath", name: "Bathroom" },
  { id: "room-bed1", name: "Bedroom 1" },
];

export function defaultState(): VaultState {
  return { rooms: DEFAULT_ROOMS.map((r) => ({ ...r })), leaseStart: "", leaseEnd: "", checks: {} };
}
