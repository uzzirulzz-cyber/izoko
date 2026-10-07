/**
 * add_psn_regions.js — Create 10 regional PSN Gift Card products as DRAFTS.
 * Prices: ALL BLANK (price 0, no compareAt/originalPrice) — user adds manually.
 * Images: NONE — user adds manually (image/gallery fields left empty).
 * Modeled exactly on the published PSN-US-GC product conventions.
 */
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');
const DATA = require('/home/z/my-project/scripts/psn_regions_data.json');

const MONGO = require("./_mongo_uri.cjs").MONGODB_URI;
const DB_NAME = 'playbeat';

// ---------- helpers ----------
const varId = () => 'var-' + crypto.randomBytes(5).toString('hex');

function denLabel(r, d) {
  const s = r.curSymbol;
  return s.endsWith(' ') ? `${s.trim()} ${d}` : `${s}${d}`;
}
function variantName(r, d) {
  const s = r.curSymbol;
  return s.endsWith(' ') ? `${s.trim()} ${d}` : `${s}${d} ${r.cur}`;
}
function variantSku(r, d) {
  return `PSN-${r.cc}-${d}${r.cur}`;
}
function denomRange(r) {
  return `${denLabel(r, Math.min(...r.denoms))}\u2013${denLabel(r, Math.max(...r.denoms))}`;
}
function metaAdj(r) {
  return r.adj === 'Saudi Arabian' ? 'Saudi' : r.adj;
}

// ---------- SEO (all lengths asserted) ----------
function seoTitle(r) {
  let t = `PlayStation Network Gift Card ${r.region} \u2013 PSN Digital Code`;
  if (t.length > 60) t = `PlayStation Network Gift Card ${r.region} \u2013 PSN Code`;
  if (t.length > 60) throw new Error(`SEO title too long (${t.length}) for ${r.region}`);
  return t;
}
function seoDescription(r) {
  const kw = `PlayStation Network Gift Card ${r.region}`;
  const withC = `Buy ${kw} digital codes in multiple ${r.cur} denominations for compatible ${metaAdj(r)} PlayStation accounts via PlayBeat Digital.`;
  if (withC.length <= 155) {
    if (withC.length < 70) throw new Error(`Meta too short for ${r.region}`);
    return withC;
  }
  const short = `Buy ${kw} digital codes in multiple ${r.cur} denominations for ${metaAdj(r)} PlayStation accounts via PlayBeat Digital.`;
  if (short.length > 155) throw new Error(`Meta too long (${short.length}) for ${r.region}`);
  return short;
}

