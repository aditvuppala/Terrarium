/**
 * Rent splitter: one round of bids -> a room assignment plus envy-free prices.
 *
 * Model
 * -----
 * n roommates, n rooms, total monthly rent R. Each roommate i says what every room r is worth
 * to them, v_i(r), and each person's bids add up to exactly R. Utilities are quasi-linear:
 * person i in room r at price p_r is as happy as v_i(r) - p_r (their "surplus").
 *
 * Steps
 * -----
 * 1. Assignment. Pick the permutation sigma (person -> room) that maximizes total bid value
 *    sum_i v_i(sigma(i)). n <= 6 so brute force over all n! <= 720 permutations is instant.
 *    Permutations are visited in lexicographic order and only a strictly better total replaces
 *    the incumbent, so ties always resolve to the lexicographically smallest assignment.
 *
 * 2. Prices. Person i (in room a = sigma(i)) does not envy room r iff
 *        v_i(a) - p_a >= v_i(r) - p_r   <=>   p_a - p_r <= v_i(a) - v_i(r) =: c(r -> a).
 *    That is a system of difference constraints. Read c(r -> a) as an edge r -> a with weight c;
 *    any shortest-path distance function d satisfies d(a) <= d(r) + c(r -> a), i.e. it is a
 *    feasible price vector. A negative cycle would be a cyclic swap of rooms that raises total
 *    bid value, which cannot exist because sigma maximizes it, so the system is always feasible.
 *
 *    The feasible prices form a convex set (closed under adding the same constant to every
 *    price). Its extremes are found with Bellman-Ford:
 *      - forward, shortest paths FROM room k:  every other room as expensive as possible
 *        relative to room k (room k is as cheap as the constraints allow);
 *      - reverse, minus shortest paths TO room k: every other room as cheap as possible
 *        relative to room k (room k is as expensive as the constraints allow).
 *    (A single virtual source joined to every room, the textbook trick, can return the same
 *    vector, up to a shift, for both the forward and reverse systems: with two rooms both land
 *    on the same end of the fair range. Anchoring at each room in turn finds both ends.)
 *    We average all 2n extreme vectors. Convexity keeps the average feasible, and it treats every
 *    room symmetrically: it sits in the middle of the fair range instead of at one end of it.
 *    Finally every price is shifted by the same constant so they sum to R. A uniform shift
 *    leaves every difference p_a - p_r unchanged, so the prices stay envy-free.
 *
 * 3. Money. All bids are integer cents. The averaged, shifted prices are exact rationals with
 *    denominator 2n^2, kept as integers (scaled by 2n^2) so nothing is lost to floating point.
 *    To get cents we take each price's floor, then give the k leftover cents (k = R - sum of
 *    floors) to k rooms, one cent each, so the total is exact. Each price is within one cent of
 *    its exact value. Among all C(n, k) ways to hand out those cents we pick the one with the
 *    least envy, then the least total rounding error, then the earliest rooms. Largest-remainder
 *    rounding is one of the candidates and can create at most 1 cent of envy, so the chosen
 *    rounding never exceeds 1 cent of envy and is usually exactly envy-free. Zero envy in whole
 *    cents is not always possible: two rooms everyone values the same, with an odd-cent rent,
 *    must differ by a cent.
 */

export const MIN_PEOPLE = 2;
export const MAX_PEOPLE = 6;

export interface SplitRoom {
  name: string;
  /** Optional detail like "private bath". */
  note?: string;
}

export interface SplitPerson {
  name: string;
}

export interface SplitInput {
  /** Total monthly rent in integer cents. */
  totalCents: number;
  rooms: SplitRoom[];
  people: SplitPerson[];
  /** bids[person][room] in integer cents; each row sums to totalCents. */
  bids: number[][];
}

export type SplitIssueCode =
  | "rent"
  | "count"
  | "mismatch"
  | "room-name"
  | "person-name"
  | "duplicate-name"
  | "bid-value"
  | "bid-sum";

