import { useId, useState } from "react";
import { ApiError, setBookingPrice } from "../../lib/api";
import {
  currencies,
  currencySymbols,
  formatMoney,
  priceBreakdown,
  type Currency,
  type Inquiry,
  type PriceMode,
} from "../../lib/inquiry";

interface BookingPriceFormProps {
  booking: Inquiry;
  nights: number;
  onSaved: () => Promise<void>;
}

const control =
  "rounded-[4px] border border-line bg-white px-3 py-2 font-sans text-[14px] text-ink focus:border-navy focus:outline-none";

const smallButton =
  "rounded-[4px] px-3 py-2 font-sans text-[11px] font-bold tracking-[0.04em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function BookingPriceForm({ booking, nights, onSaved }: BookingPriceFormProps) {
  const fieldId = useId();
  const [amount, setAmount] = useState(booking.price ? String(booking.price.amount) : "");
  const [currency, setCurrency] = useState<Currency>(booking.price?.currency ?? "EUR");
  const [mode, setMode] = useState<PriceMode>(booking.price?.mode ?? "per-night");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  // Live preview of the other half of the calculation.
  const preview = valid ? priceBreakdown({ amount: parsed, currency, mode }, nights) : null;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onSaved();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.fieldErrors?.amount ?? caught.message)
          : "Could not save the price.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-amount`} className="font-sans text-[11px] tracking-[0.06em] text-slate uppercase">
            Amount
          </label>
          <div className="flex items-center gap-1">
            <span aria-hidden="true" className="font-sans text-[15px] text-slate">
              {currencySymbols[currency]}
            </span>
            <input
              id={`${fieldId}-amount`}
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className={`${control} w-[110px]`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-currency`} className="font-sans text-[11px] tracking-[0.06em] text-slate uppercase">
            Currency
          </label>
          <select
            id={`${fieldId}-currency`}
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
            className={control}
          >
            {currencies.map((option) => (
              <option key={option} value={option}>
                {option} {currencySymbols[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-mode`} className="font-sans text-[11px] tracking-[0.06em] text-slate uppercase">
            This is
          </label>
          <select
            id={`${fieldId}-mode`}
            value={mode}
            onChange={(event) => setMode(event.target.value as PriceMode)}
            className={control}
          >
            <option value="per-night">Per night</option>
            <option value="total">Whole stay</option>
          </select>
        </div>

        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => void run(() => setBookingPrice(booking.id, { amount: parsed, currency, mode }))}
          className={`${smallButton} bg-navy text-white not-disabled:hover:bg-[#16304d]`}
        >
          {busy ? "Saving…" : "Save price"}
        </button>

        {booking.price ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await setBookingPrice(booking.id, null);
                setAmount("");
              })
            }
            className={`${smallButton} border border-line text-slate not-disabled:hover:bg-sand`}
          >
            Clear
          </button>
        ) : null}
      </div>

      {preview ? (
        <p className="font-sans text-[13px] text-slate">
          {mode === "per-night" ? (
            <>
              {formatMoney(preview.perNight, currency)} × {nights}{" "}
              {nights === 1 ? "night" : "nights"} ={" "}
              <span className="font-bold text-ink">{formatMoney(preview.total, currency)}</span>
            </>
          ) : (
            <>
              <span className="font-bold text-ink">{formatMoney(preview.total, currency)}</span>{" "}
              total — {formatMoney(preview.perNight, currency)} per night
            </>
          )}
        </p>
      ) : (
        <p className="font-sans text-[13px] text-slate">No price set for this booking yet.</p>
      )}

      {error ? (
        <p role="alert" className="font-sans text-[12px] text-terracotta">
          {error}
        </p>
      ) : null}
    </div>
  );
}
