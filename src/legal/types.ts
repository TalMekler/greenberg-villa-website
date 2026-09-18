/**
 * A legal page as data, so the three languages share one renderer and can
 * never drift apart in structure.
 *
 * A block is one of:
 *  - a string: a paragraph;
 *  - `{ heading }`: a sub-heading (h3) inside the section;
 *  - `{ list }`: a bulleted list;
 *  - `{ terms }`: label/detail pairs, rendered as a description list;
 *  - `{ contact: true }`: the operator's contact details, with live links;
 *  - `{ coordinator: true }`: the accessibility coordinator's details, likewise;
 *  - `{ see }`: a link to another legal page, named by its own title;
 *  - `{ table }`: a data table, with a caption and a header row;
 *  - `{ cookieSettings: true }`: a button that opens the cookie settings dialog.
 */
export type LegalBlock =
  | string
  | { heading: string }
  | { list: string[] }
  | { terms: [term: string, detail: string][] }
  | { contact: true }
  | { coordinator: true }
  | { see: LegalPage }
  | { table: { caption: string; head: string[]; rows: string[][] } }
  | { cookieSettings: true };

export interface LegalSection {
  /** The same in every language, so a link to #cookies works in all three. */
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  /** Shown under the title, and used as the page's meta description. */
  summary: string;
  sections: LegalSection[];
}

export const legalPages = ["privacy", "terms", "accessibility"] as const;
export type LegalPage = (typeof legalPages)[number];

export type LegalDocuments = Record<LegalPage, LegalDocument>;
