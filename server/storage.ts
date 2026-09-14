import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

/**
 * Uploaded photos live in a Supabase Storage bucket instead of on the server's
 * disk, so the app keeps nothing local that matters and can run on a host whose
 * filesystem is wiped on every deploy.
 *
 * The bucket is public: these are the villa's marketing photos, every one of
 * them is already on the public site, and serving them straight from Supabase's
 * CDN is both faster and cheaper than proxying the bytes through this server.
 * The service-role key is used only to write — it never reaches the browser.
 */
export const BUCKET = process.env.SUPABASE_BUCKET ?? "site-images";

const url = process.env.SUPABASE_URL;
/*
  Supabase renamed its API keys: what the dashboard used to call the
  service_role key is now the "secret key". Accept either, newest name first,
  so the same code works whichever vintage of project it is pointed at.

  Only this one is ever used. The publishable key is for browsers and grants
  nothing here, and SUPABASE_JWKS_URL belongs to Supabase Auth, which this app
  does not use — it keeps its own accounts, with scrypt hashes, in the `users`
  table.
*/
const serviceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are not set. " +
      "Copy them from the Supabase dashboard — see the README section 'Where the data lives'.",
  );
}

export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Creates the bucket on first run. Harmless once it exists. */
export async function ensureBucket(): Promise<void> {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;

  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  // A parallel boot may have won the race; that is not a failure.
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(`Created the public storage bucket "${BUCKET}".`);
}

const extensionFor = (mimeType: string, originalName: string): string => {
  const byMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  return byMime[mimeType] ?? (extname(originalName).toLowerCase() || ".jpg");
};

export function publicUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Puts bytes in the bucket under a generated name and returns its public URL. */
export async function upload(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<{ path: string; url: string }> {
  const path = `${randomUUID()}${extensionFor(mimeType, originalName)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) throw error;

  return { path, url: publicUrl(path) };
}

/** The object name inside the bucket, recovered from a stored public URL. */
export function pathFromUrl(fileUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = fileUrl.indexOf(marker);
  return at === -1 ? null : fileUrl.slice(at + marker.length);
}

export async function remove(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.warn("Could not remove unused uploads:", error.message);
}

/** Everything currently in the bucket, for the orphan sweep. */
export async function listAll(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) {
    console.warn("Could not list the bucket:", error.message);
    return [];
  }
  return (data ?? []).map((file) => file.name);
}
