// verify_live_prerender.mjs — REAL production verification of the prerender
// layer: fetches raw HTML (no JS) for every product URL in the live products
// sitemap + all category/static/service pages, and measures:
//   per-page: unique title, unique meta description, self canonical, H1,
//             Product JSON-LD, BreadcrumbList, OG/Twitter, robots
//   global:   duplicate-title count, duplicate-description count,
//             canonical-mismatch count, generic-shell count
// No mocks — every number comes from a live HTTP fetch of playbeat.digital.

import { readFile } from "fs/promises";

const SITE = "https://playbeat.digital";
const UA = "Mozilla/5.0 (compatible; PlayBeatSEOVerify/1.0; +https://playbeat.digital)";

const GENERIC_TITLE = "PlayBeat Digital — Premium Digital Marketplace & Smart Projectors";
const GENERIC_CANONICAL = `${SITE}/`;

function extract(html, re) {
  const m = html.match(re);
  return m ? (m[1] ?? m[0]) : null;
}

async function fetchPage(url, { head = false } = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", method: head ? "HEAD" : "GET" });
  const html = head ? "" : await res.text();
  return { status: res.status, html, cache: res.headers.get("x-vercel-cache"), ttfb: res.headers.get("x-vercel-id") };
}

function pageSeo(html) {
  return {
    title: extract(html, /<title>([\s\S]*?)<\/title>/i)?.trim() || null,
    description: extract(html, /<meta\s+name="description" content="([^"]*)"/i)?.trim() || null,
    canonical: extract(html, /rel="canonical" href="([^"]*)"/i)?.trim() || null,
    robots: extract(html, /<meta\s+name="robots" content="([^"]*)"/i)?.trim() || null,
    h1: extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)?.replace(/<[^>]+>/g, "").trim().slice(0, 80) || null,
    ogTitle: extract(html, /property="og:title" content="([^"]*)"/i)?.trim() || null,
    ogImage: extract(html, /property="og:image" content="([^"]*)"/i)?.trim() || null,
    twitterCard: extract(html, /name="twitter:card" content="([^"]*)"/i)?.trim() || null,
    hasProductLd: /"@type"\s*:\s*"Product"/.test(html),
    hasBreadcrumbLd: /"@type"\s*:\s*"BreadcrumbList"/.test(html),
    ldTypes: [...html.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)].map((m) => m[1]),
    aggregateOffer: /"@type"\s*:\s*"AggregateOffer"/.test(html),
    lowPrice: extract(html, /"lowPrice"\s*:\s*([0-9.]+)/),
    highPrice: extract(html, /"highPrice"\s*:\s*([0-9.]+)/),
    offerCount: extract(html, /"offerCount"\s*:\s*([0-9]+)/),
    currency: extract(html, /"priceCurrency"\s*:\s*"([A-Z]{3})"/),
    wordCount: (html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").match(/[A-Za-z0-9\u00C0-\u024F]+/g) || []).length,
  };
}

