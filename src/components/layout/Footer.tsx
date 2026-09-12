import { navLinks } from "../../data/site";
import { useLanguage } from "../../i18n";
import { Icon } from "../ui/Icon";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-navy px-5 pb-12 sm:px-8 lg:px-20">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 border-t border-navy-line py-12">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <a href="#home" className="font-serif text-[24px] text-white">
            Greenberg Villa
          </a>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="font-sans text-[13px] text-cream transition-colors hover:text-white"
                  >
                    {t.nav[link.key]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <ul className="flex items-center gap-4">
            <li>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t.footer.instagram}
                className="block transition-opacity hover:opacity-70"
              >
                <Icon name="instagram" size={20} />
              </a>
            </li>
            <li>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t.footer.facebook}
                className="block transition-opacity hover:opacity-70"
              >
                <Icon name="facebook" size={20} />
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 font-sans text-[12px] text-cream/60 sm:flex-row">
          <p>{t.footer.rights}</p>
          <p>{t.footer.designed}</p>
        </div>
      </div>
    </footer>
  );
}
