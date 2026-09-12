/** The inline validation message shown under an admin form field. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="font-sans text-[12px] text-terracotta">
      {message}
    </p>
  );
}