export interface SplitIssue {
  code: SplitIssueCode;
  message: string;
  /** Person index, for per-person problems. */
  person?: number;
  /** Room index, for per-room problems. */
  room?: number;
}

export interface SplitRow {
  person: number;
  room: number;
  /** Price in cents. */
  price: number;
  /** What this person bid for their room, in cents. */
  bid: number;
  /** bid - price, in cents. */
  surplus: number;
}

export interface SplitResult {
  /** roomOf[person] = room index. */
  roomOf: number[];
  /** personIn[room] = person index. */
  personIn: number[];
  /** Final prices per room in integer cents, summing to totalCents. */
  prices: number[];
  /** Exact (unrounded) prices per room in cents. */
  exactPrices: number[];
  /** One row per person, in input order. */
  rows: SplitRow[];
  /** surplus[person][room] = bids[person][room] - prices[room], in cents. */
  surplus: number[][];
  /** Largest amount (cents) by which anyone prefers another room at its price. 0 or 1. */
  maxEnvyCents: number;
  /** Total bid value of the assignment, in cents. */
  welfare: number;
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

/** Every problem with the input, in a stable order. Empty array = solvable. */
export function validateSplit(input: SplitInput): SplitIssue[] {
  const issues: SplitIssue[] = [];
  const { totalCents, rooms, people, bids } = input;

  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    issues.push({ code: "rent", message: "Enter the total monthly rent (more than $0)." });
  }
  if (people.length < MIN_PEOPLE || people.length > MAX_PEOPLE) {
    issues.push({
      code: "count",
      message: `The splitter works for ${MIN_PEOPLE} to ${MAX_PEOPLE} roommates.`,
    });
  }
  if (rooms.length !== people.length) {
    issues.push({ code: "mismatch", message: "There must be exactly one room per roommate." });
  }
  rooms.forEach((r, i) => {
    if (!r.name.trim()) issues.push({ code: "room-name", message: `Room ${i + 1} needs a name.`, room: i });
  });
  people.forEach((p, i) => {
    if (!p.name.trim()) {
      issues.push({ code: "person-name", message: `Roommate ${i + 1} needs a name.`, person: i });
    }
  });
  const seen = new Map<string, number>();
  people.forEach((p, i) => {
    const key = p.name.trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) {
      issues.push({
        code: "duplicate-name",
        message: `Two roommates are called "${p.name.trim()}". Give each a different name.`,
        person: i,
      });
    } else seen.set(key, i);
  });

  if (bids.length !== people.length || bids.some((row) => row.length !== rooms.length)) {
    issues.push({ code: "mismatch", message: "Every roommate needs one bid per room." });
    return issues;
  }
  bids.forEach((row, i) => {
    const bad = row.findIndex((b) => !Number.isSafeInteger(b) || b < 0);
    if (bad >= 0) {
      issues.push({
        code: "bid-value",
        message: `${label(people[i]?.name, i)}: bids must be $0 or more.`,
        person: i,
        room: bad,
      });
      return;
    }
    const sum = row.reduce((a, b) => a + b, 0);
    if (Number.isSafeInteger(totalCents) && totalCents > 0 && sum !== totalCents) {
      const diff = totalCents - sum;
      issues.push({
        code: "bid-sum",
        message:
          diff > 0
            ? `${label(people[i]?.name, i)} still has ${formatCents(diff)} to assign.`
            : `${label(people[i]?.name, i)} has assigned ${formatCents(-diff)} too much.`,
        person: i,
      });
    }
  });
  return issues;
}

function label(name: string | undefined, i: number): string {
  return name?.trim() || `Roommate ${i + 1}`;
}

// ---------------------------------------------------------------------------------------------
// Step 1: assignment
// ---------------------------------------------------------------------------------------------

