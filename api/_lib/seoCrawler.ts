// seoCrawler.ts — LIVE production crawl + HTML analysis engine.
//
// Zero external dependencies (no cheerio/jsdom) so the serverless bundle and
// local harness behave identically. Every value returned is MEASURED from a
// real HTTP fetch of playbeat.digital — nothing is inferred or fabricated.
//
// Exports:
//   fetchWithTimeout, resolveUrlChain, loadRobots, isAllowedByRobots,
//   parseSitemapXml (index + urlset), parseHtmlSeo, classifyPage,
//   jaccardSimilarity, normalizeMetaKey, SEO_SITE

export const SEO_SITE = "https://playbeat.digital";

const UA =
  "Mozilla/5.0 (compatible; PlayBeatSEOAudit/1.0; +https://playbeat.digital) AppleWebKit/537.36 Chrome/120 Safari/537.36";

export function fetchWithTimeout(
  url: string,
  opts: { timeoutMs?: number; method?: string; headers?: Record<string, string> } = {}
): Promise<Response> {
  const { timeoutMs = 10000, method = "GET", headers = {} } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    method,
    redirect: "manual",
    signal: ctrl.signal,
    headers: { "User-Agent": UA, Accept: "*/*", ...headers },
  }).finally(() => clearTimeout(timer));
}

/** Follow a URL's redirect chain manually. Returns every hop + the final response. */
export async function resolveUrlChain(url: string, timeoutMs = 10000, maxHops = 5) {
  const hops: Array<{ url: string; status: number; location?: string }> = [];
  let current = url;
  let res: Response | null = null;
  for (let i = 0; i <= maxHops; i++) {
    const started = Date.now();
    try {
      res = await fetchWithTimeout(current, { timeoutMs });
      const ttfb = Date.now() - started;
      const loc = res.headers.get("location") || undefined;
      hops.push({ url: current, status: res.status, location: loc });
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, current).toString();
        if (hops.some((h) => h.url === next)) {
          return { hops, res, ttfbMs: ttfb, loop: true };
        }
        current = next;
        continue;
      }
      return { hops, res, ttfbMs: ttfb, loop: false };
    } catch (err: any) {
      const msg =
        err?.name === "AbortError" ? "timeout" : err?.message || "fetch error";
      hops.push({ url: current, status: 0 });
      return { hops, res: null, ttfbMs: Date.now() - started, loop: false, error: msg };
    }
  }
  return { hops, res, ttfbMs: 0, loop: false, error: "too many redirects" };
}

// ---------------------------------------------------------------------------
// robots.txt — real parsing of the production file (longest-prefix match)
// ---------------------------------------------------------------------------
export interface RobotsRules {
  ok: boolean;
  status: number;
  body: string;
  sitemaps: string[];
  groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }>;
}

