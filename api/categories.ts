// GET /api/categories — DB-driven category registry (Section 3 "core decision")
//
// The catalog is aligned to the 8 target categories — Gaming, Software,
// Gift Cards, Social Media, Web Hosting, Digital Marketing, Web3, Services —
// plus the two established storefront categories (Streaming, Smart Projectors)
// that carry real business traffic and are kept (never deleted).
//
// HOW MAPPING WORKS (no parallel structure — the registry points AT the
// existing product model):
//   • `productCategories`  — existing product.category values that belong
//   • `tagRegex`           — optional curated matcher over name/tags/category
//   • `aliases`            — URL slugs that resolve to this category
//     (old routes like /steam-game-keys, /windows-office, /subscriptions and
//     /ai-subscriptions keep working as aliases — nothing is removed)
//   • `subRoutes`          — curated sub-collections rendered as chips
//
// The registry lives in the `categories` Mongo collection (lazy-seeded,
// idempotent). Counts are computed live from the products collection so the
// frontend only ever renders what the API returns.
//
// Admin: PUT /api/admin/categories (registry edits) — see api/admin.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/mongo.js";
import { handleOptions, jsonOk, jsonError } from "./_lib/auth.js";

interface CategoryRegistryDoc {
  key: string;
  slug: string;
  label: string;
  group: "core" | "store";
  description: string;
  image?: string | null;
  accentColor?: string;
  glowColor?: string;
  badgeText?: string;
  aliases: string[];
  productCategories: string[];
  tagRegex?: string | null;
  subRoutes?: Array<{ slug: string; label: string }>;
  order: number;
  enabled: boolean;
}

// The canonical seed — matches the brief's mapping table exactly.
const CATEGORY_SEED: CategoryRegistryDoc[] = [
  {
    key: "gaming", slug: "gaming", label: "Gaming", group: "core", order: 1, enabled: true,
    description: "Steam wallet codes, game keys, Xbox Game Pass, PlayStation & more — instant delivery.",
    image: "/assets/images/playbeat/category-games.png",
    accentColor: "#f5b52e", glowColor: "rgba(245,181,46,0.35)", badgeText: "Instant",
    aliases: ["gaming", "steam-game-keys", "games"],
    productCategories: ["Gaming", "Games"],
    tagRegex: "steam|game\\s?pass|game\\s?key|xbox|playstation|psn|nintendo|razer gold|valorant|gta",
    subRoutes: [{ slug: "steam-game-keys", label: "Steam & Game Keys" }],
  },
  {
    key: "software", slug: "software", label: "Software", group: "core", order: 2, enabled: true,
    description: "Windows & Office licenses, creative suites, antivirus and productivity software.",
    image: "/assets/images/playbeat/category-software.png",
    accentColor: "#4da3ff", glowColor: "rgba(77,163,255,0.35)", badgeText: "Genuine",
    aliases: ["software", "windows-office", "creative-software"],
    productCategories: ["Software"],
    tagRegex: "windows|office|adobe|creative cloud|photoshop|antivirus|mcafee|kaspersky|bitdefender|nordvpn|expressvpn|surfshark|cyberghost|protonvpn|capcut|freepik|canva|envato",
    subRoutes: [
      { slug: "windows-office", label: "Windows & Office" },
      { slug: "creative-software", label: "Creative Software" },
    ],
  },
  {
    key: "gift-cards", slug: "gift-cards", label: "Gift Cards", group: "core", order: 3, enabled: true,
    description: "Steam, PlayStation, Xbox, Apple and more — digital gift cards for every platform.",
    image: "/assets/images/playbeat/category-giftcards.png",
    accentColor: "#f5b52e", glowColor: "rgba(245,181,46,0.35)", badgeText: "Popular",
    aliases: ["gift-cards", "giftcards"],
    productCategories: ["Gift Cards"],
    tagRegex: "gift\\s?card|wallet code",
  },
  {
    key: "social-media", slug: "social-media", label: "Social Media", group: "core", order: 4, enabled: true,
    description: "Social media growth services and account top-ups — coming to the catalog shortly.",
    image: null,
    accentColor: "#e05fa0", glowColor: "rgba(224,95,160,0.35)",
    aliases: ["social-media"],
    productCategories: ["Social Media"],
    tagRegex: "social media|instagram|tiktok|facebook page|youtube shorts|followers",
  },
  {
    key: "web-hosting", slug: "web-hosting", label: "Web Hosting", group: "core", order: 5, enabled: true,
    description: "Hosting, domains, VPS and SSL — launch and run your site with PlayBeat.",
    image: null,
    accentColor: "#39c6a5", glowColor: "rgba(57,198,165,0.35)",
    aliases: ["web-hosting"],
    productCategories: ["Web Hosting"],
    tagRegex: "hosting|domain|vps|ssl|cpanel|web server",
  },
  {
    key: "digital-marketing", slug: "digital-marketing", label: "Digital Marketing", group: "core", order: 6, enabled: true,
    description: "SEO tools, marketing suites and growth services for your business.",
    image: null,
    accentColor: "#ff8a4d", glowColor: "rgba(255,138,77,0.35)",
    aliases: ["digital-marketing"],
    productCategories: ["Digital Marketing"],
    tagRegex: "digital marketing|seo|semrush|ahrefs|marketing",
  },
  {
    key: "web3", slug: "web3", label: "Web3", group: "core", order: 7, enabled: true,
    description: "Crypto top-ups, wallets and Web3 services — the next internet, today.",
    image: null,
    accentColor: "#9d7bff", glowColor: "rgba(157,123,255,0.35)",
    aliases: ["web3"],
    productCategories: ["Web3"],
    tagRegex: "web3|crypto|usdt|binance|nft|wallet connect",
  },
  {
    key: "services", slug: "services", label: "Services", group: "core", order: 8, enabled: true,
    description: "AI subscriptions, IPTV and managed digital services with human support.",
    image: "/assets/images/playbeat/category-ai.png",
    accentColor: "#4da3ff", glowColor: "rgba(77,163,255,0.35)", badgeText: "24/7",
    aliases: ["services", "ai-subscriptions", "subscriptions"],
    productCategories: ["Subscriptions", "IPTV & Services", "AI & Productivity", "Bundles"],
    tagRegex: "iptv|subscription|managed service",
    subRoutes: [{ slug: "ai-subscriptions", label: "AI Subscriptions" }],
  },
  {
    key: "streaming", slug: "streaming", label: "Streaming", group: "store", order: 9, enabled: true,
    description: "Netflix, Prime Video, Disney+, HBO Max and every major streaming platform.",
    image: "/assets/images/playbeat/category-subscriptions.png",
    accentColor: "#ff5a5f", glowColor: "rgba(255,90,95,0.35)", badgeText: "Hot",
    aliases: ["streaming"],
    productCategories: ["Streaming", "IPTV & Streaming"],
    tagRegex: "netflix|prime video|disney|hbo|hulu|spotify|youtube premium|sonyliv|zee5|crunchyroll|chaupal|jiohotstar|appletv|apple tv|ullu",
  },
  {
    key: "smart-projectors", slug: "smart-projectors", label: "Smart Projectors", group: "store", order: 10, enabled: true,
    description: "Official Magcubic smart projectors — 4K cinema for your home, shipped nationwide.",
    image: "/assets/images/playbeat/category-projectors.png",
    accentColor: "#f5b52e", glowColor: "rgba(245,181,46,0.35)", badgeText: "Official Partner",
    aliases: ["smart-projectors", "smart-4k-projectors"],
    productCategories: ["Smart Projectors"],
    tagRegex: "projector|magcubic|hy300|hy320|hcs350|hy450",
    subRoutes: [{ slug: "smart-4k-projectors", label: "Smart 4K Projectors" }],
  },
];

