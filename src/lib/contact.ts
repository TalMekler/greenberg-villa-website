// Shared between the browser and the API server, so this module deliberately
// imports nothing — no asset modules, no DOM types.

/** The villa's numbers, as shown in the contact section and the guest's confirmation email. */
export const contactNumbers = {
  whatsapp: "+30 691 234 5678",
  phone: "+30 210 987 6543",
} as const;
