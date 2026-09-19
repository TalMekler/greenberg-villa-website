/*
  Accessibility audit of the front end — axe-core plus the checks axe cannot
  make on its own (focus order and traps, reflow at 200% zoom, lang/dir,
  heading outline, reduced motion), run in a real Chrome against the Vite dev
  server in all three languages.

  The API is not needed: every /api request is answered here from fixtures
  shaped like the real responses, with the seed photos from
  src/assets/images standing in for the stored uploads. Map tiles are blocked,
  so the run is deterministic and offline.

    npm run a11y                      # uses the Chrome in /Applications
    CHROME_PATH=/path/to/chrome npm run a11y

  Exits non-zero if axe reports any violation or a check fails. Findings are
  written to a11y-report.json for inspection.
*/
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import puppeteer, { type HTTPRequest, type Page } from "puppeteer-core";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");

const root = process.cwd();
const chromePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const languages = ["en", "he", "el"] as const;
type Language = (typeof languages)[number];

// ---------------------------------------------------------------- fixtures --

const seedAlts = {
  hero: "Green Villa seen from the garden, with the bay behind it",
  lifestyle: "Sun-drenched bedroom opening onto the villa's sea-facing terrace",
  hosts: "Eti, the host of Green Villa, smiling",
  gallery: [
    "Infinity pool overlooking the Aegean at sunset",
    "Master bedroom with linen bedding and sea view",
    "Open-plan living room in Mediterranean minimalist style",
    "Stone terrace with lounge seating above the cliffs",
    "Poolside sun deck framed by olive trees",
    "Sunset over the bay seen from the villa",
    // An alt the admin wrote themselves: no translation exists, so the
    // Hebrew and Greek pages must mark it lang="en".
    "Evening drinks on the terrace, written by the admin",
  ],
  explore: {
    "gialtron-thermal-springs": ["explore-3", "Thermal water steaming off the rocks into the sea at Loutra Gialtron"],
    "gialtra-village": ["explore-6", "A taverna table laid under an old plane tree above the sea"],
    "gialtra-hills": ["explore-5", "A dirt track winding through the wooded hills behind the bay"],
    "gregolimano-bay": ["explore-1", "The sheltered turquoise bay at Gregolimano, enclosed by headlands"],
    "loutra-edipsou": ["explore-2", "The waterfront of Loutra Edipsou, lined with houses and fishing boats"],
    "drymona-waterfalls": ["explore-4", "The Drymona waterfalls dropping into a green forest pool"],
  },
} as const;

const image = (id: string, file: string, alt: string) => ({
  id,
  url: `/api/media/${file}.jpg`,
  alt,
  uploadedAt: "2026-01-01T00:00:00.000Z",
});

const siteImages = {
  hero: image("hero", "hero", seedAlts.hero),
  lifestyle: image("lifestyle", "lifestyle", seedAlts.lifestyle),
  hosts: image("hosts", "hosts", seedAlts.hosts),
  gallery: seedAlts.gallery.map((alt, index) => image(`g${index}`, `gallery-${index + 1}`, alt)),
  explore: Object.fromEntries(
    Object.entries(seedAlts.explore).map(([slug, [file, alt]]) => [slug, image(slug, file, alt)]),
  ),
};

const today = new Date();
const dateKey = (offset: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).toISOString().slice(0, 10);

