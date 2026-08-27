// POST /api/admin/staff/demote
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../../_lib/mongo";
import { handleOptions, jsonOk, jsonError, requireAdmin, AuthenticatedRequest } from "../../_lib/auth";
import { ADMIN_EMAIL } from "../../_lib/config";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);
  if (!requireAdmin(req, res)) return;

  try {
    const { userId } = req.body || {};
    if (!userId) {
      return jsonError(res, "userId is required.", 400);
    }

    const db = await getDb();
    const usersCol = db.collection("users");

    const target = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!target) {
      return jsonError(res, "User not found.", 404);
    }
    if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return jsonError(res, "Cannot demote the super administrator account.", 403);
    }

    await usersCol.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: "user" }, $unset: { staffId: "" } }
    );

    return jsonOk(res, {
      success: true,
      message: "Staff privileges revoked. User reverted to normal account.",
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
