import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { AdminUser } from "../src/lib/user";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const here = dirname(fileURLToPath(import.meta.url));
const dataFile = join(here, "data", "users.json");

const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 8;

/** The stored shape — identical to AdminUser plus the credential material. */
interface StoredUser extends AdminUser {
  salt: string;
  passwordHash: string;
}

let cache: StoredUser[] | null = null;
let writing: Promise<void> = Promise.resolve();

async function load(): Promise<StoredUser[]> {
  if (cache) return cache;
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed: unknown = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read ${dataFile}, starting empty:`, error);
    }
    cache = [];
  }
  return cache;
}

async function persist(next: StoredUser[]): Promise<void> {
  cache = next;
  writing = writing.then(async () => {
    await mkdir(dirname(dataFile), { recursive: true });
    const temp = `${dataFile}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
    await rename(temp, dataFile, );
  });
  await writing;
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
  return (await load()).map(toPublic);
}

export async function countUsers(): Promise<number> {
  return (await load()).length;
}

export async function findByEmail(email: string): Promise<AdminUser | null> {
  const match = (await load()).find((user) => user.email === normaliseEmail(email));
  return match ? toPublic(match) : null;
}

export async function createUser(
  email: string,
  password: string,
  options: { mustChangePassword: boolean },
): Promise<AdminUser> {
  const users = await load();
  const salt = randomBytes(16);

  const user: StoredUser = {
    id: randomUUID(),
    email: normaliseEmail(email),
    mustChangePassword: options.mustChangePassword,
    createdAt: new Date().toISOString(),
    salt: salt.toString("hex"),
    passwordHash: await hash(password, salt),
  };

  await persist([...users, user]);
  return toPublic(user);
}

/** Returns the user on a correct password, or null — never says which half failed. */
export async function authenticate(email: string, password: string): Promise<AdminUser | null> {
  const users = await load();
  const user = users.find((candidate) => candidate.email === normaliseEmail(email));

  if (!user) {
    // Spend comparable time on unknown accounts so timing cannot enumerate them.
    await scryptAsync(password, randomBytes(16), KEY_LENGTH);
    return null;
  }

  return (await verify(password, user)) ? toPublic(user) : null;
}

export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "not-found" | "incorrect" }> {
  const users = await load();
  const user = users.find((candidate) => candidate.id === id);
  if (!user) return { ok: false, reason: "not-found" };
  if (!(await verify(currentPassword, user))) return { ok: false, reason: "incorrect" };

  const salt = randomBytes(16);
  const updated: StoredUser = {
    ...user,
    salt: salt.toString("hex"),
    passwordHash: await hash(newPassword, salt),
    mustChangePassword: false,
  };

  await persist(users.map((candidate) => (candidate.id === id ? updated : candidate)));
  return { ok: true };
}

/** Removes an account outright. Returns false when the id is unknown. */
export async function deleteUser(id: string): Promise<boolean> {
  const users = await load();
  if (!users.some((user) => user.id === id)) return false;
  await persist(users.filter((user) => user.id !== id));
  return true;
}

/**
 * An admin resetting somebody else's password. The account is put back into the
 * "initial password" state, so the owner must replace it at next sign-in.
 */
export async function resetPassword(id: string, newPassword: string): Promise<boolean> {
  const users = await load();
  const user = users.find((candidate) => candidate.id === id);
  if (!user) return false;

  const salt = randomBytes(16);
  const updated: StoredUser = {
    ...user,
    salt: salt.toString("hex"),
    passwordHash: await hash(newPassword, salt),
    mustChangePassword: true,
  };

  await persist(users.map((candidate) => (candidate.id === id ? updated : candidate)));
  return true;
}

export async function recordLogin(id: string): Promise<void> {
  const users = await load();
  await persist(
    users.map((user) => (user.id === id ? { ...user, lastLoginAt: new Date().toISOString() } : user)),
  );
}

export async function getById(id: string): Promise<AdminUser | null> {
  const match = (await load()).find((user) => user.id === id);
  return match ? toPublic(match) : null;
}

/**
 * Creates the first account from ADMIN_USERNAME / ADMIN_PASSWORD. Runs only when
 * the store is empty — afterwards `users.json` is the source of truth and the
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
