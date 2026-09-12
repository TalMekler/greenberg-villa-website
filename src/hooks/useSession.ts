import { useCallback, useEffect, useState } from "react";
import { fetchSession, type Session } from "../lib/api";

/** Whether the admin is signed in, as reported by the API. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setSession(await fetchSession());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount synchronises with an external system.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload();
  }, [reload]);

  return { session, loading, error, reload };
}
