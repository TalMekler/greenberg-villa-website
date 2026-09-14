import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db";
import {
  exploreSlugs,
  type ExploreSlug,
  type SingleImageKey,
  type SiteImage,
  type SiteImages,
} from "../src/lib/site-images";

const here = dirname(fileURLToPath(import.meta.url));
export const uploadsDir = join(here, "data", "uploads");

/**
 * Photo records live in the `site_images` table; the files themselves stay on
 * disk under `data/uploads`. The images below ship in the repo purely to seed
 * the table on a first run — the app itself reads uploads, not these.
 */
const defaultsDir = join(here, "..", "src", "assets", "images");

const defaults = {
  hero: {
    file: "hero.jpg",
    alt: "Green Villa on the shoreline of the Edipsos bay at golden hour",
  },
  lifestyle: {
    file: "lifestyle.jpg",
    alt: "Sun-drenched bedroom opening onto the villa's sea-facing terrace",
  },
} satisfies Record<SingleImageKey, { file: string; alt: string }>;

const galleryDefaults = [
  "Infinity pool overlooking the Aegean at sunset",
  "Master bedroom with linen bedding and sea view",
  "Open-plan living room in Mediterranean minimalist style",
  "Stone terrace with lounge seating above the cliffs",
  "Poolside sun deck framed by olive trees",
  "Sunset over the bay seen from the villa",
  "Al fresco dining terrace lit for the evening",
];

const exploreDefaults: Record<ExploreSlug, { file: string; alt: string }> = {
  "gialtron-thermal-springs": {
    file: "explore-3.jpg",
    alt: "Thermal water steaming off the rocks into the sea at Loutra Gialtron",
  },
  "gialtra-village": {
    file: "explore-6.jpg",
    alt: "A taverna table laid under an old plane tree above the sea",
  },
  "gialtra-hills": {
    file: "explore-5.jpg",
    alt: "A dirt track winding through the wooded hills behind the bay",
  },
  "gregolimano-bay": {
    file: "explore-1.jpg",
    alt: "The sheltered turquoise bay at Gregolimano, enclosed by headlands",
  },
  "loutra-edipsou": {
    file: "explore-2.jpg",
    alt: "The waterfront of Loutra Edipsou, lined with houses and fishing boats",
  },
  "drymona-waterfalls": {
    file: "explore-4.jpg",
    alt: "The Drymona waterfalls dropping into a green forest pool",
  },
};

/*
  Reads are a three-row-per-slot query, so they are not cached. Seeding is, via
  an in-flight promise: without it two requests arriving on an empty store both
  seed, each writing its own copy of every file, and the loser's orphan sweep
  then deletes files the winner's rows point at.
*/
let seeding: Promise<SiteImages> | null = null;

export function mediaUrl(fileName: string): string {
  return `/api/media/${fileName}`;
}

function fileNameFor(image: SiteImage): string {
  return image.url.replace("/api/media/", "");
}

/** Every record in the store, whatever slot it sits in. */
function allImages(images: SiteImages): SiteImage[] {
  return [images.hero, images.lifestyle, ...images.gallery, ...Object.values(images.explore)];
}

interface Row {
  id: string;
  slot: string;
  position: number;
  url: string;
  alt: string;
  uploadedAt: string;
}

const toImage = ({ id, url, alt, uploadedAt }: Row): SiteImage => ({ id, url, alt, uploadedAt });

const selectAll = db.prepare(`SELECT * FROM site_images ORDER BY slot, position`);
const insertImage = db.prepare(`
  INSERT INTO site_images (id, slot, position, url, alt, uploadedAt)
  VALUES (@id, @slot, @position, @url, @alt, @uploadedAt)
`);
const deleteSlot = db.prepare(`DELETE FROM site_images WHERE slot = ?`);
const deleteById = db.prepare(`DELETE FROM site_images WHERE id = ?`);
const setAlt = db.prepare(`UPDATE site_images SET alt = ? WHERE id = ?`);
const setPosition = db.prepare(`UPDATE site_images SET position = ? WHERE id = ?`);
const nextGalleryPosition = db.prepare(`
  SELECT coalesce(max(position), -1) + 1 AS next FROM site_images WHERE slot = 'gallery'
`);

/** Builds the API shape from the table, or null when a slot has no row yet. */
function readStore(): SiteImages | null {
  const rows = selectAll.all() as Row[];
  const bySlot = new Map<string, Row[]>();
  for (const row of rows) {
    const list = bySlot.get(row.slot);
    if (list) list.push(row);
    else bySlot.set(row.slot, [row]);
  }

  const hero = bySlot.get("hero")?.[0];
  const lifestyle = bySlot.get("lifestyle")?.[0];
  if (!hero || !lifestyle) return null;

  const explore = {} as Record<ExploreSlug, SiteImage>;
  for (const slug of exploreSlugs) {
    const row = bySlot.get(slug)?.[0];
    if (!row) return null;
    explore[slug] = toImage(row);
  }

  return {
    hero: toImage(hero),
    lifestyle: toImage(lifestyle),
    gallery: (bySlot.get("gallery") ?? []).map(toImage),
    explore,
  };
}

