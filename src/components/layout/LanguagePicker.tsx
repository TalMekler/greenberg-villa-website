import { languageMeta, languages, useLanguage } from "../../i18n";
import type { Language } from "../../i18n";

/** Three-way language switch, styled for the translucent navbar. */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={`flex items-center gap-1 rounded-full border border-white/25 p-0.5 ${
        compact ? "" : "ms-2"
      }`}
    >
      {languages.map((option: Language) => {
        const isActive = option === language;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            dir={languageMeta[option].dir}
            onClick={() => setLanguage(option)}
            aria-pressed={isActive}
            title={languageMeta[option].name}
            className={`rounded-full px-2.5 py-1 font-sans text-[11px] font-bold tracking-[0.06em] transition-colors ${
              isActive ? "bg-white text-navy" : "text-white/80 hover:bg-white/15 hover:text-white"
            }`}
          >
            {languageMeta[option].short}
          </button>
        );
      })}
    </div>
  );
}
