import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  exploreSlugs,
  type ExploreSlug,
  type SingleImageKey,
  type SiteImage,
  type SiteImages,
} from "../src/lib/site-images";

const here = dirname(fileURLToPath(import.meta.url));
const dataFile = join(here, "data", "site-images.json");
export const uploadsDir = join(here, "data", "uploads");

/**
 * The images the site ships with. These files stay in the repo purely to seed
 * the store on a first run — the app itself reads uploads, not these.
 */
const defaultsDir = join(here, "..", "src", "assets", "images");

const defaults = {
  hero: {
    file: "hero.jpg",
    alt: "Greenberg Villa perched on the cliffs above the Aegean at golden hour",
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

let cache: SiteImages | null = null;
let loading: Promise<SiteImages> | null = null;
let writing: Promise<void> = Promise.resolve();

export function mediaUrl(fileName: string): string {
  return `/api/media/${fileName}`;
}

function fileNameFor(image: SiteImage): string {
  return image.url.replace("/api/media/", "");
}

/** Every record in the store, whatever collection it sits in. */
function allImages(images: SiteImages): SiteImage[] {
  return [images.hero, images.lifestyle, ...images.gallery, ...Object.values(images.explore)];
}

async function persist(next: SiteImages): Promise<void> {
  cache = next;
  writing = writing.then(async () => {
    await mkdir(dirname(dataFile), { recursive: true });
    const temp = `${dataFile}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
    await rename(temp, dataFile);
  });
  await writing;
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
 * The store starts as a copy of the images the site shipped with, so the admin
 * edits real records from the first run instead of a mix of bundled and uploaded.
 */
async function seed(): Promise<SiteImages> {
  const gallery: SiteImage[] = [];
  for (const [index, alt] of galleryDefaults.entries()) {
    gallery.push(await seedFrom(`gallery-${index + 1}.jpg`, alt));
  }

  const explore = {} as Record<ExploreSlug, SiteImage>;
  for (const slug of exploreSlugs) {
    const preset = exploreDefaults[slug];
    explore[slug] = await seedFrom(preset.file, preset.alt);
  }

  const seeded: SiteImages = {
    hero: await seedFrom(defaults.hero.file, defaults.hero.alt),
    lifestyle: await seedFrom(defaults.lifestyle.file, defaults.lifestyle.alt),
    gallery,
    explore,
  };

  await persist(seeded);
  // A reseed after a shape change leaves the previous files behind.
  await removeOrphans(seeded);
  console.log("Seeded site images from the bundled defaults.");
  return seeded;
}

function isComplete(value: SiteImages | null): value is SiteImages {
  if (!value?.hero || !value.lifestyle || !Array.isArray(value.gallery) || !value.explore) {
    return false;
  }
  return exploreSlugs.every((slug) => Boolean(value.explore[slug]));
}

/**
 * Reads the store, seeding it on a first run or after the shape changes.
 *
 * Concurrent callers share one run. Without that, two requests arriving before
 * the cache is warm both seed: each writes its own copy of every file, and the
 * loser's orphan sweep then deletes files the winner's records point at.
 */
async function load(): Promise<SiteImages> {
  if (cache) return cache;
  loading ??= readOrSeed().finally(() => {
    loading = null;
  });
  return loading;
}

async function readOrSeed(): Promise<SiteImages> {
  if (cache) return cache;
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as SiteImages;
    if (isComplete(parsed)) {
      cache = parsed;
      return cache;
    }
    console.warn(`${dataFile} is missing entries — reseeding.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read ${dataFile}, reseeding:`, error);
    }
  }
  return seed();
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

  const next: SiteImages = { ...current, [key]: { ...image, alt: alt || current[key].alt } };
  await persist(next);
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

  const next: SiteImages = {
    ...current,
    explore: { ...current.explore, [slug]: { ...image, alt: alt || current.explore[slug].alt } },
  };

  await persist(next);
  await removeOrphans(next);
  return next;
}

export async function addGalleryImage(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  alt: string,
): Promise<SiteImages> {
  const current = await load();
  const image = await store(buffer, originalName, mimeType);

  const next: SiteImages = { ...current, gallery: [...current.gallery, { ...image, alt }] };
  await persist(next);
  return next;
}

export async function removeGalleryImage(id: string): Promise<SiteImages | null> {
  const current = await load();
  if (!current.gallery.some((image) => image.id === id)) return null;

  const next: SiteImages = {
    ...current,
    gallery: current.gallery.filter((image) => image.id !== id),
  };

  await persist(next);
  await removeOrphans(next);
  return next;
}

/** Edits a description, wherever in the store that image lives. */
export async function updateAlt(id: string, alt: string): Promise<SiteImages | null> {
  const current = await load();
  if (!allImages(current).some((image) => image.id === id)) return null;

  const retag = (image: SiteImage): SiteImage => (image.id === id ? { ...image, alt } : image);

  const explore = {} as Record<ExploreSlug, SiteImage>;
  exploreSlugs.forEach((slug) => {
    explore[slug] = retag(current.explore[slug]);
  });

  const next: SiteImages = {
    hero: retag(current.hero),
    lifestyle: retag(current.lifestyle),
    gallery: current.gallery.map(retag),
    explore,
  };

  await persist(next);
  return next;
}

/** Reorders the gallery to match `ids`; rejects anything but a permutation. */
export async function reorderGallery(ids: string[]): Promise<SiteImages | null> {
  const current = await load();
  const currentIds = current.gallery.map((image) => image.id);

  const sameSet = ids.length === currentIds.length && ids.every((id) => currentIds.includes(id));
  if (!sameSet) return null;

  const byId = new Map(current.gallery.map((image) => [image.id, image]));
  const next: SiteImages = { ...current, gallery: ids.map((id) => byId.get(id)!) };

  await persist(next);
  return next;
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
