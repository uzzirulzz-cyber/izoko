// import_catalog.js — REPLACE the live catalog with the 178 products from
// Playbeat_Combined_Catalog.xlsx (CLSC file). Deletes ALL existing products
// (a restore point was created beforehand), then inserts the new catalog.
import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs';

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const DB_NAME = 'playbeat';
const catalog = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/catalog_new.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/image_manifest.json', 'utf8'));

// mirror of gen_products_ts.js transformation (kept in sync)
const projDesc = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/db_projector_desc.json', 'utf8'));
const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const round500 = (n) => Math.round(n / 500) * 500;
const originalPriceOf = (price) => {
  const bump = Math.round(price * (price >= 2000 ? 1.15 : 1.18));
  if (price < 1000) return Math.ceil(bump / 50) * 50;
  return Math.round(bump / 500) * 500;
}
const discountOf = (price, orig) => Math.round(((orig - price) / orig) * 100);

function detectRegion(name) {
  const n = name.toLowerCase();
  if (n.includes('pakistan')) return 'Pakistan';
  if (n.includes('usa') || /\bus\b/.test(n) || n.includes('united states')) return 'USA';
  if (n.includes('europe') || n.includes('france') || n.includes('netherlands')) return 'Europe';
  if (n.includes('uk')) return 'UK';
  if (n.includes('japan')) return 'Japan';
  if (n.includes('india')) return 'Asia';
  if (n.includes('australia')) return 'Australia';
  return 'Global';
}
function detectDuration(name) {
  const m = name.match(/(\d+)\s*(month|year|week)s?\b/i);
  if (m) return `${m[1]} ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}${m[1] === '1' ? '' : 's'}`;
  return '';
}
const isPrivate = (n) => /full private|private/i.test(n);
const isShared = (n) => /shared/i.test(n);
const isOwnEmail = (n) => /own email/i.test(n);

function projectorSpecFor(name) {
  const db = projDesc.find((p) => {
    const a = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!a || !b) return false;
    if (b.includes(a) || a.includes(b)) return true;
    const model = name.split(/[\s+]/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return model.length > 3 && b.includes(model);
  });
  if (!db) return undefined;
  const d = db.description || '';
  const spec = {};
  const res = d.match(/(\d{3,4}x\d{3,4}P?)\s*Native/i);
  if (res) spec.nativeResolution = res[1] + ' Native';
  const ansi = d.match(/(\d+)\s*ANSI/i);
  if (ansi) spec.brightnessAnsi = parseInt(ansi[1], 10);
  const os = d.match(/(Android\s*[\d.]*)/i);
  if (os) spec.os = os[1].replace(/\s+/g, ' ').trim();
  const wifi = d.match(/(WiFi\s*6?)/i);
  if (wifi) spec.wifi = wifi[1].replace(/\s+/g, ' ').trim();
  const special = [];
  if (/4K/i.test(d)) special.push('4K Decoding');
  if (/8K/i.test(d)) special.push('8K Decoding');
  if (/Netflix/i.test(d) || /NTV/i.test(name)) special.push('Netflix Licensed');
  if (special.length) spec.specialFeatures = special;
  return Object.keys(spec).length ? spec : undefined;
}
function projectorDescription(name) {
  const db = projDesc.find((p) => {
    const a = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!a || !b) return false;
    if (b.includes(a) || a.includes(b)) return true;
    const model = name.split(/[\s+]/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return model.length > 3 && b.includes(model);
  });
  const d = db ? (db.description || '') : '';
  const cleanName = name.replace(/^Magcubic\s+/i, '').replace(/^Zerobyte\s+/i, '').replace(/^Hongtop\s+/i, 'Hongtop ').trim();
  const base = `PlayBeat ${cleanName} smart projector — genuine ${/F18|HY320PRO|HY310|HY350|HCS350/i.test(name) ? '1080P Full HD' : '720P HD-ready'} LED projection with smart TV experience, screen mirroring and HDMI/USB connectivity. Backed by PlayBeat hardware warranty and local support.`;
  if (!d) return base;
  const specs = d.split(',').slice(0, 3).join(' · ').replace(/·\s*-\s*ANSI Lumens/g, '').trim();
  return `${cleanName} smart projector — ${specs}. ${/Netflix/i.test(d) || /NTV/i.test(name) ? 'Official Netflix-licensed model with built-in apps. ' : ''}Includes remote, power adapter and full PlayBeat warranty with local after-sales support.`;
}
function projectorFeatures(name) {
  const f = [];
  const spec = projectorSpecFor(name);
  if (spec) {
    if (spec.nativeResolution) f.push(spec.nativeResolution);
    if (spec.brightnessAnsi) f.push(`${spec.brightnessAnsi} ANSI lumens`);
    if (spec.os) f.push(spec.os);
    if (spec.wifi) f.push(spec.wifi + ' wireless');
    if (spec.specialFeatures) f.push(...spec.specialFeatures);
  }
  if (!f.length) f.push('Smart LED projection', 'Screen mirroring', 'HDMI + USB');
  f.push('1-year PlayBeat hardware warranty');
  return f;
}

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 20000,
  serverSelectionTimeoutMS: 20000,
});
await client.connect();
const db = client.db(DB_NAME);
const col = db.collection('products');

