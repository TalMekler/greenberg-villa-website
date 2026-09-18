import type { Inquiry } from "../src/lib/inquiry";
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
  return Boolean(process.env.RESEND_API_KEY);
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

export async function notifyNewInquiry(inquiry: Inquiry): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const to = await recipients();
    if (to.length === 0) return;

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || DEFAULT_FROM,
        to,
        reply_to: inquiry.email,
        ...render(inquiry),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Inquiry email failed: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error("Inquiry email failed:", error);
  }
}