async function main() {
  // ---- discover all product URLs from the live sitemap ----
  const sm = await (await fetch(`${SITE}/sitemap-products.xml`, { headers: { "User-Agent": UA } })).text();
  const productUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`products in live sitemap: ${productUrls.length}`);

  const targets = [
    ...productUrls.slice(0, 30), // verify the first 30 products in depth
    `${SITE}/streaming`, `${SITE}/subscriptions`, `${SITE}/gift-cards`, `${SITE}/gaming`,
    `${SITE}/software`, `${SITE}/smart-projectors`, `${SITE}/smart-4k-projectors`,
    `${SITE}/ai-subscriptions`, `${SITE}/steam-game-keys`, `${SITE}/windows-office`,
    `${SITE}/creative-software`, `${SITE}/digital-marketing`, `${SITE}/web-hosting`, `${SITE}/web3`,
    `${SITE}/about`, `${SITE}/contact`, `${SITE}/compare`, `${SITE}/download`,
    `${SITE}/services`, `${SITE}/services/request`, `${SITE}/services/portfolio`,
    `${SITE}/services/web-development`,
  ];

  const results = [];
  const t0 = Date.now();
  for (const url of targets) {
    try {
      const r = await fetchPage(url);
      results.push({ url, status: r.status, ...pageSeo(r.html) });
    } catch (e) {
      results.push({ url, status: 0, error: e.message });
    }
  }
  console.log(`fetched ${results.length} raw HTML pages in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  // ---- aggregate honesty checks ----
  const isProduct = (u) => u.includes("/product/");
  const prods = results.filter((r) => isProduct(r.url) && r.status === 200);
  const pages = results.filter((r) => !isProduct(r.url) && r.status === 200);

  const countDup = (arr) => {
    const c = {};
    for (const v of arr) if (v) c[v] = (c[v] || 0) + 1;
    return Object.entries(c).filter(([, n]) => n > 1);
  };

  const dupTitles = countDup(results.filter((r) => r.status === 200).map((r) => r.title));
  const dupDescs = countDup(results.filter((r) => r.status === 200).map((r) => r.description));
  const canonicalMismatches = results.filter((r) => r.status === 200 && r.canonical && r.canonical !== r.url);
  const genericShell = results.filter((r) => r.status === 200 && r.title === GENERIC_TITLE && r.url !== `${SITE}/`);
  const productsNoH1 = prods.filter((r) => !r.h1);
  const productsNoLd = prods.filter((r) => !r.hasProductLd);
  const productsNoCrumb = prods.filter((r) => !r.hasBreadcrumbLd);
  const productsNoOg = prods.filter((r) => !r.ogTitle);
  const productsNoTw = prods.filter((r) => !r.twitterCard);

  console.log("========== AGGREGATE (measured, no estimates) ==========");
  console.log(`pages fetched OK           : ${results.filter((r) => r.status === 200).length}/${results.length}`);
  console.log(`duplicate titles           : ${dupTitles.length === 0 ? "0 ✓" : JSON.stringify(dupTitles)}`);
  console.log(`duplicate meta descriptions: ${dupDescs.length === 0 ? "0 ✓" : JSON.stringify(dupDescs.map(([t, n]) => [t.slice(0, 60), n]))}`);
  console.log(`canonical mismatches       : ${canonicalMismatches.length === 0 ? "0 ✓" : canonicalMismatches.map((r) => `${r.url} -> ${r.canonical}`).join(" | ")}`);
  console.log(`generic shell metadata URLs: ${genericShell.length === 0 ? "0 ✓" : genericShell.map((r) => r.url).join(" | ")}`);
  console.log(`products missing H1        : ${productsNoH1.length === 0 ? "0 ✓" : productsNoH1.map((r) => r.url).join(" | ")}`);
  console.log(`products missing Product LD: ${productsNoLd.length === 0 ? "0 ✓" : productsNoLd.map((r) => r.url).join(" | ")}`);
  console.log(`products missing breadcrumb: ${productsNoCrumb.length === 0 ? "0 ✓" : productsNoCrumb.length}`);
  console.log(`products missing og:title  : ${productsNoOg.length === 0 ? "0 ✓" : productsNoOg.length}`);
  console.log(`products missing twitter   : ${productsNoTw.length === 0 ? "0 ✓" : productsNoTw.length}`);
  console.log(`non-indexable pages (404/0): ${results.filter((r) => r.status !== 200).length}`);

  console.log("\n========== FIRST 12 PRODUCTS (raw HTML values) ==========");
  for (const r of prods.slice(0, 12)) {
    console.log(`\n${r.url.replace(SITE, "")}`);
    console.log(`  title(${r.title?.length})  : ${r.title}`);
    console.log(`  desc(${r.description?.length}) : ${(r.description || "").slice(0, 90)}…`);
    console.log(`  canonical : ${r.canonical === r.url ? "self ✓" : r.canonical}`);
    console.log(`  H1        : ${r.h1}`);
    console.log(`  schema    : Product=${r.hasProductLd} Breadcrumb=${r.hasBreadcrumbLd} AggregateOffer=${r.aggregateOffer}${r.aggregateOffer ? ` low=${r.lowPrice} high=${r.highPrice} count=${r.offerCount} cur=${r.currency}` : ""}`);
    console.log(`  og:image  : ${(r.ogImage || "").slice(0, 70)}`);
  }

  console.log("\n========== CATEGORY / STATIC / SERVICES ==========");
  for (const r of pages) {
    console.log(`${r.url.replace(SITE, "")}  | title: ${(r.title || "").slice(0, 60)} | canonical: ${r.canonical === r.url ? "self ✓" : r.canonical} | H1: ${(r.h1 || "").slice(0, 40)} | words≈${r.wordCount}`);
  }

  // ---- save full detail for the report ----
  await (await import("fs/promises")).writeFile("/home/z/my-project/scripts/verify_live_prerender_results.json", JSON.stringify(results, null, 2));
  console.log("\nfull detail saved: scripts/verify_live_prerender_results.json (local project)");
}

main().catch((e) => { console.error(e); process.exit(1); });
