import Database from "better-sqlite3";
import { mkdirSync, readFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "data");

/**
 * One SQLite file holds the whole site: inquiries, admin accounts, the photo
 * records and the map pin. Uploaded image *files* stay on disk under
 * `data/uploads` — only their metadata lives here.
 *
 * better-sqlite3 is synchronous by design. That reads oddly next to the async
 * store functions, but it is the right call here: every statement below is a
 * primary-key lookup or a scan of a table with tens of rows, so the work is
 * over in microseconds, and the store API stays async so callers never change.
 */
mkdirSync(dataDir, { recursive: true });
export const db = new Database(join(dataDir, "villa.db"));

// WAL lets a read run while a write is in flight; without it a write blocks
// every concurrent reader. `foreign_keys` is off by default in SQLite.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id             TEXT PRIMARY KEY,
    firstName      TEXT NOT NULL,
    lastName       TEXT NOT NULL,
    email          TEXT NOT NULL,
    checkIn        TEXT NOT NULL,
    checkOut       TEXT NOT NULL,
    guests         INTEGER NOT NULL,
    message        TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL,
    submittedAt    TEXT NOT NULL,
    decidedAt      TEXT,
    priceAmount    REAL,
    priceCurrency  TEXT,
    priceMode      TEXT
  );

  -- The availability endpoint and every statistic filter on these two.
  CREATE INDEX IF NOT EXISTS inquiries_status ON inquiries (status);
  CREATE INDEX IF NOT EXISTS inquiries_stay   ON inquiries (checkIn, checkOut);

  CREATE TABLE IF NOT EXISTS users (
    id                   TEXT PRIMARY KEY,
    email                TEXT NOT NULL UNIQUE,
    salt                 TEXT NOT NULL,
    passwordHash         TEXT NOT NULL,
    mustChangePassword   INTEGER NOT NULL DEFAULT 0,
    createdAt            TEXT NOT NULL,
    lastLoginAt          TEXT
  );

  -- One row per photo. The slot is where it appears: hero, lifestyle, an
  -- explore slug, or gallery. Gallery is the only many-row slot, and the
  -- position column is what orders it; the others ignore it.
  CREATE TABLE IF NOT EXISTS site_images (
    id          TEXT PRIMARY KEY,
    slot        TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    url         TEXT NOT NULL,
    alt         TEXT NOT NULL DEFAULT '',
    uploadedAt  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS site_images_slot ON site_images (slot, position);

  -- A single row, id 1, so an UPDATE can never create a second map pin.
  CREATE TABLE IF NOT EXISTS location (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    latitude   REAL NOT NULL,
    longitude  REAL NOT NULL,
    zoom       INTEGER NOT NULL
  );
`);

/**
 * Moves a JSON store into the database the first time this version runs, then
 * renames the file to `.imported` so a later start cannot replay it over
 * newer rows. Returns what it did, for the startup log.
 */
function importJson<T>(
  name: string,
  isEmpty: () => boolean,
  insert: (parsed: T) => number,
): string | null {
  const file = join(dataDir, name);
  if (!isEmpty()) return null;

  let parsed: T;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read ${name} to import it:`, error);
    }
    return null;
  }

  // Each store is imported on its own: a bad row in one must not abort the
  // others, and must not stop the server from starting at all. The file is
  // only renamed once its rows are safely in, so a failure can be retried.
  try {
    const count = insert(parsed);
    renameSync(file, `${file}.imported`);
    return `${name} → ${count} row(s)`;
  } catch (error) {
    console.error(`Could not import ${name} — leaving the file in place:`, error);
    return null;
  }
}

const countIn = (table: string) =>
  (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

export function migrateFromJson(): void {
  const done: string[] = [];

  const inquiries = importJson<Record<string, unknown>[]>(
    "inquiries.json",
    () => countIn("inquiries") === 0,
    (rows) => {
      const insert = db.prepare(`
        INSERT INTO inquiries (id, firstName, lastName, email, checkIn, checkOut,
                               guests, message, status, submittedAt, decidedAt,
                               priceAmount, priceCurrency, priceMode)
        VALUES (@id, @firstName, @lastName, @email, @checkIn, @checkOut,
                @guests, @message, @status, @submittedAt, @decidedAt,
                @priceAmount, @priceCurrency, @priceMode)
      `);
      const all = db.transaction((list: Record<string, unknown>[]) => {
        for (const row of list) {
          const price = row.price as { amount: number; currency: string; mode: string } | undefined;
          insert.run({
            id: row.id,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            checkIn: row.checkIn,
            checkOut: row.checkOut,
            guests: row.guests,
            message: row.message ?? "",
            status: row.status,
            submittedAt: row.submittedAt,
            decidedAt: row.decidedAt ?? null,
            priceAmount: price?.amount ?? null,
            priceCurrency: price?.currency ?? null,
            priceMode: price?.mode ?? null,
          });
        }
      });
      all(rows);
      return rows.length;
    },
  );
  if (inquiries) done.push(inquiries);

  const users = importJson<Record<string, unknown>[]>(
    "users.json",
    () => countIn("users") === 0,
    (rows) => {
      const insert = db.prepare(`
        INSERT INTO users (id, email, salt, passwordHash, mustChangePassword, createdAt, lastLoginAt)
        VALUES (@id, @email, @salt, @passwordHash, @mustChangePassword, @createdAt, @lastLoginAt)
      `);
      const all = db.transaction((list: Record<string, unknown>[]) => {
        for (const row of list) {
          insert.run({
            id: row.id,
            email: row.email,
            salt: row.salt,
            passwordHash: row.passwordHash,
            mustChangePassword: row.mustChangePassword ? 1 : 0,
            createdAt: row.createdAt,
            lastLoginAt: row.lastLoginAt ?? null,
          });
        }
      });
      all(rows);
      return rows.length;
    },
  );
  if (users) done.push(users);

  const images = importJson<{
    hero?: Record<string, string>;
    lifestyle?: Record<string, string>;
    gallery?: Record<string, string>[];
    explore?: Record<string, Record<string, string>>;
  }>(
    "site-images.json",
    () => countIn("site_images") === 0,
    (store) => {
      const insert = db.prepare(`
        INSERT INTO site_images (id, slot, position, url, alt, uploadedAt)
        VALUES (@id, @slot, @position, @url, @alt, @uploadedAt)
      `);
      let n = 0;
      const all = db.transaction(() => {
        const put = (slot: string, image: Record<string, string>, position = 0) => {
          insert.run({
            id: image.id,
            slot,
            position,
            url: image.url,
            alt: image.alt ?? "",
            uploadedAt: image.uploadedAt,
          });
          n += 1;
        };
        if (store.hero) put("hero", store.hero);
        if (store.lifestyle) put("lifestyle", store.lifestyle);
        store.gallery?.forEach((image, index) => put("gallery", image, index));
        for (const [slug, image] of Object.entries(store.explore ?? {})) put(slug, image);
      });
      all();
      return n;
    },
  );
  if (images) done.push(images);

  const location = importJson<{ latitude: number; longitude: number; zoom: number }>(
    "location.json",
    () => countIn("location") === 0,
    (pin) => {
      db.prepare(
        "INSERT INTO location (id, latitude, longitude, zoom) VALUES (1, ?, ?, ?)",
      ).run(pin.latitude, pin.longitude, pin.zoom);
      return 1;
    },
  );
  if (location) done.push(location);

  if (done.length > 0) console.log(`Imported into SQLite: ${done.join(", ")}`);
}
