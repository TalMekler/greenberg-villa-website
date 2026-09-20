/*
  Who runs the villa, as the law needs it stated: in the footer, the privacy
  policy and the booking conditions. Every value here appears on the site, in
  all three languages, so each is filled in exactly once.

  Values in [[DOUBLE_BRACKETS]] are placeholders the owner still has to fill in.
*/
export const operator = {
  /** The legal name of whoever lets the villa — the data controller. */
  name: "Eti Greenberg",
  /** A postal address where notices and privacy requests can be sent. */
  address: "[[OWNER_ADDRESS]]",
  email: "Greenbergeti63@gmail.com",
  /** International format, e.g. "+972 50 123 4567". */
  phone: "[[PHONE]]",
  /** The villa's number in the Greek short-term rental registry (ΑΜΑ). */
  ama: "[[AMA_NUMBER]]",
  /**
   * GDPR Article 27 representative in the EU, if one is required. Replace the
   * placeholder with a name and address, or with a sentence saying none is
   * appointed — in each language's privacy policy, where it is quoted.
   */
  euRepresentative: "[[EU_REPRESENTATIVE]]",
  /** When the privacy policy and the booking conditions last changed. */
  lastUpdated: "[[LAST_UPDATED]]",
} as const;

/** A usable email address, so a placeholder is never turned into a mailto: link. */
export const hasEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** A usable phone number: digits, with the usual separators. */
export const hasPhone = (value: string) => /^\+?[\d\s().-]{6,}$/.test(value);

export const telHref = (phone: string) => `tel:+${phone.replace(/\D/g, "")}`;
