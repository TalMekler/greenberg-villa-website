import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { query, transaction } from "./db";
import { listAll, pathFromUrl, remove, upload } from "./storage";
import {
  exploreSlugs,
  type ExploreSlug,
  type SingleImageKey,
  type SiteImage,
  type SiteImages,
} from "../src/lib/site-images";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Photo records live in the `site_images` table; the files themselves are in a
 * Supabase Storage bucket, and `url` is their public URL. The images below ship
 * in the repo purely to seed an empty store on a first run.
 */
const defaultsDir = join(here, "..", "src", "assets", "images");

const defaults = {
  hero: {
    file: "hero.jpg",
    alt: "Green Villa seen from the garden, with the bay behind it",
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
  Seeding is guarded by an in-flight promise: without it two requests arriving
  on an empty store both seed, each uploading its own copy of every file, and
  the loser's orphan sweep then deletes objects the winner's rows point at.
*/
let seeding: Promise<SiteImages> | null = null;

interface Row {
  id: string;
  slot: string;
  position: number;
  url: string;
  alt: string;
  uploadedAt: string;
}

const toImage = ({ id, url, alt, uploadedAt }: Row): SiteImage => ({ id, url, alt, uploadedAt });

/** Every record in the store, whatever slot it sits in. */
function allImages(images: SiteImages): SiteImage[] {
  return [images.hero, images.lifestyle, ...images.gallery, ...Object.values(images.explore)];
}

/** Builds the API shape from the table, or null when a slot has no row yet. */
async function readStore(): Promise<SiteImages | null> {
  const rows = await query<Row>(`SELECT * FROM site_images ORDER BY slot, position`);

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

/** Uploads a shipped default into the bucket and returns its record. */
async function seedFrom(sourceName: string, alt: string): Promise<SiteImage> {
  const bytes = await readFile(join(defaultsDir, sourceName));
  const mime = sourceName.endsWith(".png") ? "image/png" : "image/jpeg";
  const { url } = await upload(bytes, sourceName, mime);

  return { id: crypto.randomUUID(), url, alt, uploadedAt: new Date().toISOString() };
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
  await transaction(async (run) => {
    await run(`DELETE FROM site_images`);
    for (const row of rows) {
      await run(
        `INSERT INTO site_images (id, slot, position, url, alt, "uploadedAt")
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.id, row.slot, row.position, row.url, row.alt, row.uploadedAt],
      );
    }
  });

  const seeded = await readStore();
  if (!seeded) throw new Error("Seeding did not produce a complete image store");

  await removeOrphans(seeded);
  console.log("Seeded site images from the bundled defaults.");
  return seeded;
}

async function load(): Promise<SiteImages> {
  const current = await readStore();
  if (current) return current;

  seeding ??= seed().finally(() => {
    seeding = null;
  });
  return seeding;
}

export async function listSiteImages(): Promise<SiteImages> {
  return load();
}

/** Swaps the single row held by `slot` for a freshly uploaded one. */
async function replaceSlot(slot: string, image: SiteImage): Promise<void> {
  await transaction(async (run) => {
    await run(`DELETE FROM site_images WHERE slot = $1`, [slot]);
    await run(
      `INSERT INTO site_images (id, slot, position, url, alt, "uploadedAt")
       VALUES ($1, $2, 0, $3, $4, $5)`,
      [image.id, slot, image.url, image.alt, image.uploadedAt],
    );
  });
}

/** Puts the uploaded bytes in the bucket under a generated name. */
async function store(buffer: Buffer, originalName: string, mimeType: string): Promise<SiteImage> {
  const { url } = await upload(buffer, originalName, mimeType);
  return { id: crypto.randomUUID(), url, alt: "", uploadedAt: new Date().toISOString() };
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

  await replaceSlot(key, { ...image, alt: alt || current[key].alt });
  const next = (await readStore())!;
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

  await replaceSlot(slug, { ...image, alt: alt || current.explore[slug].alt });
  const next = (await readStore())!;
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

  await query(
    `INSERT INTO site_images (id, slot, position, url, alt, "uploadedAt")
     SELECT $1, 'gallery', coalesce(max(position), -1) + 1, $2, $3, $4
       FROM site_images WHERE slot = 'gallery'`,
    [image.id, image.url, alt, image.uploadedAt],
  );
  return (await readStore())!;
}

export async function removeGalleryImage(id: string): Promise<SiteImages | null> {
  await load();
  const deleted = await query(`DELETE FROM site_images WHERE id = $1 RETURNING id`, [id]);
  if (deleted.length === 0) return null;

  const next = (await readStore())!;
  await removeOrphans(next);
  return next;
}

/** Edits a description, wherever in the store that image lives. */
export async function updateAlt(id: string, alt: string): Promise<SiteImages | null> {
  await load();
  const updated = await query(`UPDATE site_images SET alt = $2 WHERE id = $1 RETURNING id`, [
    id,
    alt,
  ]);
  if (updated.length === 0) return null;
  return (await readStore())!;
}

/** Reorders the gallery to match `ids`; rejects anything but a permutation. */
export async function reorderGallery(ids: string[]): Promise<SiteImages | null> {
  const current = await load();
  const currentIds = current.gallery.map((image) => image.id);

  const sameSet = ids.length === currentIds.length && ids.every((id) => currentIds.includes(id));
  if (!sameSet) return null;

  await transaction(async (run) => {
    for (const [index, id] of ids.entries()) {
      await run(`UPDATE site_images SET position = $2 WHERE id = $1`, [id, index]);
    }
  });
  return (await readStore())!;
}

/** Deletes bucket objects no record points at any more. */
async function removeOrphans(current: SiteImages): Promise<void> {
  const referenced = new Set(
    allImages(current)
      .map((image) => pathFromUrl(image.url))
      .filter((path): path is string => path !== null),
  );
  const stale = (await listAll()).filter((name) => !referenced.has(name));
  await remove(stale);
}
