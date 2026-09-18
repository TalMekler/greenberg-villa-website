import { useEffect, useState } from "react";
import { CookieConsent } from "../components/layout/CookieConsent";
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
import { useLiveReload } from "../hooks/useLiveReload";
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
  const { images, loading: imagesLoading, reload: reloadImages } = useSiteImages();
  const { location, loading: locationLoading, reload: reloadLocation } = useVillaLocation();
  // Lifted out of the Availability section so this page can see every request
  // the first screen depends on, and hold the loader until all of them land.
  const availability = useAvailability();
  // Language is a dependency too: switching it can remount revealed content,
  // and the fresh nodes need observing again.
  useScrollReveal([images, language]);

  // A visitor sitting on the page sees an approval, a swapped photo or a moved
  // pin without reloading. Each watcher re-fetches from our own API rather than
  // reading the changed row, so the browser never needs access to anything
  // beyond the fact that something moved.
  useLiveReload(["booked_dates"], availability.reload);
  useLiveReload(["site_images"], reloadImages);
  useLiveReload(["location"], reloadLocation);

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
      {/*
        Everything under the cover is inert until it lifts: otherwise a keyboard
        user tabs through links they cannot see, and a screen reader reads a
        page the loader says is still busy. `contents` keeps the wrapper out of
        the layout.
      */}
      <div inert={!ready} className="contents">
        {/*
          First in the tab order. It lands on <main> itself — which starts with
          the hero and the page's only h1 — rather than on a section further
          down, and sits above the navbar (z-40) so it is seen when focused.
          `start-4` keeps it in the reading corner in Hebrew too.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-sans focus:font-semibold focus:text-navy"
        >
          {t.nav.skipToContent}
        </a>
        {/* Inside the inert wrapper: under the cover it would be reachable but unseen. */}
        <CookieConsent />
        <Navbar />
        {/* tabIndex -1 so the skip link moves keyboard focus here, not just the scroll. */}
        <main id="main" tabIndex={-1}>
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
      </div>
    </>
  );
}
