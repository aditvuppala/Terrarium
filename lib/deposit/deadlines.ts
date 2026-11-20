/**
 * Michigan Security Deposit Act (1972 PA 348, MCL 554.601–554.616) deadlines.
 * Day counts verified against the official text at legislature.mi.gov (Nov 2026).
 */

const MCL = (s: string) => `https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-${s}`;

export type DeadlineRule = {
  id: string;
  /** Which lease date the clock starts from. "notice" = relative to an event we can't know. */
  from: "start" | "end" | "notice";
  days: number;
  who: "You" | "Landlord";
  title: string;
  detail: string;
  section: string;
  url: string;
};

export const DEADLINE_RULES: DeadlineRule[] = [
  {
    id: "checklist",
    from: "start",
    days: 7,
    who: "You",
    title: "Return the move-in inventory checklist",
    detail:
      "Your landlord must give you 2 blank copies. Fill one in with the condition of the unit and return it within 7 days after you get possession (unless you both agreed to a shorter period). Keep the other copy, and your photos.",
    section: "MCL 554.608",
    url: MCL("608"),
  },
  {
    id: "forwarding",
    from: "end",
    days: 4,
    who: "You",
    title: "Send your forwarding address in writing",
    detail:
      "Within 4 days after you move out. If you don't, the landlord no longer has to send you the itemized damages list (you can still claim the deposit later).",
    section: "MCL 554.611",
    url: MCL("611"),
  },
  {
    id: "damages-list",
    from: "end",
    days: 30,
    who: "Landlord",
    title: "Landlord mails the itemized list of damages",
    detail:
      "Within 30 days after you move out, with estimated repair costs and a check for any balance. If they miss this, the law treats it as agreeing no damages are due and they must return the full deposit (MCL 554.610).",
    section: "MCL 554.609",
    url: MCL("609"),
  },
  {
    id: "respond",
    from: "notice",
    days: 7,
    who: "You",
    title: "Respond to the damages list by mail",
    detail:
      "Within 7 days after you receive it, say in detail which charges you agree or disagree with. If you don't respond, you forfeit the amount claimed. The date you mail it counts as the response date.",
    section: "MCL 554.609, 554.612",
    url: MCL("612"),
  },
  {
    id: "lawsuit",
    from: "end",
    days: 45,
    who: "Landlord",
    title: "Landlord must sue or return the balance",
    detail:
      "Within 45 days after you move out, the landlord must either start a court action for the damages or return the rest of the deposit. Not complying fully waives the damages claimed and can make them liable for double the amount withheld.",
    section: "MCL 554.613",
    url: MCL("613"),
  },
];

export const ACT_URL = "https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-Act-348-of-1972";

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a YYYY-MM-DD string to a UTC-midnight Date, or null if invalid. */
export function parseIsoDate(s: string): Date | null {
  const m = ISO.exec(s.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Add calendar days to a YYYY-MM-DD date. Returns YYYY-MM-DD, or null if input is invalid. */
export function addDays(iso: string, days: number): string | null {
  const d = parseIsoDate(iso);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `today` to `iso` (negative if past). */
export function daysUntil(iso: string, today: string): number | null {
  const a = parseIsoDate(today);
  const b = parseIsoDate(iso);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type ComputedDeadline = DeadlineRule & { date: string | null };

export function computeDeadlines(leaseStart: string, leaseEnd: string): ComputedDeadline[] {
  return DEADLINE_RULES.map((rule) => {
    const base = rule.from === "start" ? leaseStart : rule.from === "end" ? leaseEnd : "";
    return { ...rule, date: base ? addDays(base, rule.days) : null };
  });
}

/** Human date like "Sat, Sep 6, 2026" (rendered in UTC so the calendar day never shifts). */
export function formatIsoDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Local "today" as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
