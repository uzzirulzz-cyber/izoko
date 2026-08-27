// POST /api/admin/products (create) — admin only
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../_lib/mongo";
import { formatProduct } from "../../_lib/product";
import { slugify } from "../../_lib/config";
import { handleOptions, jsonOk, jsonError, requireAdmin, AuthenticatedRequest } from "../../_lib/auth";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);
  if (!requireAdmin(req, res)) return;

  try {
    const db = await getDb();
    const col = db.collection("products");
    const body = req.body || {};

    if (!body.name || !body.price) {
      return jsonError(res, "Product name and price are required.", 400);
    }

    const name = body.name.trim();
    const slug = body.slug ? slugify(body.slug) : slugify(name);
    const sku = body.sku ? body.sku.trim() : `PB-${Date.now().toString().slice(-6)}`;

    const existing = await col.findOne({ $or: [{ slug }, { sku }] });
    const finalSlug = existing ? `${slug}-${Math.floor(100 + Math.random() * 900)}` : slug;

    const newProductDoc = {
      sku,
      name,
      slug: finalSlug,
      category: body.category || "Digital Products",
      productType: body.productType || (body.digital !== false ? "digital" : "physical"),
      description: body.description || "",
      shortDescription: body.shortDescription || (body.description ? body.description.slice(0, 140) : ""),
      detailedDescription: body.detailedDescription || body.description || "",
      price: Number(body.price) || 0,
      originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
      compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : body.originalPrice ? Number(body.originalPrice) : undefined,
      currency: body.currency || "PKR",
      discountPercent: Number(body.discountPercent) || 0,
      image: body.image || "/playbeat-logo.png",
      gallery: Array.isArray(body.gallery) ? body.gallery : [body.image || "/playbeat-logo.png"],
      galleryImages: Array.isArray(body.galleryImages) ? body.galleryImages : [],
      additionalImages: Array.isArray(body.additionalImages) ? body.additionalImages : [],
      tags: Array.isArray(body.tags) ? body.tags : ["Verified", "Digital"],
      digital: body.digital !== undefined ? Boolean(body.digital) : true,
      stock: typeof body.stock === "number" ? body.stock : Number(body.stock) || 50,
      status: body.status || "in_stock",
      rating: Number(body.rating) || 4.9,
      reviewCount: Number(body.reviewCount) || 10,
      isHot: Boolean(body.isHot),
      isFeatured: Boolean(body.isFeatured || body.featured),
      featured: Boolean(body.featured || body.isFeatured),
      active: body.active !== undefined ? Boolean(body.active) : true,
      variants: Array.isArray(body.variants) ? body.variants : [],
      projectorSpec: body.projectorSpec,
      deliveryType: body.deliveryType || "Instant Auto-Email",
      deliveryInfo: body.deliveryInfo || "Instant 15-Second Key Delivery",
      region: body.region || "Global",
      features: Array.isArray(body.features) ? body.features : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await col.insertOne(newProductDoc);

    return jsonOk(res, {
      success: true,
      message: "Product created successfully in MongoDB",
      product: formatProduct({ _id: insertResult.insertedId, ...newProductDoc }),
    }, 201);
  } catch (err: any) {
    console.error("POST /api/admin/products error:", err);
    return jsonError(res, err.message || "Failed to create product", 500);
  }
}
