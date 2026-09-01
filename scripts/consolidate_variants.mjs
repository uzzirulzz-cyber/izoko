// consolidate_variants.mjs — "Post variant under drop down" consolidation.
// Same product posted many times => posted ONCE with variants under a product
// dropdown selection (Apple-style). Applies to ALL duplicate families.
//
// For each family:
//   1. find all ACTIVE docs whose name starts with the family prefix
//   2. parent = preferred SKU if given, else cheapest (tie-break: SKU)
//   3. variants = every standalone child (sorted price asc, sku asc),
//      name = child name minus family prefix
//   4. parent renamed to family name, re-categorised to majority category,
//      slug = slugify(family name) (uniquified), price = cheapest,
//      variants + variantLabel set
//   5. children deactivated (active:false + consolidatedParentId)
// Also stamps variantLabel on the 5 existing gift-card parents.
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = 'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  connectTimeoutMS: 20000, serverSelectionTimeoutMS: 20000,
});

const slugify = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// family: prefix (name match), parent display name, dropdown label, preferred parent sku
const FAMILIES = [
  { prefix: 'Perplexity Pro',            name: 'Perplexity Pro',            label: 'Plan' },
  { prefix: 'Adobe Creative Cloud',      name: 'Adobe Creative Cloud',      label: 'Plan',    preferredSku: 'PB-STU-006' },
  { prefix: 'Microsoft Office',          name: 'Microsoft Office',          label: 'Edition' },
  { prefix: 'Microsoft Windows 11',      name: 'Microsoft Windows 11',      label: 'Edition' },
  { prefix: 'Bitdefender Total Security',    name: 'Bitdefender Total Security',    label: 'Plan' },
  { prefix: 'Bitdefender Internet Security', name: 'Bitdefender Internet Security', label: 'Plan' },
  { prefix: 'Bitdefender Antivirus Plus',    name: 'Bitdefender Antivirus Plus',    label: 'Plan' },
  { prefix: 'McAfee Total Protection',   name: 'McAfee Total Protection',   label: 'Plan' },
  { prefix: 'CyberGhost VPN',            name: 'CyberGhost VPN',            label: 'Plan' },
  { prefix: 'NordVPN',                   name: 'NordVPN',                   label: 'Plan' },   // Basic + Full Private union
  { prefix: 'Surfshark VPN',             name: 'Surfshark VPN',             label: 'Plan' },
  { prefix: 'YouTube Premium',           name: 'YouTube Premium',           label: 'Plan' },
  { prefix: 'Prime Video',               name: 'Prime Video',               label: 'Plan' },
  { prefix: 'Netflix 1 Month',           name: 'Netflix 1 Month',           label: 'Region' },
  { prefix: 'Netflix + Prime Video',     name: 'Netflix + Prime Video Combo', label: 'Region' },
  { prefix: 'Apple TV+',                 name: 'Apple TV+',                 label: 'Plan' },
  { prefix: 'Zoom Pro',                  name: 'Zoom Pro',                  label: 'Plan' },
  { prefix: 'CapCut Pro',                name: 'CapCut Pro',                label: 'Plan' },
  { prefix: 'ChatGPT 5',                 name: 'ChatGPT 5',                 label: 'Plan' },
  { prefix: 'Xbox Game Pass Ultimate',   name: 'Xbox Game Pass Ultimate',   label: 'Plan' },
];

// existing gift-card parents get variantLabel stamps
const GIFT_LABELS = [
  'Xbox Live Gift Card', 'PlayStation Network Gift Card', 'Steam Gift Card',
  'Razer Gold Gift Card', 'Apple Gift Card',
];

await client.connect();
const db = client.db('playbeat');
const col = db.collection('products');

// stamp variantLabel on existing gift-card parents
for (const g of GIFT_LABELS) {
  const r = await col.updateOne(
    { name: g, variants: { $exists: true, $ne: [] } },
    { $set: { variantLabel: 'Denomination', updatedAt: new Date() } }
  );
  console.log(`label stamp: ${g} -> matched=${r.matchedCount}`);
}

const report = [];
for (const fam of FAMILIES) {
  const matching = await col.find({
    active: { $ne: false },
    name: { $regex: `^${esc(fam.prefix)}(\\s|$)`, $options: 'i' },
  }).sort({ price: 1, sku: 1 }).toArray();

  if (matching.length < 2) {
    console.log(`SKIP ${fam.prefix}: only ${matching.length} active match(es)`);
    continue;
  }

  // parent = preferred sku if present among matches, else cheapest (already sorted)
  const parent = fam.preferredSku
    ? (matching.find(p => (p.sku || '').toUpperCase() === fam.preferredSku) || matching[0])
    : matching[0];

  // standalone children (parents never have variants of their own here)
  const standalone = matching.filter(p => !p.variants || p.variants.length === 0);
  if (standalone.length < 2) {
    console.log(`SKIP ${fam.prefix}: standalone=${standalone.length}`);
    continue;
  }

  // variants sorted by price asc then sku for determinism
  standalone.sort((a, b) => (a.price - b.price) || String(a.sku).localeCompare(String(b.sku)));
  const variants = standalone.map(p => {
    const stripped = p.name.replace(new RegExp(`^${esc(fam.prefix)}\\s*`, 'i'), '').trim();
    return {
      id: `v-${p.sku || p._id.toString()}`,
      name: stripped || p.name,
      price: Number(p.price) || 0,
      originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
      sku: p.sku,
      badge: Array.isArray(p.tags) && p.tags.some(t => /instant/i.test(t)) ? 'Instant' : undefined,
    };
  });

  // majority category
  const catCount = {};
  for (const m of matching) catCount[m.category] = (catCount[m.category] || 0) + 1;
  const majorityCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0][0];

  // unique slug
  let slug = slugify(fam.name);
  const clash = await col.findOne({ slug, _id: { $ne: parent._id } });
  if (clash) slug = `${slug}-shop`;

  const cheapest = variants[0];
  await col.updateOne({ _id: parent._id }, { $set: {
    name: fam.name,
    slug,
    category: majorityCat,
    price: Number(cheapest.price) || Number(parent.price) || 0,
    variants,
    variantLabel: fam.label,
    active: true,
    updatedAt: new Date(),
  }});

  // deactivate the other standalone children
  const childIds = standalone.filter(p => p._id.toString() !== parent._id.toString()).map(p => p._id);
  if (childIds.length) {
    await col.updateMany(
      { _id: { $in: childIds } },
      { $set: { active: false, consolidatedParentId: parent._id.toString(), updatedAt: new Date() } }
    );
  }

  report.push({ family: fam.name, parent: parent.sku, variants: variants.length, deactivated: childIds.length, category: majorityCat });
  console.log(`OK ${fam.name}: parent=${parent.sku} variants=${variants.length} deactivated=${childIds.length} cat=${majorityCat}`);
}

// final state
const total = await col.countDocuments({});
const active = await col.countDocuments({ active: { $ne: false } });
const withVariants = await col.countDocuments({ active: { $ne: false }, variants: { $exists: true, $ne: [] } });
console.log(`\nFINAL: total=${total} active=${active} activeParents=${withVariants}`);
console.log(JSON.stringify(report, null, 2));
await client.close();
