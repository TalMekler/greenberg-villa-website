import { eachDayInRange, fromDateKey, toDateKey } from "../lib/date";
import type { Inquiry } from "../lib/inquiry";

/** First day of the month the calendar opens on — always the current month. */
export const initialMonth = (): Date => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

/** Every day key a stay occupies, check-in through check-out inclusive. */
export function stayDateKeys(checkIn: string, checkOut: string): string[] {
  if (!checkIn || !checkOut) return [];
  return eachDayInRange(fromDateKey(checkIn), fromDateKey(checkOut)).map(toDateKey);
}

/**
 * The dates that are unavailable — derived purely from approved bookings, so a
 * calendar with nothing approved shows every day as free.
 */
export function bookedDateKeys(inquiries: Inquiry[]): Set<string> {
  const keys = new Set<string>();
  inquiries
    .filter((inquiry) => inquiry.status === "approved")
    .forEach((inquiry) => {
      stayDateKeys(inquiry.checkIn, inquiry.checkOut).forEach((key) => keys.add(key));
    });
  return keys;
}

/** True when a stay would land on a day another confirmed booking already holds. */
export function hasConflict(inquiry: Inquiry, others: Inquiry[]): boolean {
  const taken = bookedDateKeys(others.filter((other) => other.id !== inquiry.id));
  return stayDateKeys(inquiry.checkIn, inquiry.checkOut).some((key) => taken.has(key));
}
