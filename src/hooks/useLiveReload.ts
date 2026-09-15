import { useEffect, useRef } from "react";
import { watchTables, type WatchedTable } from "../lib/realtime";

/** Only used while the socket is down. Nothing is timed while it is up. */
const RECONNECT_POLL_MS = 30_000;
/** Changes arriving together — a status edit fires several — collapse into one reload. */
const SETTLE_MS = 250;

/**
 * Keeps `reload` in step with the database, over the socket.
 *
 * Updates arrive as Supabase Realtime events; there is no timer while the
 * connection is up. The interval below exists only for the case where the
 * socket cannot be established or drops — a blocked WebSocket, a corporate
 * proxy, a deployment without the keys — and it is started and stopped by the
 * channel's own status, so a healthy connection means no periodic requests at
 * all. A hidden tab reloads once on the way back, since the socket may have
 * been closed while it was away.
 */
export function useLiveReload(tables: WatchedTable[], reload: () => void | Promise<void>): void {
  // Kept in a ref so a caller passing an inline function cannot resubscribe on
  // every render — the callbacks below stay stable for the life of the effect.
  const latest = useRef(reload);
  useEffect(() => {
    latest.current = reload;
  }, [reload]);

  const key = tables.join(",");

  useEffect(() => {
    const watched = key.split(",") as WatchedTable[];
    let settle: ReturnType<typeof setTimeout> | undefined;
    let fallback: ReturnType<typeof setInterval> | undefined;

    const run = () => void latest.current();
    const debounced = () => {
      clearTimeout(settle);
      settle = setTimeout(run, SETTLE_MS);
    };

    const stopWatching = watchTables(watched, debounced, (connected) => {
      if (connected) {
        // Live: drop the fallback entirely rather than letting it tick.
        clearInterval(fallback);
        fallback = undefined;
        return;
      }
      fallback ??= setInterval(() => {
        if (document.visibilityState === "visible") run();
      }, RECONNECT_POLL_MS);
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(settle);
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      stopWatching();
    };
  }, [key]);
}
