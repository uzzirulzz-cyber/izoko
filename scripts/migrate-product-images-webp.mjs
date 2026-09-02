// migrate-product-images-webp.mjs
// One-off migration: rewrite image paths in the MongoDB `products` collection
// from /assets/images/products/*.{jpg,jpeg,png} to .webp (files on disk were
// converted to WebP and originals removed). Idempotent — skips .webp values.
// Usage: node scripts/migrate-product-images-webp.mjs [--dry]
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0";
const DB_NAME = process.env.MONGODB_DB_NAME || "playbeat";
const DRY = process.argv.includes("--dry");

const EXT_RE = /\.(jpg|jpeg|png)(?=\?|$)/i;

function toWebp(v) {
  if (typeof v !== "string") return v;
  if (!v.includes("/assets/images/products/")) return v;
  return v.replace(EXT_RE, ".webp");
}

function transformDoc(doc) {
  const set = {};
  const push = (k, before, after) => {
    if (before !== after) set[k] = after;
  };

  ["image", "imageUrl"].forEach((k) => {
    if (typeof doc[k] === "string") push(k, doc[k], toWebp(doc[k]));
  });
  ["gallery", "galleryImages", "additionalImages"].forEach((k) => {
    if (Array.isArray(doc[k])) {
      const next = doc[k].map(toWebp);
      if (JSON.stringify(next) !== JSON.stringify(doc[k])) set[k] = next;
    }
  });
  if (Array.isArray(doc.variants)) {
    let changed = false;
    const variants = doc.variants.map((v) => {
      if (typeof v?.image === "string") {
        const next = toWebp(v.image);
        if (next !== v.image) changed = true;
        return { ...v, image: next };
      }
      return v;
    });
    if (changed) set.variants = variants;
  }
  return set;
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const col = client.db(DB_NAME).collection("products");

const docs = await col
  .find({
    $or: [
      { image: EXT_RE },
      { imageUrl: EXT_RE },
      { gallery: EXT_RE },
      { galleryImages: EXT_RE },
      { additionalImages: EXT_RE },
      { "variants.image": EXT_RE },
    ],
  })
  .toArray();

console.log(`docs needing migration: ${docs.length}${DRY ? " (dry run)" : ""}`);

let updated = 0;
for (const doc of docs) {
  const set = transformDoc(doc);
  if (!Object.keys(set).length) continue;
  if (!DRY) {
    await col.updateOne({ _id: doc._id }, { $set: set });
  }
  updated++;
  if (updated <= 3) {
    console.log(`  sample ${doc.id || doc._id}: ${Object.keys(set).join(", ")}`);
  }
}
console.log(`${DRY ? "[dry] would update" : "updated"}: ${updated} products`);
await client.close();
