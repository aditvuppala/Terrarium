export type Phase = "move-in" | "move-out";

export const PHASES: { id: Phase; label: string }[] = [
  { id: "move-in", label: "Move-in" },
  { id: "move-out", label: "Move-out" },
];

export type Room = { id: string; name: string };

/** Everything about one photo/video except the file bytes (which live in a separate store). */
export type VaultItem = {
  id: string;
  phase: Phase;
  roomId: string;
  kind: "photo" | "video";
  fileName: string;
  size: number;
  mimeType: string;
  /** File.lastModified (ms since epoch) as reported by the browser. */
  lastModified: number;
  /** When the user added it to the vault (ms since epoch). */
  addedAt: number;
  /** Lowercase hex SHA-256 of the file bytes, or null if the browser couldn't compute it. */
  sha256: string | null;
  note: string;
};

export type VaultState = {
  rooms: Room[];
  /** YYYY-MM-DD or "" */
  leaseStart: string;
  /** YYYY-MM-DD or "" */
  leaseEnd: string;
  /** Checked suggestions, keyed by `${phase}:${roomId}`. */
  checks: Record<string, string[]>;
};

export function checkKey(phase: Phase, roomId: string): string {
  return `${phase}:${roomId}`;
}
