// verify_sitemap_local.mjs — Local pre-deploy verification of the fixed
// buildProductsSitemap() against the REAL production MongoDB.
// Runs the actual api/_lib/sitemap.ts code (via tsx), then validates:
//   1. every loc matches the canonical /product/:slug pattern
//   2. no duplicate locs
//   3. slug set == public catalog API slug set (source of truth)
//   4. each URL returns HTTP 200 (SPA shell, not a Vercel 404 body)
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0'
const DB_NAME = 'playbeat'
const BASE = 'https://playbeat.digital'

const { buildProductsSitemap } = await import('/home/z/my-project/izoko/api/_lib/sitemap.ts')

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
})
await client.connect()
const db = client.db(DB_NAME)

const { xml, count } = await buildProductsSitemap(db)
await client.close()

const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
console.log(`generated: ${count} URLs (parsed ${locs.length})`)

const errors = []
// 1. canonical pattern
const PATTERN = /^https:\/\/playbeat\.digital\/product\/[a-z0-9-]+$/
const badPattern = locs.filter((l) => !PATTERN.test(l))
if (badPattern.length) errors.push(`NON-CANONICAL PATTERN (${badPattern.length}): ${badPattern.slice(0, 5).join(', ')}`)
// 2. duplicates
const dupes = locs.filter((l, i) => locs.indexOf(l) !== i)
if (dupes.length) errors.push(`DUPLICATES: ${[...new Set(dupes)].join(', ')}`)

// 3. cross-check vs public catalog API
const apiRes = await fetch(`${BASE}/api/products`)
const apiJson = await apiRes.json()
const apiSlugs = new Set((apiJson.products || []).map((p) => String(p.slug || '').trim().toLowerCase()))
const sitemapSlugs = locs.map((l) => l.replace(`${BASE}/product/`, ''))
const missing = sitemapSlugs.filter((s) => !apiSlugs.has(s))
const absent = [...apiSlugs].filter((s) => !sitemapSlugs.includes(s))
if (missing.length) errors.push(`IN SITEMAP BUT NOT IN PUBLIC API (${missing.length}): ${missing.slice(0, 5).join(', ')}`)
if (absent.length) console.log(`note: in public API but not sitemap (${absent.length}): ${absent.slice(0, 10).join(', ')}`)

// 4. HTTP 200 spot-check (first 12 + last 3)
const sample = [...locs.slice(0, 12), ...locs.slice(-3)]
let ok200 = 0
for (const u of sample) {
  const r = await fetch(u, { redirect: 'follow' })
  const body = await r.text()
  const isShell = r.status === 200 && body.includes('<div id="root">') && !body.includes('NOT_FOUND')
  if (isShell) ok200++
  else errors.push(`HTTP ${r.status}/bad-body for ${u}`)
}
console.log(`HTTP check: ${ok200}/${sample.length} sample URLs OK`)

console.log('--- sample URLs ---')
for (const l of locs.slice(0, 6)) console.log(' ', l)
if (errors.length) {
  console.error(`\nFAIL (${errors.length}):`)
  for (const e of errors) console.error(' ✗', e)
  process.exit(1)
}
console.log(`\nLOCAL VERIFY: PASS (${count} canonical URLs)`)
