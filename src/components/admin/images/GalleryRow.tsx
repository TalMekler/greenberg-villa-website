import { useId, useState } from "react";
import { deleteGalleryImage, reorderGallery, updateImageAlt } from "../../../lib/api";
import type { SiteImage, SiteImages } from "../../../lib/site-images";
import { FieldError, smallButton } from "../shared";
import { messageFor } from "./shared";

/** One gallery photo, with description, reordering and delete. */
export function GalleryRow({
  image,
  index,
  ids,
  onChanged,
}: {
  image: SiteImage;
  index: number;
  /** Every gallery id in current order, so a move can send the full ordering. */
  ids: string[];
  onChanged: (next: SiteImages) => void;
}) {
  const fieldId = useId();
  const [alt, setAlt] = useState(image.alt);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<SiteImages>, field = "alt") => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
      setConfirming(false);
    } catch (caught) {
      setError(messageFor(caught, field));
    } finally {
      setBusy(false);
    }
  };

  const total = ids.length;

  const move = (direction: -1 | 1) => {
    const next = [...ids];
    const target = index + direction;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <img
          src={image.url}
          alt={image.alt}
          className="h-[72px] w-[104px] shrink-0 rounded-[4px] object-cover"
        />

        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <label htmlFor={fieldId} className="font-sans text-[12px] text-slate">
            Description
          </label>
          <input
            id={fieldId}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            className="w-full rounded-[4px] border border-line bg-white px-3 py-2 font-sans text-[13px] text-ink focus:border-navy focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 self-center">
          <button
            type="button"
            disabled={busy || alt.trim() === image.alt}
            onClick={() => void run(() => updateImageAlt(image.id, alt))}
            className={`${smallButton} bg-navy text-white not-disabled:hover:bg-[#16304d]`}
          >
            Save
          </button>
          <button
            type="button"
            aria-label="Move earlier"
            disabled={busy || index === 0}
            onClick={() => void run(() => reorderGallery(move(-1)), "order")}
            className={`${smallButton} border border-line text-slate not-disabled:hover:bg-sand`}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move later"
            disabled={busy || index === total - 1}
            onClick={() => void run(() => reorderGallery(move(1)), "order")}
            className={`${smallButton} border border-line text-slate not-disabled:hover:bg-sand`}
          >
            ↓
          </button>
          <button
            type="button"
            disabled={busy || total <= 1}
            onClick={() => setConfirming((open) => !open)}
            className={`${smallButton} border border-terracotta text-terracotta not-disabled:hover:bg-terracotta not-disabled:hover:text-white`}
          >
            Delete
          </button>
        </div>
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-terracotta/10 p-3">
          <span className="flex-1 font-sans text-[13px] text-ink">
            Remove this photo from the gallery?
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => deleteGalleryImage(image.id), "image")}
            className={`${smallButton} bg-terracotta text-white not-disabled:hover:bg-[#b96b4f]`}
          >
            {busy ? "Removing…" : "Yes, remove"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className={`${smallButton} border border-line text-slate not-disabled:hover:bg-white`}
          >
            Keep
          </button>
        </div>
      ) : null}

      <FieldError message={error ?? undefined} />
    </li>
  );
}
