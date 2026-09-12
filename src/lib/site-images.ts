// Shared between the browser and the API server — no asset or DOM imports.

export interface SiteImage {
  id: string;
  /** Path to fetch the file from, e.g. `/api/media/<uuid>.jpg`. */
  url: string;
  alt: string;
  uploadedAt: string;
}

/** The standalone photos — one slot each, replace-only. */
export const singleImageKeys = ["hero", "lifestyle"] as const;
export type SingleImageKey = (typeof singleImageKeys)[number];

/**
 * Explore cards are fixed editorial content, so their photos are replace-only
 * too and keyed by the card's slug.
 */
export const exploreSlugs = [
  "chiliadou-beach",
  "limni-village",
  "edipsos-hot-springs",
  "drymonas-waterfall",
  "kirinthos-gorge",
  "taverna-platanos",
] as const;
export type ExploreSlug = (typeof exploreSlugs)[number];

export interface SiteImages {
  hero: SiteImage;
  lifestyle: SiteImage;
  gallery: SiteImage[];
  explore: Record<ExploreSlug, SiteImage>;
}

/** Upload limits, mirrored in the admin UI so it can warn before sending. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
