import { useEffect, useRef } from "react";
import L from "leaflet";
import type { VillaLocation } from "../../lib/location";

interface VillaMapProps {
  location: VillaLocation;
  label: string;
  /** The map's accessible name, in the page's language. */
  ariaLabel?: string;
  /** Names for Leaflet's zoom buttons, which otherwise read in English. */
  zoomInTitle?: string;
  zoomOutTitle?: string;
  /** Lets the admin drag the pin to set the coordinates. */
  draggable?: boolean;
  onMove?: (latitude: number, longitude: number) => void;
}

function markerIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `
      <div class="flex flex-col items-center gap-1">
        <span class="block size-[18px] rounded-full border-[3px] border-white bg-navy shadow-[0_2px_6px_rgba(11,28,46,0.45)]"></span>
        <span class="whitespace-nowrap rounded-[4px] bg-navy px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-white">
          ${label}
        </span>
      </div>
    `,
    iconSize: [120, 48],
    iconAnchor: [60, 9],
  });
}

/**
 * A real OpenStreetMap view centred on the villa, in place of the illustrated
 * map from the Figma frame — a drawn coastline cannot honour real coordinates.
 */
export function VillaMap({
  location,
  label,
  ariaLabel = `Map showing ${label} on Evia island`,
  zoomInTitle = "Zoom in",
  zoomOutTitle = "Zoom out",
  draggable = false,
  onMove,
}: VillaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Kept in a ref so changing the handler never rebuilds the map.
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Build once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: [location.latitude, location.longitude],
      zoom: location.zoom,
      // Page scrolling should not be hijacked; zoom with the buttons.
      scrollWheelZoom: false,
      attributionControl: true,
      // Added below with translated button names.
      zoomControl: false,
    });

    L.control.zoom({ zoomInTitle, zoomOutTitle }).addTo(map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const marker = L.marker([location.latitude, location.longitude], {
      icon: markerIcon(label),
      title: label,
      draggable,
      // On the public map the pin does nothing when activated, so it should
      // not be a tab stop announcing itself as a button. The admin's pin is
      // draggable and keeps Leaflet's keyboard handling.
      keyboard: draggable,
      interactive: draggable,
      autoPan: draggable,
    }).addTo(map);

    if (draggable) {
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        onMoveRef.current?.(lat, lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Built once; later changes are applied by the effects below.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [draggable]);

  // Follow the coordinates without tearing the map down.
  useEffect(() => {
    mapRef.current?.setView([location.latitude, location.longitude], location.zoom);
    markerRef.current?.setLatLng([location.latitude, location.longitude]);
  }, [location.latitude, location.longitude, location.zoom]);

  useEffect(() => {
    markerRef.current?.setIcon(markerIcon(label));
  }, [label]);

  // The map is built once, so a language switch renames the zoom buttons in place.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    for (const [selector, name] of [
      [".leaflet-control-zoom-in", zoomInTitle],
      [".leaflet-control-zoom-out", zoomOutTitle],
    ] as const) {
      const button = container.querySelector(selector);
      button?.setAttribute("title", name);
      button?.setAttribute("aria-label", name);
    }
  }, [zoomInTitle, zoomOutTitle]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className="size-full"
    />
  );
}
