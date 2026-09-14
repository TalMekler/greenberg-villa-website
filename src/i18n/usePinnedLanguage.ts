import { useEffect } from "react";
import { useLanguage } from "./useLanguage";
import type { Language } from "./types";

/**
 * Holds the whole document in one language while the calling page is mounted,
 * and releases it on the way out. The visitor's own choice is left alone.
 */
export function usePinnedLanguage(language: Language): void {
  const { pinLanguage } = useLanguage();

  useEffect(() => {
    pinLanguage(language);
    return () => pinLanguage(null);
  }, [language, pinLanguage]);
}
