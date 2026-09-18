import { useId, useRef, useState, type FormEvent } from "react";
import { ApiError, uploadGalleryImage } from "../../../lib/api";
import { MAX_IMAGE_BYTES } from "../../../lib/site-images";
import { FieldError, adminFieldClass, adminLabelClass, smallButton } from "../shared";
import { GalleryRow } from "./GalleryRow";
import { accept, maxMb, messageFor, type ImagesPanelProps } from "./shared";

export function GalleryEditor({ images, onChanged }: ImagesPanelProps) {
  const fieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"image" | "alt", string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ids = images.gallery.map((image) => image.id);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setStatus(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErrors({ image: "Choose a photo to add." });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors({ image: `That image is over ${maxMb}MB.` });
      return;
    }

    setBusy(true);
    try {
      onChanged(await uploadGalleryImage(file, alt));
      if (fileRef.current) fileRef.current.value = "";
      setAlt("");
      setStatus("Photo added to the gallery.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors) {
        setErrors(caught.fieldErrors);
      } else {
        setErrors({ image: messageFor(caught, "image") });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 border-t border-line pt-8">
      <h3 className={adminLabelClass}>Gallery — {images.gallery.length} photos</h3>
      <p className="mt-2 font-sans text-[13px] text-slate">
        Order here is the order on the site; the layout alternates wide and narrow slots.
      </p>

      <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-white">
        {images.gallery.map((image, index) => (
          <GalleryRow
            key={image.id}
            image={image}
            index={index}
            ids={ids}
            onChanged={onChanged}
          />
        ))}
      </ul>

      <form
        noValidate
        onSubmit={(event) => void handleAdd(event)}
        className="mt-6 flex max-w-[520px] flex-col gap-4"
      >
        <h4 className={adminLabelClass}>Add a photo</h4>

        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            aria-label="Photo to add"
            aria-invalid={Boolean(errors.image)}
            aria-describedby={errors.image ? `${fieldId}-image-error` : undefined}
            className="font-sans text-[13px] text-slate file:mr-3 file:rounded-[4px] file:border-0 file:bg-navy file:px-4 file:py-2 file:font-sans file:text-[12px] file:font-bold file:tracking-[0.04em] file:text-white file:uppercase"
          />
          <FieldError id={`${fieldId}-image-error`} message={errors.image} />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${fieldId}-alt`} className={adminLabelClass}>
            Description
          </label>
          <input
            id={`${fieldId}-alt`}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            aria-invalid={Boolean(errors.alt)}
            aria-describedby={
              errors.alt ? `${fieldId}-alt-hint ${fieldId}-alt-error` : `${fieldId}-alt-hint`
            }
            className={adminFieldClass}
          />
          <p id={`${fieldId}-alt-hint`} className="font-sans text-[12px] text-slate">
            Read aloud to blind visitors in place of the photo. Say what it shows, in English, in
            one sentence — e.g. “Infinity pool overlooking the bay at sunset”.
          </p>
          <FieldError id={`${fieldId}-alt-error`} message={errors.alt} />
        </div>

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
          {busy ? "Uploading…" : "Add photo"}
        </button>
      </form>
    </div>
  );
}
