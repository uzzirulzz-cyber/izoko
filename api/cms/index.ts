// /api/cms/* — Website Builder CMS settings (public GET, admin POST)
// Routes:
//   GET  /api/cms              (public site settings — announcement, hero, contact, social)
//   GET  /api/cms/settings     (alias)
//   GET  /api/cms/homepage     (public homepage-builder sections: hero/banners/featured/FAQ/testimonials)
//   POST /api/cms              (admin only — update site settings)
//
// Homepage sections live in the `homepage_sections` collection:
//   { type: "hero"|"banner"|"featured"|"faq"|"testimonial", enabled, order,
//     title, subtitle, body, image, link, linkLabel, items: [...], updatedAt }
// Admin CRUD: /api/admin/cms/homepage (see api/admin).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireAdmin,
  verifyUser,
  AuthenticatedRequest,
} from "../_lib/auth.js";
import {
  nextServiceRequestId,
  validateServiceRequest,
  publicRequestView,
} from "../_lib/servicesStore.js";

export const CMS_DEFAULTS = {
  announcement: {
    enabled: true,
    text: "Instant digital delivery 24/7 — Official Magcubic Projector Partner in Pakistan",
    link: "",
  },
  hero: {
    badge: "Pakistan's #1 Digital Marketplace",
    title: "Instant Licenses & Smart 4K Cinema",
    subtitle:
      "Buy verified streaming subscriptions, game keys, AI tools and official Magcubic smart projectors with automated 15-second delivery.",
  },
  contact: {
    email: "support@playbeat.digital",
    supportEmail: "support@playbeat.pro",
    whatsapp: "923000000000",
    phone: "+92 300 0000000",
    address: "PlayBeat Digital Pvt Ltd, Abbottabad, Khyber Pakhtunkhwa, Pakistan",
    hours: "Support: 24/7 Automated — Live agents 10AM-10PM PKT",
    wechat: "@playbeatdigital01",
    whatsappBusiness: "@playbeatdigital01",
    telegram: "@playbeatdigital01",
  },
  social: {
    instagram: "https://instagram.com/playbeat.digital",
    facebook: "https://facebook.com/playbeat.digital",
    tiktok: "https://tiktok.com/@playbeat.digital",
    telegram: "https://t.me/playbeatdigital",
  },
  footer: {
    uptimeNote: "Fulfillment Systems Active (99.99% Uptime)",
  },
};

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const url = new URL(req.url || "", "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);
  // Services/Business-Solutions router — rewrites point /api/services/* here
  // while req.url keeps the ORIGINAL path, so branch on the real prefix.
  if (parts[1] === "services" || (req.method === "POST" && parts[1] === "service-requests")) {
    return handleServicesRoute(req, res, parts[1] === "service-requests" ? parts.slice(2) : parts.slice(2));
  }

  const seg = parts.slice(2);

  // ---- GET /api/cms/homepage — public homepage-builder content ----
  if (seg[0] === "homepage" && req.method === "GET") {
    try {
      const db = await getDb();
      const docs = await db
        .collection("homepage_sections")
        .find({ enabled: { $ne: false } })
        .sort({ order: 1 })
        .limit(60)
        .toArray();
      const ALLOWED_TYPES = new Set(["hero", "banner", "featured", "faq", "testimonial"]);
      const sections = docs
        .filter((d: any) => ALLOWED_TYPES.has(String(d.type)))
        .map((d: any) => ({
          id: String(d._id),
          type: d.type,
          order: Number(d.order || 0),
          title: d.title || "",
          subtitle: d.subtitle || "",
          body: d.body || "",
          image: d.image || null,
          link: d.link || null,
          linkLabel: d.linkLabel || null,
          badge: d.badge || null,
          items: Array.isArray(d.items)
            ? d.items.map((i: any) => ({
                title: String(i?.title || "").slice(0, 200),
                body: String(i?.body || "").slice(0, 1000),
                author: i?.author ? String(i.author).slice(0, 80) : undefined,
                rating: Number(i?.rating) || undefined,
                image: i?.image || undefined,
                link: i?.link || undefined,
              }))
            : [],
        }));
      return jsonOk(res, { success: true, sections });
    } catch (err: any) {
      // Fail-safe: homepage still renders without DB sections
      return jsonOk(res, { success: true, sections: [] });
    }
  }

  // POST — admin only, update site settings
  if (req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    try {
      const db = await getDb();
      const body = req.body?.settings || req.body || {};
      // Merge incoming settings with existing DB doc + defaults
      const existing = await db.collection("site_settings").findOne({ key: "site" });
      const merged: any = { ...CMS_DEFAULTS, ...(existing?.settings || {}) };
      // Deep-merge each section
      for (const k of Object.keys(body)) {
        if (typeof body[k] === "object" && !Array.isArray(body[k])) {
          merged[k] = { ...(merged[k] || {}), ...body[k] };
        } else {
          merged[k] = body[k];
        }
      }
      await db.collection("site_settings").updateOne(
        { key: "site" },
        { $set: { key: "site", settings: merged, updatedAt: new Date() } },
        { upsert: true }
      );
      return jsonOk(res, { success: true, message: "CMS settings updated", settings: merged });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // GET — public
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const db = await getDb();
    const doc = await db.collection("site_settings").findOne({ key: "site" });
    const settings = { ...CMS_DEFAULTS, ...(doc?.settings || {}) };
    // Deep-merge top-level sections with defaults
    for (const k of Object.keys(CMS_DEFAULTS)) {
      settings[k] = { ...(CMS_DEFAULTS as any)[k], ...((doc?.settings || {})[k] || {}) };
    }
    return jsonOk(res, { success: true, settings, updatedAt: doc?.updatedAt || null });
  } catch (err: any) {
    // Fail-safe: serve defaults if DB is unreachable
    return jsonOk(res, { success: true, settings: CMS_DEFAULTS, updatedAt: null });
  }
}

// ===========================================================================
// SERVICES / BUSINESS SOLUTIONS router — mounted from the main handler above.
//   GET  /api/services                 → published services (public)
//   GET  /api/services/:slug           → one published service (public)
//   GET  /api/services/portfolio       → published case studies (privacy-filtered)
//   POST /api/services/requests        → public project request (rate-limited)
//   POST /api/service-requests         → alias of the above
//   GET  /api/services/my-requests     → signed-in customer's own requests
// ===========================================================================
async function handleServicesRoute(req: AuthenticatedRequest, res: VercelResponse, seg: string[]) {
  const db = await getDb().catch(() => null);
  if (!db) return jsonError(res, "Database unavailable", 503);
  const route = (seg || []).join("/").toLowerCase();

  // ---- GET /api/services (list) -------------------------------------------
  if (route === "" && req.method === "GET") {
    try {
      const docs = await db
        .collection("services")
        .find({ published: { $ne: false } })
        .sort({ displayOrder: 1, title: 1 })
        .limit(60)
        .toArray();
      return jsonOk(res, { success: true, services: docs.map(({ _id, createdAt, updatedAt, seoTitle, seoDescription, ...s }: any) => s) });
    } catch (err: any) {
      return jsonError(res, err.message || "Could not load services", 500);
    }
  }

  // ---- GET /api/services/portfolio ----------------------------------------
  if (route === "portfolio" && req.method === "GET") {
    try {
      const docs = await db
        .collection("service_portfolio")
        .find({ published: { $ne: false } })
        .sort({ featured: -1, createdAt: -1 })
        .limit(40)
        .toArray();
      // Privacy: client names are stripped unless showClientName is true (brief §27)
      const items = docs.map((d: any) => {
        const { clientName, showClientName, ...p } = d;
        return { ...p, _id: undefined, clientName: showClientName ? clientName : null };
      });
      return jsonOk(res, { success: true, portfolio: items });
    } catch (err: any) {
      return jsonError(res, err.message || "Could not load portfolio", 500);
    }
  }

  // ---- GET /api/services/my-requests (signed-in customer) ------------------
  if (route === "my-requests" && req.method === "GET") {
    const user = verifyUser(req);
    if (!user) return jsonError(res, "Authentication required", 401);
    try {
      const docs = await db
        .collection("service_requests")
        .find({ userId: String(user.id || user._id || "") })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();
      return jsonOk(res, { success: true, requests: docs.map(publicRequestView) });
    } catch (err: any) {
      return jsonError(res, err.message || "Could not load requests", 500);
    }
  }

  // ---- POST /api/services/requests (public submission) ---------------------
  if ((route === "requests" || route === "") && req.method === "POST") {
    try {
      const { mongoRateLimit } = await import("../_lib/rateLimit.js");
      const { clientIp } = await import("../_lib/rateLimit.js");
      const rl = await mongoRateLimit(db, `service-requests:${clientIp(req as any)}`, 5, 60);
      if (!rl.allowed) {
        return jsonError(res, `Too many requests — please try again in ${rl.retryAfterSec}s.`, 429);
      }
      const user = verifyUser(req);
      const data = validateServiceRequest(req.body || {});
      const requestId = await nextServiceRequestId(db);
      const now = new Date();
      await db.collection("service_requests").insertOne({
        requestId,
        userId: user ? String(user.id || user._id || "") : null,
        ...data,
        status: "new",
        assignedTo: null,
        internalNotes: [],
        estimatedQuote: null,
        finalQuote: null,
        proposalFiles: [],
        statusHistory: [{ status: "new", at: now, by: "customer" }],
        createdAt: now,
        updatedAt: now,
      });
      return jsonOk(res, {
        success: true,
        requestId,
        message: "Project request received. Our team will contact you shortly.",
      });
    } catch (err: any) {
      return jsonError(res, err.message || "Could not submit the request", 400);
    }
  }

  // ---- GET /api/services/:slug (detail) ------------------------------------
  if (req.method === "GET" && route && route !== "requests") {
    try {
      const doc = await db.collection("services").findOne({ slug: route, published: { $ne: false } });
      if (!doc) return jsonError(res, "Service not found", 404);
      const { _id, createdAt, updatedAt, ...s } = doc;
      return jsonOk(res, { success: true, service: s });
    } catch (err: any) {
      return jsonError(res, err.message || "Could not load the service", 500);
    }
  }

  return jsonError(res, "Method not allowed", 405);
}
