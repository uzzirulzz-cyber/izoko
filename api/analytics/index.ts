// /api/analytics/* — real traffic analytics (no mock data)
// Routes:
//   POST /api/analytics           (record an event — public, lightweight)
//   GET  /api/analytics/summary   (admin-protected traffic overview)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireAdmin,
  AuthenticatedRequest,
} from "../_lib/auth.js";

const ALLOWED_EVENTS = ["page_view", "product_view", "search", "add_to_cart", "signup", "checkout"];

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const url = new URL(req.url || "", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  const pathSegments = parts.slice(2); // drop "api", "analytics"
  const route = pathSegments.join("/").toLowerCase();

  // ============ POST /api/analytics (public event recording) ============
  if (!route && req.method === "POST") {
    try {
      const body = req.body || {};
      const type = String(body.type || "page_view").toLowerCase();
      if (!ALLOWED_EVENTS.includes(type)) {
        return jsonError(res, `Unsupported event type: ${type}`, 400);
      }
      const ua = String(req.headers["user-agent"] || "");
      const device = /mobile|android|iphone|ipad|ipod/i.test(ua)
        ? "mobile"
        : /tablet|ipad/i.test(ua)
        ? "tablet"
        : "desktop";
      const db = await getDb();
      await db.collection("analytics_events").insertOne({
        type,
        path: String(body.path || "/").slice(0, 300),
        productId: body.productId ? String(body.productId).slice(0, 120) : undefined,
        productName: body.productName ? String(body.productName).slice(0, 200) : undefined,
        searchQuery: body.searchQuery ? String(body.searchQuery).slice(0, 200) : undefined,
        sessionId: String(body.sessionId || "").slice(0, 80) || undefined,
        referrer: String(body.referrer || req.headers.referer || "").slice(0, 300),
        device,
        userAgent: ua.slice(0, 300),
        createdAt: new Date(),
      });
      return jsonOk(res, { success: true });
    } catch (err: any) {
      return jsonError(res, err.message || "Failed to record event", 500);
    }
  }

  // ============ GET /api/analytics/summary (admin) ============
  if ((route === "summary" || route === "overview") && req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    try {
      const url2 = new URL(req.url || "", "http://localhost");
      const days = Math.min(parseInt(url2.searchParams.get("days") || "14", 10) || 14, 90);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const db = await getDb();
      const col = db.collection("analytics_events");

      const [totalEvents, pageViews, uniqueSessions, productViews, signups] = await Promise.all([
        col.countDocuments({ createdAt: { $gte: startDate } }),
        col.countDocuments({ type: "page_view", createdAt: { $gte: startDate } }),
        col.distinct("sessionId", { type: "page_view", createdAt: { $gte: startDate } }),
        col.countDocuments({ type: "product_view", createdAt: { $gte: startDate } }),
        col.countDocuments({ type: "signup", createdAt: { $gte: startDate } }),
      ]);

      const dailyAgg = await col
        .aggregate([
          { $match: { type: "page_view", createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              views: { $sum: 1 },
              sessions: { $addToSet: "$sessionId" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const series: { date: string; views: number; sessions: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        const found = dailyAgg.find((a: any) => a._id === key);
        series.push({
          date: key,
          views: found?.views || 0,
          sessions: (found?.sessions || []).length,
        });
      }

      const topPages = await col
        .aggregate([
          { $match: { type: "page_view", createdAt: { $gte: startDate } } },
          { $group: { _id: "$path", views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: 8 },
        ])
        .toArray();

      const topProducts = await col
        .aggregate([
          { $match: { type: "product_view", createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: "$productId",
              name: { $first: "$productName" },
              views: { $sum: 1 },
            },
          },
          { $sort: { views: -1 } },
          { $limit: 8 },
        ])
        .toArray();

      const devices = await col
        .aggregate([
          { $match: { type: "page_view", createdAt: { $gte: startDate } } },
          { $group: { _id: "$device", count: { $sum: 1 } } },
        ])
        .toArray();

      const referrers = await col
        .aggregate([
          { $match: { type: "page_view", createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                $cond: [
                  { $or: [{ $eq: ["$referrer", ""] }, { $eq: ["$referrer", null] }] },
                  "(direct)",
                  "$referrer",
                ],
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ])
        .toArray();

      const topSearches = await col
        .aggregate([
          { $match: { type: "search", createdAt: { $gte: startDate } } },
          { $group: { _id: "$searchQuery", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ])
        .toArray();

      return jsonOk(res, {
        success: true,
        analytics: {
          days,
          totalEvents,
          pageViews,
          uniqueVisitors: uniqueSessions.length,
          productViews,
          signups,
          series,
          topPages: topPages.map((p: any) => ({ path: p._id, views: p.views })),
          topProducts: topProducts.map((p: any) => ({ id: p._id, name: p.name || p._id, views: p.views })),
          devices: devices.map((d: any) => ({ device: d._id || "unknown", count: d.count })),
          referrers: referrers.map((r: any) => ({ source: r._id || "(direct)", count: r.count })),
          topSearches: topSearches.map((s: any) => ({ query: s._id, count: s.count })),
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message || "Failed to load analytics", 500);
    }
  }

  return jsonError(res, `Analytics route not found: ${route}`, 404);
}
