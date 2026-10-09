// /api/analytics/* — real traffic analytics (no mock data)
// Routes:
//   POST /api/analytics           (record an event — public, lightweight)
//   GET  /api/analytics/summary   (admin-protected traffic overview)
import { PUBLIC_TRAFFIC_FILTER, trafficSource, reportingWindow, businessOrdersFilter, PAID_ORDER_FILTER } from "../_lib/reporting.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from 'node:crypto';
import { cleanLiveEvent } from '../_lib/playbeatLive.js';
import { getDb } from "../_lib/mongo.js";
import { getTrackingConfig, touchTrackingHeartbeat } from "../_lib/trackingConfig.js";
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

  if (route === 'live/event' && req.method === 'POST') {
    const secret = process.env.LIVE_DASHBOARD_TOKEN;
    if (!secret) return jsonError(res, 'Live reporting not configured.', 503);
    const supplied = String(req.headers.authorization || '');
    const expected = 'Bearer ' + secret;
    if (supplied.length > 1024 || !crypto.timingSafeEqual(crypto.createHash('sha256').update(supplied).digest(), crypto.createHash('sha256').update(expected).digest())) return jsonError(res, 'Unauthorized.', 401);
    try { const event = cleanLiveEvent(req.body); if (!event) return jsonOk(res, { success: true, ignored: true });
      const db = await getDb(); await db.collection('playbeat_live_events').insertOne(event); return jsonOk(res, { success: true });
    } catch (error: any) { return jsonError(res, error.message || 'Event could not be stored.', 400); }
  }

  // ============ POST /api/analytics (public event recording) ============
  if (!route && req.method === "POST") {
    try {
      const body = req.body || {};
      const type = String(body.type || "page_view").toLowerCase();
      if (!ALLOWED_EVENTS.includes(type)) {
        return jsonError(res, `Unsupported event type: ${type}`, 400);
      }
      if (/^\/(?:admin|crm)(?:[/?#]|$)/i.test(String(body.path || ""))) return jsonOk(res, { success: true, ignored: true });
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
        referrer: String(typeof body.referrer === "string" ? body.referrer : req.headers.referer || "").slice(0, 300),
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
      const { days, start: startDate, end } = reportingWindow(url2.searchParams.get("days"));
      const db = await getDb();
      const col = db.collection("analytics_events");

      const [totalEvents, pageViews, uniqueSessions, productViews, signups, addToCart, checkouts] = await Promise.all([
        col.countDocuments({ ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } }),
        col.countDocuments({ type: "page_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } }),
        col.distinct("sessionId", { type: "page_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } }),
        col.countDocuments({ type: "product_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } }),
        col.countDocuments({ type: "signup", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } }),
        col.countDocuments({ type: "add_to_cart", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } }),
        col.countDocuments({ type: "checkout", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } }),
      ]);

      const dailyAgg = await col
        .aggregate([
          { $match: { type: "page_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } } },
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
        const d = new Date(end.getTime() - (i + 1) * 86400000);
        const key = d.toISOString().split("T")[0];
        const found = dailyAgg.find((a: any) => a._id === key);
        series.push({
          date: key,
          views: found?.views || 0,
          sessions: (found?.sessions || []).filter(Boolean).length,
        });
      }

      const topPages = await col
        .aggregate([
          { $match: { type: "page_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } } },
          { $group: { _id: "$path", views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: 8 },
        ])
        .toArray();

      const topProducts = await col
        .aggregate([
          { $match: { type: "product_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } } },
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
          { $match: { type: "page_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } } },
          { $group: { _id: "$device", count: { $sum: 1 } } },
        ])
        .toArray();

      const referrers = await col
        .aggregate([
          { $match: { type: "page_view", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } } },
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
        ])
        .toArray();

      const sourceCounts = new Map<string, number>();
      for (const row of referrers) { const source = trafficSource(row._id === "(direct)" ? "" : row._id); sourceCounts.set(source, (sourceCounts.get(source) || 0) + row.count); }
      const paidOrders = await db.collection("orders").aggregate([{ $match: { ...businessOrdersFilter(), ...PAID_ORDER_FILTER } }, { $addFields: { reportDate: { $ifNull: ["$paidAt", "$createdAt"] } } }, { $match: { reportDate: { $gte: startDate, $lt: end } } }, { $count: "count" }]).toArray();
      const topSearches = await col
        .aggregate([
          { $match: { type: "search", ...PUBLIC_TRAFFIC_FILTER, createdAt: { $gte: startDate, $lt: end } } },
          { $group: { _id: "$searchQuery", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ])
        .toArray();

      return jsonOk(res, {
        success: true,
        analytics: {
          days,
          paidOrders: paidOrders[0]?.count || 0,
          timezone: "UTC",
          totalEvents,
          pageViews,
          uniqueVisitors: uniqueSessions.filter(Boolean).length,
          productViews,
          signups,
          addToCart,
          checkout: checkouts,
          series,
          topPages: topPages.map((p: any) => ({ path: p._id, views: p.views })),
          topProducts: topProducts.map((p: any) => ({ id: p._id, name: p.name || p._id, views: p.views })),
          devices: devices.map((d: any) => ({ device: d._id || "unknown", count: d.count })),
          referrers: [...sourceCounts].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 8),
          topSearches: topSearches.map((s: any) => ({ query: s._id, count: s.count })),
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message || "Failed to load analytics", 500);
    }
  }

  // ============ GET /api/analytics/public-config (PUBLIC) ============
  // Returns the PUBLIC tag IDs (GA4 / GTM / AdSense / Google Ads). Measurement
  // and container IDs are public by design — they ship in page HTML. No
  // secrets, no credentials, no user data. Also records a best-effort
  // heartbeat so the admin panel can show live tracking status.
  if (route === "public-config" && req.method === "GET") {
    try {
      const { config } = await getTrackingConfig();
      const anyTracking = Boolean(
        config.ga4MeasurementId || config.gtmContainerId || config.adsenseClientId
      );
      if (anyTracking) {
        const ua = String(req.headers["user-agent"] || "");
        // fire-and-forget — do not await
        void touchTrackingHeartbeat({
          ua,
          ga4: Boolean(config.ga4MeasurementId),
          gtm: Boolean(config.gtmContainerId),
          adsense: Boolean(config.adsenseClientId) && config.adsEnabled,
        });
      }
      return jsonOk(res, {
        success: true,
        config: {
          ga4: config.ga4MeasurementId || "",
          gtm: config.gtmContainerId || "",
          adsense: config.adsEnabled ? config.adsenseClientId : "",
          googleAdsId: config.googleAdsConversionId || "",
          googleAdsPurchaseLabel: config.googleAdsPurchaseLabel || "",
          adsEnabled: Boolean(config.adsEnabled && config.adsenseClientId),
        },
      });
    } catch (err: any) {
      return jsonError(res, err.message || "Failed to load tracking config", 500);
    }
  }

  return jsonError(res, `Analytics route not found: ${route}`, 404);
}
