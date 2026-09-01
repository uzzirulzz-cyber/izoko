// dump_db_products.js — export current DB product (name, sku, image, gallery) to JSON
import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs';

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const DB_NAME = 'playbeat';

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
});
await client.connect();
const db = client.db(DB_NAME);
const products = await db.collection('products').find({}).toArray();
const out = products.map((p) => ({
  name: p.name,
  sku: p.sku,
  category: p.category,
  price: p.price,
  currency: p.currency || '',
  image: p.image,
  galleryImages: p.galleryImages || [],
}));
fs.writeFileSync('/home/z/my-project/scripts/db_products_dump.json', JSON.stringify(out, null, 2));
console.log(`Dumped ${out.length} products`);
const proj = out.filter((p) => (p.category || '').toLowerCase().includes('project'));
console.log(`Projectors: ${proj.length}`);
proj.forEach((p) => console.log(`- ${p.name} | ${p.image}`));
await client.close();
