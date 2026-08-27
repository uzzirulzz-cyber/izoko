// GET /api/orders/me — current user's orders
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo";
import { handleOptions, jsonOk, jsonError, requireUser, AuthenticatedRequest } from "../_lib/auth";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);
  if (!requireUser(req, res)) return;

  try {
    const db = await getDb();
    const ordersCol = db.collection("orders");
    const orders = await ordersCol
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return jsonOk(res, { success: true, orders });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
