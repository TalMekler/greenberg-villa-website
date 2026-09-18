# Accessibility audit — WCAG 2.0 AA / Israeli Standard 5568

- **Date:** 2026-09-18
- **Scope:** the React front end only — public site (`/`, in English, Hebrew and Greek) and admin (`/admin`, English only). Server code (`server/`, `api/`) was not changed.
- **Standard:** WCAG 2.0 level AA, which IS 5568 adopts. Where the brief asked for more than 2.0 requires (3:1 for UI components and focus indicators, reflow at 320px), the WCAG 2.1 criterion was applied too and is labelled as such.
- **Result:** the automated audit went from **47 failures / 48 passes** on the code before this work to **0 failures / 78 passes** after it. Some things cannot be checked by a tool; those were checked by hand and are listed below with the method used.

## How to re-run

```sh
npm run a11y                                   # needs Google Chrome in /Applications
CHROME_PATH=/path/to/chrome npm run a11y       # any other Chrome/Chromium
A11Y_SCREENSHOTS=/some/dir npm run a11y        # also saves a PNG of every state checked
```

`scripts/a11y-audit.ts` starts the Vite dev server, opens it in headless Chrome through `puppeteer-core`, and answers every `/api/*` request with fixtures (the seed photos in `src/assets/images` stand in for the uploads). No API server, database or network is needed; map tiles are blocked. It exits non-zero on any failure and writes the details to `a11y-report.json` (git-ignored).

For each language (`en`, `he`, `el`) it runs:

| Check | How |
|---|---|
| axe-core 4.13, tags `wcag2a wcag2aa wcag21a wcag21aa best-practice` | on the page, with the lightbox open, with every contact-form error showing, and with the mobile menu open at 200% zoom |
| `<html lang>` and `dir` | `he` → `rtl`, others `ltr` |
| One `h1`, no skipped heading levels | walks every heading in order |
| Every `<img>` has `alt`; photo alts are in the page language, or marked `lang="en"` | compares against the known English seed text |
| Skip link | first Tab stop, visible, and moves focus into `<main>` |
| Visible focus on every Tab stop | Tabs through the whole page, checks the computed outline of each stop |
| Lightbox | focus moves in; Tab and Shift+Tab stay inside; the reading-direction arrow key moves on (ArrowLeft in Hebrew); Esc closes and returns focus to the photo |
| Contact form errors | every invalid field has `aria-invalid` and an `aria-describedby` that resolves to text; focus goes to the first invalid field; a summary is announced |
| Reflow | no horizontal scroll at 640px wide (a 1280px window at 200%) and at 320px (400%) |
| Mobile menu | its last link is reachable at 200% zoom; Esc closes it and returns focus to the button |

For each legal page (`/:lang/privacy`, `/:lang/terms`, `/:lang/accessibility`) in each language, opened with a *different* stored language: axe; `lang`/`dir` taken from the URL; one `h1` and no skipped levels; the document title names the page; skip link to `<main>`; a visible ring on every Tab stop through to the footer's Cookie settings button; no horizontal scroll at 320px. On the privacy page, the language picker must open the same page in the other language with focus kept on the pressed button; on the terms page, Cookie settings must land on the privacy policy's cookies section with focus on its heading.

Plus, once: `prefers-reduced-motion: reduce` (loader bar still, scroll-reveal content shown, no smooth scrolling), and the admin login and dashboard (landmarks, one `h1`, axe).

## Findings and what was done

Each finding names the WCAG criterion, what was wrong, and the fix. Everything in this section is **fixed** unless it says otherwise.

### 1.1.1 Non-text content — alt text

