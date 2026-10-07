// api/_lib/prerender.ts — Server-side SEO HTML renderer ("dynamic prerender
// layer") for playbeat.digital.
//
// WHY: the storefront is a Vite SPA — every URL served the same generic shell
// (title + canonical → homepage) until client JavaScript ran, so crawlers saw
// one metadata set for 100+ URLs. This module renders the SEO-relevant parts
// of each page (title, description, robots, canonical, OG, Twitter, JSON-LD,
// H1, description content) INTO the raw HTML response, straight from MongoDB,
// BEFORE any client JavaScript executes.
//
// DESIGN RULES (do not break):
// - The SPA experience is untouched. Injected content lives inside
//   <div id="root"> and React's createRoot().render() replaces it on mount
//   (main.tsx uses createRoot — NOT hydrateRoot — so no hydration mismatch is
//   possible). Post-mount the client's applyRouteSeo / applyProductJsonLd /
//   applyBreadcrumbJsonLd upsert the SAME values (matching element ids), so
//   metadata never flips and nothing is duplicated.
// - MongoDB is the only source of truth. Nothing is fabricated: when a value
//   does not exist (price, image, description), the tag/schema node is
//   OMITTED — never defaulted to invented data.
// - Drafts (active:false) and admin-noindexed (seo.index:false) products
//   render with robots noindex.
// - Variant products emit AggregateOffer(lowPrice/highPrice/offerCount) built
//   from REAL priced variants only; unpriced products emit no offers at all.
// - This is a LIBRARY inside the existing /api/products function — the
//   project stays within Vercel's 12-serverless-function cap.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./mongo.js";
import { slugify } from "./config.js";
import { SEO_SHELL_HTML, SEO_HOME_SHELL_HTML } from "./seoShell.generated.js";

const SITE = "https://playbeat.digital";
const DEFAULT_TITLE = "PlayBeat Digital — Premium Digital Marketplace & Smart Projectors";
const DEFAULT_DESC =
  "Instant digital keys, gaming accounts, subscriptions, AI tools, SaaS licenses, and high-performance 4K Smart Projectors with 24/7 automated delivery.";
const DEFAULT_IMAGE = `${SITE}/assets/images/playbeat/hero-marketplace.png`;

// ---------------------------------------------------------------------------
// Small HTML helpers (no DOM on the server — regex-based, conservative)
// ---------------------------------------------------------------------------

export function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip HTML to a single-line plain string (same policy as src/lib/description.ts). */
export function stripHtmlToText(html: string): string {
  const value = (html || "").toString();
  if (!value) return "";
  if (!/<[a-z!/][^>]*>/i.test(value)) return value.replace(/\s+/g, " ").trim();
  return value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasHtmlTags(text: string): boolean {
  return /<(\/?)(h[1-6]|p|div|span|br|hr|strong|b|em|i|u|s|small|sub|sup|ul|ol|li|a|blockquote|code|pre|table|thead|tbody|tfoot|caption|tr|th|td|img|figure|figcaption)(\s[^>]*)?>/i.test(
    String(text || "")
  );
}

/** Plain text → line-break-aware paragraphs (same shape the storefront renders). */
function plainTextToHtml(text: string): string {
  if (!text) return "";
  const blocks = escapeHtml(String(text).replace(/\r\n?/g, "\n"))
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => `<p>${b.replace(/\n/g, "<br>")}</p>`);
  return blocks.join("");
}

/**
 * Conservative server-side sanitizer for admin-authored description HTML.
 * The storefront re-sanitizes with DOMPurify at render time; here we only need
 * to guarantee the RAW HTML never carries active content (script/iframe/...,
 * event handlers, javascript: URLs). Semantic tags the admin wrote are kept.
 */
