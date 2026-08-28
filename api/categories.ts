// GET /api/categories
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/mongo.js";
import { slugify } from "./_lib/config.js";
import { handleOptions, jsonOk, jsonError } from "./_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const db = await getDb();
    const col = db.collection("products");

    const counts = await col
      .aggregate([
        { $match: { active: { $ne: false } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const totalActive = await col.countDocuments({ active: { $ne: false } });

    return jsonOk(res, {
      success: true,
      categories: [
        { name: "All Products", slug: "all", count: totalActive },
        ...counts.map((c: any) => ({
          name: c._id || "Other",
          slug: slugify(c._id || "Other"),
          count: c.count,
        })),
      ],
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
