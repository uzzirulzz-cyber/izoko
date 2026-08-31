// /api/cms/* — Website Builder CMS settings (public GET)
// Routes:
//   GET /api/cms          (public site settings — announcement, hero, contact, social)
//   GET /api/cms/settings (alias)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/mongo.js";
import { handleOptions, jsonOk, jsonError } from "../_lib/auth.js";

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
    address: "PlayBeat Digital Pvt Ltd, Main Boulevard, Gulberg III, Lahore, Punjab, Pakistan",
    hours: "Support: 24/7 Automated — Live agents 10AM-10PM PKT",
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
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
