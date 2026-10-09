import crypto from 'crypto';
import { ObjectId } from 'mongodb';

// Recognize the old locally generated placeholders. These cannot activate a product.
export function isPlaceholderLicense(code: string): boolean {
  return /^PB-.+-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code) || /^(?:PLAYBEAT|PSN-US|WIN11-PRO|PB-GPT4O|STEAM-KEY)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
}
export function safeOrderLicenses(order: any) {
  const paid = order.paymentStatus === 'paid' || (order.status === 'completed' && !['pending', 'failed', 'refunded'].includes(order.paymentStatus));
  const realKeys = (keys: unknown) => paid && Array.isArray(keys) ? keys.filter(k => typeof k === 'string' && !isPlaceholderLicense(k)) : [];
  return { ...order, licenseKeysDelivered: realKeys(order.licenseKeysDelivered), items: (order.items || []).map((item: any) => ({ ...item, manualLicenseKeys: undefined, licenseKeys: realKeys(item.licenseKeys) })) };
}
export async function findLicenseProduct(db: any, reference: unknown) {
  const ref = String(reference || '');
  if (!ref) return null;
  const alternatives: any[] = [{ id: ref }, { sku: ref }, { slug: ref }];
  if (ObjectId.isValid(ref)) alternatives.unshift({ _id: new ObjectId(ref) });
  return db.collection('products').findOne({ $or: alternatives });
}
export async function prepareLicenseInventory(db: any) {
  const col = db.collection('license_inventory');
  await col.createIndex({ fingerprint: 1 }, { unique: true });
  await col.createIndex({ orderNumber: 1, itemIndex: 1, unitIndex: 1 }, { unique: true, partialFilterExpression: { status: 'assigned' } });
  return col;
}
export async function importSupplierLicenses(db: any, product: any, variantName: string, rawCodes: unknown, actor: string) {
  if (product.digital === false || product.productType === 'physical') throw new Error('Choose a digital product.');
  if (Array.isArray(product.variants) && product.variants.length && !product.variants.some((v: any) => v.name === variantName)) throw new Error('Select the exact product variant.');
  if ((!product.variants || !product.variants.length) && variantName) throw new Error('This product has no variants.');
  if (typeof rawCodes !== 'string' || rawCodes.length > 200000) throw new Error('Paste up to 500 supplier keys.');
  const codes = [...new Set(rawCodes.split(/\r?\n/).map(k => k.trim()).filter(Boolean))];
  if (!codes.length || codes.length > 500 || codes.some(k => k.length > 1000 || /[\x00-\x1f]/.test(k) || isPlaceholderLicense(k))) throw new Error('Enter 1–500 real supplier keys, one per line. Generated placeholder codes are not accepted.');
  const col = await prepareLicenseInventory(db);
  let imported = 0;
  for (const code of codes) {
    const fingerprint = crypto.createHash('sha256').update(code).digest('hex');
    try {
      await col.insertOne({ fingerprint, code, productId: String(product._id), productName: product.name, variantName, status: 'available', source: 'supplier-import', importedBy: actor, createdAt: new Date() });
      imported++;
    } catch (err: any) { if (err?.code !== 11000) throw err; }
  }
  return { imported, duplicates: codes.length - imported };
}

// Each unit has a unique allocation. Webhook retries and concurrent workers
// recover the existing allocation rather than consume a second supplier key.
export async function allocateOrderLicenses(db: any, order: any) {
  if (order.paymentStatus !== 'paid') throw new Error('License allocation requires verified payment.');
  const col = await prepareLicenseInventory(db);
  const items: any[] = [];
  let assigned = 0, missing = 0, digitalUnits = 0;
  for (const [itemIndex, original] of (order.items || []).entries()) {
    const item = { ...original };
    const product = await findLicenseProduct(db, item.productId || item.sku);
    const digital = product ? product.digital !== false && product.productType !== 'physical' : item.digital !== false && !/courier|shipping/i.test(item.deliveryType || '');
    if (digital) {
      // Preserve existing supplier/manual deliveries, remove recognized placeholders.
      const previous = item.manualLicenseKeys || (item.licenseSource === 'supplier-import' ? [] : (item.licenseKeys || []).filter((k: unknown) => typeof k === 'string' && !isPlaceholderLicense(k)));
      item.manualLicenseKeys = previous;
      item.licenseSource = 'supplier-import';
      const keys: string[] = [];
      const quantity = Number(item.quantity ?? 1);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 500) throw new Error("Invalid order quantity; contact support.");
      digitalUnits += quantity;
      for (let unitIndex = 0; unitIndex < quantity; unitIndex++) {
        if (previous[unitIndex]) { keys.push(previous[unitIndex]); continue; }
        const unit = { orderNumber: order.orderNumber, itemIndex, unitIndex, status: 'assigned' };
        let allocation = await col.findOne(unit);
        if (!allocation && product) {
          try {
            allocation = await col.findOneAndUpdate(
              { productId: String(product._id), variantName: String(item.variantName || ''), status: 'available' },
              { $set: { ...unit, assignedAt: new Date() } },
              { sort: { createdAt: 1, _id: 1 }, returnDocument: 'after' },
            );
            if (allocation) assigned++;
          } catch (err: any) { if (err?.code !== 11000) throw err; allocation = await col.findOne(unit); }
        }
        if (allocation) keys.push(allocation.code); else missing++;
      }
      item.licenseKeys = keys;
      item.deliveryStatus = keys.length >= quantity ? 'keys_assigned' : 'awaiting_supplier_delivery';
    }
    items.push(item);
  }
  const deliveryStatus = missing ? 'awaiting_supplier_delivery' : digitalUnits ? 'keys_assigned' : 'awaiting_dispatch';
  await db.collection('orders').updateOne({ _id: order._id, paymentStatus: 'paid' }, { $set: { items, licenseKeysDelivered: items.flatMap(i => i.licenseKeys || []), deliveryStatus } });
  return { items, assigned, missing, deliveryStatus };
}
