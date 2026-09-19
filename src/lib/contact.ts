// Shared between the browser and the API server, so this module deliberately
// imports nothing — no asset modules, no DOM types.

/** The villa's numbers, as shown in the contact section and the guest's confirmation email. */
export const contactNumbers = {
  whatsapp: "+30 698 598 9511",
  phone: "+30 698 598 9511",
} as const;

/** Who answers those numbers, in each site language. */
export const contactPerson = {
  en: "Matina",
  he: "מטינה",
  el: "Ματίνα",
} as const;

const digits = (value: string) => value.replace(/\D/g, "");

/** Opens a WhatsApp chat with the number. */
export const whatsappHref = (number: string) => `https://wa.me/${digits(number)}`;

/** Dials the number. */
export const telHref = (number: string) => `tel:+${digits(number)}`;
