import { useId, useRef, useState, type FormEvent } from "react";
import { updateImageAlt } from "../../../lib/api";
import { MAX_IMAGE_BYTES, type SiteImage, type SiteImages } from "../../../lib/site-images";
import { FieldError, adminFieldClass, adminLabelClass, smallButton } from "../shared";
import { accept, maxMb, messageFor } from "./shared";

/** One replace-only photo slot: preview, file picker, description. */
export function SingleImageEditor({
  label,
  hint,
  image,
  previewClass = "h-[120px] w-full rounded-lg object-cover sm:w-[200px]",
  upload,
  onChanged,
}: {
  label: string;
  hint?: string;
  image: SiteImage;
  previewClass?: string;
  upload: (file: File, alt: string) => Promise<SiteImages>;
  onChanged: (next: SiteImages) => void;
}) {
  const fieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(image.alt);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const file = fileRef.current?.files?.[0];
    if (file && file.size > MAX_IMAGE_BYTES) {
      setError(`That image is over ${maxMb}MB.`);
      return;
    }

    setBusy(true);
    try {
      // No file picked means the description alone is being corrected.
      const next = file ? await upload(file, alt) : await updateImageAlt(image.id, alt);
      onChanged(next);
      if (fileRef.current) fileRef.current.value = "";
      setStatus(file ? "Photo replaced." : "Description updated.");
    } catch (caught) {
      setError(messageFor(caught, file ? "image" : "alt"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 className={adminLabelClass}>{label}</h3>
      {hint ? <p className="mt-2 font-sans text-[13px] text-slate">{hint}</p> : null}

      <div className="mt-4 flex flex-col gap-5 sm:flex-row">
        <img src={image.url} alt={image.alt} className={previewClass} />

        <form
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-1 flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={`${fieldId}-file`} className={adminLabelClass}>
              Replace with
            </label>
            <input
              id={`${fieldId}-file`}
              ref={fileRef}
              type="file"
              accept={accept}
              className="font-sans text-[13px] text-slate file:mr-3 file:rounded-[4px] file:border-0 file:bg-navy file:px-4 file:py-2 file:font-sans file:text-[12px] file:font-bold file:tracking-[0.04em] file:text-white file:uppercase"
            />
            <p className="font-sans text-[12px] text-slate">
              JPEG, PNG or WebP, up to {maxMb}MB. Leave empty to only edit the description.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${fieldId}-alt`} className={adminLabelClass}>
              Description
            </label>
            <input
              id={`${fieldId}-alt`}
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              className={adminFieldClass}
            />
          </div>

          <FieldError message={error ?? undefined} />
          {status ? (
            <p role="status" className="font-sans text-[13px] text-navy">
              {status}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={`${smallButton} self-start bg-navy px-6 py-3 text-white not-disabled:hover:bg-[#16304d]`}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
