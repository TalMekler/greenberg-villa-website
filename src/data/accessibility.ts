/*
  The accessibility statement's contact and date, filled in once for all three
  languages. Values in [[DOUBLE_BRACKETS]] are placeholders the owner still has
  to fill in.
*/
export const accessibilityCoordinator = {
  name: "[[A11Y_CONTACT_NAME]]",
  email: "Greenbergeti63@gmail.com",
  /** International format, e.g. "+972 50 123 4567". */
  phone: "[[A11Y_PHONE]]",
} as const;

/**
 * When the accessibility statement was last reviewed against the site
 * (docs/accessibility-audit.md). Change it whenever the statement changes.
 */
export const accessibilityUpdated = new Date(2026, 8, 18);
