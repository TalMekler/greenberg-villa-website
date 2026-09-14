/**
 * One-time move of the local SQLite database into Supabase.
 *
 *   npm run migrate:supabase          # do it
 *   npm run migrate:supabase -- --dry # report what would move, change nothing
 *
 * Rows go to Postgres; the files in `server/data/uploads` go to Storage, and
 * each `site_images.url` is rewritten to the bucket URL that replaces it.
 *
 * It refuses to run against tables that already hold rows, so a second run
 * cannot duplicate anything. Nothing local is deleted — `villa.db` and
 * `uploads/` are left exactly as they were, as the fallback.
 */
import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.loadEnvFile();

const { ensureSchema, query, transaction, closeDb } = await import("../server/db.ts");
const { BUCKET, ensureBucket, publicUrl, supabase } = await import("../server/storage.ts");

const here = dirname(fileURLToPath(import.meta.url));
const dbFile = join(here, "..", "server", "data", "villa.db");
const uploadsDir = join(here, "..", "server", "data", "uploads");
const dry = process.argv.includes("--dry");

if (!existsSync(dbFile)) {
  console.error(`No SQLite database at ${dbFile} — nothing to migrate.`);
  process.exit(1);
}

const sqlite = new Database(dbFile, { readonly: true });
const rowsIn = (table: string) =>
  sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];

const inquiries = rowsIn("inquiries");
const users = rowsIn("users");
const images = rowsIn("site_images");
const location = rowsIn("location");
const files = existsSync(uploadsDir) ? readdirSync(uploadsDir).filter((f) => !f.startsWith(".")) : [];

console.log("Found locally:");
console.log(`  inquiries    ${inquiries.length}`);
console.log(`  users        ${users.length}`);
console.log(`  site_images  ${images.length}`);
console.log(`  location     ${location.length}`);
console.log(`  upload files ${files.length}`);

await ensureSchema();
await ensureBucket();

const counts = await Promise.all(
  ["inquiries", "users", "site_images", "location"].map(async (table) => {
    const [row] = await query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
    return [table, Number(row.n)] as const;
  }),
);
const occupied = counts.filter(([, n]) => n > 0);
if (occupied.length > 0) {
  console.error(
    `\nRefusing to run: Supabase already holds rows in ${occupied
      .map(([t, n]) => `${t} (${n})`)
      .join(", ")}.\nEmpty those tables first if you really mean to re-migrate.`,
  );
  await closeDb();
  process.exit(1);
}

if (dry) {
  console.log("\n--dry: nothing was written.");
  await closeDb();
  process.exit(0);
}

// ---- files -------------------------------------------------------------
// Upload first: if a file fails, no row has been written yet pointing at it.
const urlByFile = new Map<string, string>();
for (const name of files) {
  const bytes = await readFile(join(uploadsDir, name));
  const contentType =
    extname(name) === ".png" ? "image/png" : extname(name) === ".webp" ? "image/webp" : "image/jpeg";

  const { error } = await supabase().storage
    .from(BUCKET)
    .upload(name, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Uploading ${name}: ${error.message}`);

  urlByFile.set(name, publicUrl(name));
}
console.log(`\nUploaded ${urlByFile.size} file(s) to the "${BUCKET}" bucket.`);

/** `/api/media/<uuid>.jpg` → the public bucket URL for that same object. */
function rewriteUrl(stored: string): string {
  const name = stored.replace("/api/media/", "");
  const next = urlByFile.get(name);
  if (!next) throw new Error(`No uploaded file for ${stored} — migration would break that photo.`);
  return next;
}

// ---- rows --------------------------------------------------------------
// One transaction for all four tables: a failure anywhere leaves Supabase
// untouched, so the migration can simply be run again.
await transaction(async (run) => {
  for (const row of inquiries) {
    await run(
      `INSERT INTO inquiries (id, "firstName", "lastName", email, "checkIn", "checkOut",
                              guests, message, status, "submittedAt", "decidedAt",
                              "priceAmount", "priceCurrency", "priceMode")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        row.id, row.firstName, row.lastName, row.email, row.checkIn, row.checkOut,
        row.guests, row.message ?? "", row.status, row.submittedAt, row.decidedAt ?? null,
        row.priceAmount ?? null, row.priceCurrency ?? null, row.priceMode ?? null,
      ],
    );
  }

  for (const row of users) {
    await run(
      `INSERT INTO users (id, email, salt, "passwordHash", "mustChangePassword", "createdAt", "lastLoginAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        row.id, row.email, row.salt, row.passwordHash,
        row.mustChangePassword === 1, row.createdAt, row.lastLoginAt ?? null,
      ],
    );
  }

  for (const row of images) {
    await run(
      `INSERT INTO site_images (id, slot, position, url, alt, "uploadedAt")
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [row.id, row.slot, row.position, rewriteUrl(String(row.url)), row.alt ?? "", row.uploadedAt],
    );
  }

  for (const row of location) {
    await run(`INSERT INTO location (id, latitude, longitude, zoom) VALUES (1,$1,$2,$3)`, [
      row.latitude, row.longitude, row.zoom,
    ]);
  }
});

// ---- verify ------------------------------------------------------------
console.log("\nVerifying:");
let ok = true;
for (const [table, expected] of [
  ["inquiries", inquiries.length],
  ["users", users.length],
  ["site_images", images.length],
  ["location", location.length],
] as const) {
  const [row] = await query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  const got = Number(row.n);
  const pass = got === expected;
  ok &&= pass;
  console.log(`  ${table.padEnd(12)} ${got}/${expected} ${pass ? "ok" : "MISMATCH"}`);
}

const [user] = await query<{ passwordHash: string }>(`SELECT "passwordHash" FROM users LIMIT 1`);
if (users.length > 0) {
  const same = user?.passwordHash === users[0].passwordHash;
  ok &&= same;
  console.log(`  password hash ${same ? "preserved" : "CHANGED — sign-in would break"}`);
}

const bad = await query<{ url: string }>(`SELECT url FROM site_images WHERE url LIKE '/api/media/%'`);
ok &&= bad.length === 0;
console.log(`  image urls   ${bad.length === 0 ? "all rewritten to the bucket" : `${bad.length} NOT rewritten`}`);

await closeDb();
console.log(ok ? "\nMigration complete." : "\nMigration finished with problems — see above.");
process.exit(ok ? 0 : 1);
