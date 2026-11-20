import type { Confidence, UserProfile } from "@/lib/schemas";

/** STUB: how well we know the student's priorities, 0–100. */
export function confidence(profile: UserProfile): Confidence {
  let value = 10;
  if (profile.major) value += 15;
  if (profile.budgetMax !== null) value += 15;

  const hint = !profile.major
    ? "Tell us your major so we can estimate where your classes are."
    : profile.budgetMax === null
      ? "Tell us your monthly budget so we can weigh cost."
      : "Tell us what matters most besides commute and cost.";

  return { value: Math.min(100, value), hint };
}
