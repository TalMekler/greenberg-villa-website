import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchInquiries } from "../lib/api";
import type { Inquiry } from "../lib/inquiry";

/** The full inquiry list, for the admin page. */
export function useInquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const reload = useCallback(async () => {
    try {
      setInquiries(await fetchInquiries());
      setError(null);
      setUnauthorized(false);
    } catch (caught) {
      // A 401 means the session lapsed — the page should fall back to sign-in.
      if (caught instanceof ApiError && (caught.status === 401 || caught.status === 503)) {
        setUnauthorized(true);
      }
      setError(caught instanceof Error ? caught.message : "Could not load inquiries.");
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

  return { inquiries, loading, error, unauthorized, reload };
}
