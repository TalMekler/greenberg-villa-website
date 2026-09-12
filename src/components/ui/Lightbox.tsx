import { useCallback, useEffect } from "react";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import { useLanguage } from "../../i18n";

/** What the lightbox needs of an image, whatever its source. */
export interface GalleryImage {
  src: string;
  alt: string;
}

interface LightboxProps {
  images: GalleryImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const { t } = useLanguage();
  const isOpen = index !== null;
  useLockBodyScroll(isOpen);

  const goTo = useCallback(
    (next: number) => onNavigate((next + images.length) % images.length),
    [images.length, onNavigate],
  );

  useEffect(() => {
    if (index === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, goTo, onClose]);

  if (index === null) return null;
  const image = images[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(27,58,92,0.94)] p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t.gallery.close}
        className="absolute top-4 end-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white transition hover:bg-white/20 sm:top-6 sm:end-6"
      >
        ×
      </button>

      <button
        type="button"
        aria-label={t.gallery.previous}
        onClick={(event) => {
          event.stopPropagation();
          goTo(index - 1);
        }}
        className="absolute start-2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:start-6"
      >
        <span aria-hidden="true" className="-mt-0.5 text-2xl leading-none">
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
          className="max-h-[75vh] w-auto rounded-lg object-contain shadow-2xl"
        />
        <figcaption className="text-center font-sans text-[13px] text-cream">
          {image.alt}
          <span className="mt-1 block opacity-60">
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
        className="absolute end-2 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:end-6"
      >
        <span aria-hidden="true" className="-mt-0.5 text-2xl leading-none">
          ›
        </span>
      </button>
    </div>
  );
}
