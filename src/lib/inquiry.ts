// Shared between the browser and the API server, so this module deliberately
// imports nothing — no asset modules, no DOM types.

export type InquiryStatus = "pending" | "approved" | "declined" | "cancelled";

/** What the contact form collects. Dates are `YYYY-MM-DD` keys. */
export interface InquiryInput {
  firstName: string;
  lastName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  message: string;
}

export const currencies = ["EUR", "USD", "ILS"] as const;
export type Currency = (typeof currencies)[number];

export const currencySymbols: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  ILS: "₪",
};

/** Whether the amount the admin typed is a nightly rate or the whole stay. */
export const priceModes = ["per-night", "total"] as const;
export type PriceMode = (typeof priceModes)[number];

export interface BookingPrice {
  /** Major units, e.g. 1250.5 — always positive. */
  amount: number;
  currency: Currency;
  mode: PriceMode;
}

export interface Inquiry extends InquiryInput {
  id: string;
  status: InquiryStatus;
  submittedAt: string;
  decidedAt?: string;
  /** Set by the admin once a booking is confirmed. Never sent to the public site. */
  price?: BookingPrice;
  /**
   * The guest's agreement to the Privacy Policy: which version, and when.
   * Missing on inquiries sent before the form recorded it.
   */
  privacy?: PrivacyConsent;
}

export interface PrivacyConsent {
  /** A `PRIVACY_POLICY_VERSION` from src/lib/privacy.ts. */
  version: string;
  /** ISO-8601, set by the server when the request was stored. */
  acceptedAt: string;
}

/** Nightly rate and stay total, whichever way the amount was entered. */
export function priceBreakdown(
  price: BookingPrice,
  nights: number,
): { perNight: number; total: number } {
  const safeNights = Math.max(nights, 1);
  return price.mode === "per-night"
    ? { perNight: price.amount, total: price.amount * safeNights }
    : { perNight: price.amount / safeNights, total: price.amount };
}

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
