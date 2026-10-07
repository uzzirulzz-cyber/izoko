// add_psn_usa_giftcard.js — create "PlayStation Network Gift Card USA – PSN Digital Code"
// as a DRAFT (unpublished) parent product with 6 denomination variants, ALL PRICES BLANK.
//
// Rules enforced by this script:
//  - price: 0 everywhere (product + every variant) = BLANK placeholder; user adds real prices via admin
//  - NO originalPrice / compareAtPrice / discountPercent anywhere
//  - active: false + cmsStatus: 'draft'  → hidden from storefront AND auto-excluded from
//    the Google Merchant feed (feed query filters active != false) and sitemap
//  - region: 'USA' (NOT Global)
//  - description stored VERBATIM in MongoDB (source of truth)
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import fs from 'fs';
import crypto from 'crypto';

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const DB_NAME = 'playbeat';

const IMG_DIR = '/home/z/my-project/scripts/psn_webp';
const HTML = fs.readFileSync('/home/z/my-project/scripts/psn_description.html', 'utf8');

const images = [
  {
    file: 'playstation-network-gift-card-usa-psn-digital-code.webp',
    title: 'PlayStation Network Gift Card USA – PSN Digital Code',
    alt: 'PlayStation Network Gift Card USA digital code with multiple USD denomination options for compatible US PlayStation accounts, available via PlayBeat Digital.',
  },
  {
    file: 'playstation-network-gift-card-usa-denominations.webp',
    title: 'PlayStation Network Gift Card USA – Available Denominations',
    alt: 'PlayStation Network Gift Card USA available denominations: 10, 20, 25, 50, 75 and 100 USD digital codes for a compatible US PlayStation account.',
  },
  {
    file: 'playstation-network-gift-card-usa-how-it-works.webp',
    title: 'PlayStation Network Gift Card USA – How It Works',
    alt: 'How it works: choose a PlayStation Network Gift Card USA denomination, complete checkout, receive the digital code and redeem it on a compatible US PlayStation account.',
  },
  {
    file: 'playstation-network-gift-card-usa-region-requirements.webp',
    title: 'PlayStation Network Gift Card USA – Region & Redemption Requirements',
    alt: 'USA region requirements for the PlayStation Network Gift Card: compatible US PlayStation account required, account region verification before purchase, and 12-digit code redemption.',
  },
  {
    file: 'playstation-network-gift-card-usa-digital-delivery.webp',
    title: 'PlayStation Network Gift Card USA – Digital Delivery',
    alt: 'Digital delivery of PlayStation Network Gift Card USA codes via email and PlayBeat account with no physical card or shipping.',
  },
];

const DENOMS = [10, 20, 25, 50, 75, 100];

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000,
});
await client.connect();
const db = client.db(DB_NAME);
const products = db.collection('products');
const now = new Date();

// ---------- pre-flight ----------
const slug = 'playstation-network-gift-card-usa-psn-digital-code';
const existing = await products.findOne({ $or: [{ slug }, { sku: 'PSN-US-GC' }] });
if (existing) throw new Error('Product already exists: ' + existing.slug + ' / ' + existing.sku);

// ---------- 1. upload images ----------
const urls = [];
for (const img of images) {
  const bytes = fs.readFileSync(`${IMG_DIR}/${img.file}`);
  if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error(`${img.file} is not a valid WebP file`);
  }
  if (bytes.length > 600 * 1024) throw new Error(`${img.file} exceeds 600KB cap`);
  const res = await db.collection('media_assets').insertOne({
    filename: img.file,
    mime: 'image/webp',
    bytes,
    size: bytes.length,
    uploader: 'admin@playbeat.digital',
    purpose: 'product',
    createdAt: now,
  });
  urls.push(`/api/admin/media?id=${res.insertedId.toString()}`);
  console.log(`uploaded ${img.file} (${(bytes.length / 1024).toFixed(0)} KB) -> ${urls[urls.length - 1]}`);
}
const [urlMain, ...urlGallery] = urls;

