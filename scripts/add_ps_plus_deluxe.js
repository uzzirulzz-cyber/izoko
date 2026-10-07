// add_ps_plus_deluxe.js — fill the existing empty Deluxe draft (PB-187038) with
// the full product the merchant provided + upload 3 images into media_assets.
//
// Matches the schema of the sibling products (Essential PB-597117 / Extra PB-545388):
//  - images live in `media_assets`, referenced as /api/admin/media?id=<ObjectId>
//  - description + detailedDescription both hold the HTML (storefront reads
//    detailedDescription first — QuickViewModal.tsx:485)
//  - variants[] + variantLabel drive the Shared/Private selector
// MongoDB is the source of truth: the description HTML is stored VERBATIM
// (XSS is stripped at render time by src/lib/description.ts, never at rest).
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import fs from 'fs';
import crypto from 'crypto';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const uri = require("./_mongo_uri.cjs").MONGODB_URI;
const DB_NAME = 'playbeat';

const DRAFT_ID = '6ac5402d1ca8f17222be5496'; // PB-187038 empty draft
const TEST_PRODUCT_ID = '6ac54998715522aea7937f00'; // "PS Plus Deluxe HTML Editor Final Test" — leftover E2E artifact

const IMG_DIR = '/home/z/my-project/scripts/converted';
const HTML = fs.readFileSync('/home/z/my-project/scripts/deluxe_description.html', 'utf8');

const images = [
  {
    file: 'playstation-plus-deluxe-1-month-global-shared-private-account.webp',
    title: 'PlayStation Plus Deluxe 1 Month Global – Shared & Private Account',
    alt: 'PlayStation Plus Deluxe 1 Month Global subscription with Shared and Private Account options, Game Catalog, Classics Catalog, Game Trials, Ubisoft+ Classics, online multiplayer, monthly games, cloud storage, Share Play, PS4 and PS5 compatibility, and digital delivery via PlayBeat Digital.',
  },
  {
    file: 'playstation-plus-deluxe-1-month-global-benefits-gallery.webp',
    title: 'PlayStation Plus Deluxe 1 Month Global – Key Benefits & Account Options',
    alt: 'PlayStation Plus Deluxe 1 Month Global subscription showing Game Catalog, Classics Catalog, Game Trials, Ubisoft+ Classics, online multiplayer, monthly games, member discounts, cloud storage, Share Play, PS4 and PS5 compatibility, and Shared or Private Account options via PlayBeat Digital.',
  },
  {
    file: 'playstation-plus-deluxe-1-month-how-it-works.webp',
    title: 'PlayStation Plus Deluxe 1 Month – How It Works',
    alt: 'PlayStation Plus Deluxe 1 Month Global subscription how-it-works guide showing order placement, Shared or Private Account selection, digital account delivery, setup instructions, activation, key membership benefits, PS4 and PS5 compatibility, and PlayBeat Digital customer support.',
  },
];

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
});
await client.connect();
const db = client.db(DB_NAME);
const products = db.collection('products');
const now = new Date();

// ---------- sanity checks before any write ----------
const draft = await products.findOne({ _id: new ObjectId(DRAFT_ID) });
if (!draft) throw new Error('Draft product not found: ' + DRAFT_ID);
if (draft.sku !== 'PB-187038') throw new Error('Unexpected sku on draft: ' + draft.sku);
const slugTaken = await products.findOne({ slug: 'playstation-plus-deluxe-1-month-global', _id: { $ne: new ObjectId(DRAFT_ID) } });
if (slugTaken) throw new Error('Slug already used by another product: ' + slugTaken._id);

