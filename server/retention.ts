import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { monthsAgoKey, retention } from "../src/lib/retention";
import { query } from "./db";
import { hit, sweep, type Limit } from "./rate-limit";

/*
  Deletes personal data once the privacy policy says it is no longer kept.
  The periods come from src/lib/retention.ts, which the policy prints too.

  It runs from a daily Vercel cron (GET /api/cron/retention), and also at most
  once a day when a guest sends a request or a host opens the inquiry list —
  so the periods still hold if the cron is not configured, and a host never
  sees a row that should already be gone.

  Deleting from `inquiries` fires the realtime triggers, so the public
  calendar and any open admin page update by themselves.
*/

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PurgeResult {
  /** Requests that never became a booking. */
  requests: number;
  /** Approved bookings past their retention period. */
  bookings: number;
}

export async function purgeExpired(now = new Date()): Promise<PurgeResult> {
  // Check-out dates are stored as `YYYY-MM-DD` text, so a text comparison with
  // a date key of the same shape orders them correctly.
  const requests = await query(
    `DELETE FROM inquiries WHERE status <> 'approved' AND "checkOut" < $1 RETURNING id`,
    [monthsAgoKey(retention.unconfirmedMonths, now)],
  );
  const bookings = await query(
    `DELETE FROM inquiries WHERE status = 'approved' AND "checkOut" < $1 RETURNING id`,
    [monthsAgoKey(retention.confirmedYears * 12, now)],
  );

  // The anti-abuse counters (visitor IP, guest email): every window is 24 hours.
  await sweep(DAY_MS);
  // The hosts' own traces: expired sessions and old failed-login counters (by IP).
  await query(`DELETE FROM sessions WHERE "expiresAt" <= $1`, [now.getTime()]);
  await query(`DELETE FROM login_attempts WHERE "firstAt" < $1`, [now.getTime() - DAY_MS]);

  return { requests: requests.length, bookings: bookings.length };
}

const daily: Limit = { name: "retention-purge", max: 1, windowMs: DAY_MS };

/** Purges if no purge has run in the last day. Never throws: it must not break the request it rides on. */
export async function purgeIfDue(): Promise<void> {
  try {
    if ((await hit(daily, "run")) !== null) return;
    await purgeExpired();
  } catch (error) {
    console.error("Retention purge failed:", error);
  }
}

/**
 * Vercel calls cron paths with `Authorization: Bearer $CRON_SECRET` when that
 * variable is set. Without it the endpoint stays shut: anyone could otherwise
 * trigger deletions — harmless by design, but no reason to allow it.
 */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = Buffer.from(request.headers.authorization ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
