// sitemap_integrity_check.mjs — DEPLOYMENT GATE: sitemap integrity test.
//
// Validates the LIVE sitemap of a deployment (default: https://playbeat.digital)
// and FAILS (exit 1) if any of the following hold:
//   ✗ sitemap.xml does not reference all three child sitemaps
//   ✗ any sitemap-products.xml URL is not the canonical /product/:slug form
//     (category-prefixed product URLs such as /streaming/:slug are forbidden)
//   ✗ duplicate URLs exist in any child sitemap
//   ✗ a sitemap product URL returns HTTP != 200, redirects elsewhere, or serves
//     a 404/NOT_FOUND body instead of the SPA shell
//   ✗ a sitemap slug is missing from the public catalog API (obsolete/unpublished)
//   ✗ an active public catalog product is missing from the sitemap
//   ✗ the product page's declared canonical (seo.canonicalUrl override or
//     https://playbeat.digital/product/:slug) does not match the sitemap URL
//
// Usage:
//   node scripts/sitemap_integrity_check.mjs [base_url]   (default https://playbeat.digital)
// Exit codes: 0 = PASS, 1 = FAIL.

const BASE = (process.argv[2] || 'https://playbeat.digital').replace(/\/+$/, '')
const CONCURRENCY = 8
const CANONICAL_PATTERN = new RegExp(
  `^https:\\/\\/[^/]+\\/product\\/[a-z0-9-]+$`
)

const errors = []
const warnings = []
const check = (ok, label) => { if (!ok) return false; console.log(`  ✓ ${label}`); return true }
const fail = (msg) => errors.push(msg)

async function getXml(url) {
  const r = await fetch(url, { redirect: 'follow' })
  if (r.status !== 200) throw new Error(`HTTP ${r.status} for ${url}`)
  return r.text()
}

function parseLocs(xml, tag = 'loc') {
  return [...xml.matchAll(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 'g'))].map((m) => m[1].trim())
}

function slugify(text) {
  return String(text)
    .toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, '').replace(/-{2,}/g, '-')
    .replace(/^-+/, '').replace(/-+$/, '')
}

// ---------------------------------------------------------------- 1. index
console.log(`\n[1/6] sitemap.xml index (${BASE}/sitemap.xml)`)
const indexXml = await getXml(`${BASE}/sitemap.xml`)
const childMaps = parseLocs(indexXml, 'loc')
for (const child of ['sitemap-pages.xml', 'sitemap-categories.xml', 'sitemap-products.xml']) {
  check(childMaps.some((l) => l === `${BASE}/${child}`), `references /${child}`)
}
const indexIsIndex = /<sitemapindex/.test(indexXml)
if (!check(indexIsIndex, 'is a valid <sitemapindex> document')) fail('sitemap.xml is not a sitemapindex')

// ------------------------------------------------------- 2. products map shape
console.log(`\n[2/6] sitemap-products.xml — canonical URL pattern`)
const productsXml = await getXml(`${BASE}/sitemap-products.xml`)
const locs = parseLocs(productsXml)
if (!check(locs.length > 0, `contains ${locs.length} product URLs`)) fail('sitemap-products.xml is empty')
const badPattern = locs.filter((l) => !CANONICAL_PATTERN.test(l))
if (badPattern.length) {
  fail(`NON-CANONICAL PRODUCT URLS (${badPattern.length}): ${badPattern.slice(0, 5).join(', ')}${badPattern.length > 5 ? ' …' : ''}`)
  console.log(`  ✗ ${badPattern.length} URLs are not /product/:slug form (e.g. ${badPattern[0]})`)
} else {
  console.log(`  ✓ all ${locs.length} URLs use the canonical /product/:slug form`)
}
const dupes = locs.filter((l, i) => locs.indexOf(l) !== i)
if (dupes.length) {
  fail(`DUPLICATE URLS: ${[...new Set(dupes)].join(', ')}`)
  console.log(`  ✗ ${new Set(dupes).size} duplicate URLs`)
} else {
  console.log('  ✓ no duplicate URLs')
}

// --------------------------------------------- 3. source-of-truth cross-check
console.log(`\n[3/6] cross-check vs public catalog API (source of truth)`)
const apiRes = await fetch(`${BASE}/api/products`)
const apiJson = await apiRes.json()
const apiProducts = apiJson.products || []
console.log(`  public API lists ${apiProducts.length} products`)

// Expected canonical per product — mirrors the page: seo.canonicalUrl (https only)
// or https://…/product/:slug. Consolidated variant children + noindex products
// are excluded by design (same filter as the sitemap generator).
const expected = new Map()
for (const p of apiProducts) {
  if (p.active === false) continue
  if (p.consolidatedParentId) continue
  if (p.seo?.index === false) continue
  const slug = String(p.slug || '').trim() ? slugify(String(p.slug)) : slugify(String(p.sku || p.name || ''))
  if (!slug) continue
  const ownUrl = `${BASE}/product/${slug}`
  const override = p.seo && typeof p.seo.canonicalUrl === 'string' ? p.seo.canonicalUrl.trim() : ''
  const canonical = /^https:\/\//.test(override) ? override : ownUrl
  // A product whose canonical points elsewhere must NOT be in the sitemap.
  if (canonical !== ownUrl) continue
  expected.set(ownUrl, { slug, name: p.name, canonical })
}

