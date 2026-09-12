import { useCallback, useEffect, useState } from "react";
import { fetchLocation } from "../lib/api";
import { defaultLocation, type VillaLocation } from "../lib/location";

/** The map's centre point, as configured in the admin. */
export function useVillaLocation() {
  const [location, setLocation] = useState<VillaLocation>(defaultLocation);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLocation(await fetchLocation());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the location.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount synchronises with an external system.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload();
  }, [reload]);

  return { location, loading, error, reload };
}
