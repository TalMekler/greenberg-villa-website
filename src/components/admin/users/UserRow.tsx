import { useId, useState } from "react";
import { ApiError, deleteUser, resetUserPassword } from "../../../lib/api";
import type { AdminUser } from "../../../lib/user";
import { smallButton } from "../shared";

type RowMode = "idle" | "resetting" | "confirming-delete";

/** One account in the admin list, with its reset and delete controls. */
export function UserRow({
  user,
  isCurrent,
  onChanged,
}: {
  user: AdminUser;
  isCurrent: boolean;
  onChanged: () => Promise<void>;
}) {
  const fieldId = useId();
  const [mode, setMode] = useState<RowMode>("idle");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
      setMode("idle");
      setPassword("");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.fieldErrors?.password ?? caught.message)
          : "That did not go through.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-sans text-[14px] break-all text-ink">{user.email}</span>

        {isCurrent ? (
          <span className="rounded-full bg-cream px-3 py-1 font-sans text-[11px] font-bold tracking-[0.06em] text-navy uppercase">
            You
          </span>
        ) : null}
        {user.mustChangePassword ? (
          <span className="rounded-full bg-terracotta/15 px-3 py-1 font-sans text-[11px] font-bold tracking-[0.06em] text-terracotta-deep uppercase">
            Initial password
          </span>
        ) : null}

        {isCurrent ? null : (
          <span className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setMode(mode === "resetting" ? "idle" : "resetting");
              }}
              className={`${smallButton} border border-line text-slate not-disabled:hover:bg-sand`}
            >
              Reset password
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setMode(mode === "confirming-delete" ? "idle" : "confirming-delete");
              }}
              className={`${smallButton} border border-terracotta-deep text-terracotta-deep not-disabled:hover:bg-terracotta-deep not-disabled:hover:text-white`}
            >
              Delete
            </button>
          </span>
        )}
      </div>

      {mode === "resetting" ? (
        <div className="flex flex-col gap-2 rounded-lg bg-sand p-3">
          <label htmlFor={fieldId} className="font-sans text-[12px] text-slate">
            New initial password — they will have to replace it at their next sign-in.
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={fieldId}
              type="text"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-w-[200px] flex-1 rounded-[4px] border border-field bg-white px-3 py-2 font-sans text-[14px] text-ink focus:border-navy"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => resetUserPassword(user.id, password))}
              className={`${smallButton} bg-navy text-white not-disabled:hover:bg-[#16304d]`}
            >
              {busy ? "Saving…" : "Set password"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setPassword("");
                setError(null);
              }}
              className={`${smallButton} border border-line text-slate not-disabled:hover:bg-white`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {mode === "confirming-delete" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-terracotta/10 p-3">
          <span className="flex-1 font-sans text-[13px] text-ink">
            Delete <span className="break-all">{user.email}</span>? They lose access immediately.
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => deleteUser(user.id))}
            className={`${smallButton} bg-terracotta-deep text-white not-disabled:hover:bg-[#b96b4f]`}
          >
            {busy ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("idle")}
            className={`${smallButton} border border-line text-slate not-disabled:hover:bg-white`}
          >
            Keep
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="font-sans text-[12px] text-terracotta-deep">
          {error}
        </p>
      ) : null}
    </li>
  );
}