// ---------- description HTML (mirrors PSN-US-GC: 7 h2, 9 h3, 1 table) ----------
function buildDescription(r) {
  const kw = `PlayStation Network Gift Card ${r.region}`;
  const rows = r.denoms
    .map(
      (d) =>
        `    <tr><td>${variantName(r, d)}</td><td>${variantSku(r, d)}</td><td>${r.regionFull}</td></tr>`
    )
    .join('\n');
  return `<h2>${kw}</h2>

<p>
The <strong>${kw}</strong> is a prepaid digital code that adds
${r.curWords} to a PlayStation Store wallet on a compatible <strong>${r.regionFull} region</strong>
PlayStation account. Once the code is redeemed, the wallet balance can be used toward eligible
games, add-ons, subscriptions and other digital content available on the ${r.adj} PlayStation Store.
This listing offers <strong>multiple ${r.cur} denominations</strong> in one place, so you can pick
the wallet top-up amount that suits your order before checkout.
</p>

<p>
Every order is delivered as a <strong>digital code</strong> with setup instructions from
PlayBeat Digital. There is no physical card to carry and nothing to ship — the code and the
redemption steps arrive digitally according to the PlayBeat fulfillment process, ready to be
redeemed on a supported PS4 or PS5 console through a ${r.regionFull}-region account.
</p>

<h2>Key Features</h2>

<ul>
  <li><strong>Multiple ${r.cur} denominations</strong> — choose the amount that fits your order</li>
  <li><strong>${r.regionFull}-region digital code</strong> for the ${r.adj} PlayStation Store</li>
  <li>Redeems on <strong>compatible ${r.adj} PlayStation accounts</strong></li>
  <li>Adds wallet funds for <strong>eligible games, add-ons and digital content</strong></li>
  <li>Works on supported <strong>PS4 and PS5</strong> consoles (${r.adj} accounts)</li>
  <li>Simple <strong>12-digit voucher code</strong> redemption</li>
  <li><strong>Digital delivery</strong> — no physical card, no shipping</li>
  <li>Redemption instructions included with every order</li>
  <li>Order-related support from <strong>PlayBeat Digital</strong></li>
</ul>

<h2>Available Denominations</h2>

<p>
This product is offered as one listing with several denomination variants.
Select your preferred amount under the <strong>Denomination</strong> selector before checkout —
the price shown updates to the variant you choose.
</p>

<table>
  <thead>
    <tr>
      <th>Denomination</th>
      <th>Variant SKU</th>
      <th>Region</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>

<h2>How It Works</h2>

<ol>
  <li><strong>Choose your denomination</strong> — select the ${r.cur} amount you need.</li>
  <li><strong>Complete checkout</strong> — place your order through PlayBeat Digital.</li>
  <li><strong>Receive your digital code</strong> — the PSN code and instructions are delivered digitally.</li>
  <li><strong>Sign in to a compatible ${r.adj} PlayStation account</strong> on your PS4, PS5, or the PlayStation Store website/app.</li>
  <li><strong>Redeem the code</strong> — enter the 12-digit voucher code in the Redeem Code section.</li>
  <li><strong>Use your wallet balance</strong> — apply the funds to eligible purchases on the ${r.adj} PlayStation Store.</li>
</ol>

<h2>Region &amp; Account Requirements</h2>

<p>
This is a <strong>${r.regionFull} region</strong> product — it is <strong>not</strong> a global code.
PlayStation Network gift cards are region-locked, which means a ${r.region} card can only be redeemed on a
PlayStation account registered in the <strong>${r.regionFull}</strong>. Customers must use a
<strong>compatible ${r.adj}-region PlayStation account</strong> for redemption.
</p>

<p>
Please <strong>verify your PlayStation account region before purchasing</strong> — you can check it
in your PlayStation account settings. PlayStation account regions cannot be changed after the account
is created, and region restrictions apply to wallet codes. If your account is registered in another
country, this ${r.region} gift card will not redeem successfully on it.
</p>

<h2>Digital Delivery</h2>

<p>
This is a <strong>digital product</strong>. No physical card, box or courier shipment is included.
After checkout, the digital code and redemption instructions are delivered according to the
PlayBeat fulfillment process — typically to your email address and PlayBeat account, so you can
redeem without waiting for any delivery.
</p>

<ul>
  <li><strong>Digital code delivery</strong> — nothing physical to ship</li>
  <li>Redemption <strong>instructions included</strong></li>
  <li>Order-related support available from PlayBeat Digital</li>
</ul>

<h2>Frequently Asked Questions</h2>

<h3>What is a ${kw}?</h3>

<p>
It is a prepaid digital code that adds funds to a PlayStation Network wallet on a compatible
${r.adj}-region account. The balance can then be spent on eligible content available on the
${r.adj} PlayStation Store, such as games, add-ons and subscriptions.
</p>

<h3>Which region is this gift card for?</h3>

<p>
This card is for the <strong>${r.regionFull}</strong> PlayStation Network store. A compatible
${r.adj}-region PlayStation account is required, and the card is not redeemable on accounts registered
in other countries.
</p>

<h3>Can I use a ${r.region} PSN card on an account registered in another country?</h3>

<p>
No. ${r.region} PSN codes are region-locked to ${r.regionFull} accounts. A PlayStation account's country cannot be
changed after creation, so please confirm your account region in your PlayStation settings
before placing an order.
</p>

<h3>Which denominations are available?</h3>

<p>
This listing offers <strong>${r.denoms.map((d) => denLabel(r, d)).join(', ')} ${r.cur}</strong> denominations.
Select your preferred amount from the Denomination selector before checkout.
</p>

<h3>How do I redeem the code?</h3>

<p>
Sign in to your ${r.adj} account on your PS4 or PS5, or visit the PlayStation Store website,
open the <strong>Redeem Codes</strong> section, and enter the 12-digit voucher code from your
order. The wallet funds are added to that account once the code is accepted.
</p>

<h3>Can I use the balance on PlayStation Store?</h3>

<p>
Yes. Once redeemed, the wallet balance can be used toward eligible games, add-ons, subscriptions
and other digital content available to ${r.adj} accounts on the PlayStation Store.
</p>

<h3>Is this a physical gift card?</h3>

<p>
No. This is a <strong>digital code</strong> — no physical card is shipped. Your code and
instructions are delivered digitally after purchase.
</p>

<h3>Does it work with PS4 and PS5?</h3>

<p>
Yes. The code redeems on ${r.adj}-region accounts through supported PS4 and PS5 consoles, as well as
through the PlayStation Store website. Individual store content availability can still vary by
account and region.
</p>

<h3>How is the code delivered?</h3>

<p>
Delivery is digital, following the PlayBeat fulfillment process — the code and setup instructions
are provided after checkout according to the delivery method shown for your order, with
order-related support available from PlayBeat Digital.
</p>`;
}

