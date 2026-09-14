import { createContext } from "react";
import type { Dictionary, Language, LanguageMeta } from "./types";

export interface LanguageContextValue {
  language: Language;
  meta: LanguageMeta;
  /** The active dictionary. Named `t` so call sites read as `t.hero.cta`. */
  t: Dictionary;
  setLanguage: (next: Language) => void;
  /**
   * Overrides the visitor's choice for as long as a page needs it, without
   * touching what they picked. Pass null to hand control back.
   */
  pinLanguage: (language: Language | null) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
