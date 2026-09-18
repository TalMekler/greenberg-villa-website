/**
 * A validation message wired to its field by id, for aria-describedby.
 *
 * Not an alert: the form announces a single summary and moves focus to the
 * first field to fix, which reads this out with it. Five alerts firing at once
 * would talk over each other.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="font-sans text-[12px] text-terracotta-soft">
      {message}
    </p>
  );
}
