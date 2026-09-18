import express from "express";
import multer from "multer";
import {
  credentialsConfigured,
  endSession,
  endSessionsForUser,
  recordFailure,
  requireAuth,
  requireSettledPassword,
  sessionUserId,
  startSession,
  throttled,
} from "./auth";
import {
  MIN_PASSWORD_LENGTH,
  authenticate,
  changePassword,
  countUsers,
  createUser,
  deleteUser,
  ensureBootstrapUser,
  findByEmail,
  getById,
  listUsers,
  normaliseEmail,
  resetPassword,
} from "./users";
import { ensureSchema } from "./db";
import { ensureBucket, publicUrl } from "./storage";
import { readLocation, writeLocation } from "./location";
import {
  addGalleryImage,
  listSiteImages,
  removeGalleryImage,
  reorderGallery,
  replaceExplore,
  replaceSingle,
  updateAlt,
} from "./media";
import { ZOOM_RANGE, isValidLocation, type VillaLocation } from "../src/lib/location";
import { languages, type Language } from "../src/i18n/types";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  exploreSlugs,
  singleImageKeys,
  type ExploreSlug,
  type SingleImageKey,
} from "../src/lib/site-images";
import { bookedDateKeys, hasConflict } from "../src/data/availability";
import {
  currencies,
  priceModes,
  type BookingPrice,
  type Currency,
  type InquiryStatus,
  type PriceMode,
} from "../src/lib/inquiry";
import { createInquiry, deleteInquiry, listInquiries, setPrice, updateStatus } from "./store";
import { clientIp, errorHandler, isProduction, originPolicy, securityHeaders } from "./security";
import { hit, sweep, type Limit } from "./rate-limit";
import { isCronRequest, purgeExpired, purgeIfDue } from "./retention";
import { LIMITS, cleanText, isEmail, sniffImageType, validateInquiry } from "./validation";
import { notificationsConfigured, notifyNewInquiry, sendTestEmail } from "./notify";

// Reads ADMIN_USERNAME / ADMIN_PASSWORD without committing them to the repo.
try {
  process.loadEnvFile();
} catch {
  // No .env file — fall back to whatever is already in the environment.
}

const app = express();
// Deliberately not `PORT`: dev harnesses often set that for the web server.
const port = Number(process.env.API_PORT ?? 3001);

app.disable("x-powered-by");
app.use(securityHeaders);
app.use(originPolicy);
app.use(express.json({ limit: "32kb" }));

/*
  Schema, bucket and the first account are set up once per instance, lazily.

  Doing it with top-level await instead meant that any failure — a missing
  DATABASE_URL, a password Postgres rejects — threw while the module was being
  imported. On Vercel that surfaces as FUNCTION_INVOCATION_FAILED with no
  message at all, which is indistinguishable from a broken deployment. Behind a
  promise, the same failure becomes a 503 with a reason, and the next request
  retries rather than being stuck with a poisoned module.
*/
let startup: Promise<void> | null = null;

function ready(): Promise<void> {
  startup ??= (async () => {
    await ensureSchema();
    await ensureBucket();
    await ensureBootstrapUser();
  })().catch((error: unknown) => {
    startup = null; // let the next request try again
    throw error;
  });
  return startup;
}

/**
 * Reports whether the server is up. The public gets only that. The diagnostics
 * — which variables are set, where the database is, the driver's error code —
 * are for a developer: shown outside production, or to a signed-in admin. None
 * of it is secret, but together it is a map of the backend.
 */
