import type { Language } from "../i18n/types";
import { el } from "./el";
import { en } from "./en";
import { he } from "./he";
import { legalPages, type LegalDocuments, type LegalPage } from "./types";

export const legalDocuments: Record<Language, LegalDocuments> = { en, he, el };

export { legalPages };
export type { LegalBlock, LegalDocument, LegalPage, LegalSection } from "./types";

/** Legal pages carry their language in the path, so a link always opens the language it was shared in. */
export const legalPath = (language: Language, page: LegalPage, hash = "") =>
  `/${language}/${page}${hash}`;
