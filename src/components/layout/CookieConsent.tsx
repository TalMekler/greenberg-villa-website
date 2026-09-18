import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import { useLanguage } from "../../i18n";
import { legalPath } from "../../legal";
import {
  categoryInUse,
  consentCategories,
  getConsent,
  saveConsent,
  useConsent,
  type ConsentChoice,
} from "../../lib/consent";
import { registerCookieSettings } from "../../lib/cookie-settings";

const ACCEPT_ALL: ConsentChoice = { analytics: true, marketing: true };
const REJECT_ALL: ConsentChoice = { analytics: false, marketing: false };

/*
  Accept and Reject share one style, so neither is the easier choice to see or
  to hit. Customize is a real button of the same size, only outlined.
*/
const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-[4px] px-5 py-2.5 font-sans text-[14px] font-bold transition-colors";
const choiceButton = `${buttonBase} bg-navy text-white hover:bg-[#16304d]`;
const quietButton = `${buttonBase} border border-navy bg-white text-navy hover:bg-navy hover:text-white`;

/** Focus somewhere sensible once the control that had it is gone. */
function focusMain(): void {
  document.getElementById("main")?.focus({ preventScroll: true });
}

interface CategoryProps {
  title: string;
  text: string;
  control: ReactNode;
  /** The checkbox this row's title labels, and its text describes. */
  inputId?: string;
}

function Category({ title, text, control, inputId }: CategoryProps) {
  const titleClass = "font-sans text-[16px] font-semibold text-navy";
  return (
    <li className="flex items-start justify-between gap-4 py-4">
      <div>
        {inputId ? (
          <label htmlFor={inputId} className={`${titleClass} cursor-pointer`}>
            {title}
          </label>
        ) : (
          <p className={titleClass}>{title}</p>
        )}
        <p id={inputId ? `${inputId}-text` : undefined} className="mt-1 font-sans text-[14px] leading-[1.6] text-slate">
          {text}
        </p>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </li>
  );
}

/**
 * The cookie banner, and the settings dialog behind "Customize" and the
 * footer's "Cookie settings".
 *
 * The banner is a landmark placed right after the skip link, so it is the
 * first thing a keyboard or screen-reader user meets on the page. It does not
 * take focus on its own, and it does not block the page: nothing optional
 * runs until a choice is made, so ignoring it is the same as rejecting.
 *
 * The dialog is a native modal <dialog>: it keeps focus inside, makes the page
 * behind it inert, and closes on Escape. Focus goes back to whatever opened
 * it, or to <main> when that was a banner button that is now gone.
 */
