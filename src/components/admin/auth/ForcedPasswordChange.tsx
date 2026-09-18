import { ChangePasswordForm } from "./ChangePasswordForm";

/** Shown instead of the dashboard until a new admin replaces their initial password. */
export function ForcedPasswordChange({ email, onChanged }: { email: string; onChanged: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy px-5 py-16">
      <div className="w-full max-w-[480px] rounded-xl bg-white p-8 shadow-panel">
        <h1 className="font-serif text-[26px] text-navy">Choose a password</h1>
        <p className="mt-2 font-sans text-[14px] leading-[1.6] text-slate">
          Welcome, <span className="break-all text-ink">{email}</span>. Replace the initial password
          you were given before you can use the admin.
        </p>
        <div className="mt-8">
          <ChangePasswordForm variant="forced" onChanged={onChanged} />
        </div>
      </div>
    </main>
  );
}
