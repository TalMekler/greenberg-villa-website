import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { ApiError, createUser, fetchUsers } from "../../../lib/api";
import type { AdminUser } from "../../../lib/user";
import { FieldError, adminFieldClass, adminLabelClass } from "../shared";
import { UserRow } from "./UserRow";

export function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const formId = useId();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  const [created, setCreated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      setUsers(await fetchUsers());
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not load users.");
    }
  }, []);

  useEffect(() => {
    // Fetching on mount synchronises with an external system.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload();
  }, [reload]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setCreated(null);
    setSaving(true);
    try {
      const user = await createUser(email, password);
      setCreated(user.email);
      setEmail("");
      setPassword("");
      await reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors) {
        setErrors(caught.fieldErrors);
      } else {
        setErrors({ email: caught instanceof Error ? caught.message : "Could not add the user." });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      <div className="flex-1">
        <h3 className="font-sans text-[12px] font-bold tracking-[0.08em] text-slate uppercase">
          Admin users
        </h3>

        {loadError ? (
          <p role="alert" className="mt-3 font-sans text-[13px] text-terracotta-deep">
            {loadError}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-line rounded-lg border border-line bg-white">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isCurrent={user.id === currentUserId}
                onChanged={reload}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-sans text-[12px] font-bold tracking-[0.08em] text-slate uppercase">
          Add an admin
        </h3>
        <p className="mt-2 font-sans text-[13px] leading-[1.5] text-slate">
          They sign in with this password once, then have to replace it.
        </p>

        <form
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-4 flex max-w-[420px] flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={`${formId}-email`} className={adminLabelClass}>
              Email
            </label>
            <input
              id={`${formId}-email`}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${formId}-email-error` : undefined}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={adminFieldClass}
            />
            <FieldError id={`${formId}-email-error`} message={errors.email} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${formId}-password`} className={adminLabelClass}>
              Initial password
            </label>
            <input
              id={`${formId}-password`}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? `${formId}-hint ${formId}-password-error` : `${formId}-hint`}
              type="text"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={adminFieldClass}
            />
            <p id={`${formId}-hint`} className="font-sans text-[12px] text-slate">
              At least 8 characters, including a letter and a number. Shown in the clear so you can
              pass it on.
            </p>
            <FieldError id={`${formId}-password-error`} message={errors.password} />
          </div>

          {created ? (
            <p role="status" className="font-sans text-[13px] text-navy">
              Added {created}. They will be asked to set a new password when they first sign in.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 self-start rounded-[4px] bg-navy px-8 py-3.5 font-sans text-[13px] font-bold tracking-[0.04em] text-white uppercase transition-colors not-disabled:hover:bg-[#16304d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add user"}
          </button>
        </form>
      </div>
    </div>
  );
}
