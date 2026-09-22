#!/usr/bin/env node
// seo-test.mjs — automated pre/post-deployment SEO validation (audit §39/§40).
//
// Usage:  node scripts/seo-test.mjs [baseUrl]
//         default baseUrl = https://playbeat.digital
//
// Exits non-zero when any FAIL check triggers so CI (deploy.yml) can block.
// Run it against production after every deploy, or against a local preview:
//   npm run build && npx vite preview --port 4173 &
//   node scripts/seo-test.mjs http://localhost:4173
//
// NOTE: the storefront is a SPA — raw HTML carries the default head
// (title/canonical/OG/JSON-LD) and per-route tags are applied client-side.
// These tests therefore validate what a crawler FIRST sees (status codes,
// robots headers, sitemap truth) plus the canonical host hard guarantees.

const BASE = (process.argv[2] || 'https://playbeat.digital').replace(/\/+$/, '');
const HOST = new URL(BASE).host;
const SITE = `https://${HOST}`;
// Edge-dependent checks (real 404s, 301s, host redirects) only apply where
// vercel.json rules are active — i.e. NOT on a plain local vite preview.
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function fetchPage(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', ...opts });
  return res;
}

async function headOk(path, expect = 200) {
  const res = await fetchPage(path);
  return { res, ok: res.status === expect };
}

// ---------------------------------------------------------------------------
console.log(`\nSEO validation for ${BASE}\n`);

