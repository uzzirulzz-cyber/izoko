// Attach the 6 merchant-provided PSN region images as MAIN product images.
// - Validates RIFF/WEBP magic + <=600KB before insert
// - media_assets doc shape identical to Task 3/4 inserts
// - product update: image + gallery + galleryMeta (alt/title per region)
// - never touches price, variants, active, cmsStatus or any other field
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { MONGODB_URI } = require('./_mongo_uri.cjs');

const DIR = path.join(__dirname, 'converted_region_uploads');

const MAP = [
  {
    slug: 'playstation-network-gift-card-uk-psn-digital-code',
    file: 'playstation-network-gift-card-uk-psn-digital-code.webp',
    alt: 'PlayStation Network Gift Card UK digital code with multiple GBP denomination options for UK PlayStation accounts, available via PlayBeat Digital.',
    title: 'PlayStation Network Gift Card UK – PSN Digital Code',
  },
  {
    slug: 'playstation-network-gift-card-canada-psn-digital-code',
    file: 'playstation-network-gift-card-canada-psn-digital-code.webp',
    alt: 'PlayStation Network Gift Card Canada digital code with multiple CAD denomination options for Canadian PlayStation accounts, available via PlayBeat Digital.',
    title: 'PlayStation Network Gift Card Canada – PSN Digital Code',
  },
  {
    slug: 'playstation-network-gift-card-japan-psn-digital-code',
    file: 'playstation-network-gift-card-japan-psn-digital-code.webp',
    alt: 'PlayStation Network Gift Card Japan digital code with multiple JPY denomination options for Japanese PlayStation accounts, available via PlayBeat Digital.',
    title: 'PlayStation Network Gift Card Japan – PSN Digital Code',
  },
  {
    slug: 'playstation-network-gift-card-australia-psn-digital-code',
    file: 'playstation-network-gift-card-Australia-psn-digital-code.webp',
    alt: 'PlayStation Network Gift Card Australia digital code with multiple AUD denomination options for Australian PlayStation accounts, available via PlayBeat Digital.',
    title: 'PlayStation Network Gift Card Australia – PSN Digital Code',
  },
  {
    slug: 'playstation-network-gift-card-singapore-psn-digital-code',
    file: 'playstation-network-gift-card-singapore-psn-digital-code.webp',
    alt: 'PlayStation Network Gift Card Singapore digital code with multiple SGD denomination options for Singapore PlayStation accounts, available via PlayBeat Digital.',
    title: 'PlayStation Network Gift Card Singapore – PSN Digital Code',
  },
  {
    slug: 'playstation-network-gift-card-malaysia-psn-digital-code',
    file: 'playstation-network-gift-card-malayasia-psn-digital-code.webp',
    alt: 'PlayStation Network Gift Card Malaysia digital code with multiple MYR denomination options for Malaysian PlayStation accounts, available via PlayBeat Digital.',
    title: 'PlayStation Network Gift Card Malaysia – PSN Digital Code',
  },
];

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('playbeat');
  const products = db.collection('products');
  const media = db.collection('media_assets');
  const now = new Date();
  let done = 0;

  for (const item of MAP) {
    const buf = fs.readFileSync(path.join(DIR, item.file));
    if (buf.subarray(0, 4).toString('ascii') !== 'RIFF' || buf.subarray(8, 12).toString('ascii') !== 'WEBP') {
      throw new Error(`${item.file}: not a real WEBP file`);
    }
    if (buf.length > 600 * 1024) throw new Error(`${item.file}: ${buf.length} bytes exceeds 600KB cap`);

    const prod = await products.findOne({ slug: item.slug }, { projection: { _id: 1, sku: 1, image: 1, gallery: 1, galleryMeta: 1, active: 1 } });
    if (!prod) throw new Error(`${item.slug}: product not found`);
    if (prod.image) {
      console.log(`${item.slug}: image already set (${prod.image}) — skipping`);
      continue;
    }

    const ins = await media.insertOne({
      filename: item.file,
      mime: 'image/webp',
      bytes: buf,
      size: buf.length,
      uploader: 'admin@playbeat.digital',
      purpose: 'product',
      createdAt: now,
    });
    const url = `/api/admin/media?id=${ins.insertedId.toString()}`;

    await products.updateOne(
      { _id: prod._id },
      {
        $set: {
          image: url,
          gallery: [url],
          galleryMeta: [{ url, alt: item.alt, title: item.title }],
          updatedAt: now,
        },
      }
    );
    done++;
    console.log(`${item.slug}: attached ${url} (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  // read-back verification
  console.log('\n=== read-back ===');
  for (const item of MAP) {
    const d = await products.findOne({ slug: item.slug }, { projection: { image: 1, gallery: 1, galleryMeta: 1 } });
    const ok = d.image && (d.gallery || []).includes(d.image) && (d.galleryMeta || [])[0]?.url === d.image && !!d.galleryMeta[0].alt && !!d.galleryMeta[0].title;
    console.log(`${item.slug}: image=${d.image ? 'SET' : 'MISSING'} consistent=${ok ? 'PASS' : 'FAIL'}`);
  }
  await client.close();
  console.log(`\nattached ${done}/6`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
