/** A validation message wired to its field by id, for aria-describedby. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="font-sans text-[12px] text-terracotta">
      {message}
    </p>
  );
}
