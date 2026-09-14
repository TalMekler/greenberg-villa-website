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
  /*
    A page can pin the language for as long as it is mounted. The admin does,
    because it is written in English only.

    It has to live here rather than in the page: React runs child effects before
    parent ones, so a page setting `lang` and `dir` itself has them overwritten
    a moment later by this provider's own effect — which is exactly how the
    admin came to render English text in a right-to-left layout.

    The pin is deliberately not written to storage. It is what this page needs,
    not what the visitor chose, and going back to the site restores their pick.
  */
  const [pinned, setPinned] = useState<Language | null>(null);
  const active = pinned ?? language;

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  }, []);

  const pinLanguage = useCallback((next: Language | null) => setPinned(next), []);

  // `lang` drives font selection and hyphenation; `dir` flips the whole layout.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = active;
    root.dir = languageMeta[active].dir;
  }, [active]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language: active,
      meta: languageMeta[active],
      t: dictionaries[active],
      setLanguage,
      pinLanguage,
    }),
    [active, setLanguage, pinLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
