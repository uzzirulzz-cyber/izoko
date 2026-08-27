// POST /api/auth/forgot-password
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOptions, jsonOk, jsonError } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

  const { email } = req.body || {};
  if (!email) {
    return jsonError(res, "Email is required.", 400);
  }

  // Always return success to prevent email enumeration
  return jsonOk(res, {
    success: true,
    message:
      "If an account exists with this email, a password reset link has been dispatched.",
  });
}
