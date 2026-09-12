/**
 * Weekday names for the given locale, Sunday first.
 *
 * `narrow` matters: taking the first letter of the short form works in English
 * but not in Hebrew, where six of seven short names begin with "\u05d9".
 */
export function weekdayLabels(
  locale = "en-GB",
  width: "short" | "narrow" = "short",
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: width });
  // 2023-01-01 was a Sunday, so this walks Sun → Sat.
  return Array.from({ length: 7 }, (_, day) => formatter.format(new Date(2023, 0, 1 + day)));
}

/** Local-time ISO day key (`YYYY-MM-DD`) — avoids the UTC shift of toISOString(). */
export function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatMonth(date: Date, locale = "en-GB"): string {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function formatLongDate(date: Date, locale = "en-US"): string {
  return date.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The grid of a month, padded with `null` so the 1st lands under its weekday.
 * Always a whole number of weeks, matching the design's 7-column layout.
 */
export function buildMonthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingBlanks = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/** Every day from `start` to `end` inclusive. */
export function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function nightsBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / msPerDay);
}

/** Parses a `YYYY-MM-DD` key back into a local-time date. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
