import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { query, queryOne } from "./db";
import { clientIp, isProduction } from "./security";
import { countUsers, getById } from "./users";

const COOKIE_NAME = "villa_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/*
  Sessions and the failed-login counters live in Postgres, not in memory. The
  API runs as a serverless function, so consecutive requests routinely land on
  different instances — an in-memory Map would sign the admin back out at the
  first navigation, and would reset the login throttle just as often.
*/

/** Any account at all, or env vars ready to bootstrap one. */
export async function credentialsConfigured(): Promise<boolean> {
  if ((await countUsers()) > 0) return true;
  return Boolean((process.env.ADMIN_EMAIL ?? process.env.ADMIN_USERNAME) && process.env.ADMIN_PASSWORD);
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

/*
  The table holds a SHA-256 of each token, never the token itself, so a leaked
  copy of `sessions` cannot be replayed as a cookie. A plain hash is enough: the
  token is 256 random bits, so there is nothing to guess and no need for salt.
*/
function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionToken(request: Request): string | undefined {
  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  return token ? digest(token) : undefined;
}

/** The signed-in user's id, or null. Expired rows are dropped as they are met. */
export async function sessionUserId(request: Request): Promise<string | null> {
  const token = sessionToken(request);
  if (!token) return null;

  const row = await queryOne<{ userId: string }>(
    `DELETE FROM sessions WHERE token = $1 AND "expiresAt" <= $2 RETURNING "userId"`,
    [token, Date.now()],
  );
  if (row) return null; // it was expired, and is now gone

  const live = await queryOne<{ userId: string }>(
    `SELECT "userId" FROM sessions WHERE token = $1`,
    [token],
  );
  return live?.userId ?? null;
}

export async function throttled(request: Request): Promise<boolean> {
  const key = clientIp(request);
  const record = await queryOne<{ count: number; firstAt: string }>(
    `SELECT count, "firstAt" FROM login_attempts WHERE key = $1`,
    [key],
  );
  if (!record) return false;

  if (Date.now() - Number(record.firstAt) > ATTEMPT_WINDOW_MS) {
    await query(`DELETE FROM login_attempts WHERE key = $1`, [key]);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

export async function recordFailure(request: Request): Promise<void> {
  const key = clientIp(request);
  const now = Date.now();

  // One statement, so two failures arriving together cannot both read a count
  // of 2 and both write 3. A window older than the limit restarts the count.
  await query(
    `INSERT INTO login_attempts (key, count, "firstAt") VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE
        SET count = CASE WHEN $2 - login_attempts."firstAt" > $3 THEN 1
                         ELSE login_attempts.count + 1 END,
            "firstAt" = CASE WHEN $2 - login_attempts."firstAt" > $3 THEN $2
                             ELSE login_attempts."firstAt" END`,
    [key, now, ATTEMPT_WINDOW_MS],
  );
}

export async function startSession(
  request: Request,
  response: Response,
  userId: string,
): Promise<void> {
  await query(`DELETE FROM login_attempts WHERE key = $1`, [clientIp(request)]);

  const token = randomBytes(32).toString("hex");
  await query(`INSERT INTO sessions (token, "userId", "expiresAt") VALUES ($1, $2, $3)`, [
    digest(token),
    userId,
    Date.now() + SESSION_TTL_MS,
  ]);
  // Sweep whatever else has expired, so the table cannot grow without bound.
  await query(`DELETE FROM sessions WHERE "expiresAt" <= $1`, [Date.now()]);

  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export async function endSession(request: Request, response: Response): Promise<void> {
  const token = sessionToken(request);
  if (token) await query(`DELETE FROM sessions WHERE token = $1`, [token]);
  response.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Drops every session belonging to a user — used after a password change. */
export async function endSessionsForUser(userId: string, except?: Request): Promise<void> {
  const keep = except ? sessionToken(except) : undefined;
  await query(`DELETE FROM sessions WHERE "userId" = $1 AND token IS DISTINCT FROM $2`, [
    userId,
    keep ?? null,
  ]);
}

/** Requires a signed-in user. */
export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  if (!(await credentialsConfigured())) {
    response.status(503).json({
      error: "Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD.",
    });
    return;
  }

  const userId = await sessionUserId(request);
  const user = userId ? await getById(userId) : null;

  if (!user) {
    response.status(401).json({ error: "Sign in to continue." });
    return;
  }

  response.locals.user = user;
  next();
}

/**
 * Requires a signed-in user who has already replaced their initial password.
 * Enforced here as well as in the UI, so the forced change cannot be skipped by
 * calling the API directly.
 */
export async function requireSettledPassword(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(request, response, () => {
    if (response.locals.user?.mustChangePassword) {
      response.status(403).json({
        error: "Set a new password before continuing.",
        passwordChangeRequired: true,
      });
      return;
    }
    next();
  });
}
