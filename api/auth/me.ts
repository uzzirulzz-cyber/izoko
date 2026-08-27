// GET /api/auth/me (verify current user session)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo";
import { handleOptions, jsonOk, jsonError, verifyUser, AuthenticatedRequest } from "../_lib/auth";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const decoded = verifyUser(req);
    if (!decoded) {
      return jsonError(res, "Authentication required", 401);
    }

    const db = await getDb();
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({ _id: new ObjectId(decoded.id) });
    if (!user) {
      return jsonError(res, "User not found", 404);
    }

    return jsonOk(res, {
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || "user",
        provider: user.provider || "local",
      },
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
