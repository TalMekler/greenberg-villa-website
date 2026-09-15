import { useEffect, useRef } from "react";
import { watchTables, type WatchedTable } from "../lib/realtime";

/** How often to re-check when the live connection is unavailable. */
const POLL_MS = 30_000;
/** Changes arriving together — a status edit fires several — collapse into one reload. */
const SETTLE_MS = 250;

/**
 * Keeps `reload` in step with the database.
 *
 * Live changes to the watched tables trigger it, and a poll runs as a safety
 * net whenever the socket is not connected — a blocked WebSocket, a sleeping
 * laptop, a deployment without the keys. Polling stops while the tab is hidden,
 * and one reload runs on the way back, so a tab left open overnight does not
 * spend the night making requests.
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
    let live = false;
    let settle: ReturnType<typeof setTimeout> | undefined;

    const run = () => void latest.current();
    const debounced = () => {
      clearTimeout(settle);
      settle = setTimeout(run, SETTLE_MS);
    };

    const stopWatching = watchTables(watched, debounced, (connected) => {
      live = connected;
    });

    const poll = setInterval(() => {
      if (!live && document.visibilityState === "visible") run();
    }, POLL_MS);

    // Coming back to a tab is the moment stale content is most obvious, and the
    // socket may have dropped while it was hidden.
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(settle);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      stopWatching();
    };
  }, [key]);
}
