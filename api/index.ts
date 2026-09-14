/**
 * Vercel entry point for the API.
 *
 * An Express app is already a `(req, res)` function, so it can be the handler
 * directly. `vercel.json` rewrites every `/api/*` request here, and Express
 * routes it from the original path.
 */
export { default } from "../server/index";