function sanitizeHtmlLite(html: string): string {
  let out = String(html || "")
    // drop dangerous containers entirely (content included for script/style)
    .replace(/<(script|style|iframe|object|embed|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(link|meta|base|frame|frameset|applet|svg|math|form|input|button|select|textarea|video|audio|source|track)\b[^>]*>/gi, " ")
    // structural document tags must never appear inside a description (the
    // prerender injection anchors on </body>)
    .replace(/<\/?(body|html|head)\b[^>]*>/gi, " ")
    // strip every on*= event handler and javascript:/vbscript: URLs
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, " ")
    .replace(/\s(href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript):[^"]*"|'\s*(?:javascript|vbscript):[^']*'|(?:javascript|vbscript):[^\s>]*)/gi, ' $1="#"');
  // heading-level hygiene: the injected block already owns the page H1, so
  // description-level <h1> becomes <h2> (matches the "no H1 in description"
  // admin rule and keeps exactly one H1 per page in the raw HTML).
  out = out.replace(/<h1(\s[^>]*)?>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
  // lazy-load images the same way the storefront does
  out = out.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"');
  return out;
}

/** Prepare ANY stored description for the raw-HTML content block. */
function descriptionToHtml(raw: string): string {
  const value = (raw || "").toString();
  if (!value.trim()) return "";
  if (hasHtmlTags(value)) return sanitizeHtmlLite(value);
  return plainTextToHtml(value);
}

function absolutizeUrl(u: string | null | undefined): string | null {
  const v = String(u || "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return `${SITE}${v}`;
  return null;
}

// ---------------------------------------------------------------------------
// Shell HTML — the built SPA index.html, delivered to the function at build
// time (scripts/generate-seo-shell.mjs → api/_lib/seoShell.generated.ts).
// A filesystem fallback keeps local/dev working without the generated module.
// ---------------------------------------------------------------------------

let shellCache: string | null = null;

// Perf (task §5/§6): the hero image preload carries fetchpriority=high and
// only helps the HOMEPAGE LCP element. On every other page the hero never
// renders — the preload would just race the real product image for
// bandwidth (measured: 200 KB at high priority on product pages).
const HERO_PRELOAD_RE = /<link[^>]*rel="preload"[^>]*hero_header_v3\.webp[^>]*>\s*/i;

function loadShellHtml(): string {
  if (shellCache) return shellCache;
  // SEO_SHELL_HTML is generated by `node scripts/generate-seo-shell.mjs`
  // immediately after `vite build` (see vercel.json buildCommand) and committed
  // so the serverless bundle always carries the real built shell.
  if (typeof SEO_SHELL_HTML === "string" && SEO_SHELL_HTML.includes('<div id="root"')) {
    // Non-home base shell: hero-root is already emptied by the generator;
    // drop the homepage-only hero image preload too.
    shellCache = SEO_SHELL_HTML.replace(HERO_PRELOAD_RE, "");
    return shellCache;
  }
  // Last resort — minimal but valid shell (never fabricates metadata; the
  // caller's head injection still applies).
  shellCache =
    '<!doctype html><html lang="en" class="dark"><head><meta charset="UTF-8" />' +
    `<title>${DEFAULT_TITLE}</title>` +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>' +
    '<body><div id="root"></div></body></html>';
  return shellCache;
}

// ---------------------------------------------------------------------------
// Head application — upsert semantics identical to the client's applyRouteSeo
// (the client updates the same tags after mount; values agree, so nothing
// flips or duplicates).
// ---------------------------------------------------------------------------

export interface SeoHead {
  title: string;
  description: string;
  robots: string;
  canonical: string;
  ogType: string;
  ogImage: string;
  ogUrl: string;
  twitterImage?: string;
  jsonLdBlocks?: Record<string, unknown>[];
  /** Remove og:image:width/height/alt (they only describe the default image). */
  dropOgImageDimensions?: boolean;
}

function upsertMetaName(html: string, name: string, content: string): string {
  const re = new RegExp(`<meta\\s+name=["']${name.replace(/:/g, "\\:")}["'][^>]*>`, "i");
  const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `${tag}\n  </head>`);
}

function upsertMetaProperty(html: string, prop: string, content: string): string {
  const re = new RegExp(`<meta\\s+property=["']${prop.replace(/:/g, "\\:")}["'][^>]*>`, "i");
  const tag = `<meta property="${prop}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `${tag}\n  </head>`);
}

function applyHeadToShell(shell: string, head: SeoHead): string {
  let html = shell;

  // <title>
  if (/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(head.title)}</title>`);
  } else {
    html = html.replace("</head>", `<title>${escapeHtml(head.title)}</title>\n  </head>`);
  }

  // meta description + robots + googlebot
  html = upsertMetaName(html, "description", head.description);
  html = upsertMetaName(html, "robots", head.robots);
  html = upsertMetaName(html, "googlebot", head.robots === "noindex, nofollow, noarchive" ? "noindex, nofollow" : "index, follow");

  // canonical
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(head.canonical)}" />`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag);
  } else {
    html = html.replace("</head>", `${canonicalTag}\n  </head>`);
  }

  // Open Graph
  html = upsertMetaProperty(html, "og:title", head.title);
  html = upsertMetaProperty(html, "og:description", head.description);
  html = upsertMetaProperty(html, "og:url", head.ogUrl);
  html = upsertMetaProperty(html, "og:type", head.ogType);
  html = upsertMetaProperty(html, "og:image", head.ogImage);
  if (head.dropOgImageDimensions) {
    // the static width/height/alt in the shell describe the default hero only
    html = html.replace(/<meta\s+property=["']og:image:(width|height|alt)["'][^>]*>/gi, "");
  }

  // Twitter card
  html = upsertMetaName(html, "twitter:card", "summary_large_image");
  html = upsertMetaName(html, "twitter:title", head.title);
  html = upsertMetaName(html, "twitter:description", head.description);
  html = upsertMetaName(html, "twitter:image", head.twitterImage || head.ogImage);

  // JSON-LD blocks (id-tagged scripts the client upserts in place)
  if (head.jsonLdBlocks?.length) {
    const scripts = head.jsonLdBlocks
      .map((b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, "\\u003c")}</script>`)
      .join("\n    ");
    html = html.replace("</head>", `    ${scripts}\n  </head>`);
  }

  return html;
}

/** Inject the pre-mount SEO content inside <div id="root"> (replaced by React on mount). */
function injectRootContent(html: string, rootHtml: string): string {
  // #root is the LAST element in <body> (vite moves module scripts to <head>),
  // so anchor on the root's closing tag + </body>. Greedy body match keeps
  // this working whether the shell root is empty or pre-filled (the build now
  // prerenders the homepage into dist/index.html).
  const re = /(<div id="root">)([\s\S]*)(<\/div>\s*<\/body>)/i;
  if (re.test(html)) {
    return html.replace(re, (_m, open: string, _mid: string, close: string) => open + rootHtml + close);
  }
  // last resort: empty-root exact match
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', `<div id="root">${rootHtml}</div>`);
  }
  // otherwise: leave the shell untouched rather than corrupt it
  return html;
}

// ---------------------------------------------------------------------------
// Pre-mount content block styling — inline styles ONLY (Tailwind classes are
// compiled from source files and would not exist for runtime-generated HTML).
// React replaces this entire block on mount; it exists so crawlers without JS
// (and users on very slow connections) see real content immediately.
// ---------------------------------------------------------------------------

const BLOCK =
  'style="min-height:100vh;background:#050814;color:#e5e7eb;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;padding:24px 16px;box-sizing:border-box"';
const INNER = 'style="max-width:920px;margin:0 auto"';
const H1_STYLE = 'style="color:#fff;font-size:26px;line-height:1.25;margin:10px 0 14px;font-weight:800"';
const P_STYLE = 'style="line-height:1.7;color:#c7ccd6;margin:0 0 14px;font-size:15px"';
const CRUMB_STYLE = 'style="font-size:13px;color:#8b93a3;margin-bottom:10px"';
const CRUMB_LINK = 'style="color:#a7b0c0;text-decoration:underline"';
const IMG_STYLE = 'style="max-width:320px;width:100%;height:auto;border-radius:14px;margin:0 0 16px;display:block"';
const LIST_STYLE = 'style="list-style:disc;padding-left:20px;margin:0 0 14px;color:#c7ccd6"';
const DESC_WRAP = 'style="line-height:1.7;color:#c7ccd6;font-size:15px"';
const DESC_LINK = 'style="color:#7dd3fc"';

function crumbHtml(items: { name: string; href?: string }[]): string {
  const parts = items.map((c) =>
    c.href ? `<a href="${escapeHtml(c.href)}" ${CRUMB_LINK}>${escapeHtml(c.name)}</a>` : `<span>${escapeHtml(c.name)}</span>`
  );
  return `<nav ${CRUMB_STYLE}>${parts.join(" / ")}</nav>`;
}

function descriptionLinksSafe(html: string): string {
  // keep description <a> readable on the dark background
  return html.replace(/<a\b/gi, `<a ${DESC_LINK}`).replace(/(<a\b[^>]*?)\sstyle="[^"]*"/gi, "$1").replace(new RegExp(`<a ${DESC_LINK}(?![^>]*style)`, "gi"), `<a ${DESC_LINK}`);
}

function categoryHrefFor(categoryName: string): string | null {
  const slug = categoryName === "Gift Cards" ? "gift-cards" : slugify(categoryName);
  const known = new Set([
    "streaming", "subscriptions", "gift-cards", "gaming", "software",
    "smart-projectors", "smart-4k-projectors", "ai-subscriptions",
    "steam-game-keys", "windows-office", "creative-software",
    "digital-services", "social-media", "web-hosting", "digital-marketing", "web3",
  ]);
  return slug && known.has(slug) ? `/${slug}` : null;
}

// ---------------------------------------------------------------------------
// Per-route SEO presets — mirror of the client's SEO_PRESETS (src/lib/seo.ts).
// Kept data-identical so the raw HTML and the post-hydration DOM agree.
// ---------------------------------------------------------------------------

interface Preset {
  title: string;
  description: string;
  path: string;
  label: string;
}

const CATEGORY_PRESETS: Record<string, Preset> = {
  "streaming": {
    title: "Streaming Subscriptions — Netflix, Prime Video, Disney+, HBO Max",
    description: "Official Netflix, YouTube Premium, Prime Video, Disney+, HBO Max, SonyLIV, ZEE5, Crunchyroll, Hulu and more streaming plans at PlayBeat Digital prices in Pakistan.",
    path: "/streaming",
    label: "Streaming",
  },
  "subscriptions": {
    title: "Subscriptions & AI Tools — ChatGPT, Perplexity, Office 365, VPNs",
    description: "Genuine ChatGPT Plus, Perplexity Pro, Office 365, Adobe Creative Cloud, CapCut Pro, Grammarly, Turnitin and top VPN subscriptions with instant email delivery.",
    path: "/subscriptions",
    label: "Subscriptions",
  },
  "gift-cards": {
    title: "Gift Cards — Xbox, PlayStation, Steam, Razer Gold, Apple",
    description: "Instant official gift card codes: Xbox, PlayStation Network, Steam Wallet, Razer Gold, Apple, Google Play and more — delivered to your inbox in minutes.",
    path: "/gift-cards",
    label: "Gift Cards",
  },
  "gaming": {
    title: "Gaming — Xbox Game Pass, Game Keys & Wallet Top-Ups",
    description: "Xbox Game Pass Ultimate, Steam & game keys and gaming wallet top-ups with full-duration warranty from PlayBeat Digital.",
    path: "/gaming",
    label: "Gaming",
  },
  "software": {
    title: "Software Licenses — Windows 11, Office 2024, Antivirus",
    description: "Genuine Windows 11/10, Office 2024/2021/2019 retail keys, Adobe CC, antivirus and productivity software with instant activation support.",
    path: "/software",
    label: "Software",
  },
  "smart-projectors": {
    title: "Smart 4K Projectors — Magcubic, HY300, HY320, HCS350 & More",
    description: "Shop official Magcubic, Hongtop and HY-series smart 4K projectors with full home cinema lineup, warranty and courier delivery across Pakistan.",
    path: "/smart-projectors",
    label: "Smart Projectors",
  },
  "smart-4k-projectors": {
    title: "Smart 4K Projectors — Native 1080p/4K Home Cinema",
    description: "Compare and buy native 4K & 1080p smart projectors with Android TV, WiFi 6 and licensed streaming — curated 4K home cinema collection.",
    path: "/smart-4k-projectors",
    label: "Smart 4K Projectors",
  },
  "ai-subscriptions": {
    title: "AI Subscriptions — ChatGPT Plus, Perplexity Pro, Leonardo AI",
    description: "Premium AI tool subscriptions: ChatGPT Plus, Perplexity Pro, Leonardo AI, ElevenLabs, Google Veo, Grammarly, QuillBot and more — activated on your own account.",
    path: "/ai-subscriptions",
    label: "AI Subscriptions",
  },
  "steam-game-keys": {
    title: "Steam & Game Keys — Wallet Codes, Game Pass, PSN",
    description: "Steam wallet codes, game keys, Xbox Game Pass and PlayStation Network cards — instant delivery with PlayBeat warranty.",
    path: "/steam-game-keys",
    label: "Steam & Game Keys",
  },
  "windows-office": {
    title: "Windows & Office — Genuine Retail License Keys",
    description: "Genuine Windows 11/10 and Microsoft Office 2024/2021/2019 license keys with instant email delivery and activation guarantee.",
    path: "/windows-office",
    label: "Windows & Office",
  },
  "creative-software": {
    title: "Creative Software — Adobe CC, CapCut Pro, Freepik",
    description: "Adobe Creative Cloud, CapCut Pro, Freepik, Canva Pro and other creative software subscriptions with instant activation.",
    path: "/creative-software",
    label: "Creative Software",
  },
  "digital-services": {
    title: "Digital Services — AI Subscriptions, IPTV & Managed Plans",
    description: "PlayBeat Digital services: AI subscriptions, IPTV plans, productivity suites and managed digital services with 24/7 human support.",
    path: "/digital-services",
    label: "Digital Services",
  },
  "social-media": {
    title: "Social Media — Growth Services & Account Top-Ups",
    description: "Social media growth services, page boosts and account top-ups from PlayBeat Digital — expand your reach with verified providers.",
    path: "/social-media",
    label: "Social Media",
  },
  "web-hosting": {
    title: "Web Hosting — Domains, VPS & SSL",
    description: "Web hosting, domains, VPS servers and SSL certificates — launch and run your website with PlayBeat Digital infrastructure partners.",
    path: "/web-hosting",
    label: "Web Hosting",
  },
  "digital-marketing": {
    title: "Digital Marketing — SEO Tools & Growth Suites",
    description: "SEO toolkits, marketing suites and growth services for your business — rank higher, sell more, with PlayBeat Digital.",
    path: "/digital-marketing",
    label: "Digital Marketing",
  },
  "web3": {
    title: "Web3 — Crypto Top-Ups, Wallets & Digital Assets",
    description: "Web3 services, crypto top-ups and digital-asset tooling — the next generation of internet services at PlayBeat Digital.",
    path: "/web3",
    label: "Web3",
  },
};

// Product categories that map 1:1 onto real category routes (same map as the
// client's CATEGORY_ROUTES — "Gift Cards" resolves to /gift-cards).
const PRODUCT_CATEGORY_TO_ROUTE: Record<string, string> = {
  "Streaming": "streaming",
  "Subscriptions": "subscriptions",
  "Gift Cards": "gift-cards",
  "Gaming": "gaming",
  "Software": "software",
  "Smart Projectors": "smart-projectors",
};

const STATIC_PRESETS: Record<string, Preset> = {
  "about": {
    title: "About PlayBeat Digital — Business Model, Payments & Customer Journey",
    description: "How PlayBeat Digital (Playbeat Digital Private Limited, Abbottabad, Pakistan) operates: what we sell, the complete customer journey from browsing to delivery, how our payment gateway is used at checkout, and PKR pricing with a currency converter.",
    path: "/about",
    label: "About PlayBeat Digital",
  },
  "contact": {
    title: "Contact & 24/7 Support",
    description: "Reach the PlayBeat team: live chat, email, WhatsApp, phone and office address — support within 2-4 hours.",
    path: "/contact",
    label: "Contact & 24/7 Support",
  },
  "compare": {
    title: "Projector Comparison — Hardware Specification Matrix",
    description: "Side-by-side hardware comparison of every PlayBeat smart projector: resolution, brightness, OS, RAM, WiFi and more.",
    path: "/compare",
    label: "Projector Comparison",
  },
  "download": {
    title: "Get the PlayBeat Digital App — Android & iOS",
    description: "Download the official PlayBeat Digital mobile app for Android and iOS. Shop digital products faster, manage orders, and access your account anywhere — same account as the website.",
    path: "/download",
    label: "Get the PlayBeat Digital App",
  },
};

/**
 * Curated subcategory matchers — server-side port of the client's
 * SUBCATEGORY_ROUTES (App.tsx). Same regexes over the same fields so the
 * prerendered product list matches what the storefront filters to.
 */
function productMatchesRoute(slug: string, p: any): boolean {
  const name = String(p.name || "");
  const tags = Array.isArray(p.tags) ? p.tags.join(" ") : "";
  const category = String(p.category || "");
  const desc = String(p.description || "");
  switch (slug) {
    case "smart-4k-projectors":
      return category === "Smart Projectors" &&
        (/4k/i.test(name) || /4k/i.test(String(p.projectorSpec?.nativeResolution || "")) ||
          tags.split(" ").some((t) => /4k/i.test(t)) || /4k/i.test(desc));
    case "ai-subscriptions":
      return /chatgpt|gpt-?5|perplexity|leonardo|elevenlabs|eleven ?labs|google ?veo|hailio|grammarly|quillbot|turnitin|helium ?10|copilot|midjourney|claude|gemini|\bai\b/i.test(`${name} ${tags} ${category}`);
    case "steam-game-keys":
      return /steam|game ?pass|game ?key|xbox|playstation|psn|razer gold|nintendo|gta|valorant/i.test(`${name} ${tags} ${category}`);
    case "windows-office":
      return /windows|office|microsoft 365|microsoft365/i.test(`${name} ${tags}`);
    case "creative-software":
      return /adobe|creative cloud|photoshop|illustrator|premiere|capcut|freepik|canva|envato/i.test(`${name} ${tags} ${desc}`);
    case "digital-services":
      return ["Subscriptions", "IPTV & Services", "AI & Productivity", "Bundles"].includes(category) ||
        /iptv|subscription|managed service|ai|chatgpt|perplexity|grammarly/i.test(`${name} ${tags} ${category}`);
    case "social-media":
      return category === "Social Media" || /social media|instagram|tiktok|facebook page|followers|youtube shorts/i.test(`${name} ${tags} ${category}`);
    case "web-hosting":
      return category === "Web Hosting" || /hosting|domain|vps|ssl|cpanel|web server/i.test(`${name} ${tags} ${category}`);
    case "digital-marketing":
      return category === "Digital Marketing" || /digital marketing|seo|semrush|ahrefs|marketing/i.test(`${name} ${tags} ${category}`);
    case "web3":
      return category === "Web3" || /web3|crypto|usdt|binance|nft|wallet connect/i.test(`${name} ${tags} ${category}`);
    default: {
      // plain category routes (streaming/subscriptions/gift-cards/gaming/
      // software/smart-projectors): match by DB category name
      const catName = Object.entries(PRODUCT_CATEGORY_TO_ROUTE).find(([, s]) => s === slug)?.[0];
      return !!catName && category.toLowerCase() === catName.toLowerCase();
    }
  }
}

// ---------------------------------------------------------------------------
// Shared response helpers
// ---------------------------------------------------------------------------

const RENDER_CACHE = "public, s-maxage=300, stale-while-revalidate=86400";

function sendHtml(res: VercelResponse, html: string, status = 200, headers: Record<string, string> = {}): void {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", status === 200 ? RENDER_CACHE : "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (status >= 300 && status < 400) {
    res.end();
    return;
  }
  res.send(html);
}

function breadcrumbJsonLd(items: { name: string; item?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.item ? { item: c.item } : {}),
    })),
  };
}

function collectionPageJsonLd(name: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: `${SITE}${path}`,
    isPartOf: { "@id": `${SITE}/#website` },
    publisher: { "@id": `${SITE}/#organization` },
  };
}

function headFor(opts: {
  title: string;
  description: string;
  canonical: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLdBlocks?: Record<string, unknown>[];
}): SeoHead {
  const ogImage = opts.ogImage || DEFAULT_IMAGE;
  return {
    title: opts.title,
    description: opts.description || DEFAULT_DESC,
    robots: opts.noindex ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    canonical: opts.canonical,
    ogType: opts.ogType || "website",
    ogImage,
    ogUrl: opts.canonical,
    jsonLdBlocks: opts.jsonLdBlocks,
    dropOgImageDimensions: ogImage !== DEFAULT_IMAGE,
  };
}

/** Title suffix rule — identical to the client's applyRouteSeo. */
function routeTitle(title: string, noindex: boolean): string {
  if (noindex) {
    return title.includes("PlayBeat") || title === "Page Not Found (404)" ? title : `${title} — PlayBeat Digital`;
  }
  return `${title} | PlayBeat Digital`;
}

// ---------------------------------------------------------------------------
// PRODUCT renderer
// ---------------------------------------------------------------------------

function productOffers(doc: any): Record<string, unknown> | null {
  // REAL prices only. Variants → AggregateOffer from the priced variants;
  // single-price products → Offer. Unpriced/draft products → NO offers at all
  // (never a fabricated or "placeholder" price).
  const currency = String(doc.currency || "PKR");
  const variants = Array.isArray(doc.variants) ? doc.variants : [];
  const priced = variants
    .map((v: any) => Number(v?.price))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .sort((a: number, b: number) => a - b);
  const productPrice = Number(doc.price);
  const availability = Number(doc.stock) === 0 || doc.status === "out_of_stock"
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";
  const slugPath = `/product/${doc.slug}`;
  const base = {
    availability,
    itemCondition: "https://schema.org/NewCondition",
    url: `${SITE}${slugPath}`,
    seller: { "@id": `${SITE}/#organization` },
  };
  if (priced.length >= 2) {
    return {
      "@type": "AggregateOffer",
      lowPrice: priced[0],
      highPrice: priced[priced.length - 1],
      offerCount: priced.length,
      priceCurrency: currency,
      ...base,
    };
  }
  if (priced.length === 1) {
    return { "@type": "Offer", price: priced[0], priceCurrency: currency, ...base };
  }
  if (Number.isFinite(productPrice) && productPrice > 0) {
    return {
      "@type": "Offer",
      price: productPrice,
      priceCurrency: currency,
      ...(doc.saleEndsAt && !isNaN(new Date(doc.saleEndsAt).getTime())
        ? { priceValidUntil: new Date(doc.saleEndsAt).toISOString().slice(0, 10) }
        : {}),
      ...base,
    };
  }
  return null;
}

function buildProductPage(doc: any): { status: number; html: string } {
  const seo = doc.seo && typeof doc.seo === "object" ? doc.seo : {};
  const name = String(doc.name || doc.title || "").trim() || "PlayBeat Product";
  const slug = doc.slug ? slugify(String(doc.slug)) : slugify(String(doc.sku || name));
  const slugPath = `/product/${slug}`;
  const isDraft = doc.active === false;
  const noindex = isDraft || seo.index === false;

  // title / description — same derivation the client product effect uses
  const rawTitle = String(seo.title || name);
  const title = routeTitle(rawTitle, noindex);
  const shortDescription = String(doc.shortDescription || "").trim() ||
    (() => {
      const t = stripHtmlToText(String(doc.description || ""));
      return t ? t.slice(0, 140) + (t.length > 140 ? "..." : "") : "";
    })();
  const metaDescription = (
    String(seo.description || "").trim() ||
    shortDescription ||
    stripHtmlToText(String(doc.description || "")).slice(0, 155) ||
    `${name} — instant delivery from PlayBeat Digital.`
  ).slice(0, 155);

  // og image — replicate the client rule exactly: absolute-URL product images
  // fall back to the default hero (the client cannot prefix http(s) URLs)
  const ogImageRaw = String(seo.ogImage || "").trim();
  const productImage = String(doc.image || doc.imageUrl || "").trim();
  const ogImageValue = ogImageRaw
    ? (/^https:\/\//.test(ogImageRaw) ? ogImageRaw : `${SITE}${ogImageRaw}`)
    : productImage.startsWith("http")
      ? DEFAULT_IMAGE
      : productImage
        ? `${SITE}${productImage}`
        : DEFAULT_IMAGE;

  // JSON-LD — Product (+ AggregateOffer when real variant prices exist)
  const images = [productImage, ...(Array.isArray(doc.gallery) ? doc.gallery : []), ...(Array.isArray(doc.galleryImages) ? doc.galleryImages : [])]
    .map((v: any) => absolutizeUrl(v))
    .filter((v): v is string => !!v);
  const uniqueImages = Array.from(new Set(images)).slice(0, 8);
  const brandName = doc.brand && String(doc.brand).trim() && doc.brand !== name ? String(doc.brand) : "PlayBeat Digital";
  const descForSchema = stripHtmlToText(String(doc.description || shortDescription || "")) ||
    `${name} — instant delivery from PlayBeat Digital.`;
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: descForSchema.slice(0, 5000),
    ...(uniqueImages.length ? { image: uniqueImages } : {}),
    ...(doc.sku ? { sku: String(doc.sku) } : {}),
    brand: { "@type": "Brand", name: brandName },
    itemCondition: "https://schema.org/NewCondition",
  };
  const offers = productOffers({ ...doc, slug });
  if (offers) productLd.offers = offers;
  const rating = Number(doc.rating || 0);
  const reviewCount = Number(doc.reviewCount || 0);
  if (rating > 0 && reviewCount > 0) {
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(Math.min(5, Math.max(0, rating))),
      reviewCount: String(Math.round(reviewCount)),
    };
  }

  // BreadcrumbList — same hierarchy the client writes (Home > Category > Product)
  const categoryName = String(doc.category || "").trim();
  const categorySlug = categoryName ? (categoryName === "Gift Cards" ? "gift-cards" : slugify(categoryName)) : "";
  const crumbs: { name: string; item?: string }[] = [{ name: "Home", item: `${SITE}/` }];
  if (categoryName && categorySlug) crumbs.push({ name: categoryName, item: `${SITE}/${categorySlug}` });
  crumbs.push({ name, item: `${SITE}${slugPath}` });

  const jsonLdBlocks: Record<string, unknown>[] = [productLd, breadcrumbJsonLd(crumbs)];
  if (!noindex) jsonLdBlocks.push(collectionPageJsonLd(rawTitle, metaDescription, slugPath));

  // ---- pre-mount content block ----
  const crumbItems: { name: string; href?: string }[] = [{ name: "Home", href: "/" }];
  const catHref = categoryName ? categoryHrefFor(categoryName) : null;
  if (categoryName) crumbItems.push(catHref ? { name: categoryName, href: catHref } : { name: categoryName });
  crumbItems.push({ name });
  const descHtml = descriptionToHtml(String(doc.detailedDescription || doc.description || ""));
  const parts: string[] = [
    crumbHtml(crumbItems),
    `<h1 ${H1_STYLE}>${escapeHtml(name)}</h1>`,
  ];
  const imgAbs = absolutizeUrl(productImage || (Array.isArray(doc.gallery) ? doc.gallery[0] : null));
  if (imgAbs) parts.push(`<img src="${escapeHtml(imgAbs)}" alt="${escapeHtml(name)}" ${IMG_STYLE}>`);
  if (shortDescription) parts.push(`<p ${P_STYLE}>${escapeHtml(shortDescription)}</p>`);
  if (descHtml) parts.push(`<div ${DESC_WRAP}>${descriptionLinksSafe(descHtml)}</div>`);
  const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;

  const head = headFor({
    title,
    description: metaDescription,
    canonical: /^https:\/\//.test(String(seo.canonicalUrl || "")) ? String(seo.canonicalUrl) : `${SITE}${slugPath}`,
    ogType: "product",
    ogImage: ogImageValue,
    noindex,
    jsonLdBlocks,
  });

  const html = injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml);
  return { status: 200, html };
}

