import assert from 'node:assert/strict';
import { Aggregator, Query } from 'mingo';
import jwt from 'jsonwebtoken';
import postcss from 'postcss';
import adminVendorCascade from './admin-vendor-cascade.mjs';
import { allocateOrderLicenses, importSupplierLicenses, isPlaceholderLicense, safeOrderLicenses } from '../api/_lib/licenses.js';
import { reportingWindow, isTestOrder } from '../api/_lib/reporting.js';
import { catalogDiscount } from '../src/lib/catalogMetrics.js';

// Exercise the actual handlers with Mongo-compatible query/aggregation semantics.
// No production credentials, network requests, or customer records are used.
process.env.SESSION_SECRET = 'local-admin-integrity-test-only';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/integrity-test';
const adminToken = jwt.sign({ role: 'admin', email: 'test-owner@example.org' }, process.env.SESSION_SECRET);

class TestCollection {
  docs: any[];
  constructor(docs: any[] = []) { this.docs = structuredClone(docs); }
  async createIndex() {}
  aggregate(pipeline: any[]) { return { toArray: async () => new Aggregator(pipeline).run(structuredClone(this.docs)) }; }
  async countDocuments(query: any = {}) { return this.docs.filter(d => new Query(query).test(d)).length; }
  async distinct(field: string, query: any) { return [...new Set(this.docs.filter(d => new Query(query).test(d)).map(d => d[field]))]; }
  find(query: any = {}) {
    let docs = this.docs.filter(d => new Query(query).test(d));
    const cursor = {
      sort: (sort: any) => { docs = new Aggregator([{ $sort: sort }]).run(docs); return cursor; },
      project: (_projection: any) => cursor,
      skip: (n: number) => { docs = docs.slice(n); return cursor; },
      limit: (n: number) => { docs = docs.slice(0, n); return cursor; },
      toArray: async () => structuredClone(docs),
    };
    return cursor;
  }
  async findOne(query: any) { if (query._id?.toHexString) query = { ...query, _id: query._id.toHexString() }; const row = this.docs.find(d => new Query(query).test(d)); return row ? structuredClone(row) : null; }
  checkUnique(candidate: any, except?: any) {
    const duplicate = this.docs.some(d => d !== except && (
      (candidate.fingerprint && d.fingerprint === candidate.fingerprint) ||
      (candidate.status === 'assigned' && d.status === 'assigned' && d.orderNumber === candidate.orderNumber && d.itemIndex === candidate.itemIndex && d.unitIndex === candidate.unitIndex)
    ));
    if (duplicate) throw Object.assign(new Error('duplicate'), { code: 11000 });
  }
  async insertOne(doc: any) {
    const candidate = { _id: `test-${this.docs.length + 1}`, ...structuredClone(doc) };
    this.checkUnique(candidate); this.docs.push(candidate); return { insertedId: candidate._id };
  }
  async findOneAndUpdate(query: any, update: any, _options: any = {}) {
    // Atomic selection/update, including unique allocation constraints.
    const row = this.docs.find(d => new Query(query).test(d));
    if (!row) return null;
    const candidate = { ...row, ...structuredClone(update.$set || {}) };
    this.checkUnique(candidate, row); Object.assign(row, candidate); return structuredClone(row);
  }
  async updateOne(query: any, update: any) {
    const row = this.docs.find(d => new Query(query).test(d));
    if (!row) return { matchedCount: 0 };
    Object.assign(row, structuredClone(update.$set || {})); return { matchedCount: 1 };
  }
}
class TestDb {
  collections = new Map<string, TestCollection>();
  collection(name: string) { if (!this.collections.has(name)) this.collections.set(name, new TestCollection()); return this.collections.get(name)!; }
  seed(name: string, docs: any[]) { this.collections.set(name, new TestCollection(docs)); }
}
const db = new TestDb();
(globalThis as any).__mongoClientP = Promise.resolve({ db: () => db });
const { default: adminHandler } = await import('../api/admin/index.js');
const { default: analyticsHandler } = await import('../api/analytics/index.js');
const { default: productsHandler } = await import('../api/products/index.js');
const { default: ordersHandler } = await import('../api/orders/index.js');
async function request(handler: any, path: string, method = 'GET', body?: any, token = adminToken) {
  const url = new URL(path, 'http://localhost');
  let status = 200, payload: any;
  const req = { url: path, method, body, query: Object.fromEntries(url.searchParams), headers: { authorization: `Bearer ${token}`, 'user-agent': 'integrity-test' } };
  const res: any = { status: (n: number) => { status = n; return res; }, setHeader: () => {}, json: (data: any) => { payload = data; return res; }, end: () => {} };
  await handler(req, res); return { status, data: payload };
}

