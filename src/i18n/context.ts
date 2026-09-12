import { createContext } from "react";
import type { Dictionary, Language, LanguageMeta } from "./types";

export interface LanguageContextValue {
  language: Language;
  meta: LanguageMeta;
  /** The active dictionary. Named `t` so call sites read as `t.hero.cta`. */
  t: Dictionary;
  setLanguage: (next: Language) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