// ---------------------------------------------------------------------------
// CATEGORY / SUBCATEGORY renderer
// ---------------------------------------------------------------------------

async function buildCategoryPage(slug: string, db: any, requestedPath: string): Promise<{ status: number; html: string } | null> {
  const preset = CATEGORY_PRESETS[slug];
  if (!preset) return null;

  // Real products only — active + published, matched with the same rules the
  // storefront applies for this route.
  const docs = await db
    .collection("products")
    .find({ active: { $ne: false }, consolidatedParentId: { $exists: false }, "seo.index": { $ne: false } })
    .limit(400)
    .toArray();
  const matched = docs.filter((p: any) => productMatchesRoute(slug, p));

  // canonical: the route's own URL. /category/:slug deep links consolidate to
  // the primary category route (same filtered content, one canonical).
  const canonicalPath = requestedPath.toLowerCase().startsWith("/category/") ? preset.path : preset.path;

  const crumbs: { name: string; item?: string }[] = [
    { name: "Home", item: `${SITE}/` },
    { name: preset.label, item: `${SITE}${canonicalPath}` },
  ];

  const title = routeTitle(preset.title, false);
  const jsonLdBlocks = [collectionPageJsonLd(preset.title, preset.description, canonicalPath), breadcrumbJsonLd(crumbs)];

  const parts: string[] = [
    crumbHtml([{ name: "Home", href: "/" }, { name: preset.label, href: canonicalPath }]),
    `<h1 ${H1_STYLE}>${escapeHtml(preset.label)}</h1>`,
    `<p ${P_STYLE}>${escapeHtml(preset.description)}</p>`,
  ];
  if (matched.length) {
    const items = matched
      .slice(0, 24)
      .map((p: any) => {
        const ps = p.slug ? slugify(String(p.slug)) : slugify(String(p.sku || p.name || ""));
        const price = Number(p.price) > 0 ? Number(p.price) : null;
        const vPrices = Array.isArray(p.variants)
          ? p.variants.map((v: any) => Number(v?.price)).filter((n: number) => Number.isFinite(n) && n > 0)
          : [];
        const from = vPrices.length ? Math.min(...vPrices) : price;
        const label = from ? ` — from Rs ${from.toLocaleString("en-PK")}` : "";
        return `<li><a href="/product/${escapeHtml(ps)}" ${DESC_LINK}>${escapeHtml(String(p.name || p.title || ""))}</a>${escapeHtml(label)}</li>`;
      })
      .join("");
    parts.push(`<h2 ${'style="color:#fff;font-size:18px;margin:6px 0 10px;font-weight:700"'}>${escapeHtml(`Browse ${matched.length} product${matched.length === 1 ? "" : "s"}`)}</h2>`);
    parts.push(`<ul ${LIST_STYLE}>${items}</ul>`);
    if (matched.length > 24) {
      parts.push(`<p ${P_STYLE}>…and ${matched.length - 24} more on the ${escapeHtml(preset.label)} page.</p>`);
    }
  }

  const head = headFor({
    title,
    description: preset.description,
    canonical: `${SITE}${canonicalPath}`,
    ogType: "website",
    jsonLdBlocks,
  });
  const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;
  const html = injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml);
  return { status: 200, html };
}

