import { useState } from "react";
import type { SiteImage } from "../../lib/site-images";
import { localizeAlt, useLanguage } from "../../i18n";
import { Lightbox } from "../ui/Lightbox";
import { SectionHeading } from "../ui/SectionHeading";

/**
 * The asymmetric Figma grid, expressed as a repeating pattern so the section
 * survives the admin adding or removing photos.
 */
const pattern = [
  { size: 2, columns: "lg:grid-cols-[733fr_515fr]", height: "lg:h-[400px]" },
  { size: 3, columns: "lg:grid-cols-3", height: "lg:h-[320px]" },
  { size: 2, columns: "lg:grid-cols-[515fr_733fr]", height: "lg:h-[450px]" },
];

/** Falls back to equal columns when a row is not completely filled. */
const evenColumns: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
};

interface Row {
  images: SiteImage[];
  columns: string;
  height: string;
  offset: number;
}

function buildRows(images: SiteImage[]): Row[] {
  const rows: Row[] = [];
  let index = 0;
  let step = 0;

  while (index < images.length) {
    const slot = pattern[step % pattern.length];
    const slice = images.slice(index, index + slot.size);
    rows.push({
      images: slice,
      columns: slice.length === slot.size ? slot.columns : evenColumns[slice.length],
      height: slot.height,
      offset: index,
    });
    index += slot.size;
    step += 1;
  }

  return rows;
}

export function Gallery({ images }: { images: SiteImage[] }) {
  const { t, language } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rows = buildRows(images);
  // An upload the admin left undescribed still gets a name, never an empty alt.
  const alts = images.map((image, index) =>
    localizeAlt(image.alt, language, `${t.gallery.title} ${index + 1} / ${images.length}`),
  );

  return (
    <section id="gallery" className="bg-cream px-5 py-20 sm:px-8 lg:px-20 lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 lg:gap-16">
        <SectionHeading
          eyebrow={t.gallery.eyebrow}
          title={t.gallery.title}
          description={t.gallery.description}
        />

        <div className="flex flex-col gap-4 lg:gap-6">
          {rows.map((row) => (
            <div
              key={row.offset}
              className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 ${row.columns} ${row.height}`}
            >
              {row.images.map((image, position) => {
                const index = row.offset + position;
                const alt = alts[index];
                // Named by its contents rather than aria-label, so the photo's
                // description keeps its own `lang` when it is still in English.
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setOpenIndex(index)}
                    className="reveal group h-[240px] overflow-hidden rounded-lg sm:h-[280px] lg:h-full"
                  >
                    <span className="sr-only">{t.gallery.open}: </span>
                    <img
                      src={image.url}
                      alt={alt.alt}
                      lang={alt.lang}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Lightbox
        images={images.map((image, index) => ({ src: image.url, ...alts[index] }))}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </section>
  );
}
