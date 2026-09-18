import { useSyncExternalStore } from "react";

/**
 * The visitor's cookie choice, and the only door through which anything that
 * needs consent may enter the page.
 *
 * What the site uses today (see the cookies table in the privacy policy):
 *
 *  - strictly necessary: the language choice and this consent record (local
 *    storage), the hosts' sign-in cookie (admin only), and Cloudflare's
 *    `__cf_bm` bot-protection cookie on supabase.co, set when the browser
 *    loads photos or live updates from our database provider;
 *  - no cookies at all: the OpenStreetMap tiles and the self-hosted fonts;
 *  - analytics: nothing;
 *  - marketing: nothing.
 *
 * So `optionalScripts` below is empty. Anything analytical or promotional
 * added later goes in there — never in index.html or a component — so that it
 * cannot load, or set a cookie, before the visitor has said yes. It also needs
 * its host added to the Content-Security-Policy in vercel.json, and a row in
 * the privacy policy's cookie table in all three languages.
 */

export type ConsentCategory = "analytics" | "marketing";
export const consentCategories: readonly ConsentCategory[] = ["analytics", "marketing"];

export interface Consent {
  analytics: boolean;
  marketing: boolean;
  /** When the choice was made, in ms since the epoch. */
  decidedAt: number;
}

export type ConsentChoice = Omit<Consent, "decidedAt">;

const STORAGE_KEY = "greenberg-villa:cookie-consent";

/**
 * Bump when the categories or what is in them change in a way the visitor
 * should be asked about again. Records made under another version are ignored.
 */
const VERSION = 1;

/** A choice is kept for six months, then the banner asks again. */
export const CONSENT_MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000;

interface OptionalScript {
  category: ConsentCategory;
  /** The script's URL. It must be allowed by the CSP in vercel.json. */
  src: string;
  /** First-party cookies it sets, removed again when consent is withdrawn. */
  cookies: string[];
}

/*
  Example, for when there is one:
    { category: "analytics", src: "https://analytics.example.com/script.js", cookies: ["_example_id"] }
*/
const optionalScripts: OptionalScript[] = [];

/** Whether anything in `category` exists yet, so the dialog can say when nothing does. */
export const categoryInUse = (category: ConsentCategory) =>
  optionalScripts.some((script) => script.category === category);

function read(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<Consent> & { version?: number };
    if (
      stored.version !== VERSION ||
      typeof stored.decidedAt !== "number" ||
      typeof stored.analytics !== "boolean" ||
      typeof stored.marketing !== "boolean"
    ) {
      return null;
    }
    // Expired, or dated in the future by a wrong clock: ask again either way.
    const age = Date.now() - stored.decidedAt;
    if (age < 0 || age > CONSENT_MAX_AGE_MS) return null;
    return { analytics: stored.analytics, marketing: stored.marketing, decidedAt: stored.decidedAt };
  } catch {
    // Storage blocked (private browsing) or the value is not ours to parse.
    return null;
  }
}

let current: Consent | null = read();
const listeners = new Set<() => void>();
const loaded = new Set<string>();

function removeCookie(name: string): void {
  const expired = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  document.cookie = expired;
  // Analytics tools often set theirs on the bare domain so subdomains share them.
  const domain = location.hostname.replace(/^www\./, "");
  document.cookie = `${expired}; domain=.${domain}`;
}

/** Loads what the current choice allows, and nothing else. */
function apply(previous: Consent | null): void {
  for (const script of optionalScripts) {
    const granted = current?.[script.category] === true;

    if (granted && !loaded.has(script.src)) {
      loaded.add(script.src);
      const element = document.createElement("script");
      element.src = script.src;
      element.async = true;
      document.head.appendChild(element);
    }

    if (!granted && previous?.[script.category]) {
      script.cookies.forEach(removeCookie);
    }
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Records a choice, and loads or unloads what depends on it. */
export function saveConsent(choice: ConsentChoice): void {
  const previous = current;
  current = { analytics: choice.analytics, marketing: choice.marketing, decidedAt: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...current }));
  } catch {
    // Not stored: the choice holds for this visit, and the banner asks next time.
  }

  // A script that already ran cannot be unloaded. Its cookies are removed
  // above; a reload makes sure it stops, too.
  const withdrawn = consentCategories.some(
    (category) => previous?.[category] && !current?.[category] && categoryInUse(category),
  );
  apply(previous);
  emit();
  if (withdrawn) location.reload();
}

export function getConsent(): Consent | null {
  return current;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The stored choice, or null while the visitor has not made one. */
export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, getConsent, () => null);
}

// A choice made in another tab applies here too.
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  const previous = current;
  current = read();
  apply(previous);
  emit();
});

apply(null);
