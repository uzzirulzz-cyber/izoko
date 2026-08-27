// PUT/DELETE /api/admin/products/[id] — admin only
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../../_lib/mongo";
import { formatProduct } from "../../_lib/product";
import { slugify } from "../../_lib/config";
import { handleOptions, jsonOk, jsonError, requireAdmin, AuthenticatedRequest } from "../../_lib/auth";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!requireAdmin(req, res)) return;

  const { id } = req.query as { id: string };
  if (!id) return jsonError(res, "Product id is required", 400);

  try {
    const db = await getDb();
    const col = db.collection("products");

    const filter: any = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { $or: [{ id }, { sku: id }, { slug: id }] };

    // PUT — update
    if (req.method === "PUT") {
      const body = { ...req.body };
      delete body._id;
      delete body.id;
      if (body.name && !body.slug) body.slug = slugify(body.name);
      body.updatedAt = new Date();

      const updateResult = await col.findOneAndUpdate(filter, { $set: body }, { returnDocument: "after" });
      if (!updateResult) {
        return jsonError(res, "Product not found to update.", 404);
      }
      return jsonOk(res, {
        success: true,
        message: "Product updated successfully",
        product: formatProduct(updateResult),
      });
    }

    // DELETE — remove
    if (req.method === "DELETE") {
      const deleteResult = await col.deleteOne(filter);
      if (deleteResult.deletedCount === 0) {
        return jsonError(res, "Product not found to delete.", 404);
      }
      return jsonOk(res, {
        success: true,
        message: "Product permanently removed from MongoDB catalog.",
      });
    }

    return jsonError(res, "Method not allowed", 405);
  } catch (err: any) {
    console.error("admin/products/[id] error:", err);
    return jsonError(res, err.message, 500);
  }
}