/** Calls visit(perm) for every permutation of 0..n-1 in lexicographic order. */
function forEachPermutation(n: number, visit: (perm: readonly number[]) => void): void {
  const perm = Array.from({ length: n }, (_, i) => i);
  for (;;) {
    visit(perm);
    // Next lexicographic permutation (Narayana Pandita).
    let i = n - 2;
    while (i >= 0 && perm[i] >= perm[i + 1]) i--;
    if (i < 0) return;
    let j = n - 1;
    while (perm[j] <= perm[i]) j--;
    [perm[i], perm[j]] = [perm[j], perm[i]];
    for (let a = i + 1, b = n - 1; a < b; a++, b--) [perm[a], perm[b]] = [perm[b], perm[a]];
  }
}

/**
 * roomOf[person] maximizing total bid value. Ties go to the lexicographically smallest
 * assignment (person 0 gets the lowest-numbered room possible, then person 1, ...).
 */
export function maxWelfareAssignment(bids: number[][]): number[] {
  const n = bids.length;
  let best: number[] = [];
  let bestValue = -Infinity;
  forEachPermutation(n, (perm) => {
    let value = 0;
    for (let i = 0; i < n; i++) value += bids[i][perm[i]];
    if (value > bestValue) {
      bestValue = value;
      best = [...perm];
    }
  });
  return best;
}

// ---------------------------------------------------------------------------------------------
// Step 2: envy-free prices
// ---------------------------------------------------------------------------------------------

interface Edge {
  from: number;
  to: number;
  weight: number;
}

/**
 * Edges of the difference-constraint graph: for each person i in room a and each other room r,
 * p_a - p_r <= v_i(a) - v_i(r) becomes edge r -> a with that weight.
 */
function constraintEdges(bids: number[][], roomOf: number[]): Edge[] {
  const n = bids.length;
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    const a = roomOf[i];
    for (let r = 0; r < n; r++) {
      if (r !== a) edges.push({ from: r, to: a, weight: bids[i][a] - bids[i][r] });
    }
  }
  return edges;
}

