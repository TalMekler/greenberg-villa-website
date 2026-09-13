import { exploreSlugOrder } from "../../data/site";
import { useLanguage } from "../../i18n";
import type { ExploreSlug, SiteImage } from "../../lib/site-images";
import { SectionHeading } from "../ui/SectionHeading";

export function Explore({ images }: { images: Record<ExploreSlug, SiteImage> }) {
  const { t } = useLanguage();

  return (
    <section id="explore" className="bg-cream px-5 py-20 sm:px-8 lg:px-20 lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 lg:gap-16">
        <SectionHeading
          eyebrow={t.explore.eyebrow}
          title={t.explore.title}
          description={t.explore.description}
        />

        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {t.explore.cards.map((card, index) => {
            const slug = exploreSlugOrder[index];
            const photo = images[slug];
            return (
            <li
              key={slug}
              className="reveal group flex flex-col overflow-hidden rounded-lg bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-panel"
            >
              <div className="h-[240px] overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.alt}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col gap-3 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="heading-card font-serif text-[22px] text-navy">{card.title}</h3>
                  <span className="rounded-[4px] bg-cream px-2 py-1 font-sans text-[11px] font-bold text-navy">
                    {card.distance}
                  </span>
                </div>
                <p className="font-sans text-[14px] leading-[1.5] text-slate">{card.description}</p>
              </div>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
