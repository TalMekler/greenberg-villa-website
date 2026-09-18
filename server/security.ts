import helmet from "helmet";
import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Headers, origin policy and client identity for the API.
 *
 * Express only ever serves `/api/*` — the HTML, JS and CSS come straight from
 * Vercel's static hosting, so the site's own CSP and HSTS are set in
 * `vercel.json`. The policy here is for JSON responses, which never need to run
 * a script, load a resource, or be framed.
 */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },
  strictTransportSecurity: { maxAge: 63_072_000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginResourcePolicy: { policy: "same-origin" },
});

export const isProduction = (): boolean =>
  process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

/**
 * Origins allowed to call the API from a browser, besides the API's own.
 *
 * ALLOWED_ORIGINS takes a comma-separated list (e.g. a custom domain). On
 * Vercel the production domain and this deployment's own URL are added
 * automatically; in development, the Vite dev server.
 */
function allowedOrigins(): Set<string> {
  const origins = new Set(
    (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );
  for (const host of [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]) {
    if (host) origins.add(`https://${host}`);
  }
  if (!isProduction()) {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
  }
  return origins;
}

/** Same-origin requests carry an Origin whose host is the one they were sent to. */
function isSameOrigin(request: Request, origin: string): boolean {
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CORS restricted to the site, and a hard stop for cross-site writes.
 *
 * Only listed origins get Access-Control-Allow-* headers, so every other site's
 * scripts are denied the response. Browsers send Origin on every POST, PUT,
 * PATCH and DELETE, so refusing a foreign Origin there blocks cross-site
 * request forgery independently of the cookie's SameSite attribute. Requests
 * with no Origin at all (curl, server-to-server) carry no ambient browser
 * cookie and are left to authentication.
 */
export const originPolicy: RequestHandler = (request, response, next) => {
  const origin = request.headers.origin;
  if (!origin) {
    next();
    return;
  }

  const allowed = isSameOrigin(request, origin) || allowedOrigins().has(origin);
  response.vary("Origin");

  if (allowed) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (request.method === "OPTIONS") {
    if (allowed) {
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      response.setHeader("Access-Control-Max-Age", "600");
    }
    response.status(allowed ? 204 : 403).end();
    return;
  }

  if (!allowed && unsafeMethods.has(request.method)) {
    response.status(403).json({ error: "Cross-origin requests are not allowed." });
    return;
  }

  next();
};

/**
 * The visitor's address, for throttling.
 *
 * On Vercel the socket belongs to Vercel's proxy, and the client is in
 * x-real-ip / x-forwarded-for — both of which Vercel overwrites, so a client
 * cannot choose its own value. Anywhere else the headers are ignored, because
 * without a proxy in front they are whatever the client says.
 */
export function clientIp(request: Request): string {
  if (process.env.VERCEL) {
    const real = request.headers["x-real-ip"];
    if (typeof real === "string" && real) return real.trim();
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  }
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
}

/**
 * The last word on any error: logged in full here, reported to the client as
 * nothing more than that something failed. No stack, no driver message, no SQL.
 */
export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const status = (error as { status?: number; statusCode?: number }).status ??
    (error as { statusCode?: number }).statusCode;

  // Body-parser errors (malformed JSON, oversized body) are the client's fault
  // and safe to name in general terms.
  if (status === 400 || status === 413 || status === 415) {
    response.status(status).json({
      error: status === 413 ? "That request is too large." : "That request could not be read.",
    });
    return;
  }

  console.error(`${request.method} ${request.path} failed:`, error);
  if (response.headersSent) return;
  response.status(500).json({ error: "Something went wrong. Please try again." });
}
