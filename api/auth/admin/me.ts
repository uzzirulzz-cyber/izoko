// GET /api/auth/admin/me
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOptions, jsonOk, jsonError, verifyAdmin } from "../../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  const admin = verifyAdmin(req as any);
  if (!admin) {
    return jsonError(res, "Admin authentication required", 401);
  }

  return jsonOk(res, { success: true, admin });
}
