/** A signed percentage, or a dash when there is nothing to compare against. */
export function Delta({ change, caption }: { change: number | null; caption: string }) {
  if (change === null) {
    return (
      <p className="font-sans text-[12px] text-slate">
        <span className="font-bold text-ink">new</span> vs {caption}
      </p>
    );
  }

  const rounded = Math.round(change);
  const tone =
    rounded > 0 ? "text-[#2f7d5d]" : rounded < 0 ? "text-terracotta" : "text-slate";
  const arrow = rounded > 0 ? "▲" : rounded < 0 ? "▼" : "—";

  return (
    <p className="font-sans text-[12px] text-slate">
      <span className={`font-bold ${tone}`}>
        {arrow} {Math.abs(rounded)}%
      </span>{" "}
      vs {caption}
    </p>
  );
}
