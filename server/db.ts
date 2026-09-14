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
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy the Supabase connection string into .env — " +
      "see the README section 'Where the data lives'.",
  );
}

export const pool = new pg.Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  // Supabase terminates TLS with its own CA, which Node does not ship.
  ssl: { rejectUnauthorized: false },
});

/** Runs a statement and hands back the rows, typed by the caller. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, values);
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
  const client = await pool.connect();
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

  // One row per photo. `slot` is where it appears: hero, lifestyle, an explore
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

  // A single row, id 1, so an UPDATE can never create a second map pin.
  await query(`
    CREATE TABLE IF NOT EXISTS location (
      id        integer PRIMARY KEY CHECK (id = 1),
      latitude  double precision NOT NULL,
      longitude double precision NOT NULL,
      zoom      integer NOT NULL
    )
  `);
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
