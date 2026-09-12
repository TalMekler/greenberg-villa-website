import { useState } from "react";
import { Footer } from "../components/layout/Footer";
import { Navbar } from "../components/layout/Navbar";
import { About } from "../components/sections/About";
import { Availability } from "../components/sections/Availability";
import { Contact } from "../components/sections/contact";
import { Explore } from "../components/sections/Explore";
import { Gallery } from "../components/sections/Gallery";
import { Hero } from "../components/sections/Hero";
import { Location } from "../components/sections/location";
import { Transit } from "../components/sections/Transit";
import { useScrollReveal } from "../hooks/useScrollReveal";
import type { Stay } from "../lib/stay";
import { useLanguage } from "../i18n";
import { useSiteImages } from "../hooks/useSiteImages";
import { useVillaLocation } from "../hooks/useVillaLocation";

export default function PublicSite() {
  // Dates picked in the calendar flow through to the contact form.
  const { t, language } = useLanguage();
  const [stay, setStay] = useState<Stay | null>(null);
  // Hero and gallery photos are managed in the admin.
  const { images } = useSiteImages();
  const { location } = useVillaLocation();
  // Language is a dependency too: switching it can remount revealed content,
  // and the fresh nodes need observing again.
  useScrollReveal([images, language]);

  return (
    <>
      <a
        href="#about"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-sans focus:text-navy"
      >
        {t.nav.skipToContent}
      </a>
      <Navbar />
      <main>
        <Hero image={images?.hero ?? null} />
        {images ? <About image={images.lifestyle} /> : null}
        {images ? <Gallery images={images.gallery} /> : null}
        <Location location={location} />
        {images ? <Explore images={images.explore} /> : null}
        <Availability stay={stay} onStayChange={setStay} />
        <Transit />
        <Contact stay={stay} />
      </main>
      <Footer />
    </>
  );
}
