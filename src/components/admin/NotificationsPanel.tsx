import { useState } from "react";
import { sendTestEmail } from "../../lib/api";
import type { NotifyResult } from "../../lib/notify";
import { actionButton } from "./shared";

/** Sends a sample inquiry email and shows exactly what the mail provider answered. */
export function NotificationsPanel() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<NotifyResult | null>(null);

  const handleClick = async () => {
    setSending(true);
    setResult(null);
    try {
      setResult(await sendTestEmail());
    } catch (caught) {
      setResult({
        sent: false,
        to: [],
        from: "",
        error: caught instanceof Error ? caught.message : "Could not reach the server.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h3 className="font-sans text-[12px] font-bold tracking-[0.08em] text-slate uppercase">
        Inquiry emails
      </h3>
      <p className="mt-2 mb-5 font-sans text-[13px] text-slate">
        Every new booking inquiry is emailed to the hosts. Send a sample to check that it arrives.
      </p>

      <button
        type="button"
        disabled={sending}
        onClick={() => void handleClick()}
        className={`${actionButton} bg-navy text-white not-disabled:hover:bg-[#16304d]`}
      >
        {sending ? "Sending…" : "Send test email"}
      </button>

      {result ? (
        <div
          role={result.sent ? "status" : "alert"}
          className={`mt-4 font-sans text-[13px] leading-[1.5] ${result.sent ? "text-navy" : "text-terracotta"}`}
        >
          <p>
            {result.sent
              ? `Sent to ${result.to.join(", ")}. It should arrive within a minute — check spam too.`
              : `Not sent. ${result.error ?? ""}`}
          </p>
          {!result.sent && result.from ? (
            <p className="mt-1 text-slate">
              From {result.from}
              {result.to.length > 0 ? ` to ${result.to.join(", ")}` : ""}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
