import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, type SiteImages } from "../../../lib/site-images";
import { ApiError } from "../../../lib/api";

export const accept = ACCEPTED_IMAGE_TYPES.join(",");
export const maxMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));

export interface ImagesPanelProps {
  images: SiteImages;
  onChanged: (next: SiteImages) => void;
}

/** Prefers the server's message for a field, then its general one. */
export function messageFor(caught: unknown, field: string): string {
  if (caught instanceof ApiError) {
    return caught.fieldErrors?.[field] ?? caught.message;
  }
  return "That did not go through.";
}
