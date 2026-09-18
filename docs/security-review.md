# Security review — server and database

Scope: `server/`, `api/`, `scripts/`, `vercel.json`, and the live Supabase
project `green-villa` (`gjkpipfreccynndtmjan`). UI components were not reviewed
or changed.

Reviewed 2026-09-18 against `origin/main` at `4a6dd7e`, which includes the
Resend email notifications. Status: **fixed.** See [What was done](#what-was-done).
Two steps are left for you: set `DATABASE_CA_CERT` and deploy.

## Summary

| # | Severity | Finding | Status |
| --- | --- | --- | --- |
| H1 | High | No rate limiting on the public contact form (`POST /api/inquiries`) | Fixed |
| H2 | High | Contact form validation is too weak on the server | Fixed |
| H3 | High | The contact form sends a branded email to any address, with visitor-written text in it | Fixed |
| M1 | Medium | No security headers — no CSP, HSTS or `nosniff`, on the API or the site | Fixed |
| M2 | Medium | `/api/health` is public and describes the database; errors fall through to Express's default handler | Fixed |
| M3 | Medium | Live DB: the public key holds write grants on two realtime tables, and those objects are missing from the repo | Fixed (live DB and repo) |
| M4 | Medium | The database TLS certificate is never verified | Fixed in code; **needs `DATABASE_CA_CERT`** |
| M5 | Medium | Throttling keys on `request.ip`, which is not proxy-aware on Vercel | Fixed |
| L1 | Low | Session tokens are stored in plaintext | Fixed |
| L2 | Low | CORS has no explicit policy, and state-changing requests have no Origin check | Fixed |
| L3 | Low | Uploaded images are trusted by their declared MIME type | Fixed |
| L4 | Low | Admin-supplied strings have no length limits | Fixed |
| L5 | Low | The session cookie is `secure` only when `NODE_ENV=production` | Fixed |

Checked and found clean: SQL injection, stored XSS, secrets in code or git
history, payment card data, and known-vulnerable production dependencies. Details
are at the end.

---

## High

### H1 — No rate limiting on the contact form

`POST /api/inquiries` is unauthenticated and has no limits of any kind. One
script can insert rows as fast as the database accepts them. That fills the
admin dashboard with junk, pushes real guests out of view, and grows the
`inquiries` table without bound.

The live database makes this worse. The statement-level trigger
`inquiries_refresh_booked_dates` runs `DELETE FROM booked_dates` and then
recomputes every approved stay on **every** insert, so each spam row costs a
full rebuild of that table. Every insert also sends a realtime event to every
open admin dashboard.

Login has a DB-backed throttle (`login_attempts`). Nothing else does.

### H2 — Weak server-side validation on the contact form

`validate()` in `server/index.ts`:

- **Dates** only match `^\d{4}-\d{2}-\d{2}$`, so `2026-13-45` is accepted. The
  live trigger casts `"checkIn"::date`, so approving such a row fails in
  Postgres with a 500. There is also no bound on the date range. An inquiry
  from `0001-01-01` to `9999-12-31` passes validation. If it is ever approved,
  `generate_series` and `bookedDateKeys()` both expand it to about 3.6 million
  days. Dates in the past are also accepted.
- **Guests** are never validated. `Number("abc")` is `NaN`, which Postgres
  rejects for an `integer` column (500). The form offers 1–12, but the API
  accepts any value.
- **Lengths** are unbounded. The only cap is the 32 KB JSON body limit, which
  lets a single inquiry carry about 32 KB of name or message text.
- **Control characters** are not stripped.

### H3 — The contact form can email anyone

Found after the first draft of this review: `origin/main` had moved ahead of
the local checkout and adds `server/notify.ts`. Every inquiry now sends a
confirmation email, through Resend and from the villa's sender, to whatever
address the visitor typed. The greeting is `Hi ${firstName},`.

Anyone can therefore make the villa send a branded email to any inbox of their
choosing, with text they chose in the first line, such as a "name" that is
really a phishing lure or a link. Repeated at volume, this hurts the sending
domain's reputation and can get the Resend account suspended. HTML is escaped
correctly throughout, so there is no HTML or script injection into the email.
The problem is abuse of the email itself.

---

## Medium

### M1 — No security headers

Neither the API (Express) nor the static site (served by Vercel from `dist/`)
sets `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options`, `Referrer-Policy` or a frame-ancestors policy.
Express also advertises itself with `X-Powered-By: Express`. The site can be
framed, which enables clickjacking against `/admin`. There is no CSP backstop
if an XSS bug is ever introduced.

These responses come from two places. Express only serves `/api/*`. The HTML,
JS and CSS are served by Vercel, so their headers must be set in `vercel.json`.

### M2 — Information disclosure: `/api/health` and error handling

- `GET /api/health` is public. It returns the database **hostname**, which
  contains the Supabase project ref. It also returns the port, whether the user
  carries the project ref, whether the connection is pooled, which secret
  environment variables are set, and the driver's error code on failure.
  Individually none of these is a secret. Together they give an attacker a map
  of the backend.
- There is no final error handler. An exception, such as the `NaN` guests from
  H2, goes to Express's built-in `finalhandler`. That handler sends the
  **stack trace** whenever `NODE_ENV` is not `production` (local, preview, or any
  host that does not set it), and an HTML page otherwise.
- The multer error handler is registered in the middle of the route list. As a
  result, `PATCH /api/inquiries/:id/price` is declared after it.

### M3 — Live database: excess grants on the realtime tables, and schema drift

This was found by querying the live project (read-only). Results:

| Object | Finding |
| --- | --- |
| `inquiries`, `users`, `sessions`, `login_attempts` | RLS on, no policies, no `anon`/`authenticated` grants. **Sealed, as intended.** |
| `booked_dates`, `inquiry_pulse` | `anon` and `authenticated` hold `INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER`. RLS (SELECT-only policy) blocks the row writes, but `TRUNCATE` is **not** subject to RLS. |
| `refresh_booked_dates()`, `bump_inquiry_pulse()` | `SECURITY DEFINER` functions that `anon` can EXECUTE (Supabase advisor, WARN). Both return `trigger`, so Postgres refuses a direct RPC call. They are still unneeded exposure. |

PostgREST cannot issue a `TRUNCATE`, so this is not exploitable through the
public API today. It is still one misconfiguration away from being so, and the
public key should hold only `SELECT` on these tables.

Separately, `booked_dates`, `inquiry_pulse`, both trigger functions, both
triggers, their policies and the realtime publication **exist only in the live
database**. None of them is in the repo. A rebuilt or new environment would not
get them, and nothing in version control records what the public key is allowed
to do.

### M4 — Database TLS is not verified

`server/db.ts` connects with `ssl: { rejectUnauthorized: false }`. The
connection is encrypted but the server certificate is never checked. Anyone who
can intercept traffic between Vercel and Supabase could present their own
certificate and read or alter every query. That includes password hashes and
session tokens.

### M5 — Client IP detection

The login throttle keys on `request.ip`, and so would any new rate limiter.
`trust proxy` is not set, so on Vercel `request.ip` is whatever socket address
the runtime hands Express, not necessarily the visitor. If every visitor shares
one address, eight bad passwords from anyone lock out every admin (a
denial-of-service). If the address differs per request, the throttle does
nothing.

---

## Low

### L1 — Session tokens stored in plaintext

`sessions.token` holds the raw cookie value. Anyone who can read that table,
through a leaked backup, a mis-granted role or a log of queries, can sign in as
any active admin. Storing a SHA-256 of the token makes a leaked table useless.

### L2 — CORS and cross-site requests

No CORS headers are sent, so browsers already deny cross-origin **reads**, which
is effectively same-origin. Protection against cross-site **writes** rests
entirely on `SameSite=Lax` on the session cookie. The multipart upload endpoints
would accept a cross-site form post if that cookie attribute were ever relaxed
or bypassed. The fix is an explicit origin allowlist, and rejecting
state-changing requests whose `Origin` is not on it.

### L3 — Upload type is trusted from the client

`multer`'s `fileFilter` checks `file.mimetype`, which is whatever the browser
declared. The file bytes are never inspected. This is admin-only, and Supabase
serves each object with the declared image type, so this is a low risk. Checking
the file's magic bytes closes it.

### L4 — No length limits on admin input

Alt text, emails and passwords on the admin endpoints are bounded only by the
32 KB body cap. This is admin-only.

### L5 — Cookie `secure` flag depends on `NODE_ENV`

This is correct on Vercel today. Any HTTPS deployment that does not set
`NODE_ENV` would issue the session cookie without `secure`.

---

## Checked and clean

- **SQL / NoSQL injection.** Every query in `server/` passes values as `$n`
  parameters. The only string-built SQL is identifier interpolation
  (`public.${table}` in `lockDown()`, `FROM ${table}` in the migration script),
  and both take names from hard-coded lists. The Supabase JS client is used
  only for Storage, never for queries. No NoSQL store is used.
- **XSS.** Stored values (names, email, message, alt text) are saved raw and
  rendered by React, which escapes text. There is no `dangerouslySetInnerHTML`
  or `innerHTML` anywhere in `src/`. The `mailto:` href has a fixed prefix, and
  image URLs are minted by the server. Storing raw and encoding on output is
  correct, since HTML-encoding on input would double-escape. The CSP (M1) adds
  a second layer.
- **Secrets.** No keys, passwords or connection strings in the code. All 54
  commits (every branch) were scanned for `.env` files, JWTs, `sb_secret_` and
  `sb_publishable_` keys, Postgres URIs with credentials, AWS and Stripe keys,
  and PEM blocks. The only hits were placeholders (`you@example.com`,
  `choose-a-strong-one`, `<password>`). `.env` is git-ignored and was never
  committed. **No key needs to be rotated.** The publishable key served by
  `/api/realtime-config` is designed to be public.
- **Payments.** None. The only money data is an admin-entered agreed price
  (`priceAmount`, `priceCurrency`, `priceMode`). No card numbers, CVVs or
  payment tokens exist in the schema.
- **Dependencies.** `npm audit --omit=dev` finds 0 vulnerabilities.
- **Passwords.** scrypt with a per-user salt and timing-safe comparison. Unknown
  emails spend equal time (no enumeration). Sessions are 256-bit random,
  httpOnly, and dropped on password change or reset.

### Out of scope, but noticed

`lockDown()` runs on every cold start and revokes **all** grants from `anon`
on `site_images` and `location`. The live DB has SELECT policies on both, and
they are in the realtime publication, yet `anon` currently has no SELECT grant
on either. Live photo and map-pin updates therefore probably stop working after
each server boot, and the site falls back to polling. This is functional, not a
security issue, and making it work means *granting* more, so it is not changed
here.

---


## What was done

UI components were not changed. The contact form already sends data that
passes the new rules, and it shows the server's 429 message like any other
error.

| # | Fix | Where |
| --- | --- | --- |
| H1 | DB-backed fixed-window rate limits: 5 inquiries per hour per visitor, 60 per hour overall, 429 with `Retry-After`. Counted only once the form is valid, so fixing a typo is free. One atomic upsert per hit, so it holds across serverless instances. Old windows are swept. | `server/rate-limit.ts`, `rate_limits` table in `server/db.ts`, `POST /api/inquiries` |
| H2 | See the validation list below this table. | `server/validation.ts` |
| H3 | The rate limits above, plus at most **2 confirmation emails per recipient address per 24 h**. The inquiry is still saved and the hosts are still told; only the guest copy is skipped. Names that look like links or addresses (`://`, `www.`, `@`, `<`, `>`, common TLDs) are rejected. | `server/index.ts`, `server/notify.ts` (`confirmGuest` option), `server/validation.ts` |
| M1 | API: `helmet` with `default-src 'none'; frame-ancestors 'none'`, HSTS (2 years, preload), `nosniff`, `Referrer-Policy: no-referrer`, CORP same-origin, and no `X-Powered-By`. Site: see the CSP breakdown below this table. `npm run build` now fails, printing the new hash, if the inline script changes. | `server/security.ts`, `vercel.json`, `scripts/check-csp.mjs` |
| M2 | A final JSON error handler logs the full error server-side and returns only `Something went wrong`, or a generic 400/413 for malformed or oversized bodies. It covers unknown `/api` paths too. The multer handler moved to the end, after every route. Public `/api/health` now returns only `{ startup }`; the diagnostics show outside production or to a signed-in admin. A local server no longer crashes on start when the database is down. | `server/security.ts`, `server/index.ts` |
| M3 | **Live DB changed** (approved): `anon`/`authenticated` now hold only `SELECT` on `booked_dates` and `inquiry_pulse`, and `EXECUTE` on both trigger functions was revoked from `PUBLIC`/`anon`/`authenticated`. Verified afterwards: the grants read back as `SELECT` only, and a rolled-back test update still fired both triggers. The whole realtime setup is now in the repo, and `lockDown()` re-applies the REVOKEs on every boot. | `server/sql/realtime.sql`, `server/db.ts` |
| M4 | With `DATABASE_CA_CERT` set, the connection verifies the certificate (`rejectUnauthorized: true`). Without it, behaviour is unchanged plus a warning in the production log. | `server/db.ts` |
| M5 | `clientIp()` reads `x-real-ip` / `x-forwarded-for` on Vercel (which overwrites both, so a client cannot spoof them) and the socket elsewhere. Both the login throttle and the inquiry limit use it. | `server/security.ts`, `server/auth.ts` |
| L1 | Sessions are stored as `sha256(token)`. Every session from before the deploy stops matching and is swept at expiry, so **each admin signs in once more.** | `server/auth.ts` |
| L2 | CORS allowlist: same-origin, `ALLOWED_ORIGINS`, Vercel's production and deployment URLs, and the Vite dev server outside production. Only listed origins get `Access-Control-Allow-*`. Preflights and `POST`/`PUT`/`PATCH`/`DELETE` from any other origin get 403. | `server/security.ts` |
| L3 | Uploads must match JPEG, PNG or WebP magic bytes, and those must agree with the declared type. The legacy `/api/media/:file` route accepts only `<name>.<jpg\|png\|webp>`. | `server/validation.ts`, `server/index.ts` |
| L4 | Alt text ≤ 300 characters (control characters stripped), emails ≤ 254, passwords ≤ 200, gallery reorder ≤ 100 ids. | `server/index.ts` |
| L5 | The cookie is `secure` whenever `NODE_ENV=production` or `VERCEL` is set. | `server/auth.ts` |

**H2 validation rules:**

- Dates must be real calendar days (so `2026-02-30` fails).
- Check-in is no earlier than yesterday and no more than 2 years ahead.
- A stay is 1–60 nights.
- Guests must be an integer from 1 to 12.
- Lengths: first and last name ≤ 80, email ≤ 254, message ≤ 2000.
- Control characters are stripped. Newlines are kept only in the message.

**M1 site CSP:**

- `script-src 'self'` plus the SHA-256 of the inline language script.
- Styles: `'self' 'unsafe-inline'` (Leaflet and React style attributes).
  Fonts: `'self'` only — they are self-hosted, not loaded from Google.
- Images: `'self' data: blob:`, the Supabase project and OSM tiles.
- `connect-src`: `'self'` and the Supabase project over `https`/`wss`.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `upgrade-insecure-requests`.
- Also sent: HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` and
  `Permissions-Policy`.
- The CSP names the project host `gjkpipfreccynndtmjan.supabase.co`. If the
  project changes, update it.

### Verified

- `tsc -p tsconfig.server.json` passes, `oxlint` is clean, and `npm run build`
  passes, including the CSP check.
- **Validation:** checked directly against 16 cases, including impossible and
  far-future dates, 61 nights, `guests` of `abc`, 0 and 13, over-long fields,
  link-like names, Hebrew names and control characters.
- **Magic bytes:** JPEG, PNG and WebP are recognised, and HTML is rejected.
- **HTTP**, against a running server with the database down:
  - The API security headers are present, and there is no `X-Powered-By`.
  - Production `/api/health` returns only `{"startup":"failed"}`, while dev
    still shows diagnostics.
  - A foreign-origin POST or preflight gets 403. The dev origin is refused in
    production.
  - A foreign-origin GET gets no CORS headers, and same-origin gets through.
- **Errors:** a thrown DB-style error returns only the generic 500 message, and
  malformed JSON and oversized bodies return generic 400/413.
- **Rate-limit SQL:** run against a temp table in a rolled-back transaction on
  Supabase. The count rises 1…6 within the window and resets to 1 after it.

### Left for you

1. **Set `DATABASE_CA_CERT`** in Vercel. Download the CA from Supabase →
   Project Settings → Database → SSL Configuration, and paste the PEM (literal
   `\n` line breaks are fine). Until then, M4 is only a warning in the log.
2. **Deploy.** Every admin signs in once afterwards (L1). If the site gets a
   custom domain that is not Vercel's production domain, add it to
   `ALLOWED_ORIGINS`.
3. After the deploy, check the site loads in a browser with the CSP on (fonts,
   map tiles, photos, live updates). The policy was built from what the bundle
   loads, but it was not exercised in a browser here.
4. Optional, not security: the "Out of scope" note above about live updates for
   `site_images` and `location`.
