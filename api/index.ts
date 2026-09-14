/**
 * Vercel entry point for the API.
 *
 * It imports a *bundle*, not the source tree. Vercel compiles files under
 * `api/` but does not ship `server/` alongside them, so importing the source
 * directly fails at runtime with ERR_MODULE_NOT_FOUND. `npm run build:api`
 * rolls the whole server into `api/_server.mjs` first, leaving node_modules
 * external for Vercel to install.
 *
 * An Express app is already a `(req, res)` function, so it is the handler.
 */
export { default } from "./_server.mjs";