// ---------------------------------------------------------------------------
// STATIC PAGE renderer (About / Contact / Compare / Download)
// ---------------------------------------------------------------------------

function buildStaticPage(key: string): { status: number; html: string } {
  const preset = STATIC_PRESETS[key];
  const crumbs: { name: string; item?: string }[] = [
    { name: "Home", item: `${SITE}/` },
    { name: preset.label, item: `${SITE}${preset.path}` },
  ];
  const title = routeTitle(preset.title, false);
  const jsonLdBlocks = [collectionPageJsonLd(preset.title, preset.description, preset.path), breadcrumbJsonLd(crumbs)];
  const parts: string[] = [
    crumbHtml([{ name: "Home", href: "/" }, { name: preset.label, href: preset.path }]),
    `<h1 ${H1_STYLE}>${escapeHtml(preset.title)}</h1>`,
    `<p ${P_STYLE}>${escapeHtml(preset.description)}</p>`,
  ];
  const head = headFor({
    title,
    description: preset.description,
    canonical: `${SITE}${preset.path}`,
    ogType: "website",
    jsonLdBlocks,
  });
  const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;
  const html = injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml);
  return { status: 200, html };
}

// ---------------------------------------------------------------------------
// SERVICES (Business Solutions) renderer
// ---------------------------------------------------------------------------

