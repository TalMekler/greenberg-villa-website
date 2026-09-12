import { useId, useState, type FormEvent } from "react";
import { ApiError, login } from "../../../lib/api";

interface LoginFormProps {
  /** False when the server has no credentials configured. */
  configured: boolean;
  onSignedIn: () => void;
}

const fieldClass =
  "w-full rounded-[4px] border border-line bg-white px-4 py-3 font-sans text-[15px] text-ink transition-colors focus:border-navy focus:outline-none";

export function LoginForm({ configured, onSignedIn }: LoginFormProps) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSigningIn(true);
    try {
      await login(email, password);
      onSignedIn();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not reach the booking service.",
      );
      setPassword("");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy px-5 py-16">
      <div className="w-full max-w-[420px] rounded-xl bg-white p-8 shadow-panel">
        <p className="font-serif text-[26px] text-navy">Greenberg Villa</p>
        <p className="mt-1 font-sans text-[12px] font-bold tracking-[0.08em] text-slate uppercase">
          Booking admin
        </p>

        {configured ? (
          <form
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
            className="mt-8 flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <label
                htmlFor={`${formId}-email`}
                className="font-sans text-[12px] font-bold tracking-[0.06em] text-slate uppercase"
              >
                Email
              </label>
              <input
                id={`${formId}-email`}
                name="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor={`${formId}-password`}
                className="font-sans text-[12px] font-bold tracking-[0.06em] text-slate uppercase"
              >
                Password
              </label>
              <input
                id={`${formId}-password`}
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
            </div>

            {error ? (
              <p role="alert" className="font-sans text-[13px] text-terracotta">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={signingIn}
              className="mt-2 rounded-[4px] bg-navy px-8 py-4 font-sans text-[14px] font-bold tracking-[0.02em] text-white uppercase transition-colors not-disabled:hover:bg-[#16304d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <p
            role="alert"
            className="mt-8 rounded-lg border border-terracotta/40 bg-terracotta/10 p-4 font-sans text-[13px] leading-[1.6] text-ink"
          >
            No admin credentials are configured. Copy <code>.env.example</code> to{" "}
            <code>.env</code>, set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code>, then
            restart the API.
          </p>
        )}
      </div>
    </div>
  );
}
