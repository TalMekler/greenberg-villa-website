import { useCallback, useEffect, useRef } from "react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import { useLanguage, type Language } from "../../i18n";

/** What the lightbox needs of an image, whatever its source. */
export interface GalleryImage {
  src: string;
  alt: string;
  /** Set when the alt text is not in the page's language. */
  lang?: Language;
}

interface LightboxProps {
  images: GalleryImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const navButton =
  "absolute flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20";

export function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const { t, meta } = useLanguage();
  const isOpen = index !== null;
  useLockBodyScroll(isOpen);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const goTo = useCallback(
    (next: number) => onNavigate((next + images.length) % images.length),
    [images.length, onNavigate],
  );

  /*
    Focus goes into the dialog when it opens and back to the photo that opened
    it when it closes, so a keyboard user is never left on a control hidden
    behind the overlay — or dropped back at the top of the page.
  */
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (index === null) return;

    // "Next" sits on the end side, so the arrow keys follow the reading direction.
    const forward = meta.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const back = meta.dir === "rtl" ? "ArrowRight" : "ArrowLeft";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === forward) goTo(index + 1);
      if (event.key === back) goTo(index - 1);

      // Keep Tab inside the dialog: the page behind it is covered, not gone.
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button")];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, goTo, onClose, meta.dir]);

  if (index === null) return null;
  const image = images[index];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.gallery.dialogLabel}
      className="on-dark fixed inset-0 z-50 flex items-center justify-center bg-[rgba(27,58,92,0.94)] p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t.gallery.close}
        className="absolute top-4 end-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white transition hover:bg-white/20 sm:top-6 sm:end-6"
      >
        <span aria-hidden="true">×</span>
      </button>

      <button
        type="button"
        aria-label={t.gallery.previous}
        onClick={(event) => {
          event.stopPropagation();
          goTo(index - 1);
        }}
        className={`${navButton} start-2 sm:start-6`}
      >
        {/* Mirrored in Hebrew, where "previous" sits on the right. */}
        <span aria-hidden="true" className="-mt-0.5 inline-block text-2xl leading-none rtl:-scale-x-100">
          ‹
        </span>
      </button>

      <figure
        className="flex max-h-full max-w-[1100px] flex-col items-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={image.src}
          alt={image.alt}
          lang={image.lang}
          className="max-h-[75vh] w-auto rounded-lg object-contain shadow-2xl"
        />
        {/* Live, so moving to another photo announces what it shows. */}
        <figcaption aria-live="polite" className="text-center font-sans text-[13px] text-cream">
          <span lang={image.lang}>{image.alt}</span>
          {/* Isolated left to right: in Hebrew "2 / 7" would otherwise print as "7 / 2". */}
          <span dir="ltr" className="mt-1 block text-cream/80">
            {index + 1} / {images.length}
          </span>
        </figcaption>
      </figure>

      <button
        type="button"
        aria-label={t.gallery.next}
        onClick={(event) => {
          event.stopPropagation();
          goTo(index + 1);
        }}
        className={`${navButton} end-2 sm:end-6`}
      >
        <span aria-hidden="true" className="-mt-0.5 inline-block text-2xl leading-none rtl:-scale-x-100">
          ›
        </span>
      </button>
    </div>
  );
}
