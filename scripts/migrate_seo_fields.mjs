#!/usr/bin/env node
// migrate_seo_fields.mjs — one-time SEO schema backfill (audit §44).
// Non-destructive: only ADDS missing fields/indexes, never overwrites data.
//
//  1. Ensure lookup indexes: products.slugHistory (redirect resolution)
//  2. Backfill slugHistory: [] on products missing the field
//  3. Backfill slugs for active products missing one (slugify(name), collision-safe)
//
// Usage: MONGODB_URI=... node scripts/migrate_seo_fields.mjs

import 'dotenv/config'

const MONGODB_URI = process.env.MONGODB_URI || ''
if (!MONGODB_URI) {
  console.error('MONGODB_URI required')
  process.exit(1)
}

function slugify(text) {
  return String(text)
    .toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

const { MongoClient, ServerApiVersion } = await import('mongodb')
const client = new MongoClient(MONGODB_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 8000,
  serverSelectionTimeoutMS: 8000,
})

try {
  await client.connect()
  const db = client.db(process.env.MONGODB_DB_NAME || 'playbeat')
  const products = db.collection('products')

  // 1. Indexes (idempotent)
  await products.createIndex({ slugHistory: 1 })
  console.log('index slugHistory: ok')

  // 2. slugHistory backfill
  const r1 = await products.updateMany({ slugHistory: { $exists: false } }, { $set: { slugHistory: [] } })
  console.log(`slugHistory backfilled on ${r1.modifiedCount} products`)

  // 3. Slug backfill for active products missing a slug (collision-safe)
  const missing = await products
    .find({ active: { $ne: false }, $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }] })
    .project({ name: 1, title: 1, sku: 1 })
    .toArray()
  const existing = new Set(
    (await products.find({}, { projection: { slug: 1 } }).toArray()).map((d) => String(d.slug || '').toLowerCase())
  )
  let fixed = 0
  for (const doc of missing) {
    const base = slugify(doc.name || doc.title || doc.sku || `product-${doc._id}`)
    if (!base) continue
    let slug = base
    let n = 2
    while (existing.has(slug)) slug = `${base}-${n++}`
    await products.updateOne({ _id: doc._id }, { $set: { slug } })
    existing.add(slug)
    fixed++
    console.log(`  slug set: ${doc.sku || doc._id} → ${slug}`)
  }
  console.log(`slugs backfilled: ${fixed}`)

  const total = await products.countDocuments({})
  const active = await products.countDocuments({ active: { $ne: false } })
  console.log(`done — catalog: ${total} products (${active} active)`)
  process.exit(0)
} catch (err) {
  console.error('migration failed:', err?.message || err)
  process.exit(1)
} finally {
  await client.close().catch(() => {})
}
