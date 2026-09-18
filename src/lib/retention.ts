// Shared between the browser and the API server, so this module deliberately
// imports nothing — no asset modules, no DOM types.

/**
 * How long personal data is kept. The server's purge (server/retention.ts)
 * deletes by these numbers, and the privacy policy prints them in all three
 * languages — so what the policy promises and what the code does are the same
 * values, and changing one changes the other.
 */
export const retention = {
  /**
   * Booking requests that never became a booking — declined, cancelled, or
   * never answered — counted from the requested check-out date.
   */
  unconfirmedMonths: 6,
  /**
   * Approved bookings, counted from check-out. Long enough for tax and
   * accounting records; confirm the period with your accountant.
   */
  confirmedYears: 7,
  /**
   * The anti-abuse counters (visitor IP, guest email). A counter's window is
   * 24 hours, and it is deleted by the first purge after the window ends; the
   * purge runs at least daily, so a counter lives at most 48 hours.
   */
  counterHours: 48,
} as const;

/** `YYYY-MM-DD`, `months` before `now`, in UTC — compared as text against stored date keys. */
export function monthsAgoKey(months: number, now = new Date()): string {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}
