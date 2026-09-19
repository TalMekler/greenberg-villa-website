import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { query, transaction } from "./db";
import { listSweepable, pathFromUrl, remove, upload, uploadAs } from "./storage";
import {
  exploreSlugs,
  singleImageKeys,
  type ExploreSlug,
  type ImageAlts,
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
    alt: "Green Villa's white two-storey façade with blue shutters, seen across the lawn",
    altHe: "החזית הלבנה בת שתי הקומות של וילה גרין, עם תריסים כחולים, במבט מעבר למדשאה",
    altEl: "Η λευκή διώροφη πρόσοψη της Green Villa με μπλε παντζούρια, πέρα από το γκαζόν",
  },
  lifestyle: {
    file: "lifestyle.jpg",
    alt: "Balcony table and two wooden chairs looking out over the garden to the sea",
    altHe: "שולחן ושני כיסאות עץ במרפסת, הצופים מעל הגינה אל הים",
    altEl: "Τραπέζι και δύο ξύλινες καρέκλες στο μπαλκόνι, με θέα πάνω από τον κήπο στη θάλασσα",
  },
  hosts: {
    file: "hosts.jpg",
    alt: "Eti, the host of Green Villa, smiling",
    altHe: "אתי, המארחת של וילה גרין, מחייכת",
    altEl: "Η Έτι, η οικοδέσποινα της Green Villa, χαμογελά",
  },
} satisfies Record<SingleImageKey, { file: string } & ImageAlts>;

const galleryDefaults: ImageAlts[] = [
  {
    alt: "Raised plunge pool under white shade sails in the garden, with the sea beyond",
    altHe: "בריכה מוגבהת תחת מפרשי צל לבנים בגינה, והים ברקע",
    altEl: "Υπερυψωμένη πισίνα κάτω από λευκά πανιά σκίασης στον κήπο, με τη θάλασσα πιο πέρα",
  },
  {
    alt: "Living room with two grey sofas, glass coffee tables and a jute rug",
    altHe: "סלון עם שתי ספות אפורות, שולחנות קפה מזכוכית ושטיח יוטה",
    altEl: "Σαλόνι με δύο γκρι καναπέδες, γυάλινα τραπεζάκια και χαλί από γιούτα",
  },
  {
    alt: "Dining table set with flowers in the open-plan living area, glass doors open to the garden",
    altHe: "שולחן אוכל ועליו פרחים בחלל הפתוח, ודלתות זכוכית פתוחות אל הגינה",
    altEl: "Τραπεζαρία με λουλούδια στον ενιαίο χώρο, με τις τζαμόπορτες ανοιχτές προς τον κήπο",
  },
  {
    alt: "Double bedroom with white linen, a ceiling fan and French windows onto a balcony",
    altHe: "חדר שינה זוגי עם מצעים לבנים, מאוורר תקרה ודלתות צרפתיות אל מרפסת",
    altEl: "Δίκλινο υπνοδωμάτιο με λευκά σεντόνια, ανεμιστήρα οροφής και μπαλκονόπορτες",
  },
  {
    alt: "Balcony with a small table and two director's chairs overlooking the sea",
    altHe: "מרפסת עם שולחן קטן ושני כיסאות במאי, הצופה אל הים",
    altEl: "Μπαλκόνι με τραπεζάκι και δύο καρέκλες σκηνοθέτη, με θέα στη θάλασσα",
  },
  {
    alt: "Covered outdoor dining area with a long table, white chairs and a built-in barbecue",
    altHe: "פינת אוכל מקורה בחוץ עם שולחן ארוך, כיסאות לבנים ומנגל בנוי",
    altEl: "Σκεπαστή υπαίθρια τραπεζαρία με μακρύ τραπέζι, λευκές καρέκλες και χτιστή ψησταριά",
  },
  {
    alt: "Wooden jetty on the pebble beach with striped loungers and towels",
    altHe: "מזח עץ בחוף החלוקים עם כיסאות נוח ומגבות מפוספסים",
    altEl: "Ξύλινη προβλήτα στην παραλία με βότσαλα, με ριγέ ξαπλώστρες και πετσέτες",
  },
];