/** Bellman-Ford single-source shortest paths. Throws on a negative cycle. */
function bellmanFord(n: number, edges: Edge[], source: number): number[] {
  const dist = Array<number>(n).fill(Infinity);
  dist[source] = 0;
  for (let pass = 0; pass < n - 1; pass++) {
    let changed = false;
    for (const e of edges) {
      if (dist[e.from] + e.weight < dist[e.to]) {
        dist[e.to] = dist[e.from] + e.weight;
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const e of edges) {
    if (dist[e.from] + e.weight < dist[e.to]) {
      // Impossible for a welfare-maximizing assignment; guards against misuse.
      throw new Error("No envy-free prices exist for this assignment.");
    }
  }
  return dist;
}

/**
 * Exact envy-free prices for the assignment, scaled by 2n^2 so they are integers.
 * Returns { scaled, scale } with sum(scaled) = totalCents * scale.
 */
function exactScaledPrices(
  bids: number[][],
  roomOf: number[],
  totalCents: number,
): { scaled: number[]; scale: number } {
  const n = bids.length;
  const forward = constraintEdges(bids, roomOf);
  const reverse = forward.map((e) => ({ from: e.to, to: e.from, weight: e.weight }));

  // S[a] = sum over the 2n extreme vectors of their price for room a.
  const S = Array<number>(n).fill(0);
  for (let k = 0; k < n; k++) {
    const from = bellmanFord(n, forward, k); // room k as cheap as possible
    const to = bellmanFord(n, reverse, k); // dist(a -> k); prices -to: room k as dear as possible
    for (let a = 0; a < n; a++) S[a] += from[a] - to[a];
  }
  // Average: S[a] / (2n). Shift so the prices sum to R:
  //   p_a = S[a]/(2n) + (R - sum(S)/(2n)) / n
  // Scaled by 2n^2:  P_a = n*S[a] + 2n*R - sum(S)   (an integer).
  const sumS = S.reduce((x, y) => x + y, 0);
  const scale = 2 * n * n;
  const scaled = S.map((s) => n * s + 2 * n * totalCents - sumS);
  return { scaled, scale };
}

// ---------------------------------------------------------------------------------------------
// Step 3: rounding to cents
// ---------------------------------------------------------------------------------------------

/** Largest amount (cents) anyone prefers another room by, at these prices. */
function maxEnvy(bids: number[][], roomOf: number[], prices: number[]): number {
  let worst = 0;
  for (let i = 0; i < bids.length; i++) {
    const own = bids[i][roomOf[i]] - prices[roomOf[i]];
    for (let r = 0; r < prices.length; r++) worst = Math.max(worst, bids[i][r] - prices[r] - own);
  }
  return worst;
}

/** All k-element subsets of 0..n-1, in lexicographic order. */
function subsets(n: number, k: number): number[][] {
  const out: number[][] = [];
  const pick = (start: number, acc: number[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < n; i++) pick(i + 1, [...acc, i]);
  };
  pick(0, []);
  return out;
}

function roundPrices(
  bids: number[][],
  roomOf: number[],
  scaled: number[],
  scale: number,
  totalCents: number,
): number[] {
  const n = scaled.length;
  const floors = scaled.map((P) => Math.floor(P / scale));
  const k = totalCents - floors.reduce((a, b) => a + b, 0); // 0 <= k < n
  let best = floors;
  let bestKey: [number, number] = [Infinity, Infinity];
  for (const up of subsets(n, k)) {
    const prices = [...floors];
    for (const a of up) prices[a] += 1;
    const envy = maxEnvy(bids, roomOf, prices);
    // Rounding error in scaled units, summed over rooms.
    const error = prices.reduce((sum, p, a) => sum + Math.abs(p * scale - scaled[a]), 0);
    if (envy < bestKey[0] || (envy === bestKey[0] && error < bestKey[1])) {
      bestKey = [envy, error];
      best = prices;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------
// Public solver
// ---------------------------------------------------------------------------------------------

/** Solve a split. Throws if validateSplit(input) reports any issue. */
export function solveSplit(input: SplitInput): SplitResult {
  const issues = validateSplit(input);
  if (issues.length) throw new Error(issues.map((i) => i.message).join(" "));
  const { bids, totalCents } = input;
  const n = bids.length;

  const roomOf = maxWelfareAssignment(bids);
  const personIn = Array<number>(n);
  roomOf.forEach((r, i) => (personIn[r] = i));

  const { scaled, scale } = exactScaledPrices(bids, roomOf, totalCents);
  const prices = roundPrices(bids, roomOf, scaled, scale, totalCents);

  const surplus = bids.map((row) => row.map((v, r) => v - prices[r]));
  const rows: SplitRow[] = roomOf.map((room, person) => ({
    person,
    room,
    price: prices[room],
    bid: bids[person][room],
    surplus: bids[person][room] - prices[room],
  }));
  return {
    roomOf,
    personIn,
    prices,
    exactPrices: scaled.map((P) => P / scale),
    rows,
    surplus,
    maxEnvyCents: maxEnvy(bids, roomOf, prices),
    welfare: roomOf.reduce((sum, r, i) => sum + bids[i][r], 0),
  };
}

// ---------------------------------------------------------------------------------------------
// Money helpers (shared with the UI)
// ---------------------------------------------------------------------------------------------

/**
 * Parse a dollar amount typed by a person ("1,200", "$812.5", " 90.05 ") into integer cents.
 * Empty input -> 0. Returns null for anything that is not a non-negative amount with at most
 * two decimals.
 */
export function parseDollars(text: string): number | null {
  const t = text.replace(/[\s$,]/g, "");
  if (t === "") return 0;
  const m = /^(\d*)(?:\.(\d{0,2}))?$/.exec(t);
  if (!m || (m[1] === "" && (m[2] ?? "") === "")) return null;
  const cents = Number(m[1] || "0") * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 81250 -> "$812.50", -500 -> "-$5.00". */
export function formatCents(cents: number): string {
  return USD.format(cents / 100);
}

/** Cents as a plain input value: 81250 -> "812.50", 90000 -> "900". */
export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** Split totalCents into n near-equal integer parts (the first rooms take any extra cent). */
export function evenSplit(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n);
  const extra = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}
