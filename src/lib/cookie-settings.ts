/**
 * The "Cookie settings" control in the footer.
 *
 * It opens the cookie preferences dialog, which registers itself here while it
 * is mounted (on the public site and the legal pages). Where it is not — the
 * footer rendered somewhere without it — `openCookieSettings` returns false,
 * and the footer takes the visitor to the cookies section of the privacy
 * policy instead, so the button always does something a visitor can see.
 */
export const COOKIE_SETTINGS_ID = "cookie-settings";

let opener: (() => void) | null = null;

export function registerCookieSettings(open: () => void): () => void {
  opener = open;
  return () => {
    if (opener === open) opener = null;
  };
}

export function openCookieSettings(): boolean {
  if (!opener) return false;
  opener();
  return true;
}
