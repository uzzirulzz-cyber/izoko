// ensure_unique_slugs.mjs — guarantee EVERY product in MongoDB has its own unique slug.
//  1. Backfills missing slugs (slugify(name), deduped with -2/-3 suffixes)
//  2. Resolves collisions between existing docs (shorter doc id keeps the base slug)
//  3. Creates a unique index on `slug` so future inserts can never collide
// Usage:
//   node scripts/ensure_unique_slugs.mjs --dry   # report only, no writes
//   node scripts/ensure_unique_slugs.mjs         # apply + create unique index
import { MongoClient, ServerApiVersion } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0'
const DB_NAME = 'playbeat'
const DRY = process.argv.includes('--dry')

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 80) || 'product'

const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true } })

try {
  await client.connect()
  const col = client.db(DB_NAME).collection('products')
  const docs = await col.find({}, { projection: { _id: 1, id: 1, sku: 1, name: 1, title: 1, slug: 1, active: 1 } }).toArray()
  console.log(`Loaded ${docs.length} product docs from ${DB_NAME}.products`)

  // Pass 1 — claim base slugs for docs that already have one; detect collisions
  const claimed = new Map() // slug -> first doc
  const updates = [] // { doc, slug }
  const collisions = []

  for (const d of docs) {
    const name = d.name || d.title || d.sku || 'product'
    if (d.slug && typeof d.slug === 'string' && d.slug.trim()) {
      const s = slugify(d.slug)
      if (claimed.has(s)) collisions.push({ doc: d, wanted: s, winner: claimed.get(s) })
      else claimed.set(s, d)
    } else {
      updates.push({ doc: d, base: slugify(name) })
    }
  }

  console.log(`Docs with slug: ${claimed.size} · missing slug: ${updates.length} · collisions: ${collisions.length}`)

  // Helper to pick the next free slug
  const taken = (s) => claimed.has(s)
  const nextFree = (base) => {
    if (!taken(base)) return base
    let n = 2
    while (taken(`${base}-${n}`)) n++
    return `${base}-${n}`
  }

  // Pass 2 — assign slugs to docs missing one
  const ops = []
  for (const u of updates) {
    const s = nextFree(u.base)
    claimed.set(s, u.doc)
    console.log(`  BACKFILL ${u.doc.sku || u.doc.id || u.doc._id} (${(u.doc.name || '').slice(0, 40)}) → "${s}"`)
    if (!DRY) ops.push({ updateOne: { filter: { _id: u.doc._id }, update: { $set: { slug: s } } } })
  }

  // Pass 3 — resolve collisions: later doc (by _id insertion) gets a suffix
  for (const c of collisions) {
    const s = nextFree(c.wanted)
    claimed.set(s, c.doc)
    console.log(`  COLLISION "${c.wanted}": ${c.doc.sku || c.doc._id} → "${s}" (kept by ${c.winner.sku || c.winner._id})`)
    if (!DRY) ops.push({ updateOne: { filter: { _id: c.doc._id }, update: { $set: { slug: s } } } })
  }

  if (!DRY && ops.length > 0) {
    const r = await col.bulkWrite(ops)
    console.log(`Applied ${ops.length} slug updates (matched ${r.matchedCount}, modified ${r.modifiedCount})`)
  }
  if (DRY) console.log('DRY RUN — no writes performed. Re-run without --dry to apply.')

  // Pass 4 — unique index (only when applying)
  if (!DRY) {
    try {
      const idxs = await col.indexes()
      const hasUnique = idxs.some((i) => i.unique && i.key && i.key.slug === 1)
      if (!hasUnique) {
        await col.createIndex({ slug: 1 }, { unique: true, name: 'uniq_slug_1' })
        console.log('Created unique index uniq_slug_1 on { slug: 1 }')
      } else {
        console.log('Unique index on slug already present')
      }
    } catch (e) {
      console.error('⚠️ Could not create unique index:', e.message)
    }
  }

  // Final verification
  const finalDocs = await col.find({}, { projection: { slug: 1 } }).toArray()
  const finalSet = new Set()
  let dupes = 0
  for (const d of finalDocs) {
    if (!d.slug) { console.log(`STILL MISSING: ${d._id}`); dupes++; continue }
    if (finalSet.has(d.slug)) { console.log(`STILL DUPLICATE: ${d.slug}`); dupes++ }
    finalSet.add(d.slug)
  }
  console.log(`\nFinal: ${finalDocs.length} docs · ${finalSet.size} unique slugs · problems: ${dupes}`)
  console.log(dupes === 0 ? '✅ EVERY PRODUCT HAS ITS OWN UNIQUE SLUG' : '❌ problems remain')
} finally {
  await client.close()
}