export function CookieConsent() {
  const { t, language } = useLanguage();
  const consent = useConsent();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bannerRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentChoice>(REJECT_ALL);
  const [announcement, setAnnouncement] = useState("");

  useLockBodyScroll(open);

  const openSettings = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const stored = getConsent();
    setDraft({ analytics: stored?.analytics ?? false, marketing: stored?.marketing ?? false });
    dialog.showModal();
    setOpen(true);
  }, []);

  useEffect(() => registerCookieSettings(openSettings), [openSettings]);

  const onClose = () => {
    setOpen(false);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
    else focusMain();
  };

  const decide = (choice: ConsentChoice) => {
    const fromBanner = bannerRef.current?.contains(document.activeElement) ?? false;
    saveConsent(choice);
    setAnnouncement(t.consent.saved);
    const dialog = dialogRef.current;
    if (dialog?.open) {
      // onClose restores focus, after React has removed the banner if it went.
      requestAnimationFrame(() => dialog.close());
    } else if (fromBanner) {
      focusMain();
    }
  };

  const labels = {
    analytics: [t.consent.analytics, t.consent.analyticsText],
    marketing: [t.consent.marketing, t.consent.marketingText],
  } as const;

  return (
    <>
      {consent === null ? (
        <section
          ref={bannerRef}
          aria-label={t.consent.bannerLabel}
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5"
        >
          <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 rounded-lg border border-line-warm bg-shell p-5 shadow-[0_16px_40px_-12px_rgba(11,28,46,0.45)] sm:p-6 lg:flex-row lg:items-end lg:gap-8">
            <div className="flex-1">
              {/* Not a heading: it comes before the page's h1, and the landmark already names it. */}
              <p className="font-serif text-[22px] leading-[1.2] text-navy">{t.consent.bannerTitle}</p>
              <p className="mt-2 font-sans text-[15px] leading-[1.6] text-ink">
                {t.consent.bannerText}{" "}
                <Link
                  to={legalPath(language, "privacy", "#cookies")}
                  className="font-semibold text-terracotta-deep underline underline-offset-2 hover:text-navy"
                >
                  {t.consent.policyLink}
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button type="button" className={choiceButton} onClick={() => decide(REJECT_ALL)}>
                {t.consent.rejectAll}
              </button>
              <button type="button" className={choiceButton} onClick={() => decide(ACCEPT_ALL)}>
                {t.consent.acceptAll}
              </button>
              <button type="button" className={quietButton} onClick={openSettings}>
                {t.consent.customize}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/*
        At the end of <body>: its h2 must not come before the page's h1, and on
        the public site it must stay outside the wrapper that is inert while
        the loader is up. As a modal it sits in the top layer either way.
      */}
      {createPortal(
        <>
          <dialog
            ref={dialogRef}
            aria-labelledby="cookie-settings-title"
            aria-describedby="cookie-settings-intro"
            onClose={onClose}
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-lg bg-shell p-0 text-ink shadow-[0_24px_60px_-16px_rgba(11,28,46,0.6)] backdrop:bg-[rgba(27,58,92,0.7)]"
          >
            <form
              className="flex flex-col p-6 sm:p-8"
              onSubmit={(event) => {
                event.preventDefault();
                decide(draft);
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 id="cookie-settings-title" className="font-serif text-[28px] leading-[1.2] text-navy">
                  {t.consent.dialogTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="-me-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-[4px] text-[26px] leading-none text-navy hover:bg-cream"
                  aria-label={t.consent.close}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <p id="cookie-settings-intro" className="mt-3 font-sans text-[15px] leading-[1.6] text-slate">
                {t.consent.dialogIntro}
              </p>

              <ul className="mt-4 divide-y divide-line border-y border-line">
                <Category
                  title={t.consent.necessary}
                  text={t.consent.necessaryText}
                  control={<span className="font-sans text-[13px] font-semibold text-slate">{t.consent.alwaysOn}</span>}
                />
                {consentCategories.map((category) => {
                  const [title, text] = labels[category];
                  const id = `consent-${category}`;
                  return (
                    <Category
                      key={category}
                      title={title}
                      inputId={id}
                      text={categoryInUse(category) ? text : `${text} ${t.consent.notInUse}`}
                      control={
                        <input
                          id={id}
                          type="checkbox"
                          aria-describedby={`${id}-text`}
                          checked={draft[category]}
                          onChange={(event) => setDraft({ ...draft, [category]: event.target.checked })}
                          className="size-6 cursor-pointer accent-navy"
                        />
                      }
                    />
                  );
                })}
              </ul>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button type="button" className={choiceButton} onClick={() => decide(REJECT_ALL)}>
                  {t.consent.rejectAll}
                </button>
                <button type="button" className={choiceButton} onClick={() => decide(ACCEPT_ALL)}>
                  {t.consent.acceptAll}
                </button>
                <button type="submit" className={`${quietButton} sm:ms-auto`}>
                  {t.consent.save}
                </button>
              </div>
            </form>
          </dialog>

          {/* Present from the start, so a screen reader hears the change when it comes. */}
          <p role="status" className="sr-only">
            {announcement}
          </p>
        </>,
        document.body,
      )}
    </>
  );
}
