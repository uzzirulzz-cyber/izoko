// inspect_deluxe_existing.js — check existing deluxe product + media storage
import { MongoClient, ServerApiVersion } from 'mongodb';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const uri = require("./_mongo_uri.cjs").MONGODB_URI;
const DB_NAME = 'playbeat';

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000,
});
await client.connect();
const db = client.db(DB_NAME);
const products = db.collection('products');

const old = await products.findOne({ slug: 'playstation-plus-deluxe-1-month-global-shared-and-private-account' });
if (old) {
  const { description, detailedDescription, ...rest } = old;
  console.log('EXISTING DELUXE PRODUCT:');
  console.log(JSON.stringify({ ...rest, description: (description||'').slice(0,150), detailedDescription: (detailedDescription||'').slice(0,150) }, null, 2));
}

// media_assets / media_files / product_images sample
for (const col of ['media_assets', 'media_files', 'product_images']) {
  const c = db.collection(col);
  const cnt = await c.countDocuments();
  console.log(`\n${col}: ${cnt} docs`);
  const s = await c.find({}).limit(2).toArray();
  for (const m of s) {
    const keys = Object.keys(m);
    console.log(`  keys: ${keys.join(',')}`);
    const binKey = keys.find(k => m[k] && typeof m[k] === 'object' && (m[k]._bson_type || m[k].buffer || m[k] instanceof Uint8Array));
    for (const k of keys.slice(0, 12)) {
      const v = m[k];
      if (v instanceof Date) console.log(`  ${k}: ${v.toISOString()}`);
      else if (typeof v === 'string' && v.length < 120) console.log(`  ${k}: ${v}`);
      else if (typeof v === 'number' || typeof v === 'boolean') console.log(`  ${k}: ${v}`);
      else if (v && v._bsontype) console.log(`  ${k}: <${v._bsontype}>`);
    }
  }
}
await client.close();
