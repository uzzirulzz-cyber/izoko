// /api/products/* — consolidated products router
// Routes:
//   GET /api/products          (list with filtering & pagination)
//   GET /api/products/:slug    (single product by slug, sku, or id)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { formatProduct } from "../_lib/product.js";
import { slugify } from "../_lib/config.js";
import { handleOptions, jsonOk, jsonError } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const db = await getDb();
    const col = db.collection("products");

    // Extract sub-path from req.url (Vercel rewrites /api/auth/:path* → /api/auth)
  // So we parse the ORIGINAL path from req.url to get the sub-route
  const url = new URL(req.url || '', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  // Drop the first 2 segments ("api", "auth" or "products" etc.)
  const pathSegments = parts.slice(2);
    const slug = pathSegments[0];

    // ============ GET /api/products/:slug ============
    if (slug) {
      let productDoc: any = await col.findOne({ slug });
      if (!productDoc) productDoc = await col.findOne({ sku: slug });
      if (!productDoc && ObjectId.isValid(slug)) {
        productDoc = await col.findOne({ _id: new ObjectId(slug) });
      }
      if (!productDoc) productDoc = await col.findOne({ id: slug });
      if (!productDoc) return jsonError(res, "Product not found", 404);
      return jsonOk(res, { success: true, product: formatProduct(productDoc) });
    }

    // ============ GET /api/products (list) ============
    const {
      category, search, featured, isHot, active,
      limit = "100", page = "1", sort,
    } = req.query as Record<string, string>;

    const query: any = {};
    if (active !== "all") query.active = { $ne: false };
    if (category && category !== "all" && category !== "All Products") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    if (featured === "true" || featured === "1") {
      query.$or = [{ isFeatured: true }, { featured: true }];
    }
    if (isHot === "true" || isHot === "1") query.isHot = true;
    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex }, { title: searchRegex }, { description: searchRegex },
        { tags: searchRegex }, { sku: searchRegex },
      ];
    }

    let sortOptions: any = { createdAt: -1 };
    if (sort === "price-asc") sortOptions = { price: 1 };
    if (sort === "price-desc") sortOptions = { price: -1 };
    if (sort === "rating") sortOptions = { rating: -1 };
    if (sort === "popular") sortOptions = { reviewCount: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [items, totalCount] = await Promise.all([
      col.find(query).sort(sortOptions).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(query),
    ]);

    return jsonOk(res, {
      success: true,
      count: items.length,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum) || 1,
      products: items.map(formatProduct),
    });
  } catch (err: any) {
    console.error("GET /api/products error:", err);
    return jsonError(res, err.message || "Failed to fetch products", 500);
  }
}
