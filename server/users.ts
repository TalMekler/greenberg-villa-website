import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query, queryOne } from "./db";
import type { AdminUser } from "../src/lib/user";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 8;

/** The stored shape — identical to AdminUser plus the credential material. */
interface StoredUser extends AdminUser {
  salt: string;
  passwordHash: string;
}

interface Row extends Omit<StoredUser, "lastLoginAt"> {
  lastLoginAt: string | null;
}

function toStored(row: Row): StoredUser {
  const user: StoredUser = {
    id: row.id,
    email: row.email,
    mustChangePassword: row.mustChangePassword,
    createdAt: row.createdAt,
    salt: row.salt,
    passwordHash: row.passwordHash,
  };
  if (row.lastLoginAt) user.lastLoginAt = row.lastLoginAt;
  return user;
}

/** scrypt with a per-user random salt. Plaintext passwords are never stored. */
async function hash(password: string, salt: Buffer): Promise<string> {
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return derived.toString("hex");
}

async function verify(password: string, user: StoredUser): Promise<boolean> {
  const derived = await scryptAsync(password, Buffer.from(user.salt, "hex"), KEY_LENGTH);
  const expected = Buffer.from(user.passwordHash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Strips the credential fields before anything leaves the server. */
function toPublic(user: StoredUser): AdminUser {
  const { salt: _salt, passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function listUsers(): Promise<AdminUser[]> {
  const rows = await query<Row>(`SELECT * FROM users ORDER BY "createdAt" ASC`);
  return rows.map((row) => toPublic(toStored(row)));
}

export async function countUsers(): Promise<number> {
  const row = await queryOne<{ n: string }>(`SELECT count(*) AS n FROM users`);
  return Number(row?.n ?? 0);
}

export async function findByEmail(email: string): Promise<AdminUser | null> {
  const row = await queryOne<Row>(`SELECT * FROM users WHERE email = $1`, [normaliseEmail(email)]);
  return row ? toPublic(toStored(row)) : null;
}

export async function createUser(
  email: string,
  password: string,
  options: { mustChangePassword: boolean },
): Promise<AdminUser> {
  const salt = randomBytes(16);

  const user: StoredUser = {
    id: randomUUID(),
    email: normaliseEmail(email),
    mustChangePassword: options.mustChangePassword,
    createdAt: new Date().toISOString(),
    salt: salt.toString("hex"),
    passwordHash: await hash(password, salt),
  };

  await query(
    `INSERT INTO users (id, email, salt, "passwordHash", "mustChangePassword", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, user.email, user.salt, user.passwordHash, user.mustChangePassword, user.createdAt],
  );
  return toPublic(user);
}

/** Returns the user on a correct password, or null — never says which half failed. */
export async function authenticate(email: string, password: string): Promise<AdminUser | null> {
  const row = await queryOne<Row>(`SELECT * FROM users WHERE email = $1`, [normaliseEmail(email)]);

  if (!row) {
    // Spend comparable time on unknown accounts so timing cannot enumerate them.
    await scryptAsync(password, randomBytes(16), KEY_LENGTH);
    return null;
  }

  const user = toStored(row);
  return (await verify(password, user)) ? toPublic(user) : null;
}

export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "not-found" | "incorrect" }> {
  const row = await queryOne<Row>(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!row) return { ok: false, reason: "not-found" };
  if (!(await verify(currentPassword, toStored(row)))) return { ok: false, reason: "incorrect" };

  const salt = randomBytes(16);
  await query(
    `UPDATE users SET salt = $2, "passwordHash" = $3, "mustChangePassword" = false WHERE id = $1`,
    [id, salt.toString("hex"), await hash(newPassword, salt)],
  );
  return { ok: true };
}

/** Removes an account outright. Returns false when the id is unknown. */
export async function deleteUser(id: string): Promise<boolean> {
  const deleted = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
  return deleted.length > 0;
}

/**
 * An admin resetting somebody else's password. The account is put back into the
 * "initial password" state, so the owner must replace it at next sign-in.
 */
export async function resetPassword(id: string, newPassword: string): Promise<boolean> {
  const salt = randomBytes(16);
  const updated = await query(
    `UPDATE users SET salt = $2, "passwordHash" = $3, "mustChangePassword" = true
      WHERE id = $1 RETURNING id`,
    [id, salt.toString("hex"), await hash(newPassword, salt)],
  );
  return updated.length > 0;
}

export async function recordLogin(id: string): Promise<void> {
  await query(`UPDATE users SET "lastLoginAt" = $2 WHERE id = $1`, [id, new Date().toISOString()]);
}

export async function getById(id: string): Promise<AdminUser | null> {
  const row = await queryOne<Row>(`SELECT * FROM users WHERE id = $1`, [id]);
  return row ? toPublic(toStored(row)) : null;
}

/**
 * Creates the first account from ADMIN_USERNAME / ADMIN_PASSWORD. Runs only when
 * the store is empty — afterwards the database is the source of truth and the
 * env vars are ignored.
 */
export async function ensureBootstrapUser(): Promise<void> {
  if ((await countUsers()) > 0) return;

  const email = process.env.ADMIN_EMAIL ?? process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  await createUser(email, password, { mustChangePassword: false });
  console.log(`Created the first admin account: ${normaliseEmail(email)}`);
}
