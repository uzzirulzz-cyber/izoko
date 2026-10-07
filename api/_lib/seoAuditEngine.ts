// seoAuditEngine.ts — orchestrates the LIVE SEO audit against playbeat.digital.
//
// Chunked execution model (Vercel serverless-safe):
//   startAudit()      → discovers URLs (sitemaps + MongoDB + robots), creates the
//                       seoAuditRuns document, returns batches for the caller.
//   crawlBatch()      → crawls the next N uncrawled URLs (real HTTP fetches),
//                       stores per-page results, updates progress.
//   finalizeAudit()   → duplicate detection, sitemap validation, findings
//                       (severity grouped), SEO Health Score, history snapshot.
//   recheckFailed()   → re-crawls only URLs that failed in a previous run.
//
// Honesty rules: every number is measured. When a source cannot be reached the
// result carries { unavailable: true, reason } — never a fabricated value.

import { getDb } from "./mongo.js";
import {
  SEO_SITE,
  loadRobots,
  isAllowedByRobots,
  resolveUrlChain,
  parseSitemapXml,
  parseHtmlSeo,
  normalizeMetaKey,
  jaccardSimilarity,
  type RobotsRules,
  type ParsedHtml,
} from "./seoCrawler.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AuditUrlEntry {
  url: string;
  type: "homepage" | "page" | "product" | "category" | "service" | "other";
  source: string[];
  refId?: string; // mongo _id when the URL comes from a DB record
  crawled?: boolean;
  soft404?: boolean;
}

export interface PageResult {
  url: string;
  type: string;
  httpStatus: number;
  finalUrl: string;
  redirectChain: Array<{ url: string; status: number; location?: string }>;
  redirectLoop: boolean;
  ttfbMs: number | null;
  htmlBytes: number;
  error?: string;
  indexable: boolean;
  indexReason: string;
  robotsAllowed: boolean;
  metaRobots: string;
  xRobotsTag: string;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  canonical: string | null;
  canonicalSelf: boolean | null;
  h1: string[];
  h1Count: number;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterImage: string;
  jsonLd: Array<{ valid: boolean; types: string[]; error?: string }>;
  imagesTotal: number;
  imagesMissingAlt: number;
  imagesEmptyAlt: number;
  anchorsTotal: number;
  anchorsInternal: number;
  anchorsExternal: number;
  spaShell: boolean;
  soft404Suspected: boolean;
  sitemapIncluded: boolean;
  score: number;
  scoreNotes: Array<{ label: string; points: number; max: number; note?: string }>;
  issues: Array<{ severity: "critical" | "high" | "medium" | "low" | "info"; code: string; message: string }>;
}

const DEFAULT_BATCH = 10;
const CONCURRENCY = 6;
const FETCH_TIMEOUT = 9000;

// ---------------------------------------------------------------------------
// URL discovery — every source is live
// ---------------------------------------------------------------------------
export async function discoverUrls(db: any, robots: RobotsRules): Promise<{
  entries: AuditUrlEntry[];
  sitemaps: Record<string, { ok: boolean; status: number; kind: string; count: number; error?: string }>;
  sitemapUrls: string[];
  duplicateSitemapUrls: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const sitemapUrls: string[] = [];
  const duplicateSitemapUrls: string[] = [];
  const sitemaps: Record<string, any> = {};

  const childMaps = ["sitemap-pages.xml", "sitemap-categories.xml", "sitemap-products.xml", "sitemap-services.xml"];
  const indexRes = await resolveUrlChain(`${SEO_SITE}/sitemap.xml`, 8000);
  const indexOk = indexRes.res?.status === 200;
  if (!indexOk) errors.push(`sitemap.xml HTTP ${indexRes.res?.status || indexRes.error}`);

  for (const map of childMaps) {
    const res = await resolveUrlChain(`${SEO_SITE}/${map}`, 8000);
    const status = res.res?.status || 0;
    if (status !== 200) {
      sitemaps[map] = { ok: false, status, kind: "unreachable", count: 0, error: res.error };
      errors.push(`${map} HTTP ${status || res.error}`);
      continue;
    }
    const parsed = parseSitemapXml(await res.res!.text());
    sitemaps[map] = { ok: parsed.kind === "urlset", status, kind: parsed.kind, count: parsed.entries.length };
    if (parsed.kind !== "urlset") errors.push(`${map} is not a urlset (${parsed.kind})`);
    for (const e of parsed.entries) sitemapUrls.push(e.loc);
    duplicateSitemapUrls.push(...parsed.duplicateLocs);
  }
  duplicateSitemapUrls.push(...(await dedupeScan(sitemapUrls)));

  const byUrl = new Map<string, AuditUrlEntry>();
  const add = (url: string, type: AuditUrlEntry["type"], source: string, refId?: string) => {
    const clean = url.replace(/\/$/, "") || `${SEO_SITE}/`;
    if (!byUrl.has(clean)) byUrl.set(clean, { url: clean, type, source: [], refId });
    const entry = byUrl.get(clean)!;
    if (!entry.source.includes(source)) entry.source.push(source);
    if (refId && !entry.refId) entry.refId = refId;
  };

  // sitemap URLs (source of truth for "SITEMAP URLs")
  for (const u of new Set(sitemapUrls)) {
    if (!u.startsWith(SEO_SITE)) continue;
    const path = u.slice(SEO_SITE.length);
    const type: AuditUrlEntry["type"] = path.startsWith("/product/")
      ? "product"
      : path.startsWith("/services/")
        ? "service"
        : path === "/" || path === ""
          ? "homepage"
          : path.split("/").filter(Boolean).length <= 1
            ? "category"
            : "page";
    add(u, type, "sitemap");
  }

  // MongoDB published products
  try {
    const docs = await db
      .collection("products")
      .find({ active: { $ne: false }, consolidatedParentId: { $exists: false } })
      .project({ slug: 1, updatedAt: 1 })
      .toArray();
    for (const d of docs) {
      if (!d.slug) continue;
      add(`${SEO_SITE}/product/${d.slug}`, "product", "mongodb", String(d._id));
    }
  } catch (e: any) {
    errors.push(`mongodb products: ${e.message}`);
  }

  // MongoDB published services
  try {
    const docs = await db
      .collection("services")
      .find({ published: { $ne: false } })
      .project({ slug: 1 })
      .limit(100)
      .toArray();
    for (const d of docs) add(`${SEO_SITE}/services/${d.slug}`, "service", "mongodb");
  } catch {
    /* services collection optional */
  }

  // static storefront pages (router inventory — same list sitemap-pages uses)
  const staticPaths = [
    "/", "/download", "/compare", "/about", "/contact", "/warranty",
    "/privacy", "/terms", "/refund-policy", "/shipping-policy",
    "/streaming", "/subscriptions", "/gift-cards", "/gaming", "/software",
    "/smart-projectors", "/smart-4k-projectors", "/ai-subscriptions",
    "/steam-game-keys", "/windows-office", "/creative-software", "/services",
    "/services/request", "/services/portfolio",
  ];
  for (const p of staticPaths) add(`${SEO_SITE}${p === "/" ? "/" : p}`, p === "/" ? "homepage" : p.startsWith("/services") ? "service" : p.split("/").filter(Boolean).length <= 1 ? "category" : "page", "static");

  // internal navigation links from the raw HTML of key pages (real anchors)
  try {
    const home = await resolveUrlChain(`${SEO_SITE}/`, 8000);
    if (home.res?.status === 200) {
      const html = await home.res.text();
      const parsed = parseHtmlSeo(html);
      for (const a of parsed.anchors) {
        let abs: string | null = null;
        if (a.href.startsWith("/")) abs = `${SEO_SITE}${a.href}`;
        else if (a.href.startsWith(SEO_SITE)) abs = a.href;
        if (!abs) continue;
        const path = abs.slice(SEO_SITE.length);
        if (/^\/(admin|account|checkout|order|invoice|login|signup|api|webhooks|download)/.test(path)) continue;
        add(abs.split("?")[0], "page", "nav");
      }
    }
  } catch {
    /* nav discovery best-effort */
  }

  const entries = [...byUrl.values()];
  return { entries, sitemaps, sitemapUrls: [...new Set(sitemapUrls)], duplicateSitemapUrls, errors };
}

