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
import { readLocation, writeLocation } from "./location";
import {
  addGalleryImage,
  listSiteImages,
  removeGalleryImage,
  reorderGallery,
  replaceExplore,
  replaceSingle,
  updateAlt,
  uploadsDir,
} from "./media";
import { ZOOM_RANGE, isValidLocation, type VillaLocation } from "../src/lib/location";
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
  type InquiryInput,
  type InquiryStatus,
  type PriceMode,
} from "../src/lib/inquiry";
import { createInquiry, listInquiries, setPrice, updateStatus } from "./store";

// Reads ADMIN_USERNAME / ADMIN_PASSWORD without committing them to the repo.
try {
  process.loadEnvFile();
} catch {
  // No .env file — fall back to whatever is already in the environment.
}

const app = express();
// Deliberately not `PORT`: dev harnesses often set that for the web server.
const port = Number(process.env.API_PORT ?? 3001);

app.use(express.json({ limit: "32kb" }));

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

/** Uploaded media, served read-only. Filenames are server-generated UUIDs. */
app.use(
  "/api/media",
  express.static(uploadsDir, {
    index: false,
    dotfiles: "deny",
    maxAge: "1y",
    immutable: true,
  }),
);

const statuses: InquiryStatus[] = ["pending", "approved", "declined", "cancelled"];

/** Returns a message when the password is unacceptable, or null when it is fine. */
function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use at least one letter and one number.";
  }
  return null;
}
const dateKey = /^\d{4}-\d{2}-\d{2}$/;

function validate(body: Record<string, unknown>): {
  errors: Record<string, string>;
  values: InquiryInput;
} {
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string).trim() : "");

  const values: InquiryInput = {
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    checkIn: text("checkIn"),
    checkOut: text("checkOut"),
    guests: text("guests") || "1",
    message: text("message"),
  };

  const errors: Record<string, string> = {};
  if (!values.firstName) errors.firstName = "First name is required.";
  if (!values.lastName) errors.lastName = "Last name is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) errors.email = "Invalid email address.";
  if (!dateKey.test(values.checkIn)) errors.checkIn = "Check-in date is required.";
  if (!dateKey.test(values.checkOut)) {
    errors.checkOut = "Check-out date is required.";
  } else if (values.checkOut <= values.checkIn) {
    errors.checkOut = "Check-out must be after check-in.";
  }

  return { errors, values };
}

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

function uploadedFile(request: express.Request): Express.Multer.File | null {
  return request.file ?? null;
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

    const alt = typeof request.body?.alt === "string" ? request.body.alt.trim() : "";
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

    const alt = typeof request.body?.alt === "string" ? request.body.alt.trim() : "";
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

    const alt = typeof request.body?.alt === "string" ? request.body.alt.trim() : "";
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
  const alt = typeof request.body?.alt === "string" ? request.body.alt.trim() : "";
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
  if (!ids || !ids.every((id) => typeof id === "string")) {
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

  endSessionsForUser(id);
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
  endSessionsForUser(id);
  response.json({ user: await getById(id) });
});

app.get("/api/availability", async (_request, response) => {
  const inquiries = await listInquiries();
  response.json({ bookedDates: [...bookedDateKeys(inquiries)].sort() });
});

app.get("/api/auth/session", async (request, response) => {
  const userId = sessionUserId(request);
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

  if (throttled(request)) {
    response.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }

  const email = typeof request.body?.email === "string" ? request.body.email : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";

  const user = await authenticate(email, password);
  if (!user) {
    recordFailure(request);
    // Deliberately vague: never reveal which half was wrong.
    response.status(401).json({ error: "Incorrect email or password." });
    return;
  }

  startSession(request, response, user.id);
  response.json({ authenticated: true, user });
});

app.post("/api/auth/logout", (request, response) => {
  endSession(request, response);
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
  endSessionsForUser(user.id, request);
  response.json({ user: await getById(user.id) });
});

app.get("/api/users", requireSettledPassword, async (_request, response) => {
  response.json({ users: await listUsers() });
});

app.post("/api/users", requireSettledPassword, async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";

  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
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
  response.json({ inquiries: await listInquiries() });
});

app.post("/api/inquiries", async (request, response) => {
  const { errors, values } = validate(request.body ?? {});
  if (Object.keys(errors).length > 0) {
    response.status(400).json({ errors });
    return;
  }

  response.status(201).json({ inquiry: await createInquiry(values) });
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

await ensureBootstrapUser();

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

app.listen(port, async () => {
  console.log(`API listening on http://localhost:${port}`);
  if (!(await credentialsConfigured())) {
    console.warn(
      "No admin accounts exist and ADMIN_EMAIL / ADMIN_PASSWORD are not set — /admin will refuse every sign-in.",
    );
  }
});
