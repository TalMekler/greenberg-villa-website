/** One of the four headline counts across the top of the dashboard. */
export function SummaryTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-card">
      <p className="font-sans text-[12px] font-bold tracking-[0.08em] text-slate uppercase">
        {label}
      </p>
      <p className="mt-2 font-serif text-[32px] text-navy">{value}</p>
    </div>
  );
}
