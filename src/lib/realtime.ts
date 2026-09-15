import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

/**
 * A live connection to Supabase, used only to hear that something changed.
 *
 * Nothing is read through it. A change arrives, and the app re-fetches from its
 * own API — which stays the single source of truth for shape, validation and
 * what a visitor is allowed to see. The subscription is a doorbell, not a door.
 *
 * Three tables are watched, all of them already public: the booked dates (a
 * PII-free projection of approved stays, maintained by a trigger), the photo
 * records, and the map pin. Guest details are never exposed.
 */
export type WatchedTable = "booked_dates" | "site_images" | "location";

let clientPromise: Promise<SupabaseClient | null> | null = null;

async function getClient(): Promise<SupabaseClient | null> {
  clientPromise ??= (async () => {
    try {
      const response = await fetch("/api/realtime-config");
      if (!response.ok) return null;

      const { url, key } = (await response.json()) as { url: string | null; key: string | null };
      if (!url || !key) return null;

      return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { params: { eventsPerSecond: 2 } },
      });
    } catch {
      // No live updates, then. Callers keep their polling fallback.
      return null;
    }
  })();

  return clientPromise;
}

/**
 * Calls `onChange` whenever a row in one of `tables` changes.
 *
 * Returns a teardown, and reports whether the channel actually subscribed so a
 * caller can decide how hard to poll. Changes are not batched here — the hooks
 * that use this debounce their own reloads.
 */
export function watchTables(
  tables: WatchedTable[],
  onChange: (table: WatchedTable) => void,
  onStatus?: (live: boolean) => void,
): () => void {
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  void (async () => {
    const client = await getClient();
    if (!client || cancelled) {
      onStatus?.(false);
      return;
    }

    channel = client.channel("site-changes");
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        onChange(table);
      });
    }

    channel.subscribe((status) => {
      onStatus?.(status === "SUBSCRIBED");
    });
  })();

  return () => {
    cancelled = true;
    if (channel) void channel.unsubscribe();
  };
}