const admin = {
  id: "u1",
  email: "eti@example.com",
  mustChangePassword: false,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const inquiries = [
  {
    id: "i1",
    firstName: "Dana",
    lastName: "Levi",
    email: "dana@example.com",
    checkIn: dateKey(10),
    checkOut: dateKey(14),
    guests: "4",
    message: "We would love a quiet week.",
    status: "pending",
    submittedAt: new Date().toISOString(),
  },
  {
    id: "i2",
    firstName: "Nikos",
    lastName: "Pappas",
    email: "nikos@example.com",
    checkIn: dateKey(3),
    checkOut: dateKey(6),
    guests: "2",
    message: "",
    status: "approved",
    submittedAt: new Date().toISOString(),
    price: { amount: 900, currency: "EUR", mode: "total" },
  },
];

let signedIn = false;

async function answer(request: HTTPRequest): Promise<void> {
  const url = new URL(request.url());

  if (url.hostname.endsWith("tile.openstreetmap.org")) return request.abort();
  if (url.origin !== "http://localhost:5199") {
    // Fonts are self-hosted, so nothing leaves the machine.
    return request.abort();
  }
  if (!url.pathname.startsWith("/api/")) return request.continue();

  const json = (body: unknown, status = 200) =>
    request.respond({ status, contentType: "application/json", body: JSON.stringify(body) });

  const path = url.pathname;
  if (path.startsWith("/api/media/")) {
    const file = path.slice("/api/media/".length);
    return request.respond({
      status: 200,
      contentType: "image/jpeg",
      body: await readFile(join(root, "src/assets/images", file)),
    });
  }
  if (path === "/api/site-images") return json(siteImages);
  if (path === "/api/location") return json({ latitude: 38.8442, longitude: 22.97443, zoom: 13 });
  if (path === "/api/availability") return json({ bookedDates: [dateKey(3), dateKey(4), dateKey(5)] });
  if (path === "/api/realtime-config") return json({}, 404);
  if (path === "/api/auth/session")
    return json({ authenticated: signedIn, configured: true, user: signedIn ? admin : null });
  if (path === "/api/inquiries" && request.method() === "GET") return json({ inquiries });
  if (path === "/api/inquiries" && request.method() === "POST")
    return json({ error: "Please check the highlighted fields.", errors: { email: "Invalid" } }, 400);
  if (path === "/api/users") return json({ users: [admin] });
  return json({ error: "Not stubbed" }, 404);
}

// ------------------------------------------------------------------ checks --

interface Finding {
  scenario: string;
  kind: "axe" | "check";
  id: string;
  impact?: string | null;
  help: string;
  nodes?: string[];
}

const findings: Finding[] = [];
const passes: string[] = [];

function check(scenario: string, id: string, ok: boolean, help: string, nodes?: string[]) {
  if (ok) passes.push(`${scenario} :: ${id}`);
  else findings.push({ scenario, kind: "check", id, help, nodes });
}

/** Set A11Y_SCREENSHOTS=<dir> to keep a picture of every state axe checked. */
const screenshotDir = process.env.A11Y_SCREENSHOTS;

async function runAxe(page: Page, scenario: string) {
  if (screenshotDir) {
    await page.screenshot({
      path: join(screenshotDir, `${scenario.replaceAll("/", "_")}.png`),
      // Whole page for the base states; the overlays are about the viewport.
      fullPage: !scenario.slice(scenario.indexOf("/") + 1).includes("/"),
    });
  }
  await page.evaluate(axeSource);
  const results = (await page.evaluate(() =>
    // @ts-expect-error — injected above
    window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
      },
      // Leaflet's own attribution control and tile panes are third-party markup.
      exclude: [[".leaflet-control-attribution"]],
    }),
  )) as {
    violations: {
      id: string;
      impact: string | null;
      help: string;
      nodes: { target: string[]; failureSummary: string }[];
    }[];
    passes: unknown[];
  };

  for (const violation of results.violations) {
    findings.push({
      scenario,
      kind: "axe",
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => `${node.target.join(" ")} — ${node.failureSummary}`),
    });
  }
  passes.push(`${scenario} :: axe (${results.passes.length} rules passed)`);
}

/** Waits for the loading cover to go, which is when the page is interactive. */
async function openSite(page: Page, language: Language, width = 1280, height = 800) {
  await page.setViewport({ width, height });
  await page.evaluateOnNewDocument((lang) => {
    localStorage.setItem("greenberg-villa:language", lang);
  }, language);
  await page.goto("http://localhost:5199/", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-busy]'), {
    timeout: 20_000,
  });
  // Run the scroll reveal to the end, so axe sees the page as a reader would.
  await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible")));
  await new Promise((resolve) => setTimeout(resolve, 900));
}

