/**
 * Ann Arbor right-to-renew dates (City Code § 8:530 as amended by ORD-24-03, March 2024):
 * - no renewal offer earlier than 180 days from the start of the current lease;
 * - the tenant gets at least 30 days after an offer is sent to accept it;
 * - no showing to prospective tenants (or leasing to someone else) until 210 days into the lease;
 * - leases under 8 months aren't covered; for leases over 12 months the clock starts on the
 *   first day of the final 12-month period.
 * Pure date math in UTC on "YYYY-MM-DD" strings.
 */

export const RENEW_OFFER_DAYS = 180;
export const SHOWING_DAYS = 210;
export const ACCEPT_MIN_DAYS = 30;
export const MIN_COVERED_MONTHS = 8;

export interface RenewDates {
  covered: boolean;
  /** Why it isn't covered, or a note about how the dates were counted. */
  note: string | null;
  leaseEnd: string;
  /** The day the ordinance's clock starts (lease start, or start of the final 12 months). */
  clockStart: string;
  earliestOffer: string;
  /** If an offer arrives on earliestOffer, the earliest deadline the landlord may set. */
  earliestAcceptDeadline: string;
  earliestShowing: string;
}

function parse(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCMonth() === Number(m[2]) - 1 ? d : null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(isoDate: string, days: number): string {
  const d = parse(isoDate);
  if (!d) throw new Error(`Bad date ${isoDate}`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Same day-of-month `months` later, clamped to the month's last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(isoDate: string, months: number): string {
  const d = parse(isoDate);
  if (!d) throw new Error(`Bad date ${isoDate}`);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return iso(target);
}

export function renewDates(start: string, months: number): RenewDates | null {
  if (!parse(start) || !Number.isInteger(months) || months < 1 || months > 60) return null;
  const leaseEnd = addDays(addMonths(start, months), -1);
  const clockStart = months > 12 ? addMonths(start, months - 12) : start;
  const earliestOffer = addDays(clockStart, RENEW_OFFER_DAYS);
  let note: string | null = null;
  if (months < MIN_COVERED_MONTHS) note = `Leases shorter than ${MIN_COVERED_MONTHS} months aren't covered by § 8:530.`;
  else if (months > 12) note = "For leases longer than 12 months, the clock starts on the first day of the final 12 months.";
  return {
    covered: months >= MIN_COVERED_MONTHS,
    note,
    leaseEnd,
    clockStart,
    earliestOffer,
    earliestAcceptDeadline: addDays(earliestOffer, ACCEPT_MIN_DAYS),
    earliestShowing: addDays(clockStart, SHOWING_DAYS),
  };
}
