// export_products_ts.mjs — regenerate src/data/products.ts from the LIVE
// consolidated MongoDB catalog so the bundled fallback + seed-if-empty match
// the server exactly. Rich metadata (descriptions/features/tags/brand) is
// preserved from the current bundled entries by SKU.
import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs';

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const TS_PATH = '/home/z/my-project/izoko/src/data/products.ts';

// ---- read current bundled raw entries (rich metadata source) ----
const ts = fs.readFileSync(TS_PATH, 'utf8');
const m = ts.match(/const RAW_PRODUCTS_CATALOG: any\[\] = (\[[\s\S]*?\n\]);?\n/);
if (!m) throw new Error('RAW_PRODUCTS_CATALOG block not found');
const bundled = new Map();
for (const r of eval(m[1])) bundled.set(String(r.sku).toUpperCase(), r);

// ---- read live consolidated catalog ----
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 20000, serverSelectionTimeoutMS: 20000,
});
await client.connect();
const db = client.db('playbeat');
const docs = await db.collection('products').find({ active: { $ne: false } }).sort({ sku: 1 }).toArray();
await client.close();
console.log(`Live active docs: ${docs.length}`);

const CAT_ORDER = ['Streaming', 'Subscriptions', 'Gift Cards', 'Gaming', 'Software', 'Smart Projectors'];
const catRank = (c) => { const i = CAT_ORDER.indexOf(c); return i === -1 ? 99 : i; };

const entries = docs
  .slice()
  .sort((a, b) => catRank(a.category) - catRank(b.category) || String(a.sku).localeCompare(String(b.sku)))
  .map((d) => {
    const b = bundled.get(String(d.sku || '').toUpperCase()) || {};
    const isParent = Array.isArray(d.variants) && d.variants.length > 0;
    const gallery = (Array.isArray(d.galleryImages) && d.galleryImages.length ? d.galleryImages : b.galleryImages) || (d.image ? [d.image] : []);

    const e = {
      id: d.id || String(d.sku || '').toLowerCase(),
      sku: d.sku,
      name: d.name,
      slug: d.slug || b.slug,
      category: d.category,
      description: d.description || b.description || '',
      price: Number(d.price) || 0,
      originalPrice: d.originalPrice ? Number(d.originalPrice) : b.originalPrice,
      currency: 'PKR',
      discountPercent: d.discountPercent ?? b.discountPercent ?? 0,
      image: d.image || b.image || '/assets/images/products/netflix.jpg',
      galleryImages: gallery,
      tags: (Array.isArray(d.tags) && d.tags.length ? d.tags : b.tags) || ['Instant', 'Official'],
      digital: d.digital !== undefined ? Boolean(d.digital) : b.digital !== false,
      productType: d.productType || (d.digital !== false ? 'digital' : 'physical'),
      stock: typeof d.stock === 'number' ? d.stock : 999,
      status: 'in_stock',
      active: true,
      rating: typeof d.rating === 'number' ? d.rating : 0,
      reviewCount: typeof d.reviewCount === 'number' ? d.reviewCount : 0,
      isFeatured: Boolean(d.isFeatured ?? b.isFeatured),
      isHot: Boolean(d.isHot ?? b.isHot),
      isFlashDeal: Boolean(d.isFlashDeal ?? b.isFlashDeal),
      deliveryType: d.deliveryType || b.deliveryType || 'Instant Auto-Email',
      deliveryInfo: d.deliveryInfo || b.deliveryInfo || 'Instant automated digital delivery with full warranty support.',
      region: d.region || b.region || 'Global',
      features: (Array.isArray(d.features) && d.features.length ? d.features : b.features) || [],
      brand: d.brand || b.brand,
      imageKey: b.imageKey,
    };
    if (!e.slug) delete e.slug; // let ensureProductSlug derive it

    if (isParent) {
      e.variants = d.variants.map(v => ({
        id: v.id, name: v.name, price: Number(v.price) || 0,
        ...(v.originalPrice ? { originalPrice: Number(v.originalPrice) } : {}),
        ...(v.sku ? { sku: v.sku } : {}),
        ...(v.badge ? { badge: v.badge } : {}),
      }));
      if (d.variantLabel) e.variantLabel = d.variantLabel;
      // parents show the full family SKU count in tags
      const vTag = `${d.variants.length} Options`;
      if (!e.tags.includes(vTag)) e.tags = [...e.tags.slice(0, 4), vTag];
    }
    if (d.projectorSpec) e.projectorSpec = d.projectorSpec;
    return e;
  });

const parents = entries.filter(e => e.variants).length;
const variantCount = entries.reduce((n, e) => n + (e.variants ? e.variants.length : 0), 0);
console.log(`Entries: ${entries.length} (${parents} parents covering ${variantCount} SKUs)`);

// ---- rebuild products.ts (preserve CATEGORIES_DATA + mapping blocks) ----
const catStart = ts.indexOf('export const CATEGORIES_DATA');
const rawStart = ts.indexOf('const RAW_PRODUCTS_CATALOG');
const mapStart = ts.indexOf('export const PRODUCTS_CATALOG');
if (catStart < 0 || rawStart < 0 || mapStart < 0) throw new Error('section markers not found');

const header = `// products.ts — AUTO-GENERATED from live consolidated catalog (CLSC file origin).
// ${entries.length} storefront products · ${parents} with variant dropdown selection covering ${variantCount} SKUs · 6 categories.
// Same product posted many times = posted ONCE with variants under the product dropdown.
// Real official web images in /assets/images/products/.
// Regenerate with: node scripts/export_products_ts.mjs
import { Product, CategoryMeta } from '../types'
import { ensureProductSlug } from '../lib/slug'

`;

const rawBlock = `const RAW_PRODUCTS_CATALOG: any[] = ${JSON.stringify(entries, null, 2)}\n\n`;
const mapBlock = ts.slice(mapStart).trimEnd() + '\n';

fs.writeFileSync(TS_PATH, header + ts.slice(catStart, rawStart).trimEnd() + '\n\n' + rawBlock + mapBlock);
console.log(`Wrote ${TS_PATH} (${Math.round(fs.statSync(TS_PATH).size / 1024)} KB)`);