const before = await col.countDocuments({});
console.log(`Products before: ${before}`);

// 1) DELETE ALL
const del = await col.deleteMany({});
console.log(`Deleted: ${del.deletedCount}`);

// 2) INSERT 178 (docs imported straight from the generated products.ts logic)
const { execSync } = await import('child_process');
// Import the transformation by reading generated products.ts is complex — replicate minimal doc shape:
const catalogDocs = catalog.map((p) => {
  const isProj = p.category === 'Smart Projectors';
  const originalPrice = originalPriceOf(p.price);
  const slug = slugify(p.name);
  const now = new Date().toISOString();
  return {
    id: p.sku.toLowerCase(),
    sku: p.sku,
    name: p.name,
    slug,
    category: p.category,
    description: isProj ? projectorDescription(p.name) : '',
    price: p.price,
    originalPrice,
    compareAtPrice: originalPrice,
    currency: 'PKR',
    originalCurrency: 'PKR',
    discountPercent: discountOf(p.price, originalPrice),
    image: manifest[p.imageKey] || '/assets/images/products/netflix.jpg',
    images: [manifest[p.imageKey]].filter(Boolean),
    galleryImages: [manifest[p.imageKey]].filter(Boolean),
    tags: isProj ? ['Projector', 'Home Cinema', 'PlayBeat Warranty'] : ['Instant', 'Official'],
    digital: !isProj,
    productType: isProj ? 'physical' : 'digital',
    stock: isProj ? 10 : 999,
    status: 'active',
    region: detectRegion(p.name),
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    isFeatured: false,
    featured: false,
    trending: false,
    bestSeller: false,
    flashDeal: false,
    deliveryMethod: isProj ? 'shipping' : 'instant',
    deliveryType: isProj ? 'Courier Shipping (1-3 Days)' : 'Instant Auto-Email',
    ...(isProj ? { projectorSpec: projectorSpecFor(p.name) } : {}),
    createdAt: now,
    updatedAt: now,
    source: 'CLSC Catalog 2026-09',
  };
});

// descriptions + features: import from generated products.ts (same logic already applied there)
// Simplest: read the generated TS and eval the RAW array
const ts = fs.readFileSync('/home/z/my-project/izoko/src/data/products.ts', 'utf8');
const m = ts.match(/const RAW_PRODUCTS_CATALOG: any\[\] = (\[[\s\S]*?\n\])/);
if (!m) throw new Error('RAW_PRODUCTS_CATALOG not found in products.ts');
const raw = eval(m[1]);
console.log(`Parsed ${raw.length} bundled products for merge`);
for (const r of raw) {
  const doc = catalogDocs.find((d) => d.sku === r.sku);
  if (doc) {
    doc.description = r.description;
    doc.shortDescription = r.shortDescription || r.description.slice(0, 120);
    doc.features = r.features;
    doc.tags = r.tags;
    doc.isFeatured = !!r.isFeatured;
    doc.featured = !!r.isFeatured;
    doc.isHot = !!r.isHot;
    doc.trending = !!r.isHot;
    doc.brand = r.brand;
    doc.deliveryInfo = r.deliveryInfo;
    doc.galleryImages = r.galleryImages;
  }
}

const res = await col.insertMany(catalogDocs);
console.log(`Inserted: ${res.insertedIds ? Object.keys(res.insertedIds).length : catalogDocs.length}`);
const after = await col.countDocuments({});
const byCat = await col.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]).toArray();
console.log(`Products after: ${after}`);
console.log('By category:', byCat.map((c) => `${c._id}=${c.n}`).join(', '));
const withImg = await col.countDocuments({ image: { $exists: true, $ne: '' } });
console.log(`Docs with image set: ${withImg}/${after}`);
await client.close();
console.log('DONE');