// ---------- 1. upload images (same doc shape as POST /api/admin/media) ----------
const urls = [];
for (const img of images) {
  const bytes = fs.readFileSync(`${IMG_DIR}/${img.file}`);
  // webp magic check — never trust the extension
  if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error(`${img.file} is not a valid WebP file`);
  }
  if (bytes.length > 600 * 1024) throw new Error(`${img.file} exceeds 600KB API cap (${bytes.length})`);
  const res = await db.collection('media_assets').insertOne({
    filename: img.file,
    mime: 'image/webp',
    bytes,
    size: bytes.length,
    uploader: 'admin@playbeat.digital',
    purpose: 'product',
    createdAt: now,
  });
  const url = `/api/admin/media?id=${res.insertedId.toString()}`;
  urls.push(url);
  console.log(`uploaded ${img.file} (${(bytes.length / 1024).toFixed(0)} KB) -> ${url}`);
}
const [urlMain, urlBenefits, urlHow] = urls;

// ---------- 2. fill the draft ----------
const variantId = () => 'var-' + crypto.randomBytes(5).toString('hex');

const setFields = {
  name: 'PlayStation Plus Deluxe 1 Month Global – Shared & Private Account',
  slug: 'playstation-plus-deluxe-1-month-global',
  slugHistory: ['playstation-plus-deluxe-1-month-global-shared-and-private-account'],
  category: 'Gift Cards',
  subcategory: 'Gaming',
  productType: 'digital',
  // MongoDB stores the admin HTML verbatim (single source of truth)
  description: HTML,
  detailedDescription: HTML,
  shortDescription:
    'Get PlayStation Plus Deluxe 1 Month Global with Shared or Private Account options. Enjoy Game Catalog, Classics Catalog, Game Trials, online multiplayer, monthly games, member discounts, cloud storage and more on supported PS4/PS5 consoles.',
  price: 4289, // base = Shared Account
  currency: 'PKR',
  discountPercent: 0,
  image: urlMain,
  images: [urlMain, urlBenefits, urlHow],
  gallery: [urlMain, urlBenefits, urlHow],
  galleryImages: [urlBenefits, urlHow],
  additionalImages: [urlBenefits, urlHow],
  galleryMeta: images.map((img, i) => ({ url: urls[i], alt: img.alt, title: img.title })),
  tags: [
    'PlayStation Plus Deluxe', 'PlayStation Plus Deluxe 1 Month', 'PS Plus Deluxe',
    'PS Plus Deluxe 1 Month', 'PlayStation Plus Global', 'PlayStation Shared Account',
    'PlayStation Private Account', 'PS Plus Shared Account', 'PS Plus Private Account',
    'PlayStation Subscription', 'PS5 Subscription', 'PS4 Subscription',
    'PlayStation Game Catalog', 'PlayStation Classics Catalog', 'PlayStation Game Trials',
    'Ubisoft Plus Classics', 'PlayStation Online Multiplayer', 'PlayStation Monthly Games',
    'PlayStation Cloud Storage', 'PlayStation Membership', 'PlayStation Plus Pakistan',
    'PS Plus Pakistan', 'Digital PlayStation Subscription', 'PlayStation Plus Deluxe Global',
    'PlayBeat Digital',
  ],
  digital: true,
  stock: 50,
  stockMode: 'unlimited',
  lowStockThreshold: 5,
  status: 'in_stock',
  rating: 0,
  reviewCount: 0,
  isHot: true,
  isFeatured: false,
  featured: false,
  active: true,
  cmsStatus: 'published',
  variantLabel: 'Account Type',
  variants: [
    { id: variantId(), name: 'Shared Account', price: 4289, sku: 'PB-187038-SHARED', badge: 'Best Value' },
    { id: variantId(), name: 'Private Account', price: 4979, sku: 'PB-187038-PRIVATE', badge: 'Private' },
  ],
  deliveryType: 'Instant Auto-Email',
  deliveryInfo: 'Instant 15-Second Key Delivery',
  deliveryEstimate: 'Within 5 Minutes',
  region: 'Global',
  features: [
    '1 Month PlayStation Plus Deluxe',
    'Shared & Private Account Options',
    'Global Account Option',
    'Game Catalog Access',
    'Classics Catalog Access',
    'Game Trials',
    'Ubisoft+ Classics',
    'Online Multiplayer',
    'Monthly Games',
    'Member Discounts',
    'Cloud Storage',
    'Share Play',
    'PS4 & PS5 Support',
    'Digital Delivery',
    'Setup Instructions Included',
    'PlayBeat Digital Support',
  ],
  productKind: 'Digital Product',
  backorder: 'deny',
  seo: {
    title: 'PlayStation Plus Deluxe 1 Month Global | PlayBeat',
    description:
      'Buy PlayStation Plus Deluxe 1 Month Global with Shared or Private Account options, Game Catalog, Classics, Game Trials and digital delivery.',
    focusKeyword: 'PlayStation Plus Deluxe 1 Month Global',
    secondaryKeywords: [
      'PlayStation Plus Deluxe 1 Month', 'PS Plus Deluxe 1 Month', 'PlayStation Plus Deluxe Global',
      'PS Plus Deluxe Global', 'PlayStation Plus Shared Account', 'PlayStation Plus Private Account',
      'PS Plus Shared Account', 'PS Plus Private Account', 'PlayStation Plus Deluxe PS5',
      'PlayStation Plus Deluxe PS4', 'PlayStation Game Catalog', 'PlayStation Classics Catalog',
      'PlayStation Game Trials', 'Ubisoft Plus Classics', 'PlayStation Online Multiplayer',
      'PlayStation Monthly Games', 'PlayStation Cloud Storage', 'PlayStation Plus Pakistan',
      'PS Plus Pakistan', 'PlayStation Digital Subscription', 'PlayStation Deluxe Account',
      'PlayBeat Digital',
    ],
  },
  updatedAt: now,
};

