interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  /** Caps the description width, as the centred headings do in the design. */
  descriptionClassName?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "dark",
  descriptionClassName = "",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div
      className={`reveal flex flex-col gap-4 ${
        centered ? "items-center text-center" : "items-start text-start"
      }`}
    >
      <p
        className={`font-sans text-[14px] font-bold uppercase tracking-[0.08em] ${
          tone === "light" ? "text-cream" : "text-terracotta"
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`font-serif text-[32px] leading-[1.2] sm:text-[40px] lg:text-[48px] ${
          tone === "light" ? "text-white" : "text-navy"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`font-sans text-[16px] leading-[1.6] ${
            tone === "light" ? "text-cream" : "text-slate"
          } ${centered ? "max-w-[720px]" : ""} ${descriptionClassName}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
