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
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { formatProduct } from "../_lib/product.js";
import { slugify } from "../_lib/config.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireAdmin,
  requireSuperAdmin,
  verifyAdmin,
  AuthenticatedRequest,
} from "../_lib/auth.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_DB_NAME } from "../_lib/config.js";
import { hashPassword, comparePassword } from "../_lib/auth.js";
import { CMS_DEFAULTS } from "../cms/index.js";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!requireAdmin(req, res)) return;

  // Extract sub-path from req.url (Vercel rewrites /api/auth/:path* → /api/auth)
  // So we parse the ORIGINAL path from req.url to get the sub-route
  const url = new URL(req.url || '', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  // Drop the first 2 segments ("api", "auth" or "products" etc.)
  const pathSegments = parts.slice(2);
  const route = pathSegments.join("/").toLowerCase();
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

  // ============ POST /api/admin/staff/create (super admin only) ============
  if (route === "staff/create" && req.method === "POST") {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const { name, email, password, staffId, department, permissions } = req.body || {};
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
      const newStaff = {
        name: String(name).trim(),
        email: cleanEmail,
        password: hashed,
        role: "staff",
        staffId: finalStaffId,
        department: department ? String(department).trim() : "Operations",
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

  // ============ POST /api/admin/staff/update (super admin only) ============
  if (route === "staff/update" && req.method === "POST") {
    if (!requireSuperAdmin(req, res)) return;
    try {
      const { userId, name, department, permissions, active, password } = req.body || {};
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

  // ============ GET /api/admin/app/version (Playbeat Admin Android app release) ============
  if (route === "app/version" && req.method === "GET") {
    return jsonOk(res, {
      success: true,
      app: {
        name: "Playbeat Admin",
        platform: "Android",
        version: APP_RELEASE.version,
        versionCode: APP_RELEASE.versionCode,
        apkUrl: APP_RELEASE.apkUrl,
        sizeBytes: APP_RELEASE.sizeBytes,
        sha256: APP_RELEASE.sha256,
        updatedAt: APP_RELEASE.updatedAt,
        minAndroid: "7.0 (API 24)",
        targetAndroid: "Android 14 (API 34)",
        changelog: APP_RELEASE.changelog,
      },
    });
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
      const onlineNow = await devicesCol.countDocuments({
        lastSeenAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
        revoked: { $ne: true },
      });
      return jsonOk(res, { success: true, serverTime: now.toISOString(), onlineNow });
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