// 1. Homepage -----------------------------------------------------------------
{
  const res = await fetchPage('/');
  check('GET / returns 200', res.status === 200, `status ${res.status}`);
  const html = await res.text();
  check('homepage <title> present', /<title>[^<]+<\/title>/i.test(html));
  check('homepage canonical uses production host', /<link[^>]+rel="canonical"[^>]+href="https:\/\/playbeat\.digital\/"/i.test(html), html.match(/rel="canonical"[^>]*href="([^"]+)"/i)?.[1] || 'missing');
  check('homepage meta description present', /<meta[^>]+name="description"/i.test(html));
  check('homepage robots is indexable', /<meta[^>]+name="robots"[^>]+content="[^"]*index[^"]*"/i.test(html));
  check('homepage Open Graph tags present', /property="og:title"/i.test(html) && /property="og:image"/i.test(html));
  check('homepage JSON-LD present', /application\/ld\+json/i.test(html));
  check('homepage has no localhost refs', !/localhost|127\.0\.0\.1/.test(html));
  check('homepage canonical is not a preview domain', !/vercel\.app|vercel\.preview/i.test(html.match(/rel="canonical"[^>]*href="([^"]+)"/i)?.[1] || ''));
}

// 2. robots.txt ---------------------------------------------------------------
{
  const res = await fetchPage('/robots.txt');
  const body = await res.text();
  check('GET /robots.txt returns 200', res.status === 200, `status ${res.status}`);
  check('robots.txt declares sitemap', /Sitemap:\s*https:\/\/playbeat\.digital\/sitemap\.xml/i.test(body));
  check('robots.txt does not block the whole site', !/^Disallow:\s*\/\s*$/m.test(body));
  check('robots.txt disallows /admin', /Disallow:\s*\/admin/i.test(body));
  check('robots.txt disallows /api', /Disallow:\s*\/api/i.test(body));
  check('robots.txt disallows /checkout', /Disallow:\s*\/checkout/i.test(body));
}

// 3. Sitemap index --------------------------------------------------------------
let productUrls = [];
{
  const res = await fetchPage('/sitemap.xml');
  const xml = await res.text();
  check('GET /sitemap.xml returns 200', res.status === 200, `status ${res.status}`);
  check('sitemap.xml is a sitemapindex', /<sitemapindex/i.test(xml));
  check('sitemap.xml references child maps', /sitemap-(products|categories|pages)\.xml/i.test(xml));

  for (const child of ['sitemap-products.xml', 'sitemap-categories.xml', 'sitemap-pages.xml']) {
    const r = await fetchPage(`/${child}`);
    const body = await r.text();
    check(`GET /${child} returns 200`, r.status === 200, `status ${r.status}`);
    const isXml = /<urlset/i.test(body) && /<\/urlset>/i.test(body);
    check(`/${child} is valid urlset XML`, isXml);
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    check(`/${child} URLs all use https://playbeat.digital`, locs.every((u) => u.startsWith('https://playbeat.digital/')));
    check(`/${child} contains no admin/account/checkout/api URLs`, !locs.some((u) => /\/(admin|account|checkout|api|webhooks|order|invoice)\b/.test(u)));
    if (child === 'sitemap-products.xml') {
      productUrls = locs;
      check('product sitemap is populated', productUrls.length > 0, `${productUrls.length} URLs`);
    }
  }
}

// 4. Real public URLs return 200 --------------------------------------------------
if (productUrls.length) {
  const sample = productUrls.slice(0, 3);
  for (const u of sample) {
    const path = u.replace('https://playbeat.digital', '');
    const res = await fetchPage(path);
    check(`GET ${path} returns 200`, res.status === 200, `status ${res.status}`);
    const html = await res.text();
    check(`${path} serves indexable default head`, /<meta[^>]+name="robots"[^>]+content="[^"]*index[^"]*"/i.test(html));
    check(`${path} canonical on production host`, /rel="canonical"[^>]*href="https:\/\/playbeat\.digital\//i.test(html));
  }
}
for (const path of ['/streaming', '/gift-cards', '/about']) {
  const res = await fetchPage(path);
  check(`GET ${path} returns 200`, res.status === 200, `status ${res.status}`);
}

// 5. Genuine 404 for unknown URLs --------------------------------------------------
if (LOCAL) {
  console.log('  SKIP  real-404 check (edge rules inactive on local preview)');
} else {
  const res = await fetchPage(`/this-page-does-not-exist-${Date.now()}`);
  check('unknown URL returns a real 404 (no soft-404)', res.status === 404, `status ${res.status}`);
  if (res.status === 404) {
    const html = await res.text();
    check('404 page is noindex', /noindex/i.test(html));
  }
}

// 6. Private areas are excluded from indexing ---------------------------------------
for (const [path, name] of [['/admin', 'admin'], ['/account', 'account'], ['/checkout', 'checkout']]) {
  const res = await fetchPage(path);
  const xRobots = res.headers.get('x-robots-tag') || '';
  if (LOCAL) {
    console.log(`  SKIP  ${name} X-Robots-Tag header (edge rules inactive locally)`);
  } else {
    check(`${name} area sends X-Robots-Tag noindex`, /noindex/i.test(xRobots), xRobots || 'header missing');
  }
}

// 7. Admin API is auth-protected -----------------------------------------------------
{
  const res = await fetchPage('/api/admin/stats');
  check('GET /api/admin/stats without token is rejected', res.status === 401 || res.status === 403, `status ${res.status}`);
}

// 8. Host normalization (www → apex) --------------------------------------------------
if (LOCAL) {
  console.log('  SKIP  www host check (local run)');
} else {
  try {
    const res = await fetch(`https://www.${HOST.replace(/^www\./, '')}/`, { redirect: 'manual' });
    check('www host 301/308 redirects to apex', res.status === 301 || res.status === 308, `status ${res.status}`);
  } catch {
    console.log('  SKIP  www host check (DNS not resolvable from this runner)');
  }
}

// 9. Legacy duplicates redirect ---------------------------------------------------------
if (LOCAL) {
  console.log('  SKIP  legacy redirect checks (edge rules inactive locally)');
} else {
  const res = await fetchPage('/storefront');
  check('/storefront 301s to /', res.status === 301 || res.status === 308, `status ${res.status}`);
  const res2 = await fetchPage('/giftcards');
  check('/giftcards 301s to /gift-cards', res2.status === 301 || res2.status === 308, `status ${res2.status}`);
}

// 10. Slug-history 301 (when a renamed product exists) -----------------------------------
{
  const res = await fetchPage(`/api/products/definitely-not-a-real-slug-${Date.now()}`);
  check('unknown product API returns 404', res.status === 404, `status ${res.status}`);
}

// ---------------------------------------------------------------------------
console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
if (fail) {
  console.log('Failed checks:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
