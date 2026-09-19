import { uploadSingleImage } from "../../../lib/api";
import { ExploreEditor } from "./ExploreEditor";
import { GalleryEditor } from "./GalleryEditor";
import { SingleImageEditor } from "./SingleImageEditor";
import type { ImagesPanelProps } from "./shared";

export function ImagesPanel({ images, onChanged }: ImagesPanelProps) {
  return (
    <div>
      <SingleImageEditor
        label="Hero photo"
        hint="The full-screen photo behind the site title."
        image={images.hero}
        upload={(file, alt) => uploadSingleImage("hero", file, alt)}
        onChanged={onChanged}
      />

      <div className="mt-10 border-t border-line pt-8">
        <SingleImageEditor
          label="About photo"
          hint='The photo beside "Perched above the turquoise waters".'
          image={images.lifestyle}
          upload={(file, alt) => uploadSingleImage("lifestyle", file, alt)}
          onChanged={onChanged}
        />
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <SingleImageEditor
          label="Host photo"
          hint="The round portrait beside the contact form. It is cropped to a circle, so keep the face centred."
          image={images.hosts}
          previewClass="size-[120px] shrink-0 rounded-full object-cover"
          upload={(file, alt) => uploadSingleImage("hosts", file, alt)}
          onChanged={onChanged}
        />
      </div>

      <GalleryEditor images={images} onChanged={onChanged} />
      <ExploreEditor images={images} onChanged={onChanged} />
    </div>
  );
}
