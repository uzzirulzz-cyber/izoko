// Reset order & sales data to zero — user request: "reset order sales to 0
// keeping products intact".
//
// Deletes EVERY document from the `orders` collection (the single source that
// feeds /api/admin/stats totalOrders/totalRevenue/recentOrders, revenue-chart,
// top-products and pending-order alerts). NOTHING else is modified:
//   - products          (explicitly verified untouched — count before == after)
//   - users, payment_events, admin_activity, admin_avatars, app_release, …
//
// Read-only evidence is printed for every other collection touched/not touched.
// Idempotent. Usage: node scripts/reset_orders_sales.mjs
import { MongoClient } from "mongodb";

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0";
const DB_NAME = process.env.MONGODB_DB_NAME || "playbeat";

const mc = new MongoClient(MONGO_URI);
await mc.connect();
const db = mc.db(DB_NAME);

const ordersCol = db.collection("orders");
const productsCol = db.collection("products");

const beforeOrders = await ordersCol.countDocuments();
const beforeProducts = await productsCol.countDocuments();

console.log(`DB: ${DB_NAME}`);
console.log(`orders before:   ${beforeOrders}`);
console.log(`products before: ${beforeProducts} (will NOT be touched)`);

if (beforeOrders > 0) {
  // Log what is being removed for the audit trail
  const sample = await ordersCol
    .find({}, { projection: { orderNumber: 1, totalAmount: 1, status: 1, createdAt: 1 } })
    .limit(25)
    .toArray();
  const revenueAgg = await ordersCol
    .aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }])
    .toArray();
  console.log(
    `\nRemoving ${beforeOrders} orders (total recorded sales: ${revenueAgg[0]?.total || 0}). Most recent:`
  );
  for (const o of sample) {
    console.log(
      `  - ${o.orderNumber || o._id}  ${o.status || "?"}  ${o.totalAmount ?? "?"}  ${o.createdAt ? new Date(o.createdAt).toISOString() : "?"}`
    );
  }

  const res = await ordersCol.deleteMany({});
  console.log(`\ndeleteMany result: acknowledged=${res.acknowledged} deletedCount=${res.deletedCount}`);
} else {
  console.log("\norders already empty — nothing to delete.");
}

// ---- verification ----
const afterOrders = await ordersCol.countDocuments();
const afterProducts = await productsCol.countDocuments();
console.log(`\nVERIFY  orders after:   ${afterOrders} (expected 0)`);
console.log(`VERIFY  products after: ${afterProducts} (expected ${beforeProducts} — intact)`);

// Collections overview (informational — nothing else was modified)
const collections = await db.listCollections().toArray();
console.log(`\nCollections in ${DB_NAME}: ${collections.map((c) => c.name).join(", ")}`);

await mc.close();
if (afterOrders !== 0) {
  console.error("FAILED: orders collection is not empty after reset");
  process.exit(1);
}
if (afterProducts !== beforeProducts) {
  console.error("FAILED: products count changed — integrity violation");
  process.exit(1);
}
console.log("\nOK — order & sales data reset to 0, products intact.");