const result = await products.updateOne({ _id: new ObjectId(DRAFT_ID) }, { $set: setFields });
if (result.modifiedCount !== 1) throw new Error('Product update failed');
console.log(`\nproduct updated: ${DRAFT_ID} (PB-187038) -> slug playstation-plus-deluxe-1-month-global`);

// ---------- 3. deactivate leftover E2E test product ----------
const t = await products.updateOne(
  { _id: new ObjectId(TEST_PRODUCT_ID) },
  { $set: { active: false, cmsStatus: 'archived', updatedAt: now } }
);
console.log(`test product archived: modified=${t.modifiedCount}`);

// ---------- 4. read back & verify ----------
const p = await products.findOne({ slug: 'playstation-plus-deluxe-1-month-global' });
const ok =
  p &&
  p.sku === 'PB-187038' &&
  p.active === true &&
  p.cmsStatus === 'published' &&
  p.variants?.length === 2 &&
  p.variants[0].price === 4289 &&
  p.variants[1].price === 4979 &&
  p.variantLabel === 'Account Type' &&
  p.description === HTML &&
  p.detailedDescription === HTML &&
  p.gallery?.length === 3 &&
  p.galleryMeta?.length === 3 &&
  p.tags?.length === 25 &&
  p.seo?.secondaryKeywords?.length === 22 &&
  p.features?.length === 16 &&
  p.slugHistory?.includes('playstation-plus-deluxe-1-month-global-shared-and-private-account') &&
  (p.shortDescription || '').length < 300;

console.log('\n--- READ-BACK VERIFICATION ---');
console.log(`name:            ${p.name}`);
console.log(`slug:            ${p.slug}`);
console.log(`sku:             ${p.sku} | price ${p.price} ${p.currency} | active=${p.active} cmsStatus=${p.cmsStatus}`);
console.log(`variantLabel:    ${p.variantLabel}`);
console.log(`variants:        ${p.variants.map((v) => `${v.name}=${v.price} (${v.sku})`).join(', ')}`);
console.log(`description len: ${p.description.length} chars | starts: ${p.description.slice(0, 60)}...`);
console.log(`shortDesc len:   ${(p.shortDescription || '').length} chars (<300)`);
console.log(`gallery:         ${p.gallery.length} images | galleryMeta: ${p.galleryMeta.length}`);
console.log(`tags:            ${p.tags.length} | seo secondary kw: ${p.seo.secondaryKeywords.length} | features: ${p.features.length}`);
console.log(`ALL CHECKS: ${ok ? 'PASS ✓' : 'FAIL ✗'}`);
if (!ok) process.exit(1);

await client.close();
