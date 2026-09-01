// fix_gift_variant_names.mjs — strip redundant "Gift Card" from variant names
import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 20000, serverSelectionTimeoutMS: 20000,
});
await client.connect();
const col = client.db('playbeat').collection('products');
const parents = await col.find({ variants: { $exists: true, $ne: [] } }).toArray();
for (const p of parents) {
  let changed = false;
  const variants = p.variants.map(v => {
    const clean = v.name.replace(/^Gift Card\s+/i, '').trim();
    if (clean !== v.name) { changed = true; return { ...v, name: clean }; }
    return v;
  });
  if (changed) {
    await col.updateOne({ _id: p._id }, { $set: { variants, updatedAt: new Date() } });
    console.log(`fixed: ${p.name} -> ${variants.map(v => v.name).slice(0, 4).join(' | ')}`);
  }
}
await client.close();
console.log('DONE');
