import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { legalPath } from "../../../legal";
import { contactChannels } from "../../../data/site";
import { contactPerson } from "../../../lib/contact";
import { useLanguage } from "../../../i18n";
import type { Dictionary } from "../../../i18n";
import { toDateKey } from "../../../lib/date";
import { localizeAlt } from "../../../i18n/imageAlts";
import type { SiteImage } from "../../../lib/site-images";
import { ApiError, createInquiry } from "../../../lib/api";
import { Icon } from "../../ui/Icon";
import { SectionHeading } from "../../ui/SectionHeading";
import type { Stay } from "../../../lib/stay";
import { DateInput } from "./DateInput";
import { FieldError } from "./FieldError";
import { RequestSent } from "./RequestSent";
import type { FormErrors, FormValues } from "./types";

interface ContactProps {
  stay: Stay | null;
  /** The host's portrait; null until the site photos have loaded. */
  hostsImage: SiteImage | null;
}

const emptyValues: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  checkIn: "",
  checkOut: "",
  guests: "4",
  message: "",
};

// The border and placeholder are strong enough to find the field by (3:1 and
// 4.5:1 on navy); focus adds the page's cream ring on top of the border change.
const fieldClass =
  "w-full rounded-[4px] border border-cream/50 bg-[rgba(42,78,112,0.5)] px-4 font-sans text-[14px] text-cream transition-colors placeholder:text-cream/70 hover:border-cream/80 focus:border-cream";

const labelClass = "font-sans text-[12px] font-bold tracking-[0.06em] text-cream uppercase";

/** The visible required marker; the field itself carries aria-required. */
function Required() {
  return (
    <span aria-hidden="true" className="text-terracotta-soft">
      {" *"}
    </span>
  );
}

/** Validated fields, in the order they appear — the first failing one gets focus. */
const fieldOrder = ["firstName", "lastName", "email", "checkIn", "checkOut"] as const;

/** Largest party the villa accepts. */
const maxGuests = 12;

function validate(values: FormValues, t: Dictionary): FormErrors {
  const errors: FormErrors = {};

  if (!values.firstName.trim()) errors.firstName = t.contact.errors.firstName;
  if (!values.lastName.trim()) errors.lastName = t.contact.errors.lastName;

  if (!values.email.trim()) {
    errors.email = t.contact.errors.emailRequired;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = t.contact.errors.emailInvalid;
  }

  if (!values.checkIn) errors.checkIn = t.contact.errors.checkIn;
  if (!values.checkOut) {
    errors.checkOut = t.contact.errors.checkOut;
  } else if (values.checkIn && values.checkOut <= values.checkIn) {
    errors.checkOut = t.contact.errors.checkOutOrder;
  }

  return errors;
}

/** Maps each channel's icon to its dictionary label. */
const channelLabels = {
  messageSquare: "whatsapp",
  phone: "phone",
  mail: "email",
} as const;

