import { useEffect } from "react";
import { ForcedPasswordChange, LoginForm } from "../components/admin/auth";
import { Dashboard } from "../components/admin/dashboard";
import { useSession } from "../hooks/useSession";

export default function Admin() {
  const { session, loading: checkingSession, reload: reloadSession } = useSession();

  // The page is unauthenticated until the API says otherwise; the API guards the
  // data either way, so this only decides what to render.
  useEffect(() => {
    const root = document.documentElement;
    const previousTitle = document.title;
    // The admin is English-only, so it declares its own locale rather than
    // inheriting the visitor's — which would also pull in that language's fonts.
    const previousLang = root.lang;
    const previousDir = root.dir;

    document.title = "Admin — Green Villa";
    root.lang = "en";
    root.dir = "ltr";

    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);

    return () => {
      meta.remove();
      document.title = previousTitle;
      root.lang = previousLang;
      root.dir = previousDir;
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-navy">
        <p className="font-sans text-[14px] text-cream">Checking your session…</p>
      </div>
    );
  }

  if (!session?.authenticated || !session.user) {
    return (
      <LoginForm configured={session?.configured ?? false} onSignedIn={() => void reloadSession()} />
    );
  }

  // A freshly added admin cannot reach anything until the initial password is
  // replaced. The API enforces this too, so it is not just a UI gate.
  if (session.user.mustChangePassword) {
    return <ForcedPasswordChange email={session.user.email} onChanged={() => void reloadSession()} />;
  }

  return (
    <Dashboard
      user={session.user}
      onSignedOut={() => void reloadSession()}
      onAccountChanged={() => void reloadSession()}
    />
  );
}
