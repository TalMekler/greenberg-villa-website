import { query, queryOne } from "./db";

/**
 * Fixed-window counters in Postgres.
 *
 * In memory would not work: on Vercel consecutive requests land on different
 * instances, each of which would keep its own count. One upsert per hit both
 * records it and reports the new total, so two requests arriving together
 * cannot both read the old count.
 */
export interface Limit {
  /** Distinguishes one limiter's counters from another's. */
  name: string;
  max: number;
  windowMs: number;
}

/** Counts a hit against `key`. Returns seconds to wait when over the limit, else null. */
export async function hit(limit: Limit, key: string): Promise<number | null> {
  const now = Date.now();
  const row = await queryOne<{ count: number; windowStart: string }>(
    `INSERT INTO rate_limits (key, count, "windowStart") VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE
        SET count = CASE WHEN $2 - rate_limits."windowStart" >= $3 THEN 1
                         ELSE rate_limits.count + 1 END,
            "windowStart" = CASE WHEN $2 - rate_limits."windowStart" >= $3 THEN $2
                                 ELSE rate_limits."windowStart" END
     RETURNING count, "windowStart"`,
    [`${limit.name}:${key}`, now, limit.windowMs],
  );
  if (!row || row.count <= limit.max) return null;

  const resetsAt = Number(row.windowStart) + limit.windowMs;
  return Math.max(1, Math.ceil((resetsAt - now) / 1000));
}

/** Drops windows long finished, so the table cannot grow without bound. */
export async function sweep(olderThanMs: number): Promise<void> {
  await query(`DELETE FROM rate_limits WHERE "windowStart" < $1`, [Date.now() - olderThanMs]);
}
