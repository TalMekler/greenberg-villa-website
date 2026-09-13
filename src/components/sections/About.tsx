import { statIcons } from "../../data/site";
import { useLanguage } from "../../i18n";
import type { SiteImage } from "../../lib/site-images";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export function About({ image }: { image: SiteImage }) {
  const { t } = useLanguage();

  return (
    <section id="about" className="bg-shell px-5 py-20 sm:px-8 lg:px-20 lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-14 lg:gap-20">
        <ul className="reveal grid grid-cols-1 gap-8 rounded-lg border border-line bg-sand p-6 sm:grid-cols-2 sm:p-8 xl:grid-cols-4">
          {t.about.stats.map((stat, index) => (
            <li key={stat.title} className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[rgba(27,58,92,0.08)]">
                <Icon name={statIcons[index]} size={20} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-sans text-[16px] font-bold text-ink">{stat.title}</span>
                <span className="font-sans text-[12px] text-slate">{stat.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-8">
          <div className="reveal flex w-full flex-col gap-8 lg:w-1/2">
            <div className="flex flex-col gap-4">
              <p className="font-sans text-[14px] font-bold tracking-[0.08em] text-terracotta uppercase">
                {t.about.eyebrow}
              </p>
              <h2 className="font-serif text-[32px] leading-[1.2] text-navy sm:text-[40px] lg:text-[48px]">
                {t.about.title}
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {t.about.intro.map((paragraph) => (
                <p
                  key={paragraph}
                  className="font-sans text-[17px] leading-[1.8] text-slate lg:text-[18px]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="pt-3">
              <Button href="#gallery" variant="outline">
                {t.about.cta}
              </Button>
            </div>
          </div>

          <div className="reveal w-full lg:w-1/2">
            <img
              src={image.url}
              alt={image.alt}
              className="h-[320px] w-full rounded-lg object-cover sm:h-[440px] lg:h-[560px]"
            />
          </div>
        </div>

        <div className="reveal flex flex-col gap-6 border-t border-line pt-12 lg:pt-16">
          <h3 className="heading-card font-serif text-[26px] text-navy sm:text-[30px]">
            {t.about.houseTitle}
          </h3>
          {/* Balanced columns rather than a grid: the paragraphs differ in
              length, and a two-column grid would leave one side short. */}
          <div className="flex flex-col gap-4 lg:block lg:columns-2 lg:gap-10 lg:[&>p]:break-inside-avoid">
            {t.about.house.map((paragraph) => (
              <p
                key={paragraph}
                className="font-sans text-[16px] leading-[1.7] text-slate lg:mb-4"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
