import { languageMeta, languages, useLanguage } from "../../i18n";
import type { Language } from "../../i18n";

interface LanguagePickerProps {
  compact?: boolean;
  /**
   * What choosing a language does. By default it switches in place; a page
   * whose URL names the language (the legal pages) navigates instead.
   */
  onSelect?: (language: Language) => void;
}

/** Three-way language switch, styled for the translucent navbar. */
export function LanguagePicker({ compact = false, onSelect }: LanguagePickerProps) {
  const { language, setLanguage, t } = useLanguage();
  const select = onSelect ?? setLanguage;

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
            onClick={() => select(option)}
            aria-pressed={isActive}
            // The visible "En / עב / Ελ" abbreviations are meaningless read aloud.
            aria-label={languageMeta[option].name}
            title={languageMeta[option].name}
            className={`rounded-full px-2.5 py-1 font-sans text-[11px] font-bold tracking-[0.06em] transition-colors ${
              isActive ? "bg-white text-navy" : "text-white hover:bg-white/15"
            }`}
          >
            {languageMeta[option].short}
          </button>
        );
      })}
    </div>
  );
}
