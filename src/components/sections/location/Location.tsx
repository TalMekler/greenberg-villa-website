import { useLanguage } from "../../../i18n";
import type { VillaLocation } from "../../../lib/location";
import { Icon } from "../../ui/Icon";
import { MapPanel } from "./MapPanel";

export function Location({ location }: { location: VillaLocation }) {
  const { t } = useLanguage();

  return (
    <section id="location" className="bg-shell px-5 py-20 sm:px-8 lg:px-20 lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center gap-12 lg:flex-row lg:gap-20">
        <div className="w-full lg:w-1/2">
          <MapPanel location={location} />
        </div>

        <div className="reveal flex w-full flex-col gap-8 lg:w-1/2">
          <div className="flex flex-col gap-4">
            <p className="font-sans text-[14px] font-bold tracking-[0.08em] text-terracotta-deep uppercase">
              {t.location.eyebrow}
            </p>
            <h2 className="font-serif text-[32px] leading-[1.2] text-navy sm:text-[40px] lg:text-[48px]">
              {t.location.title}
            </h2>
            <p className="font-sans text-[16px] leading-[1.6] text-slate">
              {t.location.description}
            </p>
          </div>

          <ul className="flex flex-col gap-6">
            {t.location.highlights.map((highlight) => (
              <li key={highlight.title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream">
                  <Icon name="mapPin" size={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-sans text-[18px] font-bold text-navy">{highlight.title}</h3>
                    <p className="font-sans text-[12px] font-bold tracking-[0.06em] text-terracotta-deep uppercase">
                      {highlight.distance}
                    </p>
                  </div>
                  <p className="font-sans text-[14px] leading-[1.5] text-slate">
                    {highlight.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
