import { useId, useState, type FormEvent } from "react";
import { ApiError, changePassword } from "../../../lib/api";
import { FieldError, adminFieldClass, adminLabelClass } from "../shared";

interface ChangePasswordFormProps {
  /** Copy for the forced first-sign-in flow differs from the routine one. */
  variant: "forced" | "settings";
  onChanged: () => void;
}

type Errors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

export function ChangePasswordForm({ variant, onChanged }: ChangePasswordFormProps) {
  const formId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "The two passwords do not match." });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onChanged();
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors) {
        setErrors(caught.fieldErrors as Errors);
      } else {
        setMessage(
          caught instanceof Error ? caught.message : "Could not change the password.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      className="flex max-w-[420px] flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={`${formId}-current`} className={adminLabelClass}>
          {variant === "forced" ? "Initial password" : "Current password"}
        </label>
        <input
          id={`${formId}-current`}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={adminFieldClass}
        />
        <FieldError message={errors.currentPassword} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${formId}-new`} className={adminLabelClass}>
          New password
        </label>
        <input
          id={`${formId}-new`}
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          aria-describedby={`${formId}-hint`}
          className={adminFieldClass}
        />
        <p id={`${formId}-hint`} className="font-sans text-[12px] text-slate">
          At least 8 characters, including a letter and a number.
        </p>
        <FieldError message={errors.newPassword} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${formId}-confirm`} className={adminLabelClass}>
          Confirm new password
        </label>
        <input
          id={`${formId}-confirm`}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={adminFieldClass}
        />
        <FieldError message={errors.confirmPassword} />
      </div>

      {message ? (
        <p role="alert" className="font-sans text-[13px] text-terracotta">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="mt-1 self-start rounded-[4px] bg-navy px-8 py-3.5 font-sans text-[13px] font-bold tracking-[0.04em] text-white uppercase transition-colors not-disabled:hover:bg-[#16304d] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : variant === "forced" ? "Set password & continue" : "Change password"}
      </button>
    </form>
  );
}
