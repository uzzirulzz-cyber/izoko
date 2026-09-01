// create_restore_point.js — creates a REAL restore point snapshot in the live
// playbeat MongoDB database (products + orders + users + site_settings).
// Usage: node /home/z/my-project/scripts/create_restore_point.js [name]
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri =
  'mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0';
const DB_NAME = 'playbeat';

const name =
  process.argv[2] ||
  `Restore point ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`;

async function main() {
  const started = Date.now();
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: true,
    },
    connectTimeoutMS: 15000,
    serverSelectionTimeoutMS: 15000,
  });
  await client.connect();
  console.log('Connected to MongoDB Atlas cluster0');
  const db = client.db(DB_NAME);

  const existingBackups = await db.collection('backups').countDocuments();

  const [products, orders, users, siteSettings] = await Promise.all([
    db.collection('products').find({}).toArray(),
    db.collection('orders').find({}).toArray(),
    db.collection('users').find({}, { projection: { password: 0 } }).toArray(),
    db.collection('site_settings').find({}).toArray(),
  ]);

  const snapshot = { products, orders, users, site_settings: siteSettings };
  const sizeKB = Math.round(JSON.stringify(snapshot).length / 1024);

  const doc = {
    name,
    type: 'manual',
    createdBy: 'deployment_script',
    collections: snapshot,
    counts: {
      products: products.length,
      orders: orders.length,
      users: users.length,
      site_settings: siteSettings.length,
    },
    sizeKB,
    createdAt: new Date(),
  };

  const r = await db.collection('backups').insertOne(doc);
  const totalBackups = existingBackups + 1;
  console.log(
    `Restore point created: "${name}" (${products.length} products, ${orders.length} orders, ${users.length} users, ${siteSettings.length} settings, ${sizeKB} KB) in ${Date.now() - started}ms`
  );
  console.log(`Backup id: ${r.insertedId}`);
  console.log(`Total restore points now in database: ${totalBackups}`);
  await client.close();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
