import type { InquiryStatus } from "../../../lib/inquiry";

const statusStyles: Record<InquiryStatus, string> = {
  pending: "bg-cream text-navy",
  approved: "bg-navy text-white",
  declined: "bg-line text-slate",
  cancelled: "bg-terracotta/15 text-terracotta",
};

export function StatusPill({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 font-sans text-[11px] font-bold tracking-[0.06em] uppercase ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}
