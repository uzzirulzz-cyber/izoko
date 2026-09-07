// /api/products/* — consolidated products router
// Routes:
//   GET  /api/products              (list with filtering & pagination)
//   GET  /api/products/:slug        (single product by slug, sku, or id)
//   GET  /api/products/reviews      (approved reviews for a product + summary)
//   POST /api/products/reviews      (create review — verified purchasers only)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { formatProduct } from "../_lib/product.js";
import { slugify } from "../_lib/config.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireUser,
  AuthenticatedRequest,
} from "../_lib/auth.js";

const REVIEW_STATUSES = new Set(["pending", "approved", "hidden"]);

async function resolveProductId(db: any, ref: any): Promise<any | null> {
  const productsCol = db.collection("products");
  const refStr = String(ref || "").trim();
  if (!refStr) return null;
  let doc: any = null;
  try {
    doc = await productsCol.findOne({ slug: refStr });
    if (!doc) doc = await productsCol.findOne({ sku: refStr });
    if (!doc && ObjectId.isValid(refStr)) doc = await productsCol.findOne({ _id: new ObjectId(refStr) });
    if (!doc) doc = await productsCol.findOne({ id: refStr });
  } catch {
    return null;
  }
  return doc || null;
}

/** Verified purchase check: a PAID order by this user containing this product. */
async function hasVerifiedPurchase(db: any, userId: string, product: any): Promise<any | null> {
  const ordersCol = db.collection("orders");
  const candidates = await ordersCol
    .find({
      userId,
      $or: [
        { paymentStatus: "paid" },
        { status: "completed", paymentStatus: { $ne: "pending" } },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  // Orders may reference the product by Mongo _id, storefront id, sku or slug
  // (legacy flows) — accept any of them.
  const ids = new Set(
    [String(product._id || ""), String(product.id || ""), String(product.sku || ""), String(product.slug || "")]
      .filter((x) => x && x !== "undefined")
  );
  for (const o of candidates) {
    for (const it of o.items || []) {
      if (ids.has(String(it.productId || ""))) return o;
    }
  }
  return null;
}

async function productSummary(db: any, productId: string) {
  const col = db.collection("reviews");
  const approved = await col
    .find({ productId, status: "approved" })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  const count = approved.length;
  const avg = count ? approved.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / count : 0;
  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of approved) {
    const k = String(Math.min(5, Math.max(1, Math.round(Number(r.rating || 0)))));
    distribution[k] = (distribution[k] || 0) + 1;
  }
  return { avg: Number(avg.toFixed(2)), count, distribution };
}

async function handleReviews(req: AuthenticatedRequest, res: VercelResponse): Promise<boolean> {
  const seg = new URL(req.url || "", "http://localhost").pathname
    .split("/")
    .filter(Boolean)
    .slice(2);

  // ============ GET /api/products/reviews?productId=… ============
  if (seg[0] === "reviews" && req.method === "GET") {
    const q = req.query as Record<string, string>;
    const db = await getDb();
    const product = await resolveProductId(db, q.productId || q.slug || q.id);
    if (!product) return jsonError(res, "Product not found.", 404), true;
    const pid = String(product._id);
    const [{ avg, count, distribution }, reviews] = await Promise.all([
      productSummary(db, pid),
      db
        .collection("reviews")
        .find({ productId: pid, status: "approved" })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray(),
    ]);
    jsonOk(res, {
      success: true,
      summary: { avg, count, distribution },
      reviews: reviews.map((r: any) => ({
        id: String(r._id),
        userName: r.userName || "PlayBeat Customer",
        rating: r.rating,
        title: r.title || "",
        body: r.body,
        featured: Boolean(r.featured),
        verifiedPurchase: true,
        createdAt: r.createdAt,
      })),
    });
    return true;
  }

  // ============ POST /api/products/reviews (signed-in, verified purchase) ============
  if (seg[0] === "reviews" && req.method === "POST") {
    const user = requireUser(req, res);
    if (!user) return true;
    const { productId, slug, rating, title, body } = req.body || {};
    const db = await getDb();
    const product = await resolveProductId(db, productId || slug);
    if (!product) return jsonError(res, "Product not found.", 404), true;

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return jsonError(res, "Rating must be between 1 and 5.", 400), true;
    }
    const bodyStr = String(body || "").trim();
    if (bodyStr.length < 10) return jsonError(res, "Please write at least 10 characters about the product.", 400), true;
    if (bodyStr.length > 2000) return jsonError(res, "Review text is too long (max 2000 characters).", 400), true;

    const pid = String(product._id);
    const order = await hasVerifiedPurchase(db, String(user.id), product);
    if (!order) {
      // Red line: only verified purchasers may review.
      return jsonError(res, "Only verified purchasers can review this product. Buy it first — then share your experience.", 403), true;
    }

    const reviewsCol = db.collection("reviews");
    const existing = await reviewsCol.findOne({ productId: pid, userId: String(user.id) });
    if (existing) {
      return jsonError(res, "You have already reviewed this product.", 409), true;
    }

    // Output escaping: store plain text; the storefront renders as text.
    const doc = {
      productId: pid,
      productSlug: product.slug || "",
      userId: String(user.id),
      userName: String(user.name || user.email || "PlayBeat Customer").slice(0, 60),
      orderNumber: order.orderNumber,
      rating: Math.round(ratingNum),
      title: String(title || "").slice(0, 120),
      body: bodyStr,
      status: "pending", // admin moderation gate
      featured: false,
      createdAt: new Date(),
    };
    const ins = await reviewsCol.insertOne(doc);
    jsonOk(res, {
      success: true,
      message: "Thank you! Your review was submitted and will appear once a moderator approves it.",
      review: { id: String(ins.insertedId), status: doc.status },
    }, 201);
    return true;
  }

  return false;
}

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // Reviews sub-routes (GET public, POST signed-in)
  const seg0 = new URL(req.url || "", "http://localhost").pathname
    .split("/")
    .filter(Boolean)
    .slice(2)[0];
  if (seg0 === "reviews") {
    try {
      if (await handleReviews(req, res)) return;
    } catch (err: any) {
      console.error("reviews route error:", err);
      return jsonError(res, err?.message || "Review request failed.", 500);
    }
  }

  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const db = await getDb();
    const col = db.collection("products");

    // Extract sub-path from req.url (Vercel rewrites /api/products/:path* → /api/products)
    const url = new URL(req.url || '', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
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
      category, cat, categories, search, featured, isHot, active,
      limit = "100", page = "1", sort,
    } = req.query as Record<string, string>;

    const query: any = {};
    if (active !== "all") query.active = { $ne: false };

    // ---- Registry-driven category filter (`cat` = category slug or alias) ----
    // Resolves through the `categories` registry (Section 3 core decision):
    // the frontend only ever sends a slug; which product categories + tag
    // matcher apply is decided HERE from the DB registry.
    if (cat && cat !== "all") {
      let entry: any = null;
      try {
        entry = await db.collection("categories").findOne({
          enabled: { $ne: false },
          $or: [{ slug: String(cat).toLowerCase() }, { aliases: String(cat).toLowerCase() }],
        });
      } catch { /* registry unreadable → fall back to plain category match */ }
      if (entry) {
        const cats: string[] = (entry.productCategories || []).map((c: string) => new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
        const conds: any[] = cats.length ? [{ $or: cats.map((re) => ({ category: re })) }] : [];
        if (entry.tagRegex) {
          try {
            const re = new RegExp(String(entry.tagRegex).slice(0, 200), "i");
            // product-level regex is evaluated post-query (small catalog)
            const docs = await col
              .find({ active: { $ne: false } })
              .limit(400)
              .toArray();
            const matched = docs.filter((d: any) =>
              re.test(`${d.name || ""} ${(Array.isArray(d.tags) ? d.tags : []).join(" ")} ${d.category || ""}`)
            );
            return jsonOk(res, {
              success: true,
              count: matched.length,
              total: matched.length,
              page: 1,
              totalPages: 1,
              category: entry.label,
              products: matched.map(formatProduct),
            });
          } catch { /* bad regex → ignore matcher */ }
        }
        if (conds.length) query.$and = conds;
        else if (cats.length === 0) query.category = { $regex: new RegExp(`^${String(cat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
      } else {
        query.category = { $regex: new RegExp(`^${String(cat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
      }
    } else if (categories) {
      // Comma-separated exact category names (legacy helper)
      const list = String(categories)
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((c) => new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
      if (list.length) query.$or = list.map((re) => ({ category: re }));
    } else if (category && category !== "all" && category !== "All Products") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    if (featured === "true" || featured === "1") {
      query.$or = [{ isFeatured: true }, { featured: true }];
    }
    if (isHot === "true" || isHot === "1") query.isHot = true;
    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim().slice(0, 80), "i");
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