// ---------- catalog pieces ----------
function shortDescription(r) {
  return `Buy PlayStation Network Gift Card ${r.region} digital codes in multiple ${r.cur} denominations. Redeem on a compatible ${r.adj} PlayStation account for eligible PlayStation Store games, add-ons and digital content.`;
}
function tags(r) {
  return [
    'PlayStation Network Gift Card',
    `PSN Gift Card ${r.region}`,
    `PlayStation Gift Card ${r.region}`,
    'PSN Digital Code',
    'PlayStation Store Gift Card',
    `PSN ${r.cc} Code`,
    `${r.adj} PlayStation Card`,
    'PlayStation Wallet Top Up',
    'PS4 Gift Card',
    'PS5 Gift Card',
    'PlayStation Gift Card Pakistan',
    `PSN Card ${r.cc}`,
    'Digital Gift Card',
    `PlayStation Store ${r.region}`,
    r.extraTag,
  ];
}
function features(r) {
  return [
    `${r.region}-Region PSN Digital Code`,
    `Multiple ${r.cur} Denominations (${denomRange(r)})`,
    `Redeems on ${r.adj} PlayStation Accounts`,
    'PlayStation Store Wallet Top-Up',
    `Works on PS4 & PS5 (${r.adj} Accounts)`,
    '12-Digit Voucher Code Redemption',
    'No Expiration Date',
    'Digital Delivery — Nothing to Ship',
    'Setup Instructions Included',
    'PlayBeat Digital Support',
  ];
}

