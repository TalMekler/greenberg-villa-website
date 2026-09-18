import { useId, useState } from "react";
import { ApiError, saveLocation } from "../../lib/api";
import {
  ZOOM_RANGE,
  formatCoordinates,
  type VillaLocation,
} from "../../lib/location";
import { VillaMap } from "../ui/VillaMap";
import { FieldError, adminLabelClass } from "./shared";

const control =
  "w-full rounded-[4px] border border-field bg-white px-3 py-2 font-sans text-[14px] text-ink focus:border-navy";

const smallButton =
  "rounded-[4px] px-4 py-2.5 font-sans text-[11px] font-bold tracking-[0.04em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40";

type Errors = Partial<Record<"latitude" | "longitude" | "zoom", string>>;

interface LocationPanelProps {
  location: VillaLocation;
  onSaved: (next: VillaLocation) => void;
}

export function LocationPanel({ location, onSaved }: LocationPanelProps) {
  const fieldId = useId();
  const [latitude, setLatitude] = useState(String(location.latitude));
  const [longitude, setLongitude] = useState(String(location.longitude));
  const [zoom, setZoom] = useState(String(location.zoom));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    zoom: Number(zoom),
  };

  // The preview follows whatever is currently typed, once it is usable.
  const previewable =
    Number.isFinite(parsed.latitude) &&
    Math.abs(parsed.latitude) <= 90 &&
    Number.isFinite(parsed.longitude) &&
    Math.abs(parsed.longitude) <= 180 &&
    Number.isInteger(parsed.zoom) &&
    parsed.zoom >= ZOOM_RANGE.min &&
    parsed.zoom <= ZOOM_RANGE.max;

  const preview: VillaLocation = previewable ? parsed : location;
  const dirty =
    parsed.latitude !== location.latitude ||
    parsed.longitude !== location.longitude ||
    parsed.zoom !== location.zoom;

  /** Dragging the pin is the easiest way to set coordinates. */
  const handleDrag = (nextLatitude: number, nextLongitude: number) => {
    setLatitude(nextLatitude.toFixed(5));
    setLongitude(nextLongitude.toFixed(5));
    setStatus(null);
  };

  const handleSave = async () => {
    setErrors({});
    setStatus(null);
    setBusy(true);
    try {
      onSaved(await saveLocation(parsed));
      setStatus("Map location updated.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors) {
        setErrors(caught.fieldErrors as Errors);
      } else {
        setErrors({ latitude: "Could not save the location." });
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setLatitude(String(location.latitude));
    setLongitude(String(location.longitude));
    setZoom(String(location.zoom));
    setErrors({});
    setStatus(null);
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${fieldId}-lat`} className={adminLabelClass}>
              Latitude
            </label>
            <input
              id={`${fieldId}-lat`}
              aria-invalid={Boolean(errors.latitude)}
              aria-describedby={errors.latitude ? `${fieldId}-lat-error` : undefined}
              type="number"
              step="0.00001"
              inputMode="decimal"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              className={control}
            />
            <p className="font-sans text-[12px] text-slate">-90 to 90. North is positive.</p>
            <FieldError id={`${fieldId}-lat-error`} message={errors.latitude} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${fieldId}-lon`} className={adminLabelClass}>
              Longitude
            </label>
            <input
              id={`${fieldId}-lon`}
              aria-invalid={Boolean(errors.longitude)}
              aria-describedby={errors.longitude ? `${fieldId}-lon-error` : undefined}
              type="number"
              step="0.00001"
              inputMode="decimal"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              className={control}
            />
            <p className="font-sans text-[12px] text-slate">-180 to 180. East is positive.</p>
            <FieldError id={`${fieldId}-lon-error`} message={errors.longitude} />
          </div>
        </div>

        <div className="flex max-w-[220px] flex-col gap-2">
          <label htmlFor={`${fieldId}-zoom`} className={adminLabelClass}>
            Zoom
          </label>
          <input
            id={`${fieldId}-zoom`}
            aria-invalid={Boolean(errors.zoom)}
            aria-describedby={errors.zoom ? `${fieldId}-zoom-error` : undefined}
            type="number"
            min={ZOOM_RANGE.min}
            max={ZOOM_RANGE.max}
            step="1"
            value={zoom}
            onChange={(event) => setZoom(event.target.value)}
            className={control}
          />
          <p className="font-sans text-[12px] text-slate">
            {ZOOM_RANGE.min} is regional, {ZOOM_RANGE.max} is street level.
          </p>
          <FieldError id={`${fieldId}-zoom-error`} message={errors.zoom} />
        </div>

        <p className="font-sans text-[13px] text-slate">
          Shown on the site as{" "}
          <span className="text-ink">
            {previewable
              ? formatCoordinates(preview.latitude, preview.longitude)
              : "—"}
          </span>
          .
        </p>

        {status ? (
          <p role="status" className="font-sans text-[13px] text-navy">
            {status}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || !previewable || !dirty}
            onClick={() => void handleSave()}
            className={`${smallButton} bg-navy text-white not-disabled:hover:bg-[#16304d]`}
          >
            {busy ? "Saving…" : "Save location"}
          </button>
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={reset}
            className={`${smallButton} border border-line text-slate not-disabled:hover:bg-sand`}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <p className={adminLabelClass}>Preview</p>
        <div className="h-[280px] overflow-hidden rounded-lg border border-line">
          <VillaMap
            location={preview}
            label="Green Villa"
            draggable
            onMove={handleDrag}
          />
        </div>
        <p className="font-sans text-[12px] text-slate">
          Drag the pin to set the coordinates, then save.
        </p>
      </div>
    </div>
  );
}
