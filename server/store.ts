import { db } from "./db";
import type { BookingPrice, Inquiry, InquiryInput, InquiryStatus } from "../src/lib/inquiry";

/**
 * Inquiry storage, backed by the `inquiries` table.
 *
 * The functions stay async so the routes are untouched, even though
 * better-sqlite3 itself is synchronous.
 */

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
  priceAmount: number | null;
  priceCurrency: string | null;
  priceMode: string | null;
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
    // column is INTEGER so it can be aggregated in SQL later. Convert on the way out.
    guests: String(row.guests),
    message: row.message,
    status: row.status,
    submittedAt: row.submittedAt,
  };
  if (row.decidedAt) inquiry.decidedAt = row.decidedAt;
  if (row.priceAmount !== null && row.priceCurrency && row.priceMode) {
    inquiry.price = {
      amount: row.priceAmount,
      currency: row.priceCurrency,
      mode: row.priceMode,
    } as BookingPrice;
  }
  return inquiry;
}

const selectAll = db.prepare(`
  SELECT * FROM inquiries ORDER BY submittedAt DESC
`);
const selectOne = db.prepare(`SELECT * FROM inquiries WHERE id = ?`);
const insert = db.prepare(`
  INSERT INTO inquiries (id, firstName, lastName, email, checkIn, checkOut,
                         guests, message, status, submittedAt)
  VALUES (@id, @firstName, @lastName, @email, @checkIn, @checkOut,
          @guests, @message, @status, @submittedAt)
`);
const updatePrice = db.prepare(`
  UPDATE inquiries SET priceAmount = @amount, priceCurrency = @currency, priceMode = @mode
  WHERE id = @id
`);
const updateStatusRow = db.prepare(`
  UPDATE inquiries SET status = @status, decidedAt = @decidedAt WHERE id = @id
`);

export async function listInquiries(): Promise<Inquiry[]> {
  return (selectAll.all() as Row[]).map(toInquiry);
}

export async function createInquiry(input: InquiryInput): Promise<Inquiry> {
  const inquiry: Inquiry = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  insert.run({
    id: inquiry.id,
    firstName: inquiry.firstName,
    lastName: inquiry.lastName,
    email: inquiry.email,
    checkIn: inquiry.checkIn,
    checkOut: inquiry.checkOut,
    guests: inquiry.guests,
    message: inquiry.message ?? "",
    status: inquiry.status,
    submittedAt: inquiry.submittedAt,
  });
  return inquiry;
}

/** Sets or clears the agreed price on a booking. */
export async function setPrice(id: string, price: BookingPrice | null): Promise<Inquiry | null> {
  const result = updatePrice.run({
    id,
    amount: price?.amount ?? null,
    currency: price?.currency ?? null,
    mode: price?.mode ?? null,
  });
  if (result.changes === 0) return null;
  return toInquiry(selectOne.get(id) as Row);
}

export async function updateStatus(id: string, status: InquiryStatus): Promise<Inquiry | null> {
  const result = updateStatusRow.run({ id, status, decidedAt: new Date().toISOString() });
  if (result.changes === 0) return null;
  return toInquiry(selectOne.get(id) as Row);
}
