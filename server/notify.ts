import type { Inquiry } from "../src/lib/inquiry";
import type { NotifyResult } from "../src/lib/notify";
import { listUsers } from "./users";

/*
  Emails the hosts when a guest sends a booking inquiry, through Resend's HTTP
  API — a plain fetch, so there is no SDK to bundle.

  Recipients are NOTIFY_EMAIL (comma-separated) or, when that is unset, every
  admin account. Without RESEND_API_KEY this does nothing: the inquiry is still
  saved and shows up in /admin, it just isn't announced.

  It never throws. A mail provider being down must not turn a guest's
  successful inquiry into an error page.
*/

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Resend's shared sender works without a verified domain, but then only
// delivers to the address the Resend account was opened with.
const DEFAULT_FROM = "Villa inquiries <onboarding@resend.dev>";
const TIMEOUT_MS = 8000;

export function notificationsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

async function recipients(): Promise<string[]> {
  const configured = (process.env.NOTIFY_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  return (await listUsers()).map((user) => user.email);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nights(inquiry: Inquiry): number {
  const ms = Date.parse(inquiry.checkOut) - Date.parse(inquiry.checkIn);
  return Math.max(Math.round(ms / 86_400_000), 0);
}

function render(inquiry: Inquiry): { subject: string; text: string; html: string } {
  const name = `${inquiry.firstName} ${inquiry.lastName}`;
  const rows: [string, string][] = [
    ["Name", name],
    ["Email", inquiry.email],
    ["Stay", `${inquiry.checkIn} → ${inquiry.checkOut} (${nights(inquiry)} nights)`],
    ["Guests", inquiry.guests],
    ["Message", inquiry.message || "—"],
  ];

  const text = [
    "A new booking inquiry arrived.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Reply to this email to answer the guest, or approve it in /admin.",
  ].join("\n");

  const html = `<p>A new booking inquiry arrived.</p>
<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
${rows
  .map(
    ([label, value]) =>
      `<tr><th align="left" valign="top">${label}</th><td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
  )
  .join("\n")}
</table>
<p style="font-family:sans-serif;font-size:13px;color:#666">Reply to this email to answer the guest, or approve it in /admin.</p>`;

  return { subject: `New inquiry: ${name}, ${inquiry.checkIn} → ${inquiry.checkOut}`, text, html };
}

async function send(inquiry: Inquiry): Promise<NotifyResult> {
  const from = process.env.NOTIFY_FROM?.trim() || DEFAULT_FROM;
  // Trimmed: a key pasted into a dashboard easily picks up a trailing space or
  // newline, which Resend then rejects as invalid.
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, to: [], from, error: "RESEND_API_KEY is not set." };

  let to: string[] = [];
  try {
    to = await recipients();
    if (to.length === 0) return { sent: false, to, from, error: "No one to send to." };

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, reply_to: inquiry.email, ...render(inquiry) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return { sent: true, to, from };

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const reason = body?.message ?? response.statusText;
    return { sent: false, to, from, error: `Resend ${response.status}: ${reason}` };
  } catch (error) {
    return { sent: false, to, from, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function notifyNewInquiry(inquiry: Inquiry): Promise<void> {
  if (!notificationsConfigured()) return;
  const result = await send(inquiry);
  if (!result.sent) console.error(`Inquiry email failed: ${result.error}`);
}

/** Sends a made-up inquiry and reports exactly what the mail provider said. */
export function sendTestEmail(replyTo: string): Promise<NotifyResult> {
  return send({
    id: "test",
    status: "pending",
    submittedAt: new Date().toISOString(),
    firstName: "Test",
    lastName: "Guest",
    email: replyTo,
    checkIn: "2026-10-01",
    checkOut: "2026-10-05",
    guests: "2",
    message: "A test from the admin page. If you can read this, inquiry emails work.",
  });
}
