import { useMemo, useState } from "react";
import { currencySymbols, formatMoney, type Currency, type Inquiry } from "../../../lib/inquiry";
import {
  monthlySeries,
  totalsForMonth,
  usedCurrencies,
  weekdayTotals,
  type MonthTotals,
  type StatsBasis,
} from "../../../lib/stats";
import { statsLabelClass as label } from "./styles";
import { StatCard } from "./StatCard";

const control =
  "rounded-[4px] border border-line bg-white px-3 py-2 font-sans text-[13px] text-ink focus:border-navy focus:outline-none";

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function StatsPanel({ inquiries }: { inquiries: Inquiry[] }) {
  const today = new Date();
  const [basis, setBasis] = useState<StatsBasis>("check-in");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const available = useMemo(() => usedCurrencies(inquiries), [inquiries]);
  const [currency, setCurrency] = useState<Currency>(available[0]);
  const active = available.includes(currency) ? currency : available[0];

  const totals: MonthTotals = useMemo(
    () => totalsForMonth(inquiries, basis, active, year, month),
    [inquiries, basis, active, year, month],
  );

  const previous = useMemo(() => {
    // Built inside the memo so December → January rolls the year correctly
    // without a Date object churning the dependency list.
    const date = new Date(year, month - 1, 1);
    return totalsForMonth(inquiries, basis, active, date.getFullYear(), date.getMonth());
  }, [inquiries, basis, active, year, month]);

  const lastYear = useMemo(
    () => totalsForMonth(inquiries, basis, active, year - 1, month),
    [inquiries, basis, active, year, month],
  );

  const series = useMemo(
    () => monthlySeries(inquiries, basis, active, year, month, 12),
    [inquiries, basis, active, year, month],
  );

  const weekdays = useMemo(() => weekdayTotals(inquiries), [inquiries]);

  const peakRevenue = Math.max(...series.map((point) => point.revenue), 1);
  const peakNights = Math.max(...weekdays.map((day) => day.nights), 1);
  const peakGuests = Math.max(...weekdays.map((day) => day.averageGuests), 1);

  const shiftMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className={label}>Month</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="flex size-9 items-center justify-center rounded-full bg-sand font-sans text-[14px] text-navy transition-colors hover:bg-cream"
            >
              ‹
            </button>
            <span className="min-w-[150px] text-center font-sans text-[14px] font-semibold text-ink">
              {monthLabel(year, month)}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="flex size-9 items-center justify-center rounded-full bg-sand font-sans text-[14px] text-navy transition-colors hover:bg-cream"
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="stats-basis" className={label}>
            Count by
          </label>
          <select
            id="stats-basis"
            value={basis}
            onChange={(event) => setBasis(event.target.value as StatsBasis)}
            className={control}
          >
            <option value="check-in">Check-in date</option>
            <option value="approved">Approval date</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="stats-currency" className={label}>
            Currency
          </label>
          <select
            id="stats-currency"
            value={active}
            onChange={(event) => setCurrency(event.target.value as Currency)}
            className={control}
          >
            {available.map((option) => (
              <option key={option} value={option}>
                {option} {currencySymbols[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="font-sans text-[12px] text-slate">
        {basis === "check-in"
          ? "Bookings are counted in the month the guests arrive."
          : "Bookings are counted in the month you approved them."}{" "}
        Only confirmed bookings count, and revenue is shown for one currency at a time.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatMoney(totals.revenue, active)}
          current={totals.revenue}
          previous={previous.revenue}
          lastYear={lastYear.revenue}
        />
        <StatCard
          title="Bookings"
          value={String(totals.bookings)}
          current={totals.bookings}
          previous={previous.bookings}
          lastYear={lastYear.bookings}
        />
        <StatCard
          title="Nights"
          value={String(totals.nights)}
          current={totals.nights}
          previous={previous.nights}
          lastYear={lastYear.nights}
        />
        <StatCard
          title="Guests"
          value={String(totals.guests)}
          current={totals.guests}
          previous={previous.guests}
          lastYear={lastYear.guests}
        />
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-card">
        <p className={label}>Revenue, last 12 months</p>

        {/*
          Twelve labelled columns cannot fit a phone without horizontal
          scrolling, so narrow screens get the same data as rows instead.
        */}
        <ul className="mt-5 flex flex-col gap-2 sm:hidden">
          {series.map((point) => {
            const isCurrent = point.year === year && point.month === month;
            return (
              <li key={`${point.year}-${point.month}`} className="flex items-center gap-3">
                <span
                  className={`w-[52px] shrink-0 font-sans text-[11px] ${
                    isCurrent ? "font-bold text-ink" : "text-slate"
                  }`}
                >
                  {point.label}
                </span>
                <span className="h-[10px] min-w-0 flex-1 overflow-hidden rounded-full bg-sand">
                  <span
                    className={`block h-full rounded-full ${isCurrent ? "bg-navy" : "bg-navy/25"}`}
                    style={{ width: `${(point.revenue / peakRevenue) * 100}%` }}
                  />
                </span>
                <span className="w-[74px] shrink-0 text-right font-sans text-[11px] text-slate">
                  {point.revenue > 0 ? formatMoney(point.revenue, active) : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 hidden h-[180px] items-end gap-1.5 sm:flex">
          {series.map((point) => {
            const height = Math.round((point.revenue / peakRevenue) * 100);
            const isCurrent = point.year === year && point.month === month;
            return (
              <div
                key={`${point.year}-${point.month}`}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                title={`${point.label}: ${formatMoney(point.revenue, active)} · ${point.bookings} bookings`}
              >
                <span className="hidden font-sans text-[10px] text-slate lg:block">
                  {point.revenue > 0 ? Math.round(point.revenue).toLocaleString("en-GB") : ""}
                </span>
                <div
                  className={`w-full rounded-t-[3px] transition-colors ${
                    isCurrent ? "bg-navy" : "bg-navy/25"
                  }`}
                  style={{ height: `${Math.max(height, point.revenue > 0 ? 3 : 1)}%` }}
                />
                {/* Month over year: two short lines shrink further than one long one. */}
                <span className="font-sans text-[10px] leading-tight text-slate">
                  <span className="block text-center">
                    {new Date(point.year, point.month, 1).toLocaleDateString("en-GB", {
                      month: "short",
                    })}
                  </span>
                  <span className="block text-center opacity-60">
                    {String(point.year).slice(2)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-card">
        <p className={label}>Most popular nights — all confirmed bookings</p>
        <p className="mt-2 font-sans text-[12px] text-slate">
          Every night of every stay, counted by weekday. A Monday-to-Friday booking counts towards
          Monday, Tuesday, Wednesday and Thursday. Check-out nights are not slept in, so they are
          not counted.
        </p>

        <ul className="mt-5 flex flex-col gap-3">
          {weekdays.map((day) => (
            <li key={day.weekday} className="flex flex-wrap items-center gap-3">
              <span className="w-[86px] shrink-0 font-sans text-[13px] text-ink">{day.name}</span>

              <span className="flex min-w-[150px] flex-1 items-center gap-2">
                <span className="h-[10px] min-w-0 flex-1 overflow-hidden rounded-full bg-sand">
                  <span
                    className="block h-full rounded-full bg-navy"
                    style={{ width: `${(day.nights / peakNights) * 100}%` }}
                  />
                </span>
                <span className="w-[94px] shrink-0 font-sans text-[12px] text-slate">
                  {day.nights} {day.nights === 1 ? "night" : "nights"}
                </span>
              </span>

              <span className="flex min-w-[150px] flex-1 items-center gap-2">
                <span className="h-[10px] min-w-0 flex-1 overflow-hidden rounded-full bg-sand">
                  <span
                    className="block h-full rounded-full bg-terracotta"
                    style={{ width: `${(day.averageGuests / peakGuests) * 100}%` }}
                  />
                </span>
                <span className="w-[94px] shrink-0 font-sans text-[12px] text-slate">
                  {day.averageGuests > 0 ? day.averageGuests.toFixed(1) : "—"} guests avg
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
