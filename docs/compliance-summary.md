# Compliance summary: final check

- **Date:** 2026-09-18
- **Scope:** the whole site after the accessibility, security, legal-pages and cookie-consent work: public site, the three legal pages, the cookie banner and dialog, and the admin, in English, Hebrew and Greek.
- **Related:** [`accessibility-audit.md`](accessibility-audit.md) and [`security-review.md`](security-review.md). Their open items are not repeated here unless they affect compliance.

## Result at a glance

| # | Check | Result |
|---|---|---|
| 1 | axe on every page in all 3 languages | **0 violations**, 213/213 checks passed. Nothing new came up. |
| 2 | No tracking before cookie consent (network) | **Pass.** No trackers, no third-party scripts, no cookies before a choice. "Accept all" loads nothing new. |
| 3 | Every footer link in every language | **Pass for every internal link and control.** The Instagram and Facebook icons are still placeholders (see below). |
| 4 | `[[...]]` placeholders left | **36 distinct placeholders**, listed below. The site must not go live until they are filled. |
| 5 | Build and TypeScript | **Pass.** `npm run build` is clean (CSP hash check, `tsc -b` for app + server + Vite config, Vite bundle, API bundle). `scripts/` also type-checks, and `npm run lint` is clean. |

One real bug surfaced and was fixed along the way (see "What was done", item 2).

## How to re-run

```sh
npm run build          # type-check + bundle; must pass before the next line
npm run compliance     # network/consent + footer links, against dist/ in headless Chrome
npm run a11y           # axe + keyboard/reflow/RTL checks, all three languages
```

Both browser scripts need Google Chrome in `/Applications` (or `CHROME_PATH=...`). They exit non-zero on any failure and write `compliance-report.json` / `a11y-report.json`. Both files are git-ignored.

## What was done

### 1. Accessibility (axe, all pages × 3 languages)

`npm run a11y` runs axe-core 4.13 (`wcag2a wcag2aa wcag21a wcag21aa best-practice`) on:

- the public site in `en`, `he`, `el`: the page itself, then with the lightbox open, with the contact-form errors showing, and with the mobile menu open at 200% zoom;
- all 9 legal pages (`/{en,he,el}/{privacy,terms,accessibility}`);
- the cookie banner and the open cookie-settings dialog in all three languages;
- reduced motion, and the admin login and dashboard (English only by design).

**Result: 213 passed, 0 failed.** The script also checks things axe can't: focus order, focus traps, reflow at 320px, `lang`/`dir`, and heading outline. It ran twice: once before and once after the fix below. No new issues, so no accessibility code changed.

### 2. No tracking before consent: verified on the network

New script: `scripts/compliance-check.ts` (`npm run compliance`). It serves the **production build** (`dist/`) and opens each language in a fresh Chrome profile with no stored choice. It scrolls the page so lazy photos and the map load, and records every request, cookie and storage key. Then it clicks "Accept all" and records again. Photo URLs point at the real Supabase bucket, so the third parties are the real ones.

| Page (no choice made) | Hosts contacted | Cookies | Storage | Third-party scripts | After "Accept all" |
|---|---|---|---|---|---|
| `/` in en / he / el | site itself, `gjkpipfreccynndtmjan.supabase.co` (photos), `tile.openstreetmap.org` (map) | none | `greenberg-villa:language` only | none | 0 new requests |
| `/{lang}/privacy` in en / he / el | site itself only | none | `greenberg-villa:language` only | none | 0 new requests |

- Each host matches what the privacy policy's "Who we share it with" and cookie table disclose. All of them are needed for the page to work. None is analytics or marketing.
- The cookie table also lists Cloudflare's `__cf_bm` on supabase.co. It did not appear in this run, but Cloudflare may set it in production. It is already disclosed as strictly necessary.
- `src/lib/consent.ts` has an empty `optionalScripts` list, and the code has no analytics or marketing SDK anywhere. The only way to add one is through that list, which loads only after consent.
- No Google Fonts: fonts are self-hosted, and the CSP in `vercel.json` has `font-src 'self'`.

**Bug found and fixed: live updates crashed the home page in production** (`src/lib/realtime.ts`). This came up only because the check answers `/api/realtime-config` the way production does. Every watcher opened a Supabase channel with the same name, `"site-changes"`, and supabase-js returns the existing channel when a name repeats. The home page watches three sets of tables. The second watcher therefore added callbacks to a channel that was already subscribed, which threw `cannot add postgres_changes callbacks ... after subscribe()`: an uncaught page error, and live photo and map-pin updates never attached. Each watcher now gets its own channel name, and teardown removes the channel instead of only unsubscribing, so remounts don't pile up channels. The a11y audit didn't catch this because its fixture answers realtime-config with 404, which turns realtime off.

### 3. Footer links: every link, every language

For each language, the check starts from the home page and from each of the three legal pages (12 starting points) and clicks every footer control as a visitor would:

