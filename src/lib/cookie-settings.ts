/**
 * The "Cookie settings" control in the footer.
 *
 * PLACEHOLDER: the consent dialog is not built yet. When it is, open it from
 * `openCookieSettings` and return true. Until then it returns false, and the
 * footer takes the visitor to the cookies section of the privacy policy
 * instead — so the button always does something a visitor can see, rather
 * than being a control that silently does nothing.
 */
export const COOKIE_SETTINGS_ID = "cookie-settings";

export function openCookieSettings(): boolean {
  return false;
}
