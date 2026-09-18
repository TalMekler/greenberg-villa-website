import { useEffect } from "react";
import { ForcedPasswordChange, LoginForm } from "../components/admin/auth";
import { Dashboard } from "../components/admin/dashboard";
import { useSession } from "../hooks/useSession";
import { usePinnedLanguage } from "../i18n";

export default function Admin() {
  const { session, loading: checkingSession, reload: reloadSession } = useSession();

  // The admin is written in English only, so it pins the document to English
  // and left-to-right. Setting `lang` and `dir` here directly does not hold:
  // the provider's effect runs after this page's and puts them back.
  usePinnedLanguage("en");

  // The page is unauthenticated until the API says otherwise; the API guards the
  // data either way, so this only decides what to render.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Admin — Green Villa";

    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);

    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  if (checkingSession) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-navy">
        <p role="status" className="font-sans text-[14px] text-cream">
          Checking your session…
        </p>
      </main>
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