async function dedupeScan(urls: string[]): Promise<string[]> {
  const seen = new Map<string, number>();
  for (const u of urls) seen.set(u, (seen.get(u) || 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([u]) => u);
}

// ---------------------------------------------------------------------------
// Page crawling + classification + scoring
// ---------------------------------------------------------------------------
async function crawlOne(entry: AuditUrlEntry, robots: RobotsRules, publishedProductSlugs: Set<string>): Promise<PageResult> {
  const chain = await resolveUrlChain(entry.url, FETCH_TIMEOUT);
  const status = chain.res?.status || 0;
  const xRobotsTag = (chain.res?.headers.get("x-robots-tag") || "").toLowerCase();
  const contentType = chain.res?.headers.get("content-type") || "";
  const html = status === 200 && /text\/html/i.test(contentType) ? await chain.res!.text() : "";
  const parsed: ParsedHtml = html ? parseHtmlSeo(html) : ({} as ParsedHtml);

  const finalUrl = chain.hops.length ? chain.hops[chain.hops.length - 1].url : entry.url;
  const robotsAllowed = isAllowedByRobots(robots, entry.url, "Googlebot");
  const noindex = /noindex/i.test(parsed.metaRobots || "") || /noindex/i.test(xRobotsTag);
  const canonicalSelf = parsed.canonical ? parsed.canonical.replace(/\/$/, "") === entry.url.replace(/\/$/, "") : null;

  const isProduct = entry.type === "product";
  const slugKnown = isProduct ? publishedProductSlugs.has(entry.url.slice(`${SEO_SITE}/product/`.length).replace(/\/$/, "")) : true;
  // SPA soft-404: the edge serves index.html (HTTP 200) for ANY /product/* path;
  // when the record behind the slug does not exist the user sees the
  // storefront's "product not found" state. Measured against MongoDB truth.
  const soft404 = isProduct && status === 200 && (!slugKnown || parsed.notFoundMarkers.length > 0);

  const issues: PageResult["issues"] = [];
  let indexable = true;
  let indexReason = "200 OK";

  if (status === 0) {
    indexable = false;
    indexReason = `unreachable (${chain.error || "network error"})`;
  } else if (status === 404 || status === 410) {
    indexable = false;
    indexReason = `${status} Not Found`;
    issues.push({ severity: "critical", code: "http-404", message: `URL returns HTTP ${status}` });
  } else if (status >= 500) {
    indexable = false;
    indexReason = `server error ${status}`;
    issues.push({ severity: "critical", code: "http-5xx", message: `URL returns HTTP ${status}` });
  } else if (status >= 300) {
    indexable = false;
    indexReason = `redirect ${status}`;
    issues.push({ severity: "medium", code: "redirect", message: `URL is a ${status} redirect to ${finalUrl}` });
  } else if (!robotsAllowed) {
    indexable = false;
    indexReason = "robots.txt blocked";
  } else if (noindex) {
    indexable = false;
    indexReason = "noindex directive";
  } else if (canonicalSelf === false) {
    indexable = false;
    indexReason = "canonical points elsewhere";
    issues.push({ severity: "critical", code: "canonical-external", message: `Canonical points to ${parsed.canonical} — page tells Google it is a duplicate of another URL` });
  } else if (soft404) {
    indexable = false;
    indexReason = "soft 404 (shell served, record missing)";
    issues.push({ severity: "high", code: "soft-404", message: "HTTP 200 but the underlying product record does not exist — soft 404" });
  } else if (!parsed.canonical) {
    indexReason = "200 OK (canonical missing)";
    issues.push({ severity: "medium", code: "canonical-missing", message: "No canonical link tag in raw HTML" });
  }

  // metadata quality issues (raw-HTML layer — what crawlers first see)
  const titleLength = (parsed.title || "").length;
  const descLength = (parsed.metaDescription || "").length;
  if (status === 200) {
    if (!parsed.title) issues.push({ severity: "high", code: "title-missing", message: "Missing <title> in served HTML" });
    else if (titleLength > 60) issues.push({ severity: "low", code: "title-long", message: `Title is ${titleLength} chars (recommended ≤ 60)` });
    else if (titleLength < 15) issues.push({ severity: "medium", code: "title-short", message: `Title is only ${titleLength} chars` });
    if (!parsed.metaDescription) issues.push({ severity: "medium", code: "description-missing", message: "Missing meta description in served HTML" });
    else if (descLength > 160) issues.push({ severity: "low", code: "description-long", message: `Meta description is ${descLength} chars (recommended ≤ 160)` });
    else if (descLength < 50) issues.push({ severity: "low", code: "description-short", message: `Meta description is only ${descLength} chars` });
    if ((parsed.h1?.length || 0) === 0) issues.push({ severity: "medium", code: "h1-missing", message: "No H1 heading in served HTML" });
    else if (parsed.h1.length > 1) issues.push({ severity: "medium", code: "h1-multiple", message: `${parsed.h1.length} H1 tags` });
    if (!parsed.ogImage) issues.push({ severity: "low", code: "og-image-missing", message: "No og:image" });
    if (parsed.jsonLdBlocks && parsed.jsonLdBlocks.length === 0) issues.push({ severity: "low", code: "schema-missing", message: "No JSON-LD structured data" });
    if (chain.loop) issues.push({ severity: "high", code: "redirect-loop", message: "Redirect loop detected" });
  }

  const imagesMissingAlt = (parsed.images || []).filter((i) => i.alt === null).length;
  const imagesEmptyAlt = (parsed.images || []).filter((i) => i.alt === "").length;

  const anchorsInternal = (parsed.anchors || []).filter((a) => a.href.startsWith("/") || a.href.includes("playbeat.digital")).length;
  const anchorsExternal = (parsed.anchors || []).length - anchorsInternal;

  // per-page score (deterministic, from measured fields)
  const notes: PageResult["scoreNotes"] = [];
  const addNote = (label: string, points: number, max: number, note?: string) => notes.push({ label, points: Math.round(points * 10) / 10, max, note });
  addNote("Title", !parsed.title ? 0 : titleLength >= 15 && titleLength <= 60 ? 20 : 10, 20, parsed.title ? `${titleLength} chars` : "missing");
  addNote("Meta description", !parsed.metaDescription ? 0 : descLength >= 50 && descLength <= 160 ? 15 : 7, 15, parsed.metaDescription ? `${descLength} chars` : "missing");
  addNote("Canonical", canonicalSelf === true ? 10 : parsed.canonical ? 0 : 4, 10, parsed.canonical ? (canonicalSelf ? "self-referencing" : "points elsewhere") : "missing");
  addNote("H1", (parsed.h1?.length || 0) === 1 ? 10 : (parsed.h1?.length || 0) === 0 ? 0 : 5, 10, `${parsed.h1?.length || 0} H1`);
  addNote("Headings", (parsed.h2Count || 0) > 0 ? 5 : (parsed.h3Count || 0) > 0 ? 3 : 0, 5, `h2=${parsed.h2Count || 0} h3=${parsed.h3Count || 0}`);
  const wc = parsed.wordCount || 0;
  addNote("Content", wc >= 300 ? 15 : wc >= 100 ? 10 : wc > 0 ? 5 : 0, 15, `${wc} words`);
  const ldValid = (parsed.jsonLdBlocks || []).filter((b) => b.valid).length;
  addNote("Structured data", ldValid > 0 ? 10 : (parsed.jsonLdBlocks || []).some((b) => !b.valid) ? 3 : 5, 10, `${ldValid} valid block(s)`);
  const imgs = parsed.images?.length || 0;
  addNote("Image ALT", imgs === 0 ? 5 : imagesMissingAlt === 0 ? 10 : Math.max(0, 10 - Math.round((imagesMissingAlt / imgs) * 10)), 10, imgs ? `${imagesMissingAlt}/${imgs} missing alt` : "no images in HTML");
  addNote("Indexability", indexable ? 10 : 0, 10, indexReason);
  addNote("HTTP health", status === 200 && !chain.loop ? 5 : status === 0 ? 0 : 2, 5, `status ${status}`);
  const score = Math.min(100, Math.round(notes.reduce((s, n) => s + n.points, 0)));

  return {
    url: entry.url,
    type: entry.type,
    httpStatus: status,
    finalUrl,
    redirectChain: chain.hops,
    redirectLoop: Boolean(chain.loop),
    ttfbMs: status === 0 ? null : chain.ttfbMs,
    htmlBytes: parsed.htmlBytes || 0,
    error: chain.error,
    indexable,
    indexReason,
    robotsAllowed,
    metaRobots: parsed.metaRobots || "",
    xRobotsTag,
    title: parsed.title || "",
    titleLength,
    metaDescription: parsed.metaDescription || "",
    metaDescriptionLength: descLength,
    canonical: parsed.canonical,
    canonicalSelf,
    h1: parsed.h1 || [],
    h1Count: parsed.h1?.length || 0,
    h2Count: parsed.h2Count || 0,
    h3Count: parsed.h3Count || 0,
    wordCount: wc,
    ogTitle: parsed.ogTitle || "",
    ogDescription: parsed.ogDescription || "",
    ogImage: parsed.ogImage || "",
    twitterCard: parsed.twitterCard || "",
    twitterTitle: parsed.twitterTitle || "",
    twitterImage: parsed.twitterImage || "",
    jsonLd: parsed.jsonLdBlocks || [],
    imagesTotal: imgs,
    imagesMissingAlt,
    imagesEmptyAlt,
    anchorsTotal: parsed.anchors?.length || 0,
    anchorsInternal,
    anchorsExternal,
    spaShell: status === 200 && wc === 0 && (parsed.anchors?.length || 0) === 0 && parsed.htmlBytes > 0,
    soft404Suspected: soft404,
    sitemapIncluded: entry.source.includes("sitemap"),
    score,
    scoreNotes: notes,
    issues,
  };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------
function collections(db: any) {
  return {
    runs: db.collection("seoAuditRuns"),
    findings: db.collection("seoAuditFindings"),
    perf: db.collection("seoPerformanceHistory"),
  };
}

export async function startAudit(
  db: any,
  opts: { mode?: "full" | "recheck"; trigger?: string; urlFilter?: string[] } = {}
): Promise<{ runId: string; totalUrls: number; batchSize: number; discovered: any }> {
  const { runs } = collections(db);
  const robots = await loadRobots();
  const publishedProductSlugs = new Set<string>();
  try {
    const docs = await db
      .collection("products")
      .find({ active: { $ne: false } })
      .project({ slug: 1 })
      .toArray();
    for (const d of docs) if (d.slug) publishedProductSlugs.add(String(d.slug));
  } catch {
    /* empty set → product pages cannot be soft-404 verified */
  }

  const discovery = await discoverUrls(db, robots);
  let entries = discovery.entries;
  if (opts.urlFilter?.length) {
    const wanted = new Set(opts.urlFilter.map((u) => u.replace(/\/$/, "")));
    entries = entries.filter((e) => wanted.has(e.url.replace(/\/$/, "")));
  }

  const now = new Date();
  const doc = {
    trigger: opts.trigger || "manual",
    mode: opts.mode || "full",
    status: "running",
    startedAt: now,
    completedAt: null,
    durationMs: null,
    discovered: {
      sources: {
        sitemap: discovery.sitemapUrls.length,
        mongodb: entries.filter((e) => e.source.includes("mongodb")).length,
        static: entries.filter((e) => e.source.includes("static")).length,
        nav: entries.filter((e) => e.source.includes("nav")).length,
      },
      sitemaps: discovery.sitemaps,
      discoveryErrors: discovery.errors,
      duplicateSitemapUrls: discovery.duplicateSitemapUrls,
      total: entries.length,
    },
    totalUrls: entries.length,
    crawledUrls: 0,
    failedUrls: 0,
    progress: { phase: opts.mode === "recheck" ? "recrawling failed URLs" : "crawling", crawled: 0, total: entries.length },
    batchSize: DEFAULT_BATCH,
    urls: entries.map((e) => ({ url: e.url, type: e.type, source: e.source, crawled: false })),
    pages: [],
    robots: { ok: robots.ok, status: robots.status, sitemapsDeclared: robots.sitemaps, groups: robots.groups.length },
    summary: null,
    score: null,
    duplicates: null,
    sitemapValidation: null,
    error: null,
  };
  const ins = await runs.insertOne(doc as any);
  return { runId: ins.insertedId.toString(), totalUrls: entries.length, batchSize: DEFAULT_BATCH, discovered: doc.discovered };
}

export async function crawlBatch(db: any, runId: string, batchSize = DEFAULT_BATCH): Promise<{
  done: boolean;
  crawled: number;
  total: number;
  newlyCrawled: number;
  failed: number;
}> {
  const { runs } = collections(db);
  const { ObjectId } = await import("mongodb");
  const run = await runs.findOne({ _id: new ObjectId(runId) });
  if (!run) throw new Error("audit run not found");
  if (run.status !== "running") return { done: true, crawled: run.crawledUrls, total: run.totalUrls, newlyCrawled: 0, failed: run.failedUrls };

  const publishedProductSlugs = new Set<string>();
  const robots = await loadRobots();
  const docs = await db.collection("products").find({ active: { $ne: false } }).project({ slug: 1 }).toArray();
  for (const d of docs) if (d.slug) publishedProductSlugs.add(String(d.slug));

  const pending = run.urls.filter((u: any) => !u.crawled).slice(0, Math.max(1, Math.min(batchSize, 20)));
  const entryByKey = new Map<string, AuditUrlEntry>();
  for (const u of run.urls) entryByKey.set(u.url, { url: u.url, type: u.type, source: u.source });

  const results = await mapLimit(pending, CONCURRENCY, async (u: any) => {
    const entry = entryByKey.get(u.url)!;
    return crawlOne(entry, robots, publishedProductSlugs);
  });

  const failed = results.filter((r) => r.httpStatus === 0 || r.httpStatus >= 400 || r.soft404Suspected).length;
  await runs.updateOne(
    { _id: new ObjectId(runId) },
    {
      $push: { pages: { $each: results } } as any,
      $set: {
        "urls.$[elem].crawled": true,
      } as any,
    },
    { arrayFilters: [{ "elem.url": { $in: pending.map((u: any) => u.url) } }] }
  );
  const crawledNow = run.crawledUrls + results.length;
  await runs.updateOne(
    { _id: new ObjectId(runId) },
    { $set: { crawledUrls: crawledNow, failedUrls: (run.failedUrls || 0) + failed, "progress.crawled": crawledNow } }
  );

  const done = crawledNow >= run.totalUrls;
  return { done, crawled: crawledNow, total: run.totalUrls, newlyCrawled: results.length, failed };
}

// ---------------------------------------------------------------------------
// Duplicate detection (live crawl layer + MongoDB metadata layer)
// ---------------------------------------------------------------------------
function buildDuplicateGroups(values: Array<{ url: string; value: string; label: string }>) {
  const map = new Map<string, typeof values>();
  for (const v of values) {
    if (!v.value) continue;
    const key = normalizeMetaKey(v.value);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return [...map.entries()]
    .filter(([, g]) => g.length > 1)
    .map(([key, group]) => ({
      value: group[0].value,
      normalizedKey: key.slice(0, 300),
      kind: group[0].label,
      count: group.length,
      urls: group.map((g) => ({ url: g.url, label: g.label })),
    }));
}

function buildNearDuplicateGroups(values: Array<{ url: string; value: string }>, threshold = 0.8) {
  const out: Array<{ urls: Array<{ url: string; value: string }>; similarity: number }> = [];
  const items = values.filter((v) => v.value && v.value.length > 40);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sim = jaccardSimilarity(items[i].value, items[j].value);
      if (sim >= threshold) out.push({ urls: [items[i], items[j]], similarity: Math.round(sim * 100) / 100 });
      if (out.length >= 100) return out;
    }
  }
  return out;
}

async function detectDuplicates(db: any, pages: PageResult[]) {
  // live HTML layer
  const liveTitles = buildDuplicateGroups(pages.filter((p) => p.httpStatus === 200).map((p) => ({ url: p.url, value: p.title, label: "served <title>" })));
  const liveDescriptions = buildDuplicateGroups(pages.filter((p) => p.httpStatus === 200).map((p) => ({ url: p.url, value: p.metaDescription, label: "served meta description" })));
  const liveCanonicals = buildDuplicateGroups(pages.filter((p) => p.canonical).map((p) => ({ url: p.url, value: p.canonical!, label: "served canonical" })));
  const nearDupDescriptions = buildNearDuplicateGroups(
    pages
      .filter((p) => p.httpStatus === 200 && p.metaDescription)
      .map((p) => ({ url: p.url, value: p.metaDescription }))
  );

  // MongoDB metadata layer (configured SEO fields)
  const products = await db
    .collection("products")
    .find({ active: { $ne: false } })
    .project({ name: 1, title: 1, slug: 1, sku: 1, seo: 1, shortDescription: 1, description: 1 })
    .toArray();
  const strip = (s: string) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const dbTitleGroups = buildDuplicateGroups(
    products.map((d: any) => ({
      url: `${SEO_SITE}/product/${d.slug || ""}`,
      value: String(d.seo?.title || d.name || d.title || "").trim(),
      label: `${d.name || d.sku || d._id} — seo.title`,
    }))
  );
  const dbDescGroups = buildDuplicateGroups(
    products.map((d: any) => ({
      url: `${SEO_SITE}/product/${d.slug || ""}`,
      value: String(d.seo?.description || strip(d.shortDescription) || strip(d.description)).trim().slice(0, 400),
      label: `${d.name || d.sku || d._id} — meta description`,
    }))
  );

  return {
    live: { titles: liveTitles, descriptions: liveDescriptions, canonicals: liveCanonicals, nearDuplicateDescriptions: nearDupDescriptions },
    database: { productTitles: dbTitleGroups, productDescriptions: dbDescGroups },
  };
}

// ---------------------------------------------------------------------------
// Sitemap validation vs MongoDB + crawl truth
// ---------------------------------------------------------------------------
async function validateSitemaps(db: any, pages: PageResult[], sitemapMeta: Record<string, any>, sitemapUrls: string[], duplicateSitemapUrls: string[]) {
  const pageByUrl = new Map(pages.map((p) => [p.url.replace(/\/$/, ""), p]));
  const publishedSlugs = new Set<string>();
  const noindexSlugs = new Set<string>();
  const docs = await db
    .collection("products")
    .find({ active: { $ne: false } })
    .project({ slug: 1, seo: 1, consolidatedParentId: 1 })
    .toArray();
  for (const d of docs) {
    if (!d.slug || d.consolidatedParentId) continue;
    if (d.seo?.index === false) noindexSlugs.add(String(d.slug));
    else publishedSlugs.add(String(d.slug));
  }

  const inSitemap = new Set(sitemapUrls.map((u) => u.replace(/\/$/, "")));
  const missingFromSitemap: string[] = [];
  for (const slug of publishedSlugs) {
    const url = `${SEO_SITE}/product/${slug}`;
    if (!inSitemap.has(url)) missingFromSitemap.push(url);
  }
  const deletedFromDb: string[] = [];
  const sitemap404: string[] = [];
  const redirected: string[] = [];
  const noindexInSitemap: string[] = [];
  const canonicalMismatch: Array<{ url: string; canonical: string }> = [];
  for (const u of inSitemap) {
    const p = pageByUrl.get(u);
    if (!p) continue; // not crawled in this run (filtered mode)
    if (p.httpStatus === 404 || p.httpStatus === 410) sitemap404.push(u);
    else if (p.httpStatus === 0) sitemap404.push(u);
    else if (p.httpStatus >= 300 && p.httpStatus < 400) redirected.push(u);
    else if (/noindex/i.test(p.metaRobots || "") || /noindex/i.test(p.xRobotsTag || "")) noindexInSitemap.push(u);
    const slug = u.startsWith(`${SEO_SITE}/product/`) ? u.slice(`${SEO_SITE}/product/`.length) : null;
    if (slug && p.canonical && p.canonical.replace(/\/$/, "") !== u) canonicalMismatch.push({ url: u, canonical: p.canonical });
    if (slug && !publishedSlugs.has(slug) && !noindexSlugs.has(slug)) deletedFromDb.push(u);
  }
  return {
    sitemaps: sitemapMeta,
    robotsDeclaration: null,
    counts: { sitemapUrls: sitemapUrls.length },
    missingFromSitemap,
    deletedFromDb,
    http404: sitemap404,
    redirected,
    noindex: noindexInSitemap,
    canonicalMismatch,
    duplicates: duplicateSitemapUrls,
  };
}

// ---------------------------------------------------------------------------
// Findings (severity-grouped, persisted with stable keys)
// ---------------------------------------------------------------------------
type Finding = {
  key: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  detail: string;
  urls: string[];
  data?: any;
};

async function buildFindings(db: any, run: any): Promise<Finding[]> {
  const pages: PageResult[] = run.pages || [];
  const f: Finding[] = [];
  const push = (x: Finding) => f.push(x);

  const notIndexable = pages.filter((p) => !p.indexable);
  const hard404 = pages.filter((p) => p.httpStatus === 404 || p.httpStatus === 410);
  const serverErr = pages.filter((p) => p.httpStatus >= 500);
  const unreachable = pages.filter((p) => p.httpStatus === 0);
  const soft404s = pages.filter((p) => p.soft404Suspected);
  const redirected = pages.filter((p) => p.httpStatus >= 300 && p.httpStatus < 400);
  const canonicalElsewhere = pages.filter((p) => p.canonicalSelf === false);
  const robotsBlocked = pages.filter((p) => !p.robotsAllowed);
  const noindexed = pages.filter((p) => /noindex/i.test(p.metaRobots || "") || /noindex/i.test(p.xRobotsTag || ""));
  const missingTitle = pages.filter((p) => p.httpStatus === 200 && !p.title);
  const missingDesc = pages.filter((p) => p.httpStatus === 200 && !p.metaDescription);
  const missingCanonical = pages.filter((p) => p.httpStatus === 200 && !p.canonical);
  const missingH1 = pages.filter((p) => p.httpStatus === 200 && p.h1Count === 0);
  const zeroContent = pages.filter((p) => p.httpStatus === 200 && p.wordCount === 0);
  const imagesMissingAlt = pages.reduce((s, p) => s + p.imagesMissingAlt, 0);
  const schemaInvalid = pages.filter((p) => (p.jsonLd || []).some((b) => !b.valid));
  const loops = pages.filter((p) => p.redirectLoop);

  if (canonicalElsewhere.length)
    push({
      key: "canonical-elsewhere",
      severity: "critical",
      category: "Canonical",
      title: `${canonicalElsewhere.length} URLs declare a canonical pointing to another URL`,
      detail: "The served HTML canonicalizes these pages away — Google will not index them individually.",
      urls: canonicalElsewhere.map((p) => p.url).slice(0, 200),
      data: { examples: canonicalElsewhere.slice(0, 10).map((p) => ({ url: p.url, canonical: p.canonical })) },
    });
  if (hard404.length)
    push({ key: "http-404", severity: "critical", category: "Indexability", title: `${hard404.length} URLs return 404/410`, detail: "HTTP-level not found.", urls: hard404.map((p) => p.url).slice(0, 200) });
  if (serverErr.length)
    push({ key: "http-5xx", severity: "critical", category: "Indexability", title: `${serverErr.length} URLs return server errors (5xx)`, detail: "", urls: serverErr.map((p) => p.url).slice(0, 200) });
  if (soft404s.length)
    push({
      key: "soft-404",
      severity: "high",
      category: "Indexability",
      title: `${soft404s.length} soft-404 URLs (HTTP 200 shell, missing record)`,
      detail: "The edge serves the storefront shell for every /product/* path; when the product record is missing the page renders a not-found state. Google classifies these as soft 404s.",
      urls: soft404s.map((p) => p.url).slice(0, 200),
    });
  if (unreachable.length)
    push({ key: "unreachable", severity: "high", category: "Indexability", title: `${unreachable.length} URLs unreachable during the audit`, detail: "Timeouts or DNS/network errors.", urls: unreachable.map((p) => p.url).slice(0, 200) });
  if (loops.length)
    push({ key: "redirect-loops", severity: "high", category: "Redirects", title: `${loops.length} redirect loops`, detail: "", urls: loops.map((p) => p.url).slice(0, 100) });
  if (redirected.length)
    push({ key: "redirects", severity: "medium", category: "Redirects", title: `${redirected.length} URLs are redirects`, detail: "", urls: redirected.map((p) => p.url).slice(0, 200), data: { chains: redirected.slice(0, 10).map((p) => p.redirectChain) } });
  if (robotsBlocked.length)
    push({ key: "robots-blocked", severity: "medium", category: "Indexability", title: `${robotsBlocked.length} URLs blocked by robots.txt`, detail: "", urls: robotsBlocked.map((p) => p.url).slice(0, 100) });
  if (noindexed.length)
    push({ key: "noindex", severity: "info", category: "Indexability", title: `${noindexed.length} URLs carry noindex`, detail: "Expected for private pages (admin/account/checkout).", urls: noindexed.map((p) => p.url).slice(0, 100) });

  // duplicate groups — live + database
  const dup = run.duplicates || {};
  for (const g of (dup.live?.titles || []).slice(0, 50))
    push({ key: `dup-title:${g.normalizedKey}`, severity: "high", category: "Duplicate Metadata", title: `Duplicate served <title> used by ${g.count} URLs`, detail: g.value.slice(0, 200), urls: g.urls.map((u: any) => u.url), data: { value: g.value } });
  for (const g of (dup.live?.descriptions || []).slice(0, 50))
    push({ key: `dup-desc:${g.normalizedKey}`, severity: "high", category: "Duplicate Metadata", title: `Duplicate served meta description used by ${g.count} URLs`, detail: g.value.slice(0, 200), urls: g.urls.map((u: any) => u.url), data: { value: g.value } });
  for (const g of (dup.live?.canonicals || []).slice(0, 50))
    push({ key: `dup-canonical:${g.normalizedKey}`, severity: "high", category: "Duplicate Metadata", title: `Duplicate canonical URL declared by ${g.count} pages`, detail: g.value, urls: g.urls.map((u: any) => u.url), data: { value: g.value } });
  for (const g of (dup.database?.productTitles || []).slice(0, 50))
    push({ key: `db-dup-title:${g.normalizedKey}`, severity: "high", category: "Duplicate Product SEO", title: `Duplicate product SEO title (${g.count} products)`, detail: g.value.slice(0, 200), urls: g.urls.map((u: any) => u.url), data: { value: g.value, usedBy: g.urls } });
  for (const g of (dup.database?.productDescriptions || []).slice(0, 50))
    push({ key: `db-dup-desc:${g.normalizedKey}`, severity: "high", category: "Duplicate Product SEO", title: `Duplicate product meta description (${g.count} products)`, detail: g.value.slice(0, 200), urls: g.urls.map((u: any) => u.url), data: { value: g.value, usedBy: g.urls } });
  if ((dup.live?.nearDuplicateDescriptions || []).length)
    push({
      key: "near-dup-desc",
      severity: "medium",
      category: "Duplicate Metadata",
      title: `${dup.live.nearDuplicateDescriptions.length} near-duplicate meta description pairs`,
      detail: "Jaccard word similarity ≥ 0.8 — review and differentiate.",
      urls: dup.live.nearDuplicateDescriptions.flatMap((x: any) => x.urls.map((u: any) => u.url)).slice(0, 100),
      data: { pairs: dup.live.nearDuplicateDescriptions.slice(0, 20) },
    });

  const sitemapV = run.sitemapValidation || {};
  if ((sitemapV.missingFromSitemap || []).length)
    push({ key: "sitemap-missing", severity: "high", category: "Sitemap", title: `${sitemapV.missingFromSitemap.length} published products missing from sitemap-products.xml`, detail: "", urls: sitemapV.missingFromSitemap.slice(0, 100) });
  if ((sitemapV.http404 || []).length)
    push({ key: "sitemap-404", severity: "critical", category: "Sitemap", title: `${sitemapV.http404.length} sitemap URLs return 404/error`, detail: "", urls: sitemapV.http404.slice(0, 100) });
  if ((sitemapV.redirected || []).length)
    push({ key: "sitemap-redirect", severity: "medium", category: "Sitemap", title: `${sitemapV.redirected.length} sitemap URLs are redirects`, detail: "", urls: sitemapV.redirected.slice(0, 100) });
  if ((sitemapV.noindex || []).length)
    push({ key: "sitemap-noindex", severity: "high", category: "Sitemap", title: `${sitemapV.noindex.length} sitemap URLs are noindex`, detail: "", urls: sitemapV.noindex.slice(0, 100) });
  if ((sitemapV.canonicalMismatch || []).length)
    push({ key: "sitemap-canonical", severity: "medium", category: "Sitemap", title: `${sitemapV.canonicalMismatch.length} sitemap URLs with canonical mismatch`, detail: "", urls: sitemapV.canonicalMismatch.map((x: any) => x.url || x).slice(0, 100), data: { detail: sitemapV.canonicalMismatch.slice(0, 10) } });
  if ((sitemapV.duplicates || []).length)
    push({ key: "sitemap-duplicates", severity: "medium", category: "Sitemap", title: `${sitemapV.duplicates.length} duplicate sitemap entries`, detail: "", urls: sitemapV.duplicates.slice(0, 100) });
  if ((sitemapV.deletedFromDb || []).length)
    push({ key: "sitemap-deleted", severity: "high", category: "Sitemap", title: `${sitemapV.deletedFromDb.length} sitemap URLs have no matching published product`, detail: "", urls: sitemapV.deletedFromDb.slice(0, 100) });

  if (missingTitle.length)
    push({ key: "missing-title", severity: "medium", category: "Metadata", title: `${missingTitle.length} URLs missing <title>`, detail: "", urls: missingTitle.map((p) => p.url).slice(0, 100) });
  if (missingDesc.length)
    push({ key: "missing-description", severity: "medium", category: "Metadata", title: `${missingDesc.length} URLs missing meta description`, detail: "", urls: missingDesc.map((p) => p.url).slice(0, 100) });
  if (missingCanonical.length)
    push({ key: "missing-canonical", severity: "medium", category: "Canonical", title: `${missingCanonical.length} URLs missing canonical tag`, detail: "", urls: missingCanonical.map((p) => p.url).slice(0, 100) });
  if (missingH1.length)
    push({ key: "missing-h1", severity: "medium", category: "Content Structure", title: `${missingH1.length} URLs without an H1 in the served HTML`, detail: "The storefront is an SPA — per-page headings are injected client-side after JavaScript runs, so first-fetch crawlers see no H1. Prerendering the per-page HTML would fix this together with the canonical finding.", urls: missingH1.map((p) => p.url).slice(0, 200) });
  if (zeroContent.length)
    push({ key: "zero-content", severity: "high", category: "Content Structure", title: `${zeroContent.length} URLs serve zero indexable text without JavaScript`, detail: "SPA shell pages carry no visible words in the raw HTML response.", urls: zeroContent.map((p) => p.url).slice(0, 200) });
  if (schemaInvalid.length)
    push({ key: "schema-invalid", severity: "medium", category: "Structured Data", title: `${schemaInvalid.length} URLs with invalid JSON-LD`, detail: "", urls: schemaInvalid.map((p) => p.url).slice(0, 100), data: { errors: schemaInvalid.slice(0, 5).map((p) => ({ url: p.url, error: p.jsonLd.filter((b) => !b.valid).map((b) => b.error) })) } });
  if (imagesMissingAlt > 0)
    push({ key: "images-missing-alt", severity: "low", category: "Image SEO", title: `${imagesMissingAlt} images without ALT attribute`, detail: "Counted across crawled HTML (missing = no alt attribute at all).", urls: pages.filter((p) => p.imagesMissingAlt > 0).map((p) => p.url).slice(0, 100) });

  // sitemap.xml reachability + robots
  if (run.discovered?.discoveryErrors?.length)
    push({ key: "discovery-errors", severity: "high", category: "Technical SEO", title: `${run.discovered.discoveryErrors.length} discovery errors`, detail: run.discovered.discoveryErrors.join("; "), urls: [] });
  if (run.robots && run.robots.ok === false)
    push({ key: "robots-unreachable", severity: "critical", category: "Technical SEO", title: "robots.txt unreachable", detail: "", urls: [] });

  return f;
}

async function persistFindings(db: any, runId: string, findings: Finding[]) {
  const { findings: col } = collections(db);
  const now = new Date();
  for (const item of findings) {
    const existing = await col.findOne({ key: item.key });
    if (existing) {
      await col.updateOne(
        { _id: existing._id },
        {
          $set: {
            severity: item.severity,
            category: item.category,
            title: item.title,
            detail: item.detail,
            urls: item.urls,
            data: item.data || null,
            lastSeenRunId: runId,
            lastSeenAt: now,
            resolved: false,
          },
        }
      );
    } else {
      await col.insertOne({
        key: item.key,
        severity: item.severity,
        category: item.category,
        title: item.title,
        detail: item.detail,
        urls: item.urls,
        data: item.data || null,
        firstSeenRunId: runId,
        firstSeenAt: now,
        lastSeenRunId: runId,
        lastSeenAt: now,
        resolved: false,
        ignored: false,
      } as any);
    }
  }
  // findings not seen in this run (and previously open) → resolved
  const keys = findings.map((x) => x.key);
  await col.updateMany({ key: { $nin: keys }, resolved: false, lastSeenRunId: { $ne: runId }, ignored: { $ne: true } }, { $set: { resolved: true, resolvedRunId: runId, resolvedAt: now } });
  // findings explicitly ignored stay ignored (never resurrected into open state)
  await col.updateMany({ ignored: true, key: { $in: keys } }, { $set: { lastSeenRunId: runId, lastSeenAt: now, resolved: false } });
}

// ---------------------------------------------------------------------------
// SEO Health Score — weighted, measured components only
// ---------------------------------------------------------------------------
function computeHealthScore(run: any, cwv: any): { total: number; breakdown: any[]; partial: boolean; note: string } {
  const pages: PageResult[] = run.pages || [];
  const crawled = pages.length || 1;

  // Technical SEO 25 — sitemap reachability, robots, discovery errors, redirect loops
  const disc = run.discovered || {};
  const sitemapList = Object.values(disc.sitemaps || {}) as any[];
  const sitemapOk = sitemapList.filter((s) => s.ok).length;
  const sitemapTotal = sitemapList.length || 1;
  const robotsOk = run.robots?.ok ? 1 : 0;
  const discErr = (disc.discoveryErrors || []).length;
  const loops = pages.filter((p) => p.redirectLoop).length;
  const technical = Math.max(0, 25 - (sitemapTotal - sitemapOk) * (25 / 5) - (robotsOk ? 0 : 10) - discErr * 2 - loops * 3);

  // Indexability 20 — share of crawled URLs that are indexable
  const indexable = pages.filter((p) => p.indexable).length;
  const indexability = (indexable / crawled) * 20;

  // Metadata 15 — served titles/descriptions quality + duplicates
  const with200 = pages.filter((p) => p.httpStatus === 200).length || 1;
  const metaIssues = pages.filter((p) => p.httpStatus === 200).reduce((s, p) => s + p.issues.filter((i) => ["title-missing", "title-short", "title-long", "description-missing", "description-short", "description-long"].includes(i.code)).length, 0);
  const dupLive = ((run.duplicates?.live?.titles || []).length + (run.duplicates?.live?.descriptions || []).length) * 2;
  const metadata = Math.max(0, 15 - (metaIssues / with200) * 10 - Math.min(5, dupLive));

  // Content 10 — H1 presence + word counts on 200 pages (raw-HTML truth:
  // SPA shells that render content only client-side count as issues, because
  // first-fetch crawlers see zero H1/words)
  const contentIssues = pages.filter((p) => p.httpStatus === 200).reduce((s, p) => s + (p.h1Count === 0 ? 1 : 0) + (p.wordCount === 0 ? 1 : 0), 0);
  const shells = pages.filter((p) => p.spaShell).length;
  const content = Math.max(0, 10 - (contentIssues / with200) * 10);

  // Structured data 10 — share of 200 pages carrying valid JSON-LD
  const withSchema = pages.filter((p) => p.httpStatus === 200 && (p.jsonLd || []).some((b) => b.valid)).length;
  const structured = (withSchema / with200) * 10;

  // Internal links 5 — no broken internal anchors (measured via soft-404 + 404s)
  const brokenInternal = pages.filter((p) => p.soft404Suspected || p.httpStatus === 404).length;
  const links = Math.max(0, 5 - Math.min(5, brokenInternal * 0.5));

  // Image SEO 5 — share of images with alt across crawled HTML
  const totalImgs = pages.reduce((s, p) => s + p.imagesTotal, 0);
  const missingAlt = pages.reduce((s, p) => s + p.imagesMissingAlt, 0);
  const imageSeo = totalImgs === 0 ? 5 : Math.max(0, 5 - (missingAlt / totalImgs) * 5);

  const breakdown: any[] = [
    { component: "Technical SEO", weight: 25, earned: Math.round(technical * 10) / 10, measured: true, basis: `${sitemapOk}/${sitemapTotal} sitemaps OK · robots ${run.robots?.ok ? "OK" : "FAIL"} · ${discErr} discovery errors · ${loops} redirect loops` },
    { component: "Indexability", weight: 20, earned: Math.round(indexability * 10) / 10, measured: true, basis: `${indexable}/${pages.length} crawled URLs indexable` },
    { component: "Metadata Quality", weight: 15, earned: Math.round(metadata * 10) / 10, measured: true, basis: `${metaIssues} meta issues on 200-OK pages · ${dupLive / 2} duplicate groups` },
    { component: "Content Structure", weight: 10, earned: Math.round(content * 10) / 10, measured: true, basis: `${contentIssues} structure issues (missing H1/zero words in served HTML) · ${shells} SPA-shell pages` },
    { component: "Structured Data", weight: 10, earned: Math.round(structured * 10) / 10, measured: true, basis: `${withSchema}/${with200} pages with valid JSON-LD` },
    { component: "Internal Links", weight: 5, earned: Math.round(links * 10) / 10, measured: true, basis: `${brokenInternal} broken/soft-404 targets` },
    { component: "Image SEO", weight: 5, earned: Math.round(imageSeo * 10) / 10, measured: true, basis: totalImgs ? `${missingAlt}/${totalImgs} images missing ALT` : "no images found in crawled HTML" },
  ];

  let partial = false;
  if (cwv && cwv.available) {
    const m = cwv;
    const lcpScore = m.lcp == null ? 5 : m.lcp <= 2500 ? 10 : m.lcp <= 4000 ? 5 : 0;
    const clsScore = m.cls == null ? 2.5 : m.cls <= 0.1 ? 5 : m.cls <= 0.25 ? 2.5 : 0;
    const inpScore = m.inp == null ? 2.5 : m.inp <= 200 ? 5 : m.inp <= 500 ? 2.5 : 0;
    breakdown.push({ component: "Core Web Vitals", weight: 10, earned: Math.round(((lcpScore + clsScore + inpScore) / 2) * 10) / 10, measured: true, basis: `LCP ${m.lcp ?? "n/a"}ms · CLS ${m.cls ?? "n/a"} · INP ${m.inp ?? "n/a"}ms (${m.source})` });
    const measuredWeight = breakdown.reduce((s, b) => s + b.weight, 0);
    const earned = breakdown.reduce((s, b) => s + b.earned, 0);
    return { total: Math.round((earned / measuredWeight) * 100), breakdown, partial: false, note: "All 8 components measured (Core Web Vitals from the latest PageSpeed run)." };
  }
  breakdown.push({ component: "Core Web Vitals", weight: 10, earned: 0, measured: false, basis: "Not measured yet — run Refresh Core Web Vitals" });
  const measured = breakdown.filter((b) => b.measured);
  const measuredWeight = measured.reduce((s, b) => s + b.weight, 0);
  const earned = measured.reduce((s, b) => s + b.earned, 0);
  partial = true;
  return {
    total: Math.round((earned / measuredWeight) * 100),
    breakdown,
    partial,
    note: "Partial score — Core Web Vitals not measured yet; the percentage is normalized over the 7 measured components only. Run Refresh Core Web Vitals for the full 8-component score.",
  };
}

// ---------------------------------------------------------------------------
// Finalize
// ---------------------------------------------------------------------------
export async function finalizeAudit(db: any, runId: string): Promise<any> {
  const { runs } = collections(db);
  const { ObjectId } = await import("mongodb");
  const run = await runs.findOne({ _id: new ObjectId(runId) });
  if (!run) throw new Error("audit run not found");

  const started = run.startedAt ? new Date(run.startedAt).getTime() : Date.now();
  const pages: PageResult[] = run.pages || [];
  const sitemapUrls: string[] = [...new Set<string>((run.discovered?.sitemapUrls || []).concat())];

  // rebuild sitemap URL list from the discovered sitemap meta (sources recorded per-URL)
  const fromSitemap = new Set<string>();
  for (const u of run.urls || []) if ((u.source || []).includes("sitemap")) fromSitemap.add(u.url);

  const duplicates = await detectDuplicates(db, pages);
  const sitemapValidation = await validateSitemaps(db, pages, run.discovered?.sitemaps || {}, [...fromSitemap], run.discovered?.duplicateSitemapUrls || []);

  const cwvLatest = await latestCwv(db);
  const score = computeHealthScore({ ...run, duplicates, sitemapValidation }, cwvLatest);

  const counts = {
    crawledUrls: pages.length,
    indexable: pages.filter((p) => p.indexable).length,
    notIndexable: pages.filter((p) => !p.indexable).length,
    http200: pages.filter((p) => p.httpStatus === 200).length,
    redirects: pages.filter((p) => p.httpStatus >= 300 && p.httpStatus < 400).length,
    http404: pages.filter((p) => p.httpStatus === 404 || p.httpStatus === 410).length,
    serverErrors: pages.filter((p) => p.httpStatus >= 500).length,
    unreachable: pages.filter((p) => p.httpStatus === 0).length,
    soft404: pages.filter((p) => p.soft404Suspected).length,
    robotsBlocked: pages.filter((p) => !p.robotsAllowed).length,
    noindex: pages.filter((p) => /noindex/i.test(p.metaRobots || "") || /noindex/i.test(p.xRobotsTag || "")).length,
    orphanCandidates: (run.urls || []).filter((u: any) => !(u.source || []).includes("sitemap") && !(u.source || []).includes("mongodb") && !(u.source || []).includes("static")).map((u: any) => u.url),
    imagesMissingAlt: pages.reduce((s, p) => s + p.imagesMissingAlt, 0),
    imagesTotal: pages.reduce((s, p) => s + p.imagesTotal, 0),
    schemaErrors: pages.filter((p) => (p.jsonLd || []).some((b) => !b.valid)).length,
    duplicateTitleGroups: (duplicates.live.titles || []).length,
    duplicateDescriptionGroups: (duplicates.live.descriptions || []).length,
    duplicateCanonicalGroups: (duplicates.live.canonicals || []).length,
    dbDuplicateProductTitleGroups: (duplicates.database.productTitles || []).length,
    dbDuplicateProductDescriptionGroups: (duplicates.database.productDescriptions || []).length,
    brokenUrls: pages.filter((p) => p.httpStatus >= 400 || p.httpStatus === 0 || p.soft404Suspected).length,
  };

  const findings = await buildFindings(db, { ...run, duplicates, sitemapValidation }).then(async (list) => {
    await persistFindings(db, runId, list);
    return list;
  });

  const severityCounts = {
    critical: findings.filter((x) => x.severity === "critical").length,
    high: findings.filter((x) => x.severity === "high").length,
    medium: findings.filter((x) => x.severity === "medium").length,
    low: findings.filter((x) => x.severity === "low").length,
    info: findings.filter((x) => x.severity === "info").length,
  };

  // previous completed run for history comparison
  const prev = await runs
    .find({ _id: { $ne: new ObjectId(runId) }, status: "completed", mode: { $ne: "page" } })
    .sort({ startedAt: -1 })
    .limit(1)
    .toArray();

  const completedAt = new Date();
  const summary = {
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - started,
    counts,
    findingsCount: findings.length,
    severityCounts,
    previousRun: prev[0]
      ? {
          runId: prev[0]._id.toString(),
          startedAt: prev[0].startedAt,
          score: prev[0].score?.total ?? null,
          brokenUrls: prev[0].summary?.counts?.brokenUrls ?? null,
          duplicateTitleGroups: prev[0].summary?.counts?.duplicateTitleGroups ?? null,
          findingsCount: prev[0].summary?.findingsCount ?? null,
        }
      : null,
  };

  await runs.updateOne(
    { _id: new ObjectId(runId) },
    { $set: { status: "completed", completedAt, durationMs: summary.durationMs, duplicates, sitemapValidation, score, summary, "progress.phase": "completed", crawledUrls: pages.length } }
  );

  return { runId, summary, score, findingsCount: findings.length };
}

export async function latestCwv(db: any): Promise<any> {
  const { perf } = collections(db);
  const rows = await perf.find({ source: "pagespeed" }).sort({ measuredAt: -1 }).limit(2).toArray();
  if (!rows.length) return { available: false };
  const mobile = rows.find((r: any) => r.strategy === "mobile") || rows[0];
  const metrics: any = { source: `PageSpeed (${mobile.strategy})` };
  for (const row of rows) {
    const m = row.metrics || {};
    if (m.lcp != null && metrics.lcp == null) metrics.lcp = m.lcp;
    if (m.cls != null && metrics.cls == null) metrics.cls = m.cls;
    if (m.inp != null && metrics.inp == null) metrics.inp = m.inp;
  }
  metrics.available = metrics.lcp != null || metrics.cls != null || metrics.inp != null;
  return metrics;
}

export async function getRunStatus(db: any, runId?: string): Promise<any> {
  const { runs } = collections(db);
  const run = runId
    ? await runs.findOne({ _id: new (await import("mongodb")).ObjectId(runId) })
    : await runs.findOne({ mode: { $ne: "page" } }, { sort: { startedAt: -1 } });
  if (!run) return null;
  const { pages, urls, ...rest } = run;
  return {
    ...rest,
    pages: pages || [],
    pageSample: (pages || []).slice(0, 12).map((p: PageResult) => ({ url: p.url, score: p.score, httpStatus: p.httpStatus, indexable: p.indexable })),
    urlsPending: (urls || []).filter((u: any) => !u.crawled).length,
  };
}

export { buildFindings, computeHealthScore, crawlOne };