app.get("/api/health", async (request, response) => {
  let startupState = "ok";
  let code: string | undefined;
  try {
    await ready();
  } catch (error) {
    startupState = "failed";
    const problem = error as { code?: string; name?: string };
    code = problem.code ?? problem.name ?? "unknown";
  }
  const status = startupState === "ok" ? 200 : 503;

  // Only ask who is asking when the database can answer.
  const detailed =
    !isProduction() ||
    (startupState === "ok" && (await sessionUserId(request).catch(() => null)) !== null);
  if (!detailed) {
    response.status(status).json({ startup: startupState });
    return;
  }

  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DATABASE_CA_CERT: Boolean(process.env.DATABASE_CA_CERT),
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SECRET_KEY: Boolean(
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    ADMIN_EMAIL: Boolean(process.env.ADMIN_EMAIL ?? process.env.ADMIN_USERNAME),
    ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    RESEND_API_KEY: notificationsConfigured(),
    CRON_SECRET: Boolean(process.env.CRON_SECRET?.trim()),
  };

  /*
    The host and port are not secrets — the host is derivable from the project
    ref, and the port is one of two well-known numbers. Reporting them turns
    "ENOTFOUND" into an obvious diagnosis, because the single most common cause
    is the direct database host (IPv6-only, which Vercel cannot resolve) being
    used in place of the pooler. The password is never touched.
  */
  let target: Record<string, unknown> | undefined;
  if (process.env.DATABASE_URL) {
    try {
      const dsn = new URL(process.env.DATABASE_URL);
      target = {
        host: dsn.hostname,
        port: dsn.port,
        userHasProjectRef: dsn.username.includes("."),
        looksPooled: dsn.hostname.includes(".pooler.supabase.com") && dsn.port === "6543",
      };
    } catch {
      target = { parse: "DATABASE_URL is not a valid URL" };
    }
  }

  response.status(status).json({ env, database: target, startup: startupState, code });
});

/** Everything else waits for that setup, and reports plainly if it failed. */
app.use("/api", async (_request, response, next) => {
  try {
    await ready();
    next();
  } catch (error) {
    console.error("Startup failed:", error);
    response.status(503).json({
      error: "The server could not reach its database. Check /api/health.",
    });
  }
});

/**
 * Uploads are held in memory, checked, then written under a generated name — the
 * client's filename never touches the filesystem.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    callback(null, ACCEPTED_IMAGE_TYPES.includes(file.mimetype));
  },
});

/**
 * Photos are served straight from Supabase Storage now, so records hold a
 * public bucket URL. This route only covers links minted before that move —
 * anything still pointing at /api/media is sent on to the same object.
 */
app.get("/api/media/:file", (request, response) => {
  const file = String(request.params.file);
  // Legacy uploads were always `<uuid>.<ext>`; nothing else is a real object.
  if (!/^[\w-]+\.(jpe?g|png|webp)$/i.test(file)) {
    response.status(404).json({ error: "No such file." });
    return;
  }
  response.redirect(308, publicUrl(file));
});

const statuses: InquiryStatus[] = ["pending", "approved", "declined", "cancelled"];

