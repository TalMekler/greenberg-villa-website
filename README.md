# Green Villa

A booking site for a villa rental on Evia island, Greece — a public marketing
page plus a password-protected admin for handling enquiries, bookings, pricing
and site content. Built from a Figma design.

- **Public site** in English, Hebrew and Greek, with an availability calendar,
  an enquiry form and a live map.
- **Admin** at `/admin` for approving bookings, pricing stays, editing the
  photos and coordinates, and managing admin accounts.

**Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4 on the front end, an
Express API on the back, data stored as JSON files on disk.

---

## Requirements

| | |
| --- | --- |
| Node.js | `^20.19.0` or `>=22.12.0` — Vite 8 sets the floor |
| npm | 10 or newer (ships with those Node versions) |

Check with `node -v`. Nothing else is needed: no database, no Docker, no
external services.

## Setup

**1. Clone and install**

```bash
git clone https://github.com/TalMekler/greenberg-villa-website.git
cd greenberg-villa-website
npm install
```

**2. Create your admin credentials**

```bash
cp .env.example .env
```

Then open `.env` and set your own values:

```
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=choose-a-strong-one
```

These create the **first admin account** the first time the API starts. After
that, `server/data/users.json` is the source of truth and these values are
ignored — change your password from inside the admin, not here. The password
must be at least 8 characters with a letter and a number.

Do this **before** the first run. Without it the API starts but refuses every
sign-in, and `/admin` will tell you so.

**3. Run it**

```bash
npm run dev
```

| | |
| --- | --- |
| Site | http://localhost:5173 |
| Admin | http://localhost:5173/admin |
| API | http://localhost:3001 |

Sign in at `/admin` with the email and password you just put in `.env`.

## What `npm run dev` starts

Two processes, run together by `concurrently` and colour-tagged `web` and `api`:

- **`web`** — Vite dev server on `:5173`, serving the React app.
- **`api`** — the Express API on `:3001`, restarted on change by `tsx watch`.

Vite proxies `/api` through to the API, so the browser only ever talks to
`:5173` and there are no CORS concerns. Run them separately with `npm run dev:web`
and `npm run dev:api` if you prefer separate terminals.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Site + API together, for development |
| `npm run dev:web` | Vite only |
| `npm run dev:api` | API only, with watch |
| `npm run build` | Type-checks the whole project, then bundles to `dist/` |
| `npm run preview` | Serves the built bundle locally |
| `npm run lint` | oxlint over the source |
| `npm run a11y` | Accessibility audit (axe + keyboard, reflow, RTL) in Chrome, all three languages |
| `npm run compliance` | After `build`: no tracking before cookie consent, and every footer link, in Chrome — see `docs/compliance-summary.md` |
| `npm start` | Runs the API alone, without watch |

## Where the data lives

A Supabase project holds everything: the tables in its Postgres database, the
photos in a Storage bucket. Nothing that matters is kept on the server's disk,
so the app can run on a host whose filesystem is wiped on every deploy.

| Table | Contents |
| --- | --- |
| `inquiries` | Booking requests, their status and agreed price |
| `users` | Admin accounts — scrypt password hashes, never plaintext |
| `site_images` | Which photo fills each slot on the site, and gallery order |
| `location` | The map's centre point and zoom (a single row) |

The photo **files** live in a public Storage bucket (`site-images` by default),
and `site_images.url` holds each one's public URL. Public is deliberate: these
are the villa's marketing photos, every one of them is already on the public
site, and serving them from Supabase's CDN beats proxying the bytes through
this server. The service-role key is used only for writes and never reaches
the browser.

### How long data is kept

The privacy policy promises retention periods, and the server enforces them.
Both read the same numbers, in `src/lib/retention.ts`, so changing a period
there changes the code and the policy text in all three languages together.

| Data | Deleted |
| --- | --- |
| Requests that never became a booking (declined, cancelled, unanswered) | 6 months after the requested check-out |
| Approved bookings | 7 years after check-out (tax and accounting records) |
| Anti-abuse counters (visitor IP, guest email) | within 48 hours |
| Expired admin sessions, old failed-login counters | daily |