// ---------- 2. create the DRAFT product ----------
const shortDescription =
  'Buy PlayStation Network Gift Card USA digital codes in multiple USD denominations. Redeem on a compatible US PlayStation account for eligible PlayStation Store games, add-ons and digital content.';
if (shortDescription.length >= 300) throw new Error('shortDescription >= 300 chars: ' + shortDescription.length);

const variantId = () => 'var-' + crypto.randomBytes(5).toString('hex');

const doc = {
  sku: 'PSN-US-GC',
  name: 'PlayStation Network Gift Card USA – PSN Digital Code',
  slug,
  category: 'Gift Cards',
  subcategory: 'PlayStation / PSN Gift Cards',
  productType: 'digital',
  productKind: 'Gift Card',
  brand: 'PlayStation',
  region: 'USA', // United States — NOT Global
  description: HTML,          // verbatim — MongoDB is the source of truth
  detailedDescription: HTML,  // storefront renders detailedDescription first
  shortDescription,
  // ---- PRICING: ALL BLANK (0 = placeholder). User adds real prices via admin. ----
  price: 0,
  currency: 'PKR',
  discountPercent: 0,
  // ---- PUBLICATION: DRAFT / UNPUBLISHED ----
  active: false,
  cmsStatus: 'draft',
  image: urlMain,
  images: urls,
  gallery: urls,
  galleryImages: urlGallery,
  additionalImages: urlGallery,
  galleryMeta: images.map((img, i) => ({ url: urls[i], alt: img.alt, title: img.title })),
  tags: [
    'PlayStation Network Gift Card', 'PSN Gift Card USA', 'PlayStation Gift Card USA',
    'PSN Digital Code', 'PlayStation Store Gift Card', 'PSN USA Code',
    'US PlayStation Card', 'PlayStation Wallet Top Up', 'PS4 Gift Card', 'PS5 Gift Card',
    'PlayStation Gift Card Pakistan', 'PSN Card US', 'Digital Gift Card',
    'PlayStation Store USA', 'PlayBeat Digital',
  ],
  digital: true,
  stock: 50,
  stockMode: 'unlimited',
  lowStockThreshold: 5,
  status: 'in_stock',
  rating: 0,
  reviewCount: 0,
  isHot: false,
  isFeatured: false,
  featured: false,
  variantLabel: 'Denomination',
  variants: DENOMS.map((d) => ({
    id: variantId(),
    name: `$${d} USD`,
    price: 0,        // BLANK — user fills manually
    sku: `PSN-US-${d}USD`,
    // no originalPrice (was-price) — stays blank
  })),
  deliveryType: 'Instant Auto-Email',
  deliveryInfo: 'Instant 15-Second Key Delivery',
  deliveryEstimate: 'Within 5 Minutes',
  features: [
    'USA-Region PSN Digital Code',
    'Multiple USD Denominations ($10–$100)',
    'Redeems on US PlayStation Accounts',
    'PlayStation Store Wallet Top-Up',
    'Works on PS4 & PS5 (US Accounts)',
    '12-Digit Voucher Code Redemption',
    'No Expiration Date',
    'Digital Delivery — Nothing to Ship',
    'Setup Instructions Included',
    'PlayBeat Digital Support',
  ],
  seo: {
    title: 'PlayStation Network Gift Card USA – PSN Code | PlayBeat',
    description:
      'Buy PlayStation Network Gift Card USA digital codes in multiple USD denominations for compatible US PlayStation accounts via PlayBeat Digital.',
    focusKeyword: 'PlayStation Network Gift Card USA',
    secondaryKeywords: [
      'PlayStation Gift Card USA', 'PSN Gift Card USA', 'PlayStation Store Gift Card',
      'PSN Digital Code', 'PlayStation Network Card', 'PlayStation Gift Card US',
      'PSN USA Code', 'PlayStation Store USA', 'PS4 Gift Card', 'PS5 Gift Card',
      'Digital PlayStation Gift Card', 'Buy PSN Gift Card', 'PlayStation Gift Card Pakistan',
      'PlayBeat Digital',
    ],
  },
  slugHistory: [],
  createdAt: now,
  updatedAt: now,
};