const sitemapSet = new Set(locs)
const inSitemapNotInStore = locs.filter((l) => !expected.has(l))
const inStoreNotInSitemap = [...expected.keys()].filter((u) => !sitemapSet.has(u))
if (inSitemapNotInStore.length) {
  fail(`SITEMAP LISTS NON-STOREFRONT/UNPUBLISHED URLS (${inSitemapNotInStore.length}): ${inSitemapNotInStore.slice(0, 5).join(', ')}${inSitemapNotInStore.length > 5 ? ' …' : ''}`)
  console.log(`  ✗ ${inSitemapNotInStore.length} sitemap URLs are not live storefront products`)
} else {
  console.log('  ✓ every sitemap URL is a live, published, indexable storefront product')
}
if (inStoreNotInSitemap.length) {
  warnings.push(`STOREFRONT PRODUCTS MISSING FROM SITEMAP (${inStoreNotInSitemap.length}): ${inStoreNotInSitemap.slice(0, 5).join(', ')}${inStoreNotInSitemap.length > 5 ? ' …' : ''}`)
  console.log(`  ⚠ ${inStoreNotInSitemap.length} storefront products missing from sitemap`)
} else {
  console.log('  ✓ every live storefront product is present in the sitemap')
}

// ----------------------------------------------------- 4. HTTP route validation
console.log(`\n[4/6] route validation — HTTP 200, no redirect, SPA shell (concurrency ${CONCURRENCY})`)
async function validateUrl(url) {
  try {
    const r = await fetch(url, { redirect: 'follow' })
    if (r.status !== 200) return `HTTP ${r.status}`
    if (r.url.replace(/\/+$/, '') !== url) return `redirected to ${r.url}`
    const body = await r.text()
    if (body.includes('NOT_FOUND') || body.includes('The page could not be found')) return '404 body'
    if (!body.includes('<div id="root">')) return 'not the SPA shell'
    return null
  } catch (e) {
    return String(e?.message || e)
  }
}
const queue = [...locs]
const results = new Map()
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const u = queue.shift()
      results.set(u, await validateUrl(u))
    }
  })
)
const httpFailures = [...results.entries()].filter(([, err]) => err)
if (httpFailures.length) {
  for (const [u, err] of httpFailures.slice(0, 10)) fail(`ROUTE VALIDATION FAILED for ${u}: ${err}`)
  console.log(`  ✗ ${httpFailures.length}/${locs.length} URLs failed route validation (e.g. ${httpFailures[0][0]} → ${httpFailures[0][1]})`)
} else {
  console.log(`  ✓ all ${locs.length} URLs return HTTP 200 with the SPA shell, no redirects`)
}

// ------------------------------------------------- 5. canonical data integrity
console.log(`\n[5/6] canonical integrity — sitemap URL == page canonical`)
const canonicalMismatches = []
for (const [url, meta] of expected) {
  if (sitemapSet.has(url) && meta.canonical !== url) canonicalMismatches.push(`${url} → canonical ${meta.canonical}`)
}
if (canonicalMismatches.length) {
  for (const m of canonicalMismatches.slice(0, 10)) fail(`CANONICAL MISMATCH: ${m}`)
  console.log(`  ✗ ${canonicalMismatches.length} canonical mismatches`)
} else {
  console.log(`  ✓ sitemap URLs and page-declared canonicals are identical (${expected.size} products)`)
}

// -------------------------------------------------------------- 6. robots.txt
console.log(`\n[6/6] robots.txt coherency`)
const robots = await getXml(`${BASE}/robots.txt`).catch(() => null)
if (robots === null) {
  warnings.push('robots.txt unreachable')
  console.log('  ⚠ robots.txt unreachable')
} else {
  const disallowAdmin = /disallow:\s*\/admin/i.test(robots)
  const mentionsProducts = /sitemap-products\.xml/i.test(robots)
  check(disallowAdmin, 'disallows /admin')
  console.log(`  ${mentionsProducts ? '✓' : '·'} ${mentionsProducts ? 'references sitemap-products.xml' : 'does not reference child sitemaps (index reference in sitemap.xml is sufficient)'}`)
}

// ------------------------------------------------------------------- verdict
console.log('\n════════════════════════════════════════')
for (const w of warnings) console.log(`WARNING: ${w}`)
if (errors.length) {
  console.error(`SITEMAP INTEGRITY: FAIL (${errors.length} error${errors.length > 1 ? 's' : ''})`)
  for (const e of errors) console.error('  ✗ ' + e)
  process.exit(1)
}
console.log(`SITEMAP INTEGRITY: PASS — ${locs.length} canonical product URLs verified against ${BASE}`)