| Finding | Fix |
|---|---|
| Photo alt text (hero, lifestyle, gallery, explore) comes from the API as one English string per image, so Hebrew and Greek visitors heard English, pronounced with a Hebrew or Greek voice. | `src/i18n/imageAlts.ts`: Hebrew and Greek translations of every seeded alt, keyed by the English text. `localizeAlt()` returns the translation, or — for an alt the admin wrote, which has no translation — the English text with `lang="en"` so the screen reader switches voice. Used by Hero, About, Gallery, Lightbox and Explore. |
| An empty alt from the API would have turned a content photo into a decorative one, and left a gallery button with no name. | `localizeAlt()` takes a fallback: the Explore card title, "Gallery N / M", or "Green Villa" for the hero. |
| The hosts' portrait had a hard-coded English alt. | Translated (`t.contact.hosts.photoAlt`). |
| The gallery button's name was an `aria-label` built from the alt, which cannot carry `lang`. | The button is now named by its contents: a translated sr-only "Open image:" plus the `<img>` with its `alt` and `lang`. |
| Map: container label and marker alt hard-coded in English; Leaflet's zoom buttons read "Zoom in / Zoom out" in every language. | `VillaMap` takes `ariaLabel`, `zoomInTitle`, `zoomOutTitle`; the public map passes translations, and a language switch renames the zoom buttons in place. |
| **Most seeded photo descriptions describe a different photo** (checked by looking at each image): the "Master bedroom" is the living room, the "Stone terrace above the cliffs" is a bedroom, the "Al fresco dining terrace" is the beach jetty, the "Sunset over the bay" is the covered barbecue area, and so on — 7 of the 9 villa photos. The hero and the six Explore photos are accurate. | **Needs the admin — see "Action required" below.** The seed text is in `server/media.ts` and the live text is in the database, both out of scope. Corrected descriptions are written, and their Hebrew and Greek translations are already registered in `imageAlts.ts`, so they translate the moment they are entered. |
| Icons (`Icon`), the hero scrims, the loader bar, the success tick and the transit step numbers are decorative. | Already `alt=""`/`aria-hidden`; transit step numbers ("01") now `aria-hidden` too, since the `<ol>` already numbers the steps. |

### 1.3.1 Info and relationships · 2.4.6 Headings and labels

| Finding | Fix |
|---|---|
| Admin login, forced-password page and session check had no `<main>` and no `h1`; the dashboard had no `h1` (axe: `page-has-heading-one`, `landmark-one-main`, `region`). | Each admin view is wrapped in `<main>` and has exactly one `h1` ("Green Villa — Booking admin" / "Choose a password"). |
| The "Request sent" confirmation title was a `<p>`, invisible to heading navigation. | Now an `h3` under the Contact `h2`. |
| Calendar days that cannot be picked (past, booked) were `<div aria-label>` — `aria-label` on an element with no role is not reliably announced. | The visible number is `aria-hidden`; the full date and state ("…— booked") are in sr-only text. |
| Nav landmarks were labelled "Main" / "Footer" in English on every page. | Translated (`t.nav.mainNavLabel`, `t.nav.footerNavLabel`). |
| Scrollspy marked the current section with `aria-current="page"`, which announces "current page" on a one-page site. | `aria-current="location"`. |
| Language buttons were named "En", "עב", "Ελ". | `aria-label` is the full language name ("English", "עברית", "Ελληνικά"), in its own `lang`. |
| Heading outline of the public site | Verified: one `h1` (hero), `h2` per section, `h3` for cards/month/confirmation, no skips, in all three languages. |

### 1.4.1 Use of colour

| Finding | Fix |
|---|---|
| Booked calendar days were distinguished from free ones by colour alone. | Booked days are struck through, and the legend swatch carries the same mark. |

### 1.4.3 Contrast (minimum) · 1.4.11 Non-text contrast (2.1)

The brand terracotta (`#c97d60`) fails as text on every light surface in the site (2.78:1 on cream, 3.06:1 on shell, 3.19:1 on white; white text on it 3.19:1). Two tokens were added to `src/index.css`, the same hue at text-safe lightness:

- `terracotta-deep` `#9e5438` — 4.85:1 on cream, 5.33:1 on shell, 5.56:1 with white text. Used for eyebrows, distances, booked days, error text and destructive buttons in the admin.
- `terracotta-soft` `#f0b49c` — 6.48:1 on navy. Used for errors and required markers on the navy contact form.

Plain `terracotta` stays for decoration where no contrast rule applies (the nav underline, 3.65:1 on navy; the loader bar; hover borders; tints).