// Mirrors the client ServicesPage seoFor() map.
const SERVICES_SUB_META: Record<string, { title: string; description: string; canonical: string; h1: string }> = {
  "/services": {
    title: "PlayBeat Digital — Websites, apps and SaaS with live demos",
    description: "Premium websites, apps, SaaS platforms, ecommerce systems and enterprise software, with interactive demos you can try before you order.",
    canonical: `${SITE}/services`,
    h1: "Business Solutions — Websites, apps and SaaS",
  },
  "/services/request": {
    title: "Request a Business Solution | PlayBeat Digital",
    description: "Request a custom website, business application, CRM system, e-commerce platform, automation or digital archive solution from PlayBeat Digital. Tell us about your project and get a structured plan.",
    canonical: `${SITE}/services/request`,
    h1: "Request a Business Solution",
  },
  "/services/portfolio": {
    title: "Business Solutions Portfolio | PlayBeat Digital",
    description: "Case studies from PlayBeat Digital: business websites, web applications, CRM systems, e-commerce platforms, automation and internal tools built around real business operations.",
    canonical: `${SITE}/services/portfolio`,
    h1: "Business Solutions Portfolio",
  },
  "/services/build": {
    title: "Build your project — PlayBeat Digital",
    description: "Choose a service, package and timeline — get an estimated range straight away and a formal proposal after we talk.",
    canonical: `${SITE}/services/build`,
    h1: "Build your project",
  },
  "/services/demos": {
    title: "Live demos — PlayBeat Digital",
    description: "Working examples across websites, SaaS, ecommerce, dashboards, mobile and brand.",
    canonical: `${SITE}/services/demos`,
    h1: "Live demos",
  },
  "/services/company": {
    title: "Company — PlayBeat Digital",
    description: "PlayBeat Digital is a product studio — websites, apps, SaaS platforms, ecommerce and brand systems.",
    canonical: `${SITE}/services/company`,
    h1: "Company",
  },
};

