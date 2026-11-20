import { describe, expect, it } from "vitest";
import {
  centsToInput,
  evenSplit,
  formatCents,
  maxWelfareAssignment,
  parseDollars,
  solveSplit,
  validateSplit,
  type SplitInput,
} from "@/lib/split";

/** Small seeded PRNG (mulberry32) so random instances are reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random bids for n people that each sum exactly to totalCents. */
function randomBids(rand: () => number, n: number, totalCents: number, coarse = false): number[][] {
  return Array.from({ length: n }, () => {
    const weights = Array.from({ length: n }, () => (coarse ? Math.floor(rand() * 4) : rand()) + 0.05);
    const sumW = weights.reduce((a, b) => a + b, 0);
    const row = weights.map((w) => Math.floor((w / sumW) * totalCents));
    row[n - 1] += totalCents - row.reduce((a, b) => a + b, 0);
    return row;
  });
}

function makeInput(bids: number[][], totalCents: number): SplitInput {
  const n = bids.length;
  return {
    totalCents,
    rooms: Array.from({ length: n }, (_, i) => ({ name: `Room ${i + 1}` })),
    people: Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}` })),
    bids,
  };
}

function bruteForceBestWelfare(bids: number[][]): number {
  const n = bids.length;
  let best = -Infinity;
  const go = (i: number, used: boolean[], acc: number) => {
    if (i === n) {
      best = Math.max(best, acc);
      return;
    }
    for (let r = 0; r < n; r++) {
      if (used[r]) continue;
      used[r] = true;
      go(i + 1, used, acc + bids[i][r]);
      used[r] = false;
    }
  };
  go(0, Array(n).fill(false), 0);
  return best;
}

describe("solveSplit on random instances", () => {
  const rand = rng(20261120);
  const cases: { bids: number[][]; total: number }[] = [];
  for (let t = 0; t < 400; t++) {
    const n = 2 + (t % 5); // 2..6
    const total = 100_00 + Math.floor(rand() * 900_000); // $100 .. $9,100, odd cents included
    cases.push({ bids: randomBids(rand, n, total, t % 3 === 0), total });
  }

  it("prices sum exactly to the rent", () => {
    for (const { bids, total } of cases) {
      const res = solveSplit(makeInput(bids, total));
      expect(res.prices.reduce((a, b) => a + b, 0)).toBe(total);
      res.prices.forEach((p) => expect(Number.isInteger(p)).toBe(true));
    }
  });

  it("exact prices are envy-free and rounded prices are within a cent", () => {
    for (const { bids, total } of cases) {
      const res = solveSplit(makeInput(bids, total));
      const n = bids.length;
      for (let i = 0; i < n; i++) {
        const own = res.roomOf[i];
        for (let r = 0; r < n; r++) {
          // Exact prices: no envy (tiny float tolerance; exact values are k / (2n^2) cents).
          const exactGap = bids[i][r] - res.exactPrices[r] - (bids[i][own] - res.exactPrices[own]);
          expect(exactGap).toBeLessThanOrEqual(1e-6);
          // Rounded prices: envy of at most one cent.
          expect(res.surplus[i][r] - res.surplus[i][own]).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(res.prices[own] - res.exactPrices[own])).toBeLessThan(1);
      }
      expect(res.maxEnvyCents).toBeLessThanOrEqual(1);
    }
  });

  it("almost always rounds with zero envy", () => {
    const envious = cases.filter(({ bids, total }) => solveSplit(makeInput(bids, total)).maxEnvyCents > 0);
    expect(envious.length).toBeLessThanOrEqual(cases.length * 0.02);
  });

  it("uses a welfare-maximizing assignment", () => {
    for (const { bids, total } of cases) {
      const res = solveSplit(makeInput(bids, total));
      expect(res.welfare).toBe(bruteForceBestWelfare(bids));
      expect([...res.roomOf].sort()).toEqual(bids.map((_, i) => i));
      res.roomOf.forEach((r, i) => expect(res.personIn[r]).toBe(i));
    }
  });

  it("is deterministic", () => {
    for (const { bids, total } of cases.slice(0, 50)) {
      expect(solveSplit(makeInput(bids, total))).toEqual(solveSplit(makeInput(bids, total)));
    }
  });
});

describe("solveSplit special cases", () => {
  it("equal bids give an equal split", () => {
    const total = 3600_00;
    const bids = Array.from({ length: 4 }, () => Array(4).fill(900_00));
    const res = solveSplit(makeInput(bids, total));
    expect(res.prices).toEqual([900_00, 900_00, 900_00, 900_00]);
    expect(res.maxEnvyCents).toBe(0);
  });

  it("equal bids with an uneven rent differ by at most a cent", () => {
    const total = 1000_01; // $1,000.01 across 3 rooms
    const row = evenSplit(total, 3);
    const res = solveSplit(makeInput([row, row, row], total));
    expect(res.prices.reduce((a, b) => a + b, 0)).toBe(total);
    expect(Math.max(...res.prices) - Math.min(...res.prices)).toBeLessThanOrEqual(1);
    expect(res.maxEnvyCents).toBe(0); // bids already differ by the same cent
  });

  it("everyone agreeing on room values gives prices equal to those values", () => {
    const row = [1200_00, 900_00, 800_00, 700_00];
    const res = solveSplit(makeInput([row, row, row, row], 3600_00));
    expect(res.prices).toEqual(row);
    res.rows.forEach((r) => expect(r.surplus).toBe(0));
  });

  it("breaks ties deterministically toward the lexicographically smallest assignment", () => {
    const row = [500_00, 500_00, 500_00];
    expect(maxWelfareAssignment([row, row, row])).toEqual([0, 1, 2]);
    // Persons 0 and 1 are identical, both prefer room 2; person 2 is indifferent.
    const tie = [
      [100, 100, 400],
      [100, 100, 400],
      [200, 200, 200],
    ];
    expect(maxWelfareAssignment(tie)).toEqual([0, 2, 1]);
    expect(solveSplit(makeInput(tie, 600)).roomOf).toEqual([0, 2, 1]);
  });

  it("gives each person the room they clearly want most", () => {
    const bids = [
      [2000_00, 800_00, 800_00],
      [600_00, 2400_00, 600_00],
      [700_00, 700_00, 2200_00],
    ];
    const res = solveSplit(makeInput(bids, 3600_00));
    expect(res.roomOf).toEqual([0, 1, 2]);
    res.rows.forEach((r) => expect(r.surplus).toBeGreaterThanOrEqual(0));
  });

  it("splits a two-room disagreement in the middle of the fair range", () => {
    // A: p1 - p2 <= 20; B: p1 - p2 >= 10. Midpoint difference is 15.
    const res = solveSplit(makeInput([[60, 40], [55, 45]], 100));
    expect(res.roomOf).toEqual([0, 1]);
    expect(res.exactPrices).toEqual([57.5, 42.5]);
    expect(res.prices.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("validateSplit", () => {
  const good = makeInput(
    [
      [600, 400],
      [500, 500],
    ],
    1000,
  );

  it("accepts a valid input", () => {
    expect(validateSplit(good)).toEqual([]);
  });

  it("rejects bad rent, counts, names and bids", () => {
    expect(validateSplit({ ...good, totalCents: 0 }).map((i) => i.code)).toContain("rent");
    expect(validateSplit({ ...good, totalCents: 10.5 }).map((i) => i.code)).toContain("rent");
    const one = makeInput([[1000]], 1000);
    expect(validateSplit(one).map((i) => i.code)).toContain("count");
    const seven = makeInput(Array.from({ length: 7 }, () => evenSplit(700, 7)), 700);
    expect(validateSplit(seven).map((i) => i.code)).toContain("count");
    expect(validateSplit({ ...good, rooms: [{ name: "A" }] }).map((i) => i.code)).toContain("mismatch");
    expect(validateSplit({ ...good, people: [{ name: " " }, { name: "B" }] }).map((i) => i.code)).toContain(
      "person-name",
    );
    expect(validateSplit({ ...good, rooms: [{ name: "" }, { name: "B" }] }).map((i) => i.code)).toContain(
      "room-name",
    );
    expect(validateSplit({ ...good, people: [{ name: "Sam" }, { name: "sam " }] }).map((i) => i.code)).toContain(
      "duplicate-name",
    );
    expect(validateSplit({ ...good, bids: [[600, -1], [500, 500]] }).map((i) => i.code)).toContain("bid-value");
    expect(validateSplit({ ...good, bids: [[600, 400.5], [500, 500]] }).map((i) => i.code)).toContain("bid-value");
    const short = validateSplit({ ...good, bids: [[600, 300], [500, 600]] });
    expect(short.filter((i) => i.code === "bid-sum").map((i) => i.person)).toEqual([0, 1]);
    expect(short[0].message).toContain("$1.00 to assign");
    expect(short[1].message).toContain("$1.00 too much");
  });

  it("solveSplit throws on invalid input", () => {
    expect(() => solveSplit({ ...good, totalCents: 999 })).toThrow();
  });
});

describe("money helpers", () => {
  it("parses dollar text into cents", () => {
    expect(parseDollars("812.50")).toBe(81250);
    expect(parseDollars("$1,200")).toBe(120000);
    expect(parseDollars(" 90.5 ")).toBe(9050);
    expect(parseDollars(".05")).toBe(5);
    expect(parseDollars("")).toBe(0);
    expect(parseDollars("12.345")).toBeNull();
    expect(parseDollars("-5")).toBeNull();
    expect(parseDollars("abc")).toBeNull();
    expect(parseDollars(".")).toBeNull();
  });

  it("formats cents", () => {
    expect(formatCents(81250)).toBe("$812.50");
    expect(formatCents(360000)).toBe("$3,600.00");
    expect(centsToInput(90000)).toBe("900");
    expect(centsToInput(90005)).toBe("900.05");
  });

  it("splits evenly with exact totals", () => {
    expect(evenSplit(1000_01, 3)).toEqual([333_34, 333_34, 333_33]);
    expect(evenSplit(3600_00, 4)).toEqual([900_00, 900_00, 900_00, 900_00]);
  });
});
