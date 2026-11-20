/** Form state for the rent splitter and its conversion to the pure solver's input. */
import {
  MAX_PEOPLE,
  MIN_PEOPLE,
  centsToInput,
  evenSplit,
  formatCents,
  parseDollars,
  validateSplit,
  type SplitInput,
  type SplitIssue,
} from "@/lib/split";

export interface DraftRoom {
  name: string;
  note: string;
}

export interface Draft {
  /** Total rent as typed. */
  rent: string;
  rooms: DraftRoom[];
  /** Roommate names as typed (blank = "Roommate N"). */
  people: string[];
  /** bids[person][room] as typed. */
  bids: string[][];
}

export const DEFAULT_COUNT = 4;

export function emptyDraft(n = DEFAULT_COUNT): Draft {
  return {
    rent: "",
    rooms: Array.from({ length: n }, (_, i) => ({ name: `Room ${i + 1}`, note: "" })),
    people: Array<string>(n).fill(""),
    bids: Array.from({ length: n }, () => Array<string>(n).fill("")),
  };
}

/** Grow or shrink to n rooms and n roommates, keeping what was already typed. */
export function resizeDraft(d: Draft, n: number): Draft {
  const size = Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, n));
  const rooms = Array.from({ length: size }, (_, i) => d.rooms[i] ?? { name: `Room ${i + 1}`, note: "" });
  const people = Array.from({ length: size }, (_, i) => d.people[i] ?? "");
  const bids = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, r) => d.bids[i]?.[r] ?? ""),
  );
  return { ...d, rooms, people, bids };
}

export const personName = (d: Draft, i: number) => d.people[i]?.trim() || `Roommate ${i + 1}`;
export const roomName = (d: Draft, r: number) => d.rooms[r]?.name.trim() || `Room ${r + 1}`;

/** Rent in cents, or null if blank/invalid/zero. */
export function rentCents(d: Draft): number | null {
  if (!d.rent.trim()) return null;
  const c = parseDollars(d.rent);
  return c && c > 0 ? c : null;
}

/** Sum of a person's parsed bids (invalid cells count as 0). */
export function bidSum(d: Draft, person: number): number {
  return d.bids[person].reduce((s, t) => s + (parseDollars(t) ?? 0), 0);
}

export const cellInvalid = (text: string) => parseDollars(text) === null;

/** Fill one person's bids with an even split of the rent. */
export function evenRow(d: Draft, person: number): Draft {
  const total = rentCents(d);
  if (total === null) return d;
  const row = evenSplit(total, d.rooms.length).map(centsToInput);
  return { ...d, bids: d.bids.map((r, i) => (i === person ? row : r)) };
}

export function evenAll(d: Draft): Draft {
  const total = rentCents(d);
  if (total === null) return d;
  const row = evenSplit(total, d.rooms.length).map(centsToInput);
  return { ...d, bids: d.bids.map(() => [...row]) };
}

/**
 * Problems with one person's bids (used by pass-the-phone before handing the phone on).
 * Empty = this person is done.
 */
export function personIssues(d: Draft, person: number): string[] {
  const total = rentCents(d);
  const out: string[] = [];
  d.bids[person].forEach((t, r) => {
    if (cellInvalid(t)) out.push(`Your bid for ${roomName(d, r)} isn't a dollar amount.`);
  });
  if (out.length || total === null) return out;
  const left = total - bidSum(d, person);
  if (left > 0) out.push(`You still have ${formatCents(left)} to assign.`);
  if (left < 0) out.push(`You've assigned ${formatCents(-left)} more than the rent.`);
  return out;
}

export interface DraftCheck {
  input: SplitInput | null;
  issues: SplitIssue[];
}

/** Parse the whole form. input is non-null only when there are no issues. */
export function checkDraft(d: Draft): DraftCheck {
  const parseIssues: SplitIssue[] = [];
  const bids = d.bids.map((row, i) =>
    row.map((t, r) => {
      const c = parseDollars(t);
      if (c === null) {
        parseIssues.push({
          code: "bid-value",
          message: `${personName(d, i)}'s bid for ${roomName(d, r)} isn't a dollar amount.`,
          person: i,
          room: r,
        });
        return 0;
      }
      return c;
    }),
  );
  const rent = d.rent.trim() ? parseDollars(d.rent) : 0;
  const input: SplitInput = {
    totalCents: rent ?? 0,
    rooms: d.rooms.map((room, r) => ({ name: roomName(d, r), note: room.note.trim() || undefined })),
    people: d.people.map((_, i) => ({ name: personName(d, i) })),
    bids,
  };
  const issues = [...validateSplit(input), ...parseIssues];
  // A person with an unparseable cell gets the parse message, not a misleading sum message.
  const withBadCell = new Set(parseIssues.map((i) => i.person));
  const filtered = issues.filter((i) => !(i.code === "bid-sum" && withBadCell.has(i.person)));
  return { input: filtered.length ? null : input, issues: filtered };
}
