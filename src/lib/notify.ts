// Shared between the browser and the API server, so this module deliberately
// imports nothing — no asset modules, no DOM types.

/** What happened when the server tried to email the hosts. */
export interface NotifyResult {
  sent: boolean;
  /** Who the email was addressed to. Empty when nothing was attempted. */
  to: string[];
  from: string;
  /** Why it was not sent, in the mail provider's own words where there are any. */
  error?: string;
}