const now = new Date();
const old = new Date(now.getTime() - 20 * 86400000);
const fixtures = [
  { _id: 'real-paid', orderNumber: 'PB-REAL-1', userId: 'buyer-1', customerName: 'Real Buyer', customerEmail: 'buyer@example.org', status: 'completed', paymentStatus: 'paid', totalAmount: 900, subtotalAmount: 1000, refundedAmount: 100, createdAt: old, paidAt: now, items: [{ productId: 'digital', name: 'Plan', price: 1000, quantity: 1 }] },
  { _id: 'real-pending', orderNumber: 'PB-REAL-2', customerEmail: 'buyer@example.org', status: 'pending', paymentStatus: 'pending', totalAmount: 10000, createdAt: now, items: [] },
  { _id: 'cancelled', orderNumber: 'PB-CANCEL', customerEmail: 'buyer@example.org', status: 'cancelled', paymentStatus: 'failed', totalAmount: 500, createdAt: now, items: [] },
  ...[
    { isTest: true }, { orderNumber: 'PB-GWTEST-1' }, { customerEmail: 'test@playbeat.digital' },
    { customerEmail: 'agent@test.playbeat.digital' }, { customerEmail: 'flow@playbeat.test' }, { customerEmail: 'qa123@qa-check.digital' },
  ].map((f, index) => ({ _id: `fixture-${index}`, orderNumber: `PB-FIXTURE-${index}`, customerEmail: 'fixture@example.org', status: 'completed', paymentStatus: 'paid', totalAmount: 999999, createdAt: now, items: [{ name: 'Plan', price: 999999, quantity: 1 }], ...f })),
];
db.seed('orders', fixtures);
db.seed('products', [
  { _id: 'physical', id: 'physical', name: 'Physical', active: true, digital: false, stock: 0, price: 200 },
  { _id: 'digital', id: 'digital', name: 'Digital', active: true, digital: true, stock: 0, price: 100, rating: 4.9, reviewCount: 999 },
  { _id: 'finite-digital', id: 'finite-digital', name: 'Limited', active: true, stockMode: 'finite', stock: 7, lowStockThreshold: 10, price: 100 },
  { _id: 'archived', id: 'archived', active: false, stockMode: 'finite', stock: 0 },
]);
const stats = await request(adminHandler, '/api/admin/stats');
assert.equal(stats.status, 200); assert.equal(stats.data.stats.totalOrders, 3);
assert.equal(stats.data.stats.totalRevenue, 800); assert.equal(stats.data.stats.testOrdersExcluded, 6);
assert.equal(stats.data.stats.lowStock, 2); assert.deepEqual(stats.data.stats.statusCounts, { completed: 1, pending: 1, cancelled: 1 });
const chart = await request(adminHandler, '/api/admin/revenue-chart?days=7');
assert.equal(chart.status, 200); assert.equal(chart.data.chart.totalRevenue, 800);
assert.equal(chart.data.chart.totalOrders, 1); assert.equal(chart.data.chart.deltaPct, null);
assert.equal(chart.data.chart.series.length, 7); // paid date, not old checkout date
const top = await request(adminHandler, '/api/admin/top-products');
assert.equal(top.data.topProducts[0].totalRevenue, 800); // coupon/refund-adjusted line revenue
const log = await request(adminHandler, '/api/admin/orders-log');
assert.equal(log.data.total, 3); assert.equal(log.data.customers[0].lifetimeValue, 800);
const withTests = await request(adminHandler, '/api/admin/orders-log?includeTests=true');
assert.equal(withTests.data.total, 9); assert.equal(withTests.data.orders.filter((o: any) => o.isTest).length, 6);
assert.equal(withTests.data.customers[0].lifetimeValue, 800);
assert.equal((await request(adminHandler, '/api/admin/stats', 'GET', undefined, '')).status, 401);

