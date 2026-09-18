import { useEffect, useRef, useState } from "react";
import { navLinks } from "../../data/site";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import { useLanguage } from "../../i18n";
import { LanguagePicker } from "./LanguagePicker";
import { useActiveSection } from "../../hooks/useActiveSection";
import { useScrolled } from "../../hooks/useScrolled";

/** Stable across renders, so the scrollspy effect does not restart. */
const sectionIds = navLinks.map((link) => link.href.slice(1));

export function Navbar() {
  const { t } = useLanguage();
  const scrolled = useScrolled(80);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const activeId = useActiveSection(sectionIds, headerRef);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useLockBodyScroll(menuOpen);

  // Escape closes the open menu and hands focus back to the button that opened it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className={`on-dark fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[rgba(27,58,92,0.92)] shadow-[0_2px_24px_rgba(11,28,46,0.28)] backdrop-blur-[10px]"
          : "bg-[rgba(27,58,92,0.6)] backdrop-blur-[6px]"
      }`}
    >
      <nav
        aria-label={t.nav.mainNavLabel}
        className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-20 lg:py-6"
      >
        <a
          href="#home"
          className="font-serif text-[22px] text-white transition-opacity hover:opacity-80 lg:text-[28px]"
        >
          Green Villa
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => {
            const isActive = activeId === link.href.slice(1);
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  // "location": the section in view, on this one page — not a separate page.
                  aria-current={isActive ? "location" : undefined}
                  className={`relative py-1 font-sans text-[14px] font-semibold text-white transition-colors after:absolute after:-bottom-0.5 after:start-0 after:h-px after:bg-terracotta after:transition-all after:duration-300 hover:text-cream ${
                    isActive ? "after:w-full" : "after:w-0 hover:after:w-full"
                  }`}
                >
                  {t.nav[link.key]}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="hidden lg:block">
          <LanguagePicker />
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <LanguagePicker compact />

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
          className="flex size-10 shrink-0 flex-col items-center justify-center gap-[5px] lg:hidden"
        >
          <span
            className={`block h-px w-6 bg-white transition-transform duration-300 ${
              menuOpen ? "translate-y-[6px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-px w-6 bg-white transition-opacity duration-200 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-px w-6 bg-white transition-transform duration-300 ${
              menuOpen ? "-translate-y-[6px] -rotate-45" : ""
            }`}
          />
        </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        hidden={!menuOpen}
        // Body scroll is locked while the menu is open, so at 200% zoom or on a
        // short landscape phone the menu has to scroll itself to keep every
        // link reachable.
        className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-navy-line bg-[rgba(27,58,92,0.97)] backdrop-blur-[10px] lg:hidden"
      >
        <ul className="flex flex-col px-5 py-2 sm:px-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-white/10 py-4 font-sans text-[15px] font-semibold text-white last:border-b-0"
              >
                {t.nav[link.key]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
