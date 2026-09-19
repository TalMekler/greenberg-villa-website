import type { ImageAlts } from "../../../lib/site-images";
import { FieldError, adminFieldClass } from "../shared";

const fields = [
  { key: "alt", label: "English", lang: "en", dir: "ltr" },
  { key: "altHe", label: "Hebrew", lang: "he", dir: "rtl" },
  { key: "altEl", label: "Greek", lang: "el", dir: "ltr" },
] as const;

/**
 * A photo's description in each site language. English is the one the API
 * requires; an empty Hebrew or Greek one falls back to the site's built-in
 * translation, or to the English.
 */
export function AltFields({
  id,
  value,
  onChange,
  errors = {},
  describedBy,
  fieldClass = adminFieldClass,
  labelClass = "font-sans text-[12px] text-slate",
}: {
  /** Prefix for the inputs' ids. */
  id: string;
  value: ImageAlts;
  onChange: (next: ImageAlts) => void;
  errors?: Partial<Record<keyof ImageAlts, string>>;
  /** A hint shared by all three inputs. */
  describedBy?: string;
  fieldClass?: string;
  labelClass?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {fields.map(({ key, label, lang, dir }) => {
        const errorId = `${id}-${key}-error`;
        const describedIds = [describedBy, errors[key] ? errorId : null].filter(Boolean).join(" ");
        return (
          <div key={key} className="flex flex-col gap-1">
            <label htmlFor={`${id}-${key}`} className={labelClass}>
              {label}
            </label>
            <input
              id={`${id}-${key}`}
              lang={lang}
              dir={dir}
              value={value[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              aria-invalid={Boolean(errors[key])}
              aria-describedby={describedIds || undefined}
              className={fieldClass}
            />
            <FieldError id={errorId} message={errors[key]} />
          </div>
        );
      })}
    </div>
  );
}
