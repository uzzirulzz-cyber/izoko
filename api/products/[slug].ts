// GET /api/products/[slug]
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo";
import { formatProduct } from "../_lib/product";
import { handleOptions, jsonOk, jsonError } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const { slug } = req.query as { slug: string };
    const db = await getDb();
    const col = db.collection("products");

    let productDoc: any = await col.findOne({ slug });
    if (!productDoc) productDoc = await col.findOne({ sku: slug });
    if (!productDoc && ObjectId.isValid(slug)) {
      productDoc = await col.findOne({ _id: new ObjectId(slug) });
    }
    if (!productDoc) productDoc = await col.findOne({ id: slug });

    if (!productDoc) {
      return jsonError(res, "Product not found", 404);
    }

    return jsonOk(res, { success: true, product: formatProduct(productDoc) });
  } catch (err: any) {
    console.error("GET /api/products/:slug error:", err);
    return jsonError(res, err.message || "Failed to fetch product", 500);
  }
}
