/*
  Compliance checks the accessibility audit does not make, run in a real Chrome
  against the production build (dist/, so run `npm run build` first):

   1. Nothing tracks before consent. Each language is loaded in a fresh
      profile with no choice stored; every request, cookie and storage key is
      recorded, then again after "Accept all". Real third parties are reached
      (Supabase for photos and live updates, OpenStreetMap for tiles), so the
      cookies they set are the real ones.

   2. Every footer link works, in every language, from the home page and from
      each legal page: section links reach a section that exists, legal links
      open that page in the same language, "Cookie settings" opens the dialog.

  /api is answered from fixtures, as in the accessibility audit, except that
  photo URLs point at the real Supabase bucket.

    npm run compliance
    CHROME_PATH=/path/to/chrome npm run compliance

  Exits non-zero on any failure; the full record goes to compliance-report.json.
*/
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import puppeteer, { type Browser, type HTTPRequest, type Page } from "puppeteer-core";
import { preview } from "vite";

const root = process.cwd();
const chromePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const languages = ["en", "he", "el"] as const;
const legalPages = ["privacy", "terms", "accessibility"] as const;
type Language = (typeof languages)[number];

const PORT = 5299;
const ORIGIN = `http://localhost:${PORT}`;
const SUPABASE = "https://gjkpipfreccynndtmjan.supabase.co";

/** Hosts the site is allowed to reach before consent; anything else is a finding. */
const necessaryHosts = new Set(["localhost", "gjkpipfreccynndtmjan.supabase.co", "tile.openstreetmap.org"]);
/** Storage keys and cookies that are strictly necessary (see src/lib/consent.ts). */
const necessaryStorage = new Set(["greenberg-villa:language", "greenberg-villa:cookie-consent"]);
const necessaryCookies = new Set(["__cf_bm"]);

// ---------------------------------------------------------------- fixtures --

const photo = (id: string) => ({
  id,
  url: `${SUPABASE}/storage/v1/object/public/site-images/${id}.jpg`,
  alt: `Photo ${id}`,
  uploadedAt: "2026-01-01T00:00:00.000Z",
});
const siteImages = {
  hero: photo("hero"),
  lifestyle: photo("lifestyle"),
  gallery: [1, 2, 3, 4, 5, 6].map((n) => photo(`gallery-${n}`)),
  explore: Object.fromEntries(
    [
      "gialtron-thermal-springs",
      "gialtra-village",
      "gialtra-hills",
      "gregolimano-bay",
      "loutra-edipsou",
      "drymona-waterfalls",
    ].map((slug) => [slug, photo(slug)]),
  ),
};

async function answer(request: HTTPRequest): Promise<void> {
  const url = new URL(request.url());
  if (url.origin !== ORIGIN || !url.pathname.startsWith("/api/")) return request.continue();
  const json = (body: unknown, status = 200) =>
    request.respond({ status, contentType: "application/json", body: JSON.stringify(body) });
  switch (url.pathname) {
    case "/api/site-images":
      return json(siteImages);
    case "/api/location":
      return json({ latitude: 38.8442, longitude: 22.97443, zoom: 13 });
    case "/api/availability":
      return json({ bookedDates: [] });
    case "/api/realtime-config":
      // The real answer when Supabase is configured; the key is a dummy, so the
      // socket is refused, but the browser still opens it — which is the point.
      return json({ url: SUPABASE, key: "sb_publishable_dummy" });
    case "/api/auth/session":
      return json({ authenticated: false, configured: true, user: null });
    default:
      return json({ error: "Not stubbed" }, 404);
  }
}

// ------------------------------------------------------------------ report --

interface Result {
  check: string;
  ok: boolean;
  detail: string;
}
const results: Result[] = [];
const record = (check: string, ok: boolean, detail = "") => results.push({ check, ok, detail });

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function freshPage(browser: Browser, language: Language) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on("request", (request) => void answer(request));
  await page.evaluateOnNewDocument((lang) => {
    try {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("greenberg-villa:language", lang);
        sessionStorage.setItem("seeded", "1");
      }
    } catch {}
  }, language);
  return { context, page };
}