/** Copies a shipped default into the uploads dir and returns its record. */
async function seedFrom(sourceName: string, alt: string): Promise<SiteImage> {
  const id = randomUUID();
  const fileName = `${id}${extname(sourceName)}`;
  await mkdir(uploadsDir, { recursive: true });
  await copyFile(join(defaultsDir, sourceName), join(uploadsDir, fileName));

  return { id, url: mediaUrl(fileName), alt, uploadedAt: new Date().toISOString() };
}

/**
 * Fills the table from the images the site shipped with, so the admin edits
 * real records from the first run instead of a mix of bundled and uploaded.
 */
async function seed(): Promise<SiteImages> {
  const rows: (SiteImage & { slot: string; position: number })[] = [];

  for (const key of ["hero", "lifestyle"] as SingleImageKey[]) {
    const preset = defaults[key];
    rows.push({ ...(await seedFrom(preset.file, preset.alt)), slot: key, position: 0 });
  }
  for (const [index, alt] of galleryDefaults.entries()) {
    rows.push({
      ...(await seedFrom(`gallery-${index + 1}.jpg`, alt)),
      slot: "gallery",
      position: index,
    });
  }
  for (const slug of exploreSlugs) {
    const preset = exploreDefaults[slug];
    rows.push({ ...(await seedFrom(preset.file, preset.alt)), slot: slug, position: 0 });
  }

  // One transaction: the table either gains a complete set of photos or none.
  db.transaction(() => {
    db.prepare(`DELETE FROM site_images`).run();
    for (const row of rows) insertImage.run(row);
  })();

  const seeded = readStore();
  if (!seeded) throw new Error("Seeding did not produce a complete image store");

  await removeOrphans(seeded);
  console.log("Seeded site images from the bundled defaults.");
  return seeded;
}

async function load(): Promise<SiteImages> {
  const current = readStore();
  if (current) return current;

  seeding ??= seed().finally(() => {
    seeding = null;
  });
  return seeding;
}

export async function listSiteImages(): Promise<SiteImages> {
  return load();
}

/** Writes the uploaded bytes under a generated name — the client's is never used. */
async function store(buffer: Buffer, originalName: string, mimeType: string): Promise<SiteImage> {
  const byMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const extension = byMime[mimeType] ?? (extname(originalName).toLowerCase() || ".jpg");
  const fileName = `${randomUUID()}${extension}`;
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, fileName), buffer);

  return {
    id: randomUUID(),
    url: mediaUrl(fileName),
    alt: "",
    uploadedAt: new Date().toISOString(),
  };
}

/** Swaps the single row held by `slot` for a freshly uploaded one. */
function replaceSlot(slot: string, image: SiteImage): void {
  db.transaction(() => {
    deleteSlot.run(slot);
    insertImage.run({ ...image, slot, position: 0 });
  })();
}

/** Replaces one of the single-slot photos (hero, lifestyle). */
export async function replaceSingle(
  key: SingleImageKey,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  alt: string,
): Promise<SiteImages> {
  const current = await load();
  const image = await store(buffer, originalName, mimeType);

  replaceSlot(key, { ...image, alt: alt || current[key].alt });
  const next = readStore()!;
  await removeOrphans(next);
  return next;
}

/** Replaces the photo on one explore card. Cards cannot exist without one. */
export async function replaceExplore(
  slug: ExploreSlug,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  alt: string,
): Promise<SiteImages> {
  const current = await load();
  const image = await store(buffer, originalName, mimeType);

  replaceSlot(slug, { ...image, alt: alt || current.explore[slug].alt });
  const next = readStore()!;
  await removeOrphans(next);
  return next;
}

export async function addGalleryImage(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  alt: string,
): Promise<SiteImages> {
  await load();
  const image = await store(buffer, originalName, mimeType);
  const { next } = nextGalleryPosition.get() as { next: number };

  insertImage.run({ ...image, alt, slot: "gallery", position: next });
  return readStore()!;
}

export async function removeGalleryImage(id: string): Promise<SiteImages | null> {
  await load();
  if (deleteById.run(id).changes === 0) return null;

  const next = readStore()!;
  await removeOrphans(next);
  return next;
}

/** Edits a description, wherever in the store that image lives. */
export async function updateAlt(id: string, alt: string): Promise<SiteImages | null> {
  await load();
  if (setAlt.run(alt, id).changes === 0) return null;
  return readStore()!;
}

/** Reorders the gallery to match `ids`; rejects anything but a permutation. */
export async function reorderGallery(ids: string[]): Promise<SiteImages | null> {
  const current = await load();
  const currentIds = current.gallery.map((image) => image.id);

  const sameSet = ids.length === currentIds.length && ids.every((id) => currentIds.includes(id));
  if (!sameSet) return null;

  db.transaction(() => {
    ids.forEach((id, index) => setPosition.run(index, id));
  })();
  return readStore()!;
}

/** Deletes upload files no record points at any more. */
async function removeOrphans(current: SiteImages): Promise<void> {
  const referenced = new Set(allImages(current).map(fileNameFor));
  try {
    const files = await readdir(uploadsDir);
    await Promise.all(
      files
        .filter((file) => !referenced.has(file))
        .map((file) => rm(join(uploadsDir, file), { force: true })),
    );
  } catch (error) {
    console.warn("Could not clean up unused uploads:", error);
  }
}
