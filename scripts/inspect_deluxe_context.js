// inspect_deluxe_context.js — check variantLabel, test product, media collection, sku pattern
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const DB_NAME = 'playbeat';

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
});
await client.connect();
const db = client.db(DB_NAME);
const products = db.collection('products');

// 1. variantLabel on Essential/Extra
const siblings = await products.find({ slug: { $in: ['playstation-plus-essential-1-month-global', 'playstation-plus-extra-1-month-global-shared-private-account'] } }).toArray();
for (const p of siblings) {
  console.log(`${p.name}`);
  console.log(`  sku=${p.sku} variantLabel=${JSON.stringify(p.variantLabel)} id-field=${JSON.stringify(p.id)} category=${p.category} subcategory=${p.subcategory}`);
  console.log(`  variants=${JSON.stringify(p.variants?.map(v => ({ name: v.name, price: v.price, sku: v.sku, badge: v.badge, id: v.id })))}`);
  console.log(`  deliveryInfo=${JSON.stringify(p.deliveryInfo)} deliveryEstimate=${JSON.stringify(p.deliveryEstimate)} originalPrice=${p.originalPrice} compareAtPrice=${p.compareAtPrice}`);
}

// 2. test product from E2E work
const test = await products.find({ name: /HTML Editor Final Test/i }).toArray();
console.log(`\nTest products: ${test.length}`);
for (const t of test) {
  console.log(`  - ${t.name} | slug=${t.slug} | active=${t.active} | cmsStatus=${t.cmsStatus} | _id=${t._id}`);
}

// 3. sku number pattern — find max PB-XXXXXX
const all = await products.find({}, { projection: { sku: 1 } }).toArray();
const nums = all.map(p => parseInt((p.sku || '').replace(/^PB-/, ''), 10)).filter(n => !isNaN(n));
console.log(`\nMax PB- numeric sku: ${Math.max(...nums)}`);

// 4. slug collision check
const dupe = await products.findOne({ slug: 'playstation-plus-deluxe-1-month-global' });
console.log(`Slug 'playstation-plus-deluxe-1-month-global' exists: ${!!dupe}`);
const dupe2 = await products.findOne({ slug: { $regex: /playstation-plus-deluxe/i } });
console.log(`Any deluxe slug: ${dupe2 ? dupe2.slug : 'none'}`);

// 5. media collection / GridFS check
const cols = await db.listCollections().toArray();
console.log(`\nCollections: ${cols.map(c => c.name).join(', ')}`);
const mediaCount = await db.collection('media').countDocuments().catch(() => 'N/A');
console.log(`media collection count: ${mediaCount}`);
if (mediaCount !== 'N/A') {
  const sample = await db.collection('media').find({}, { projection: {} }).limit(2).toArray();
  for (const m of sample) {
    console.log(`media doc keys: ${Object.keys(m).join(',')}`);
    console.log(`  filename=${m.filename} contentType=${m.contentType} size=${m.size || m.length}`);
  }
}

await client.close();
