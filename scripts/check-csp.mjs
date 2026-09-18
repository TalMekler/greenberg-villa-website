/**
 * Fails the build when an inline <script> in index.html is not allowed by the
 * Content-Security-Policy in vercel.json.
 *
 * The CSP permits inline scripts only by their SHA-256. Edit the language
 * script in index.html without updating the hash and production would quietly
 * block it; this turns that into a build error that prints the new hash.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

const csp = vercel.headers
  .flatMap((rule) => rule.headers)
  .find((header) => header.key === "Content-Security-Policy")?.value;
if (!csp) {
  console.error("check-csp: no Content-Security-Policy in vercel.json");
  process.exit(1);
}

const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
const missing = inline
  .map(([, body]) => `'sha256-${createHash("sha256").update(body).digest("base64")}'`)
  .filter((hash) => !csp.includes(hash));

if (missing.length > 0) {
  console.error(
    `check-csp: index.html has inline script(s) the CSP does not allow.\n` +
      `Put these in script-src in vercel.json (and drop any stale hash):\n  ${missing.join("\n  ")}`,
  );
  process.exit(1);
}
console.log(`check-csp: ${inline.length} inline script(s) allowed by the CSP.`);
