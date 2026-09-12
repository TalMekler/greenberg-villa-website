// Shared between the browser and the API server — no asset or DOM imports.

export interface VillaLocation {
  latitude: number;
  longitude: number;
  /** Closer zooms show the coastline; this frames the villa and its bay. */
  zoom: number;
}

/** Where the villa is, until an admin moves it. */
export const defaultLocation: VillaLocation = {
  latitude: 38.8442,
  longitude: 22.97443,
  zoom: 13,
};

export const ZOOM_RANGE = { min: 3, max: 18 } as const;

export function isValidLocation(value: Partial<VillaLocation>): value is VillaLocation {
  const { latitude, longitude, zoom } = value;
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof zoom === "number" &&
    Number.isInteger(zoom) &&
    zoom >= ZOOM_RANGE.min &&
    zoom <= ZOOM_RANGE.max
  );
}

/** Formats a coordinate the way the map caption reads. */
export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(5)}°${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(5)}°${longitude >= 0 ? "E" : "W"}`;
  return `${lat} · ${lon}`;
}

export function directionsUrl({ latitude, longitude, zoom }: VillaLocation): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}
