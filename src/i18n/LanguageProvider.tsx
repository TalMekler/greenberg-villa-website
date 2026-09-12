import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LanguageContext, type LanguageContextValue } from "./context";
import { dictionaries } from "./dictionaries";
import { languageMeta, languages, type Language } from "./types";

const STORAGE_KEY = "greenberg-villa:language";

/** English unless the visitor has chosen otherwise before. */
function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && languages.includes(stored as Language)) return stored as Language;
  } catch {
    // Private browsing or blocked storage — fall through to the default.
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  }, []);

  // `lang` drives font selection and hyphenation; `dir` flips the whole layout.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = languageMeta[language].dir;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      meta: languageMeta[language],
      t: dictionaries[language],
      setLanguage,
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
