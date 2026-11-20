import { describe, expect, it } from "vitest";
import { addDays, computeDeadlines, daysUntil, parseIsoDate } from "./deadlines";

describe("deposit deadlines", () => {
  it("parses only real calendar dates", () => {
    expect(parseIsoDate("2026-02-29")).toBeNull();
    expect(parseIsoDate("2028-02-29")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(parseIsoDate("08/30/2026")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });

  it("adds calendar days across month/year boundaries without timezone drift", () => {
    expect(addDays("2026-08-28", 7)).toBe("2026-09-04");
    expect(addDays("2026-12-30", 4)).toBe("2027-01-03");
    expect(addDays("2027-03-05", 30)).toBe("2027-04-04"); // spans US DST change
    expect(addDays("nope", 3)).toBeNull();
  });

  it("computes the statutory dates from lease start / end", () => {
    const d = Object.fromEntries(computeDeadlines("2026-08-28", "2027-04-30").map((x) => [x.id, x.date]));
    expect(d.checklist).toBe("2026-09-04"); // 554.608: 7 days after possession
    expect(d.forwarding).toBe("2027-05-04"); // 554.611: 4 days after move-out
    expect(d["damages-list"]).toBe("2027-05-30"); // 554.609: 30 days
    expect(d.lawsuit).toBe("2027-06-14"); // 554.613: 45 days
    expect(d.respond).toBeNull(); // depends on when the list arrives
  });

  it("leaves dates empty when lease dates are missing", () => {
    expect(computeDeadlines("", "").every((x) => x.date === null)).toBe(true);
    const onlyStart = computeDeadlines("2026-08-28", "");
    expect(onlyStart.find((x) => x.id === "checklist")?.date).toBe("2026-09-04");
    expect(onlyStart.find((x) => x.id === "lawsuit")?.date).toBeNull();
  });

  it("counts days until a date", () => {
    expect(daysUntil("2026-11-25", "2026-11-20")).toBe(5);
    expect(daysUntil("2026-11-18", "2026-11-20")).toBe(-2);
  });
});
