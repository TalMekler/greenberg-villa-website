import { useContext } from "react";
import { LanguageContext, type LanguageContextValue } from "./context";

/** Reads the active language and dictionary. Must sit under a LanguageProvider. */
export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside a LanguageProvider");
  return value;
}