db.seed('analytics_events', [
  { type: 'page_view', path: '/', sessionId: 'a', referrer: '', device: 'desktop', createdAt: now },
  { type: 'page_view', path: '/product/plan', sessionId: 'a', referrer: 'https://playbeat.digital/', device: 'desktop', createdAt: now },
  { type: 'page_view', path: '/', sessionId: 'b', referrer: 'https://www.facebook.com/post/1', device: 'mobile', createdAt: now },
  ...['/admin', '/admin/login', '/crm'].map(path => ({ type: 'page_view', path, sessionId: 'staff', referrer: 'https://playbeat.digital/admin', createdAt: now })),
]);
const analytics = await request(analyticsHandler, '/api/analytics/summary?days=7');
assert.equal(analytics.data.analytics.pageViews, 3); assert.equal(analytics.data.analytics.uniqueVisitors, 2);
assert.equal(analytics.data.analytics.paidOrders, 1); assert.ok(analytics.data.analytics.topPages.every((p: any) => !/^\/(admin|crm)/.test(p.path)));
assert.deepEqual(new Set(analytics.data.analytics.referrers.map((r: any) => r.source)), new Set(['(direct)', '(internal)', 'facebook.com']));
await request(analyticsHandler, '/api/analytics', 'POST', { type: 'page_view', path: '/admin' });
assert.equal(db.collection('analytics_events').docs.length, 6);

db.seed('reviews', [
  { _id: 'review-real', productId: 'digital', status: 'approved', rating: 4, userEmail: 'buyer@example.org', orderNumber: 'PB-REAL-1', userId: 'buyer-1' },
  { _id: 'review-test', productId: 'digital', status: 'approved', rating: 5, userEmail: 'flow@playbeat.test', orderNumber: 'PB-FIXTURE-0', userId: 'fixture-user' },
  { _id: 'review-fabricated', productId: 'digital', status: 'approved', rating: 5, userEmail: 'fabricated@example.org' },
  { _id: 'review-pending', productId: 'digital', status: 'pending', rating: 5 },
]);
const products = await request(productsHandler, '/api/products');
const product = products.data.products.find((p: any) => p.id === 'digital');
assert.equal(product.rating, 4); assert.equal(product.reviewCount, 1);
const reviews = await request(adminHandler, '/api/admin/reviews?status=pending');
assert.equal(reviews.data.counts.approved, 3); assert.equal(reviews.data.counts.pending, 1);
assert.equal(catalogDiscount({ price: 500, originalPrice: 2000 }), 75);
assert.equal(catalogDiscount({ price: 500 }), 0);
assert.equal(reportingWindow(-5).days, 1); assert.equal(reportingWindow(999).days, 90);
assert.equal(reportingWindow(7, new Date('2026-10-09T12:00:00Z')).start.toISOString(), '2026-10-03T00:00:00.000Z');
assert.equal(isTestOrder({ customerName: 'Test User', customerEmail: 'real@example.org' }), false);

