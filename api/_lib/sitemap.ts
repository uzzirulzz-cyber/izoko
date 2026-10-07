// Dynamic XML sitemap generation for playbeat.digital
// Loaded inside the existing /api/products function (NO new serverless
// function — Vercel hard-caps this project at 12 and all 12 are used).
//
// URL plan (audit §7):
//   /sitemap.xml               → sitemap index
//   /sitemap-pages.xml         → homepage + static public pages (real content only)
//   /sitemap-categories.xml    → enabled registry categories + curated sub-collections
//                                (empty categories are NOT included)
//   /sitemap-products.xml      → every active, published product as its CANONICAL
//                                /product/:slug URL (same URL the live product
//                                page uses and declares in <link rel="canonical">).
//                                Category-prefixed product URLs are NEVER generated.
//
// Everything private (admin/account/checkout/order/invoice/API/webhooks) is
// excluded by construction — these maps never read those routes.

const SITE = "https://playbeat.digital";

interface SitemapUrl {
  loc: string;
  lastmod?: Date | string | null;
  changefreq?: string;
  priority?: string;
}

function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDate(v: any): Date | null {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}

/** Real lastmod from the record — never fabricated per-deployment timestamps. */
function fmtDate(v: any): string | null {
  const d = toDate(v);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function renderUrlSet(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const lastmod = fmtDate(u.lastmod);
      return [
        "  <url>",
        `    <loc>${xmlEscape(u.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : null,
        u.priority ? `    <priority>${u.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function renderSitemapIndex(maps: { loc: string; lastmod: any }[]): string {
  const body = maps
    .map((m) => {
      const lastmod = fmtDate(m.lastmod);
      return [
        "  <sitemap>",
        `    <loc>${xmlEscape(m.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        "  </sitemap>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

// ---- Static public pages --------------------------------------------------
// Mirrors the SPA router's INDEX routes exactly (App.tsx + SEO_PRESETS).
// Routes that do not exist (no /faq, no /support pages — the FAQ and support
// live on the homepage/contact) are deliberately absent. No fake URLs.
const STATIC_PAGES: SitemapUrl[] = [
  { loc: `${SITE}/`, changefreq: "daily", priority: "1.0" },
  { loc: `${SITE}/download`, changefreq: "weekly", priority: "0.8" },
  { loc: `${SITE}/compare`, changefreq: "weekly", priority: "0.7" },
  { loc: `${SITE}/about`, changefreq: "monthly", priority: "0.7" },
  { loc: `${SITE}/contact`, changefreq: "monthly", priority: "0.7" },
  { loc: `${SITE}/warranty`, changefreq: "monthly", priority: "0.6" },
  { loc: `${SITE}/privacy`, changefreq: "yearly", priority: "0.5" },
  { loc: `${SITE}/terms`, changefreq: "yearly", priority: "0.5" },
  { loc: `${SITE}/refund-policy`, changefreq: "yearly", priority: "0.5" },
  { loc: `${SITE}/shipping-policy`, changefreq: "yearly", priority: "0.5" },
];

// Curated storefront category + sub-collection routes. Each is a real SPA
// route with its own indexable SEO preset and distinct filtered content.
const CATEGORY_ROUTE_META: Record<string, { changefreq: string; priority: string }> = {
  "streaming": { changefreq: "daily", priority: "0.9" },
  "subscriptions": { changefreq: "daily", priority: "0.9" },
  "gift-cards": { changefreq: "daily", priority: "0.9" },
  "gaming": { changefreq: "daily", priority: "0.9" },
  "software": { changefreq: "daily", priority: "0.9" },
  "smart-projectors": { changefreq: "daily", priority: "0.9" },
  "smart-4k-projectors": { changefreq: "weekly", priority: "0.8" },
  "ai-subscriptions": { changefreq: "weekly", priority: "0.8" },
  "steam-game-keys": { changefreq: "weekly", priority: "0.8" },
  "windows-office": { changefreq: "weekly", priority: "0.8" },
  "creative-software": { changefreq: "weekly", priority: "0.8" },
  "digital-services": { changefreq: "weekly", priority: "0.8" },
  // NOTE: "services" is deliberately ABSENT — /services belongs to
  // sitemap-services.xml (serviceUrls() below). Emitting it here too made the
  // URL appear in TWO sitemaps, which the live SEO audit correctly reports as
  // a duplicate-sitemap entry.
  "social-media": { changefreq: "weekly", priority: "0.7" },
  "web-hosting": { changefreq: "weekly", priority: "0.7" },
  "digital-marketing": { changefreq: "weekly", priority: "0.7" },
  "web3": { changefreq: "weekly", priority: "0.7" },
};

/** Does any ACTIVE product match a registry category? (same logic as /api/categories) */
function productMatches(p: any, c: any): boolean {
  const cat = String(p.category || "").toLowerCase().trim();
  if (Array.isArray(c.productCategories) && c.productCategories.map((x: string) => x.toLowerCase()).includes(cat)) return true;
  if (!c.tagRegex) return false;
  try {
    const re = new RegExp(String(c.tagRegex).slice(0, 200), "i");
    const hay = `${p.name || ""} ${(Array.isArray(p.tags) ? p.tags : []).join(" ")} ${p.category || ""}`;
    return re.test(hay);
  } catch {
    return false;
  }
}

// ---- Business Solutions service URLs --------------------------------------
// Static hub/request/portfolio + every PUBLISHED service detail page (dynamic,
// read from the `services` collection — MongoDB is the source of truth).
async function serviceUrls(db: any): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [
    { loc: `${SITE}/services`, changefreq: "weekly", priority: "0.9" },
    { loc: `${SITE}/services/request`, changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE}/services/portfolio`, changefreq: "monthly", priority: "0.7" },
  ];
  try {
    const docs = await db
      .collection("services")
      .find({ published: { $ne: false } }, { projection: { slug: 1, updatedAt: 1 } })
      .sort({ displayOrder: 1 })
      .limit(100)
      .toArray();
    for (const d of docs) {
      urls.push({ loc: `${SITE}/services/${d.slug}`, changefreq: "monthly", priority: "0.8" });
    }
  } catch {
    /* DB unavailable — static service URLs still ship */
  }
  return urls;
}

export async function buildPagesSitemap(): Promise<string> {
  return renderUrlSet(STATIC_PAGES);
}

export async function buildServicesSitemap(db: any): Promise<string> {
  return renderUrlSet(await serviceUrls(db));
}

export async function buildCategoriesSitemap(db: any): Promise<{ xml: string; count: number }> {
  let registry: any[] = [];
  try {
    registry = await db.collection("categories").find({ enabled: { $ne: false } }).sort({ order: 1 }).toArray();
  } catch {
    registry = [];
  }

  // Live product scan (catalog is small) — same approach as /api/categories
  const products = await db.collection("products").find({ active: { $ne: false } }).project({ name: 1, category: 1, tags: 1 }).toArray();

  const urls: SitemapUrl[] = [];
  const seen = new Set<string>();
  for (const c of registry) {
    const count = products.filter((p: any) => productMatches(p, c)).length;
    if (count === 0) continue; // never index empty categories
    // Canonical slug + curated sub-routes + registry aliases that correspond
    // to real SPA landing pages with their own SEO preset (e.g. /subscriptions).
    // Redirect-only aliases (e.g. /giftcards) are absent from CATEGORY_ROUTE_META
    // and therefore never enter the sitemap.
    const candidates = [
      c.slug,
      ...(c.subRoutes || []).map((s: any) => s.slug),
      ...(Array.isArray(c.aliases) ? c.aliases : []),
    ].filter(Boolean);
    for (const slug of candidates) {
      if (seen.has(slug)) continue;
      const meta = CATEGORY_ROUTE_META[slug];
      if (!meta) continue; // alias with no real SPA route — skip
      seen.add(slug);
      urls.push({ loc: `${SITE}/${slug}`, changefreq: meta.changefreq, priority: meta.priority });
    }
  }
  return { xml: renderUrlSet(urls), count: urls.length };
}

export async function buildProductsSitemap(db: any): Promise<{ xml: string; count: number; lastmod: Date | null }> {
  // Only ACTIVE (published) products with a usable slug. Consolidated variant
  // children (hidden from the storefront) are excluded — their canonical lives
  // on the parent product page. Admin-noindexed products (seo.index === false)
  // are excluded too — a page Google must not index never belongs in the map.
  const docs = await db
    .collection("products")
    .find({ active: { $ne: false }, consolidatedParentId: { $exists: false } })
    .project({ slug: 1, name: 1, title: 1, sku: 1, updatedAt: 1, createdAt: 1, seo: 1 })
    .toArray();

  const urls: SitemapUrl[] = [];
  const seen = new Set<string>();
  let lastmod: Date | null = null;
  for (const d of docs) {
    if (d.seo?.index === false) continue; // admin noindex — excluded from sitemap
    const name = d.name || d.title;
    if (!name) continue;
    // Canonical slug — derived EXACTLY like the storefront's ensureProductSlug()
    // (src/lib/slug.ts): the stored slug if usable, otherwise the slugified
    // name/title/sku fallback. The sitemap URL must be byte-identical to the
    // URL the live product page uses and declares in its <link rel="canonical">.
    const slug = String(d.slug || "").trim() ? slugifySafe(String(d.slug)) : slugifySafe(String(d.sku || name));
    if (!slug) continue;
    // Canonical URL — the live product-detail route is /product/:slug. The SPA
    // router, the product card links, the page's canonical tag (applyRouteSeo →
    // slugPath = /product/:slug) and the Google Merchant feed (pbFeed=google)
    // all agree on this pattern. Category-prefixed product URLs such as
    // /streaming/:slug or /gift-cards/:slug are NOT canonical — the product
    // page always canonicalizes to /product/:slug — so they must never be
    // constructed here. Google Search Console receives only canonical URLs.
    const loc = `${SITE}/product/${slug}`;
    // Admin-set canonical override: the page emits seo.canonicalUrl verbatim
    // when it is an https:// URL (upsertCanonical). If that override points
    // anywhere other than this product's own /product/:slug URL, the page
    // declares a different canonical — including this loc would publish a
    // canonical mismatch into GSC, so the product is excluded instead.
    const override = d.seo && typeof d.seo.canonicalUrl === "string" ? d.seo.canonicalUrl.trim() : "";
    if (/^https:\/\//.test(override) && override !== loc) continue;
    if (seen.has(loc)) continue; // never emit duplicate canonical URLs
    seen.add(loc);
    const lm = toDate(d.updatedAt) || toDate(d.createdAt);
    if (lm && (!lastmod || lm > lastmod)) lastmod = lm;
    urls.push({ loc, lastmod: lm, changefreq: "weekly", priority: "0.8" });
  }
  return { xml: renderUrlSet(urls), count: urls.length, lastmod };
}

export async function buildSitemapIndex(db: any): Promise<string> {
  let lastmod: Date | null = null;
  try {
    const row = await db
      .collection("products")
      .find({ active: { $ne: false } })
      .sort({ updatedAt: -1 })
      .limit(1)
      .project({ updatedAt: 1 })
      .toArray();
    lastmod = toDate(row[0]?.updatedAt);
  } catch {
    /* index without lastmod is still valid */
  }
  return renderSitemapIndex([
    { loc: `${SITE}/sitemap-pages.xml`, lastmod },
    { loc: `${SITE}/sitemap-categories.xml`, lastmod },
    { loc: `${SITE}/sitemap-products.xml`, lastmod },
    { loc: `${SITE}/sitemap-services.xml`, lastmod },
  ]);
}

function slugifySafe(text: string): string {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w-]+/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/** Aggregated sitemap stats for the admin SEO dashboard. */
export async function sitemapStats(db: any): Promise<{
  pages: number
  categories: number
  products: number
  lastProductUpdate: string | null
}> {
  let categories = 0;
  try {
    categories = (await buildCategoriesSitemap(db)).count;
  } catch {
    categories = 0;
  }
  let products = 0;
  let lastProductUpdate: Date | null = null;
  try {
    const p = await buildProductsSitemap(db);
    products = p.count;
    lastProductUpdate = p.lastmod;
  } catch {
    /* db unavailable — zero counts */
  }
  return {
    pages: STATIC_PAGES.length,
    categories,
    products,
    lastProductUpdate: lastProductUpdate ? lastProductUpdate.toISOString() : null,
  };
}

/** Sitemap request entry — returns true when the request was handled. */
export async function handleSitemapRequest(res: any, map: string, db: any): Promise<boolean> {
  let xml: string;
  try {
    if (map === "sitemap.xml") xml = await buildSitemapIndex(db);
    else if (map === "sitemap-products.xml") xml = (await buildProductsSitemap(db)).xml;
    else if (map === "sitemap-categories.xml") xml = (await buildCategoriesSitemap(db)).xml;
    else if (map === "sitemap-pages.xml") xml = await buildPagesSitemap();
    else if (map === "sitemap-services.xml") xml = await buildServicesSitemap(db);
    else return false;
  } catch (err: any) {
    console.error("sitemap generation error:", err?.message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Sitemap generation failed");
    return true;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // NEVER edge-cache sitemaps: "public, max-age" lets Vercel's CDN serve a
  // stale copy that hides newly published/edited products for up to an hour
  // (same failure mode the merchant feed had). Spec: sitemap must reflect
  // product create/update/delete/status changes immediately. Build is a cheap
  // projected query on a small catalog — always live instead.
  res.setHeader("Cache-Control", "no-store");
  res.end(xml);
  return true;
}