const res = await products.insertOne(doc);
console.log(`\nDRAFT product created: _id=${res.insertedId} sku=PSN-US-GC slug=${slug}`);

// ---------- 3. read back & verify ----------
const p = await products.findOne({ _id: res.insertedId });
const checks = [
  ['product created', !!p],
  ['draft / unpublished (active=false)', p.active === false],
  ['draft / unpublished (cmsStatus=draft)', p.cmsStatus === 'draft'],
  ['region = USA', p.region === 'USA'],
  ['region is NOT Global', p.region !== 'Global'],
  ['6 denomination variants', p.variants?.length === 6],
  ['no invented denominations', p.variants.map((v) => v.name).join(',') === '$10 USD,$20 USD,$25 USD,$50 USD,$75 USD,$100 USD'],
  ['ALL variant prices blank (0)', p.variants.every((v) => v.price === 0)],
  ['ALL variant was-prices blank', p.variants.every((v) => v.originalPrice == null)],
  ['product-level price blank (0)', p.price === 0],
  ['no compareAtPrice / originalPrice / discount', p.compareAtPrice == null && p.originalPrice == null && p.discountPercent === 0],
  ['variantLabel = Denomination', p.variantLabel === 'Denomination'],
  ['variant SKUs correct', p.variants.map((v) => v.sku).join(',') === 'PSN-US-10USD,PSN-US-20USD,PSN-US-25USD,PSN-US-50USD,PSN-US-75USD,PSN-US-100USD'],
  ['description HTML stored verbatim', p.description === HTML],
  ['detailedDescription = description', p.detailedDescription === HTML],
  ['shortDescription < 300 chars', (p.shortDescription || '').length < 300],
  ['no H1 in description', !/<h1[\s>]/i.test(p.description)],
  ['SEO title saved', p.seo?.title === 'PlayStation Network Gift Card USA – PSN Code | PlayBeat'],
  ['SEO meta description saved', (p.seo?.description || '').length < 155],
  ['focus keyword saved', p.seo?.focusKeyword === 'PlayStation Network Gift Card USA'],
  ['14 secondary keywords', p.seo?.secondaryKeywords?.length === 14],
  ['main image + 4 gallery images', p.gallery?.length === 5 && p.galleryImages?.length === 4],
  ['galleryMeta alt+title saved (5)', p.galleryMeta?.length === 5 && p.galleryMeta.every((g) => g.alt && g.title)],
  ['image = webp media URL', p.image?.startsWith('/api/admin/media?id=')],
  ['brand = PlayStation', p.brand === 'PlayStation'],
];
let fail = 0;
for (const [name, ok] of checks) {
  if (!ok) { fail++; console.log('FAIL: ' + name); }
}
console.log(`\n--- VERIFICATION: ${checks.length - fail}/${checks.length} checks passed ---`);

// summary printout
console.log(`\nname:      ${p.name}`);
console.log(`_id:       ${p._id}`);
console.log(`sku:       ${p.sku} | slug: ${p.slug}`);
console.log(`status:    active=${p.active} cmsStatus=${p.cmsStatus} region=${p.region}`);
console.log(`price:     ${p.price} (blank) | variants:`);
p.variants.forEach((v) => console.log(`  - ${v.name} | ${v.sku} | price=${v.price} | was=${v.originalPrice ?? 'blank'}`));
console.log(`shortDesc: ${(p.shortDescription || '').length} chars`);
console.log(`image:     ${p.image}`);
console.log(`seo.title: ${p.seo.title}`);
console.log(`seo.desc:  ${p.seo.description} (${p.seo.description.length} chars)`);

if (fail > 0) process.exit(1);
await client.close();
