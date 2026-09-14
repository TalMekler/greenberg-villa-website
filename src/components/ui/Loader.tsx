import { useEffect, useState } from "react";
import { useLanguage } from "../../i18n";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

/**
 * Once it is up it stays up this long. A warm API can answer in under a
 * hundred milliseconds, and an overlay that appears and vanishes inside that
 * reads as a glitch — worse than never having shown one.
 */
const MIN_VISIBLE_MS = 550;

/**
 * Covers the page until the content behind it is worth looking at.
 *
 * Without it the site arrives in pieces: the hero paints navy, then the photo
 * drops in, then three sections appear at once as the image records land. On a
 * cold serverless start that sequence can run for several seconds.
 *
 * It stays mounted through its own fade-out so the reveal is a cross-fade
 * rather than a cut, and it is not a spinner over a blank page — the villa's
 * name is already there, which is the thing a visitor came for.
 */
export function Loader({ done }: { done: boolean }) {
  const { t } = useLanguage();
  const [shownAt] = useState(() => Date.now());
  const [minimumMet, setMinimumMet] = useState(false);
  const [gone, setGone] = useState(false);

  const settled = done && minimumMet;
  useLockBodyScroll(!gone);

  useEffect(() => {
    const timer = setTimeout(
      () => setMinimumMet(true),
      Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt)),
    );
    return () => clearTimeout(timer);
  }, [shownAt]);

  useEffect(() => {
    if (!settled) return;
    // Matches the opacity transition below; unmounting sooner would cut it off.
    const timer = setTimeout(() => setGone(true), 600);
    return () => clearTimeout(timer);
  }, [settled]);

  if (gone) return null;

  return (
    <div
      // aria-busy rather than a live region: announcing on a timer would
      // interrupt a screen reader that is already reading the page.
      role="status"
      aria-busy={!settled}
      aria-label={t.loader.label}
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-navy transition-opacity duration-500 ${
        settled ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <p className="font-serif text-[34px] text-white sm:text-[44px]">Green Villa</p>

      {/*
        A line that fills rather than a spinner: it reads the same in both
        writing directions, where anything rotating or sliding would have to be
        mirrored for Hebrew.
      */}
      <div className="h-px w-40 overflow-hidden bg-navy-line sm:w-56">
        <div className="loader-sweep h-full w-1/3 bg-terracotta" />
      </div>

      <p className="loader-message font-sans text-[13px] tracking-[0.18em] text-cream/70 uppercase">
        {t.loader.message}
      </p>
    </div>
  );
}
