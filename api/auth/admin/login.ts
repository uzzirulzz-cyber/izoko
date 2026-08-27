// POST /api/auth/admin/login
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOptions, jsonOk, jsonError, setCookie, signAdminToken, isAdminCredentials } from "../../_lib/auth";
import { ADMIN_EMAIL } from "../../_lib/config";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return jsonError(res, "Admin email and password are required.", 400);
    }

    if (!isAdminCredentials(email, password)) {
      return jsonError(res, "Invalid administrative credentials.", 401);
    }

    const adminToken = signAdminToken({
      email: ADMIN_EMAIL,
      name: "PlayBeat Super Administrator",
    });

    setCookie(res, "adminToken", adminToken, { maxAge: 7 * 24 * 60 * 60 });

    return jsonOk(res, {
      success: true,
      token: adminToken,
      admin: {
        email: ADMIN_EMAIL,
        name: "PlayBeat Super Administrator",
        role: "admin",
      },
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
