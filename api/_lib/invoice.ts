// Invoices — auto-generated when an order is marked PAID by a verified
// payment webhook (never by browser input, never on pending orders).
//
//   { invoiceNumber, orderNumber, userId, customerName, customerEmail,
//     brand: {...}, items: [{name, variantName, quantity, unitPrice, amount}],
//     subtotalAmount, discountAmount, totalAmount, currency, paymentMethod,
//     paymentStatus, issuedAt, createdAt }
//
// Numbering: INV-YYYY-NNNNN from a monotonic counter document
// (`counters` collection, atomic findOneAndUpdate $inc) — gap-free per year
// under normal operation and always unique (unique index on invoiceNumber).

import { getDb } from "./mongo.js";
import { writeAudit } from "./audit.js";

const COLL = "invoices";

export function brandHeader() {
  return {
    name: "PlayBeat Digital (Private) Limited",
    tagline: "Instant Licenses & Smart 4K Cinema — playbeat.digital",
    address: "HOUSE 334, Street 6, Jinnahabad, Abbottabad, Pakistan",
    email: "support@playbeat.digital",
    whatsapp: "+92 332 1049333",
    siteUrl: process.env.PUBLIC_SITE_URL || "https://playbeat.digital",
  };
}

export async function nextInvoiceNumber(db: any): Promise<string> {
  const year = new Date().getFullYear();
  const key = `invoice-${year}`;
  const counters = db.collection("counters");
  const res = await counters.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 }, $setOnInsert: { key } },
    { upsert: true, returnDocument: "after" }
  );
  const seq = Number(res?.seq || res?.value?.seq || 1);
  return `INV-${year}-${String(seq).padStart(5, "0")}`;
}

export interface InvoiceInput {
  order: any; // full order doc (post-payment state)
  source: string; // "webhook:generic" | "webhook:rapid" | "admin"
}

/**
 * Create the invoice for a paid order. Idempotent: if an invoice already
 * exists for the orderNumber it is returned unchanged (webhook retries and
 * dual-path fulfillment never double-issue).
 */
export async function ensureInvoiceForOrder(db: any, input: InvoiceInput): Promise<any> {
  const { order } = input;
  const col = db.collection(COLL);
  const existing = await col.findOne({ orderNumber: order.orderNumber });
  if (existing) return { invoice: existing, created: false };

  const items = (order.items || []).map((it: any) => ({
    name: it.name || "PlayBeat Product",
    variantName: it.variantName || null,
    sku: it.sku || null,
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.price || 0),
    amount: Number(((it.price || 0) * (it.quantity || 1)).toFixed(2)),
    deliveryType: it.deliveryType || null,
  }));
  const subtotalAmount = items.reduce((s: number, i: any) => s + i.amount, 0);
  const discountAmount = Number(order.discountAmount || 0);
  const totalAmount = Number(
    (order.totalAmount != null ? Number(order.totalAmount) : subtotalAmount - discountAmount).toFixed(2)
  );

  const invoiceNumber = await nextInvoiceNumber(db);
  const doc: Record<string, any> = {
    invoiceNumber,
    orderNumber: order.orderNumber,
    userId: order.userId || null,
    customerName: order.customerName || "PlayBeat Customer",
    customerEmail: order.customerEmail || "",
    brand: brandHeader(),
    items,
    subtotalAmount: Number(subtotalAmount.toFixed(2)),
    ...(discountAmount > 0
      ? { discountAmount, coupon: order.coupon || null }
      : {}),
    totalAmount,
    currency: order.currency || "PKR",
    paymentMethod: order.paymentMethod || "Rapid Gateway",
    paymentStatus: "paid",
    orderStatusAtIssue: order.status || "completed",
    issuedAt: order.paidAt || new Date(),
    issuedVia: input.source,
    createdAt: new Date(),
  };

  try {
    await col.createIndex({ invoiceNumber: 1 }, { unique: true });
    await col.createIndex({ orderNumber: 1 }, { unique: true });
    await col.createIndex({ userId: 1 });
  } catch {
    /* indexes already exist */
  }

  await col.insertOne(doc);
  await writeAudit(db, {
    action: "invoice.issued",
    targetType: "invoice",
    targetId: invoiceNumber,
    detail: `Invoice ${invoiceNumber} generated for order ${order.orderNumber} (PKR ${totalAmount})`,
    meta: { orderNumber: order.orderNumber, source: input.source },
    source: input.source.startsWith("webhook") ? "webhook" : "system",
  });
  return { invoice: doc, created: true };
}