async function publicSite(page: Page, language: Language) {
  const scenario = `public/${language}`;
  await openSite(page, language);

  // lang and dir on <html>.
  const { lang, dir } = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
  }));
  check(scenario, "html-lang-dir", lang === language && dir === (language === "he" ? "rtl" : "ltr"),
    `<html lang="${lang}" dir="${dir}"> for ${language}`);

  // One h1, no skipped heading levels.
  const headings = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
      .filter((h) => (h as HTMLElement).offsetParent !== null || h.closest("[hidden]") === null)
      .map((h) => Number(h.tagName[1])),
  );
  const skips = headings.filter((level, i) => i > 0 && level > headings[i - 1] + 1);
  check(scenario, "single-h1", headings.filter((l) => l === 1).length === 1, "Exactly one h1", [String(headings)]);
  check(scenario, "heading-order", headings[0] === 1 && skips.length === 0, "Headings start at h1 and never skip a level", [headings.join(" ")]);

  // Every image has an alt attribute; content photos are in the page language.
  const images = await page.evaluate(() =>
    [...document.querySelectorAll("img")].map((img) => ({
      src: img.getAttribute("src") ?? "",
      alt: img.getAttribute("alt"),
      lang: img.getAttribute("lang") ?? img.closest("[lang]")?.getAttribute("lang") ?? "",
      hidden: img.getAttribute("aria-hidden") === "true",
    })),
  );
  check(scenario, "img-alt-present", images.every((img) => img.alt !== null), "Every <img> has an alt attribute",
    images.filter((img) => img.alt === null).map((img) => img.src));
  const photos = images.filter((img) => !img.hidden && img.src.includes("/api/media/"));
  const english = new Set<string>([...Object.values(seedAlts.explore).map(([, alt]) => alt), seedAlts.hero, seedAlts.lifestyle, seedAlts.hosts, ...seedAlts.gallery]);
  const untranslated = photos.filter(
    (img) => language !== "en" && img.alt && english.has(img.alt) && img.lang !== "en",
  );
  check(scenario, "img-alt-language", untranslated.length === 0,
    "Photo alts are in the page language, or marked lang=\"en\" when only English exists",
    untranslated.map((img) => img.alt ?? ""));
  if (language !== "en") {
    const custom = photos.find((img) => img.alt === seedAlts.gallery[6]);
    check(scenario, "img-alt-admin-fallback", custom?.lang === "en",
      "An admin-written English alt on a non-English page is marked lang=\"en\"");
  }

  await runAxe(page, scenario);

  // Skip link: first Tab stop, and it moves focus into <main>.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => ({
    href: document.activeElement?.getAttribute("href"),
    visible: (document.activeElement as HTMLElement).getBoundingClientRect().width > 1,
  }));
  check(scenario, "skip-link-first", first.href === "#main" && first.visible, "First Tab stop is a visible skip link");
  await page.keyboard.press("Enter");
  const inMain = await page.evaluate(() => document.activeElement?.id === "main");
  check(scenario, "skip-link-target", inMain, "Skip link moves focus to <main>");

  // Walk the whole tab order: every stop has a visible focus indicator.
  const noRing: string[] = [];
  const order: string[] = [];
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      const ring = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 1;
      const name =
        el.getAttribute("aria-label") || el.getAttribute("name") || el.getAttribute("type") || el.textContent || "";
      return {
        key: `${el.tagName.toLowerCase()}:${name.trim().slice(0, 30)}`,
        ring,
        // Enough to tell "no rule matched" from "rule matched but drew nothing".
        why: `${style.outlineStyle} ${style.outlineWidth} :focus-visible=${el.matches(":focus-visible")} :focus-within=${el.matches(":focus-within")}`,
        body: el === document.body,
      };
    });
    if (stop.body) break;
    if (order.includes(stop.key) && order.length > 5 && order[0] === stop.key) break;
    order.push(stop.key);
    if (!stop.ring) noRing.push(`${stop.key} (${stop.why})`);
  }
  check(scenario, "focus-visible", noRing.length === 0, "Every Tab stop shows a focus outline", noRing);
  check(scenario, "tab-order-reaches-footer", order.some((key) => ["Cookie settings", "הגדרות עוגיות", "Ρυθμίσεις cookies"].some((label) => key.includes(label))),
    "Tabbing reaches the footer without getting stuck", [order.length + " stops"]);

  // Gallery lightbox: focus in, trapped, Escape closes, focus returns.
  const opener = await page.$("#gallery button");
  if (opener) {
    await opener.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector('[role="dialog"]');
    const inDialog = () => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    check(scenario, "lightbox-focus-in", await inDialog(), "Opening the lightbox moves focus into it");
    let trapped = true;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      trapped &&= await inDialog();
    }
    for (let i = 0; i < 6; i++) {
      await page.keyboard.down("Shift");
      await page.keyboard.press("Tab");
      await page.keyboard.up("Shift");
      trapped &&= await inDialog();
    }
    check(scenario, "lightbox-focus-trap", trapped, "Tab and Shift+Tab stay inside the lightbox");
    const before = await page.$eval('[role="dialog"] figcaption span', (el) => el.textContent);
    await page.keyboard.press(language === "he" ? "ArrowLeft" : "ArrowRight");
    const after = await page.$eval('[role="dialog"] figcaption span', (el) => el.textContent);
    check(scenario, "lightbox-arrow-direction", before !== after, "The reading-direction arrow key moves to the next photo");
    await runAxe(page, `${scenario}/lightbox-open`);
    await page.keyboard.press("Escape");
    const closed = await page.$('[role="dialog"]');
    const returned = await page.evaluate((el) => document.activeElement === el, opener);
    check(scenario, "lightbox-escape", !closed && returned, "Escape closes the lightbox and returns focus to the photo");
  }

  // Contact form with every error showing.
  await page.$eval("#contact form button[type=submit]", (button) => (button as HTMLButtonElement).click());
  await new Promise((resolve) => setTimeout(resolve, 200));
  const form = await page.evaluate(() => {
    const invalid = [...document.querySelectorAll('#contact [aria-invalid="true"]')];
    return {
      invalid: invalid.length,
      described: invalid.every((field) => {
        const ids = field.getAttribute("aria-describedby")?.split(" ") ?? [];
        return ids.length > 0 && ids.every((id) => document.getElementById(id)?.textContent);
      }),
      focused: document.activeElement?.getAttribute("name"),
      alert: document.querySelector('#contact [role="alert"]')?.textContent ?? "",
    };
  });
  check(scenario, "form-errors-described", form.invalid === 5 && form.described,
    "Each invalid field is aria-invalid and aria-describedby its message", [JSON.stringify(form)]);
  check(scenario, "form-error-focus", form.focused === "firstName" && form.alert.length > 0,
    "Submitting with errors announces a summary and focuses the first invalid field", [JSON.stringify(form)]);
  await runAxe(page, `${scenario}/form-errors`);

  // Privacy consent: read before the button, and announced with it.
  const consent = await page.evaluate(() => {
    const button = document.querySelector("#contact form button[type=submit]")!;
    const notice = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    const link = notice?.querySelector("a");
    return {
      before: Boolean(notice && notice.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING),
      href: link?.getAttribute("href") ?? "",
      newTab: link?.target === "_blank" && Boolean(link.querySelector(".sr-only")?.textContent?.trim()),
    };
  });
  check(scenario, "form-privacy-consent",
    consent.before && consent.href === `/${language}/privacy` && consent.newTab,
    "The privacy notice precedes the submit button, describes it, and links to this language's policy (new tab announced)",
    [JSON.stringify(consent)]);

  // 200% zoom: a 1280px window at 200% lays out at 640 CSS px.
  for (const [width, height, label] of [
    [640, 400, "200%"],
    [320, 640, "400% / 320px"],
  ] as const) {
    await page.setViewport({ width, height });
    await new Promise((resolve) => setTimeout(resolve, 300));
    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1) && !el.closest(".sr-only, .leaflet-container");
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).slice(0, 60)}`);
      return { docWidth, innerWidth: window.innerWidth, wide };
    });
    check(scenario, `reflow-${label}`, overflow.docWidth <= overflow.innerWidth,
      `No horizontal scrolling at ${label}`, [JSON.stringify(overflow)]);
  }

  // Mobile menu at 200%: every link reachable, Escape closes it.
  await page.setViewport({ width: 640, height: 400 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('button[aria-controls="mobile-menu"]');
  const menu = await page.evaluate(() => {
    const el = document.getElementById("mobile-menu")!;
    const last = el.querySelector("li:last-child a") as HTMLElement;
    last.scrollIntoView();
    const rect = last.getBoundingClientRect();
    return { reachable: rect.bottom <= window.innerHeight && rect.top >= 0 };
  });
  check(scenario, "mobile-menu-reflow", menu.reachable, "The last mobile-menu link can be reached at 200% zoom");
  await runAxe(page, `${scenario}/mobile-menu-open`);
  await page.keyboard.press("Escape");
  const menuClosed = await page.evaluate(() => ({
    hidden: document.getElementById("mobile-menu")!.hidden,
    focus: document.activeElement?.getAttribute("aria-controls"),
  }));
  check(scenario, "mobile-menu-escape", menuClosed.hidden && menuClosed.focus === "mobile-menu",
    "Escape closes the mobile menu and returns focus to its button");
}

async function reducedMotion(page: Page) {
  const scenario = "public/en/reduced-motion";
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto("http://localhost:5199/", { waitUntil: "domcontentloaded" });
  const loader = await page.evaluate(() => {
    const bar = document.querySelector(".loader-sweep, #boot-loader-bar");
    return bar ? getComputedStyle(bar).animationName : "none";
  });
  check(scenario, "loader-still", loader === "none" || loader === "", "The loading bar does not animate", [loader]);
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-busy]'), { timeout: 20_000 });
  const reveal = await page.evaluate(() =>
    [...document.querySelectorAll(".reveal")].filter((el) => getComputedStyle(el).opacity !== "1").length,
  );
  check(scenario, "reveal-static", reveal === 0, "Scroll-reveal content is shown without animation", [String(reveal)]);
  const smooth = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  check(scenario, "no-smooth-scroll", smooth === "auto", "Anchor links jump rather than smooth-scroll");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
}

const legalPages = ["privacy", "terms", "accessibility"] as const;

/**
 * A legal page, opened with a *different* stored language, so the check that
 * the URL wins is a real one.
 */
async function legalPage(page: Page, language: Language, doc: (typeof legalPages)[number]) {
  const scenario = `legal/${language}/${doc}`;
  const stored = language === "en" ? "he" : "en";
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument((lang) => {
    localStorage.setItem("greenberg-villa:language", lang);
  }, stored);
  await page.goto(`http://localhost:5199/${language}/${doc}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("main h1");

  const state = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    title: document.title,
    headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1])),
  }));
  check(scenario, "html-lang-dir", state.lang === language && state.dir === (language === "he" ? "rtl" : "ltr"),
    `The URL's language wins over the stored one: <html lang="${state.lang}" dir="${state.dir}">`);
  const skips = state.headings.filter((level, i) => i > 0 && level > state.headings[i - 1] + 1);
  check(scenario, "single-h1", state.headings.filter((l) => l === 1).length === 1, "Exactly one h1", [String(state.headings)]);
  check(scenario, "heading-order", state.headings[0] === 1 && skips.length === 0,
    "Headings start at h1 and never skip a level", [state.headings.join(" ")]);
  check(scenario, "document-title", state.title.includes("Green Villa") && !state.title.startsWith("Green Villa —"),
    "The document title names the page", [state.title]);

  await runAxe(page, scenario);

  // Skip link, then every Tab stop shows a ring.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.getAttribute("href"));
  check(scenario, "skip-link-first", first === "#main", "First Tab stop is the skip link");
  await page.keyboard.press("Enter");
  await new Promise((resolve) => setTimeout(resolve, 100));
  check(scenario, "skip-link-target", await page.evaluate(() => document.activeElement?.id === "main"),
    "Skip link moves focus to <main>");

  const noRing: string[] = [];
  let reachedCookieButton = false;
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return {
        body: el === document.body,
        id: el.id,
        key: `${el.tagName.toLowerCase()}:${(el.textContent ?? "").trim().slice(0, 30)}`,
        ring: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 1,
      };
    });
    if (stop.body) break;
    if (!stop.ring) noRing.push(stop.key);
    if (stop.id === "cookie-settings") {
      reachedCookieButton = true;
      break;
    }
  }
  check(scenario, "focus-visible", noRing.length === 0, "Every Tab stop shows a focus outline", noRing);
  check(scenario, "tab-reaches-cookie-settings", reachedCookieButton,
    "Tabbing reaches the footer's Cookie settings button");

  // Reflow at 400% (320 CSS px).
  await page.setViewport({ width: 320, height: 640 });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(scenario, "reflow-320px", overflow <= 0, "No horizontal scrolling at 320px", [`${overflow}px over`]);
  await page.setViewport({ width: 1280, height: 800 });

  // Switching language goes to the same page in the other language, and keeps focus on the button.
  if (doc === "privacy") {
    const other = language === "el" ? "en" : "el";
    await page.focus(`header button[lang="${other}"]`);
    await page.keyboard.press("Enter");
    await page.waitForFunction((lang) => document.documentElement.lang === lang, {}, other);
    const after = await page.evaluate(() => ({
      path: location.pathname,
      focus: document.activeElement?.getAttribute("lang"),
      pressed: document.activeElement?.getAttribute("aria-pressed"),
    }));
    check(scenario, "language-switch", after.path === `/${other}/${doc}` && after.focus === other && after.pressed === "true",
      "The language picker opens the same page in the other language, with focus kept on the button", [JSON.stringify(after)]);
    await page.goto(`http://localhost:5199/${language}/${doc}`, { waitUntil: "networkidle0" });
  }

  // Cookie settings opens the preferences dialog, and Escape hands focus back to the button.
  if (doc === "terms") {
    await page.focus("#cookie-settings");
    await page.keyboard.press("Enter");
    await page.waitForSelector("dialog[open]");
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")));
    await page.keyboard.press("Escape");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const back = await page.evaluate(() => ({
      open: Boolean(document.querySelector("dialog[open]")),
      focus: document.activeElement?.id,
    }));
    check(scenario, "cookie-settings", inside && !back.open && back.focus === "cookie-settings",
      "Cookie settings opens the dialog with focus inside; Escape returns focus to the button",
      [JSON.stringify({ inside, ...back })]);
  }
}

