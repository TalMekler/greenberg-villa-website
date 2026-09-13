import { transitIcons } from "../../data/site";
import { useLanguage } from "../../i18n";
import { Icon } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";

export function Transit() {
  const { t } = useLanguage();

  return (
    <section id="transit" className="bg-shell px-5 py-20 sm:px-8 lg:px-20 lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 lg:gap-16">
        <SectionHeading
          eyebrow={t.transit.eyebrow}
          title={t.transit.title}
          description={t.transit.description}
        />

        <ol className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {t.transit.steps.map((step, index) => (
            <li
              // Keyed on the icon, not the kicker: a translated key would make React
              // remount the card on every language change.
              key={transitIcons[index]}
              className="reveal flex flex-col gap-6 rounded-lg border border-line bg-sand p-8 transition-colors duration-300 hover:border-terracotta/40 lg:p-10"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-[28px] text-terracotta">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex size-11 items-center justify-center rounded-full bg-white">
                  <Icon name={transitIcons[index]} size={20} />
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <p className="font-sans text-[14px] font-bold tracking-[0.08em] text-slate uppercase">
                  {step.kicker}
                </p>
                <h3 className="heading-card font-serif text-[22px] text-navy">{step.title}</h3>
                <p className="font-sans text-[15px] leading-[1.6] text-slate">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
