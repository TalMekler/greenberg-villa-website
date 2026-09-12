
import type { Dictionary } from "./i18n";

export interface NavLink {
  /** Looks the label up in `t.nav`, so it follows the active language. */
  key: keyof Dictionary["nav"];
  href: string;
}

export type { Inquiry, InquiryInput, InquiryStatus } from "./lib/inquiry";
