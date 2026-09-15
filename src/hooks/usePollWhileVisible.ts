import { useEffect, useRef } from "react";

/**
 * Re-runs `reload` on an interval, and once whenever the tab is brought back.
 *
 * For data that cannot be watched live. The admin's inquiry list is the case:
 * pushing its changes would mean letting the browser read the table, and it
 * holds guests' names and emails — and since admin sessions are this app's own
 * rather than Supabase's, there is no way to tell an admin's browser apart from
 * anyone else's.
 *
 * Nothing runs while the tab is hidden, so a dashboard left open overnight is
 * idle until someone looks at it again.
 */
export function usePollWhileVisible(reload: () => void | Promise<void>, everyMs: number): void {
  const latest = useRef(reload);
  useEffect(() => {
    latest.current = reload;
  }, [reload]);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") void latest.current();
    };

    const timer = setInterval(run, everyMs);
    document.addEventListener("visibilitychange", run);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [everyMs]);
}