let seeded = false;
async function ensureRegistrySeeded(): Promise<void> {
  if (seeded) return;
  try {
    const db = await getDb();
    const col = db.collection("categories");
    for (const c of CATEGORY_SEED) {
      await col.updateOne(
        { key: c.key },
        { $setOnInsert: { ...c } },
        { upsert: true }
      );
    }
    seeded = true;
  } catch {
    /* seeding is best-effort — the DEFAULT registry below still serves */
  }
}

function defaultRegistry(): CategoryRegistryDoc[] {
  return CATEGORY_SEED;
}

/** Does a product match a registry entry? (name + tags + category, case-insensitive) */
function productMatches(p: { name?: string; category?: string; tags?: string[] }, c: CategoryRegistryDoc): boolean {
  const cat = String(p.category || "").toLowerCase().trim();
  if (c.productCategories.map((x) => x.toLowerCase()).includes(cat)) return true;
  if (!c.tagRegex) return false;
  try {
    const re = new RegExp(c.tagRegex, "i");
    const hay = `${p.name || ""} ${(Array.isArray(p.tags) ? p.tags : []).join(" ")} ${p.category || ""}`;
    return re.test(hay);
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "GET") return jsonError(res, "Method not allowed", 405);

  try {
    const db = await getDb();

    // ---- Load the registry (DB → seed → defaults) ----
    await ensureRegistrySeeded();
    let registry: CategoryRegistryDoc[] = [];
    try {
      const docs = await db
        .collection("categories")
        .find({ enabled: { $ne: false } })
        .sort({ order: 1 })
        .toArray();
      registry = docs.length
        ? docs.map((d: any) => ({ ...d, aliases: d.aliases || [d.slug], productCategories: d.productCategories || [] }))
        : defaultRegistry();
    } catch {
      registry = defaultRegistry();
    }

    // ---- Lightweight product scan for live counts (catalog is small) ----
    const products = await db
      .collection("products")
      .find({ active: { $ne: false } })
      .project({ name: 1, category: 1, tags: 1 })
      .toArray();

    const totalActive = products.length;
    const categories = registry.map((c) => {
      const count = products.filter((p: any) => productMatches(p, c)).length;
      return {
        key: c.key,
        name: c.label, // back-compat: the storefront reads `name`
        slug: c.slug,
        label: c.label,
        group: c.group || "core",
        description: c.description || "",
        image: c.image || null,
        accentColor: c.accentColor || "#f5b52e",
        glowColor: c.glowColor || "rgba(245,181,46,0.35)",
        badgeText: c.badgeText || undefined,
        aliases: Array.isArray(c.aliases) ? c.aliases : [c.slug],
        subRoutes: Array.isArray(c.subRoutes) ? c.subRoutes : [],
        href: `/${c.slug}`,
        count,
      };
    });

    return jsonOk(res, {
      success: true,
      categories: [
        { key: "all", name: "All Products", slug: "all", label: "All Products", count: totalActive, href: "/", group: "core", aliases: ["all"], subRoutes: [], description: "", image: null },
        ...categories,
      ],
    });
  } catch (err: any) {
    return jsonError(res, err.message, 500);
  }
}
