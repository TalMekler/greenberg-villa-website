import { directionsUrl, formatCoordinates, type VillaLocation } from "../../../lib/location";
import { useLanguage } from "../../../i18n";
import { VillaMap } from "../../ui/VillaMap";

/** The framed map panel from the design, now showing the real location. */
export function MapPanel({ location }: { location: VillaLocation }) {
  const { t } = useLanguage();

  return (
    <div className="reveal relative flex h-[420px] w-full flex-col overflow-hidden rounded-xl border border-line-warm bg-cream sm:h-[500px]">
      <div className="flex flex-wrap items-end justify-between gap-2 px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-1">
          <p className="font-sans text-[12px] font-bold tracking-[0.08em] text-slate uppercase">
            {t.location.mapLabel}
          </p>
          {/* Digits, degree signs and N/E read left to right in every language. */}
          <p dir="ltr" className="font-sans text-[12px] text-slate rtl:text-end">
            {formatCoordinates(location.latitude, location.longitude)}
          </p>
        </div>
        <a
          href={directionsUrl(location)}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-[4px] border border-navy/30 px-3 py-1.5 font-sans text-[11px] font-bold tracking-[0.06em] text-navy uppercase transition-colors hover:bg-navy hover:text-white"
        >
          {t.location.openInMaps}
        </a>
      </div>

      <div className="relative flex-1 border-t border-line-warm">
        <VillaMap
          location={location}
          label="Green Villa"
          ariaLabel={t.location.mapAria}
          zoomInTitle={t.location.zoomIn}
          zoomOutTitle={t.location.zoomOut}
        />
      </div>
    </div>
  );
}