The purge (`server/retention.ts`) runs from a daily Vercel Cron at 03:00 UTC
(`vercel.json` → `GET /api/cron/retention`), which Vercel only authorises when
**`CRON_SECRET`** is set in the project's environment variables. As a fallback
it also runs at most once a day when a guest sends a request or a host opens
the inquiry list, so the periods hold even without the cron. Copies outside the
database — the hosts' mailboxes, Resend's email logs — are not touched by it.

### Connecting

Copy four values from the Supabase dashboard into `.env` (git-ignored):

| Variable | Where to find it |
| --- | --- |
| `DATABASE_URL` | Project Settings → Database → Connection string → **Transaction pooler** (port 6543) |
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SECRET_KEY` | Project Settings → API keys → secret key (older projects: `service_role`; `SUPABASE_SERVICE_ROLE_KEY` is still accepted) |
| `SUPABASE_BUCKET` | Optional; defaults to `site-images` |

Use the **pooled** connection string, not the direct one. Two reasons, and the
second one is fatal rather than merely wasteful:

- Supabase caps direct connections, and serverless opens many short-lived ones.
- `db.<ref>.supabase.co`, the direct host, publishes **no A record** — it is
  IPv6-only. Vercel's functions are IPv4, so they cannot resolve it at all, and
  the API fails at startup with `ENOTFOUND`.

The pooled URI differs in three places, all easy to miss when typing it by hand:

```
postgresql://postgres.<ref>:<password>@aws-N-<region>.pooler.supabase.com:6543/postgres
             ^^^^^^^^^^^^^^                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^
             user carries the ref          pooler host, not db.<ref>          6543
