const { MongoClient } = require('mongodb');
(async () => {
  const c = new MongoClient(require("./_mongo_uri.cjs").MONGODB_URI);
  await c.connect();
  const db = c.db('playbeat');
  const p = await db.collection('products').findOne({ sku: 'PB-REGION-FR-TEST' });
  console.log(JSON.stringify({ name: p?.name, region: p?.region, active: p?.active, cmsStatus: p?.cmsStatus }, null, 2));
  // legacy values check
  const legacy = await db.collection('products').aggregate([
    { $match: { region: { $in: ['Global','USA','Europe','Asia','Pakistan'] } } },
    { $group: { _id: '$region', n: { $sum: 1 } } }, { $sort: { _id: 1 } }
  ]).toArray();
  console.log('legacy region counts:', JSON.stringify(legacy));
  await c.close();
})().catch(e => { console.error(e.message); process.exit(1) });
