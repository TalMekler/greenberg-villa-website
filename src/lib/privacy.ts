// Shared between the browser and the API server, so this module deliberately
// imports nothing — no asset modules, no DOM types.

/**
 * The version of the Privacy Policy the contact form shows. The form sends it
 * with every booking request, and the server stores it, with the time, as the
 * guest's agreement ("By submitting you agree to the Privacy Policy").
 *
 * Change it whenever the policy in src/legal/ changes in substance, and set
 * `operator.lastUpdated` to match. The server accepts only the current
 * version, so a request from a page still showing an older policy is turned
 * away with a prompt to reload, rather than recorded against text the guest
 * never saw.
 */
export const PRIVACY_POLICY_VERSION = "2026-09-18";