const exploreDefaults: Record<ExploreSlug, { file: string } & ImageAlts> = {
  "gialtron-thermal-springs": {
    file: "explore-3.jpg",
    alt: "Thermal water steaming off the rocks into the sea at Loutra Gialtron",
    altHe: "מים תרמיים מהבילים זורמים מהסלעים אל הים בלוטרה יאלטרון",
    altEl: "Ιαματικά νερά αχνίζουν από τα βράχια προς τη θάλασσα στα Λουτρά Γιάλτρων",
  },
  "gialtra-village": {
    file: "explore-6.jpg",
    alt: "A taverna table laid under an old plane tree above the sea",
    altHe: "שולחן טברנה ערוך מתחת לעץ דולב עתיק מעל הים",
    altEl: "Τραπέζι ταβέρνας στρωμένο κάτω από έναν γέρικο πλάτανο πάνω από τη θάλασσα",
  },
  "gialtra-hills": {
    file: "explore-5.jpg",
    alt: "A dirt track winding through the wooded hills behind the bay",
    altHe: "דרך עפר מתפתלת בין הגבעות המיוערות שמאחורי המפרץ",
    altEl: "Χωματόδρομος που ελίσσεται στους δασωμένους λόφους πίσω από τον κόλπο",
  },
  "gregolimano-bay": {
    file: "explore-1.jpg",
    alt: "The sheltered turquoise bay at Gregolimano, enclosed by headlands",
    altHe: "המפרץ המוגן בגוון טורקיז בגרגולימנו, תחום בין לשונות יבשה",
    altEl: "Ο προστατευμένος τιρκουάζ κόλπος του Γρεγολίμανου, ανάμεσα σε ακρωτήρια",
  },
  "loutra-edipsou": {
    file: "explore-2.jpg",
    alt: "The waterfront of Loutra Edipsou, lined with houses and fishing boats",
    altHe: "טיילת החוף של לוטרה אדיפסו, לאורכה בתים וסירות דיג",
    altEl: "Η παραλία των Λουτρών Αιδηψού, με σπίτια και ψαροκάικα",
  },
  "drymona-waterfalls": {
    file: "explore-4.jpg",
    alt: "The Drymona waterfalls dropping into a green forest pool",
    altHe: "מפלי דרימונה נשפכים אל בריכה ירוקה ביער",
    altEl: "Οι καταρράκτες της Δρυμώνας πέφτουν σε μια πράσινη λίμνη μέσα στο δάσος",
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
  altHe: string;
  altEl: string;
  uploadedAt: string;
}

const toImage = ({ id, url, alt, altHe, altEl, uploadedAt }: Row): SiteImage => ({
  id,
  url,
  alt,
  altHe,
  altEl,
  uploadedAt,
});

/** Every record in the store, whatever slot it sits in. */
function allImages(images: SiteImages): SiteImage[] {
  return [images.hero, images.lifestyle, images.hosts, ...images.gallery, ...Object.values(images.explore)];
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
  const hosts = bySlot.get("hosts")?.[0];
  if (!hero || !lifestyle || !hosts) return null;

  const explore = {} as Record<ExploreSlug, SiteImage>;
  for (const slug of exploreSlugs) {
    const row = bySlot.get(slug)?.[0];
    if (!row) return null;
    explore[slug] = toImage(row);
  }

  return {
    hero: toImage(hero),
    lifestyle: toImage(lifestyle),
    hosts: toImage(hosts),
    gallery: (bySlot.get("gallery") ?? []).map(toImage),
    explore,
  };
}

/**
 * Uploads a shipped default under a name derived from its slot, and gives the
 * row an id derived the same way.
 *
 * Both being deterministic is what makes seeding safe to run twice at once:
 * concurrent instances write the same bytes to the same object and insert the
 * same row id, instead of creating two rival sets where one gets swept away.
 */
async function seedFrom(sourceName: string, alts: ImageAlts, slot: string): Promise<SiteImage> {
  const bytes = await readFile(join(defaultsDir, sourceName));
  const mime = sourceName.endsWith(".png") ? "image/png" : "image/jpeg";
  const { url } = await uploadAs(`seed/${slot}-${sourceName}`, bytes, mime);

  const { alt, altHe, altEl } = alts;
  return { id: `seed-${slot}`, url, alt, altHe, altEl, uploadedAt: new Date().toISOString() };
}

/**
 * Fills the table from the images the site shipped with, so the admin edits
 * real records from the first run instead of a mix of bundled and uploaded.
 *
 * Only empty slots are filled. A slot added after launch (the host portrait)
 * then arrives on a live site without touching the photos the admin already
 * replaced, and the gallery is only seeded into a brand-new store — otherwise
 * photos the admin deleted from it would come back.
 */
async function seed(): Promise<SiteImages> {
  const filled = new Set(
    (await query<{ slot: string }>(`SELECT DISTINCT slot FROM site_images`)).map((row) => row.slot),
  );
  const rows: (SiteImage & { slot: string; position: number })[] = [];

  for (const key of singleImageKeys) {
    if (filled.has(key)) continue;
    const preset = defaults[key];
    rows.push({ ...(await seedFrom(preset.file, preset, key)), slot: key, position: 0 });
  }
  for (const [index, alts] of filled.size === 0 ? galleryDefaults.entries() : []) {
    const slot = `gallery-${index}`;
    rows.push({
      ...(await seedFrom(`gallery-${index + 1}.jpg`, alts, slot)),
      id: `seed-${slot}`,
      slot: "gallery",
      position: index,
    });
  }
  for (const slug of exploreSlugs) {
    if (filled.has(slug)) continue;
    const preset = exploreDefaults[slug];
    rows.push({ ...(await seedFrom(preset.file, preset, slug)), slot: slug, position: 0 });
  }

  /*
    No DELETE first, and conflicts are ignored: whichever instance gets there
    first wins each row, and a second one arriving behind it changes nothing.
    Clearing the table first is what made a concurrent seed destructive.
  */
  await transaction(async (run) => {
    for (const row of rows) {
      await run(
        `INSERT INTO site_images (id, slot, position, url, alt, "altHe", "altEl", "uploadedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [row.id, row.slot, row.position, row.url, row.alt, row.altHe, row.altEl, row.uploadedAt],
      );
    }
  });

  const seeded = await readStore();
  if (!seeded) throw new Error("Seeding did not produce a complete image store");

  // Deliberately no sweep here: the objects are seconds old, and sweeping them
  // is precisely the bug this rewrite removes.
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
      `INSERT INTO site_images (id, slot, position, url, alt, "altHe", "altEl", "uploadedAt")
       VALUES ($1, $2, 0, $3, $4, $5, $6, $7)`,
      [image.id, slot, image.url, image.alt, image.altHe, image.altEl, image.uploadedAt],
    );
  });
}

/** Puts the uploaded bytes in the bucket under a generated name. */
async function store(buffer: Buffer, originalName: string, mimeType: string): Promise<SiteImage> {
  const { url } = await upload(buffer, originalName, mimeType);
  return {
    id: crypto.randomUUID(),
    url,
    alt: "",
    altHe: "",
    altEl: "",
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * The descriptions for a replacement photo: the ones sent with it, or — when
 * no English description came with the file — the ones already on the slot.
 */
function keepAlts(sent: ImageAlts, current: ImageAlts): ImageAlts {
  const { alt, altHe, altEl } = sent.alt ? sent : current;
  return { alt, altHe, altEl };
}

/** Replaces one of the single-slot photos (hero, lifestyle, hosts). */
export async function replaceSingle(
  key: SingleImageKey,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  alts: ImageAlts,
): Promise<SiteImages> {
  const current = await load();
  const image = await store(buffer, originalName, mimeType);

  await replaceSlot(key, { ...image, ...keepAlts(alts, current[key]) });
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
  alts: ImageAlts,
): Promise<SiteImages> {
  const current = await load();
  const image = await store(buffer, originalName, mimeType);

  await replaceSlot(slug, { ...image, ...keepAlts(alts, current.explore[slug]) });
  const next = (await readStore())!;
  await removeOrphans(next);
  return next;
}

export async function addGalleryImage(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  { alt, altHe, altEl }: ImageAlts,
): Promise<SiteImages> {
  await load();
  const image = await store(buffer, originalName, mimeType);

  await query(
    `INSERT INTO site_images (id, slot, position, url, alt, "altHe", "altEl", "uploadedAt")
     SELECT $1, 'gallery', coalesce(max(position), -1) + 1, $2, $3, $4, $5, $6
       FROM site_images WHERE slot = 'gallery'`,
    [image.id, image.url, alt, altHe, altEl, image.uploadedAt],
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

/** Edits the descriptions, wherever in the store that image lives. */
export async function updateAlt(
  id: string,
  { alt, altHe, altEl }: ImageAlts,
): Promise<SiteImages | null> {
  await load();
  const updated = await query(
    `UPDATE site_images SET alt = $2, "altHe" = $3, "altEl" = $4 WHERE id = $1 RETURNING id`,
    [id, alt, altHe, altEl],
  );
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
  const stale = (await listSweepable()).filter((name: string) => !referenced.has(name));
  await remove(stale);
}
