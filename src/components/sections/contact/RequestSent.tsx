import { useEffect, useRef } from "react";
import { formatLongDate, fromDateKey, nightsBetween } from "../../../lib/date";
import { useLanguage } from "../../../i18n";
import type { FormValues } from "./types";

/**
 * Replaces the form once a request goes through, so the outcome is impossible to
 * miss and the guest can see exactly what was sent.
 */
export function RequestSent({
  request,
  onReset,
}: {
  request: FormValues;
  onReset: () => void;
}) {
  const { t, meta } = useLanguage();
  const headingRef = useRef<HTMLParagraphElement>(null);
  const nights = nightsBetween(fromDateKey(request.checkIn), fromDateKey(request.checkOut));

  // Move focus to the confirmation so it is announced and reachable by keyboard.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-full flex-col items-start gap-6 rounded-lg border border-cream/30 bg-[rgba(42,78,112,0.35)] p-8 lg:w-[55%]"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-cream">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-7"
          stroke="#1b3a5c"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 12.5 9.5 18 20 7" />
        </svg>
      </span>

      <div className="flex flex-col gap-3">
        <p
          ref={headingRef}
          tabIndex={-1}
          className="font-serif text-[28px] text-white outline-none"
        >
          {t.contact.sent.title}
        </p>
        <p className="font-sans text-[15px] leading-[1.6] text-cream">
          {t.contact.sent.body.replace("{name}", request.firstName)}
        </p>
      </div>

      <dl className="flex w-full flex-col gap-3 border-t border-cream/20 pt-6 font-sans text-[14px]">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-cream/70">{t.contact.sent.dates}</dt>
          <dd className="text-end text-white">
            {formatLongDate(fromDateKey(request.checkIn), meta.locale)} →{" "}
            {formatLongDate(fromDateKey(request.checkOut), meta.locale)}
            <span className="block text-[12px] text-cream/70">
              {nights} {nights === 1 ? t.units.night : t.units.nights}
            </span>
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-cream/70">{t.contact.sent.guests}</dt>
          <dd className="text-white">{request.guests}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-cream/70">{t.contact.sent.replyTo}</dt>
          <dd className="break-all text-white">{request.email}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onReset}
        className="mt-2 rounded-[4px] border border-cream/50 px-6 py-3 font-sans text-[13px] font-bold tracking-[0.04em] text-cream uppercase transition-colors hover:bg-white/10"
      >
        {t.contact.sent.another}
      </button>
    </div>
  );
}
