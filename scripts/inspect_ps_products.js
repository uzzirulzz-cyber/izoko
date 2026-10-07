// inspect_ps_products.js — find existing PlayStation/PS Plus products to match schema
import { MongoClient, ServerApiVersion } from 'mongodb';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const uri = require("./_mongo_uri.cjs").MONGODB_URI;
const DB_NAME = 'playbeat';

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
});
await client.connect();
const db = client.db(DB_NAME);
const products = await db.collection('products').find({}).toArray();
console.log(`Total products: ${products.length}`);

const ps = products.filter((p) =>
  /playstation|ps plus|psn/i.test(p.name || '') || /playstation|ps-plus/i.test(p.slug || '')
);
console.log(`PlayStation-related: ${ps.length}`);
for (const p of ps) {
  console.log('\n========================================');
  console.log(JSON.stringify({
    ...p,
    description: (p.description || '').slice(0, 200) + '...',
  }, null, 2));
}
await client.close();