function buildServicesSubPage(pathKey: string): { status: number; html: string } {
  const meta = SERVICES_SUB_META[pathKey];
  const title = meta.title; // client emits these titles verbatim (suffix included)
  const head = headFor({
    title,
    description: meta.description,
    canonical: meta.canonical,
    ogType: "website",
  });
  const parts: string[] = [
    crumbHtml([
      { name: "Home", href: "/" },
      ...(pathKey !== "/services" ? [{ name: "Business Solutions", href: "/services" }] : []),
      { name: meta.h1 },
    ]),
    `<h1 ${H1_STYLE}>${escapeHtml(meta.h1)}</h1>`,
    `<p ${P_STYLE}>${escapeHtml(meta.description)}</p>`,
  ];
  const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;
  const html = injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml);
  return { status: 200, html };
}

async function buildServiceDetailPage(slug: string, db: any): Promise<{ status: number; html: string } | null> {
  let doc: any = null;
  try {
    doc = await db.collection("services").findOne({ slug, published: { $ne: false } });
  } catch {
    doc = null;
  }
  if (!doc) return null;
  const title = `${doc.seoTitle || doc.title} | PlayBeat Digital`;
  const description = String(doc.seoDescription || doc.shortDescription || doc.title || "");
  const canonical = `${SITE}/services/${doc.slug}`;

  // NOTE: no server-side Service/Breadcrumb JSON-LD here on purpose — the
  // client injects those with fresh <script> elements on mount; emitting the
  // same nodes server-side would create duplicates after hydration.
  const head = headFor({ title, description, canonical, ogType: "website" });
  const parts: string[] = [
    crumbHtml([{ name: "Home", href: "/" }, { name: "Business Solutions", href: "/services" }, { name: String(doc.title) }]),
    `<h1 ${H1_STYLE}>${escapeHtml(String(doc.title || ""))}</h1>`,
  ];
  const shortDesc = String(doc.shortDescription || "").trim();
  if (shortDesc) parts.push(`<p ${P_STYLE}>${escapeHtml(shortDesc)}</p>`);
  const descHtml = descriptionToHtml(String(doc.description || ""));
  if (descHtml) parts.push(`<div ${DESC_WRAP}>${descriptionLinksSafe(descHtml)}</div>`);
  const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;
  const html = injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml);
  return { status: 200, html };
}

