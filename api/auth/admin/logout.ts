// POST /api/auth/admin/logout
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOptions, jsonOk, clearCookie } from "../../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  clearCookie(res, "adminToken");
  return jsonOk(res, { success: true, message: "Admin session terminated." });
}