export function Contact({ stay, hostsImage }: ContactProps) {
  const { t, language } = useLanguage();
  const hostsAlt = hostsImage ? localizeAlt(hostsImage.alt, language, t.contact.hosts.photoAlt) : null;
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const policyLinkRef = useRef<HTMLAnchorElement>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmation, setConfirmation] = useState<FormValues | null>(null);
  // The form unmounts while the confirmation shows, and the scroll-reveal observer
  // only sees elements present on first render — so a form that comes back after
  // a send has to arrive already visible.
  const [hasSent, setHasSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Carry a stay picked in the availability calendar straight into the form.
  // Adjusted during render rather than in an effect, so the inputs never flash
  // the stale dates first.
  const [lastStay, setLastStay] = useState(stay);
  if (stay !== lastStay) {
    setLastStay(stay);
    if (stay) {
      setValues((current) => ({
        ...current,
        checkIn: toDateKey(stay.start),
        checkOut: stay.end ? toDateKey(stay.end) : current.checkOut,
      }));
      setErrors((current) => ({ ...current, checkIn: undefined, checkOut: undefined }));
      setConfirmation(null);
    }
  }

  // Neither date can be in the past.
  const today = toDateKey(new Date());

  const setField = (field: keyof FormValues) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values, t);
    setErrors(nextErrors);
    setSubmitError(null);

    if (Object.keys(nextErrors).length > 0) {
      setConfirmation(null);
      // One announcement for the whole form, then focus on the first field to
      // fix — its error is read with it through aria-describedby.
      setSubmitError(t.contact.errors.fieldsHighlighted);
      focusFirstInvalid(nextErrors);
      return;
    }

    setSending(true);
    try {
      await createInquiry(values, language);
      setConfirmation(values);
      setHasSent(true);
      setValues({ ...emptyValues, guests: values.guests });
    } catch (caught) {
      setConfirmation(null);
      // The server validates too; surface its per-field messages when it sends them.
      const { privacyPolicyVersion: outdatedPolicy, ...fieldErrors } =
        caught instanceof ApiError ? (caught.fieldErrors ?? {}) : {};
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors as FormErrors);
        setSubmitError(t.contact.errors.fieldsHighlighted);
        focusFirstInvalid(fieldErrors as FormErrors);
      } else if (outdatedPolicy) {
        // This page shows an older policy than the one in force: send the guest
        // to the link, and the alert says a reload brings the new one.
        setSubmitError(t.legal.consentOutdated);
        policyLinkRef.current?.focus();
      } else {
        setSubmitError(
          caught instanceof Error ? caught.message : t.contact.errors.generic,
        );
      }
    } finally {
      setSending(false);
    }
  };

  function focusFirstInvalid(found: FormErrors) {
    const field = fieldOrder.find((name) => found[name]);
    if (field) formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }

  const describedBy = (field: keyof FormValues) =>
    errors[field] ? `${formId}-${field}-error` : undefined;

  return (
    <section id="contact" className="on-dark bg-navy px-5 py-20 sm:px-8 lg:px-20 lg:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 lg:gap-[96px]">
        <SectionHeading
          eyebrow={t.contact.eyebrow}
          title={t.contact.title}
          description={t.contact.description}
          align="left"
          tone="light"
        />

        <div className="flex flex-col gap-12 lg:flex-row lg:gap-20">
          {confirmation ? (
            <RequestSent request={confirmation} onReset={() => setConfirmation(null)} />
          ) : (
          <form
            ref={formRef}
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
            className={`reveal flex w-full flex-col gap-6 lg:w-[55%] ${hasSent ? "is-visible" : ""}`}
          >
            <p className="font-sans text-[13px] text-cream">{t.contact.requiredNote}</p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor={`${formId}-firstName`} className={labelClass}>
                  {t.contact.firstName}
                  <Required />
                </label>
                <input
                  id={`${formId}-firstName`}
                  name="firstName"
                  aria-required="true"
                  autoComplete="given-name"
                  placeholder={t.contact.placeholders.firstName}
                  value={values.firstName}
                  onChange={(event) => setField("firstName")(event.target.value)}
                  aria-invalid={Boolean(errors.firstName)}
                  aria-describedby={describedBy("firstName")}
                  className={`${fieldClass} h-[52px]`}
                />
                <FieldError id={`${formId}-firstName-error`} message={errors.firstName} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${formId}-lastName`} className={labelClass}>
                  {t.contact.lastName}
                  <Required />
                </label>
                <input
                  id={`${formId}-lastName`}
                  name="lastName"
                  aria-required="true"
                  autoComplete="family-name"
                  placeholder={t.contact.placeholders.lastName}
                  value={values.lastName}
                  onChange={(event) => setField("lastName")(event.target.value)}
                  aria-invalid={Boolean(errors.lastName)}
                  aria-describedby={describedBy("lastName")}
                  className={`${fieldClass} h-[52px]`}
                />
                <FieldError id={`${formId}-lastName-error`} message={errors.lastName} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={`${formId}-email`} className={labelClass}>
                {t.contact.email}
                <Required />
              </label>
              <input
                id={`${formId}-email`}
                name="email"
                aria-required="true"
                type="email"
                autoComplete="email"
                placeholder={t.contact.placeholders.email}
                value={values.email}
                onChange={(event) => setField("email")(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy("email")}
                className={`${fieldClass} h-[52px]`}
              />
              <FieldError id={`${formId}-email-error`} message={errors.email} />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor={`${formId}-checkIn`} className={labelClass}>
                  {t.contact.checkIn}
                  <Required />
                </label>
                <DateInput
                  id={`${formId}-checkIn`}
                  name="checkIn"
                  min={today}
                  value={values.checkIn}
                  placeholder={t.contact.placeholders.date}
                  onChange={setField("checkIn")}
                  invalid={Boolean(errors.checkIn)}
                  describedBy={describedBy("checkIn")}
                  className={fieldClass}
                />
                <FieldError id={`${formId}-checkIn-error`} message={errors.checkIn} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${formId}-checkOut`} className={labelClass}>
                  {t.contact.checkOut}
                  <Required />
                </label>
                <DateInput
                  id={`${formId}-checkOut`}
                  name="checkOut"
                  min={values.checkIn || today}
                  value={values.checkOut}
                  placeholder={t.contact.placeholders.date}
                  onChange={setField("checkOut")}
                  invalid={Boolean(errors.checkOut)}
                  describedBy={describedBy("checkOut")}
                  className={fieldClass}
                />
                <FieldError id={`${formId}-checkOut-error`} message={errors.checkOut} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={`${formId}-guests`} className={labelClass}>
                {t.contact.guests}
              </label>
              <div className="relative">
                <select
                  id={`${formId}-guests`}
                  name="guests"
                  value={values.guests}
                  onChange={(event) => setField("guests")(event.target.value)}
                  className={`${fieldClass} h-[52px] appearance-none pe-12`}
                >
                  {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count} className="text-ink">
                      {count} {count === 1 ? t.units.guest : t.units.guests}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-1/2 end-4 -translate-y-1/2">
                  <Icon name="chevronDown" size={16} />
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={`${formId}-message`} className={labelClass}>
                {t.contact.message}
              </label>
              <textarea
                id={`${formId}-message`}
                name="message"
                rows={5}
                placeholder={t.contact.placeholders.message}
                value={values.message}
                onChange={(event) => setField("message")(event.target.value)}
                className={`${fieldClass} min-h-[160px] resize-y py-4 leading-[1.5]`}
              />
            </div>

            {/*
              Notice at the point of collection, as the GDPR and Israeli law both
              ask, and read before the button so sending is an informed agreement.
              The button points to it too, so a screen reader announces it there.
              The policy opens in a new tab: leaving would empty the form.
            */}
            <p id={`${formId}-consent`} className="font-sans text-[13px] leading-[1.6] text-cream">
              {t.legal.formNotice} {t.legal.consent.before}
              <Link
                ref={policyLinkRef}
                to={legalPath(language, "privacy")}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-white"
              >
                {t.legal.consent.link}
                <span className="sr-only"> {t.legal.newTab}</span>
              </Link>
              {t.legal.consent.after}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={sending}
                aria-describedby={`${formId}-consent`}
                className="inline-flex items-center justify-center rounded-[4px] border border-navy bg-white px-8 py-4 font-sans text-[14px] font-bold tracking-[0.02em] text-navy uppercase transition-all duration-200 not-disabled:hover:-translate-y-0.5 not-disabled:hover:bg-cream disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? t.contact.sending : t.contact.send}
              </button>
              {submitError ? (
                <p role="alert" className="font-sans text-[14px] text-terracotta-soft">
                  {submitError}
                </p>
              ) : null}
            </div>
          </form>
          )}

          <div className="flex w-full flex-col gap-10 lg:w-[45%]">
            <div className="reveal flex items-center gap-6 rounded-lg border border-navy-line bg-[rgba(42,78,112,0.25)] p-6">
              {hostsImage && hostsAlt ? (
                <img
                  src={hostsImage.url}
                  alt={hostsAlt.alt}
                  lang={hostsAlt.lang}
                  width={80}
                  height={80}
                  className="size-20 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div aria-hidden="true" className="size-20 shrink-0 rounded-full bg-navy-line" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-sans text-[14px] font-bold tracking-[0.06em] text-cream uppercase">
                  {t.contact.hosts.label}
                </p>
                <p className="font-serif text-[20px] text-white">{t.contact.hosts.names}</p>
                <p className="font-sans text-[12px] leading-[1.5] text-cream">
                  {t.contact.hosts.quote}
                </p>
              </div>
            </div>

            <ul className="reveal flex flex-col gap-5">
              {contactChannels.map((channel) => (
                <li key={channel.icon}>
                  <a
                    href={channel.href}
                    // WhatsApp opens in a new tab on a desktop; the site stays put.
                    {...(channel.href.startsWith("https:")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="group flex items-center gap-4 rounded-lg transition-opacity hover:opacity-80"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgba(42,78,112,0.5)] transition-colors group-hover:bg-[rgba(42,78,112,0.9)]">
                      <Icon name={channel.icon} size={18} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-sans text-[11px] font-bold tracking-[0.06em] text-cream uppercase">
                        {t.contact.channels[channelLabels[channel.icon]]}
                      </span>
                      {/* Numbers and addresses read left to right, even on the Hebrew page. */}
                      <span className="font-sans text-[16px] text-white">
                        <span dir="ltr">{channel.value}</span>
                        {channel.withPerson ? (
                          <span className="text-cream"> ({contactPerson[language]})</span>
                        ) : null}
                        {channel.href.startsWith("https:") ? (
                          <span className="sr-only"> {t.legal.newTab}</span>
                        ) : null}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
