import { formatLongDate, fromDateKey, nightsBetween } from "../../../lib/date";
import type { Inquiry } from "../../../lib/inquiry";

/** The dates, nights and party size of a stay, as one table cell. */
export function StayCell({ inquiry }: { inquiry: Inquiry }) {
  const nights = nightsBetween(fromDateKey(inquiry.checkIn), fromDateKey(inquiry.checkOut));
  return (
    <div className="flex flex-col gap-0.5">
      <span className="whitespace-nowrap text-ink">
        {formatLongDate(fromDateKey(inquiry.checkIn))} →{" "}
        {formatLongDate(fromDateKey(inquiry.checkOut))}
      </span>
      <span className="text-[12px] text-slate">
        {nights} {nights === 1 ? "night" : "nights"} · {inquiry.guests}{" "}
        {inquiry.guests === "1" ? "guest" : "guests"}
      </span>
    </div>
  );
}
