/**
 * The inline validation message shown under an admin form field. Pass `id` and
 * point the control's aria-describedby at it, so the message is read with the
 * field when it is focused again, not only when it first appears.
 */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="font-sans text-[12px] text-terracotta-deep">
      {message}
    </p>
  );
}
