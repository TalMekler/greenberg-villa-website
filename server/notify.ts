import { contactNumbers, contactPerson, telHref, whatsappHref } from "../src/lib/contact";
import type { Language } from "../src/i18n/types";
import type { Inquiry } from "../src/lib/inquiry";
import type { NotifyResult } from "../src/lib/notify";
import { listUsers } from "./users";

/*
  Booking-inquiry emails, sent through Resend's HTTP API — a plain fetch, so
  there is no SDK to bundle. Two go out per inquiry:

  - to the hosts: the inquiry details, with Reply-To set to the guest;
  - to the guest: a confirmation in the language they used on the site. The
    sender takes no replies, so it points them to WhatsApp and the phone.

  Hosts are NOTIFY_EMAIL (comma-separated) or, when that is unset, every admin
  account. Without RESEND_API_KEY nothing is sent: the inquiry is still saved
  and shows up in /admin, it just isn't announced.

  Nothing here throws. A mail provider being down must not turn a guest's
  successful inquiry into an error page.
*/

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Resend's shared sender works without a verified domain, but then only
// delivers to the address the Resend account was opened with — so guest
// confirmations need NOTIFY_FROM on a verified domain.
const DEFAULT_FROM = "Villa inquiries <onboarding@resend.dev>";
const TIMEOUT_MS = 8000;

interface Email {
  to: string[];
  replyTo?: string[];
  subject: string;
  text: string;
  html: string;
}

export function notificationsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

async function hosts(): Promise<string[]> {
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

/** Label/value rows as an HTML table; values are escaped, labels are ours. */
function htmlTable(rows: [string, string][]): string {
  return `<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
${rows
  .map(
    ([label, value]) =>
      `<tr><th valign="top" style="text-align:start">${label}</th><td style="white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
  )
  .join("\n")}
</table>`;
}

async function send(email: Email): Promise<NotifyResult> {
  const from = process.env.NOTIFY_FROM?.trim() || DEFAULT_FROM;
  // Trimmed: a key pasted into a dashboard easily picks up a trailing space or
  // newline, which Resend then rejects as invalid.
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, to: email.to, from, error: "RESEND_API_KEY is not set." };
  if (email.to.length === 0) return { sent: false, to: [], from, error: "No one to send to." };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: email.to,
        reply_to: email.replyTo?.length ? email.replyTo : undefined,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return { sent: true, to: email.to, from };

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    const reason = body?.message ?? response.statusText;
    return { sent: false, to: email.to, from, error: `Resend ${response.status}: ${reason}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { sent: false, to: email.to, from, error: reason };
  }
}

// ── To the hosts ─────────────────────────────────────────────────────────────

function hostEmail(inquiry: Inquiry, to: string[]): Email {
  const name = `${inquiry.firstName} ${inquiry.lastName}`;
  const rows: [string, string][] = [
    ["Name", name],
    ["Email", inquiry.email],
    ["Stay", `${inquiry.checkIn} → ${inquiry.checkOut} (${nights(inquiry)} nights)`],
    ["Guests", inquiry.guests],
    ["Message", inquiry.message || "—"],
  ];
  const footer = "Reply to this email to answer the guest, or approve it in /admin.";

  return {
    to,
    replyTo: [inquiry.email],
    subject: `New inquiry: ${name}, ${inquiry.checkIn} → ${inquiry.checkOut}`,
    text: [
      "A new booking inquiry arrived.",
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      footer,
    ].join("\n"),
    html: `<p>A new booking inquiry arrived.</p>
${htmlTable(rows)}
<p style="font-family:sans-serif;font-size:13px;color:#666">${footer}</p>`,
  };
}

// ── To the guest ─────────────────────────────────────────────────────────────

interface GuestCopy {
  dir: "ltr" | "rtl";
  subject: string;
  greeting: (firstName: string) => string;
  intro: string;
  /** Where to ask questions instead — this address does not take replies. */
  contact: (whatsapp: string, phone: string) => string;
  noReply: string;
  summary: string;
  dates: string;
  nights: string;
  guests: string;
  signOff: string;
  hosts: string;
  place: string;
}

