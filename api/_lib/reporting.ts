// Explicit fixtures are retained for audit, but never counted as business activity.
export const TEST_EMAIL_PATTERN = /^(?:test@playbeat\.digital|[^@]+@(?:test\.playbeat\.digital|playbeat\.test)|qa\d+@qa-check\.digital)$/i;
export function isTestOrder(order: any): boolean {
  return order?.isTest === true || order?.testMode === true || /^PB-GWTEST-/i.test(order?.orderNumber || '') || TEST_EMAIL_PATTERN.test(order?.customerEmail || '');
}
export function businessOrdersFilter(): any {
  return { $nor: [{ isTest: true }, { testMode: true }, { orderNumber: /^PB-GWTEST-/i }, { customerEmail: TEST_EMAIL_PATTERN }] };
}
export const PAID_ORDER_FILTER = { $or: [{ paymentStatus: 'paid' }, { status: 'completed', paymentStatus: { $nin: ['pending', 'failed', 'refunded'] } }] };
export const NET_ORDER_AMOUNT = { $max: [0, { $subtract: [{ $ifNull: ['$totalAmount', 0] }, { $ifNull: ['$refundedAmount', 0] }] }] };
export const IS_PAID_ORDER = { $or: [{ $eq: ['$paymentStatus', 'paid'] }, { $and: [{ $eq: ['$status', 'completed'] }, { $not: [{ $in: ['$paymentStatus', ['pending', 'failed', 'refunded']] }] }] }] };
export function reportingWindow(rawDays: unknown, now = new Date()) {
  const days = Math.max(1, Math.min(90, Math.floor(Number(rawDays) || 14)));
  const end = new Date(now);
  end.setUTCHours(24, 0, 0, 0);
  const start = new Date(end.getTime() - days * 86400000);
  const previousStart = new Date(start.getTime() - days * 86400000);
  return { days, start, end, previousStart };
}
export function isUnlimitedStock(product: any): boolean {
  return product.stockMode === 'unlimited' || (product.stockMode !== 'finite' && product.digital !== false && product.productType !== 'physical');
}
export const LOW_STOCK_FILTER = {
  active: { $ne: false },
  stockMode: { $ne: 'unlimited' },
  $or: [{ stockMode: 'finite' }, { digital: false }, { productType: 'physical' }],
  $expr: { $lte: [{ $ifNull: ['$stock', 0] }, { $ifNull: ['$lowStockThreshold', 5] }] },
};
export const PUBLIC_TRAFFIC_FILTER = { path: { $not: /^\/(?:admin|crm)(?:[/?#]|$)/i } };
export function trafficSource(referrer: string): string {
  if (!referrer) return '(direct)';
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'playbeat.digital') return '(internal)';
    return host;
  } catch { return '(unknown)'; }
}