/**
 * The cookie banner and dialog, from a first visit with nothing stored.
 * Tabs through the banner, checks Reject is as prominent as Accept, walks the
 * dialog's focus trap, and checks nothing is stored or set before a choice.
 */
async function cookieConsent(page: Page, language: Language) {
  const scenario = `consent/${language}`;
  const client = await page.createCDPSession();
  await client.send("Network.clearBrowserCookies");
  await openSite(page, language);
  await page.evaluate(() => localStorage.removeItem("greenberg-villa:cookie-consent"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-busy]'), { timeout: 20_000 });
  await new Promise((resolve) => setTimeout(resolve, 900));

  const banner = await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>("section[aria-label]:has(button)");
    const buttons = [...(section?.querySelectorAll("button") ?? [])];
    // Inline rather than a named helper: tsx wraps named functions in a
    // helper that does not exist inside the page.
    const looks = buttons.map((b) => {
      const s = getComputedStyle(b);
      return `${s.backgroundColor}|${s.color}|${s.fontSize}|${s.fontWeight}|${Math.round(b.getBoundingClientRect().height)}`;
    });
    return {
      found: Boolean(section),
      visible: section ? section.getBoundingClientRect().height > 0 : false,
      direction: section ? getComputedStyle(section).direction : "",
      labels: buttons.map((b) => b.textContent?.trim() ?? ""),
      sameLook: looks.length >= 2 && looks[0] === looks[1],
      cookies: document.cookie,
      stored: localStorage.getItem("greenberg-villa:cookie-consent"),
      foreignScripts: [...document.scripts].filter((s) => s.src && new URL(s.src).origin !== location.origin).map((s) => s.src),
    };
  });
  check(scenario, "banner-shown", banner.found && banner.visible && banner.labels.length === 3,
    "A first visit shows the banner with three buttons", [JSON.stringify(banner.labels)]);
  check(scenario, "banner-equal-choice", banner.sameLook,
    "Reject and Accept look the same: colour, size and weight");
  check(scenario, "banner-direction", banner.direction === (language === "he" ? "rtl" : "ltr"),
    `The banner reads ${language === "he" ? "right-to-left" : "left-to-right"}`, [banner.direction]);
  check(scenario, "nothing-before-consent", banner.cookies === "" && banner.stored === null && banner.foreignScripts.length === 0,
    "No cookies, no stored choice and no third-party scripts before a choice", [JSON.stringify(banner)]);

  await runAxe(page, scenario);

  // Keyboard: skip link, then the banner's policy link and its three buttons.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const stops: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el.getAttribute("href") ?? el.textContent?.trim() ?? "";
    }));
  }
  check(scenario, "banner-tab-order", stops[0] === "#main" && stops.slice(2).join("|") === banner.labels.join("|"),
    "Tab order: skip link, the banner's policy link, then Reject, Accept, Customize", [stops.join(" → ")]);

  // Customize (focused now) opens the dialog; Tab stays inside; Escape returns to Customize.
  await page.keyboard.press("Enter");
  await page.waitForSelector("dialog[open]");
  const trapped: boolean[] = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    trapped.push(await page.evaluate(() => Boolean(document.activeElement?.closest("dialog[open]")) || document.activeElement === document.body));
  }
  check(scenario, "dialog-focus-trap", trapped.every(Boolean), "Tab never leaves the open dialog");
  await runAxe(page, `${scenario}/dialog`);
  await page.keyboard.press("Escape");
  await new Promise((resolve) => setTimeout(resolve, 100));
  const afterEscape = await page.evaluate(() => ({
    open: Boolean(document.querySelector("dialog[open]")),
    focus: document.activeElement?.textContent?.trim(),
    stored: localStorage.getItem("greenberg-villa:cookie-consent"),
  }));
  check(scenario, "dialog-escape", !afterEscape.open && afterEscape.focus === banner.labels[2] && afterEscape.stored === null,
    "Escape closes the dialog without choosing, and focus returns to Customize", [JSON.stringify(afterEscape)]);

  // Reject: stored as a refusal, banner gone, focus in <main>, the change announced.
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  await page.keyboard.press("Enter");
  await new Promise((resolve) => setTimeout(resolve, 200));
  const rejected = await page.evaluate(() => ({
    record: JSON.parse(localStorage.getItem("greenberg-villa:cookie-consent") ?? "null"),
    banner: Boolean(document.querySelector("section[aria-label]:has(button)")),
    focus: document.activeElement?.id,
    announced: [...document.querySelectorAll('[role="status"]')].some((el) => (el.textContent ?? "").trim() !== ""),
    cookies: document.cookie,
  }));
  check(scenario, "reject",
    rejected.record?.analytics === false && rejected.record?.marketing === false && !rejected.banner &&
      rejected.focus === "main" && rejected.announced && rejected.cookies === "",
    "Reject stores a refusal, hides the banner, moves focus to <main> and announces it", [JSON.stringify(rejected)]);

  await page.reload({ waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 500));
  check(scenario, "choice-remembered",
    await page.evaluate(() => !document.querySelector("section[aria-label]:has(button)")),
    "The banner stays away after a reload");

  // An expired choice (over 6 months old) asks again.
  await page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem("greenberg-villa:cookie-consent")!);
    record.decidedAt = Date.now() - 200 * 24 * 60 * 60 * 1000;
    localStorage.setItem("greenberg-villa:cookie-consent", JSON.stringify(record));
  });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-busy]'), { timeout: 20_000 });
  check(scenario, "choice-expires",
    await page.evaluate(() => Boolean(document.querySelector("section[aria-label]:has(button)"))),
    "A choice older than 6 months is asked for again");
  await page.evaluate(() => localStorage.removeItem("greenberg-villa:cookie-consent"));
}

