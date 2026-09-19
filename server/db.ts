import pg from "pg";

/**
 * Supabase Postgres holds the whole site: inquiries, admin accounts, the photo
 * records and the map pin. The image *files* live in Supabase Storage — see
 * `storage.ts`; this table only keeps their public URLs.
 *
 * DATABASE_URL is the connection string from the Supabase dashboard. Use the
 * pooled one (port 6543) for the running server: Supabase caps direct
 * connections, and a pool of five would eat a meaningful share of them.
 */
/*
  The pool is built on first use, not at import. A module-level throw would kill
  the serverless function before any route could run, so a missing variable
  would look identical to a crashed deployment — including to /api/health,
  whose whole job is to tell those apart.
*/
let cached: pg.Pool | null = null;

export function pool(): pg.Pool {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy the Supabase connection string into the " +
        "environment — see the README section 'Where the data lives'.",
    );
  }

  cached = new pg.Pool({
    connectionString,
    // Serverless: many short-lived instances, each wanting very few connections.
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: tlsOptions(),
  });
  return cached;
}

/*
  Supabase signs its database certificates with its own CA, which Node does not
  ship. With that CA in DATABASE_CA_CERT (the PEM from Dashboard → Database →
  SSL Configuration) the certificate is verified like any other. Without it the
  link is still encrypted but unauthenticated — anyone able to intercept it
  could pose as the database — so production says so, once, in the log.
*/
function tlsOptions(): pg.PoolConfig["ssl"] {
  // Dashboards often store a pasted PEM with literal "\n" in place of newlines.
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (ca) return { ca, rejectUnauthorized: true };

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    console.warn(
      "DATABASE_CA_CERT is not set: the database certificate is not being verified.",
    );
  }
  return { rejectUnauthorized: false };
}

/** Runs a statement and hands back the rows, typed by the caller. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await pool().query<T>(text, values);
  return result.rows;
}

/** The first row, or null — for the many lookups that expect at most one. */
export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

/**
 * Runs `work` inside a transaction on a single connection. Every statement in
 * it must go through the `run` it is handed — using the pool instead would
 * take a different connection and land outside the transaction.
 */
export async function transaction<T>(
  work: (run: (text: string, values?: unknown[]) => Promise<pg.QueryResult>) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await work((text, values = []) => client.query(text, values));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Creates the tables if they are not there yet. Safe to run on every boot.
 *
 * Dates and timestamps are stored as `text` holding ISO-8601, exactly as the
 * app already produces and compares them. Postgres `date`/`timestamptz` would
 * be the better modelling, but the driver would then hand back `Date` objects
 * and every comparison in the app — availability, statistics, the calendar —
 * would need reworking. That is a change worth making on its own, not folded
 * into a migration whose job is to move the data unchanged.
 */
export async function ensureSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id             text PRIMARY KEY,
      "firstName"    text NOT NULL,
      "lastName"     text NOT NULL,
      email          text NOT NULL,
      "checkIn"      text NOT NULL,
      "checkOut"     text NOT NULL,
      guests         integer NOT NULL,
      message        text NOT NULL DEFAULT '',
      status         text NOT NULL,
      "submittedAt"  text NOT NULL,
      "decidedAt"    text,
      "priceAmount"  numeric,
      "priceCurrency" text,
      "priceMode"    text
    )
  `);
  /*
    Consent to the Privacy Policy, added after launch — so ADD COLUMN IF NOT
    EXISTS brings an existing table up to date on the next boot. Nullable:
    inquiries from before the form asked for it have no record, and inventing
    one would be worse than having none. ISO text, like every timestamp here.
  */
  await query(`
    ALTER TABLE inquiries
      ADD COLUMN IF NOT EXISTS "privacyPolicyVersion" text,
      ADD COLUMN IF NOT EXISTS "privacyAcceptedAt"    text
  `);
  await query(`CREATE INDEX IF NOT EXISTS inquiries_status ON inquiries (status)`);
  await query(`CREATE INDEX IF NOT EXISTS inquiries_stay ON inquiries ("checkIn", "checkOut")`);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id                   text PRIMARY KEY,
      email                text NOT NULL UNIQUE,
      salt                 text NOT NULL,
      "passwordHash"       text NOT NULL,
      "mustChangePassword" boolean NOT NULL DEFAULT false,
      "createdAt"          text NOT NULL,
      "lastLoginAt"        text
    )
  `);

  // One row per photo. `slot` is where it appears: hero, lifestyle, hosts, an explore
  // slug, or gallery. Gallery is the only many-row slot; `position` orders it.
  await query(`
    CREATE TABLE IF NOT EXISTS site_images (
      id           text PRIMARY KEY,
      slot         text NOT NULL,
      position     integer NOT NULL DEFAULT 0,
      url          text NOT NULL,
      alt          text NOT NULL DEFAULT '',
      "uploadedAt" text NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS site_images_slot ON site_images (slot, position)`);

  /*
    Sessions and failed-login counters live here rather than in memory. On
    Vercel every request may land on a different instance, so an in-memory Map
    would sign the admin straight back out. Epoch milliseconds, not timestamptz:
    the values are only ever compared with Date.now().
  */
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token       text PRIMARY KEY,
      "userId"    text NOT NULL,
      "expiresAt" bigint NOT NULL
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS sessions_user ON sessions ("userId")`);

  await query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      key       text PRIMARY KEY,
      count     integer NOT NULL,
      "firstAt" bigint NOT NULL
    )
  `);

  // Fixed-window counters for rate limits other than login (see rate-limit.ts).
  await query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key           text PRIMARY KEY,
      count         integer NOT NULL,
      "windowStart" bigint NOT NULL
    )
  `);

  // A single row, id 1, so an UPDATE can never create a second map pin.
  await query(`
    CREATE TABLE IF NOT EXISTS location (
      id        integer PRIMARY KEY CHECK (id = 1),
      latitude  double precision NOT NULL,
      longitude double precision NOT NULL,
      zoom      integer NOT NULL
    )
  `);

  await lockDown();
}

/**
 * Supabase exposes the `public` schema over PostgREST, and its publishable key
 * is meant to ship in browsers. Every table here is reached only by this
 * server, over the Postgres connection string, as a role that bypasses RLS —
 * so enabling RLS with no policies denies everyone else. Without it the
 * publishable key alone would read password hashes, guest details, and live
 * session tokens.
 */
async function lockDown(): Promise<void> {
  const tables = [
    "inquiries",
    "users",
    "site_images",
    "sessions",
    "login_attempts",
    "rate_limits",
    "location",
  ];
  for (const table of tables) {
    await query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    await query(`REVOKE ALL ON public.${table} FROM anon, authenticated`);
  }

  /*
    The realtime projections (server/sql/realtime.sql) are meant to be read by
    the browser, so they keep SELECT — and nothing else. Supabase's default
    privileges hand new tables every grant, TRUNCATE included, which RLS does
    not cover. Their trigger functions run as definer and have no business
    being callable over /rest/v1/rpc. Both only if the realtime SQL is applied.
  */
  await query(`
    DO $$
    BEGIN
      IF to_regclass('public.booked_dates') IS NOT NULL THEN
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
          ON public.booked_dates, public.inquiry_pulse FROM anon, authenticated;
      END IF;
      IF to_regprocedure('public.refresh_booked_dates()') IS NOT NULL THEN
        REVOKE EXECUTE ON FUNCTION public.refresh_booked_dates(), public.bump_inquiry_pulse()
          FROM PUBLIC, anon, authenticated;
      END IF;
    END $$
  `);
}

export async function closeDb(): Promise<void> {
  if (cached) await cached.end();
  cached = null;
}