// Supplier inventory: exact variants, duplicates, shortage, unpaid rejection,
// retry after restock, concurrent allocation and two competing paid orders.
const plan = { _id: 'supplier-plan', id: 'supplier-plan', name: 'Plan', digital: true, variants: [{ name: 'One month' }, { name: 'One year' }] };
db.seed('products', [plan]); db.seed('license_inventory', []);
const paidOrder = { _id: 'licensed-order', orderNumber: 'PB-LIC-1', paymentStatus: 'paid', items: [{ productId: plan.id, variantName: 'One month', quantity: 2, licenseKeys: ['PB-OLD-AAAA-BBBB-CCCC'] }] };
db.seed('orders', [paidOrder]);
await assert.rejects(importSupplierLicenses(db, plan, 'Wrong variant', 'supplier-A', 'test'), /variant/);
await assert.rejects(importSupplierLicenses(db, plan, 'One month', 'PB-OLD-AAAA-BBBB-CCCC', 'test'), /placeholder/);
assert.equal(isPlaceholderLicense('supplier-valid-A'), false);
assert.deepEqual(safeOrderLicenses({ paymentStatus: 'pending', items: [{ licenseKeys: ['supplier-valid-A'] }] }).items[0].licenseKeys, []);
assert.deepEqual(safeOrderLicenses({ paymentStatus: 'paid', items: [{ licenseKeys: ['PB-OLD-AAAA-BBBB-CCCC', 'supplier-valid-A'] }] }).items[0].licenseKeys, ['supplier-valid-A']);
await importSupplierLicenses(db, plan, 'One year', 'supplier-year-A', 'test');
assert.deepEqual(await importSupplierLicenses(db, plan, 'One month', 'supplier-month-A\nsupplier-month-A', 'test'), { imported: 1, duplicates: 0 });
assert.deepEqual(await importSupplierLicenses(db, plan, 'One month', 'supplier-month-A', 'test'), { imported: 0, duplicates: 1 });
await assert.rejects(allocateOrderLicenses(db, { ...paidOrder, paymentStatus: 'pending' }), /verified payment/);
const first = await allocateOrderLicenses(db, paidOrder);
assert.equal(first.assigned, 1); assert.equal(first.missing, 1); assert.equal(first.deliveryStatus, 'awaiting_supplier_delivery');
assert.deepEqual(first.items[0].licenseKeys, ['supplier-month-A']);
await importSupplierLicenses(db, plan, 'One month', 'supplier-month-B', 'test');
const retry = await allocateOrderLicenses(db, await db.collection('orders').findOne({ _id: paidOrder._id }));
assert.equal(retry.missing, 0); assert.deepEqual(retry.items[0].licenseKeys, ['supplier-month-A', 'supplier-month-B']);
const concurrent = await Promise.all([allocateOrderLicenses(db, paidOrder), allocateOrderLicenses(db, paidOrder)]);
assert.deepEqual(concurrent[0].items[0].licenseKeys, concurrent[1].items[0].licenseKeys);
assert.equal(db.collection('license_inventory').docs.filter(d => d.status === 'assigned').length, 2);
await importSupplierLicenses(db, plan, 'One month', 'supplier-last-key', 'test');
const competing = ['PB-LIC-2', 'PB-LIC-3'].map(orderNumber => ({ _id: orderNumber, orderNumber, paymentStatus: 'paid', items: [{ productId: plan.id, variantName: 'One month', quantity: 1 }] }));
db.seed('orders', competing);
const results = await Promise.all(competing.map(o => allocateOrderLicenses(db, o)));
assert.equal(results.reduce((sum, r) => sum + r.assigned, 0), 1); assert.equal(results.reduce((sum, r) => sum + r.missing, 0), 1);
assert.ok(db.collection('license_inventory').docs.find(d => d.code === 'supplier-year-A')?.status === 'available');

// An arbitrary direct payment label cannot create paid revenue or fake keys.
db.seed('users', [{ _id: '507f1f77bcf86cd799439011', name: 'Buyer', email: 'buyer@example.org' }]);
db.seed('products', [{ _id: 'checkout-product', id: 'checkout-product', name: 'Catalog Product', digital: true, active: true, price: 500 }]);
db.seed('orders', []);
const userToken = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'user' }, process.env.SESSION_SECRET);
const created = await request(ordersHandler, '/api/orders', 'POST', { items: [{ product: { id: 'checkout-product', name: 'Fake client name', price: 1 }, quantity: 1, unitPrice: 1 }], paymentMethod: 'Bank Transfer' }, userToken);
assert.equal(created.status, 201); assert.equal(created.data.order.paymentStatus, 'pending');
assert.equal(created.data.order.totalAmount, 500); assert.deepEqual(db.collection('orders').docs[0].items[0].licenseKeys, []);
const badQuantity = await request(ordersHandler, '/api/orders', 'POST', { items: [{ product: { id: 'checkout-product' }, quantity: -1 }] }, userToken);
assert.equal(badQuantity.status, 400);
// The legacy admin utility overrides are demoted without weakening components
// or changing storefront CSS.
const legacyCss = '.pbadmin .p-4 { padding: 1.5rem !important } .pbadmin .text-white { color: white !important } .pbadmin .modal-open { overflow: hidden !important }';
const vendorCss = await postcss([adminVendorCascade()]).process(legacyCss, { from: '/app/src/admin/vendor-scoped.css' });
const importance: Record<string, boolean> = {};
vendorCss.root.walkRules(rule => rule.walkDecls(decl => { importance[rule.selector] = Boolean(decl.important); }));
assert.equal(importance['.pbadmin .p-4'], false); assert.equal(importance['.pbadmin .text-white'], false);
assert.equal(importance['.pbadmin .modal-open'], true);
const storefrontCss = await postcss([adminVendorCascade()]).process(legacyCss, { from: '/app/src/index.css' });
assert.equal(storefrontCss.css, legacyCss);
console.log('Admin integrity regression checks passed: reports, traffic, reviews, checkout, supplier inventory, concurrency and CSS isolation.');
