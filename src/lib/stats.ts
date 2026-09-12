import { fromDateKey, nightsBetween } from "./date";
import { currencies, priceBreakdown, type Currency, type Inquiry } from "./inquiry";

/**
 * Which date a booking is counted under. "check-in" answers "how did this month
 * trade"; "approved" answers "how much did we confirm this month". They give
 * different numbers, so the admin picks.
 */
export type StatsBasis = "check-in" | "approved";

export const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface MonthTotals {
  bookings: number;
  guests: number;
  nights: number;
  /** In the requested currency only — currencies are never added together. */
  revenue: number;
}

export interface MonthPoint extends MonthTotals {
  year: number;
  /** 0-indexed, as in `Date`. */
  month: number;
  label: string;
}

export interface WeekdayTotals {
  weekday: number;
  name: string;
  /** Occupied nights that fall on this weekday, across every confirmed stay. */
  nights: number;
  /** Guests × nights, so busy weekdays with large parties stand out. */
  guestNights: number;
  /** Mean number of guests in the villa on a night of this weekday. */
  averageGuests: number;
  /** How many distinct bookings cover this weekday at least once. */
  bookings: number;
}

const approved = (inquiry: Inquiry) => inquiry.status === "approved";

/** The date a booking is filed under, or null when it cannot be placed. */
function basisDate(inquiry: Inquiry, basis: StatsBasis): Date | null {
  if (basis === "check-in") return fromDateKey(inquiry.checkIn);
  return inquiry.decidedAt ? new Date(inquiry.decidedAt) : null;
}

function inMonth(inquiry: Inquiry, basis: StatsBasis, year: number, month: number): boolean {
  const date = basisDate(inquiry, basis);
  return date !== null && date.getFullYear() === year && date.getMonth() === month;
}

function stayNights(inquiry: Inquiry): number {
  return Math.max(nightsBetween(fromDateKey(inquiry.checkIn), fromDateKey(inquiry.checkOut)), 0);
}

function revenueOf(inquiry: Inquiry, currency: Currency): number {
  if (!inquiry.price || inquiry.price.currency !== currency) return 0;
  return priceBreakdown(inquiry.price, stayNights(inquiry)).total;
}

export function totalsForMonth(
  inquiries: Inquiry[],
  basis: StatsBasis,
  currency: Currency,
  year: number,
  month: number,
): MonthTotals {
  return inquiries
    .filter((inquiry) => approved(inquiry) && inMonth(inquiry, basis, year, month))
    .reduce<MonthTotals>(
      (totals, inquiry) => ({
        bookings: totals.bookings + 1,
        guests: totals.guests + (Number(inquiry.guests) || 0),
        nights: totals.nights + stayNights(inquiry),
        revenue: totals.revenue + revenueOf(inquiry, currency),
      }),
      { bookings: 0, guests: 0, nights: 0, revenue: 0 },
    );
}

/** `count` months ending at (and including) the given one, oldest first. */
export function monthlySeries(
  inquiries: Inquiry[],
  basis: StatsBasis,
  currency: Currency,
  year: number,
  month: number,
  count = 12,
): MonthPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - (count - 1 - index), 1);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      ...totalsForMonth(inquiries, basis, currency, date.getFullYear(), date.getMonth()),
    };
  });
}

/**
 * Every night of every confirmed stay, bucketed by weekday — so a Monday-to-
 * Friday booking counts towards Mon, Tue, Wed and Thu, not just its arrival day.
 * That is what shows which nights guests actually want.
 *
 * Nights, not days: the check-out date is not slept in, so counting it would
 * inflate turnover days and stop the buckets summing to the real night count.
 * Always by stay dates, whatever basis the monthly figures use.
 */
export function weekdayTotals(inquiries: Inquiry[]): WeekdayTotals[] {
  const buckets = weekdayNames.map((name, weekday) => ({
    weekday,
    name,
    nights: 0,
    guestNights: 0,
    averageGuests: 0,
    bookings: 0,
  }));

  inquiries.filter(approved).forEach((inquiry) => {
    const guests = Number(inquiry.guests) || 0;
    const checkOut = fromDateKey(inquiry.checkOut);
    const touched = new Set<number>();

    for (
      const night = fromDateKey(inquiry.checkIn);
      night < checkOut;
      night.setDate(night.getDate() + 1)
    ) {
      const bucket = buckets[night.getDay()];
      bucket.nights += 1;
      bucket.guestNights += guests;
      touched.add(night.getDay());
    }

    touched.forEach((weekday) => {
      buckets[weekday].bookings += 1;
    });
  });

  return buckets.map((bucket) => ({
    ...bucket,
    averageGuests: bucket.nights === 0 ? 0 : bucket.guestNights / bucket.nights,
  }));
}

/** Percentage change, or null when there is no baseline to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/** Currencies actually used by priced bookings, for the picker. */
export function usedCurrencies(inquiries: Inquiry[]): Currency[] {
  const seen = new Set(
    inquiries.filter(approved).flatMap((inquiry) => (inquiry.price ? [inquiry.price.currency] : [])),
  );
  const used = currencies.filter((currency) => seen.has(currency));
  return used.length > 0 ? used : [...currencies];
}