const guestCopy: Record<Language, GuestCopy> = {
  en: {
    dir: "ltr",
    subject: "We've received your booking request – Green Villa",
    greeting: (firstName) => `Hi ${firstName},`,
    intro:
      "Thank you for your booking request at Green Villa. We've received it and will be in touch soon to confirm the details and finalise your booking.",
    contact: (whatsapp, phone) =>
      `Questions in the meantime? Reach us on WhatsApp at ${whatsapp} or by phone at ${phone}.`,
    noReply: "This is an automated message, so please don't reply to this email.",
    summary: "Your request",
    dates: "Dates",
    nights: "nights",
    guests: "Guests",
    signOff: "Warm regards,",
    hosts: "Eti",
    place: "Green Villa, Evia",
  },
  he: {
    dir: "rtl",
    subject: "קיבלנו את בקשת ההזמנה שלך – גרין וילה",
    greeting: (firstName) => `שלום ${firstName},`,
    intro:
      "תודה על בקשת ההזמנה בגרין וילה. קיבלנו אותה וניצור איתך קשר בקרוב כדי לאשר את הפרטים ולסגור את ההזמנה.",
    contact: (whatsapp, phone) =>
      `יש שאלות בינתיים? אפשר לפנות אלינו בוואטסאפ ${whatsapp} או בטלפון ${phone}.`,
    noReply: "זוהי הודעה אוטומטית, ולכן אין להשיב למייל הזה.",
    summary: "פרטי הבקשה",
    dates: "תאריכים",
    nights: "לילות",
    guests: "אורחים",
    signOff: "בברכה חמה,",
    hosts: "אתי",
    place: "גרין וילה, אוויה",
  },
  el: {
    dir: "ltr",
    subject: "Λάβαμε το αίτημα κράτησής σας – Green Villa",
    greeting: (firstName) => `Γεια σας ${firstName},`,
    intro:
      "Σας ευχαριστούμε για το αίτημα κράτησης στη Green Villa. Το λάβαμε και θα επικοινωνήσουμε μαζί σας σύντομα για να επιβεβαιώσουμε τις λεπτομέρειες και να ολοκληρώσουμε την κράτησή σας.",
    contact: (whatsapp, phone) =>
      `Για ερωτήσεις στο μεταξύ, επικοινωνήστε μαζί μας στο WhatsApp ${whatsapp} ή τηλεφωνικά στο ${phone}.`,
    noReply: "Αυτό είναι ένα αυτόματο μήνυμα, γι' αυτό παρακαλούμε μην απαντήσετε σε αυτό το email.",
    summary: "Το αίτημά σας",
    dates: "Ημερομηνίες",
    nights: "διανυκτερεύσεις",
    guests: "Επισκέπτες",
    signOff: "Με θερμούς χαιρετισμούς,",
    hosts: "Έτι",
    place: "Green Villa, Εύβοια",
  },
};

function guestEmail(inquiry: Inquiry, language: Language): Email {
  const copy = guestCopy[language];
  const rows: [string, string][] = [
    [copy.dates, `${inquiry.checkIn} → ${inquiry.checkOut} (${nights(inquiry)} ${copy.nights})`],
    [copy.guests, inquiry.guests],
  ];
  const greeting = copy.greeting(inquiry.firstName);
  // The same numbers the contact section shows, so the two never disagree.
  const { whatsapp, phone } = contactNumbers;
  const person = contactPerson[language];
  const style = "font-family:sans-serif;font-size:15px;line-height:1.55";

  // Phone numbers are isolated as left-to-right, or a Hebrew email shows their
  // digit groups in reverse order. Each is followed by who answers it.
  const isolate = (value: string) => `⁦${value}⁩ (${person})`;
  // In the HTML version they are links: one opens a WhatsApp chat, the other dials.
  const ltrLink = (value: string, href: string) =>
    `<a href="${escapeHtml(href)}" dir="ltr">${escapeHtml(value)}</a> (${escapeHtml(person)})`;

  return {
    to: [inquiry.email],
    subject: copy.subject,
    text: [
      greeting,
      "",
      copy.intro,
      "",
      `${copy.summary}:`,
      ...rows.map(([label, value]) => `${label}: ${value}`),
      "",
      copy.contact(isolate(whatsapp), isolate(phone)),
      "",
      copy.signOff,
      copy.hosts,
      copy.place,
      "",
      copy.noReply,
    ].join("\n"),
    html: `<div dir="${copy.dir}" style="${style}">
<p>${escapeHtml(greeting)}</p>
<p>${copy.intro}</p>
<p style="margin-bottom:4px"><strong>${copy.summary}</strong></p>
${htmlTable(rows)}
<p>${copy.contact(ltrLink(whatsapp, whatsappHref(whatsapp)), ltrLink(phone, telHref(phone)))}</p>
<p>${copy.signOff}<br>${copy.hosts}<br><span style="color:#666">${copy.place}</span></p>
<p style="font-size:12px;color:#888">${copy.noReply}</p>
</div>`,
  };
}

// ── Entry points ─────────────────────────────────────────────────────────────

/**
 * Tells the hosts and confirms to the guest, side by side. Never throws.
 * `confirmGuest: false` skips the guest's copy — the caller's rate limit says
 * that address has been mailed enough.
 */
export async function notifyNewInquiry(
  inquiry: Inquiry,
  language: Language,
  { confirmGuest = true }: { confirmGuest?: boolean } = {},
): Promise<void> {
  if (!notificationsConfigured()) return;
  let hostAddresses: string[] = [];
  try {
    hostAddresses = await hosts();
  } catch (error) {
    console.error("Could not look up who to email:", error);
  }

  const [toHosts, toGuest] = await Promise.all([
    send(hostEmail(inquiry, hostAddresses)),
    confirmGuest ? send(guestEmail(inquiry, language)) : null,
  ]);
  if (!toHosts.sent) console.error(`Inquiry email to hosts failed: ${toHosts.error}`);
  if (toGuest && !toGuest.sent) {
    console.error(`Confirmation email to guest failed: ${toGuest.error}`);
  }
}

/** Sends a made-up inquiry to the hosts and reports exactly what the mail provider said. */
export async function sendTestEmail(replyTo: string): Promise<NotifyResult> {
  let to: string[];
  try {
    to = await hosts();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { sent: false, to: [], from: "", error: reason };
  }
  return send(
    hostEmail(
      {
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
      },
      to,
    ),
  );
}
