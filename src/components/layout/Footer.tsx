import { Link, useLocation, useNavigate } from "react-router-dom";
import { hasEmail, hasPhone, operator, telHref } from "../../data/operator";
import { navLinks } from "../../data/site";
import { useLanguage } from "../../i18n";
import { legalPages, legalPath } from "../../legal";
import { COOKIE_SETTINGS_ID, openCookieSettings } from "../../lib/cookie-settings";

const linkClass = "font-sans text-[13px] text-cream transition-colors hover:text-white";

export function Footer() {
  const { t, language } = useLanguage();
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();

  // The section links are fragments of the home page. Elsewhere (the legal
  // pages) they have to lead back to it first.
  const onHome = pathname === "/";
  const sectionHref = (hash: string) => (onHome ? hash : `/${hash}`);

  const cookieSettings = () => {
    if (openCookieSettings()) return;
    const target = legalPath(language, "privacy", "#cookies");
    if (`${pathname}${hash}` === target) {
      // Already there: navigating to the same URL would do nothing at all.
      const heading = document.getElementById("cookies-heading");
      heading?.scrollIntoView();
      heading?.focus({ preventScroll: true });
      return;
    }
    navigate(target);
  };

  return (
    <footer className="on-dark bg-navy px-5 pb-12 sm:px-8 lg:px-20">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 border-t border-navy-line py-12">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <a href={sectionHref("#home")} className="font-serif text-[24px] text-white">
            Green Villa
          </a>

          <nav aria-label={t.nav.footerNavLabel}>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={sectionHref(link.href)} className={linkClass}>
                    {t.nav[link.key]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-6 border-t border-navy-line pt-8 text-center lg:flex-row lg:items-start lg:justify-between lg:text-start">
          {/* Who runs the villa, and the registry number Greek law asks listings to show. */}
          <div className="flex flex-col gap-1.5 font-sans text-[13px] text-cream">
            <address className="flex flex-col gap-1.5 not-italic">
              <span>
                {t.legal.operatedBy} <bdi>{operator.name}</bdi>
              </span>
              <span className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 lg:justify-start">
                {hasEmail(operator.email) ? (
                  <a href={`mailto:${operator.email}`} dir="ltr" className={`${linkClass} underline underline-offset-2`}>
                    {operator.email}
                  </a>
                ) : (
                  <span dir="ltr">{operator.email}</span>
                )}
                {hasPhone(operator.phone) ? (
                  <a href={telHref(operator.phone)} dir="ltr" className={`${linkClass} underline underline-offset-2`}>
                    {operator.phone}
                  </a>
                ) : (
                  <span dir="ltr">{operator.phone}</span>
                )}
              </span>
            </address>
            <p>
              {t.legal.ama}: <span dir="ltr">{operator.ama}</span>
            </p>
          </div>

          <nav aria-label={t.legal.navLabel}>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-end">
              {legalPages.map((page) => (
                <li key={page}>
                  <Link to={legalPath(language, page)} className={linkClass}>
                    {t.legal[page]}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  id={COOKIE_SETTINGS_ID}
                  onClick={cookieSettings}
                  className={`${linkClass} cursor-pointer`}
                >
                  {t.legal.cookieSettings}
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 font-sans text-[12px] text-cream/60 sm:flex-row">
          <p>{t.footer.rights}</p>
          <p>{t.footer.designed}</p>
        </div>
      </div>
    </footer>
  );
}