export async function loadRobots(baseUrl = SEO_SITE): Promise<RobotsRules> {
  const out: RobotsRules = { ok: false, status: 0, body: "", sitemaps: [], groups: [] };
  try {
    const res = await fetchWithTimeout(`${baseUrl}/robots.txt`, { timeoutMs: 8000 });
    out.status = res.status;
    out.ok = res.status === 200;
    out.body = res.status === 200 ? await res.text() : "";
    const currentAgents = new Set<string>();
    let allow: string[] = [];
    let disallow: string[] = [];
    const flush = () => {
      if (currentAgents.size && (allow.length || disallow.length)) {
        out.groups.push({ agents: [...currentAgents], allow: [...allow], disallow: [...disallow] });
      }
      currentAgents.clear();
      allow = [];
      disallow = [];
    };
    for (const rawLine of out.body.split(/\r?\n/)) {
      const line = rawLine.replace(/#.*$/, "").trim();
      if (!line) continue;
      const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (key === "user-agent") {
        if (allow.length || disallow.length) flush();
        currentAgents.add(val.toLowerCase());
      } else if (key === "allow") {
        if (val) allow.push(val);
      } else if (key === "disallow") {
        if (val) disallow.push(val);
      } else if (key === "sitemap") {
        if (val) out.sitemaps.push(val);
      }
    }
    flush();
  } catch {
    /* out.ok stays false — caller reports honestly */
  }
  return out;
}

function matchPattern(pattern: string, path: string): boolean {
  // robots.txt pattern: '*' wildcard + '$' end anchor, longest-prefix wins
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") re += "[\\s\\S]*";
    else if (c === "$") re += "$";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  try {
    return new RegExp(re).test(path);
  } catch {
    return false;
  }
}

/** Is this URL allowed for the given UA group set? (uses `*` + Googlebot groups) */
export function isAllowedByRobots(robots: RobotsRules, url: string, ua = "*"): boolean {
  const path = new URL(url).pathname + (new URL(url).search || "");
  const groups = robots.groups.filter(
    (g) => g.agents.includes(ua.toLowerCase()) || g.agents.includes("*")
  );
  if (!groups.length) return true;
  // Most specific matching group wins (Googlebot group if UA is googlebot, else `*`)
  const specific = robots.groups.find((g) => g.agents.includes(ua.toLowerCase()));
  const group = specific || robots.groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  let bestLen = -1;
  let bestAllow = true;
  for (const p of group.allow) {
    if (matchPattern(p, path) && p.replace(/\*+$/, "").length > bestLen) {
      bestLen = p.replace(/\*+$/, "").length;
      bestAllow = true;
    }
  }
  for (const p of group.disallow) {
    if (matchPattern(p, path) && p.replace(/\*+$/, "").length > bestLen) {
      bestLen = p.replace(/\*+$/, "").length;
      bestAllow = false;
    }
  }
  return bestLen === -1 ? true : bestAllow;
}

// ---------------------------------------------------------------------------
// Sitemap XML parsing (index + urlset), namespace tolerant
// ---------------------------------------------------------------------------
export interface ParsedSitemap {
  kind: "index" | "urlset" | "invalid";
  xml: boolean;
  namespaceOk: boolean;
  entries: Array<{ loc: string; lastmod?: string }>;
  childSitemaps: string[];
  duplicateLocs: string[];
}

export function parseSitemapXml(xmlText: string): ParsedSitemap {
  const out: ParsedSitemap = {
    kind: "invalid",
    xml: /<\?xml/i.test(xmlText),
    namespaceOk: /https?:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9/i.test(xmlText),
    entries: [],
    childSitemaps: [],
    duplicateLocs: [],
  };
  if (/<sitemapindex[\s>]/i.test(xmlText)) out.kind = "index";
  else if (/<urlset[\s>]/i.test(xmlText)) out.kind = "urlset";
  else return out;

  if (out.kind === "index") {
    const blocks = xmlText.match(/<sitemap>[\s\S]*?<\/sitemap>/gi) || [];
    for (const b of blocks) {
      const loc = b.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i)?.[1];
      if (loc) out.childSitemaps.push(decode(loc));
    }
  } else {
    const blocks = xmlText.match(/<url>[\s\S]*?<\/url>/gi) || [];
    const seen = new Map<string, number>();
    for (const b of blocks) {
      const loc = b.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i)?.[1];
      if (!loc) continue;
      const lastmod = b.match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i)?.[1];
      const decoded = decode(loc);
      out.entries.push({ loc: decoded, lastmod: lastmod ? decode(lastmod) : undefined });
      seen.set(decoded, (seen.get(decoded) || 0) + 1);
    }
    out.duplicateLocs = [...seen.entries()].filter(([, n]) => n > 1).map(([u]) => u);
  }
  return out;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

// ---------------------------------------------------------------------------
// HTML head/body extraction
// ---------------------------------------------------------------------------
export interface ParsedHtml {
  title: string;
  metaDescription: string;
  metaRobots: string;
  canonical: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  h1: string[];
  h2Count: number;
  h3Count: number;
  h2Samples: string[];
  wordCount: number;
  textLength: number;
  jsonLdBlocks: Array<{ valid: boolean; types: string[]; error?: string }>;
  images: Array<{ src: string; alt: string | null }>;
  anchors: Array<{ href: string; text: string; rel?: string }>;
  htmlBytes: number;
  notFoundMarkers: string[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return "";
      }
    });
}

function attrValue(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "").trim();
}