/** Returns a message when the password is unacceptable, or null when it is fine. */
function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > LIMITS.password) {
    return `Use at most ${LIMITS.password} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use at least one letter and one number.";
  }
  return null;
}

/** A photo description from the request, or a 400 already sent when it is too long. */
function readAlt(request: express.Request, response: express.Response): string | null {
  const alt = cleanText(request.body?.alt);
  if (alt.length > LIMITS.alt) {
    response
      .status(400)
      .json({ errors: { alt: `Keep the description under ${LIMITS.alt} characters.` } });
    return null;
  }
  return alt;
}

/*
  The public contact form. Every inquiry saves a row and sends two emails —
  one of them to whatever address the visitor typed — so it is limited per
  visitor, and overall so a crowd of addresses cannot flood it either.
*/
const inquiryLimits = {
  perVisitor: { name: "inquiry-ip", max: 5, windowMs: 60 * 60 * 1000 },
  overall: { name: "inquiry-all", max: 60, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, Limit>;

/** One recipient gets at most this many confirmations a day, whoever asks. */
const confirmationLimit: Limit = { name: "confirm-to", max: 2, windowMs: 24 * 60 * 60 * 1000 };

/** Public: only the taken dates, never any guest details. */
/** Public: where the map is centred. */
app.get("/api/location", async (_request, response) => {
  response.json(await readLocation());
});

app.put("/api/location", requireSettledPassword, async (request, response) => {
  const candidate: Partial<VillaLocation> = {
    latitude: Number(request.body?.latitude),
    longitude: Number(request.body?.longitude),
    zoom: Number(request.body?.zoom),
  };

  const errors: Record<string, string> = {};
  if (!Number.isFinite(candidate.latitude!) || Math.abs(candidate.latitude!) > 90) {
    errors.latitude = "Latitude must be between -90 and 90.";
  }
  if (!Number.isFinite(candidate.longitude!) || Math.abs(candidate.longitude!) > 180) {
    errors.longitude = "Longitude must be between -180 and 180.";
  }
  if (
    !Number.isInteger(candidate.zoom!) ||
    candidate.zoom! < ZOOM_RANGE.min ||
    candidate.zoom! > ZOOM_RANGE.max
  ) {
    errors.zoom = `Zoom must be a whole number between ${ZOOM_RANGE.min} and ${ZOOM_RANGE.max}.`;
  }

  if (Object.keys(errors).length > 0 || !isValidLocation(candidate)) {
    response.status(400).json({ errors });
    return;
  }

  response.json(await writeLocation(candidate));
});

/** Public: the images the marketing page renders. */
app.get("/api/site-images", async (_request, response) => {
  response.json(await listSiteImages());
});

/**
 * The upload, if its bytes really are the image type it claims. multer only saw
 * the Content-Type the browser declared, which is the client's say-so.
 */
function uploadedFile(request: express.Request): Express.Multer.File | null {
  const file = request.file;
  if (!file) return null;
  return sniffImageType(file.buffer) === file.mimetype ? file : null;
}

/** Replaces one of the single-slot photos: `hero` or `lifestyle`. */
app.post(
  "/api/site-images/single/:key",
  requireSettledPassword,
  upload.single("image"),
  async (request, response) => {
    const key = String(request.params.key) as SingleImageKey;
    if (!singleImageKeys.includes(key)) {
      response.status(404).json({ error: "No such image slot." });
      return;
    }

    const file = uploadedFile(request);
    if (!file) {
      response.status(400).json({ errors: { image: "Choose a JPEG, PNG or WebP image." } });
      return;
    }

    const alt = readAlt(request, response);
    if (alt === null) return;
    response.json(await replaceSingle(key, file.buffer, file.originalname, file.mimetype, alt));
  },
);

/** Replaces the photo on one explore card. */
app.post(
  "/api/site-images/explore/:slug",
  requireSettledPassword,
  upload.single("image"),
  async (request, response) => {
    const slug = String(request.params.slug) as ExploreSlug;
    if (!exploreSlugs.includes(slug)) {
      response.status(404).json({ error: "No such explore card." });
      return;
    }

    const file = uploadedFile(request);
    if (!file) {
      response.status(400).json({ errors: { image: "Choose a JPEG, PNG or WebP image." } });
      return;
    }

    const alt = readAlt(request, response);
    if (alt === null) return;
    response.json(await replaceExplore(slug, file.buffer, file.originalname, file.mimetype, alt));
  },
);

app.post(
  "/api/site-images/gallery",
  requireSettledPassword,
  upload.single("image"),
  async (request, response) => {
    const file = uploadedFile(request);
    if (!file) {
      response.status(400).json({ errors: { image: "Choose a JPEG, PNG or WebP image." } });
      return;
    }

    const alt = readAlt(request, response);
    if (alt === null) return;
    if (!alt) {
      response
        .status(400)
        .json({ errors: { alt: "Describe the photo, so screen readers can announce it." } });
      return;
    }

    response.status(201).json(await addGalleryImage(file.buffer, file.originalname, file.mimetype, alt));
  },
);

app.delete("/api/site-images/gallery/:id", requireSettledPassword, async (request, response) => {
  const images = await listSiteImages();
  if (images.gallery.length <= 1) {
    response.status(400).json({ error: "The gallery needs at least one photo." });
    return;
  }

  const next = await removeGalleryImage(String(request.params.id));
  if (!next) {
    response.status(404).json({ error: "No such image." });
    return;
  }

  response.json(next);
});

app.patch("/api/site-images/:id/alt", requireSettledPassword, async (request, response) => {
  const alt = readAlt(request, response);
  if (alt === null) return;
  if (!alt) {
    response.status(400).json({ errors: { alt: "Description cannot be empty." } });
    return;
  }

  const next = await updateAlt(String(request.params.id), alt);
  if (!next) {
    response.status(404).json({ error: "No such image." });
    return;
  }

  response.json(next);
});

app.post("/api/site-images/gallery/order", requireSettledPassword, async (request, response) => {
  const ids = Array.isArray(request.body?.ids) ? (request.body.ids as unknown[]) : null;
  if (!ids || ids.length > LIMITS.galleryIds || !ids.every((id) => typeof id === "string")) {
    response.status(400).json({ error: "Send the full list of image ids, in the new order." });
    return;
  }

  const next = await reorderGallery(ids as string[]);
  if (!next) {
    response.status(400).json({ error: "That is not a reordering of the current gallery." });
    return;
  }

  response.json(next);
});

app.delete("/api/users/:id", requireSettledPassword, async (request, response) => {
  const id = String(request.params.id);
  const actor = response.locals.user as { id: string };

  if (id === actor.id) {
    response
      .status(400)
      .json({ error: "You cannot delete the account you are signed in with." });
    return;
  }

  // Never leave the admin with no way in.
  if ((await countUsers()) <= 1) {
    response.status(400).json({ error: "This is the last admin account." });
    return;
  }

  if (!(await deleteUser(id))) {
    response.status(404).json({ error: "No such user." });
    return;
  }

  await endSessionsForUser(id);
  response.status(204).end();
});

/** An admin issuing somebody else a new initial password. */
app.post("/api/users/:id/password", requireSettledPassword, async (request, response) => {
  const id = String(request.params.id);
  const actor = response.locals.user as { id: string };

  if (id === actor.id) {
    response
      .status(400)
      .json({ error: "Use the change-password form for your own account." });
    return;
  }

  const password = typeof request.body?.password === "string" ? request.body.password : "";
  const problem = passwordProblem(password);
  if (problem) {
    response.status(400).json({ errors: { password: problem } });
    return;
  }

  if (!(await resetPassword(id, password))) {
    response.status(404).json({ error: "No such user." });
    return;
  }

  // Whoever was using the old password is signed out immediately.
  await endSessionsForUser(id);
  response.json({ user: await getById(id) });
});

/**
 * What the browser needs to open a live connection to Supabase.
 *
 * Served rather than baked in at build time, so the deployment needs no
 * VITE_-prefixed copies of variables it already has, and rotating the key does
 * not mean rebuilding the site.
 *
 * The publishable key is designed to be public — it is the one meant to ship in
 * browsers. It can read exactly three tables, all of them already public: the
 * booked dates, the photo records and the map pin. Everything else is behind
 * row-level security with no policy.
 */
app.get("/api/realtime-config", (_request, response) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  // Absent is a valid answer: the front end falls back to polling.
  response.json(url && key ? { url, key } : { url: null, key: null });
});

app.get("/api/availability", async (_request, response) => {
  const inquiries = await listInquiries();
  response.json({ bookedDates: [...bookedDateKeys(inquiries)].sort() });
});

app.get("/api/auth/session", async (request, response) => {
  const userId = await sessionUserId(request);
  const user = userId ? await getById(userId) : null;
  response.json({
    authenticated: Boolean(user),
    configured: await credentialsConfigured(),
    user,
  });
});

app.post("/api/auth/login", async (request, response) => {
  if (!(await credentialsConfigured())) {
    response.status(503).json({
      error: "Admin credentials are not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD.",
    });
    return;
  }

  if (await throttled(request)) {
    response.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }

  const email = typeof request.body?.email === "string" ? request.body.email : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";

  const user = await authenticate(email, password);
  if (!user) {
    await recordFailure(request);
    // Deliberately vague: never reveal which half was wrong.
    response.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  await startSession(request, response, user.id);
  response.json({ authenticated: true, user });
});

app.post("/api/auth/logout", async (request, response) => {
  await endSession(request, response);
  response.json({ authenticated: false });
});

/** Changing your own password. Allowed while `mustChangePassword` is still set. */
app.post("/api/account/password", requireAuth, async (request, response) => {
  const user = response.locals.user as { id: string };
  const currentPassword =
    typeof request.body?.currentPassword === "string" ? request.body.currentPassword : "";
  const newPassword =
    typeof request.body?.newPassword === "string" ? request.body.newPassword : "";

  const problem = passwordProblem(newPassword);
  if (problem) {
    response.status(400).json({ errors: { newPassword: problem } });
    return;
  }

  if (newPassword === currentPassword) {
    response
      .status(400)
      .json({ errors: { newPassword: "Choose a password you have not used here before." } });
    return;
  }

  const result = await changePassword(user.id, currentPassword, newPassword);
  if (!result.ok) {
    response.status(400).json({ errors: { currentPassword: "That password is not correct." } });
    return;
  }

  // Any other session for this account is now stale.
  await endSessionsForUser(user.id, request);
  response.json({ user: await getById(user.id) });
});

/**
 * Admin only: sends a sample inquiry email and returns what the mail provider
 * said, so a misconfiguration shows up on the admin page rather than only in
 * the server log. Replies to the test go to whoever pressed the button.
 */
app.post("/api/notifications/test", requireSettledPassword, async (request, response) => {
  const userId = await sessionUserId(request);
  const user = userId ? await getById(userId) : null;
  response.json({ result: await sendTestEmail(user?.email ?? "") });
});

app.get("/api/users", requireSettledPassword, async (_request, response) => {
  response.json({ users: await listUsers() });
});

app.post("/api/users", requireSettledPassword, async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";

  const errors: Record<string, string> = {};
  if (!isEmail(email.trim())) {
    errors.email = "Enter a valid email address.";
  } else if (await findByEmail(email)) {
    errors.email = "An account with that email already exists.";
  }

  const problem = passwordProblem(password);
  if (problem) errors.password = problem;

  if (Object.keys(errors).length > 0) {
    response.status(400).json({ errors });
    return;
  }

  // New accounts must replace the initial password on first sign-in.
  const user = await createUser(normaliseEmail(email), password, { mustChangePassword: true });
  response.status(201).json({ user });
});

/** Admin only: the full inquiry list, including guest contact details. */
app.get("/api/inquiries", requireSettledPassword, async (_request, response) => {
  // Expired rows go before the list is read, so a host never sees one.
  await purgeIfDue();
  response.json({ inquiries: await listInquiries() });
});

/** Daily, from Vercel Cron (vercel.json): deletes data past its retention period. */
app.get("/api/cron/retention", async (request, response) => {
  if (!isCronRequest(request)) {
    response.status(401).json({ error: "Not authorised." });
    return;
  }
  response.json(await purgeExpired());
});

app.post("/api/inquiries", async (request, response) => {
  const { errors, values, privacyPolicyVersion } = validateInquiry(request.body ?? {});
  if (Object.keys(errors).length > 0) {
    response.status(400).json({ errors });
    return;
  }

  // Counted only once the form is valid, so a guest fixing a typo is not
  // spending their allowance. Per visitor first: one visitor over their limit
  // should not also use up everyone else's.
  const wait =
    (await hit(inquiryLimits.perVisitor, clientIp(request))) ??
    (await hit(inquiryLimits.overall, "all"));
  if (wait !== null) {
    response
      .status(429)
      .setHeader("Retry-After", String(wait))
      .json({ error: "Too many requests. Please try again later." });
    return;
  }

  const inquiry = await createInquiry(values, privacyPolicyVersion);
  // Awaited, not fire-and-forget: on Vercel the function is frozen as soon as
  // the response is sent, which would drop an email still in flight.
  // The guest's confirmation goes out in the language they used on the site —
  // unless that address has had its share today, so the form cannot be used
  // to mail somebody over and over.
  const requested = request.body?.language;
  const language: Language = languages.includes(requested) ? requested : "en";
  const confirmGuest = (await hit(confirmationLimit, inquiry.email.toLowerCase())) === null;
  await notifyNewInquiry(inquiry, language, { confirmGuest });
  await sweep(24 * 60 * 60 * 1000);
  await purgeIfDue();
  response.status(201).json({ inquiry });
});

/**
 * Erases a cancelled or declined inquiry. Those only, and enforced here rather than
 * only in the UI, so the guard cannot be stepped around by calling the API.
 */
app.delete("/api/inquiries/:id", requireSettledPassword, async (request, response) => {
  const id = String(request.params.id);
  const target = (await listInquiries()).find((inquiry) => inquiry.id === id);

  if (!target) {
    response.status(404).json({ error: "No such inquiry." });
    return;
  }
  if (target.status !== "cancelled" && target.status !== "declined") {
    response.status(409).json({ error: "Only a cancelled or declined inquiry can be deleted." });
    return;
  }

  await deleteInquiry(id);
  response.json({ deleted: id });
});

app.patch("/api/inquiries/:id", requireSettledPassword, async (request, response) => {
  const id = String(request.params.id);
  const status = request.body?.status as InquiryStatus | undefined;
  if (!status || !statuses.includes(status)) {
    response.status(400).json({ error: `status must be one of ${statuses.join(", ")}` });
    return;
  }

  const inquiries = await listInquiries();
  const target = inquiries.find((inquiry) => inquiry.id === id);
  if (!target) {
    response.status(404).json({ error: "Inquiry not found" });
    return;
  }

  // Re-check server-side: the admin UI disables this, but the API must not
  // depend on that.
  if (status === "approved" && hasConflict(target, inquiries)) {
    response.status(409).json({ error: "Those dates overlap a confirmed booking" });
    return;
  }

  response.json({ inquiry: await updateStatus(id, status) });
});

/** Sets or clears the agreed price on a confirmed booking. */
app.patch("/api/inquiries/:id/price", requireSettledPassword, async (request, response) => {
  const id = String(request.params.id);
  const inquiries = await listInquiries();
  const target = inquiries.find((inquiry) => inquiry.id === id);

  if (!target) {
    response.status(404).json({ error: "Inquiry not found" });
    return;
  }

  if (target.status !== "approved") {
    response.status(400).json({ error: "Only confirmed bookings can be priced." });
    return;
  }

  // A null amount clears the price.
  if (request.body?.amount === null) {
    response.json({ inquiry: await setPrice(id, null) });
    return;
  }

  const amount = Number(request.body?.amount);
  const currency = request.body?.currency as Currency;
  const mode = request.body?.mode as PriceMode;

  const errors: Record<string, string> = {};
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  } else if (amount > 1_000_000) {
    errors.amount = "That amount looks wrong.";
  }
  if (!currencies.includes(currency)) errors.currency = "Choose EUR, USD or ILS.";
  if (!priceModes.includes(mode)) errors.mode = "Choose a nightly rate or a stay total.";

  if (Object.keys(errors).length > 0) {
    response.status(400).json({ errors });
    return;
  }

  const price: BookingPrice = { amount: Math.round(amount * 100) / 100, currency, mode };
  response.json({ inquiry: await setPrice(id, price) });
});

/** Unknown API paths get JSON, not Express's HTML page. */
app.use("/api", (_request, response) => {
  response.status(404).json({ error: "Not found." });
});

// multer surfaces its own errors (size limit, etc.) — translate them.
app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? `That image is over ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`
          : "That upload was rejected.";
      response.status(400).json({ errors: { image: message } });
      return;
    }
    next(error);
  },
);

// Last: anything else is logged here and reported without detail.
app.use(errorHandler);

/*
  On Vercel this module is imported by `api/index.ts` and the app is used as the
  request handler — there is no socket to listen on, and calling listen() would
  throw. Locally (`npm run dev`, `npm start`) it still binds a port.
*/
if (!process.env.VERCEL) {
  app.listen(port, async () => {
    console.log(`API listening on http://localhost:${port}`);
    // A database that is down must not take the process with it; /api/health
    // reports it instead.
    const configured = await credentialsConfigured().catch(() => true);
    if (!configured) {
      console.warn(
        "No admin accounts exist and ADMIN_EMAIL / ADMIN_PASSWORD are not set — /admin will refuse every sign-in.",
      );
    }
  });
}

export default app;
