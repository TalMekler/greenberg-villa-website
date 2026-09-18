// Shared shape for every translation. Adding a key here makes TypeScript
// demand it in all three dictionaries, so a language can never silently
// fall back to English mid-sentence.

export const languages = ["en", "he", "el"] as const;
export type Language = (typeof languages)[number];

export interface LanguageMeta {
  /** Shown in the picker, in the language itself. */
  name: string;
  /** First two letters of the name above, for the picker's compact form. */
  short: string;
  dir: "ltr" | "rtl";
  /** BCP 47 tag used for dates, numbers and currency. */
  locale: string;
}

export const languageMeta: Record<Language, LanguageMeta> = {
  en: { name: "English", short: "En", dir: "ltr", locale: "en-GB" },
  he: { name: "עברית", short: "עב", dir: "rtl", locale: "he-IL" },
  el: { name: "Ελληνικά", short: "Ελ", dir: "ltr", locale: "el-GR" },
};

export interface Dictionary {
  nav: {
    home: string;
    gallery: string;
    location: string;
    explore: string;
    availability: string;
    contact: string;
    language: string;
    openMenu: string;
    closeMenu: string;
    skipToContent: string;
    mainNavLabel: string;
    footerNavLabel: string;
  };
  loader: {
    /** Announced to screen readers and shown under the mark. */
    message: string;
    /** Used as the aria-label on the busy region. */
    label: string;
  };
  hero: { subtitle: string; cta: string };
  about: {
    eyebrow: string;
    title: string;
    /** Body copy, printed beside the photo. */
    intro: string[];
    cta: string;
    stats: { title: string; detail: string }[];
  };
  gallery: { eyebrow: string; title: string; description: string; open: string; close: string; previous: string; next: string; dialogLabel: string };
  location: {
    eyebrow: string;
    title: string;
    description: string;
    mapLabel: string;
    openInMaps: string;
    mapAria: string;
    zoomIn: string;
    zoomOut: string;
    highlights: { title: string; distance: string; description: string }[];
  };
  explore: {
    eyebrow: string;
    title: string;
    description: string;
    cards: { title: string; distance: string; description: string }[];
  };
  availability: {
    eyebrow: string;
    title: string;
    description: string;
    available: string;
    booked: string;
    requestBooking: string;
    selectCheckIn: string;
    selectCheckOut: string;
    loading: string;
    previousMonth: string;
    nextMonth: string;
    dayBooked: string;
    dayAvailable: string;
    dayPast: string;
  };
  transit: {
    eyebrow: string;
    title: string;
    description: string;
    steps: { kicker: string; title: string; description: string }[];
  };
  contact: {
    eyebrow: string;
    title: string;
    description: string;
    firstName: string;
    lastName: string;
    email: string;
    checkIn: string;
    checkOut: string;
    guests: string;
    message: string;
    send: string;
    sending: string;
    requiredNote: string;
    placeholders: { firstName: string; lastName: string; email: string; message: string };
    errors: {
      firstName: string;
      lastName: string;
      emailRequired: string;
      emailInvalid: string;
      checkIn: string;
      checkOut: string;
      checkOutOrder: string;
      fieldsHighlighted: string;
      generic: string;
    };
    sent: { title: string; body: string; dates: string; guests: string; replyTo: string; another: string };
    hosts: { label: string; names: string; photoAlt: string; quote: string };
    channels: { whatsapp: string; phone: string; email: string };
  };
  footer: { rights: string; designed: string; instagram: string; facebook: string };
  units: { night: string; nights: string; guest: string; guests: string };
}