/** Scroll the whole page so lazy images and the map load. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  });
  await settle(2500);
}

async function snapshot(page: Page) {
  const client = await page.createCDPSession();
  const { cookies } = await client.send("Storage.getCookies");
  const storage = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage).filter((key) => key !== "seeded"),
  }));
  return { cookies: cookies.map((c) => `${c.name}@${c.domain}`), storage };
}

// ---------------------------------------------------------- 1. consent -----

const trackerPattern =
  /google-analytics|googletagmanager|gtag|doubleclick|facebook\.net|connect\.facebook|hotjar|clarity\.ms|segment\.|mixpanel|plausible|matomo|tiktok|linkedin|analytics|pixel|fonts\.googleapis|fonts\.gstatic/i;

async function consentCheck(browser: Browser, language: Language, path: string) {
  const name = `consent/${language}${path}`;
  const { context, page } = await freshPage(browser, language);
  const before: string[] = [];
  const after: string[] = [];
  let accepted = false;
  page.on("request", (request) => {
    // Inline data: and blob: URLs never leave the browser.
    if (/^(data|blob):/.test(request.url())) return;
    (accepted ? after : before).push(`${request.resourceType()} ${request.url()}`);
  });
  page.on("pageerror", (error) => record(`${name}/page-error`, false, String(error).slice(0, 200)));

  await page.goto(`${ORIGIN}${path}`, { waitUntil: "networkidle0" });
  await scrollThrough(page);

  const hosts = [...new Set(before.map((line) => new URL(line.split(" ")[1]).hostname))];
  const foreign = hosts.filter((host) => !necessaryHosts.has(host));
  const trackers = before.filter((line) => trackerPattern.test(line));
  const foreignScripts = before.filter((line) => line.startsWith("script ") && !line.includes(ORIGIN));
  const state = await snapshot(page);
  const cookies = state.cookies.filter((cookie) => !necessaryCookies.has(cookie.split("@")[0]));
  const storage = [...state.storage.local, ...state.storage.session].filter((key) => !necessaryStorage.has(key));

  const bannerShown = await page.evaluate(() => Boolean(document.querySelector("section.fixed button")));
  record(`${name}/banner-shown`, bannerShown, "The consent banner is on screen with no choice stored");
  record(`${name}/hosts`, foreign.length === 0, `Hosts reached before consent: ${hosts.join(", ")}`);
  record(`${name}/no-trackers`, trackers.length === 0 && foreignScripts.length === 0,
    `Tracker-like or third-party script requests: ${[...trackers, ...foreignScripts].join(" | ") || "none"}`);
  record(`${name}/cookies`, cookies.length === 0, `Cookies before consent: ${state.cookies.join(", ") || "none"}`);
  record(`${name}/storage`, storage.length === 0,
    `Storage keys before consent: ${[...state.storage.local, ...state.storage.session].join(", ") || "none"}`);

  if (bannerShown) {
    accepted = true;
    // Banner buttons: Reject all, Accept all, Customize.
    await page.evaluate(() => (document.querySelectorAll("section.fixed button")[1] as HTMLElement).click());
    await settle(2500);
    const newHosts = [...new Set(after.map((line) => new URL(line.split(" ")[1]).hostname))].filter(
      (host) => !necessaryHosts.has(host),
    );
    record(`${name}/after-accept`, newHosts.length === 0,
      `New hosts after "Accept all" (none expected while no optional scripts exist): ${newHosts.join(", ") || "none"}`);
  }

  await context.close();
  return { name, requests: before, afterAccept: after, cookies: state.cookies, storage: state.storage };
}

// ------------------------------------------------------- 2. footer links ---

async function footerLinks(browser: Browser, language: Language, start: string) {
  const name = `footer/${language}${start}`;
  const { context, page } = await freshPage(browser, language);
  // Dismiss the banner so it does not cover the footer.
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("greenberg-villa:cookie-consent",
      JSON.stringify({ version: 1, analytics: false, marketing: false, decidedAt: Date.now() }));
  });
  const load = async () => {
    await page.goto(`${ORIGIN}${start}`, { waitUntil: "networkidle0" });
    await page.waitForSelector("footer");
    await page.waitForFunction(() => !document.getElementById("boot-loader"));
  };
  await load();

  const links = await page.$$eval("footer a, footer button", (elements) =>
    elements.map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent?.trim() || el.getAttribute("aria-label") || "").slice(0, 40),
      href: el.getAttribute("href") ?? "",
      target: el.getAttribute("target") ?? "",
    })),
  );
  record(`${name}/has-links`, links.length >= 10, `${links.length} footer links/buttons`);

  for (const [index, link] of links.entries()) {
    const label = `${name}/${link.text || link.href}`;

    if (link.tag === "button") {
      await page.evaluate((i) => (document.querySelectorAll("footer a, footer button")[i] as HTMLElement).click(), index);
      await settle(400);
      const open = await page.evaluate(() => Boolean(document.querySelector("dialog[open]")));
      record(label, open, "Cookie settings opens the preferences dialog");
      await page.keyboard.press("Escape");
      continue;
    }
    if (/^https?:/.test(link.href)) {
      const bare = /^https:\/\/(www\.)?(instagram|facebook)\.com\/?$/.test(link.href);
      record(label, !bare && link.target === "_blank",
        `External ${link.href} (target=${link.target})${bare ? " — a bare homepage, not the villa's profile" : ""}`);
      continue;
    }
    if (/^(mailto|tel):/.test(link.href)) {
      record(label, !/\[\[|example/.test(link.href), `Contact link ${link.href}`);
      continue;
    }

    // Internal: follow it the way a visitor would, then see where we are.
    await page.evaluate((i) => (document.querySelectorAll("footer a, footer button")[i] as HTMLElement).click(), index);
    await settle(900);
    const where = await page.evaluate(() => {
      const hash = location.hash.slice(1);
      return {
        path: location.pathname,
        hash,
        target: hash ? Boolean(document.getElementById(hash)) : true,
        lang: document.documentElement.lang,
        h1: document.querySelector("main h1")?.textContent?.trim() ?? "",
      };
    });
    const legal = legalPages.find((doc) => link.href === `/${language}/${doc}`);
    const ok = legal
      ? where.path === `/${language}/${legal}` && where.lang === language && where.h1.length > 0
      : where.target && where.lang === language;
    record(label, ok, `${link.href} → ${where.path}#${where.hash} (lang=${where.lang}, h1="${where.h1.slice(0, 40)}")`);
    await load();
  }
  await context.close();
}

// -------------------------------------------------------------------- run --

const server = await preview({ root, preview: { port: PORT, strictPort: true }, logLevel: "error" });
const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
const network: unknown[] = [];

try {
  for (const language of languages) {
    network.push(await consentCheck(browser, language, "/"));
    network.push(await consentCheck(browser, language, `/${language}/privacy`));
  }
  for (const language of languages) {
    for (const start of ["/", ...legalPages.map((doc) => `/${language}/${doc}`)]) {
      try {
        await footerLinks(browser, language, start);
      } catch (error) {
        record(`footer/${language}${start}/crashed`, false, String(error).slice(0, 300));
      }
    }
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
}

await writeFile(join(root, "compliance-report.json"), JSON.stringify({ results, network }, null, 2));
const failed = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? "✓" : "✗"} ${result.check} — ${result.detail}`);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
process.exit(failed.length ? 1 : 0);
