import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BookingPrice, Inquiry, InquiryInput, InquiryStatus } from "../src/lib/inquiry";

const here = dirname(fileURLToPath(import.meta.url));
const dataFile = join(here, "data", "inquiries.json");

/**
 * File-backed inquiry storage. Reads are served from memory; every write is
 * flushed to disk through a temp file + rename so a crash mid-write cannot
 * leave a truncated JSON file behind.
 */
let cache: Inquiry[] | null = null;
let writing: Promise<void> = Promise.resolve();

async function load(): Promise<Inquiry[]> {
  if (cache) return cache;
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed: unknown = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as Inquiry[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Could not read ${dataFile}, starting empty:`, error);
    }
    cache = [];
  }
  return cache;
}

async function persist(next: Inquiry[]): Promise<void> {
  cache = next;
  // Serialise writes so concurrent requests cannot interleave renames.
  writing = writing.then(async () => {
    await mkdir(dirname(dataFile), { recursive: true });
    const temp = `${dataFile}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
    await rename(temp, dataFile);
  });
  await writing;
}

export async function listInquiries(): Promise<Inquiry[]> {
  return load();
}

export async function createInquiry(input: InquiryInput): Promise<Inquiry> {
  const inquiry: Inquiry = {
    ...input,
    id: crypto.randomUUID(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  await persist([inquiry, ...(await load())]);
  return inquiry;
}

/** Sets or clears the agreed price on a booking. */
export async function setPrice(id: string, price: BookingPrice | null): Promise<Inquiry | null> {
  const inquiries = await load();
  const existing = inquiries.find((inquiry) => inquiry.id === id);
  if (!existing) return null;

  const updated: Inquiry = { ...existing };
  if (price) {
    updated.price = price;
  } else {
    delete updated.price;
  }

  await persist(inquiries.map((inquiry) => (inquiry.id === id ? updated : inquiry)));
  return updated;
}

export async function updateStatus(id: string, status: InquiryStatus): Promise<Inquiry | null> {
  const inquiries = await load();
  const existing = inquiries.find((inquiry) => inquiry.id === id);
  if (!existing) return null;

  const updated: Inquiry = { ...existing, status, decidedAt: new Date().toISOString() };
  await persist(inquiries.map((inquiry) => (inquiry.id === id ? updated : inquiry)));
  return updated;
}
