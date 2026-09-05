// /api/admin/* — consolidated admin router (verifyAdmin-protected)
// Routes:
//   POST   /api/admin/products                  (create product)
//   PUT    /api/admin/products/:id              (update product)
//   DELETE /api/admin/products/:id              (delete product)
//   POST   /api/admin/products/seed-if-empty    (safe seed)
//   POST   /api/admin/products/check-duplicate  (duplicate detection — variant suggestions)
//   POST   /api/admin/products/:id/variants     (attach a variant to an existing product)
//   GET    /api/admin/stats                     (dashboard KPIs)
//   GET    /api/admin/system-health             (DB ping, latency, collections, last backup)
//   GET    /api/admin/orders                    (recent orders list)
//   GET    /api/admin/orders-log                (full paginated order log w/ search + filters)
//   GET    /api/admin/top-products              (aggregated best sellers)
//   GET    /api/admin/revenue-chart             (daily revenue series)
//   GET    /api/admin/users                     (list all users)
//   GET    /api/admin/staff                     (list staff + super admin)
//   POST   /api/admin/staff/create              (super admin: create employee account)
//   POST   /api/admin/staff/delete              (super admin: remove staff account)
//   POST   /api/admin/staff/update              (super admin: update staff permissions/status)
//   POST   /api/admin/staff/promote             (assign staffId)
//   POST   /api/admin/staff/demote              (revoke staff role)
//   GET|POST /api/admin/backup                  (list restore points | create restore point)
//   POST   /api/admin/backup/restore            (super admin: restore from snapshot)
//   POST   /api/admin/backup/delete             (super admin: delete a restore point)
//   GET|PUT  /api/admin/cms/settings            (site settings read/update)
//   GET    /api/admin/profile                   (signed-in admin's full profile + activity)
//   PUT    /api/admin/profile                   (update own profile identity & preferences)
//   POST   /api/admin/profile/password          (change own password — bcrypt verified)
//   POST   /api/admin/profile/avatar           (upload cropped profile picture — validated)
//   DELETE /api/admin/profile/avatar           (remove profile picture)
//   GET    /api/admin/avatar?email=...         (public avatar image bytes — no secrets)
//   POST   /api/admin/documents/chunk          (vault upload — one base64 chunk)
//   POST   /api/admin/documents/finalize       (vault upload — assemble + validate + store; optional folderId)
//   GET    /api/admin/documents                (vault list + storage stats; ?q=&type=&folder=root|<id>)
//   GET    /api/admin/documents/folders        (vault folder list + per-folder counts)
//   POST   /api/admin/documents/folders        (create a vault folder)
//   PATCH  /api/admin/documents/folders/:id    (rename a vault folder)
//   DELETE /api/admin/documents/folders/:id    (delete a vault folder — optional moveFilesToRoot)
//   POST   /api/admin/documents/:id/move       (move a file between folders)
//   GET    /api/admin/documents/:id/download   (vault binary download — admin auth)
//   DELETE /api/admin/documents/:id            (vault delete — manager+ or uploader)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId, GridFSBucket } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { formatProduct } from "../_lib/product.js";
import { slugify } from "../_lib/config.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireAdmin,
  requireSuperAdmin,
  requireAuthority,
  requireStaffAuthority,
  requireGatewayTech,
  verifyAdmin,
  isItScoped,
  normalizeAuthority,
  hasAuthority,
  AuthenticatedRequest,
} from "../_lib/auth.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_DB_NAME, PUBLIC_SITE_URL } from "../_lib/config.js";
import { hashPassword, comparePassword } from "../_lib/auth.js";
import { getRapidConfig, saveRapidConfig, describeGatewayStatus } from "../_lib/gatewayConfig.js";
import { createRapidPayment } from "../_lib/rapidClient.js";
import { CMS_DEFAULTS } from "../cms/index.js";
import { getAppRelease, setAppRelease, semverGte, APP_RELEASE_FALLBACK } from "../_lib/appRelease.js";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =====================================================================
// Documents vault — shared limits, whitelist and sniffing helpers.
// Vercel serverless caps request bodies at ~4.5MB, so files are uploaded
// in 2MB base64 chunks (POST /documents/chunk, ~2.7MB JSON body) and
// assembled on POST /documents/finalize. Bytes live in the GridFS bucket
// "admin_documents" (no 16MB document limit); metadata lives in the
// "admin_documents" collection, staging chunks in "admin_document_chunks".
// Files can be organized into folders ("admin_document_folders", flat list;
// documents carry denormalized folderId + folderName for cheap filtering).
// =====================================================================
const DOC_MAX_BYTES = 50 * 1024 * 1024; // 50MB per file
const DOC_CHUNK_MAX = 3 * 1024 * 1024; // decoded per-chunk ceiling
const DOC_ALLOWED_EXT: Record<string, { mime: string; group: string }> = {
  pdf: { mime: "application/pdf", group: "pdf" },
  doc: { mime: "application/msword", group: "word" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    group: "word",
  },
  xls: { mime: "application/vnd.ms-excel", group: "excel" },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    group: "excel",
  },
  ppt: { mime: "application/vnd.ms-powerpoint", group: "slides" },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    group: "slides",
  },
  apk: { mime: "application/vnd.android.package-archive", group: "apk" },
  zip: { mime: "application/zip", group: "archive" },
  rar: { mime: "application/vnd.rar", group: "archive" },
  "7z": { mime: "application/x-7z-compressed", group: "archive" },
  txt: { mime: "text/plain", group: "text" },
  csv: { mime: "text/csv", group: "text" },
};

/** BSON Binary → Buffer across driver shapes (legacy wrapper vs Uint8Array). */
function binaryToBuffer(stored: any): Buffer {
  if (Buffer.isBuffer(stored)) return stored;
  if (stored && Buffer.isBuffer(stored.buffer)) {
    return stored.buffer.subarray(0, stored.position || stored.buffer.length);
  }
  if (stored instanceof Uint8Array) return Buffer.from(stored);
  return Buffer.from(String(stored || ""), "base64");
}

