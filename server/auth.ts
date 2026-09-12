import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { countUsers, getById } from "./users";

const COOKIE_NAME = "villa_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

interface Session {
  userId: string;
  expiresAt: number;
}

/** Live sessions, in memory — a restart signs everyone out. */
const sessions = new Map<string, Session>();
/** Failed logins per client address, to slow down guessing. */
const attempts = new Map<string, { count: number; firstAt: number }>();

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

function sweep(): void {
  const now = Date.now();
  sessions.forEach((session, token) => {
    if (session.expiresAt <= now) sessions.delete(token);
  });
}

/** The signed-in user's id, or null. */
export function sessionUserId(request: Request): string | null {
  sweep();
  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  return sessions.get(token)?.userId ?? null;
}

export function throttled(request: Request): boolean {
  const key = request.ip ?? "unknown";
  const record = attempts.get(key);
  if (!record) return false;

  if (Date.now() - record.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

export function recordFailure(request: Request): void {
  const key = request.ip ?? "unknown";
  const record = attempts.get(key);
  if (!record || Date.now() - record.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  record.count += 1;
}

export function startSession(request: Request, response: Response, userId: string): void {
  attempts.delete(request.ip ?? "unknown");

  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });

  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

export function endSession(request: Request, response: Response): void {
  const token = parseCookies(request.headers.cookie)[COOKIE_NAME];
  if (token) sessions.delete(token);
  response.clearCookie(COOKIE_NAME, { path: "/" });
}

/** Drops every session belonging to a user — used after a password change. */
export function endSessionsForUser(userId: string, except?: Request): void {
  const keep = except ? parseCookies(except.headers.cookie)[COOKIE_NAME] : undefined;
  sessions.forEach((session, token) => {
    if (session.userId === userId && token !== keep) sessions.delete(token);
  });
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

  const userId = sessionUserId(request);
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
