// /api/mongodb/* — Product Importer & Database Sync router (verifyAdmin-protected)
// Routes:
//   POST /api/mongodb/test             (test connection + list dbs/collections)
//   GET  /api/mongodb/products         (fetch products from remote collection)
//   POST /api/mongodb/products/upload  (import products — duplicate-aware, attaches variants instead of duplicating)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MongoClient, ServerApiVersion } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { slugify, MONGODB_URI, cleanMongoUri } from "../_lib/config.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireAdmin,
  AuthenticatedRequest,
} from "../_lib/auth.js";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!requireAdmin(req, res)) return;

  const url = new URL(req.url || "", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const pathSegments = parts.slice(2); // drop "api", "mongodb"
  const route = pathSegments.join("/").toLowerCase();

  // ============ POST /api/mongodb/test ============
  if (route === "test" && req.method === "POST") {
    const started = Date.now();
    try {
      const body = req.body || {};
      const uri = cleanMongoUri(body.uri || MONGODB_URI);
      const dbName = body.dbName || "playbeat";
      const client = new MongoClient(uri, {
        serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
        connectTimeoutMS: 8000,
        serverSelectionTimeoutMS: 8000,
      });
      await client.connect();
      const admin = client.db().admin();
      const dbsInfo = await admin.listDatabases();
      const dbNames: string[] = (dbsInfo.databases || []).map((d: any) => d.name);
      const target = client.db(dbName);
      const colls = await target.listCollections().toArray();
      const colNames = colls.map((c: any) => c.name);
      const counts: Record<string, number> = {};
      for (const c of colNames) {
        try {
          counts[c] = await target.collection(c).countDocuments();
        } catch {
          counts[c] = 0;
        }
      }
      const latency = Date.now() - started;
      await client.close();
      return jsonOk(res, {
        success: true,
        latencyMs: latency,
        databases: dbNames,
        collections: colNames,
        counts,
        message: `Connected to MongoDB cluster in ${latency}ms`,
      });
    } catch (err: any) {
      return jsonError(res, `Connection failed: ${err.message}`, 502);
    }
  }

  // ============ GET /api/mongodb/products?dbName=&collection= ============
  if (route === "products" && req.method === "GET") {
    try {
      const q = url.searchParams;
      const dbName = q.get("dbName") || "playbeat";
      const collection = q.get("collection") || "products";
      const limit = Math.min(parseInt(q.get("limit") || "500", 10) || 500, 2000);
      const db = await getDb(dbName);
      const docs = await db
        .collection(collection)
        .find({})
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .toArray();
      return jsonOk(res, {
        success: true,
        count: docs.length,
        products: docs.map((p: any) => ({
          id: p._id?.toString?.() || p.id,
          sku: p.sku || `PB-${(p._id?.toString?.() || "").slice(-6)}`,
          name: p.name || p.title || "Unnamed Product",
          category: p.category || "Digital Products",
          description: p.description || p.shortDescription || "",
          price: Number(p.price) || 0,
          originalPrice: p.originalPrice || p.compareAtPrice || undefined,
          stock: Number(p.stock) || 0,
          digital: p.digital !== false && p.productType !== "physical",
          image: p.image || (p.images && p.images[0]) || "",
          galleryImages: p.galleryImages || p.additionalImages || p.images || [],
          rating: Number(p.rating) || 4.9,
          reviewCount: Number(p.reviewCount) || 0,
          deliveryType: p.deliveryType || p.deliveryMethod || "Instant Auto-Email",
          region: p.region || "Global",
          tags: Array.isArray(p.tags) ? p.tags : [],
          variants: Array.isArray(p.variants) ? p.variants : [],
          slug: p.slug || slugify(p.name || ""),
        })),
      });
    } catch (err: any) {
      return jsonError(res, `Fetch failed: ${err.message}`, 502);
    }
  }

  // ============ POST /api/mongodb/products/upload ============
  // Variant-aware import: for each incoming product, if a matching catalog product
  // already exists (same slug / sku / normalized name), DO NOT insert a duplicate.
  // Instead the incoming product is attached to the existing product as a VARIANT
  // (choose-and-select at storefront). Only genuinely new products are inserted.
  if (route === "products/upload" && req.method === "POST") {
    try {
      const body = req.body || {};
      const products: any[] = Array.isArray(body.products) ? body.products : [];
      if (products.length === 0) return jsonError(res, "No products provided to import.", 400);
      const replaceAll = Boolean(body.replaceAll);
      const db = await getDb();
      const col = db.collection("products");

      // Replace-all mode: wipe catalog first (restorable via restore points)
      if (replaceAll) {
        const total = await col.countDocuments();
        if (total > 0) {
          const snapshot = await col.find({}).toArray();
          await db.collection("backups").insertOne({
            name: `Auto-backup before replace-all import (${new Date().toISOString()})`,
            type: "auto_pre_import",
            createdAt: new Date(),
            createdBy: "system:importer",
            collections: { products: snapshot },
            counts: { products: snapshot.length },
          });
          await col.deleteMany({});
        }
      }

      const normalize = (s: string) =>
        (s || "")
          .toString()
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/[^a-z0-9 ]/g, "")
          .trim();

      // Load existing catalog for matching
      const existingDocs = await col.find({}).toArray();
      const bySlug = new Map<string, any>();
      const bySku = new Map<string, any>();
      const byNormName = new Map<string, any>();
      existingDocs.forEach((d: any) => {
        if (d.slug) bySlug.set(String(d.slug).toLowerCase(), d);
        if (d.sku) bySku.set(String(d.sku).toLowerCase(), d);
        if (d.name) byNormName.set(normalize(d.name), d);
      });

      const inserted: any[] = [];
      const attachedVariants: { product: string; variant: string }[] = [];
      const skipped: { product: string; reason: string }[] = [];

      for (const p of products) {
        const name = (p.name || "").toString().trim() || "Unnamed Product";
        const slug = slugify(p.slug || name);
        const sku = (p.sku || `PB-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`)
          .toString()
          .trim();
        const normName = normalize(name);

        const match =
          bySku.get(sku.toLowerCase()) ||
          bySlug.get(slug.toLowerCase()) ||
          byNormName.get(normName);

        if (match) {
          // Check exact duplicate variant (same variant name already present)
          const variantName = (p.variantName || p.region || "Standard").toString();
          const existingVariants: any[] = Array.isArray(match.variants) ? match.variants : [];
          const alreadyVariant = existingVariants.some(
            (v: any) => normalize(v.name) === normalize(variantName)
          );
          if (alreadyVariant) {
            skipped.push({ product: name, reason: `Variant "${variantName}" already exists on ${match.name}` });
            continue;
          }
          // Attach as variant — choose-and-select from storefront
          const variantDoc = {
            id: `var-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`,
            name: variantName,
            price: Number(p.price) || 0,
            originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
            sku,
            badge: p.badge || p.region || undefined,
          };
          await col.updateOne(
            { _id: match._id },
            {
              $set: { updatedAt: new Date() },
              $push: { variants: variantDoc } as any,
            }
          );
          bySlug.set(String(match.slug || "").toLowerCase(), { ...match, variants: [...existingVariants, variantDoc] });
          bySku.set(sku.toLowerCase(), match);
          attachedVariants.push({ product: match.name, variant: variantName });
          continue;
        }

        // Genuinely new product — insert
        const doc = {
          sku,
          name,
          slug,
          category: p.category || "Digital Products",
          productType: p.digital === false ? "physical" : "digital",
          description: p.description || "",
          shortDescription: p.description ? String(p.description).slice(0, 140) : "",
          price: Number(p.price) || 0,
          originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
          image: p.image || "/playbeat-logo.png",
          galleryImages: Array.isArray(p.galleryImages) ? p.galleryImages : [],
          tags: Array.isArray(p.tags) ? p.tags : ["Imported", "Verified"],
          digital: p.digital !== false,
          stock: Number(p.stock) || 50,
          status: Number(p.stock) === 0 ? "out_of_stock" : "in_stock",
          rating: Number(p.rating) || 4.9,
          reviewCount: Number(p.reviewCount) || 0,
          isHot: Boolean(p.isHot),
          isFeatured: Boolean(p.isFeatured),
          active: true,
          deliveryType: p.deliveryType || "Instant Auto-Email",
          region: p.region || "Global",
          variants: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const r = await col.insertOne(doc);
        inserted.push({ id: r.insertedId.toString(), name, slug });
        bySlug.set(slug.toLowerCase(), { ...doc, _id: r.insertedId });
        bySku.set(sku.toLowerCase(), { ...doc, _id: r.insertedId });
        byNormName.set(normName, doc);
      }

      const totalNow = await col.countDocuments();
      return jsonOk(res, {
        success: true,
        message: `Import complete: ${inserted.length} new products created, ${attachedVariants.length} attached as variants, ${skipped.length} skipped.`,
        report: {
          inserted,
          insertedCount: inserted.length,
          attachedVariants,
          variantAttachedCount: attachedVariants.length,
          skipped,
          skippedCount: skipped.length,
          totalCatalogProducts: totalNow,
        },
      });
    } catch (err: any) {
      console.error("POST /api/mongodb/products/upload error:", err);
      return jsonError(res, err.message || "Import failed", 500);
    }
  }

  return jsonError(res, `MongoDB sync route not found: ${route}`, 404);
}
