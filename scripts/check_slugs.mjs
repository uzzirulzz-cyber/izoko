// check_slugs.mjs — verify every product in src/data/products.ts has a unique slug
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/data/products.ts', import.meta.url), 'utf8')

// Extract product blocks: id, sku, name, slug
const products = []
const re = /"id":\s*"([^"]+)"[\s\S]*?"slug":\s*"([^"]*)"/g
// Simpler: iterate objects by splitting on '"id":'
const blocks = src.split(/\{\s*"id":/).slice(1)
for (const b of blocks) {
  const rawId = (b.trim().match(/^"([^"]+)"/) || [])[1]
  if (!rawId || !/^pb-/i.test(rawId)) continue // skip variant blocks (v-PB-...)
  const id = rawId
  const sku = (b.match(/"sku":\s*"([^"]+)"/) || [])[1]
  const name = (b.match(/"name":\s*"([^"]+)"/) || [])[1]
  const slug = (b.match(/"slug":\s*"([^"]*)"/) || [])[1]
  products.push({ id, sku, name, slug })
}

console.log(`Total product blocks: ${products.length}`)

const seen = new Map()
let missing = 0
for (const p of products) {
  if (!p.slug || !p.slug.trim()) {
    console.log(`MISSING SLUG: ${p.id} ${p.name}`)
    missing++
    continue
  }
  if (seen.has(p.slug)) {
    console.log(`DUPLICATE SLUG "${p.slug}": ${p.id} (${p.name}) <-> ${seen.get(p.slug).id} (${seen.get(p.slug).name})`)
  } else {
    seen.set(p.slug, p)
  }
}

// also check dupes by slugified name (what the API would generate for slugless docs)
import { createHash } from 'node:crypto'
function slugify(t) {
  return String(t).toLowerCase().trim().replace(/\s+/g, '-').replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, '').replace(/-{2,}/g, '-').replace(/^-+/, '').replace(/-+$/, '')
}
const byName = new Map()
for (const p of products) {
  const s = slugify(p.name || p.sku)
  if (byName.has(s)) console.log(`NAME-COLLISION "${s}": ${p.id} <-> ${byName.get(s)}`)
  else byName.set(s, p.id)
}

console.log(`\nUnique slugs: ${seen.size} / ${products.length} · missing: ${missing}`)
if (missing === 0 && seen.size === products.length) console.log('✅ ALL SLUGS UNIQUE')
