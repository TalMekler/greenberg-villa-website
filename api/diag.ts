/**
 * Temporary. Reports why importing the API fails, because Vercel reports any
 * such failure as a bare FUNCTION_INVOCATION_FAILED with no message.
 * Values of variables are never included — only whether they are set.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(_request: IncomingMessage, response: ServerResponse) {
  const report: Record<string, unknown> = {
    node: process.version,
    vercel: Boolean(process.env.VERCEL),
    env: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SECRET_KEY: Boolean(
        process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      ADMIN_EMAIL: Boolean(process.env.ADMIN_EMAIL),
      ADMIN_PASSWORD: Boolean(process.env.ADMIN_PASSWORD),
    },
  };

  try {
    await import("../server/index");
    report.importServer = "ok";
  } catch (error) {
    const problem = error as { message?: string; code?: string; stack?: string };
    report.importServer = "failed";
    report.code = problem.code;
    report.message = problem.message;
    report.stack = String(problem.stack ?? "").split("\n").slice(0, 6);
  }

  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(report, null, 2));
}
