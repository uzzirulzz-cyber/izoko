// fix_original_prices.js — recompute originalPrice/compareAtPrice/discountPercent for all 178
// (fixes cheap items rounding to Rs 0 original price)
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
});
await client.connect();
const col = client.db('playbeat').collection('products');
const all = await col.find({ sku: /^PB-/ }).toArray();
console.log('products:', all.length);
const originalPriceOf = (price) => {
  const bump = Math.round(price * (price >= 2000 ? 1.15 : 1.18));
  if (price < 1000) return Math.ceil(bump / 50) * 50;
  return Math.round(bump / 500) * 500;
};
let n = 0;
for (const p of all) {
  const orig = originalPriceOf(p.price);
  const disc = Math.round(((orig - p.price) / orig) * 100);
  await col.updateOne({ _id: p._id }, { $set: { originalPrice: orig, compareAtPrice: orig, discountPercent: disc } });
  n++;
}
console.log('updated', n);
// spot check
const spot = await col.find({ sku: { $in: ['PB-STR-001', 'PB-STR-005', 'PB-GFT-001', 'PB-STU-005'] } }).project({ sku: 1, price: 1, originalPrice: 1, discountPercent: 1 }).toArray();
spot.forEach((s) => console.log(s.sku, 'price', s.price, 'orig', s.originalPrice, `-${s.discountPercent}%`));
await client.close();