/** Content sniffing — the declared extension must match the real bytes. */
function sniffDocument(ext: string, b: Buffer): boolean {
  if (b.length < 8) return ext === "txt" || ext === "csv";
  switch (ext) {
    case "pdf":
      return b.subarray(0, 5).toString("ascii") === "%PDF-";
    case "apk":
    case "zip":
    case "docx":
    case "xlsx":
    case "pptx":
      return b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5 || b[2] === 7);
    case "rar":
      return b.subarray(0, 4).toString("latin1") === "Rar!";
    case "7z":
      return (
        b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf && b[4] === 0x27 && b[5] === 0x1c
      );
    case "doc":
    case "xls":
    case "ppt":
      return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
    default:
      return true; // txt/csv — plain text carries no magic signature
  }
}

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // Extract sub-path from req.url (Vercel rewrites /api/auth/:path* → /api/auth)
  // So we parse the ORIGINAL path from req.url to get the sub-route
  const url = new URL(req.url || '', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  // Drop the first 2 segments ("api", "auth" or "products" etc.)
  const pathSegments = parts.slice(2);
  const route = pathSegments.join("/").toLowerCase();

  // PUBLIC: avatar image bytes — <img> tags cannot send Authorization headers,
  // so this single read-only route is exempt from the admin gate. It only ever
  // returns stored image bytes — no secrets, no user data beyond the picture.
  const isPublicAvatarGet = route === "avatar" && req.method === "GET";
  if (!isPublicAvatarGet && !requireAdmin(req, res)) return;

  // IT-scope enforcement: accounts with the "it" power authority may ONLY use
  // the payment-gateway routes (and their own profile / the public avatar).
  // Every other admin route rejects them server-side — the UI hiding nav is
  // convenience, this is the actual wall.
  {
    const currentAdmin = verifyAdmin(req as any);
    if (
      isItScoped(currentAdmin) &&
      !route.startsWith("gateway") &&
      route !== "profile" &&
      route !== "avatar"
    ) {
      return jsonError(res, "IT accounts are scoped to the Payment Gateway panel only.", 403);
    }
  }

  const db = await getDb();

  // ============ GET /api/admin/stats ============
  if (route === "stats" && req.method === "GET") {
    try {
      const productsCol = db.collection("products");
      const ordersCol = db.collection("orders");
      const [totalProducts, activeProducts, totalOrders] = await Promise.all([
        productsCol.countDocuments(),
        productsCol.countDocuments({ active: { $ne: false } }),
        ordersCol.countDocuments(),
      ]);
      const revenueAgg = await ordersCol
        .aggregate([
          { $match: { status: "completed" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ])
        .toArray();
      const totalRevenue = revenueAgg[0]?.total || 0;
      // Low stock = stock <= 5
      const lowStock = await productsCol.countDocuments({ stock: { $lte: 5 } });
      // Recent orders count (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentOrders = await ordersCol.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
      return jsonOk(res, {
        success: true,
        stats: {
          totalProducts, activeProducts,
          totalOrders: totalOrders || 0,
          totalRevenue,
          lowStock,
          recentOrders,
          systemHealth: "100% Operational",
          database: MONGODB_DB_NAME,
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/orders (recent orders list) ============
  if (route === "orders" && req.method === "GET") {
    try {
      const ordersCol = db.collection("orders");
      const limit = Math.min(parseInt((req.query.limit as string) || "20", 10) || 20, 100);
      const recentOrders = await ordersCol
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return jsonOk(res, {
        success: true,
        orders: recentOrders.map((o: any) => ({
          id: o._id.toString(),
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          totalAmount: o.totalAmount,
          currency: o.currency || "PKR",
          status: o.status,
          paymentMethod: o.paymentMethod,
          itemCount: (o.items || []).length,
          items: (o.items || []).map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
          createdAt: o.createdAt,
        })),
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/top-products (aggregated best sellers) ============
  if (route === "top-products" && req.method === "GET") {
    try {
      const ordersCol = db.collection("orders");
      // Unwind items, group by product name, sum quantity and revenue
      const topProductsAgg = await ordersCol
        .aggregate([
          { $match: { status: "completed" } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.name",
              totalSold: { $sum: "$items.quantity" },
              totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: 10 },
        ])
        .toArray();
      return jsonOk(res, {
        success: true,
        topProducts: topProductsAgg.map((p: any, idx: number) => ({
          rank: idx + 1,
          name: p._id,
          totalSold: p.totalSold,
          totalRevenue: p.totalRevenue,
          orderCount: p.orderCount,
        })),
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/revenue-chart (14-day daily revenue) ============
  if (route === "revenue-chart" && req.method === "GET") {
    try {
      const ordersCol = db.collection("orders");
      const days = parseInt((req.query.days as string) || "14", 10) || 14;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const dailyAgg = await ordersCol
        .aggregate([
          { $match: { status: "completed", createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              revenue: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();
      // Build complete date series (fill missing days with 0)
      const series: { date: string; revenue: number; orders: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        const found = dailyAgg.find((a: any) => a._id === key);
        series.push({
          date: key,
          revenue: found?.revenue || 0,
          orders: found?.orders || 0,
        });
      }
      const totalRevenue = series.reduce((a, s) => a + s.revenue, 0);
      const totalOrders = series.reduce((a, s) => a + s.orders, 0);
      const avgDaily = series.length > 0 ? Math.round(totalRevenue / series.length) : 0;
      const bestDay = series.reduce(
        (best, s) => (s.revenue > best.revenue ? s : best),
        { date: "", revenue: 0, orders: 0 }
      );
      return jsonOk(res, {
        success: true,
        chart: {
          series,
          totalRevenue,
          totalOrders,
          avgDailyRevenue: avgDaily,
          bestDay: bestDay.date ? bestDay : null,
          days,
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/users ============
  if (route === "users" && req.method === "GET") {
    try {
      const usersCol = db.collection("users");
      const users = await usersCol.find({}).project({ password: 0 }).sort({ createdAt: -1 }).limit(200).toArray();
      return jsonOk(res, {
        success: true,
        users: users.map((u: any) => ({
          id: u._id.toString(), name: u.name, email: u.email,
          role: u.role || "user", staffId: u.staffId || null,
          provider: u.provider || "local", createdAt: u.createdAt,
        })),
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/consolidate-giftcards ============
  // Consolidates multiple denomination products (e.g. "Apple Gift Card 5 USD",
  // "Apple Gift Card 10 USD", ...) into a single parent product with variants.
  // Body: { matchPrefix: "Apple Gift Card", category: "Gift Cards" }
  if (route === "consolidate-giftcards" && req.method === "POST") {
    try {
      const productsCol = db.collection("products");
      const { matchPrefix, category, parentName, parentSlug } = req.body || {};
      if (!matchPrefix || !category) {
        return jsonError(res, "matchPrefix and category are required.", 400);
      }

      // Find all products in this category whose name starts with matchPrefix,
      // sorted by price ascending so variants appear in denomination order.
      const matching = await productsCol
        .find({
          category: { $regex: new RegExp(`^${category}$`, "i") },
          name: { $regex: new RegExp(`^${escapeRegExp(matchPrefix)}\\s+`, "i") },
        })
        .sort({ price: 1 })
        .toArray();

      if (matching.length < 2) {
        return jsonOk(res, {
          success: true,
          message: `Found ${matching.length} product(s) matching "${matchPrefix}". Need at least 2 to consolidate.`,
          consolidated: false,
          matching: matching.length,
        });
      }

      // Build variants from the matching products (excluding any that already
      // have variants themselves — those are already parents)
      const standalone = matching.filter((p: any) => !p.variants || p.variants.length === 0);
      if (standalone.length < 2) {
        return jsonOk(res, {
          success: true,
          message: `Found ${standalone.length} standalone product(s) (others are already parents). Nothing to consolidate.`,
          consolidated: false,
          matching: matching.length,
        });
      }

      const variants = standalone.map((p: any) => ({
        id: `v-${p.sku || p._id.toString()}`,
        name: p.name.replace(new RegExp(`^${escapeRegExp(matchPrefix)}\\s*`, "i"), "").trim() || p.name,
        price: Number(p.price) || 0,
        originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        sku: p.sku,
        badge: (p.tags || []).includes("INSTANT") ? "Instant" : undefined,
      }));

      // Use the cheapest as the parent's display price; use the first match's image
      const parent = standalone[0];
      const finalParentName = parentName || matchPrefix;
      const finalParentSlug = parentSlug || parent.slug || matchPrefix.toLowerCase().replace(/\s+/g, "-");
      const parentPrice = Number(parent.price) || 0;
      const parentOriginalPrice = parent.originalPrice ? Number(parent.originalPrice) : undefined;

      // Collect IDs to deactivate (the standalone children — they're now variants)
      const childIds = standalone.slice(1).map((p: any) => p._id);

      // Update the parent product: set name, slug, variants, and ensure it's active
      await productsCol.updateOne(
        { _id: parent._id },
        {
          $set: {
            name: finalParentName,
            slug: finalParentSlug,
            price: parentPrice,
            originalPrice: parentOriginalPrice,
            variants,
            active: true,
            updatedAt: new Date(),
          },
        }
      );

      // Deactivate the child products (keep them in DB but hide from storefront)
      if (childIds.length > 0) {
        await productsCol.updateMany(
          { _id: { $in: childIds } },
          { $set: { active: false, consolidatedParentId: parent._id.toString(), updatedAt: new Date() } }
        );
      }

      return jsonOk(res, {
        success: true,
        message: `Consolidated ${standalone.length} products into "${finalParentName}" with ${variants.length} variants.`,
        consolidated: true,
        parentId: parent._id.toString(),
        parentName: finalParentName,
        variantsCount: variants.length,
        deactivatedChildren: childIds.length,
        variants,
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/split-variants ============
  // Reverses consolidation: removes variants from a parent product and
  // re-activates its previously-consolidated children.
  // Body: { parentId: "<ObjectId>" }
  if (route === "split-variants" && req.method === "POST") {
    try {
      const productsCol = db.collection("products");
      const { parentId } = req.body || {};
      if (!parentId) {
        return jsonError(res, "parentId is required.", 400);
      }
      const parentFilter: any = ObjectId.isValid(parentId)
        ? { _id: new ObjectId(parentId) }
        : { $or: [{ id: parentId }, { sku: parentId }, { slug: parentId }] };

      const parent = await productsCol.findOne(parentFilter);
      if (!parent) return jsonError(res, "Parent product not found.", 404);

      // Re-activate children
      await productsCol.updateMany(
        { consolidatedParentId: parent._id.toString() },
        { $set: { active: true }, $unset: { consolidatedParentId: "" } }
      );

      // Remove variants from parent + restore original child name (first variant's source)
      await productsCol.updateOne(
        { _id: parent._id },
        { $set: { variants: [], updatedAt: new Date() } }
      );

      return jsonOk(res, {
        success: true,
        message: `Split "${parent.name}" — re-activated all child products and removed variants.`,
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/staff ============
  if (route === "staff" && req.method === "GET") {
    try {
      const usersCol = db.collection("users");
      const staff = await usersCol
        .find({ role: { $in: ["staff", "admin"] } })
        .project({ password: 0 })
        .toArray();
      return jsonOk(res, {
        success: true,
        staff: staff.map((s: any) => ({
          id: s._id.toString(), name: s.name, email: s.email,
          role: s.role, staffId: s.staffId || null,
          authority: s.authority || (s.role === "admin" ? "admin" : "supervisor"),
          permissions: Array.isArray(s.permissions) ? s.permissions : [],
          department: s.department || null,
          active: s.active !== false,
          provider: s.provider || "local", createdAt: s.createdAt,
        })),
        superAdmin: { email: ADMIN_EMAIL, role: "super_admin" },
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/staff/promote ============
  if (route === "staff/promote" && req.method === "POST") {
    try {
      const { userId, staffId } = req.body || {};
      if (!userId || !staffId) return jsonError(res, "userId and staffId are required.", 400);
      const usersCol = db.collection("users");
      const target = await usersCol.findOne({ _id: new ObjectId(userId) });
      if (!target) return jsonError(res, "User not found.", 404);
      if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return jsonError(res, "Cannot modify the super administrator account.", 403);
      }
      const existingStaffId = await usersCol.findOne({ staffId: staffId.trim() });
      if (existingStaffId && existingStaffId._id.toString() !== userId) {
        return jsonError(res, "Staff ID is already assigned to another user.", 409);
      }
      await usersCol.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: "staff", staffId: staffId.trim(), promotedAt: new Date() } }
      );
      return jsonOk(res, {
        success: true,
        message: `User promoted to staff with Staff ID ${staffId}.`,
        staff: {
          id: userId, name: target.name, email: target.email,
          role: "staff", staffId: staffId.trim(),
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/staff/demote ============
  if (route === "staff/demote" && req.method === "POST") {
    try {
      const { userId } = req.body || {};
      if (!userId) return jsonError(res, "userId is required.", 400);
      const usersCol = db.collection("users");
      const target = await usersCol.findOne({ _id: new ObjectId(userId) });
      if (!target) return jsonError(res, "User not found.", 404);
      if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return jsonError(res, "Cannot demote the super administrator account.", 403);
      }
      await usersCol.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: "user" }, $unset: { staffId: "" } }
      );
      return jsonOk(res, {
        success: true,
        message: "Staff privileges revoked. User reverted to normal account.",
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/system-health ============
  if (route === "system-health" && req.method === "GET") {
    try {
      const started = Date.now();
      const db = await getDb();
      await db.command({ ping: 1 });
      const dbLatency = Date.now() - started;
      const [productsCount, ordersCount, usersCount, backupsCount, pendingOrders, lowStock] =
        await Promise.all([
          db.collection("products").countDocuments(),
          db.collection("orders").countDocuments(),
          db.collection("users").countDocuments(),
          db.collection("backups").countDocuments(),
          db.collection("orders").countDocuments({ status: { $in: ["pending", "processing"] } }),
          db.collection("products").countDocuments({ stock: { $lte: 5 } }),
        ]);
      const lastBackup = await db
        .collection("backups")
        .find({})
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
      const mem = process.memoryUsage();
      return jsonOk(res, {
        success: true,
        health: {
          status: "operational",
          database: {
            connected: true,
            name: MONGODB_DB_NAME,
            latencyMs: dbLatency,
          },
          collections: {
            products: productsCount,
            orders: ordersCount,
            users: usersCount,
            backups: backupsCount,
          },
          alerts: {
            pendingOrders,
            lowStockProducts: lowStock,
          },
          lastBackup: lastBackup[0]
            ? {
                id: lastBackup[0]._id?.toString?.(),
                name: lastBackup[0].name,
                createdAt: lastBackup[0].createdAt,
              }
            : null,
          runtime: {
            uptimeSeconds: Math.round(process.uptime()),
            memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            memoryTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            nodeVersion: process.version,
            platform: process.platform,
          },
          checkedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      return jsonOk(res, {
        success: true,
        health: {
          status: "degraded",
          database: { connected: false, error: err.message },
          checkedAt: new Date().toISOString(),
        },
      });
    }
  }

  // ============ GET /api/admin/orders-log (full paginated log) ============
  if (route === "orders-log" && req.method === "GET") {
    try {
      const urlQ = new URL(req.url || "", "http://localhost").searchParams;
      const page = Math.max(1, parseInt(urlQ.get("page") || "1", 10) || 1);
      const limit = Math.min(parseInt(urlQ.get("limit") || "25", 10) || 25, 200);
      const status = (urlQ.get("status") || "all").toLowerCase();
      const search = (urlQ.get("search") || "").trim();
      const ordersCol = db.collection("orders");
      const query: any = {};
      if (status !== "all") query.status = status;
      if (search) {
        const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        query.$or = [
          { orderNumber: rx },
          { customerName: rx },
          { customerEmail: rx },
          { paymentMethod: rx },
        ];
      }
      const [items, total] = await Promise.all([
        ordersCol
          .find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        ordersCol.countDocuments(query),
      ]);
      // Per-customer aggregation for the Customer Orders Log side summary
      const customerAgg = await ordersCol
        .aggregate([
          {
            $group: {
              _id: "$customerEmail",
              customerName: { $first: "$customerName" },
              orderCount: { $sum: 1 },
              lifetimeValue: { $sum: "$totalAmount" },
              lastOrderAt: { $max: "$createdAt" },
            },
          },
          { $sort: { lastOrderAt: -1 } },
          { $limit: 50 },
        ])
        .toArray();
      return jsonOk(res, {
        success: true,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        total,
        orders: items.map((o: any) => ({
          id: o._id.toString(),
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          totalAmount: o.totalAmount,
          currency: o.currency || "PKR",
          status: o.status,
          paymentMethod: o.paymentMethod,
          items: (o.items || []).map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            variantName: i.variantName,
            licenseKeys: i.licenseKeys || [],
          })),
          licenseKeysDelivered: o.licenseKeysDelivered || [],
          createdAt: o.createdAt,
        })),
        customers: customerAgg.map((c: any) => ({
          email: c._id,
          name: c.customerName,
          orderCount: c.orderCount,
          lifetimeValue: c.lifetimeValue,
          lastOrderAt: c.lastOrderAt,
        })),
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/staff/create (super admin or Administrator authority) ============
  if (route === "staff/create" && req.method === "POST") {
    if (!requireStaffAuthority(req, res)) return;
    try {
      const { name, email, password, staffId, department, permissions, authority } = req.body || {};
      if (!name || !email || !password) {
        return jsonError(res, "Name, email, and password are required.", 400);
      }
      if (String(password).length < 6) {
        return jsonError(res, "Password must be at least 6 characters long.", 400);
      }
      const cleanEmail = String(email).toLowerCase().trim();
      if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
        return jsonError(res, "This email is reserved for the super administrator.", 409);
      }
      const usersCol = db.collection("users");
      const existing = await usersCol.findOne({ email: cleanEmail });
      if (existing) {
        return jsonError(res, "An account with this email already exists.", 409);
      }
      const finalStaffId = (staffId && String(staffId).trim()) || `EMP-${Date.now().toString().slice(-6)}`;
      const staffIdTaken = await usersCol.findOne({ staffId: finalStaffId });
      if (staffIdTaken) {
        return jsonError(res, `Staff ID ${finalStaffId} is already assigned.`, 409);
      }
      const hashed = await hashPassword(String(password));
      // Power Authority: admin | manager | supervisor (hierarchical control)
      const finalAuthority = normalizeAuthority(authority);
      const newStaff = {
        name: String(name).trim(),
        email: cleanEmail,
        password: hashed,
        role: "staff",
        staffId: finalStaffId,
        department: department ? String(department).trim() : "Operations",
        authority: finalAuthority,
        permissions: Array.isArray(permissions)
          ? permissions
          : ["orders", "products", "customers", "support"],
        provider: "local",
        active: true,
        createdBy: "super_admin",
        createdAt: new Date(),
      };
      const result = await usersCol.insertOne(newStaff);
      return jsonOk(res, {
        success: true,
        message: `Employee account created. Staff ID: ${finalStaffId}`,
        staff: {
          id: result.insertedId.toString(),
          name: newStaff.name,
          email: newStaff.email,
          role: "staff",
          staffId: newStaff.staffId,
          department: newStaff.department,
          authority: newStaff.authority,
          permissions: newStaff.permissions,
        },
      }, 201);
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/staff/delete (super admin only) ============
  if (route === "staff/delete" && req.method === "POST") {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const { userId } = req.body || {};
      if (!userId) return jsonError(res, "userId is required.", 400);
      const usersCol = db.collection("users");
      const target = await usersCol.findOne({ _id: new ObjectId(userId) });
      if (!target) return jsonError(res, "Staff account not found.", 404);
      if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return jsonError(res, "The super administrator account cannot be deleted.", 403);
      }
      await usersCol.deleteOne({ _id: new ObjectId(userId) });
      return jsonOk(res, { success: true, message: `Staff account ${target.email} deleted.` });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/staff/update (super admin or Administrator authority) ============
  if (route === "staff/update" && req.method === "POST") {
    if (!requireStaffAuthority(req, res)) return;
    try {
      const { userId, name, department, permissions, active, password, authority } = req.body || {};
      if (!userId) return jsonError(res, "userId is required.", 400);
      const usersCol = db.collection("users");
      const target = await usersCol.findOne({ _id: new ObjectId(userId) });
      if (!target) return jsonError(res, "Staff account not found.", 404);
      if (target.email && target.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return jsonError(res, "The super administrator account cannot be modified here.", 403);
      }
      const update: any = { updatedAt: new Date() };
      if (name) update.name = String(name).trim();
      if (department) update.department = String(department).trim();
      if (Array.isArray(permissions)) update.permissions = permissions;
      // Power Authority changes — an Administrator cannot elevate someone above
      // their own level (managers/supervisors never reach this guard anyway).
      if (authority) update.authority = normalizeAuthority(authority);
      if (typeof active === "boolean") update.active = active;
      if (password) {
        if (String(password).length < 6) {
          return jsonError(res, "Password must be at least 6 characters long.", 400);
        }
        update.password = await hashPassword(String(password));
      }
      await usersCol.updateOne({ _id: new ObjectId(userId) }, { $set: update });
      return jsonOk(res, { success: true, message: "Staff account updated." });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/backup (list restore points) ============
  if (route === "backup" && req.method === "GET") {
    try {
      const backupsCol = db.collection("backups");
      const list = await backupsCol
        .find({}, { projection: { "collections.products": 0, "collections.orders": 0, "collections.users": 0, "collections.site_settings": 0 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return jsonOk(res, {
        success: true,
        backups: list.map((b: any) => ({
          id: b._id.toString(),
          name: b.name,
          type: b.type || "manual",
          createdBy: b.createdBy,
          counts: b.counts || {},
          sizeKB: b.sizeKB || 0,
          createdAt: b.createdAt,
        })),
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/backup (create restore point) ============
  if (route === "backup" && req.method === "POST") {
    try {
      const started = Date.now();
      const body = req.body || {};
      const name =
        (body.name && String(body.name).trim()) ||
        `Restore point ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`;
      const [products, orders, users, siteSettings] = await Promise.all([
        db.collection("products").find({}).toArray(),
        db.collection("orders").find({}).toArray(),
        db.collection("users").find({}, { projection: { password: 0 } }).toArray(),
        db.collection("site_settings").find({}).toArray(),
      ]);
      const snapshot = {
        products,
        orders,
        users,
        site_settings: siteSettings,
      };
      const sizeKB = Math.round(JSON.stringify(snapshot).length / 1024);
      const doc = {
        name,
        type: "manual",
        createdBy: "admin_panel",
        collections: snapshot,
        counts: {
          products: products.length,
          orders: orders.length,
          users: users.length,
          site_settings: siteSettings.length,
        },
        sizeKB,
        createdAt: new Date(),
      };
      const result = await db.collection("backups").insertOne(doc);
      return jsonOk(res, {
        success: true,
        message: `Restore point created (${products.length} products, ${orders.length} orders, ${users.length} users) in ${Date.now() - started}ms.`,
        backup: {
          id: result.insertedId.toString(),
          name,
          counts: doc.counts,
          sizeKB,
          createdAt: doc.createdAt,
        },
      }, 201);
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/backup/restore (super admin only) ============
  if (route === "backup/restore" && req.method === "POST") {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const { backupId } = req.body || {};
      if (!backupId) return jsonError(res, "backupId is required.", 400);
      const backupsCol = db.collection("backups");
      const snap = await backupsCol.findOne({ _id: new ObjectId(backupId) });
      if (!snap) return jsonError(res, "Restore point not found.", 404);

      // Safety: snapshot current state before overwriting (so restore is reversible)
      const [curProducts, curOrders, curUsers] = await Promise.all([
        db.collection("products").find({}).toArray(),
        db.collection("orders").find({}).toArray(),
        db.collection("users").find({}).toArray(),
      ]);
      await backupsCol.insertOne({
        name: `Auto-backup before restore (${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC)`,
        type: "auto_pre_restore",
        createdBy: "system:restore",
        collections: { products: curProducts, orders: curOrders, users: curUsers },
        counts: { products: curProducts.length, orders: curOrders.length, users: curUsers.length },
        createdAt: new Date(),
      });

      const restore = async (colName: string, docs: any[], dropPassword = false) => {
        if (!Array.isArray(docs)) return 0;
        const col = db.collection(colName);
        await col.deleteMany({});
        if (docs.length === 0) return 0;
        const clean = docs.map((d: any) => {
          if (d._id) delete d._id;
          return d;
        });
        const r = await col.insertMany(clean);
        return r.insertedCount;
      };
      const [p, o, u] = await Promise.all([
        restore("products", snap.collections?.products || []),
        restore("orders", snap.collections?.orders || []),
        restore("users", snap.collections?.users || []),
      ]);
      let s = 0;
      if (Array.isArray(snap.collections?.site_settings)) {
        s = await restore("site_settings", snap.collections.site_settings);
      }
      return jsonOk(res, {
        success: true,
        message: `Database restored from "${snap.name}" — ${p} products, ${o} orders, ${u} users, ${s} settings.`,
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/backup/delete (super admin only) ============
  if (route === "backup/delete" && req.method === "POST") {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const { backupId } = req.body || {};
      if (!backupId) return jsonError(res, "backupId is required.", 400);
      const r = await db
        .collection("backups")
        .deleteOne({ _id: new ObjectId(backupId) });
      if (r.deletedCount === 0) return jsonError(res, "Restore point not found.", 404);
      return jsonOk(res, { success: true, message: "Restore point deleted." });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET/PUT /api/admin/cms/settings (Website Builder CMS) ============
  if (route === "cms/settings" && req.method === "GET") {
    try {
      const doc = await db.collection("site_settings").findOne({ key: "site" });
      const settings = { ...CMS_DEFAULTS, ...(doc?.settings || {}) };
      for (const k of Object.keys(CMS_DEFAULTS)) {
        settings[k] = { ...(CMS_DEFAULTS as any)[k], ...((doc?.settings || {})[k] || {}) };
      }
      return jsonOk(res, { success: true, settings, updatedAt: doc?.updatedAt || null });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }
  if (route === "cms/settings" && req.method === "PUT") {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const body = req.body || {};
      const settings = body.settings || body;
      const cleanSettings: any = {};
      for (const k of Object.keys(CMS_DEFAULTS)) {
        if (settings[k] && typeof settings[k] === "object") {
          cleanSettings[k] = { ...(CMS_DEFAULTS as any)[k], ...settings[k] };
        }
      }
      await db.collection("site_settings").updateOne(
        { key: "site" },
        { $set: { key: "site", settings: cleanSettings, updatedAt: new Date() } },
        { upsert: true }
      );
      return jsonOk(res, { success: true, message: "Website content published to the live storefront.", settings: cleanSettings });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/products/check-duplicate ============
  if (route === "products/check-duplicate" && req.method === "POST") {
    try {
      const { products: incoming } = req.body || {};
      if (!Array.isArray(incoming)) return jsonError(res, "products array is required.", 400);
      const col = db.collection("products");
      const existing = await col.find({}).project({ name: 1, sku: 1, slug: 1, variants: 1, price: 1, image: 1 }).toArray();
      const normalize = (s: string) => (s || "").toString().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
      const bySlug = new Map<string, any>();
      const bySku = new Map<string, any>();
      const byName = new Map<string, any>();
      existing.forEach((d: any) => {
        if (d.slug) bySlug.set(String(d.slug).toLowerCase(), d);
        if (d.sku) bySku.set(String(d.sku).toLowerCase(), d);
        if (d.name) byName.set(normalize(d.name), d);
      });
      const results = incoming.map((p: any) => {
        const name = (p.name || "").toString();
        const slug = slugify(p.slug || name);
        const sku = (p.sku || "").toString().trim();
        const match = bySku.get(sku.toLowerCase()) || bySlug.get(slug.toLowerCase()) || byName.get(normalize(name));
        if (!match) return { name, match: null };
        return {
          name,
          match: {
            id: match._id.toString(),
            name: match.name,
            sku: match.sku,
            price: match.price,
            image: match.image,
            variantCount: Array.isArray(match.variants) ? match.variants.length : 0,
            suggestedVariantName: p.region || p.variantName || "Standard",
          },
        };
      });
      const matchCount = results.filter((r: any) => r.match).length;
      return jsonOk(res, {
        success: true,
        results,
        matchCount,
        newCount: incoming.length - matchCount,
        message: `${matchCount} of ${incoming.length} items already exist in the catalog and will be attached as variants instead of duplicated.`,
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/products/seed-if-empty ============
  if (route === "products/seed-if-empty" && req.method === "POST") {
    try {
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

  // ============ POST /api/admin/products (create) ============
  if (route === "products" && req.method === "POST") {
    // Power authority gate: creating catalog products requires Manager or higher.
    if (!requireAuthority(req, res, "manager")) return;
    try {
      const col = db.collection("products");
      const body = req.body || {};
      if (!body.name || !body.price) {
        return jsonError(res, "Product name and price are required.", 400);
      }
      const name = body.name.trim();
      const slug = body.slug ? slugify(body.slug) : slugify(name);
      const sku = body.sku ? body.sku.trim() : `PB-${Date.now().toString().slice(-6)}`;

      // SMART DUPLICATE DETECTION — the same product must NEVER be posted as a
      // new entry. If an existing product matches (slug / sku / normalized name),
      // instruct the caller to attach it as a VARIANT instead.
      const normalize = (s: string) =>
        (s || "").toString().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
      const duplicate = await col.findOne({
        $or: [{ slug }, { sku }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }],
      });
      if (duplicate && !body.forceNew) {
        return res.status(409).json({
          success: false,
          error: `"${duplicate.name}" already exists in the catalog (SKU ${duplicate.sku}). Attach this item as a VARIANT of it instead of creating a duplicate product.`,
          duplicateOf: {
            id: duplicate._id.toString(),
            name: duplicate.name,
            sku: duplicate.sku,
            variantCount: Array.isArray(duplicate.variants) ? duplicate.variants.length : 0,
          },
        });
      }

      const existing = await col.findOne({ $or: [{ slug }, { sku }] });
      const finalSlug = existing ? `${slug}-${Math.floor(100 + Math.random() * 900)}` : slug;

      const newProductDoc = {
        sku, name, slug: finalSlug,
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

  // ============ PUT/DELETE /api/admin/products/:id ============
  // Match "products/<id>" where <id> is not "seed-if-empty" (already handled above)
  if (pathSegments[0] === "products" && pathSegments[1] && pathSegments[1] !== "seed-if-empty") {
    // Power authority gate: editing/removing catalog products requires Manager or higher.
    if (!requireAuthority(req, res, "manager")) return;
    const id = pathSegments[1];
    const col = db.collection("products");
    const filter: any = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { $or: [{ id }, { sku: id }, { slug: id }] };

    if (req.method === "POST" && pathSegments[2] === "variants") {
      // POST /api/admin/products/:id/variants — attach a variant to an existing product
      try {
        const body = req.body || {};
        const vName = body.name ? String(body.name).trim() : "";
        if (!vName) return jsonError(res, "Variant name is required.", 400);
        const product = await col.findOne(filter);
        if (!product) return jsonError(res, "Product not found.", 404);
        const existingVariants: any[] = Array.isArray(product.variants) ? product.variants : [];
        if (existingVariants.some((v: any) => String(v.name).toLowerCase() === vName.toLowerCase())) {
          return jsonError(res, `Variant "${vName}" already exists on this product.`, 409);
        }
        const variantDoc = {
          id: `var-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`,
          name: vName,
          price: Number(body.price) || product.price || 0,
          originalPrice: body.originalPrice ? Number(body.originalPrice) : undefined,
          sku: body.sku ? String(body.sku).trim() : undefined,
          badge: body.badge || undefined,
        };
        await col.updateOne(filter, {
          $push: { variants: variantDoc } as any,
          $set: { updatedAt: new Date() },
        });
        return jsonOk(res, {
          success: true,
          message: `Variant "${vName}" attached to ${product.name}.`,
          variant: variantDoc,
        });
      } catch (err: any) {
        return jsonError(res, err.message, 500);
      }
    }

    if (req.method === "DELETE" && pathSegments[2] === "variants" && pathSegments[3]) {
      // DELETE /api/admin/products/:id/variants/:variantId
      try {
        const variantId = pathSegments[3];
        const product = await col.findOne(filter);
        if (!product) return jsonError(res, "Product not found.", 404);
        const remaining = (product.variants || []).filter((v: any) => v.id !== variantId);
        await col.updateOne(filter, { $set: { variants: remaining, updatedAt: new Date() } });
        return jsonOk(res, { success: true, message: "Variant removed." });
      } catch (err: any) {
        return jsonError(res, err.message, 500);
      }
    }

    if (req.method === "PUT") {
      try {
        const body = { ...req.body };
        delete body._id;
        delete body.id;
        if (body.name && !body.slug) body.slug = slugify(body.name);
        body.updatedAt = new Date();
        const updateResult = await col.findOneAndUpdate(filter, { $set: body }, { returnDocument: "after" });
        if (!updateResult) return jsonError(res, "Product not found to update.", 404);
        return jsonOk(res, {
          success: true,
          message: "Product updated successfully",
          product: formatProduct(updateResult),
        });
      } catch (err: any) {
        console.error("PUT /api/admin/products/:id error:", err);
        return jsonError(res, err.message, 500);
      }
    }

    if (req.method === "DELETE") {
      try {
        const deleteResult = await col.deleteOne(filter);
        if (deleteResult.deletedCount === 0) {
          return jsonError(res, "Product not found to delete.", 404);
        }
        return jsonOk(res, {
          success: true,
          message: "Product permanently removed from MongoDB catalog.",
        });
      } catch (err: any) {
        console.error("DELETE /api/admin/products/:id error:", err);
        return jsonError(res, err.message, 500);
      }
    }
  }

  // ===========================================================================
  // ADMIN PROFILE SETTINGS (own account — available to super admin AND staff)
  // ===========================================================================

  // Super-admin identity is env-credential based, so personalisation overrides
  // (display name, avatar color, phone, preferences, optional password override)
  // live in the dedicated `admin_profiles` collection keyed by email.
  // Staff/employee identities are real `users` documents and are updated in place.

  // ============ GET /api/admin/profile ============
  if (route === "profile" && req.method === "GET") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const usersCol = db.collection("users");
      const profilesCol = db.collection("admin_profiles");
      const activityCol = db.collection("admin_activity");

      let profile: any = null;
      let source: "super_admin_env" | "staff_account" = "super_admin_env";

      if (admin.role === "staff" && admin.id) {
        const staffUser = await usersCol.findOne({ _id: new ObjectId(admin.id) });
        if (!staffUser) return jsonError(res, "Staff account not found.", 404);
        source = "staff_account";
        profile = {
          id: staffUser._id.toString(),
          name: staffUser.name,
          email: staffUser.email,
          role: staffUser.role,
          staffId: staffUser.staffId || null,
          department: staffUser.department || null,
          permissions: staffUser.permissions || [],
          phone: staffUser.phone || "",
          jobTitle: staffUser.jobTitle || "",
          timezone: staffUser.timezone || "Asia/Karachi",
          bio: staffUser.bio || "",
          avatarColor: staffUser.avatarColor || "amber",
          notificationPrefs: staffUser.notificationPrefs || null,
          provider: staffUser.provider || "local",
          active: staffUser.active !== false,
          createdAt: staffUser.createdAt || null,
          lastLoginAt: staffUser.lastLoginAt || null,
        };
      } else {
        const doc = await profilesCol.findOne({
          email: String(admin.email || ADMIN_EMAIL).toLowerCase(),
        });
        profile = {
          id: null,
          name: doc?.name || admin.name || "PlayBeat Super Administrator",
          email: String(admin.email || ADMIN_EMAIL).toLowerCase(),
          role: "admin",
          staffId: null,
          department: doc?.department || "Executive",
          permissions: ["all"],
          phone: doc?.phone || "",
          jobTitle: doc?.jobTitle || "Super Administrator",
          timezone: doc?.timezone || "Asia/Karachi",
          bio: doc?.bio || "",
          avatarColor: doc?.avatarColor || "amber",
          notificationPrefs: doc?.notificationPrefs || null,
          provider: "env-credentials",
          active: true,
          createdAt: doc?.createdAt || null,
          lastLoginAt: doc?.lastLoginAt || null,
          hasPasswordOverride: Boolean(doc?.passwordOverride),
        };
      }

      // Avatar metadata (image bytes live in the `admin_avatars` collection)
      const avatarDoc = await db
        .collection("admin_avatars")
        .findOne({ _id: profile.email as any });
      profile.avatar = {
        has: Boolean(avatarDoc),
        version: avatarDoc?.updatedAt ? new Date(avatarDoc.updatedAt).getTime() : 0,
      };

      // Live request context — powers the Account & Session panel
      profile.session = {
        ip: String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown",
        userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
        serverTime: new Date().toISOString(),
      };

      const activities = await activityCol
        .find({ adminEmail: profile.email })
        .sort({ createdAt: -1 })
        .limit(15)
        .toArray();

      return jsonOk(res, {
        success: true,
        profile,
        source,
        activity: activities.map((a: any) => ({
          id: a._id?.toString(),
          type: a.type,
          detail: a.detail,
          meta: a.meta || null,
          createdAt: a.createdAt,
        })),
      });
    } catch (err: any) {
      console.error("GET /api/admin/profile error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ PUT /api/admin/profile ============
  if (route === "profile" && req.method === "PUT") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const {
        name,
        email,
        phone,
        jobTitle,
        department,
        timezone,
        bio,
        avatarColor,
        notificationPrefs,
      } = req.body || {};

      const usersCol = db.collection("users");
      const profilesCol = db.collection("admin_profiles");
      const activityCol = db.collection("admin_activity");

      if (name !== undefined && !String(name).trim()) {
        return jsonError(res, "Display name cannot be empty.", 400);
      }
      const allowedColors = ["amber", "blue", "emerald", "purple", "rose", "cyan"];
      if (avatarColor !== undefined && !allowedColors.includes(String(avatarColor))) {
        return jsonError(res, `avatarColor must be one of: ${allowedColors.join(", ")}.`, 400);
      }
      if (notificationPrefs !== undefined && (typeof notificationPrefs !== "object" || notificationPrefs === null || Array.isArray(notificationPrefs))) {
        return jsonError(res, "notificationPrefs must be an object of boolean flags.", 400);
      }

      let updatedName: string;

      if (admin.role === "staff" && admin.id) {
        // ---- Staff: update the real users document ----
        const staffUser = await usersCol.findOne({ _id: new ObjectId(admin.id) });
        if (!staffUser) return jsonError(res, "Staff account not found.", 404);
        const update: any = { updatedAt: new Date() };
        if (name !== undefined) update.name = String(name).trim();
        if (phone !== undefined) update.phone = String(phone).trim().slice(0, 40);
        if (jobTitle !== undefined) update.jobTitle = String(jobTitle).trim().slice(0, 80);
        if (timezone !== undefined) update.timezone = String(timezone).trim().slice(0, 60);
        if (bio !== undefined) update.bio = String(bio).trim().slice(0, 400);
        if (avatarColor !== undefined) update.avatarColor = String(avatarColor);
        if (notificationPrefs !== undefined) update.notificationPrefs = notificationPrefs;
        if (email !== undefined) {
          const cleanEmail = String(email).toLowerCase().trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
            return jsonError(res, "Please provide a valid email address.", 400);
          }
          if (cleanEmail !== staffUser.email.toLowerCase()) {
            if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
              return jsonError(res, "This email is reserved for the super administrator.", 409);
            }
            const taken = await usersCol.findOne({ email: cleanEmail });
            if (taken) return jsonError(res, "An account with this email already exists.", 409);
            update.email = cleanEmail;
          }
        }
        await usersCol.updateOne({ _id: staffUser._id }, { $set: update });
        updatedName = update.name || staffUser.name;
      } else {
        // ---- Super admin: personalisation overrides in admin_profiles ----
        // Login email is the env credential and stays read-only by design.
        if (email !== undefined && String(email).toLowerCase().trim() !== String(admin.email || ADMIN_EMAIL).toLowerCase()) {
          return jsonError(
            res,
            "The super administrator login email is tied to platform credentials and cannot be changed here.",
            403
          );
        }
        const keyEmail = String(admin.email || ADMIN_EMAIL).toLowerCase();
        const existing = await profilesCol.findOne({ email: keyEmail });
        const set: any = { email: keyEmail, updatedAt: new Date() };
        if (name !== undefined) set.name = String(name).trim();
        if (phone !== undefined) set.phone = String(phone).trim().slice(0, 40);
        if (jobTitle !== undefined) set.jobTitle = String(jobTitle).trim().slice(0, 80);
        if (department !== undefined) set.department = String(department).trim().slice(0, 80);
        if (timezone !== undefined) set.timezone = String(timezone).trim().slice(0, 60);
        if (bio !== undefined) set.bio = String(bio).trim().slice(0, 400);
        if (avatarColor !== undefined) set.avatarColor = String(avatarColor);
        if (notificationPrefs !== undefined) set.notificationPrefs = notificationPrefs;
        if (!existing) set.createdAt = new Date();
        await profilesCol.updateOne({ email: keyEmail }, { $set: set }, { upsert: true });
        updatedName = set.name || existing?.name || admin.name || "PlayBeat Super Administrator";
      }

      await activityCol.insertOne({
        type: "profile_update",
        adminEmail: String(admin.email || "").toLowerCase(),
        adminName: updatedName,
        role: admin.role,
        detail: "Profile settings updated",
        createdAt: new Date(),
      });

      return jsonOk(res, {
        success: true,
        message: "Profile updated successfully.",
        name: updatedName,
      });
    } catch (err: any) {
      console.error("PUT /api/admin/profile error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/profile/password ============
  if (route === "profile/password" && req.method === "POST") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return jsonError(res, "Current and new password are required.", 400);
      }
      if (String(newPassword).length < 8) {
        return jsonError(res, "New password must be at least 8 characters long.", 400);
      }
      if (String(newPassword) === String(currentPassword)) {
        return jsonError(res, "New password must be different from the current password.", 400);
      }

      const usersCol = db.collection("users");
      const profilesCol = db.collection("admin_profiles");
      const activityCol = db.collection("admin_activity");

      if (admin.role === "staff" && admin.id) {
        const staffUser = await usersCol.findOne({ _id: new ObjectId(admin.id) });
        if (!staffUser) return jsonError(res, "Staff account not found.", 404);
        if (!staffUser.password) return jsonError(res, "This account has no local password set.", 400);
        const ok = await comparePassword(String(currentPassword), staffUser.password);
        if (!ok) return jsonError(res, "Current password is incorrect.", 401);
        await usersCol.updateOne(
          { _id: staffUser._id },
          { $set: { password: await hashPassword(String(newPassword)), passwordChangedAt: new Date(), updatedAt: new Date() } }
        );
      } else {
        const keyEmail = String(admin.email || ADMIN_EMAIL).toLowerCase();
        const doc = await profilesCol.findOne({ email: keyEmail });
        // Verify against the DB password override when one exists, otherwise the env credential.
        if (doc?.passwordOverride) {
          const ok = await comparePassword(String(currentPassword), doc.passwordOverride);
          if (!ok) return jsonError(res, "Current password is incorrect.", 401);
        } else if (String(currentPassword) !== ADMIN_PASSWORD) {
          return jsonError(res, "Current password is incorrect.", 401);
        }
        await profilesCol.updateOne(
          { email: keyEmail },
          {
            $set: {
              email: keyEmail,
              passwordOverride: await hashPassword(String(newPassword)),
              passwordChangedAt: new Date(),
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }

      await activityCol.insertOne({
        type: "password_change",
        adminEmail: String(admin.email || "").toLowerCase(),
        adminName: admin.name || "",
        role: admin.role,
        detail: "Account password changed",
        createdAt: new Date(),
      });

      return jsonOk(res, { success: true, message: "Password changed successfully." });
    } catch (err: any) {
      console.error("POST /api/admin/profile/password error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/profile/avatar ============
  // Accepts a cropped square image as a data URL (client resizes to 256x256),
  // validates magic bytes + size, stores raw bytes in `admin_avatars`.
  if (route === "profile/avatar" && req.method === "POST") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const dataUrl = String((req.body || {}).dataUrl || "");
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!m) {
        return jsonError(res, "Invalid image payload — expected a base64 data URL (jpeg/png/webp).", 400);
      }
      const mime = m[1];
      const bytes = Buffer.from(m[2], "base64");
      if (bytes.length < 64) return jsonError(res, "Image payload is too small to be valid.", 400);
      if (bytes.length > 400 * 1024) {
        return jsonError(res, "Image is too large after cropping (max 400 KB).", 400);
      }
      // Magic-byte sniffing — never trust the declared mime type
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isPng =
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const isWebP =
        bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP";
      const sniffed = isJpeg ? "image/jpeg" : isPng ? "image/png" : isWebP ? "image/webp" : null;
      if (!sniffed || sniffed !== mime) {
        return jsonError(res, "File content does not match an allowed image format (jpeg/png/webp).", 400);
      }

      const email = String(admin.email || ADMIN_EMAIL).toLowerCase();
      const avatarsCol = db.collection("admin_avatars");
      const now = new Date();
      await avatarsCol.updateOne(
        { _id: email as any },
        { $set: { email, mime: sniffed, bytes, size: bytes.length, updatedAt: now } },
        { upsert: true }
      );
      await db.collection("admin_activity").insertOne({
        adminEmail: email,
        type: "avatar_update",
        detail: "Profile picture updated",
        meta: { size: bytes.length, mime: sniffed },
        createdAt: now,
      });
      return jsonOk(res, {
        success: true,
        message: "Profile picture updated.",
        avatar: { has: true, version: now.getTime() },
      });
    } catch (err: any) {
      console.error("POST /api/admin/profile/avatar error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ DELETE /api/admin/profile/avatar ============
  if (route === "profile/avatar" && req.method === "DELETE") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const email = String(admin.email || ADMIN_EMAIL).toLowerCase();
      const removed = await db.collection("admin_avatars").deleteOne({ _id: email as any });
      if (removed.deletedCount > 0) {
        await db.collection("admin_activity").insertOne({
          adminEmail: email,
          type: "avatar_remove",
          detail: "Profile picture removed",
          meta: null,
          createdAt: new Date(),
        });
      }
      return jsonOk(res, {
        success: true,
        message: "Profile picture removed.",
        avatar: { has: false, version: 0 },
      });
    } catch (err: any) {
      console.error("DELETE /api/admin/profile/avatar error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/avatar?email=... ============
  // PUBLIC image endpoint — serves stored avatar bytes for the admin dashboard
  // (top bar, sidebar, dropdown, messaging, activity) and customer-facing
  // support chat. Only ever returns image bytes — no secrets.
  if (route === "avatar" && req.method === "GET") {
    const url = new URL(req.url || "", "http://localhost");
    const email = String(url.searchParams.get("email") || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(res, "A valid email query parameter is required.", 400);
    }
    const doc = await db.collection("admin_avatars").findOne({ _id: email as any });
    if (!doc || !doc.bytes) {
      return jsonError(res, "No profile picture found.", 404);
    }
    // The driver stores Node Buffers as BSON Binary. Depending on the bson
    // version, Binary is either a Uint8Array subclass OR a legacy wrapper
    // { buffer, sub_type, position }. Cover every shape explicitly.
    const stored: any = doc.bytes;
    let bytes: Buffer;
    if (Buffer.isBuffer(stored)) {
      bytes = stored;
    } else if (stored && Buffer.isBuffer(stored.buffer)) {
      bytes = stored.buffer.subarray(0, stored.position || stored.buffer.length);
    } else if (stored && stored.buffer instanceof ArrayBuffer) {
      bytes = Buffer.from(new Uint8Array(stored.buffer, 0, stored.position || stored.buffer.byteLength));
    } else if (stored instanceof Uint8Array) {
      bytes = Buffer.from(stored);
    } else {
      bytes = Buffer.from(String(stored || ""), "base64");
    }
    if (!bytes || bytes.length === 0) {
      return jsonError(res, "Stored picture is unreadable — please re-upload.", 500);
    }
    // Use the raw Node response API — the VercelResponse.send() helper does not
    // reliably transmit binary bodies in this runtime.
    res.writeHead(200, {
      "Content-Type": String(doc.mime || "image/jpeg"),
      // no-store: an uploaded picture must be visible immediately everywhere,
      // and a REMOVED picture must never be resurrected from browser cache
      // (avatars are tiny — correctness beats caching here).
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(bytes.length),
    });
    res.end(bytes);
    return;
  }

  // ============ GET /api/admin/app/version (Playbeat Admin Android app release) ============
  // Reads the live `app_release` doc (editable by super admin) with constant fallback.
  if (route === "app/version" && req.method === "GET") {
    const release = await getAppRelease();
    return jsonOk(res, {
      success: true,
      app: {
        name: "Playbeat Admin",
        platform: "Android",
        version: release.version,
        versionCode: release.versionCode,
        apkUrl: release.apkUrl,
        aabUrl: release.aabUrl || "",
        sizeBytes: release.sizeBytes,
        sha256: release.sha256,
        minSupportedVersion: release.minSupportedVersion,
        forceUpdate: Boolean(release.forceUpdate),
        buildDate: release.buildDate,
        updatedAt: (release as any).updatedAt || release.buildDate,
        minAndroid: release.minAndroid,
        targetAndroid: release.targetAndroid,
        changelog: release.releaseNotes,
      },
    });
  }

  // ============ PUT /api/admin/app/release (super admin: manage app release) ============
  // Editable fields: minSupportedVersion, forceUpdate, version, versionCode,
  // apkUrl, aabUrl, sizeBytes, sha256, buildDate, releaseNotes.
  if (route === "app/release" && (req.method === "PUT" || req.method === "POST")) {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const body = typeof req.body === "object" && req.body !== null ? req.body : {};
      if (body.minSupportedVersion !== undefined) {
        const v = String(body.minSupportedVersion).trim();
        if (!/^\d+\.\d+\.\d+$/.test(v)) {
          return jsonError(res, "minSupportedVersion must be semver (e.g. 1.0.0)", 400);
        }
      }
      if (body.version !== undefined && !/^\d+\.\d+\.\d+$/.test(String(body.version).trim())) {
        return jsonError(res, "version must be semver (e.g. 2.0.0)", 400);
      }
      const release = await setAppRelease(body);
      const admin = req.user as any;
      await db.collection("admin_activity").insertOne({
        type: "app_release_update",
        adminEmail: String(admin.email || "").toLowerCase(),
        adminName: admin.name || "",
        role: admin.role,
        detail: `Updated Android app release config (version ${release.version}, min ${release.minSupportedVersion}, forceUpdate ${release.forceUpdate ? "ON" : "OFF"})`,
        createdAt: new Date(),
      });
      return jsonOk(res, { success: true, release });
    } catch (err: any) {
      console.error("PUT /api/admin/app/release error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/app/notifications (mobile notification feed) ============
  // Aggregated admin-relevant events: recent activity, pending orders,
  // new customers, security events. Powers the native notification center.
  if (route === "app/notifications" && req.method === "GET") {
    try {
      const activityCol = db.collection("admin_activity");
      const ordersCol = db.collection("orders");
      const usersCol = db.collection("users");
      const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const [activity, pendingOrders, recentOrders, newUsers, devicesOnline] = await Promise.all([
        activityCol.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(20).toArray(),
        ordersCol.countDocuments({ status: "pending" }),
        ordersCol.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(10).toArray(),
        usersCol.countDocuments({ createdAt: { $gte: since }, role: { $exists: false } }),
        db
          .collection("admin_app_devices")
          .countDocuments({ lastSeenAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, revoked: { $ne: true } }),
      ]);
      const items: any[] = [];
      for (const o of recentOrders) {
        const isPending = o.status === "pending";
        items.push({
          id: `order-${o._id}`, category: "order", title: isPending ? "New order received" : "Order updated",
          body: `${o.customerName || o.customerEmail || "Customer"} — ${o.totalAmount ?? ""} ${o.currency || "PKR"}`.trim(),
          deepLink: "orders", createdAt: o.createdAt, read: !isPending,
        });
      }
      for (const a of activity) {
        if (a.type === "login") continue;
        const security = a.type === "app_device_control" || a.type === "password_change";
        items.push({
          id: `act-${a._id}`, category: security ? "security" : "admin", title: security ? "Security event" : "Admin activity",
          body: a.detail || a.type, deepLink: security ? "mobileapp" : null,
          createdAt: a.createdAt, read: true,
        });
      }
      items.push({
        id: "users-72h", category: "user", title: `${newUsers} new customer${newUsers === 1 ? "" : "s"} in 72h`,
        body: "Customer registrations from the storefront", deepLink: "customers", createdAt: new Date(), read: true,
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return jsonOk(res, {
        success: true,
        summary: { pendingOrders, newUsers, devicesOnline },
        notifications: items.slice(0, 30),
      });
    } catch (err: any) {
      console.error("GET /api/admin/app/notifications error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/app/heartbeat (Android app live status ping) ============
  // Called every 60s by the Playbeat Admin Android app while signed in.
  // Only super admin / staff tokens pass the global requireAdmin gate above.
  if (route === "app/heartbeat" && req.method === "POST") {
    try {
      const body = typeof req.body === "object" && req.body !== null ? req.body : {};
      const deviceId = String(body.deviceId || "").trim().slice(0, 80);
      if (!deviceId) return jsonError(res, "deviceId is required", 400);
      const admin = req.user as any;
      const devicesCol = db.collection("admin_app_devices");
      const existing = await devicesCol.findOne({ deviceId });
      if (existing?.revoked) {
        return jsonError(res, "This device has been revoked by a super administrator.", 403);
      }
      const now = new Date();
      await devicesCol.updateOne(
        { deviceId },
        {
          $set: {
            adminEmail: String(admin.email || "").toLowerCase(),
            adminName: admin.name || "",
            adminRole: admin.role === "staff" ? "staff" : "admin",
            deviceModel: String(body.deviceModel || "Unknown device").slice(0, 80),
            androidVersion: String(body.androidVersion || "").slice(0, 20),
            appVersion: String(body.appVersion || APP_RELEASE.version).slice(0, 20),
            lastSeenAt: now,
            lastIp:
              (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
              req.socket?.remoteAddress ||
              "",
          },
          $setOnInsert: { firstSeenAt: now, revoked: false },
        },
        { upsert: true }
      );
      const [onlineNow, pendingOrders, ordersToday, unreadMessages] = await Promise.all([
        devicesCol.countDocuments({
          lastSeenAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
          revoked: { $ne: true },
        }),
        db.collection("orders").countDocuments({ status: "pending" }),
        db.collection("orders").countDocuments({
          createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        }),
        db
          .collection("contact_messages")
          .countDocuments({ status: { $in: ["new", "unread", null] }, resolved: { $ne: true } }),
      ]);
      return jsonOk(res, {
        success: true,
        serverTime: now.toISOString(),
        onlineNow,
        ops: { pendingOrders, ordersToday, unreadMessages },
      });
    } catch (err: any) {
      console.error("POST /api/admin/app/heartbeat error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/app/devices (live device list for the panel) ============
  if (route === "app/devices" && req.method === "GET") {
    try {
      const devicesCol = db.collection("admin_app_devices");
      const docs = await devicesCol
        .find({})
        .sort({ lastSeenAt: -1 })
        .limit(100)
        .toArray();
      const now = Date.now();
      const devices = docs.map((d: any) => ({
        deviceId: d.deviceId,
        adminEmail: d.adminEmail,
        adminName: d.adminName || "",
        adminRole: d.adminRole === "staff" ? "staff" : "admin",
        deviceModel: d.deviceModel || "Unknown device",
        androidVersion: d.androidVersion || "",
        appVersion: d.appVersion || "",
        firstSeenAt: d.firstSeenAt,
        lastSeenAt: d.lastSeenAt,
        revoked: Boolean(d.revoked),
        lastIp: d.lastIp || "",
        status: d.revoked
          ? "revoked"
          : now - new Date(d.lastSeenAt || 0).getTime() < 5 * 60 * 1000
            ? "online"
            : now - new Date(d.lastSeenAt || 0).getTime() < 30 * 60 * 1000
              ? "idle"
              : "offline",
      }));
      return jsonOk(res, {
        success: true,
        stats: {
          total: devices.length,
          onlineNow: devices.filter((d) => d.status === "online").length,
          revoked: devices.filter((d) => d.revoked).length,
        },
        devices,
      });
    } catch (err: any) {
      console.error("GET /api/admin/app/devices error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/app/devices/revoke (super admin device control) ============
  if (route === "app/devices/revoke" && req.method === "POST") {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const body = typeof req.body === "object" && req.body !== null ? req.body : {};
      const deviceId = String(body.deviceId || "").trim().slice(0, 80);
      const revoked = Boolean(body.revoked);
      if (!deviceId) return jsonError(res, "deviceId is required", 400);
      const devicesCol = db.collection("admin_app_devices");
      const result = await devicesCol.updateOne({ deviceId }, { $set: { revoked } });
      if (result.matchedCount === 0) return jsonError(res, "Device not found", 404);
      const activityCol = db.collection("admin_activity");
      const admin = req.user as any;
      await activityCol.insertOne({
        type: "app_device_control",
        adminEmail: String(admin.email || "").toLowerCase(),
        adminName: admin.name || "",
        role: admin.role,
        detail: `${revoked ? "Revoked" : "Restored"} Android app device ${deviceId}`,
        createdAt: new Date(),
      });
      return jsonOk(res, { success: true, deviceId, revoked });
    } catch (err: any) {
      console.error("POST /api/admin/app/devices/revoke error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/campaigns (live marketing campaigns) ============
  if (route === "campaigns" && req.method === "GET") {
    try {
      const docs = await db
        .collection("marketing_campaigns")
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();
      return jsonOk(res, { success: true, campaigns: docs });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/campaigns (create campaign draft) ============
  if (route === "campaigns" && req.method === "POST") {
    try {
      const { name, channel, headline, audience } = req.body || {};
      if (!name || !String(name).trim()) return jsonError(res, "Campaign name is required.", 400);
      const doc = {
        name: String(name).trim(),
        channel: channel || "Email",
        headline: headline ? String(headline).trim() : "",
        status: "Draft",
        audience: Number(audience) || 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        revenue: 0,
        createdAt: new Date(),
        dispatchedAt: null,
        completedAt: null,
      };
      const r = await db.collection("marketing_campaigns").insertOne(doc);
      return jsonOk(res, { success: true, campaign: { ...doc, _id: r.insertedId } }, 201);
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ PUT /api/admin/campaigns/:id (status transitions) ============
  if (route.startsWith("campaigns/") && req.method === "PUT") {
    try {
      const id = route.slice("campaigns/".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid campaign id.", 400);
      const { status } = req.body || {};
      if (!["Draft", "Active", "Completed"].includes(status)) {
        return jsonError(res, "Status must be Draft, Active or Completed.", 400);
      }
      const patch: any = { status, updatedAt: new Date() };
      if (status === "Active") patch.dispatchedAt = new Date();
      if (status === "Completed") patch.completedAt = new Date();
      const r = await db
        .collection("marketing_campaigns")
        .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: patch }, { returnDocument: "after" });
      if (!r) return jsonError(res, "Campaign not found.", 404);
      return jsonOk(res, { success: true, campaign: r });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ DELETE /api/admin/campaigns/:id ============
  if (route.startsWith("campaigns/") && req.method === "DELETE") {
    try {
      const id = route.slice("campaigns/".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid campaign id.", 400);
      const r = await db.collection("marketing_campaigns").deleteOne({ _id: new ObjectId(id) });
      if (r.deletedCount === 0) return jsonError(res, "Campaign not found.", 404);
      return jsonOk(res, { success: true, deleted: id });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/support-messages (live contact form inbox) ============
  if (route === "support-messages" && req.method === "GET") {
    try {
      const col = db.collection("contact_messages");
      const statusQ = (req.query.status as string) || "";
      const filter: any = {};
      if (statusQ && statusQ !== "all") filter.status = statusQ;
      const docs = await col
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();
      const counts = {
        all: await col.countDocuments(),
        new: await col.countDocuments({ status: "new" }),
        pending: await col.countDocuments({ status: "pending" }),
        resolved: await col.countDocuments({ status: "resolved" }),
      };
      return jsonOk(res, { success: true, messages: docs, counts });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ PUT /api/admin/support-messages/:id (update ticket status) ============
  if (route.startsWith("support-messages/") && req.method === "PUT") {
    try {
      const id = route.slice("support-messages/".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid message id.", 400);
      const { status } = req.body || {};
      if (!["new", "pending", "resolved"].includes(status)) {
        return jsonError(res, "Status must be new, pending or resolved.", 400);
      }
      const col = db.collection("contact_messages");
      const r = await col.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (!r) return jsonError(res, "Message not found.", 404);
      return jsonOk(res, { success: true, message: r });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // =====================================================================
  // DOCUMENTS VAULT — secure admin file storage (PDF / Word / Excel /
  // PowerPoint / APK / ZIP / RAR / 7Z / TXT / CSV), GridFS-backed.
  // =====================================================================

  // ============ POST /api/admin/documents/chunk ============
  // One base64-encoded chunk of an in-progress upload. The client drives
  // sequencing; the server just stages bytes until finalize.
  if (route === "documents/chunk" && req.method === "POST") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const { sessionId, seq, data } = (req.body || {}) as any;
      if (typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(sessionId)) {
        return jsonError(res, "Invalid upload session id.", 400);
      }
      const idx = Number(seq);
      if (!Number.isInteger(idx) || idx < 0 || idx > 2048) {
        return jsonError(res, "Invalid chunk index.", 400);
      }
      if (typeof data !== "string" || data.length === 0) {
        return jsonError(res, "Missing chunk payload.", 400);
      }
      const bytes = Buffer.from(data, "base64");
      if (bytes.length === 0) return jsonError(res, "Empty chunk payload.", 400);
      if (bytes.length > DOC_CHUNK_MAX) {
        return jsonError(res, "Chunk too large (max 3 MB of raw data per chunk).", 413);
      }
      const col = db.collection("admin_document_chunks");
      if (idx === 0) {
        // first chunk of a session → opportunistic housekeeping: expired
        // staging chunks (abandoned uploads) and the uniqueness index
        try {
          await col.deleteMany({ createdAt: { $lt: new Date(Date.now() - 24 * 3600 * 1000) } });
          await col.createIndex({ sessionId: 1, seq: 1 }, { unique: true });
        } catch { /* non-fatal */ }
      }
      await col.updateOne(
        { sessionId, seq: idx },
        {
          $set: { bytes, size: bytes.length, updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      return jsonOk(res, { success: true, received: bytes.length });
    } catch (err: any) {
      console.error("POST /api/admin/documents/chunk error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/documents/finalize ============
  // Assembles the staged chunks, validates size + real content type, stores
  // the bytes in GridFS and creates the vault metadata document.
  if (route === "documents/finalize" && req.method === "POST") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const { sessionId, name, size, mime } = (req.body || {}) as any;
      if (typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]{8,64}$/.test(sessionId)) {
        return jsonError(res, "Invalid upload session id.", 400);
      }
      // optional destination folder — must exist before we assemble bytes
      const rawFolderId = (req.body || {}).folderId;
      let destFolder: { id: ObjectId; name: string } | null = null;
      if (rawFolderId !== null && rawFolderId !== undefined && rawFolderId !== "") {
        if (typeof rawFolderId !== "string" || !ObjectId.isValid(rawFolderId)) {
          return jsonError(res, "Invalid target folder id.", 400);
        }
        const folder = await db.collection("admin_document_folders").findOne({ _id: new ObjectId(rawFolderId) });
        if (!folder) return jsonError(res, "Target folder not found.", 404);
        destFolder = { id: folder._id, name: folder.name };
      }
      // sanitize the filename — basename only, no control characters
      const rawName = String(name || "")
        .replace(/[\\/]+/g, "_")
        .replace(/[\x00-\x1f\x7f]/g, "")
        .trim();
      const dot = rawName.lastIndexOf(".");
      const ext = dot >= 0 ? rawName.slice(dot + 1).toLowerCase() : "";
      const allowed = DOC_ALLOWED_EXT[ext];
      if (!rawName || !allowed) {
        return jsonError(
          res,
          "Unsupported file type. Allowed: pdf, doc, docx, xls, xlsx, ppt, pptx, apk, zip, rar, 7z, txt, csv.",
          400
        );
      }
      const safeName = rawName.slice(0, 120);
      const chunksCol = db.collection("admin_document_chunks");
      const parts = await chunksCol.find({ sessionId }).sort({ seq: 1 }).toArray();
      if (parts.length === 0) {
        return jsonError(res, "Upload session not found — please restart the upload.", 404);
      }
      const bytes = Buffer.concat(parts.map((p: any) => binaryToBuffer(p.bytes)));
      const declared = Number(size);
      if (Number.isFinite(declared) && declared > 0 && bytes.length !== declared) {
        await chunksCol.deleteMany({ sessionId });
        return jsonError(res, "Uploaded size does not match the selected file — upload aborted.", 400);
      }
      if (bytes.length > DOC_MAX_BYTES) {
        await chunksCol.deleteMany({ sessionId });
        return jsonError(res, "File exceeds the 50 MB vault limit.", 413);
      }
      // magic-byte sniffing — never trust the client-declared extension/mime
      if (!sniffDocument(ext, bytes)) {
        await chunksCol.deleteMany({ sessionId });
        return jsonError(res, `File content does not match its .${ext} type.`, 400);
      }
      const bucket = new GridFSBucket(db, { bucketName: "admin_documents" });
      const uploaderEmail = String(admin.email || ADMIN_EMAIL).toLowerCase();
      const now = new Date();
      const fileId = await new Promise<ObjectId>((resolve, reject) => {
        const ws = bucket.openUploadStream(safeName, {
          metadata: { uploadedBy: uploaderEmail, contentType: allowed.mime },
        });
        ws.on("error", reject);
        ws.on("finish", () => resolve(ws.id as ObjectId));
        ws.end(bytes);
      });
      const meta = {
        name: safeName,
        ext,
        group: allowed.group,
        mime: typeof mime === "string" && mime ? mime : allowed.mime,
        size: bytes.length,
        fileId,
        folderId: destFolder ? destFolder.id : null,
        folderName: destFolder ? destFolder.name : null,
        uploadedBy: { email: uploaderEmail, name: String(admin.name || "Administrator") },
        uploadedAt: now,
        downloads: 0,
      };
      const ins = await db.collection("admin_documents").insertOne(meta as any);
      await chunksCol.deleteMany({ sessionId });
      await db.collection("admin_activity").insertOne({
        adminEmail: uploaderEmail,
        type: "document_upload",
        detail: destFolder ? `Uploaded ${safeName} to folder ${destFolder.name}` : `Uploaded document: ${safeName}`,
        meta: { size: bytes.length, ext, folderId: destFolder ? String(destFolder.id) : null },
        createdAt: now,
      });
      return jsonOk(res, {
        success: true,
        message: destFolder ? `File uploaded to the vault (${destFolder.name}).` : "File uploaded to the vault.",
        document: {
          id: ins.insertedId.toString(),
          name: meta.name,
          ext: meta.ext,
          group: meta.group,
          mime: meta.mime,
          size: meta.size,
          folderId: meta.folderId ? String(meta.folderId) : null,
          folderName: meta.folderName,
          uploadedBy: meta.uploadedBy,
          uploadedAt: now.toISOString(),
          downloads: 0,
        },
      });
    } catch (err: any) {
      console.error("POST /api/admin/documents/finalize error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/documents/folders (create folder) ============
  if (route === "documents/folders" && req.method === "POST") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const rawName = String((req.body || {}).name || "")
        .replace(/[\\/]+/g, " ")
        .replace(/[\x00-\x1f\x7f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!rawName) return jsonError(res, "Folder name is required.", 400);
      if (rawName.length > 60) return jsonError(res, "Folder name is too long (max 60 characters).", 400);
      const foldersCol = db.collection("admin_document_folders");
      const dup = await foldersCol.findOne({
        name: { $regex: `^${escapeRegExp(rawName)}$`, $options: "i" },
      });
      if (dup) return jsonError(res, `A folder named "${dup.name}" already exists.`, 409);
      const now = new Date();
      const ins = await foldersCol.insertOne({
        name: rawName,
        createdBy: { email: String(admin.email || ADMIN_EMAIL).toLowerCase(), name: String(admin.name || "Administrator") },
        createdAt: now,
      });
      await db.collection("admin_activity").insertOne({
        adminEmail: String(admin.email || ADMIN_EMAIL).toLowerCase(),
        type: "folder_create",
        detail: `Created vault folder: ${rawName}`,
        meta: { folderId: ins.insertedId.toString() },
        createdAt: now,
      });
      return jsonOk(
        res,
        {
          success: true,
          message: "Folder created.",
          folder: {
            id: ins.insertedId.toString(),
            name: rawName,
            createdBy: { email: String(admin.email || ADMIN_EMAIL).toLowerCase(), name: String(admin.name || "Administrator") },
            createdAt: now.toISOString(),
            fileCount: 0,
            totalBytes: 0,
          },
        },
        201
      );
    } catch (err: any) {
      console.error("POST /api/admin/documents/folders error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/documents/folders (list + per-folder stats) ============
  if (route === "documents/folders" && req.method === "GET") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const [folders, agg] = await Promise.all([
        db.collection("admin_document_folders").find({}).sort({ createdAt: 1 }).toArray(),
        db
          .collection("admin_documents")
          .aggregate([
            { $match: { folderId: { $ne: null } } },
            { $group: { _id: "$folderId", count: { $sum: 1 }, bytes: { $sum: "$size" } } },
          ])
          .toArray(),
      ]);
      const statsByFolder = new Map<string, { count: number; bytes: number }>();
      for (const row of agg) {
        if (row._id) statsByFolder.set(String(row._id), { count: row.count, bytes: row.bytes });
      }
      return jsonOk(res, {
        success: true,
        folders: folders.map((f: any) => ({
          id: f._id.toString(),
          name: f.name,
          createdBy: f.createdBy,
          createdAt: f.createdAt,
          fileCount: statsByFolder.get(f._id.toString())?.count || 0,
          totalBytes: statsByFolder.get(f._id.toString())?.bytes || 0,
        })),
      });
    } catch (err: any) {
      console.error("GET /api/admin/documents/folders error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ PATCH /api/admin/documents/folders/:id (rename) ============
  if (route.startsWith("documents/folders/") && req.method === "PATCH") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const id = route.slice("documents/folders/".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid folder id.", 400);
      const rawName = String((req.body || {}).name || "")
        .replace(/[\\/]+/g, " ")
        .replace(/[\x00-\x1f\x7f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!rawName) return jsonError(res, "Folder name is required.", 400);
      if (rawName.length > 60) return jsonError(res, "Folder name is too long (max 60 characters).", 400);
      const foldersCol = db.collection("admin_document_folders");
      const folder = await foldersCol.findOne({ _id: new ObjectId(id) });
      if (!folder) return jsonError(res, "Folder not found.", 404);
      const dup = await foldersCol.findOne({
        _id: { $ne: folder._id },
        name: { $regex: `^${escapeRegExp(rawName)}$`, $options: "i" },
      });
      if (dup) return jsonError(res, `A folder named "${dup.name}" already exists.`, 409);
      await foldersCol.updateOne({ _id: folder._id }, { $set: { name: rawName } });
      // keep the denormalized copy on the files in sync
      await db.collection("admin_documents").updateMany({ folderId: folder._id }, { $set: { folderName: rawName } });
      await db.collection("admin_activity").insertOne({
        adminEmail: String(admin.email || ADMIN_EMAIL).toLowerCase(),
        type: "folder_rename",
        detail: `Renamed vault folder: ${folder.name} → ${rawName}`,
        meta: { folderId: id },
        createdAt: new Date(),
      });
      return jsonOk(res, { success: true, message: "Folder renamed.", folder: { id, name: rawName } });
    } catch (err: any) {
      console.error("PATCH /api/admin/documents/folders/:id error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ DELETE /api/admin/documents/folders/:id ============
  // Empty folders delete outright. Non-empty folders return 400 unless the
  // caller opts into { moveFilesToRoot: true }, which pulls every file back
  // to "All Files" — files are never destroyed by a folder delete.
  if (route.startsWith("documents/folders/") && req.method === "DELETE") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const id = route.slice("documents/folders/".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid folder id.", 400);
      const foldersCol = db.collection("admin_document_folders");
      const folder = await foldersCol.findOne({ _id: new ObjectId(id) });
      if (!folder) return jsonError(res, "Folder not found.", 404);
      const docsCol = db.collection("admin_documents");
      const fileCount = await docsCol.countDocuments({ folderId: folder._id });
      if (fileCount > 0 && !(req.body || {}).moveFilesToRoot) {
        return jsonError(
          res,
          `"${folder.name}" still contains ${fileCount} file${fileCount === 1 ? "" : "s"}. Move or delete them first, or choose to move them back to All Files.`,
          400
        );
      }
      if (fileCount > 0) {
        await docsCol.updateMany(
          { folderId: folder._id },
          { $set: { folderId: null, folderName: null } }
        );
      }
      await foldersCol.deleteOne({ _id: folder._id });
      await db.collection("admin_activity").insertOne({
        adminEmail: String(admin.email || ADMIN_EMAIL).toLowerCase(),
        type: "folder_delete",
        detail: `Deleted vault folder: ${folder.name}`,
        meta: { folderId: id, filesMovedToRoot: fileCount },
        createdAt: new Date(),
      });
      return jsonOk(res, {
        success: true,
        message:
          fileCount > 0
            ? `Folder deleted — ${fileCount} file${fileCount === 1 ? "" : "s"} moved back to All Files.`
            : "Folder deleted.",
      });
    } catch (err: any) {
      console.error("DELETE /api/admin/documents/folders/:id error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/documents/:id/move (move between folders) ============
  if (route.startsWith("documents/") && route.endsWith("/move") && req.method === "POST") {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const id = route.slice("documents/".length, -"/move".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid document id.", 400);
      const doc = await db.collection("admin_documents").findOne({ _id: new ObjectId(id) });
      if (!doc) return jsonError(res, "Document not found.", 404);
      const rawFolderId = (req.body || {}).folderId;
      let folderId: ObjectId | null = null;
      let folderName: string | null = null;
      if (rawFolderId !== null && rawFolderId !== undefined && rawFolderId !== "" && rawFolderId !== "root") {
        if (typeof rawFolderId !== "string" || !ObjectId.isValid(rawFolderId)) {
          return jsonError(res, "Invalid target folder id.", 400);
        }
        const folder = await db.collection("admin_document_folders").findOne({ _id: new ObjectId(rawFolderId) });
        if (!folder) return jsonError(res, "Target folder not found.", 404);
        if (doc.folderId && String(doc.folderId) === String(folder._id)) {
          return jsonOk(res, { success: true, message: "File is already in that folder.", folder: { id: rawFolderId, name: folder.name } });
        }
        folderId = folder._id;
        folderName = folder.name;
      }
      if (doc.folderId && folderId && String(doc.folderId) === String(folderId)) {
        return jsonOk(res, { success: true, message: "File is already in that folder.", folder: { id: String(folderId), name: folderName } });
      }
      await db
        .collection("admin_documents")
        .updateOne({ _id: doc._id }, { $set: { folderId, folderName } });
      const label = folderName ? folderName : "All Files";
      await db.collection("admin_activity").insertOne({
        adminEmail: String(admin.email || ADMIN_EMAIL).toLowerCase(),
        type: "document_move",
        detail: `Moved ${doc.name} to ${label}`,
        meta: { documentId: id, folderId: folderId ? String(folderId) : null },
        createdAt: new Date(),
      });
      return jsonOk(res, { success: true, message: `Moved to ${label}.`, folder: { id: folderId ? String(folderId) : null, name: folderName } });
    } catch (err: any) {
      console.error("POST /api/admin/documents/:id/move error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/documents (list + storage stats) ============
  if (route === "documents" && req.method === "GET") {
    try {
      const urlQ = new URL(req.url || "", "http://localhost").searchParams;
      const q = String(urlQ.get("q") || "").trim();
      const type = String(urlQ.get("type") || "").trim().toLowerCase();
      const folder = String(urlQ.get("folder") || "").trim();
      const filter: any = {};
      if (q) filter.name = { $regex: escapeRegExp(q), $options: "i" };
      if (type && type !== "all") filter.group = type;
      // folder scoping: "root" = files not in any folder, else the ObjectId.
      // When the param is absent (search / type filter) results span the
      // whole vault so nothing can hide inside a folder.
      if (folder === "root") {
        filter.$or = [{ folderId: null }, { folderId: { $exists: false } }];
      } else if (folder && ObjectId.isValid(folder)) {
        filter.folderId = new ObjectId(folder);
      }
      const col = db.collection("admin_documents");
      const [docs, agg] = await Promise.all([
        col.find(filter).sort({ uploadedAt: -1 }).limit(300).toArray(),
        col
          .aggregate([{ $group: { _id: "$group", count: { $sum: 1 }, bytes: { $sum: "$size" } } }])
          .toArray(),
      ]);
      const byGroup: Record<string, { count: number; bytes: number }> = {};
      let totalBytes = 0;
      let totalCount = 0;
      for (const row of agg) {
        byGroup[String(row._id)] = { count: row.count, bytes: row.bytes };
        totalBytes += row.bytes;
        totalCount += row.count;
      }
      return jsonOk(res, {
        success: true,
        documents: docs.map((d: any) => ({
          id: d._id.toString(),
          name: d.name,
          ext: d.ext,
          group: d.group,
          mime: d.mime,
          size: d.size,
          folderId: d.folderId ? String(d.folderId) : null,
          folderName: d.folderName || null,
          uploadedBy: d.uploadedBy,
          uploadedAt: d.uploadedAt,
          downloads: d.downloads || 0,
        })),
        stats: { count: totalCount, totalBytes, byGroup },
      });
    } catch (err: any) {
      console.error("GET /api/admin/documents error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/admin/documents/:id/download ============
  if (route.startsWith("documents/") && route.endsWith("/download") && req.method === "GET") {
    try {
      const id = route.slice("documents/".length, -"/download".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid document id.", 400);
      const meta = await db.collection("admin_documents").findOne({ _id: new ObjectId(id) });
      if (!meta) return jsonError(res, "Document not found.", 404);
      const bucket = new GridFSBucket(db, { bucketName: "admin_documents" });
      const bytes = await new Promise<Buffer>((resolve, reject) => {
        const parts: Buffer[] = [];
        const ds = bucket.openDownloadStream(meta.fileId);
        ds.on("data", (c: any) => parts.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        ds.on("end", () => resolve(Buffer.concat(parts)));
        ds.on("error", reject);
      });
      await db
        .collection("admin_documents")
        .updateOne({ _id: meta._id }, { $inc: { downloads: 1 }, $set: { lastDownloadAt: new Date() } });
      const asciiName = String(meta.name || "document").replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
      const utf8Name = encodeURIComponent(String(meta.name || "document"));
      res.writeHead(200, {
        "Content-Type": String(meta.mime || "application/octet-stream"),
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(bytes);
      return;
    } catch (err: any) {
      console.error("GET /api/admin/documents/:id/download error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ============ DELETE /api/admin/documents/:id ============
  if (route.startsWith("documents/") && req.method === "DELETE" && !route.endsWith("/download")) {
    try {
      const admin = verifyAdmin(req);
      if (!admin) return jsonError(res, "Admin authentication required", 401);
      const id = route.slice("documents/".length);
      if (!ObjectId.isValid(id)) return jsonError(res, "Invalid document id.", 400);
      const meta = await db.collection("admin_documents").findOne({ _id: new ObjectId(id) });
      if (!meta) return jsonError(res, "Document not found.", 404);
      // manager authority or the original uploader may delete
      const isMgr = hasAuthority(admin, "manager");
      const isOwner =
        String(meta.uploadedBy?.email || "") === String(admin.email || "").toLowerCase();
      if (!isMgr && !isOwner) {
        return jsonError(res, "Only managers (or the uploader) can delete vault files.", 403);
      }
      const bucket = new GridFSBucket(db, { bucketName: "admin_documents" });
      try {
        await bucket.delete(meta.fileId);
      } catch { /* GridFS file already gone — metadata cleanup still applies */ }
      await db.collection("admin_documents").deleteOne({ _id: meta._id });
      await db.collection("admin_activity").insertOne({
        adminEmail: String(admin.email || ADMIN_EMAIL).toLowerCase(),
        type: "document_delete",
        detail: `Deleted document: ${meta.name}`,
        meta: { size: meta.size, ext: meta.ext },
        createdAt: new Date(),
      });
      return jsonOk(res, { success: true, message: "Document deleted from the vault." });
    } catch (err: any) {
      console.error("DELETE /api/admin/documents/:id error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  // ===========================================================================
  // PAYMENT GATEWAY (Rapid) — configuration, testing and diagnostics.
  // Guard: super admin OR Administrator-authority staff OR IT authority.
  // IT accounts reach this block through the central IT-scope guard above;
  // every route here re-checks with requireGatewayTech (defense in depth).
  // ===========================================================================

  // ============ GET /api/admin/gateway-config ============
  if (route === "gateway-config" && req.method === "GET") {
    if (!requireGatewayTech(req, res)) return;
    try {
      const status = await describeGatewayStatus();
      return jsonOk(res, { success: true, ...status });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/gateway-config ============
  // Body: { secretKey?, webhookSalt?, webhookSaltPrev?, apiBase?, methods?, clear?: string[] }
  // Secrets are write-only: stored AES-256-GCM encrypted, returned masked.
  if (route === "gateway-config" && req.method === "POST") {
    if (!requireGatewayTech(req, res)) return;
    try {
      const body = req.body || {};
      const actor = String((req as any).admin?.email || (req as any).user?.email || "admin");
      await saveRapidConfig(
        {
          secretKey: typeof body.secretKey === "string" ? body.secretKey : undefined,
          webhookSalt: typeof body.webhookSalt === "string" ? body.webhookSalt : undefined,
          webhookSaltPrev: typeof body.webhookSaltPrev === "string" ? body.webhookSaltPrev : undefined,
          apiBase: typeof body.apiBase === "string" ? body.apiBase : undefined,
          methods: typeof body.methods === "string" ? body.methods : undefined,
          clear: Array.isArray(body.clear) ? body.clear.map(String) : [],
        },
        actor
      );
      const status = await describeGatewayStatus();
      return jsonOk(res, { success: true, message: "Gateway configuration saved.", ...status });
    } catch (err: any) {
      console.error("POST /api/admin/gateway-config error:", err);
      return jsonError(res, err.message || "Could not save the gateway configuration.", 500);
    }
  }

  // ============ GET /api/admin/gateway-logs ============
  // Recent webhook deliveries + flagged (needs review) orders + IT test orders.
  if (route === "gateway-logs" && req.method === "GET") {
    if (!requireGatewayTech(req, res)) return;
    try {
      const [deliveries, flagged, testOrders] = await Promise.all([
        db
          .collection("rapid_webhook_log")
          .find({})
          .sort({ receivedAt: -1 })
          .limit(60)
          .project({
            receivedAt: 1,
            verified: 1,
            verifiedVia: 1,
            eventId: 1,
            eventType: 1,
            orderNumber: 1,
            merchantTransactionId: 1,
            gatewayTxnRef: 1,
            status: 1,
            amount: 1,
            currency: 1,
            environment: 1,
            action: 1,
            rejectReason: 1,
            appliedPaymentStatus: 1,
            appliedOrderStatus: 1,
            expectedAmount: 1,
          })
          .toArray(),
        db
          .collection("orders")
          .find({ paymentFlag: { $type: "string", $ne: "reviewed" } })
          .sort({ createdAt: -1 })
          .limit(20)
          .project({
            orderNumber: 1,
            customerName: 1,
            customerEmail: 1,
            totalAmount: 1,
            currency: 1,
            status: 1,
            paymentStatus: 1,
            paymentFlag: 1,
            paymentFlagDetail: 1,
            createdAt: 1,
          })
          .toArray(),
        db
          .collection("orders")
          .find({ isGatewayTest: true })
          .sort({ createdAt: -1 })
          .limit(15)
          .project({
            orderNumber: 1,
            totalAmount: 1,
            currency: 1,
            status: 1,
            paymentStatus: 1,
            checkoutUrl: 1,
            rapidPaymentId: 1,
            createdAt: 1,
          })
          .toArray(),
      ]);
      const status = await describeGatewayStatus();
      return jsonOk(res, {
        success: true,
        deliveries,
        flagged,
        testOrders,
        config: status,
      });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/admin/gateway-test ============
  // Body: { action: "connectivity" | "webhook-selftest" | "test-payment", amount? }
  if (route === "gateway-test" && req.method === "POST") {
    if (!requireGatewayTech(req, res)) return;
    const action = String((req.body || {}).action || "");
    const actor = String((req as any).admin?.email || (req as any).user?.email || "admin");
    try {
      // ---- connectivity: is the Rapid API base reachable (no credentials sent) ----
      if (action === "connectivity") {
        const cfg = await getRapidConfig(true);
        const started = Date.now();
        try {
          const res2 = await fetch(cfg.apiBase, { method: "GET", signal: AbortSignal.timeout(8000) });
          return jsonOk(res, {
            success: true,
            action,
            reachable: true,
            httpStatus: res2.status,
            latencyMs: Date.now() - started,
            apiBase: cfg.apiBase,
            secretKeyPresent: Boolean(cfg.secretKey),
          });
        } catch (e: any) {
          return jsonOk(res, {
            success: true,
            action,
            reachable: false,
            error: e?.message || "Unreachable",
            latencyMs: Date.now() - started,
            apiBase: cfg.apiBase,
            secretKeyPresent: Boolean(cfg.secretKey),
          });
        }
      }

      // ---- webhook-selftest: sign a webhook.test event with the configured
      // salt and post it to our own public webhook endpoint — exercises the
      // full HMAC verification + logging pipeline end-to-end.
      if (action === "webhook-selftest") {
        const cfg = await getRapidConfig(true);
        if (!cfg.webhookSalt && !cfg.webhookSaltPrev) {
          return jsonError(res, "Configure the webhook signing salt first.", 400);
        }
        const crypto = await import("crypto");
        const eventId = `selftest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const rawBody = JSON.stringify({
          eventId,
          eventType: "webhook.test",
          environment: "ADMIN-SELFTEST",
          occurredAt: new Date().toISOString(),
        });
        const ts = Math.floor(Date.now() / 1000);
        const sig = crypto
          .createHmac("sha256", cfg.webhookSalt || cfg.webhookSaltPrev)
          .update(`${ts}.${rawBody}`)
          .digest("hex")
          .toUpperCase();
        const started = Date.now();
        const res2 = await fetch(cfg.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidGateway-Signature": sig,
            "X-RapidGateway-Timestamp": String(ts),
            "X-RapidGateway-Event": "webhook.test",
            "X-RapidGateway-Delivery": eventId,
          },
          body: rawBody,
          signal: AbortSignal.timeout(10000),
        });
        const data = await res2.json().catch(() => null);
        return jsonOk(res, {
          success: true,
          action,
          httpStatus: res2.status,
          latencyMs: Date.now() - started,
          verified: res2.ok && data?.success === true,
          response: data,
        });
      }

      // ---- test-payment: create a clearly-labelled PENDING test order and
      // ask Rapid for a hosted checkout URL. The order is NEVER marked paid
      // except by a verified webhook — exactly like production traffic.
      if (action === "test-payment") {
        const cfg = await getRapidConfig(true);
        if (!cfg.secretKey) {
          return jsonError(res, "Configure the Rapid secret key first.", 400);
        }
        const amount = Math.min(Math.max(Number((req.body || {}).amount) || 100, 10), 5000);
        const orderNumber = `PB-GWTEST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const ordersCol = db.collection("orders");
        await ordersCol.insertOne({
          orderNumber,
          userId: `gateway-test:${actor}`,
          customerName: "Gateway Test (IT)",
          customerEmail: actor,
          items: [
            {
              id: "gateway-test-item",
              productId: "gateway-test-item",
              name: "Gateway Integration Test",
              price: amount,
              quantity: 1,
              licenseKeys: [],
              deliveryType: "Instant Auto-Email",
            },
          ],
          totalAmount: amount,
          currency: "PKR",
          status: "pending",
          paymentMethod: "Rapid Gateway",
          paymentStatus: "pending",
          paymentProvider: "rapid",
          isGatewayTest: true,
          licenseKeysDelivered: [],
          createdAt: new Date(),
        });
        const result = await createRapidPayment({
          orderNumber,
          amount,
          currency: "PKR",
          customerEmail: actor,
          returnUrl: `${PUBLIC_SITE_URL.replace(/\/+$/, "")}/order/${encodeURIComponent(orderNumber)}`,
        });
        await ordersCol.updateOne(
          { orderNumber },
          {
            $set: {
              rapidPaymentId: result.paymentId || "",
              checkoutUrl: result.checkoutUrl || "",
              paymentInitiatedAt: new Date(),
              ...(result.ok ? {} : { testPaymentError: String(result.error || "") }),
            },
          }
        );
        try {
          await db.collection("gateway_config_audit").insertOne({
            gateway: "rapid",
            action: "test-payment",
            orderNumber,
            amount,
            ok: Boolean(result.ok),
            updatedBy: actor,
            at: new Date(),
          });
        } catch { /* audit best-effort */ }
        return jsonOk(res, {
          success: true,
          action,
          orderNumber,
          amount,
          checkoutUrl: result.checkoutUrl || null,
          ok: Boolean(result.ok),
          error: result.error || null,
        });
      }

      return jsonError(res, "Unknown test action. Use connectivity | webhook-selftest | test-payment.", 400);
    } catch (err: any) {
      console.error("POST /api/admin/gateway-test error:", err);
      return jsonError(res, err.message || "Gateway test failed.", 500);
    }
  }

  // ============ POST /api/admin/gateway-resolve ============
  // Body: { orderNumber, action: "mark-reviewed" | "delete-test-order", note? }
  if (route === "gateway-resolve" && req.method === "POST") {
    if (!requireGatewayTech(req, res)) return;
    try {
      const { orderNumber, action, note } = req.body || {};
      if (!orderNumber || !action) return jsonError(res, "orderNumber and action are required.", 400);
      const actor = String((req as any).admin?.email || (req as any).user?.email || "admin");
      const ordersCol = db.collection("orders");

      if (action === "mark-reviewed") {
        const r = await ordersCol.updateOne(
          { orderNumber: String(orderNumber), paymentFlag: { $type: "string" } },
          {
            $set: {
              paymentFlag: "reviewed",
              "paymentFlagDetail.resolvedBy": actor,
              "paymentFlagDetail.resolvedAt": new Date(),
              "paymentFlagDetail.resolutionNote": String(note || "Reviewed by IT"),
            },
          }
        );
        if (!r.matchedCount) return jsonError(res, "Flagged order not found (or already reviewed).", 404);
        return jsonOk(res, { success: true, message: `Order ${orderNumber} marked as reviewed.` });
      }

      if (action === "delete-test-order") {
        // Safety: only gateway test orders (PB-GWTEST- prefix) can be deleted.
        if (!String(orderNumber).startsWith("PB-GWTEST-")) {
          return jsonError(res, "Only PB-GWTEST-* test orders can be deleted here.", 400);
        }
        const r = await ordersCol.deleteOne({ orderNumber: String(orderNumber), isGatewayTest: true });
        if (!r.deletedCount) return jsonError(res, "Test order not found.", 404);
        return jsonOk(res, { success: true, message: `Test order ${orderNumber} deleted.` });
      }

      return jsonError(res, "Unknown resolve action.", 400);
    } catch (err: any) {
      return jsonError(res, err.message || "Resolve failed.", 500);
    }
  }

  return jsonError(res, `Admin route not found: ${route}`, 404);
}

// Playbeat Admin Android app release metadata (updated when a new APK is shipped)
const APP_RELEASE = {
  version: "1.0.0",
  versionCode: 1,
  apkUrl: "/downloads/playbeat-admin-v1.0.0.apk",
  sizeBytes: 116097,
  sha256: "294325bcb0c913902baef9f7cd7a9f717ec434cef3951fb629231d8a9decf9c3",
  updatedAt: "2026-09-01T00:00:00.000Z",
  changelog: [
    "Initial release — full admin dashboard in your pocket",
    "Same super admin / staff login as the web panel",
    "Live device heartbeat (60s) with admin-panel status monitoring",
    "Role-restricted access identical to the web experience",
  ],
};
