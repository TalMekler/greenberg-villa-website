import { localizeAlt, useLanguage } from "../../i18n";
import { Button } from "../ui/Button";
import type { SiteImage } from "../../lib/site-images";

export function Hero({ image }: { image: SiteImage | null }) {
  const { t, language } = useLanguage();
  const alt = image ? localizeAlt(image.alt, language, "Green Villa") : null;

  return (
    // Exactly one viewport tall so the CTA is above the fold on load; min-h
    // protects short landscape viewports, where the page scrolls instead.
    <section id="home" className="on-dark relative flex h-dvh min-h-[560px] items-end bg-navy">
      {image && alt ? (
        <img
          src={image.url}
          alt={alt.alt}
          lang={alt.lang}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(27,58,92,0.3)]" />
      {/*
        The scrim the text sits on. The admin can swap the photo for any image,
        so it is sized for the worst case — a bright sky or white wall behind
        the words — and keeps the subtitle above 4.5:1 and the title above 3:1
        whatever is uploaded.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[rgba(27,58,92,0.75)] via-[rgba(27,58,92,0.6)] via-50% to-transparent"
      />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center gap-6 px-5 pt-28 pb-16 text-center sm:px-8 lg:px-20 lg:pb-24">
        <h1 className="max-w-[900px] font-serif text-[44px] leading-[1.1] text-white sm:text-[60px] lg:text-[72px]">
          Green Villa
        </h1>
        <p className="max-w-[700px] font-sans text-[17px] text-cream sm:text-[20px]">
          {t.hero.subtitle}
        </p>
        <div className="pt-4">
          <Button href="#availability">{t.hero.cta}</Button>
        </div>
      </div>
    </section>
  );
}