function buildNotFoundPage(): { status: number; html: string } {
  // Same metadata the client's notfound preset applies (noindex), but with a
  // REAL 404 status so search engines never treat the URL as soft-404 content.
  const head = headFor({
    title: "Page Not Found (404)",
    description: "The page you are looking for does not exist.",
    canonical: `${SITE}/404`,
    noindex: true,
  });
  const parts: string[] = [
    `<h1 ${H1_STYLE}>Page Not Found (404)</h1>`,
    `<p ${P_STYLE}>The page you are looking for does not exist. <a href="/" ${DESC_LINK}>Go to the PlayBeat Digital homepage</a>.</p>`,
  ];
  const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;
  const html = injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml);
  return { status: 404, html };
}

// ---------------------------------------------------------------------------
// HOMEPAGE renderer — the shell IS the homepage metadata (title/canonical/
// OG are already homepage-correct), but the raw HTML carried zero visible
// text. Inject the storefront H1 + description + real category links so
// crawlers without JS see actual content (React replaces the block on mount).
// ---------------------------------------------------------------------------

function buildHomePage(): { status: number; html: string } {
  // Preferred: the full homepage shell produced at build time — it already
  // carries the static hero replica (in #hero-root), the announcement
  // snapshot script and the injected #root SEO content.
  if (typeof SEO_HOME_SHELL_HTML === "string" && SEO_HOME_SHELL_HTML.includes('<div id="root"')) {
    return { status: 200, html: SEO_HOME_SHELL_HTML };
  }
  const parts: string[] = [
    `<h1 ${H1_STYLE}>${escapeHtml("Premium Digital Marketplace & Smart Projectors")}</h1>`,
    `<p ${P_STYLE}>${escapeHtml(DEFAULT_DESC)}</p>`,
    `<h2 ${'style="color:#fff;font-size:18px;margin:6px 0 10px;font-weight:700"'}>Browse by category</h2>`,
    `<ul ${LIST_STYLE}>${Object.entries(CATEGORY_PRESETS)
      .map(([slug, p]) => `<li><a href="${escapeHtml(p.path)}" ${DESC_LINK}>${escapeHtml(p.label)}</a></li>`)
      .join("")}</ul>`,
  ];
  // no head injection needed — the built shell already IS the homepage head
  const html = injectRootContent(loadShellHtml(), `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`);
  return { status: 200, html };
}

// ---------------------------------------------------------------------------
// Entry — called from the /api/products handler when pbRender is present
// (vercel.json rewrites public routes here; the query param keeps the original
// path, because Vercel strips sub-path destinations on rewrites).
// ---------------------------------------------------------------------------

const PRIVATE_PREFIXES = ["/admin", "/account", "/checkout", "/order", "/invoice", "/crm", "/api", "/metacrm"];

