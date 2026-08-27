// GET /api/admin/staff — list staff + super admin info
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../_lib/mongo";
import { handleOptions, jsonOk, jsonError, requireAdmin, AuthenticatedRequest } from "../../_lib/auth";
import { ADMIN_EMAIL } from "../../_lib/config";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);
  if (!requireAdmin(req, res)) return;

  try {
    const db = await getDb();
    const usersCol = db.collection("users");
    const staff = await usersCol
      .find({ role: { $in: ["staff", "admin"] } })
      .project({ password: 0 })
      .toArray();

    return jsonOk(res, {
      success: true,
      staff: staff.map((s: any) => ({
        id: s._id.toString(),
        name: s.name,
        email: s.email,
        role: s.role,
        staffId: s.staffId || null,
        provider: s.provider || "local",
        createdAt: s.createdAt,
      })),
      superAdmin: { email: ADMIN_EMAIL, role: "super_admin" },
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
