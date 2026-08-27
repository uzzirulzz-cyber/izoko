// POST /api/admin/products/seed-if-empty
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../_lib/mongo";
import { slugify } from "../../_lib/config";
import { handleOptions, jsonOk, jsonError } from "../../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

  try {
    const db = await getDb();
    const col = db.collection("products");
    const count = await col.countDocuments();

    if (count > 0) {
      return jsonOk(res, {
        success: true,
        message: `MongoDB already contains ${count} existing products. Preserved existing database records.`,
        count,
      });
    }

    const { products } = req.body || {};
    if (!Array.isArray(products) || products.length === 0) {
      return jsonError(res, "No products provided to seed.", 400);
    }

    const docs = products.map((p: any) => ({
      ...p,
      slug: p.slug || slugify(p.name),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await col.insertMany(docs);
    return jsonOk(res, {
      success: true,
      message: `Successfully seeded ${result.insertedCount} products into empty MongoDB catalog.`,
      count: result.insertedCount,
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
