import { useCallback, useEffect, useState } from "react";
import { fetchBookedDates } from "../lib/api";

const empty: ReadonlySet<string> = new Set();

/** Taken dates from the booking API. Falls back to an empty set while loading. */
export function useAvailability() {
  const [bookedDates, setBookedDates] = useState<ReadonlySet<string>>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setBookedDates(await fetchBookedDates());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount is exactly the "synchronise with an external system"
    // case; the state updates happen after the request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload();
  }, [reload]);

  return { bookedDates, loading, error, reload };
}
