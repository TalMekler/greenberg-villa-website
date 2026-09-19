// Shared between the browser and the API server, so this module deliberately
// imports nothing — no asset modules, no DOM types.

/** The villa's numbers, as shown in the contact section and the guest's confirmation email. */
export const contactNumbers = {
  whatsapp: "+30 698 598 9511 (Matina)",
  phone: "+30 698 598 9511 (Matina)",
} as const;