| Footer item | Checked | Result |
|---|---|---|
| "Green Villa" logo + 6 section links (Home, Gallery, Location, Explore, Availability, Contact) | lands on `/#section`, the section exists, language unchanged | ✓ from all 12 starting points |
| Privacy Policy / Terms / Accessibility Statement | opens `/{same lang}/{page}` with `<html lang>` = that language and an `h1` | ✓ |
| Cookie settings (button) | opens the preferences dialog | ✓ |
| Email / phone | shown as plain text, not links, while they are placeholders (`hasEmail`/`hasPhone` stop a `mailto:[[EMAIL]]` link) | ✓ as designed; become links once filled |
| Instagram / Facebook icons | open in a new tab | ✗ **placeholder:** they point at `https://instagram.com` and `https://facebook.com`, not the villa's profiles |

**180 checks passed.** The only failures are the 24 social-link placeholders (2 links × 12 pages), which need content from you, not a code fix.

### 4. Build

`npm run build`: exit 0. It runs `scripts/check-csp.mjs` (the inline-script hash in the CSP matches `index.html`), `tsc -b` (covers `src/`, `server/`, `vite.config.ts`), the Vite bundle and the esbuild API bundle. `scripts/*.ts` isn't in any tsconfig, so it was type-checked separately with strict settings: clean. `npm run lint` (oxlint): clean. The only warning left is Vite's note that the JS chunk is over 500 kB. That affects performance, not compliance.

## Left for you to fill in

Every value below appears on the live site, highlighted in the legal pages until it is replaced. **Don't deploy publicly while any of them remain.** Values in `src/data/*` are filled once and shared by all three languages. Values in `src/legal/*` must be filled **in each of `en.ts`, `he.ts` and `el.ts`** (27 placeholders × 3 files). The three files carry the same set, as verified.

### Once, in `src/data/operator.ts` (footer, privacy policy, terms)

| Placeholder | What |
|---|---|
| `[[OWNER_NAME]]` | Legal name of whoever lets the villa (the data controller) |
| `[[OWNER_ADDRESS]]` | Postal address for notices and privacy requests |
| `[[EMAIL]]` | Contact email. It becomes a `mailto:` link in the footer once valid |
| `[[PHONE]]` | International format, e.g. `+972 50 123 4567` |
| `[[AMA_NUMBER]]` | Greek short-term rental registry number (ΑΜΑ), shown in the footer |
| `[[EU_REPRESENTATIVE]]` | GDPR Art. 27 representative, or a sentence saying none is appointed (see lawyer list) |
| `[[LAST_UPDATED]]` | Date the privacy policy and terms last changed |

### Once, in `src/data/accessibility.ts` (accessibility statement)

`[[A11Y_CONTACT_NAME]]`, `[[A11Y_EMAIL]]`, `[[A11Y_PHONE]]`: the accessibility coordinator.

### In each of `src/legal/en.ts`, `he.ts`, `el.ts`

**Privacy policy**

| Placeholder | What |
|---|---|
| `[[SUPABASE_REGION]]` | Where the Supabase project stores data (Supabase dashboard → Project Settings → General) |
| `[[VERCEL_REGION]]` | Vercel function region (Vercel → Project → Settings → Functions) |
| `[[HOST_EMAIL_PROVIDER]]` | The inbox provider you receive notifications in (e.g. Gmail / Google Workspace) |
| `[[TRANSFER_MECHANISM]]` | Legal basis for transfers outside the EEA (see lawyer list) |
| `[[HOSTING_LOG_RETENTION]]` | How long Vercel keeps request logs on your plan |

**Terms & booking conditions**

| Placeholder | What |
|---|---|
| `[[PRICE_INCLUDES]]`, `[[EXTRA_FEES]]`, `[[TAXES_AND_FEES]]` | What the price covers, extras, and taxes (e.g. the Greek climate resilience fee) |
| `[[PAYMENT_TERMS]]` | When and how guests pay |
| `[[CANCELLATION_POLICY]]`, `[[REFUND_TIMEFRAME]]`, `[[FORCE_MAJEURE_POLICY]]` | Cancellation, refunds, events beyond control |
| `[[CHECK_IN_TIME]]`, `[[CHECK_OUT_TIME]]` | Times |
| `[[MAX_OCCUPANCY]]`, `[[SMOKING_POLICY]]`, `[[PETS_POLICY]]`, `[[EVENTS_POLICY]]`, `[[QUIET_HOURS]]`, `[[ADDITIONAL_HOUSE_RULES]]` | House rules |
| `[[SECURITY_DEPOSIT_AMOUNT]]`, `[[SECURITY_DEPOSIT_METHOD]]`, `[[SECURITY_DEPOSIT_RETURN]]` | Deposit |
| `[[POOL_RULES]]` | Pool rules |
| `[[LIABILITY_CAP]]` | Limit of liability |
| `[[GOVERNING_LAW]]`, `[[JURISDICTION]]` | Governing law and courts |