```

`GET /api/health` reports which variables the server can see and the driver's
error code if it cannot connect — enough to tell a missing variable from a
rejected password (`28P01`) from this DNS failure (`ENOTFOUND`), without
putting anything sensitive in a public response.

Tables and the bucket are created on first boot, and on a first run with no
photos the store seeds itself from `src/assets/images/`, so the site looks
complete straight away.

### Migrating from the local SQLite database

Earlier versions kept `server/data/villa.db` and `server/data/uploads/`. To move
that into Supabase, set the four variables above and run:

```bash
npm run migrate:supabase -- --dry   # report what would move, change nothing
npm run migrate:supabase            # do it
```

It uploads the files first, then writes all four tables in a single
transaction, rewriting every `site_images.url` to its new bucket URL. It
refuses to run if the Supabase tables already hold rows, so it cannot duplicate
anything, and it deletes nothing locally — `villa.db` and `uploads/` stay put
as your fallback. Afterwards it verifies row counts, that the password hashes
came across unchanged, and that no image URL was left pointing at the old
`/api/media` path.

Links minted before the move still work: `/api/media/<file>` now answers with a
permanent redirect to the same object in the bucket.

## Live updates

An open page follows the database without being reloaded: approve a booking and
the calendar greys out those days, swap a photo and it changes, move the pin and
the map follows.

The browser subscribes to Supabase Realtime with the **publishable** key and
watches three tables — `booked_dates`, `site_images` and `location`. Nothing is
read through that connection. A change arrives, and the app re-fetches from this
API, which stays the single source of truth for shape and for what a visitor may
see. The subscription is a doorbell, not a door.

`inquiries` is never watched. Pushing its changes would mean letting the browser
read it, and it holds guests' names, emails and messages. Two trigger-maintained
stand-ins carry the signal instead, neither holding any guest data:
`booked_dates`, which is the days an approved stay occupies — already shown to
everyone by the calendar — and `inquiry_pulse`, a single row bumped whenever
anything in `inquiries` changes, carrying a counter and a timestamp. The
dashboard hears the pulse move and re-fetches through the authenticated API.
Verified with the publishable key:

| Table | Readable with the public key |
| --- | --- |
| `booked_dates`, `inquiry_pulse`, `site_images`, `location` | yes, by design |
| `inquiries`, `users`, `sessions`, `login_attempts` | no — `42501` |

Nothing is on a timer while the socket is up — not on the site, not in the
dashboard. A 30-second poll is started only when the channel reports that it
could not connect or has dropped, and is torn down again the moment it
reconnects. A hidden tab reloads once when it is brought back, since the socket
may have closed while it was away.

`/api/realtime-config` serves the browser its URL and publishable key, so no
`VITE_`-prefixed variables are needed and rotating the key does not mean
rebuilding.

## Deploying

The whole thing runs on Vercel: the built SPA as static files, the Express API
as a single serverless function.

`vercel.json` does the wiring — `npm run build` into `dist/`, every `/api/*`
request rewritten to `api/index.ts` (which exports the Express app; an Express
app is already a `(req, res)` handler), and everything else falling back to
`index.html` so a direct hit on `/admin` resolves. The seed photos are listed in
`includeFiles`, or they would be absent from the function bundle.

Set these in **Vercel → Settings → Environment Variables**, not just in `.env`:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Supabase **Transaction pooler** URI, port 6543 |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Server-side only — never expose it to the browser |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Only used to create the very first account |
| `DATABASE_CA_CERT` | Recommended. Supabase's CA (PEM), so the database certificate is verified |
| `ALLOWED_ORIGINS` | Optional. Extra origins (e.g. a custom domain) allowed to call the API from a browser |

On Vercel the session cookie is always marked `secure`. `API_PORT` is irrelevant there — the function never binds a port,
because `app.listen()` is skipped whenever `VERCEL` is set.

### Sessions

Sessions and the login throttle live in Postgres, not in memory. On Vercel
consecutive requests routinely land on different instances, so an in-memory map
would sign the admin out at the first navigation and reset the throttle just as
often.

### Row-level security

Supabase exposes the `public` schema over PostgREST, and its publishable key is
designed to ship in browsers. Every table here is reached only by the API
server, over the Postgres connection string, as a role that bypasses RLS — so
`ensureSchema()` enables RLS with **no policies**, which denies everyone else,
and revokes the table grants from `anon` and `authenticated` as well. Without
that, the publishable key alone would read password hashes, guest details and
live session tokens.

Supabase's linter will report "RLS enabled, no policy" at INFO level for these
tables. That is the intended state, not a gap.

The realtime tables the browser *is* allowed to read — `booked_dates`,
`inquiry_pulse` and their triggers — are defined in `server/sql/realtime.sql`.
Run it in the SQL editor on a new project. They are granted `SELECT` only.

### Security

See `docs/security-review.md` for the full review. In short:

- **Headers.** The API sets its own via `helmet`. The site's CSP, HSTS and
  friends are in `vercel.json`. The CSP allows the one inline script in
  `index.html` by hash, and `npm run build` fails with the new hash if that
  script changes.
- **Origins.** Browsers may call the API only from the site itself (plus
  `ALLOWED_ORIGINS`). Writes from any other origin get a 403. When running the
  front end locally against a *deployed* API (`API_PROXY`), add
  `http://localhost:5173` to that deployment's `ALLOWED_ORIGINS`.
- **Rate limits.** The contact form allows 5 inquiries per hour per visitor and
  60 per hour overall. Any one address gets at most 2 confirmation emails a day.
  Login allows 8 failures per 15 minutes. All counters live in Postgres.
- **Errors.** Clients get a generic message; the details go to the server log.
  `/api/health` shows diagnostics only outside production or to a signed-in
  admin.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `/admin` says credentials are not configured | No `.env`, or the API has not been restarted since you created it |
| Sign-in rejected after several tries | Login throttling: 8 failed attempts per 15 minutes, then a pause |
| Signed out unexpectedly | The 8-hour session expired, or your password was changed elsewhere |
| Contact form says "Too many requests" | The per-visitor or overall inquiry limit was hit; it clears within the hour |
| Admin actions fail with 403 "Cross-origin" | The page's origin is not the API's own and not in `ALLOWED_ORIGINS` |
| Calendar and photos are empty | The API is not running — only `dev:web` was started |
| Push to GitHub fails with `HTTP 400` | The repo carries ~22 MB of images; `git config http.postBuffer 524288000` |

---

## Routes

| Path | Page |
| --- | --- |
| `/` | The public marketing site |
| `/admin` | Booking admin — inquiries, approvals, bookings |
| `/:lang/privacy` | Privacy policy (`en`, `he`, `el`) |
| `/:lang/terms` | Terms & booking conditions |
| `/:lang/accessibility` | Accessibility statement (placeholder) |

The legal pages carry their language in the path; `/privacy` and the others
without one redirect to the visitor's language. Their text is in `src/legal/`,
and the operator's details — used there and in the footer — in
`src/data/operator.ts`. Anything in `[[DOUBLE_BRACKETS]]` is still to be filled in.

Client-side routing via `react-router-dom`. When hosting the production build,
point the server's SPA fallback at `index.html` so a direct hit on `/admin`
resolves (Netlify `/* /index.html 200`, Vercel rewrite, or nginx `try_files`).

## Structure

One component per file. Components that only make sense together — a panel and
the rows it renders, a form and its confirmation screen — live in a folder with
whatever they share (props, helpers, styles) and an `index.ts` that exports the
one thing the rest of the app uses.

```
src/
  assets/          images and icons exported from Figma (+ typed index modules)
  components/
    admin/
      shared/      FieldError + the field, label and button classes every panel uses
      auth/        LoginForm, ChangePasswordForm, ForcedPasswordChange
      dashboard/   Dashboard + StatusPill, StayCell, SummaryTile
      images/      ImagesPanel + SingleImageEditor, GalleryEditor, GalleryRow,
                   ExploreEditor, and the props/helpers they share
      stats/       StatsPanel + StatCard, Delta, its own label style
      users/       UsersPanel + UserRow
      BookingPriceForm.tsx, LocationPanel.tsx   (no siblings, so no folder)
    layout/        Navbar, Footer
    sections/      About, Availability, Explore, Gallery, Hero, Transit
      contact/     Contact + RequestSent, FieldError, form types
      location/    Location + MapPanel
    ui/            Button, Icon, SectionHeading, Lightbox, VillaMap
  data/            page structure (nav order, icons) — the words live in i18n/
  i18n/            LanguageProvider + the en / he / el dictionaries
  hooks/           data fetching, scroll reveal, scrollspy, body-scroll lock
  lib/             api client, dates, stats, and the types shared with the server
  pages/           PublicSite, Admin (Admin is only the auth gate)
server/            Express API: routes, inquiry/user/media/location stores, auth
```

## Design decisions

- **Tokens.** The Figma file defines no variables, so the raw hex values were
  lifted into a token set (`--color-navy`, `--color-terracotta`, `--color-cream`,
  …) and everything references those rather than literals.
- **Responsive.** Only a 1440px desktop frame exists in Figma. Desktop matches
  the frame; the tablet and mobile breakpoints below it were derived from it —
  grids collapse to one or two columns, the nav becomes a slide-down menu, and
  the calendar shrinks its cells and single-letter weekday labels.
- **Assets.** Photos and icons are the ones exported from the Figma node, stored
  locally (photos re-encoded to JPEG at ≤1600px) rather than linked to Figma's
  short-lived CDN URLs. Icons render at their designed leaf size inside their
  designed container.

## Interactive behaviour

- **Calendar** — opens on the **current month**, with days before today greyed
  out and the back arrow disabled at the current month. Month navigation forward,
  click-to-pick a check-in then check-out date, booked days blocked (a range
  spanning a booked night restarts the selection). It starts completely empty:
  the only dates that ever read as booked are stays an admin has approved.
- **Contact form** — client-side validation (required fields, email format,
  check-out after check-in) with per-field messages and a success state. Dates
  picked in the calendar prefill the form. A valid submit files an inquiry into
  the shared store, where the admin page picks it up.
- **Gallery lightbox** — click any image; arrow keys and Esc work, page scroll is
  locked while open.
- **Map** — the location section shows a real OpenStreetMap view centred on the
  villa, rendered with Leaflet. Scroll-wheel zoom is off so the map does not
  hijack page scrolling; use the +/- controls. The coordinates are editable in
  the admin.
- **Languages** — English (default), Hebrew and Greek, switchable from the
  navbar. See below.
- **Navigation** — smooth scrolling, a navbar that solidifies on scroll and
  underlines the section in view, plus fade-up reveals. All motion is disabled
  under `prefers-reduced-motion`. The reveal observer re-runs when the language
  changes, since switching can remount revealed content — and React keys on
  translated strings are avoided for the same reason.

## Admin page (`/admin`)

Sign-in required, with multiple admin accounts.

**Accounts** live in `server/data/users.json` (git-ignored). Passwords are stored
as `scrypt` hashes with a per-account random salt — never in plaintext, and the
hash never leaves the server. The **first** account is created from `ADMIN_EMAIL`
and `ADMIN_PASSWORD` in `.env` on a run where the file does not exist yet; after
that the file is the source of truth and those env vars are ignored (change the
password in the admin, not in `.env`). With neither a file nor env vars the API
rejects every sign-in and the page says so, rather than falling open.

**Authentication is enforced on the API**, not just in the UI: `/api/inquiries`,
`/api/users` and the PATCH route return `401` without a session, so guest details
cannot be read by calling the endpoint directly. Details:

- Sessions are a random 32-byte token in an `httpOnly`, `sameSite=lax` cookie
  (`secure` when `NODE_ENV=production`), valid 8 hours. Script on the page cannot
  read it. Tokens live in server memory, so restarting the API signs everyone out.
- Wrong email and wrong password return the same message, and an unknown email
  still runs a scrypt derivation so response timing cannot enumerate accounts.
- Failed sign-ins are throttled per client address: 8 attempts per 15 minutes,
  then `429`.
- Changing your password invalidates your other sessions.
- The page injects `robots: noindex, nofollow` while mounted.

**Password rules:** at least 8 characters with a letter and a number, and the new
password may not equal the current one. Checked on the server.

**New users** are added with an email and an initial password. They land on a
forced *Choose a password* screen at first sign-in and cannot reach anything else
until they replace it — the API returns `403 passwordChangeRequired` on every
admin route while the flag is set, so the step cannot be skipped by calling the
API directly.

**Resetting someone's password** puts their account back into that same state:
their existing sessions are dropped immediately, their old password stops working,
and the new one is single-use until they choose their own. You cannot reset your
own password through this route — use the change-password form, which requires
the current password.

**Deleting a user** drops their sessions at once. You cannot delete the account
you are signed in with, and the API refuses to remove the last remaining
account, so the admin can never be locked out.

What it does:What it does:

- **Inquiries** — every request the contact form has produced, filterable by
  status (all / pending / approved / declined / cancelled), with the guest's
  details, requested stay, message and submission date.
- **Statistics** — revenue, bookings, nights and guests for a chosen month,
  each against the previous month and the same month a year earlier; a 12-month
  revenue chart; and the most popular nights of the week.
- **Map location** — set the latitude, longitude and zoom, either by typing or
  by dragging the pin on a live preview map.
- **Site photos** — replace the hero and about photos, add / remove / reorder /
  re-describe gallery photos, and swap the photo on each of the six explore
  cards. Changes are live on the public page immediately.
- **Account & access** — change your own password; list, add, delete and
  password-reset admin accounts.
- **Approve** — confirms a stay. Its dates immediately read as booked in the
  public availability calendar. Approval is blocked, with a reason, when the
  dates overlap a stay that is already taken.
- **Decline** — clears a pending request without booking it.
- **Bookings** — every confirmed stay, each with a two-step **Cancel booking**
  that releases the dates back into the calendar, and a **price** for the stay.
- **Pricing** — enter an amount in EUR, USD or ILS as either a nightly rate or a
  whole-stay total; the other figure is derived and previewed live. Only
  confirmed bookings can be priced, and prices are admin-only — the public
  availability endpoint returns dates and nothing else. The Bookings heading
  totals revenue **per currency**, never as one mixed number.

### API

An Express server in `server/` owns the data. It persists to
`server/data/inquiries.json` (git-ignored), writing through a temp file +
rename so a crash mid-write cannot truncate it.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/availability` | Taken dates only — **no guest details**. What the public calendar reads. |
| `GET` | `/api/location` | Map centre and zoom. Public — the marketing page reads it. |
| `PUT` | `/api/location` | Updates them. **Requires sign-in.** |
| `GET` | `/api/site-images` | Hero + gallery photos. Public — the marketing page reads it. |
| `GET` | `/api/media/:file` | The uploaded files themselves, read-only. |
| `POST` | `/api/site-images/single/:key` · `/explore/:slug` · `/gallery` | Uploads (multipart). **Requires sign-in.** |
| `DELETE` | `/api/site-images/gallery/:id` | Removes a gallery photo. Refuses the last one. |
| `PATCH` | `/api/site-images/:id/alt` | Edits a photo's description. |
| `POST` | `/api/site-images/gallery/order` | Reorders the gallery. |
| `GET` | `/api/inquiries` | The full inquiry list. **Requires sign-in.** |
| `POST` | `/api/inquiries` | Files a booking request. Validates and returns `400` with per-field errors. |
| `PATCH` | `/api/inquiries/:id` | Sets status. **Requires sign-in.** Returns `409` if approving would overlap a confirmed booking. |
| `PATCH` | `/api/inquiries/:id/price` | Sets or clears the price on a confirmed booking (`{"amount": null}` clears). |
| `POST` | `/api/auth/login` · `/api/auth/logout` · `GET /api/auth/session` | Admin session. |
| `POST` | `/api/account/password` | Changes your own password. Allowed while a forced change is pending. |
| `GET`/`POST` | `/api/users` | Lists / creates admin accounts. **Requires sign-in and a settled password.** |
| `DELETE` | `/api/users/:id` | Removes an account and kills its sessions. Refuses your own account and the last one. |
| `POST` | `/api/users/:id/password` | Issues another admin a new initial password and kills their sessions. |

The public site and the admin page hit different endpoints on purpose: the
marketing page never downloads anyone's name, email or message, only the dates
that are unavailable.

The server re-runs validation and the overlap check itself rather than trusting
the UI — the admin's disabled Approve button is a convenience, not the guard.

To move to a real database, replace `server/store.ts`; the routes and the whole
client stay as they are.

## Site photos

Every photo on the public page except the hosts' portrait is data, not a bundled
asset: the records live in `server/data/site-images.json` with the files in
`server/data/uploads/` (both git-ignored). On the first run the store is **seeded
by copying the images the site shipped with**, so the admin edits real records
from the start rather than a mix of bundled and uploaded files.

The `.jpg` files still in `src/assets/images/` are what that seeding copies from
— only `hosts.jpg` is imported by the app itself, but the rest are not dead code.

Three kinds of slot:

| Slot | Editing |
| --- | --- |
| `hero`, `lifestyle` (the about photo) | Replace-only — one photo each |
| `gallery` | Add, remove, reorder, re-describe |
| `explore.<slug>` (six cards) | Replace-only — the cards' titles and text stay in `src/data/site.ts` |

Upload handling:

- Accepts JPEG, PNG and WebP up to 8MB; anything else is rejected before it
  touches the disk (uploads are buffered in memory and checked first).
- Files are written under a server-generated UUID name — the client's filename is
  never used, so it cannot influence the path or the extension.
- Replacing the hero or deleting a gallery photo sweeps the now-unreferenced file
  from disk, so uploads do not accumulate.
- A description is required for every gallery photo and carried into the `alt`
  attribute and the lightbox caption.
- The gallery keeps at least one photo; the API refuses to delete the last.

The gallery grid is built from a repeating **2 / 3 / 2** pattern of wide and
narrow slots rather than seven fixed positions, so the Figma layout is preserved
at seven photos and still holds together at any other count.

## Map tiles

Tiles come straight from `tile.openstreetmap.org`, which is fine for development
and light traffic but is **not** intended to serve a production site — OSM's tile
usage policy asks for a dedicated provider above modest volumes. To switch, change
the one `L.tileLayer(...)` URL in `src/components/ui/VillaMap.tsx` to a provider
such as MapTiler, Stadia or Mapbox and keep their attribution.

The illustrated map from the Figma frame (two rotated polygons on a blue
rectangle) has been replaced: a drawn coastline cannot place a pin at real
coordinates. Its exported SVGs were deleted along with it.

The centre point lives in `server/data/location.json` (git-ignored), falling back
to the default in `src/lib/location.ts` when the file is absent or malformed, so
the map always renders. Latitude, longitude and zoom are range-checked on the
server, not only in the form.

## Cookies and consent

A first visit to the public site or a legal page shows a cookie banner with
**Reject all**, **Accept all** (styled identically) and **Customize**. The choice
is kept in local storage (`greenberg-villa:cookie-consent`) for 6 months, then
asked again; the footer's **Cookie settings** reopens the dialog at any time. The
admin never shows it.

Today the site uses nothing that needs consent — only strictly necessary storage
(language, the consent record, the hosts' session cookie, and Cloudflare's
`__cf_bm` on supabase.co). OpenStreetMap tiles and the self-hosted fonts set no
cookies. The full table is in the privacy policy's `#cookies` section.

**Adding an analytics or marketing tool:** register it in `optionalScripts` in
`src/lib/consent.ts` (never in `index.html` or a component), so it only loads after
consent and its cookies are cleared on withdrawal. Add its host to the CSP in
`vercel.json`, add a row to the cookie table in `src/legal/{en,he,el}.ts`, and bump
`VERSION` in `consent.ts` so everyone is asked again.

## Statistics

Computed in the browser from the inquiry list the admin already loads
(`src/lib/stats.ts`), so there is no extra endpoint and nothing to keep in sync.
Only **confirmed** bookings count — pending, declined and cancelled ones are
excluded everywhere.

Two choices change the numbers, so both are explicit controls rather than
assumptions:

- **Count by** — *check-in date* answers "how did this month trade"; *approval
  date* answers "how much did we confirm this month". The same data can read very
  differently: in testing, one month showed €5,300 by check-in and €6,800 by
  approval.
- **Currency** — revenue is only ever shown for one currency at a time. Adding
  euros to shekels would produce a meaningless number, so the panel refuses to.

The weekday breakdown counts **every night of every stay**, not arrival days: a
Monday-to-Friday booking counts towards Monday, Tuesday, Wednesday and Thursday.
Check-out nights are excluded because nobody sleeps in them — which also keeps
the seven buckets summing exactly to the total night count, a useful check. It
always uses stay dates regardless of the *Count by* toggle.

Percentage changes show `new` rather than infinity when the baseline is zero.

## Languages

English, Hebrew and Greek, chosen from the navbar. English is the default; the
choice is remembered in `localStorage`.

All copy lives in `src/i18n/{en,he,el}.ts`, typed against one `Dictionary`
interface — adding a key makes TypeScript demand it in all three, so a language
cannot silently fall back to English mid-sentence. `src/data/site.ts` keeps only
structure (nav order, which icon goes where); the words are all in the
dictionaries.

**Direction.** Hebrew sets `dir="rtl"` on the document and the layout mirrors.
The directional utilities were replaced with logical ones — `text-start`,
`ps-`/`pe-`, `start-`/`end-` — so one set of classes serves both directions.

**Type.** Each language gets faces that cover its script, declared per
`:root[lang]`:

| | Headings | Body |
| --- | --- | --- |
| English | Cormorant Garamond | Source Sans 3 |
| Hebrew | Frank Ruhl Libre | Assistant |
| Greek | GFS Didot | Source Sans 3 |

They are self-hosted from the `@fontsource` packages (`src/fonts.ts`) — no
request goes to Google, so no visitor's IP address does either. Each face is
served with a unicode-range, so a visitor only downloads the files for the
script they are reading — GFS Didot is never fetched unless Greek is selected. GFS Didot covers
Latin as well as Greek, so the brand name keeps the display face in Greek; the
Greek stack still falls back to Cormorant Garamond for anything it misses.

GFS Didot ships regular weight only, which is fine here: no heading in the design
is bold.

**Optical sizing.** The replacement faces have smaller x-heights than the ones
the Figma design was drawn with, so at the same pixel size the page reads
smaller. `font-size-adjust` corrects this by scaling each face to a target
x-height ratio — one rule instead of editing every size.

| | Design's face | Now | Target | Effect |
| --- | --- | --- | --- | --- |
| Headings (en) | DM Serif Text 0.480 | Cormorant Garamond 0.386 | `0.444` | ×1.15 |
| Headings (he) | — | Frank Ruhl Libre 0.468 | `none` | already close |
| Headings (el) | — | GFS Didot 0.456 | `none` | already close |
| Body (all) | Manrope 0.540 | Source Sans 3 0.486 / Assistant 0.485 | `0.54` | ×1.11 |

The heading target is 0.444 rather than a full 0.48 match: full parity would
scale Cormorant ×1.24 and make the wordmark wider than the original, whereas
×1.15 restores presence without stretching line lengths. Browsers without
`font-size-adjust` simply render the unscaled faces.

**Dates and numbers** follow the language: month names, weekday names and long
dates all come from `Intl` with the active locale. The calendar's compact
weekday headers use `Intl`'s *narrow* names rather than the first letter of the
short name — in Hebrew six of seven short names begin with the same letter.

**Not translated, by design:**

- The **admin** is English-only. It declares `lang="en"` while mounted so it does
  not inherit the visitor's language or fonts, and restores it on the way out.
- **Photo descriptions** (`alt` text) come from the image store and stay in
  whatever language the admin typed them in.
