import { useMemo, useState } from "react";
import { initialMonth } from "../../data/availability";
import {
  addMonths,
  buildMonthGrid,
  eachDayInRange,
  formatLongDate,
  formatMonth,
  isSameDay,
  nightsBetween,
  startOfDay,
  toDateKey,
  weekdayLabels,
} from "../../lib/date";
import type { useAvailability } from "../../hooks/useAvailability";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";
import type { Stay } from "../../lib/stay";
import { useLanguage } from "../../i18n";

interface AvailabilityProps {
  stay: Stay | null;
  onStayChange: (stay: Stay | null) => void;
  /**
   * Fetched by the page rather than here, so the loader can wait on this
   * request alongside the others before uncovering the site.
   */
  availability: ReturnType<typeof useAvailability>;
}

const cellBase =
  "flex h-14 items-center justify-center rounded-md font-sans text-[15px] transition-all duration-150 sm:h-16 sm:text-[16px]";

export function Availability({ stay, onStayChange, availability }: AvailabilityProps) {
  // `initialMonth` is a factory, so React uses it as a lazy initialiser and the
  // calendar always opens on the month the visitor is actually in.
  const [month, setMonth] = useState(initialMonth);
  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const { t, meta } = useLanguage();

  const narrowWeekdays = useMemo(() => weekdayLabels(meta.locale, "narrow"), [meta.locale]);

  // Seed bookings plus anything the admin has approved, served by the API.
  const { bookedDates, loading, error } = availability;

  const today = useMemo(() => startOfDay(new Date()), []);
  const atCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  const isPast = (date: Date) => date < today;
  const isBooked = (date: Date) => bookedDates.has(toDateKey(date));

  const rangeHasBookedDay = (start: Date, end: Date) =>
    eachDayInRange(start, end).some(isBooked);

  const handleSelect = (date: Date) => {
    if (isBooked(date) || isPast(date)) return;

    // No range yet, or a complete range → start a new one.
    if (!stay || stay.end || date <= stay.start) {
      onStayChange({ start: date, end: null });
      return;
    }

    if (rangeHasBookedDay(stay.start, date)) {
      // A booked night sits inside the span — restart from the new date instead.
      onStayChange({ start: date, end: null });
      return;
    }

    onStayChange({ start: stay.start, end: date });
  };

  const dayState = (date: Date) => {
    if (isPast(date)) return "past" as const;
    if (isBooked(date)) return "booked" as const;
    if (!stay) return "available" as const;
    if (isSameDay(date, stay.start)) return "edge" as const;
    if (stay.end && isSameDay(date, stay.end)) return "edge" as const;
    if (stay.end && date > stay.start && date < stay.end) return "in-range" as const;
    return "available" as const;
  };

  const nights = stay?.end ? nightsBetween(stay.start, stay.end) : 0;

  return (
    <section id="availability" className="bg-cream px-5 py-20 sm:px-8 lg:px-20 lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 lg:gap-14">
        <SectionHeading
          eyebrow={t.availability.eyebrow}
          title={t.availability.title}
          description={t.availability.description}
        />

        <div className="reveal mx-auto w-full max-w-[800px] rounded-xl bg-white p-5 shadow-panel sm:p-8 lg:p-10">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, -1))}
              disabled={atCurrentMonth}
              aria-label={t.availability.previousMonth}
              className="flex size-10 items-center justify-center rounded-full bg-sand transition-colors not-disabled:hover:bg-cream disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Icon name="chevronLeft" size={16} className="rtl:-scale-x-100" />
            </button>
            <h3 className="font-serif text-[24px] text-navy sm:text-[28px]" aria-live="polite">
              {formatMonth(month, meta.locale)}
            </h3>
            <button
              type="button"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label={t.availability.nextMonth}
              className="flex size-10 items-center justify-center rounded-full bg-sand transition-colors hover:bg-cream"
            >
              <Icon name="chevronRight" size={16} className="rtl:-scale-x-100" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekdayLabels(meta.locale).map((label, day) => (
              <div
                key={label}
                className="pb-2 text-center font-sans text-[12px] text-slate sm:text-[14px]"
              >
                <span className="hidden sm:inline">{label}</span>
                <span aria-hidden="true" className="sm:hidden">
                  {narrowWeekdays[day]}
                </span>
                <span className="sr-only sm:hidden">{label}</span>
              </div>
            ))}

            {cells.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} className="h-14 sm:h-16" />;

              const state = dayState(date);
              const label = formatLongDate(date, meta.locale);

              // Days that cannot be picked are plain text, not disabled buttons,
              // so they stay out of the tab order. aria-label is not announced on
              // an element with no role, so the full date is spoken from sr-only
              // text instead, with the visible number hidden from the reader.
              if (state === "past") {
                return (
                  <div
                    key={toDateKey(date)}
                    className={`${cellBase} cursor-not-allowed text-slate/85`}
                  >
                    <span aria-hidden="true">{date.getDate()}</span>
                    <span className="sr-only">{`${label} — ${t.availability.dayPast}`}</span>
                  </div>
                );
              }

              if (state === "booked") {
                // Struck through as well as coloured: colour alone must not be
                // the only thing telling a booked night from a free one.
                return (
                  <div
                    key={toDateKey(date)}
                    className={`${cellBase} cursor-not-allowed bg-terracotta-deep font-semibold text-white line-through decoration-2`}
                  >
                    <span aria-hidden="true">{date.getDate()}</span>
                    <span className="sr-only">{`${label} — ${t.availability.dayBooked}`}</span>
                  </div>
                );
              }

              const styles = {
                edge: "bg-navy font-semibold text-white",
                "in-range": "bg-navy/12 font-semibold text-navy",
                available: "bg-sand text-ink hover:bg-cream hover:-translate-y-0.5",
              }[state];

              return (
                <button
                  key={toDateKey(date)}
                  type="button"
                  onClick={() => handleSelect(date)}
                  aria-label={`${label} — ${t.availability.dayAvailable}`}
                  aria-pressed={state !== "available"}
                  className={`${cellBase} cursor-pointer ${styles}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-4 rounded-[4px] border border-slate/50 bg-sand" />
                <span className="font-sans text-[13px] text-slate">{t.availability.available}</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex size-4 items-center justify-center rounded-[4px] bg-terracotta-deep"
                >
                  <span className="block h-0.5 w-2.5 bg-white" />
                </span>
                <span className="font-sans text-[13px] text-slate">{t.availability.booked}</span>
              </span>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <p className="font-sans text-[13px] text-slate" aria-live="polite">
                {error
                  ? error
                  : loading
                    ? t.availability.loading
                    : stay?.end
                      ? `${formatLongDate(stay.start, meta.locale)} – ${formatLongDate(stay.end, meta.locale)} · ${nights} ${
                          nights === 1 ? t.units.night : t.units.nights
                        }`
                      : stay
                        ? t.availability.selectCheckOut
                        : t.availability.selectCheckIn}
              </p>
              <Button href="#contact">{t.availability.requestBooking}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
