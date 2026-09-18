import { Fragment } from "react";

const token = /(\[\[[A-Z0-9_]+\]\])/;

/**
 * Text with any unfilled [[PLACEHOLDER]] highlighted, so the owner can spot
 * what is left to fill in. Each is isolated left-to-right, or the brackets
 * mirror and scramble inside Hebrew. Once every placeholder is replaced this
 * renders plain text.
 */
export function WithPlaceholders({ text }: { text: string }) {
  const parts = text.split(token);
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} dir="ltr" className="rounded-[2px] bg-[#fff1c2] px-1 font-mono text-[0.85em] text-ink">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}