| Element (before) | Ratio before | After |
|---|---|---|
| Section eyebrows, location eyebrow, distances — terracotta on cream/shell | 2.78–3.06 | `terracotta-deep` ≥ 4.85 |
| Booked calendar day — white on terracotta | 3.19 | on `terracotta-deep`, 5.56 |
| Contact form errors — terracotta on navy | 3.64 | `terracotta-soft`, 6.48 |
| Past calendar days — `slate/35` | 1.70 | `slate/85` on an unfilled cell, 4.58 |
| Map coordinates — `slate/80` on cream | 3.85 | `slate`, 5.94 |
| Admin chart year labels — `opacity-60` | 2.73 | full `slate` |
| Admin errors, status pills, destructive buttons — terracotta on white | 3.19 | `terracotta-deep` |
| Contact placeholders — `cream/45` on field | 3.11 | `cream/70`, 5.22 (axe does not test placeholders; measured by hand) |
| Language buttons — `white/80` on the translucent navbar over the hero photo | 3.90 worst case | full white, 5.03 worst case |
| Hero subtitle over the photo | down to ~2.2 over a bright part of the photo | taller, darker bottom scrim — calculated at ≈ 4.6 for the subtitle and ≥ 4 for the title *even over a pure-white photo* (at the text's position on a ~800px-tall window), so an admin upload should not break it. Also `font-light` → regular. Measured by hand; axe cannot compute contrast over an image. |
| Contact field borders — `navy-line` on navy | 1.34 | `cream/50`, 3.80 |
| Admin field borders — `line` on white | 1.22 | new `field` token `#8b939b`, 3.11 |
| Focus ring — terracotta on cream | 2.78 | see 2.4.7 |

### 1.4.4 Resize text · 1.4.10 Reflow (2.1)

| Finding | Fix |
|---|---|
| Public site | Verified: no horizontal scroll at 640px (200%) or 320px (400%) in any language. |
| Mobile menu at 200% zoom on a short window: body scroll is locked while it is open, so the last links fell below the viewport with no way to reach them. | The menu has `max-height: calc(100dvh - 72px)` and scrolls itself. |

### 1.3.2 Meaningful sequence · 3.1.1 / 3.1.2 Language of page and parts — RTL

| Finding | Fix |
|---|---|
| `lang` and `dir` | Already correct, and set before first paint by the head script in `index.html`; verified per language. The admin pins `en`/`ltr`. |
| Layout | Already almost entirely logical properties (`ps`, `start`, `end`, `text-start`). The one physical one — the skip link at `left-4` — is now `start-4`. |
| Calendar previous/next month chevrons pointed the wrong way in Hebrew. | Mirrored with `rtl:-scale-x-100`. |
| Lightbox ‹ › glyphs pointed the wrong way, and ArrowRight went to "next" although "next" sits on the left in Hebrew. | Glyphs mirrored; arrow keys follow the reading direction. |
| Date ranges used "→", which points backwards in Hebrew. | En dash. |
| Phone numbers, email address and coordinates were reordered by the bidi algorithm in Hebrew (the "+" moves to the end). The lightbox counter "2 / 7" printed as "7 / 2". | Each is isolated with `dir="ltr"` (and aligned to the Hebrew reading edge). |
| Admin-written English alt text on a Hebrew/Greek page | Marked `lang="en"` (see 1.1.1). |

### 2.1.1 Keyboard · 2.1.2 No keyboard trap · 2.4.3 Focus order

| Finding | Fix |
|---|---|
| **Lightbox had no focus management**: focus stayed on the thumbnail behind the overlay, Tab walked through the page underneath, and closing lost your place. | Focus moves to Close on open; Tab/Shift+Tab cycle within the dialog; Esc (already present) closes; focus returns to the thumbnail that opened it. Dialog labelled "Photo gallery" (translated); caption is a live region so each new photo is announced. |
| Mobile menu could not be closed from the keyboard except by Tabbing back to the button. | Esc closes it and returns focus to the button. |
| During the loading cover (up to 12 s) the page underneath was focusable and readable. | Everything under the cover is `inert` until it lifts. |
| The public map's pin was a focusable `role="button"` that did nothing. | Out of the tab order (`keyboard: false`) on the public map; the admin's draggable pin keeps Leaflet's keyboard handling. |
| No keyboard traps | Verified by Tabbing the whole page to the footer in every language. The Leaflet map takes focus as one stop (arrow keys pan) and releases it on Tab. |

### 2.4.1 Bypass blocks

| Finding | Fix |
|---|---|
| The skip link jumped to `#about`, skipping past the hero and the page's only `h1`, and only scrolled — it did not move keyboard focus, so the next Tab went back into the navbar. | Targets `<main id="main" tabIndex={-1}>`, which receives focus. Also `start-4` for RTL. |
| The admin dashboard had no skip link. | Added, targeting `#admin-main`. |

### 2.4.7 Focus visible

| Finding | Fix |
|---|---|
| The focus ring was terracotta everywhere — 2.78:1 on cream and 3.06 on shell, below the 3:1 the brief asks for. | One ring whose colour follows the surface: `--focus-ring` is `terracotta-deep` by default (≥ 4.85:1 on the light surfaces) and cream inside anything marked `.on-dark` (navbar, hero, contact, footer, lightbox, admin header). |
| Every form field in the site and admin had `focus:outline-none`; the only cue was a border colour change (navy-line → cream is barely visible on navy). | Removed; fields show the ring. |
| Chrome does not match `:focus-visible` on a date input reached by Tab (focus sits on an inner segment). | `input[type="date"]:focus-within` gets the ring too. |

### 2.2.2 Pause, stop, hide · 2.3.3 Animation from interactions — reduced motion

| Finding | Status |
|---|---|
| There is no carousel, autoplaying slideshow or video. | — |
| The loading bar sweeps continuously. | Acceptable: it is a loading indicator shown only while the page is covered (at most 12 s, usually under one), and it stops under `prefers-reduced-motion`. Verified. |
| Scroll-reveal fade-ups, hover zooms, smooth scrolling | Already disabled under `prefers-reduced-motion` in `index.css`; verified. |

### 3.3.1 Error identification · 3.3.2 Labels or instructions · 4.1.2 Name, role, value

| Finding | Fix |
|---|---|
| Contact form: labels, `aria-invalid` and `aria-describedby` were already in place. Required fields were not indicated. | `aria-required` on the five validated fields, a visible `*` (hidden from screen readers, which say "required"), and a translated "Fields marked * are required." note. |
| On a failed submit, five `role="alert"` messages fired at once and focus stayed on the button. | One summary alert ("Please check the highlighted fields.", translated); focus moves to the first invalid field, whose message is read through `aria-describedby`. Same for errors the server returns. |
| Admin forms (change password, add user, map location, add photo): errors were shown but not tied to their fields. | `FieldError` takes an `id`; each control has `aria-invalid` and an `aria-describedby` that includes its hint and its error. |
| Admin "Description" field for a new photo gave no guidance. | A hint explains it is the alt text read to blind visitors, with an example. |

## Action required (not code)

**Correct the photo descriptions in the admin.** In `/admin` → Site photos, paste each description below into the photo's *Description* field. They are registered in `src/i18n/imageAlts.ts`, so Hebrew and Greek visitors get the translation as soon as the English text matches exactly.

| Photo (seed file) | Current description (wrong) | Paste this |
|---|---|---|
| Hero (`hero.jpg`) | Green Villa seen from the garden, with the bay behind it *(close; no bay in shot)* | Green Villa's white two-storey façade with blue shutters, seen across the lawn |
| Lifestyle (`lifestyle.jpg`) | Sun-drenched bedroom opening onto the villa's sea-facing terrace | Balcony table and two wooden chairs looking out over the garden to the sea |
| Gallery 1 | Infinity pool overlooking the Aegean at sunset | Raised plunge pool under white shade sails in the garden, with the sea beyond |
| Gallery 2 | Master bedroom with linen bedding and sea view | Living room with two grey sofas, glass coffee tables and a jute rug |
| Gallery 3 | Open-plan living room in Mediterranean minimalist style | Dining table set with flowers in the open-plan living area, glass doors open to the garden |
| Gallery 4 | Stone terrace with lounge seating above the cliffs | Double bedroom with white linen, a ceiling fan and French windows onto a balcony |
| Gallery 5 | Poolside sun deck framed by olive trees | Balcony with a small table and two director's chairs overlooking the sea |
| Gallery 6 | Sunset over the bay seen from the villa | Covered outdoor dining area with a long table, white chairs and a built-in barbecue |
| Gallery 7 | Al fresco dining terrace lit for the evening | Wooden jetty on the pebble beach with striped loungers and towels |

This assumes the live photos are still the seed photos. If the admin has since replaced any, describe the photo actually shown instead; a new English description is still read correctly (marked `lang="en"`), just not translated until its translation is added to `imageAlts.ts`.

The seed text itself in `server/media.ts` (`defaults`, `galleryDefaults`) should get the same corrections so a fresh database starts right — left untouched here because server code was out of scope.

## Known limitations — not fixed

1. **Alt text is stored in one language.** The API has a single `alt` column per photo. Translations exist only for the known descriptions in `imageAlts.ts`; any other text the admin writes is read in English (correctly marked `lang="en"`). A real fix is a per-language alt (`alt_he`, `alt_el`) in the `site_images` table, the API and the admin form — a server change, out of scope.
2. **Seed descriptions are wrong until the admin updates them** — see "Action required".
3. **Hero contrast depends on the scrim, not the photo.** The scrim is sized for a pure-white photo at the text's position on a typical window; this was verified by calculation, not by axe (axe cannot measure text over images). On an unusually short, wide window the subtitle sits higher on the gradient and could dip under 4.5:1 over a very bright photo — check again if the hero layout changes.
4. **The Leaflet map.** Keyboard users can pan (arrows) and zoom (+/−, or the buttons) once the map has focus, and it is labelled; but a map is inherently visual. The equivalent information is in text next to it (coordinates, "Open in maps" link, the three nearby places with distances), which is the accessible alternative. Leaflet's attribution control was excluded from axe as third-party markup.
5. **Admin English only.** The admin is deliberately English and LTR (pinned); it is not translated.
6. **Admin inquiries table** needs horizontal scrolling below 880px. Data tables are exempt from reflow (WCAG 1.4.10 exception for two-dimensional content), and the scrolling is inside the table's own container, not the page.
7. **Hosts quote in Hebrew** uses straight ASCII quote marks that bidi places oddly around the year ("…מאז 2015."). Content, not structure; worth replacing with Hebrew gershayim in `he.ts` when the copy is next edited.
8. **Not tested with a physical screen reader.** Semantics were verified through axe and the accessibility tree via the scripted checks; a manual pass with NVDA (Hebrew voice) and VoiceOver is still recommended before an IS 5568 declaration.
9. **Accessibility statement.** Published at `/:lang/accessibility` in all three languages (`src/legal/{en,he,el}.ts`), listing the standard, what was made accessible and the limitations in this section. The coordinator's name, email and phone are still placeholders in `src/data/accessibility.ts`; the date shown on the page is set there too and should change whenever the statement does.
10. **Browsers.** Automated checks ran in Chrome only. The date-input focus workaround is Chrome-specific; other browsers already match the base rule.

## Files changed

- Tokens, focus ring, reduced motion: `src/index.css`
- i18n: `src/i18n/{types,en,he,el,index}.ts`, new `src/i18n/imageAlts.ts`
- Public site: `src/pages/PublicSite.tsx`, `src/components/layout/{Navbar,Footer,LanguagePicker}.tsx`, `src/components/sections/{Hero,About,Gallery,Explore,Availability,Transit}.tsx`, `src/components/sections/location/{Location,MapPanel}.tsx`, `src/components/sections/contact/{Contact,FieldError,RequestSent}.tsx`, `src/components/ui/{Lightbox,SectionHeading,VillaMap}.tsx`
- Admin: `src/pages/Admin.tsx`, `src/components/admin/**` (landmarks, headings, field borders, focus, error wiring, contrast)
- Tooling: `scripts/a11y-audit.ts`, `package.json` (`a11y` script; dev dependencies `axe-core`, `puppeteer-core`), `.gitignore`