async function adminPages(page: Page) {
  await page.setViewport({ width: 1280, height: 800 });

  signedIn = false;
  await page.goto("http://localhost:5199/admin", { waitUntil: "networkidle0" });
  await page.waitForSelector("form");
  const login = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    h1: document.querySelectorAll("h1").length,
  }));
  check("admin/login", "structure", login.lang === "en" && login.dir === "ltr" && login.h1 === 1,
    "Admin login is English/LTR with one h1", [JSON.stringify(login)]);
  await runAxe(page, "admin/login");

  signedIn = true;
  await page.goto("http://localhost:5199/admin", { waitUntil: "networkidle0" });
  await page.waitForSelector("main table, main section");
  await new Promise((resolve) => setTimeout(resolve, 500));
  const headings = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1])),
  );
  const skips = headings.filter((level, i) => i > 0 && level > headings[i - 1] + 1);
  check("admin/dashboard", "headings", headings.filter((l) => l === 1).length === 1 && skips.length === 0,
    "Dashboard has one h1 and no skipped levels", [headings.join(" ")]);
  await runAxe(page, "admin/dashboard");
  signedIn = false;
}

// -------------------------------------------------------------------- main --

const server = await createServer({
  root,
  logLevel: "error",
  server: { port: 5199, strictPort: true },
});
await server.listen();

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", (request) => void answer(request));

  // Vite optimises dependencies on the first load and then reloads the page,
  // which would pull the rug out from under the first checks. Take that
  // reload here.
  await page.goto("http://localhost:5199/", { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // A scenario that throws (a control that is not there, a dialog that never
  // opens) is itself a finding; the rest still run.
  const scenarios: [string, () => Promise<void>][] = [
    ...languages.map((language): [string, () => Promise<void>] => [
      `public/${language}`,
      () => publicSite(page, language),
    ]),
    ...languages.flatMap((language) =>
      legalPages.map((doc): [string, () => Promise<void>] => [
        `legal/${language}/${doc}`,
        () => legalPage(page, language, doc),
      ]),
    ),
    ...languages.map((language): [string, () => Promise<void>] => [
      `consent/${language}`,
      () => cookieConsent(page, language),
    ]),
    ["public/en/reduced-motion", () => reducedMotion(page)],
    ["admin", () => adminPages(page)],
  ];
  for (const [scenario, run] of scenarios) {
    try {
      await run();
    } catch (error) {
      findings.push({ scenario, kind: "check", id: "scenario-crashed", help: String(error).slice(0, 300) });
    }
  }
} finally {
  await browser.close();
  await server.close();
}

await writeFile(join(root, "a11y-report.json"), JSON.stringify({ findings, passes }, null, 2));

for (const finding of findings) {
  console.log(`✗ [${finding.scenario}] ${finding.kind}:${finding.id}${finding.impact ? ` (${finding.impact})` : ""} — ${finding.help}`);
  for (const node of finding.nodes ?? []) console.log(`    ${node.slice(0, 300)}`);
}
console.log(`\n${passes.length} checks passed, ${findings.length} failed.`);
process.exit(findings.length ? 1 : 0);
