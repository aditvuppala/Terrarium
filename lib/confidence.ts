/**
 * How well we know the student's needs, 0–100. Deterministic.
 *
 *   base 10 + major 15 + year 5 + courses (any confirmed 20 / only unconfirmed or guessed 10)
 *   + budgetMax 15 + roommates 10 + hasCar 5 + placeCategories 5
 *   + user-set priorities (any from chat or user_reordered) 10 + frequentPlaces 5, capped at 100.
 *
 * hint names the single highest-value missing item.
 */
import type { UserProfile } from "@/lib/schemas";

interface Item {
  points: number;
  have: number;
  hint: string;
}

export function confidence(profile: UserProfile): { value: number; hint: string } {
  const anyConfirmed = profile.courses.some((c) => c.confirmed);
  const items: Item[] = [
    {
      points: 20,
      have: anyConfirmed ? 20 : profile.courses.length ? 10 : 0,
      hint: profile.courses.length ? "Confirm your classes so we can time your commute." : "Add your classes (upload a Backpack screenshot or type them) so we can time your commute.",
    },
    { points: 15, have: profile.major ? 15 : 0, hint: "Tell us your major so we know which campus you're on." },
    { points: 15, have: profile.budgetMax !== null ? 15 : 0, hint: "Tell us your monthly budget for your share of rent." },
    { points: 10, have: profile.roommates !== null ? 10 : 0, hint: "Tell us how many roommates you'll live with." },
    {
      points: 10,
      have: profile.priorities.some((p) => p.source === "chat" || p.source === "user_reordered") ? 10 : 0,
      hint: "Tell us what matters most to you, or reorder your priorities.",
    },
    { points: 5, have: profile.year ? 5 : 0, hint: "Tell us your year." },
    { points: 5, have: profile.hasCar !== null ? 5 : 0, hint: "Tell us whether you'll have a car." },
    { points: 5, have: profile.placeCategories.length ? 5 : 0, hint: "Tell us which kinds of places you want nearby." },
    { points: 5, have: profile.frequentPlaces.length ? 5 : 0, hint: "Add places you go often, like a job or gym." },
  ];

  const value = Math.min(100, 10 + items.reduce((s, i) => s + i.have, 0));
  // Highest missing value first; ties keep the order above.
  const best = items
    .map((i, idx) => ({ ...i, idx, missing: i.points - i.have }))
    .filter((i) => i.missing > 0)
    .sort((a, b) => b.missing - a.missing || a.idx - b.idx)[0];

  return { value, hint: best ? best.hint : "We have everything we need. Reorder your priorities to explore trade-offs." };
}
