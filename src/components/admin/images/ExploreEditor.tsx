import { exploreSlugOrder } from "../../../data/site";
import { en } from "../../../i18n/en";
import { uploadExploreImage } from "../../../lib/api";
import { adminLabelClass } from "../shared";
import { SingleImageEditor } from "./SingleImageEditor";
import type { ImagesPanelProps } from "./shared";

/** The six explore cards. Their text is editorial content; only photos change. */
export function ExploreEditor({ images, onChanged }: ImagesPanelProps) {
  return (
    <div className="mt-10 border-t border-line pt-8">
      <h3 className={adminLabelClass}>Explore the area — 6 cards</h3>
      <p className="mt-2 font-sans text-[13px] text-slate">
        One photo per card. The card titles and text live in the code, not here.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {exploreSlugOrder.map((slug, index) => {
          // The admin is English-only; card names come from the English dictionary.
          const card = en.explore.cards[index];
          return (
            <div key={slug} className="rounded-lg border border-line p-4">
              <SingleImageEditor
                label={card?.title ?? slug}
                image={images.explore[slug]}
                previewClass="h-[96px] w-full rounded-[4px] object-cover sm:w-[140px]"
                upload={(file, alt) => uploadExploreImage(slug, file, alt)}
                onChanged={onChanged}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