export function parseHtmlSeo(html: string): ParsedHtml {
  const headMatch = html.match(/<head[\s>][\s\S]*?<\/head>/i);
  const head = headMatch ? headMatch[0] : html.slice(0, 20000);

  const title = decodeEntities(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const metaTagContent = (tagRe: RegExp): string => {
    const tag = head.match(tagRe)?.[0] || "";
    if (!tag) return "";
    return decodeEntities(attrValue(tag, "content") || "").trim();
  };
  const metaDescription = metaTagContent(/<meta[^>]+name\s*=\s*["']description["'][^>]*>/i);
  const metaRobots = metaTagContent(/<meta[^>]+name\s*=\s*["']robots["'][^>]*>/i);
  const canonicalTag = head.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*>/i)?.[0] || "";
  const canonical = canonicalTag ? attrValue(canonicalTag, "href") : null;

  const og = (prop: string) => metaTagContent(new RegExp(`<meta[^>]+property\\s*=\\s*["']${prop}["'][^>]*>`, "i"));
  const tw = (name: string) => metaTagContent(new RegExp(`<meta[^>]+name\\s*=\\s*["']${name}["'][^>]*>`, "i"));

  const bodyMatch = html.match(/<body[\s\S]*<\/body>/i);
  const body = bodyMatch ? bodyMatch[0] : "";

  const h1: string[] = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h2Samples: string[] = [];
  const tagText = (inner: string) =>
    decodeEntities(inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
  let m: RegExpExecArray | null;
  const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  while ((m = h1Re.exec(body))) h1.push(tagText(m[1]).slice(0, 200));
  let h2Count = 0;
  while ((m = h2Re.exec(body))) {
    h2Count++;
    if (h2Samples.length < 5) h2Samples.push(tagText(m[1]).slice(0, 120));
  }
  const h3Count = (body.match(/<h3[^>]*>/gi) || []).length;

  // visible text for word count — drop scripts/styles/noscript/templates
  const visible = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const text = decodeEntities(visible.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").filter((w) => /[\p{L}\p{N}]/u.test(w)) : [];

  // JSON-LD
  const jsonLdBlocks: ParsedHtml["jsonLdBlocks"] = [];
  const ldRe = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = ldRe.exec(html))) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      const types: string[] = [];
      const collect = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(collect);
        if (typeof node === "object") {
          const t = node["@type"];
          if (typeof t === "string") types.push(t);
          else if (Array.isArray(t)) types.push(...t.map(String));
          if (node["@graph"]) collect(node["@graph"]);
        }
      };
      collect(parsed);
      jsonLdBlocks.push({ valid: true, types });
    } catch (e: any) {
      jsonLdBlocks.push({ valid: false, types: [], error: String(e?.message || "invalid JSON-LD").slice(0, 120) });
    }
  }

  // images (with alt presence)
  const images: ParsedHtml["images"] = [];
  const imgRe = /<img\b[^>]*>/gi;
  while ((m = imgRe.exec(html))) {
    const tag = m[0];
    const src = attrValue(tag, "src") || attrValue(tag, "data-src") || "";
    const altAttr = attrValue(tag, "alt");
    images.push({ src, alt: altAttr === null ? null : altAttr });
    if (images.length >= 400) break;
  }

  // anchors
  const anchors: ParsedHtml["anchors"] = [];
  const aRe = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = aRe.exec(html))) {
    const tag = m[0].match(/<a\b[^>]*>/i)![0];
    const href = attrValue(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    const rel = attrValue(tag, "rel") || undefined;
    anchors.push({ href, text: tagText(m[1]).slice(0, 120), rel });
    if (anchors.length >= 400) break;
  }

  const notFoundMarkers: string[] = [];
  const nfText = text.slice(0, 4000).toLowerCase();
  if (/\bpage not found\b|\b404\b not found|product not found|no products matched/.test(nfText))
    notFoundMarkers.push("not-found text");

  return {
    title,
    metaDescription,
    metaRobots,
    canonical,
    ogTitle: og("og:title"),
    ogDescription: og("og:description"),
    ogImage: og("og:image"),
    twitterCard: tw("twitter:card"),
    twitterTitle: tw("twitter:title"),
    twitterDescription: tw("twitter:description"),
    twitterImage: tw("twitter:image"),
    h1,
    h2Count,
    h3Count,
    h2Samples,
    wordCount: words.length,
    textLength: text.length,
    jsonLdBlocks,
    images,
    anchors,
    htmlBytes: Buffer.byteLength(html, "utf8"),
    notFoundMarkers,
  };
}

// ---------------------------------------------------------------------------
export function normalizeMetaKey(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeMetaKey(a).split(/[^a-z0-9]+/).filter(Boolean));
  const setB = new Set(normalizeMetaKey(b).split(/[^a-z0-9]+/).filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  return inter / (setA.size + setB.size - inter);
}
