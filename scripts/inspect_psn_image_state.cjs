// Inspect PSN region drafts + USA draft image fields (read-only)
const { MongoClient } = require('mongodb');
const { MONGODB_URI } = require('./_mongo_uri.cjs');

(async () => {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('playbeat');
  const col = db.collection('products');

  const usa = await col.findOne({ sku: 'PSN-US-GC' }, { projection: { image: 1, gallery: 1, galleryImages: 1, additionalImages: 1, galleryMeta: 1, slug: 1, name: 1 } });
  console.log('=== USA draft (published by user) image fields ===');
  console.log(JSON.stringify({ image: usa.image, gallery: usa.gallery, galleryImages: usa.galleryImages, additionalImages: usa.additionalImages, galleryMeta: usa.galleryMeta }, null, 1).slice(0, 2200));

  const slugs = ['uk', 'canada', 'australia', 'japan', 'singapore', 'malaysia', 'germany', 'france', 'saudi-arabia', 'uae'];
  console.log('\n=== 10 regional drafts ===');
  for (const s of slugs) {
    const d = await col.findOne({ slug: `playstation-network-gift-card-${s}-psn-digital-code` }, { projection: { name: 1, sku: 1, active: 1, cmsStatus: 1, image: 1, gallery: 1, galleryImages: 1, additionalImages: 1, galleryMeta: 1, variants: 1 } });
    if (!d) { console.log(`${s}: NOT FOUND`); continue; }
    console.log(`${s}: sku=${d.sku} active=${d.active} cms=${d.cmsStatus} image=${d.image ? 'SET' : 'empty'} gallery=${(d.galleryImages || d.gallery || []).length} meta=${(d.galleryMeta || []).length} variants=${(d.variants || []).length}`);
  }
  await client.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