// /{category}/:slug 2-segment URLs are product deep links (same as parseRoute)
const CATEGORY_SLUGS_FOR_PRODUCT_URLS = new Set([
  "streaming", "subscriptions", "gift-cards", "gaming", "software", "smart-projectors",
]);

export async function handlePbRender(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const q = (req.query || {}) as Record<string, string>;
    const pbPath = String(q.pbPath || "/").slice(0, 300);
    const path = decodeURIComponent(pbPath).toLowerCase().replace(/\/+$/, "") || "/";
    const segments = path.split("/").filter(Boolean);

    // Never render private/app areas — they keep their SPA shell + noindex headers
    if (PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      res.status(200);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(loadShellHtml());
      return;
    }

    const db = await getDb();

    // ---- homepage: inject H1 + content into the (already homepage-correct) shell ----
    if (path === "/" || path === "") {
      const page = buildHomePage();
      sendHtml(res, page.html, page.status);
      return;
    }

    // ---- /product/:slug (and legacy /{category}/:slug product deep links) ----
    let productSlug = "";
    if (path.startsWith("/product/") && segments.length >= 2) {
      productSlug = decodeURIComponent(segments.slice(1).join("/"));
    } else if (segments.length === 2 && CATEGORY_SLUGS_FOR_PRODUCT_URLS.has(segments[0])) {
      productSlug = decodeURIComponent(segments[1]);
    }

    if (productSlug) {
      const col = db.collection("products");
      let doc: any = null;
      const raw = productSlug;
      if (raw) doc = await col.findOne({ slug: raw });
      if (!doc) doc = await col.findOne({ slug: raw.toLowerCase() });
      if (!doc) doc = await col.findOne({ sku: raw });
      if (!doc) {
        // slug history → REAL 301 to the current canonical URL
        const relocated = await col.findOne({ slugHistory: raw }, { projection: { slug: 1 } });
        if (relocated?.slug) {
          res.status(301);
          res.setHeader("Location", `${SITE}/product/${relocated.slug}`);
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end();
          return;
        }
      }
      if (!doc) {
        const nf = buildNotFoundPage();
        sendHtml(res, nf.html, 404);
        return;
      }
      const page = buildProductPage(doc);
      sendHtml(res, page.html, page.status);
      return;
    }

    // ---- /category/:slug deep links ----
    if (segments.length === 2 && segments[0] === "category") {
      const slug = decodeURIComponent(segments[1]);
      if (CATEGORY_PRESETS[slug]) {
        const page = await buildCategoryPage(slug, db, path);
        if (page) return sendHtml(res, page.html, page.status);
      }
      const nf = buildNotFoundPage();
      sendHtml(res, nf.html, 404);
      return;
    }

    // ---- plain category / subcategory routes (1 segment) ----
    if (segments.length === 1 && CATEGORY_PRESETS[segments[0]]) {
      const page = await buildCategoryPage(segments[0], db, path);
      if (page) return sendHtml(res, page.html, page.status);
    }

    // ---- static pages ----
    if (segments.length === 1 && STATIC_PRESETS[segments[0]]) {
      const page = buildStaticPage(segments[0]);
      return sendHtml(res, page.html, page.status);
    }
    // /download/:path* renders the same app page (canonical consolidates to /download)
    if (segments[0] === "download" && STATIC_PRESETS.download) {
      const page = buildStaticPage("download");
      return sendHtml(res, page.html, page.status);
    }

    // ---- Business Solutions (/services/*) ----
    if (path === "/services" || path.startsWith("/services/")) {
      if (path === "/services") return sendHtml(res, buildServicesSubPage("/services").html, 200);
      if (segments.length === 2) {
        const sub = `/${segments.join("/")}`;
        if (SERVICES_SUB_META[sub]) return sendHtml(res, buildServicesSubPage(sub).html, 200);
        // /services/:slug — published service detail page
        const slug = decodeURIComponent(segments[1]);
        const detail = await buildServiceDetailPage(slug, db);
        if (detail) return sendHtml(res, detail.html, 200);
        const nf = buildNotFoundPage();
        return sendHtml(res, nf.html, 404);
      }
      if (segments.length === 3 && segments[1] === "package") {
        // engine-internal page — client seoFor() gives it a self canonical
        const meta = {
          title: "Business Solutions — PlayBeat Digital",
          description: "Premium websites, apps, SaaS platforms, ecommerce systems and enterprise software with live demos before you order.",
          canonical: `${SITE}/services/package/${decodeURIComponent(segments[2])}`,
          h1: "Business Solutions",
        };
        const head = headFor({ title: meta.title, description: meta.description, canonical: meta.canonical, ogType: "website" });
        const parts = [
          crumbHtml([{ name: "Home", href: "/" }, { name: "Business Solutions", href: "/services" }, { name: meta.h1 }]),
          `<h1 ${H1_STYLE}>${escapeHtml(meta.h1)}</h1>`,
          `<p ${P_STYLE}>${escapeHtml(meta.description)}</p>`,
        ];
        const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;
        return sendHtml(res, injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml), 200);
      }
      if (segments.length === 3 && segments[1] === "demo") {
        const meta = {
          title: "Live demo — PlayBeat Digital",
          description: "Interactive demo experiences you can try before you order.",
          canonical: `${SITE}/services/demo/${decodeURIComponent(segments[2])}`,
          h1: "Live demo",
        };
        const head = headFor({ title: meta.title, description: meta.description, canonical: meta.canonical, ogType: "website" });
        const parts = [
          crumbHtml([{ name: "Home", href: "/" }, { name: "Business Solutions", href: "/services" }, { name: meta.h1 }]),
          `<h1 ${H1_STYLE}>${escapeHtml(meta.h1)}</h1>`,
          `<p ${P_STYLE}>${escapeHtml(meta.description)}</p>`,
        ];
        const rootHtml = `<div ${BLOCK}><div ${INNER}>${parts.join("\n      ")}</div></div>`;
        return sendHtml(res, injectRootContent(applyHeadToShell(loadShellHtml(), head), rootHtml), 200);
      }
    }

    // ---- unknown route: real 404 + the SPA 404 experience ----
    const nf = buildNotFoundPage();
    sendHtml(res, nf.html, 404);
  } catch (err: any) {
    console.error("pbRender error:", err?.message);
    // Renderer failure must NEVER take the page down — fall back to the plain
    // shell (the SPA boots exactly as before this layer existed).
    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(loadShellHtml());
  }
}

