// POST /api/admin/staff/promote — assign staffId to a normal user
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
    const { userId, staffId } = req.body || {};
    if (!userId || !staffId) {
      return jsonError(res, "userId and staffId are required.", 400);
    }

    const db = await getDb();
    const usersCol = db.collection("users");

    const target = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!target) {
      return jsonError(res, "User not found.", 404);
    }
    if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return jsonError(res, "Cannot modify the super administrator account.", 403);
    }

    const existingStaffId = await usersCol.findOne({ staffId: staffId.trim() });
    if (existingStaffId && existingStaffId._id.toString() !== userId) {
      return jsonError(res, "Staff ID is already assigned to another user.", 409);
    }

    await usersCol.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: "staff", staffId: staffId.trim(), promotedAt: new Date() } }
    );

    return jsonOk(res, {
      success: true,
      message: `User promoted to staff with Staff ID ${staffId}.`,
      staff: {
        id: userId,
        name: target.name,
        email: target.email,
        role: "staff",
        staffId: staffId.trim(),
      },
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
