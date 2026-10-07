// archive_test_products.js — find & deactivate leftover test products (my E2E artifacts)
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const uri = require("./_mongo_uri.cjs").MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000,
});
await client.connect();
const db = client.db('playbeat');
const products = db.collection('products');

const tests = await products.find({
  $or: [
    { name: /html editor test/i },
    { slug: /html-editor-test|html-final-001/i },
  ],
}).toArray();

for (const t of tests) {
  console.log(`found: "${t.name}" | slug=${t.slug} | active=${t.active} | cmsStatus=${t.cmsStatus || '—'} | _id=${t._id}`);
}

const r = await products.updateMany(
  { _id: { $in: tests.map((t) => t._id) }, name: /html editor test/i },
  { $set: { active: false, cmsStatus: 'archived', updatedAt: new Date() } }
);
console.log(`archived: ${r.modifiedCount}`);

// confirm none of them are active anymore
const stillActive = await products.countDocuments({ name: /html editor test/i, active: true });
console.log(`test products still active: ${stillActive}`);
await client.close();
