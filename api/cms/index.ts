// /api/cms/* — Website Builder CMS settings (public GET, admin POST)
// Routes:
//   GET  /api/cms          (public site settings — announcement, hero, contact, social)
//   GET  /api/cms/settings (alias)
//   POST /api/cms          (admin only — update site settings)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo.js";
import { handleOptions, jsonOk, jsonError, requireAdmin, AuthenticatedRequest } from "../_lib/auth.js";

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
