// GET /api/admin/users — list all users for staff management
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo";
import { handleOptions, jsonOk, jsonError, requireAdmin, AuthenticatedRequest } from "../_lib/auth";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);
  if (!requireAdmin(req, res)) return;

  try {
    const db = await getDb();
    const usersCol = db.collection("users");
    const users = await usersCol
      .find({})
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    return jsonOk(res, {
      success: true,
      users: users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role || "user",
        staffId: u.staffId || null,
        provider: u.provider || "local",
        createdAt: u.createdAt,
      })),
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
