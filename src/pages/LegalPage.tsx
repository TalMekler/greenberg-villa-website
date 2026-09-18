import { useEffect, useLayoutEffect, useRef } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { CookieConsent } from "../components/layout/CookieConsent";
import { Footer } from "../components/layout/Footer";
import { LanguagePicker } from "../components/layout/LanguagePicker";
import { CoordinatorContact, OperatorContact } from "../components/legal/OperatorContact";
import { WithPlaceholders } from "../components/legal/Placeholder";
import { accessibilityUpdated } from "../data/accessibility";
import { operator } from "../data/operator";
import { dictionaries } from "../i18n/dictionaries";
import { languageMeta, languages, useLanguage, type Dictionary, type Language } from "../i18n";
import { formatLongDate } from "../lib/date";
import { legalDocuments, legalPath, type LegalBlock, type LegalPage as Page } from "../legal";
import { openCookieSettings } from "../lib/cookie-settings";

/** Below this many sections a table of contents is more clutter than help. */
const TOC_MIN_SECTIONS = 4;

function Block({ block, t, language }: { block: LegalBlock; t: Dictionary; language: Language }) {
  if (typeof block === "string") {
    return (
      <p className="mt-4 font-sans text-[16px] leading-[1.75] text-ink sm:text-[17px]">
        <WithPlaceholders text={block} />
      </p>
    );
  }
  if ("heading" in block) {
    return <h3 className="mt-8 font-sans text-[18px] font-bold text-navy">{block.heading}</h3>;
  }
  if ("list" in block) {
    return (
      <ul className="mt-4 flex list-disc flex-col gap-2 ps-6 font-sans text-[16px] leading-[1.7] text-ink marker:text-terracotta-deep sm:text-[17px]">
        {block.list.map((item) => (
          <li key={item}>
            <WithPlaceholders text={item} />
          </li>
        ))}
      </ul>
    );
  }
  if ("terms" in block) {
    return (
      <dl className="mt-5 divide-y divide-line border-y border-line font-sans text-[16px] leading-[1.65]">
        {block.terms.map(([term, detail]) => (
          <div key={term} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
            <dt className="font-semibold text-navy">
              <WithPlaceholders text={term} />
            </dt>
            <dd className="text-ink">
              <WithPlaceholders text={detail} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  if ("see" in block) {
    return (
      <p className="mt-4 font-sans text-[16px] sm:text-[17px]">
        <Link
          to={legalPath(language, block.see)}
          className="font-semibold text-terracotta-deep underline underline-offset-2 hover:text-navy"
        >
          {t.legal[block.see]}
        </Link>
      </p>
    );
  }
  if ("coordinator" in block) return <CoordinatorContact t={t} />;
  if ("table" in block) {
    const { caption, head, rows } = block.table;
    return (
      // Scrolls sideways on a phone rather than squeezing six columns to nothing.
      // Focusable and named, so a keyboard user can scroll it too.
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="mt-5 overflow-x-auto rounded-lg border border-line"
      >
        <table className="w-full min-w-[640px] border-collapse text-start font-sans text-[14px] leading-[1.55]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-sand">
            <tr>
              {head.map((cell) => (
                <th key={cell} scope="col" className="border-b border-line px-3 py-2.5 text-start font-semibold text-navy">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className="px-3 py-2.5 text-start align-top font-semibold whitespace-nowrap text-navy">
                      <bdi dir="ltr">{cell}</bdi>
                    </th>
                  ) : (
                    <td key={index} className="px-3 py-2.5 align-top text-ink">
                      <WithPlaceholders text={cell} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if ("cookieSettings" in block) {
    return (
      <p className="mt-5">
        <button
          type="button"
          onClick={openCookieSettings}
          className="inline-flex min-h-11 items-center justify-center rounded-[4px] bg-navy px-5 py-2.5 font-sans text-[14px] font-bold text-white transition-colors hover:bg-[#16304d]"
        >
          {t.consent.change}
        </button>
      </p>
    );
  }
  return <OperatorContact t={t} />;
}

/**
 * Privacy policy, booking conditions and accessibility statement: one page,
 * three documents, three languages.
 *
 * The language comes from the URL (/he/privacy), not from the visitor's stored
 * choice, so a link always opens in the language it was shared in. The rest of
 * the app follows the URL: switching language here navigates to the same page
 * in the other language, and the stored choice is updated to match.
 */
export default function LegalPage({ page }: { page: Page }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const urlLanguage = languages.includes(params.lang as Language) ? (params.lang as Language) : null;
  const doc = urlLanguage ? legalDocuments[urlLanguage][page] : null;

  // Layout, not a plain effect: the context has to agree with the URL before
  // the first paint, or the footer and <html dir> flash the old language.
  useLayoutEffect(() => {
    if (urlLanguage && urlLanguage !== language) setLanguage(urlLanguage);
  }, [urlLanguage, language, setLanguage]);

  // Title and description, for tabs, bookmarks and search results.
  useEffect(() => {
    if (!doc) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = { title: document.title, description: meta?.content };
    document.title = `${doc.title} — Green Villa`;
    if (meta) meta.content = doc.summary;
    return () => {
      document.title = previous.title;
      if (meta && previous.description !== undefined) meta.content = previous.description;
    };
  }, [doc]);

  /*
    Where focus goes when the page or the fragment changes. A link to a section
    (#cookies, or the skip link's #main) scrolls to it and moves focus there,
    so the next Tab continues from it. Arriving from another page moves focus
    to the h1, so a screen reader announces the new page instead of staying
    silent on a link that is no longer there. A first load leaves focus alone,
    as any page load would.

    Switching language keeps both the page and the fragment, so it runs
    neither — focus stays on the language button that was pressed.
  */
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) {
      const focusable = target.hasAttribute("tabindex") ? target : target.querySelector<HTMLElement>("h2");
      target.scrollIntoView();
      focusable?.focus({ preventScroll: true });
      return;
    }
    window.scrollTo(0, 0);
    if (location.key !== "default") headingRef.current?.focus({ preventScroll: true });
    // location.key is deliberately left out: it changes on a language switch too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, location.hash]);

  if (!urlLanguage || !doc) {
    return <Navigate to={legalPath(language, page, location.hash)} replace />;
  }
  /*
    For one render after a switch the context still holds the old language;
    the layout effect above brings it round before anything is painted. The
    page must not unmount meanwhile — that would drop keyboard focus from the
    language button that was just pressed.
  */
  const t = dictionaries[urlLanguage];
  // The accessibility statement is reviewed on its own schedule, against the site.
  const updated =
    page === "accessibility"
      ? formatLongDate(accessibilityUpdated, languageMeta[urlLanguage].locale)
      : operator.lastUpdated;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-sans focus:font-semibold focus:text-navy"
      >
        {t.nav.skipToContent}
      </a>
      <CookieConsent />

      <header className="on-dark bg-navy">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-20 lg:py-6">
          <Link to="/" className="font-serif text-[22px] text-white transition-opacity hover:opacity-80 lg:text-[28px]">
            Green Villa
          </Link>
          <LanguagePicker
            compact
            onSelect={(next) => navigate(legalPath(next, page, location.hash))}
          />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="bg-shell px-5 py-14 sm:px-8 lg:px-20 lg:py-20">
        <article className="mx-auto w-full max-w-[760px]">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-serif text-[36px] leading-[1.15] text-navy sm:text-[44px] lg:text-[52px]"
          >
            {doc.title}
          </h1>
          <p className="mt-3 font-sans text-[14px] text-slate">
            {t.legal.lastUpdated} <WithPlaceholders text={updated} />
          </p>
          <p className="mt-6 font-sans text-[17px] leading-[1.75] text-slate sm:text-[18px]">
            <WithPlaceholders text={doc.summary} />
          </p>

          {doc.sections.length >= TOC_MIN_SECTIONS ? (
            <nav aria-labelledby="legal-toc" className="mt-10 rounded-lg border border-line bg-sand p-6">
              <h2 id="legal-toc" className="font-sans text-[13px] font-bold tracking-[0.08em] text-navy uppercase">
                {t.legal.contents}
              </h2>
              <ol className="mt-4 flex list-decimal flex-col gap-2 ps-6 font-sans text-[15px] leading-[1.5] text-ink marker:text-slate">
                {doc.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-terracotta-deep underline underline-offset-2 transition-colors hover:text-navy"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="mt-14 scroll-mt-6"
            >
              <h2
                id={`${section.id}-heading`}
                tabIndex={-1}
                className="font-serif text-[28px] leading-[1.25] text-navy sm:text-[32px]"
              >
                {section.heading}
              </h2>
              {section.blocks.map((block, index) => (
                <Block key={index} block={block} t={t} language={urlLanguage} />
              ))}
            </section>
          ))}

          <p className="mt-16 border-t border-line pt-8 font-sans text-[15px]">
            <Link to="/" className="font-semibold text-terracotta-deep underline underline-offset-2 hover:text-navy">
              {t.legal.backToSite}
            </Link>
          </p>
        </article>
      </main>

      <Footer />
    </>
  );
}