### Not placeholders to fill in

Some `[[...]]` matches in the code are not placeholders: `[[DOUBLE_BRACKETS]]` and `[[PLACEHOLDER]]` in comments and the README describe the convention, `src/components/legal/Placeholder.tsx` is the regex that highlights them, and `[[".leaflet-control-attribution"]]` in `scripts/a11y-audit.ts` is an axe selector.

### Other content still to supply

- **Instagram and Facebook links** in `src/components/layout/Footer.tsx`: replace `https://instagram.com` / `https://facebook.com` with the villa's profile URLs, or remove the icons.
- **Photo descriptions** in the admin: see "Action required" in `accessibility-audit.md`.
- **Deploy steps** from `security-review.md` → "Left for you": `DATABASE_CA_CERT`, `ALLOWED_ORIGINS`, and a browser check of the CSP on the live domain. After deploying, run a real-browser check on the production URL too. `npm run compliance` tests the build locally, not Vercel's headers.

## Should be reviewed by a lawyer

The pages were written to reflect GDPR, the ePrivacy rules, Greek short-term rental rules and IS 5568. They were **not written by a lawyer**, and some choices depend on facts only you and counsel can confirm. Ask a lawyer who knows EU/Greek and Israeli law to review at least these:

**Privacy policy (`/privacy`)**

1. **Who the controller is, and the Art. 27 EU representative.** The hosts manage bookings from Israel and let a property in Greece. Does GDPR apply through Art. 3(2), does it require an EU representative, or does an exemption apply? This decides what goes in `[[EU_REPRESENTATIVE]]`.
2. **Israeli Privacy Protection Law**, including Amendment 13. Does it apply alongside GDPR, and does anything need adding (e.g. database registration or notice duties)?
3. **International transfers (`[[TRANSFER_MECHANISM]]`).** Vercel, Resend and Supabase are US companies. Should the policy rely on the EU–US Data Privacy Framework, where the provider is certified, or on Standard Contractual Clauses in their DPAs? The policy also relies on the Commission's adequacy decision for Israel, which should be confirmed as still in force. **Sign a DPA with each provider** (Supabase, Vercel, Resend, your email provider).
4. **Legal bases and retention periods** in "Why we use it" and "How long we keep it". Confirm them, especially keeping confirmed bookings for years "for tax and accounting records": which country's tax law sets the period?
5. **Contact-form wording.** The notice above the submit button reads "By submitting you agree to the Privacy Policy". Under GDPR, agreeing to a policy is not a legal basis. Processing a booking request rests on steps before a contract (Art. 6(1)(b)). A lawyer may prefer wording such as "We use your details as described in the Privacy Policy". This is a text change in the `consent` strings of `src/i18n/{en,he,el}.ts`.
6. **Cookies without consent.** OpenStreetMap tiles and Supabase photos load before any choice, and `__cf_bm` is listed as strictly necessary. Neither is analytics, and both are disclosed. The lawyer should still confirm that loading the map before consent, which sends the visitor's IP to the OpenStreetMap Foundation in the UK, is acceptable, or whether the map should wait for a click.
7. **Complaints and supervisory authority.** Which authority to name: the Greek HDPA, the Israeli PPA, or both.

**Terms & booking conditions (`/terms`)**

8. **Cancellation and consumer rights.** EU law exempts dated accommodation from the 14-day right of withdrawal (Directive 2011/83/EU, Art. 16(l)). Israeli consumer law may give Israeli guests a statutory right to cancel a distance transaction. The cancellation policy has to be compatible with both.
9. **Limitation of liability (`[[LIABILITY_CAP]]`).** Consumer law limits how far liability can be capped, especially for personal injury and gross negligence. The pool and sea section needs the same review.
10. **Governing law and jurisdiction.** Under Rome I Art. 6 and Brussels I, a consumer keeps the protection of their home law and courts. Is a clause naming Greek or Israeli law enforceable as written?
11. **Price display and taxes.** Greek rules on showing the full price, the climate resilience fee, and the AMA number in the footer and on any listing.
12. **Security deposit and house rules.** Check they are enforceable, and the deposit handling.

**Accessibility statement (`/accessibility`)**

13. Confirm the statement meets the Israeli Equal Rights for Persons with Disabilities (Service Accessibility) Regulations, which set required contents such as the coordinator, the date and the known limitations. A manual screen-reader pass (NVDA in Hebrew, VoiceOver) is still recommended before declaring IS 5568 conformance (see `accessibility-audit.md`).

## Files changed in this check

- `src/lib/realtime.ts`: a separate channel per watcher, removed on teardown (the bug fix).
- `scripts/compliance-check.ts`: new; network/consent and footer-link checks against the production build.
- `package.json`: adds the `compliance` script.
- `.gitignore`: ignores `compliance-report.json`.
- `README.md`: lists `npm run a11y` and `npm run compliance`.
- `docs/compliance-summary.md`: this file.
