import { useEffect, useState } from "react";
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
import { Loader } from "../components/ui/Loader";
import { useAvailability } from "../hooks/useAvailability";
import { useScrollReveal } from "../hooks/useScrollReveal";
import type { Stay } from "../lib/stay";
import { useLanguage } from "../i18n";
import { useSiteImages } from "../hooks/useSiteImages";
import { useVillaLocation } from "../hooks/useVillaLocation";

/**
 * However slow the API is, the loader gives up after this and lets the page
 * through. A visitor staring at a covered page is worse than one looking at a
 * section that says it could not load.
 */
const PATIENCE_MS = 12_000;

export default function PublicSite() {
  // Dates picked in the calendar flow through to the contact form.
  const { t, language } = useLanguage();
  const [stay, setStay] = useState<Stay | null>(null);
  // Hero and gallery photos are managed in the admin.
  const { images, loading: imagesLoading } = useSiteImages();
  const { location, loading: locationLoading } = useVillaLocation();
  // Lifted out of the Availability section so this page can see every request
  // the first screen depends on, and hold the loader until all of them land.
  const availability = useAvailability();
  // Language is a dependency too: switching it can remount revealed content,
  // and the fresh nodes need observing again.
  useScrollReveal([images, language]);

  // Which hero has finished decoding, rather than a boolean: comparing it with
  // the current URL derives "painted" during render, so a changed hero resets
  // itself without an effect writing state on the way in.
  const [paintedUrl, setPaintedUrl] = useState<string | null>(null);
  const [outOfPatience, setOutOfPatience] = useState(false);

  const heroUrl = images?.hero.url;
  const heroPainted = Boolean(heroUrl) && paintedUrl === heroUrl;

  useEffect(() => {
    if (!heroUrl) return;

    // Decoding the hero before uncovering the page is what stops it arriving
    // as a navy rectangle that fills in a moment later.
    let cancelled = false;
    const image = new Image();
    image.src = heroUrl;
    // Settle either way: a photo that fails to load must not hold the page.
    const settle = () => {
      if (!cancelled) setPaintedUrl(heroUrl);
    };
    image.decode().then(settle, settle);

    return () => {
      cancelled = true;
    };
  }, [heroUrl]);

  useEffect(() => {
    const timer = setTimeout(() => setOutOfPatience(true), PATIENCE_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready =
    outOfPatience ||
    (!imagesLoading && !locationLoading && !availability.loading && (heroPainted || !heroUrl));

  return (
    <>
      <Loader done={ready} />
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
        <Availability stay={stay} onStayChange={setStay} availability={availability} />
        <Transit />
        <Contact stay={stay} />
      </main>
      <Footer />
    </>
  );
}
