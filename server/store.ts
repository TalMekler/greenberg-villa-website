import { query, queryOne } from "./db";
import type { BookingPrice, Inquiry, InquiryInput, InquiryStatus } from "../src/lib/inquiry";

/** Inquiry storage, backed by the `inquiries` table in Supabase Postgres. */

/** The column layout, before it is folded back into the nested `price`. */
interface Row {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message: string;
  status: InquiryStatus;
  submittedAt: string;
  decidedAt: string | null;
  // `numeric` arrives as a string from pg — it is arbitrary precision, so the
  // driver will not silently round it into a JS number. Parse it ourselves.
  priceAmount: string | null;
  priceCurrency: string | null;
  priceMode: string | null;
  privacyPolicyVersion: string | null;
  privacyAcceptedAt: string | null;
}

function toInquiry(row: Row): Inquiry {
  const inquiry: Inquiry = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    // The app carries `guests` as a string (it comes from a <select>), but the
    // column is integer so it can be aggregated in SQL. Convert on the way out.
    guests: String(row.guests),
    message: row.message,
    status: row.status,
    submittedAt: row.submittedAt,
  };
  if (row.decidedAt) inquiry.decidedAt = row.decidedAt;
  if (row.priceAmount !== null && row.priceCurrency && row.priceMode) {
    inquiry.price = {
      amount: Number(row.priceAmount),
      currency: row.priceCurrency,
      mode: row.priceMode,
    } as BookingPrice;
  }
  if (row.privacyPolicyVersion && row.privacyAcceptedAt) {
    inquiry.privacy = { version: row.privacyPolicyVersion, acceptedAt: row.privacyAcceptedAt };
  }
  return inquiry;
}

export async function listInquiries(): Promise<Inquiry[]> {
  const rows = await query<Row>(`SELECT * FROM inquiries ORDER BY "submittedAt" DESC`);
  return rows.map(toInquiry);
}

/**
 * Stores a booking request with the guest's agreement to the Privacy Policy:
 * the version the form showed, timestamped here rather than by the browser.
 */
export async function createInquiry(
  input: InquiryInput,
  privacyPolicyVersion: string,
): Promise<Inquiry> {
  const submittedAt = new Date().toISOString();
  const inquiry: Inquiry = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    submittedAt,
    privacy: { version: privacyPolicyVersion, acceptedAt: submittedAt },
  };

  await query(
    `INSERT INTO inquiries (id, "firstName", "lastName", email, "checkIn", "checkOut",
                            guests, message, status, "submittedAt",
                            "privacyPolicyVersion", "privacyAcceptedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      inquiry.id,
      inquiry.firstName,
      inquiry.lastName,
      inquiry.email,
      inquiry.checkIn,
      inquiry.checkOut,
      Number(inquiry.guests),
      inquiry.message ?? "",
      inquiry.status,
      inquiry.submittedAt,
      privacyPolicyVersion,
      submittedAt,
    ],
  );
  return inquiry;
}

/** Sets or clears the agreed price on a booking. */
export async function setPrice(id: string, price: BookingPrice | null): Promise<Inquiry | null> {
  const row = await queryOne<Row>(
    `UPDATE inquiries
        SET "priceAmount" = $2, "priceCurrency" = $3, "priceMode" = $4
      WHERE id = $1
      RETURNING *`,
    [id, price?.amount ?? null, price?.currency ?? null, price?.mode ?? null],
  );
  return row ? toInquiry(row) : null;
}

export async function updateStatus(id: string, status: InquiryStatus): Promise<Inquiry | null> {
  const row = await queryOne<Row>(
    `UPDATE inquiries SET status = $2, "decidedAt" = $3 WHERE id = $1 RETURNING *`,
    [id, status, new Date().toISOString()],
  );
  return row ? toInquiry(row) : null;
}

/**
 * Removes an inquiry for good. Only a cancelled or declined one: an approved booking still
 * holds dates in the calendar, and a pending one is still awaiting an answer,
 * so neither should vanish by a single click. The caller checks the status;
 * this repeats the check in SQL so a direct API call cannot skip it.
 */
export async function deleteInquiry(id: string): Promise<boolean> {
  const gone = await query(`DELETE FROM inquiries WHERE id = $1 AND status IN ('cancelled', 'declined') RETURNING id`, [id]);
  return gone.length > 0;
}
