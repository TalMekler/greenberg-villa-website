import { percentChange } from "../../../lib/stats";
import { Delta } from "./Delta";
import { statsLabelClass as label } from "./styles";

/** One headline figure with its month-on-month and year-on-year change. */
export function StatCard({
  title,
  value,
  current,
  previous,
  lastYear,
}: {
  title: string;
  value: string;
  current: number;
  previous: number;
  lastYear: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-5 shadow-card">
      <p className={label}>{title}</p>
      <p className="font-serif text-[30px] text-navy">{value}</p>
      <Delta change={percentChange(current, previous)} caption="last month" />
      <Delta change={percentChange(current, lastYear)} caption="same month last year" />
    </div>
  );
}
