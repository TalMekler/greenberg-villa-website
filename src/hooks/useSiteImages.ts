import { useCallback, useEffect, useState } from "react";
import { fetchSiteImages } from "../lib/api";
import type { SiteImages } from "../lib/site-images";

/** The hero and gallery photos, as configured in the admin. */
export function useSiteImages() {
  const [images, setImages] = useState<SiteImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setImages(await fetchSiteImages());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the photos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount synchronises with an external system.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload();
  }, [reload]);

  return { images, loading, error, reload };
}