function buildProduct(r) {
  const desc = buildDescription(r);
  const name = `PlayStation Network Gift Card ${r.region} \u2013 PSN Digital Code`;
  const slug = `playstation-network-gift-card-${r.slugPart}-psn-digital-code`;
  const variants = r.denoms.map((d) => ({
    id: varId(),
    name: variantName(r, d),
    price: 0,
    sku: variantSku(r, d),
  }));
  return {
    sku: r.sku,
    name,
    slug,
    category: 'Gift Cards',
    subcategory: 'PlayStation / PSN Gift Cards',
    productType: 'digital',
    productKind: 'Gift Card',
    brand: 'PlayStation',
    region: r.region,
    description: desc,
    detailedDescription: desc,
    shortDescription: shortDescription(r),
    price: 0,
    currency: 'PKR',
    discountPercent: 0,
    active: false,
    cmsStatus: 'draft',
    image: '',
    images: [],
    gallery: [],
    galleryImages: [],
    additionalImages: [],
    galleryMeta: [],
    tags: tags(r),
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
    variants,
    deliveryType: 'Instant Auto-Email',
    deliveryInfo: 'Instant 15-Second Key Delivery',
    deliveryEstimate: 'Within 5 Minutes',
    features: features(r),
    seo: {
      title: seoTitle(r),
      description: seoDescription(r),
      focusKeyword: r.focusKeyword,
      secondaryKeywords: r.secondaryKeywords,
      index: true,
      follow: true,
    },
    slugHistory: [],
    backorder: 'deny',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------- main ----------
(async () => {
  const c = new MongoClient(MONGO);
  await c.connect();
  const col = c.db(DB_NAME).collection('products');

  // SANITY 1: slugs + skus must be free
  const slugs = DATA.map((r) => `playstation-network-gift-card-${r.slugPart}-psn-digital-code`);
  const skus = DATA.map((r) => r.sku);
  const slugHits = await col.find({ slug: { $in: slugs } }).toArray();
  const skuHits = await col.find({ sku: { $in: skus } }).toArray();
  if (slugHits.length || skuHits.length) {
    console.error('ABORT — conflicts:', JSON.stringify({ slugHits: slugHits.map((x) => x.slug), skuHits: skuHits.map((x) => x.sku) }));
    process.exit(1);
  }

  // SANITY 2: local content assertions before any write
  for (const r of DATA) {
    const p = buildProduct(r);
    const h2 = (p.detailedDescription.match(/<h2[^>]*>/g) || []).length;
    const h3 = (p.detailedDescription.match(/<h3[^>]*>/g) || []).length;
    const plain = p.detailedDescription.replace(/<[^>]*>/g, ' ');
    const words = plain.split(/\s+/).filter(Boolean).length;
    if (h2 !== 7 || h3 !== 9) throw new Error(`${r.region}: h2=${h2} h3=${h3} (expected 7/9)`);
    if (p.shortDescription.length >= 300) throw new Error(`${r.region}: shortDescription ${p.shortDescription.length}`);
    if (p.detailedDescription.length < 6000) throw new Error(`${r.region}: description too short`);
    if (p.variants.length !== r.denoms.length) throw new Error(`${r.region}: variant count`);
    if (p.tags.length !== 15) throw new Error(`${r.region}: tags ${p.tags.length}`);
    if (p.features.length !== 10) throw new Error(`${r.region}: features ${p.features.length}`);
    if (p.seo.secondaryKeywords.length !== 14) throw new Error(`${r.region}: secondaryKeywords`);
    if (p.variants.some((v) => v.price !== 0 || 'originalPrice' in v)) throw new Error(`${r.region}: variant price not blank`);
    if (p.price !== 0 || 'compareAt' in p) throw new Error(`${r.region}: product price not blank`);
    console.log(`OK ${r.region}: h2=7 h3=9 words=${words} desc=${p.detailedDescription.length}c meta=${p.seo.description.length}c title=${p.seo.title.length}c variants=${p.variants.map((v) => v.sku).join(',')}`);
  }

  // INSERT
  const docs = DATA.map(buildProduct);
  const ins = await col.insertMany(docs);
  console.log(`Inserted ${ins.insertedCount} products:`);
  DATA.forEach((r, i) => console.log(`  ${r.region}: ${ins.insertedIds[i]}`));

  // READ-BACK VERIFY
  let pass = 0;
  for (const r of DATA) {
    const p = await col.findOne({ sku: r.sku });
    const checks = {
      exists: !!p,
      slug: p && p.slug === `playstation-network-gift-card-${r.slugPart}-psn-digital-code`,
      draft: p && p.active === false && p.cmsStatus === 'draft',
      priceBlank: p && p.price === 0 && !('compareAt' in p),
      variantsBlank: p && p.variants.every((v) => v.price === 0 && !('originalPrice' in v)),
      variantSkus: p && p.variants.every((v, i) => v.sku === variantSku(r, r.denoms[i])),
      region: p && p.region === r.region,
      variantLabel: p && p.variantLabel === 'Denomination',
      noImage: p && !p.image && p.images.length === 0 && p.gallery.length === 0,
      seoKw: p && p.seo.focusKeyword === r.focusKeyword && p.seo.title.includes(r.focusKeyword) && p.seo.description.includes(r.focusKeyword),
      descVerbatim: p && p.description === p.detailedDescription,
    };
    const ok = Object.values(checks).every(Boolean);
    if (ok) pass++;
    else console.error(`FAIL ${r.region}:`, JSON.stringify(checks));
  }
  console.log(`read-back verification: ${pass}/${DATA.length} PASS`);

  await c.close();
  if (pass !== DATA.length) process.exit(1);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
