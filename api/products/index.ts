// GET /api/products (list with filtering & pagination)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo";
import { formatProduct } from "../_lib/product";
import { slugify } from "../_lib/config";
import { handleOptions, jsonOk, jsonError } from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const db = await getDb();
    const col = db.collection("products");

    const {
      category,
      search,
      featured,
      isHot,
      active,
      limit = "100",
      page = "1",
      sort,
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
        { name: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { sku: searchRegex },
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
