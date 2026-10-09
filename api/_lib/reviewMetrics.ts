import { TEST_EMAIL_PATTERN, businessOrdersFilter, PAID_ORDER_FILTER } from './reporting.js';
export const APPROVED_REVIEW_FILTER = { status: 'approved', userEmail: { $not: TEST_EMAIL_PATTERN }, rating: { $gte: 1, $lte: 5 } };

export async function verifiedReviews(db: any, reviews: any[], products: any[]) {
  const numbers = [...new Set(reviews.map(r => r.orderNumber).filter(Boolean))];
  if (!numbers.length) return [];
  const orders = await db.collection('orders').find({ orderNumber: { $in: numbers }, ...businessOrdersFilter(), ...PAID_ORDER_FILTER }).toArray();
  const byOrder = new Map(orders.map((o: any) => [o.orderNumber, o]));
  const productRefs = new Map(products.map(p => [String(p._id), new Set([p._id, p.id, p.sku, p.slug].filter(Boolean).map(String))]));
  return reviews.filter(r => {
    const order: any = byOrder.get(r.orderNumber);
    const refs = productRefs.get(String(r.productId));
    return order && r.userId && String(order.userId) === String(r.userId) && !TEST_EMAIL_PATTERN.test(r.userEmail || '') && refs && (order.items || []).some((item: any) => refs.has(String(item.productId || item.sku || '')));
  });
}
export async function approvedVerifiedReviews(db: any, products: any[]) {
  if (!products.length) return [];
  const reviews = await db.collection('reviews').find({ ...APPROVED_REVIEW_FILTER, productId: { $in: products.map(p => String(p._id)) } }).sort({ createdAt: -1 }).toArray();
  return verifiedReviews(db, reviews, products);
}
// Imported catalog stars/counts do not represent customer reviews.
export async function withReviewMetrics(db: any, products: any[]) {
  const reviews = await approvedVerifiedReviews(db, products);
  return products.map(p => {
    const rows = reviews.filter(r => r.productId === String(p._id));
    const rating = rows.length ? Number((rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(2)) : 0;
    return { ...p, rating, reviewCount: rows.length };
  });
}
