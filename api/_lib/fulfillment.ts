// Digital delivery fulfillment — runs ONCE per order, triggered ONLY by a
// verified payment webhook (generic /api/payments/webhook or Rapid Gateway).
//
// Steps (all idempotent via the `fulfillments` ledger, unique orderNumber):
//   1. Guarantee license keys / activation codes exist for digital items
//      (keys are normally pre-allocated at order creation; this is the
//      safety net for legacy or partially-created orders).
//   2. Attach download links / activation notes from the product docs.
//   3. Write delivery_events (type license_issued / download_link / activation).
//   4. Auto-generate the invoice (ensureInvoiceForOrder).
//   5. Customer in-app notification (customer_notifications).
//   6. Confirmation email IF an email provider is configured (RESEND_API_KEY);
//      otherwise the in-app notification IS the delivery record and the
//      emailStatus is reported honestly as "unconfigured" — never faked.
//   7. Decrement stock for FINITE products (physical); digital/unlimited skip.
//   8. Audit log entry.

import { ObjectId } from "mongodb";
import { writeAudit } from "./audit.js";
import { ensureInvoiceForOrder } from "./invoice.js";
import { sendEmail, orderPaidEmail, isEmailConfigured } from "./email.js";

function genKey(skuHint: string): string {
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PB-${(skuHint || "KEY").toString().slice(0, 12).toUpperCase()}-${seg()}-${seg()}-${seg()}`;
}

export interface FulfillmentResult {
  ok: boolean;
  alreadyFulfilled?: boolean;
  invoiceNumber?: string;
  emailSent?: boolean;
  emailStatus?: string;
  notificationCreated?: boolean;
  keysEnsured?: number;
}

/**
 * Fulfill a paid order. Safe to call multiple times — the fulfillments ledger
 * makes the whole routine a no-op after the first successful run.
 */
export async function fulfillPaidOrder(
  db: any,
  order: any,
  opts: { source: string; eventId?: string }
): Promise<FulfillmentResult> {
  const orderNumber = String(order.orderNumber || "");
  if (!orderNumber) return { ok: false };

  // ---- Idempotency gate ----
  const fulCol = db.collection("fulfillments");
  try {
    await fulCol.createIndex({ orderNumber: 1 }, { unique: true });
  } catch {
    /* index exists */
  }
  try {
    await fulCol.insertOne({
      orderNumber,
      userId: order.userId || null,
      source: opts.source,
      eventId: opts.eventId || null,
      fulfilledAt: new Date(),
    });
  } catch (err: any) {
    if (err && (err.code === 11000 || /duplicate/i.test(err.message || ""))) {
      return { ok: true, alreadyFulfilled: true };
    }
    throw err;
  }

  const ordersCol = db.collection("orders");
  const productsCol = db.collection("products");
  const eventsCol = db.collection("delivery_events");
  const notifCol = db.collection("customer_notifications");
  const now = new Date();
  let keysEnsured = 0;

  // ---- 1+2. License keys, download links, activation codes ----
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsView: any[] = [];
  for (const it of items) {
    const view: any = { ...it };
    const isDigital = it.digital !== false && /instant|digital|email|activation/i.test(String(it.deliveryType || "Instant Auto-Email"));
    // Guarantee keys for digital items
    if (isDigital) {
      const existing = Array.isArray(it.licenseKeys) ? it.licenseKeys : [];
      const need = Math.max(0, Number(it.quantity || 1) - existing.length);
      if (need > 0) {
        const fresh = Array.from({ length: need }).map(() => genKey(it.sku || it.productId || "KEY"));
        view.licenseKeys = [...existing, ...fresh];
        keysEnsured += fresh.length;
        // Persist back onto the stored order item
        try {
          await ordersCol.updateOne(
            { _id: new ObjectId(order._id), "items.id": it.id },
            { $set: { "items.$.licenseKeys": view.licenseKeys } }
          );
        } catch { /* best-effort; ledger already prevents re-run */ }
      } else {
        view.licenseKeys = existing;
      }
    }
    // Product-level delivery assets (download link / activation note)
    let productDoc: any = null;
    try {
      const pid = it.productId || it.product?._id || it.product?.id;
      if (pid) {
        if (/^[0-9a-fA-F]{24}$/.test(String(pid))) productDoc = await productsCol.findOne({ _id: new ObjectId(String(pid)) });
        if (!productDoc) productDoc = await productsCol.findOne({ id: String(pid) });
      }
    } catch { /* asset enrichment is best-effort */ }
    view.downloadUrl = isDigital && productDoc?.downloadUrl ? String(productDoc.downloadUrl) : null;
    view.activationNotes = isDigital && productDoc?.activationNotes ? String(productDoc.activationNotes) : null;

    // ---- 3. Delivery events ----
    try {
      if (isDigital && (view.licenseKeys || []).length) {
        await eventsCol.insertOne({
          orderNumber,
          userId: order.userId || null,
          productId: it.productId || null,
          productName: it.name,
          type: "license_issued",
          keysMasked: view.licenseKeys.map((k: string) => `${String(k).slice(0, 8)}…`),
          quantity: Number(it.quantity || 1),
          source: opts.source,
          eventId: opts.eventId || null,
          at: now,
        });
      }
      if (view.downloadUrl) {
        await eventsCol.insertOne({
          orderNumber,
          userId: order.userId || null,
          productId: it.productId || null,
          productName: it.name,
          type: "download_link_attached",
          source: opts.source,
          at: now,
        });
      }
      if (!isDigital) {
        await eventsCol.insertOne({
          orderNumber,
          userId: order.userId || null,
          productId: it.productId || null,
          productName: it.name,
          type: "physical_dispatch_queued",
          deliveryType: it.deliveryType || "Courier Shipping",
          source: opts.source,
          at: now,
        });
      }
    } catch { /* event logging never blocks fulfillment */ }
    itemsView.push(view);
  }

  // ---- 7. Stock decrement for finite products (paid physical units leave stock) ----
  for (const it of items) {
    try {
      const pid = it.productId;
      if (!pid) continue;
      let doc: any = null;
      if (/^[0-9a-fA-F]{24}$/.test(String(pid))) doc = await productsCol.findOne({ _id: new ObjectId(String(pid)) });
      if (!doc) doc = await productsCol.findOne({ id: String(pid) });
      if (!doc) continue;
      const unlimited = doc.stockMode === "unlimited" || (doc.digital !== false && doc.productType !== "physical" && doc.stockMode !== "finite");
      if (unlimited) continue;
      await productsCol.updateOne(
        { _id: doc._id, stockMode: { $ne: "unlimited" } },
        { $inc: { stock: -Math.max(1, Number(it.quantity || 1)) } }
      );
      await db.collection("stock_movements").insertOne({
        productId: String(doc._id),
        productName: doc.name || it.name,
        delta: -Math.max(1, Number(it.quantity || 1)),
        reason: `order_paid:${orderNumber}`,
        actor: "system:webhook",
        at: now,
      });
    } catch { /* stock bookkeeping never blocks fulfillment */ }
  }

  // ---- 4. Invoice ----
  const freshOrder = { ...order, items: itemsView, paidAt: order.paidAt || now, status: "completed" };
  let invoiceNumber: string | undefined;
  try {
    const { invoice, created } = await ensureInvoiceForOrder(db, {
      order: freshOrder,
      source: opts.source.startsWith("webhook") ? `webhook:${opts.source.includes("rapid") ? "rapid" : "generic"}` : "system",
    });
    invoiceNumber = invoice?.invoiceNumber;
    if (!created) invoiceNumber = invoice?.invoiceNumber;
  } catch (err: any) {
    console.error("fulfillment: invoice creation failed:", err?.message);
  }

  // ---- 5. In-app notification (ALWAYS — also the email fallback) ----
  let notificationCreated = false;
  try {
    await notifCol.insertOne({
      userId: order.userId || null,
      type: "order_paid",
      orderNumber,
      title: `Payment verified — order ${orderNumber}`,
      body: `Your payment was verified and your digital items were released${invoiceNumber ? ` (invoice ${invoiceNumber})` : ""}. View license keys and your invoice in Account → Orders.`,
      read: false,
      createdAt: now,
    });
    notificationCreated = true;
  } catch { /* notification failure must not fail the webhook */ }

  // ---- 6. Confirmation email (only when a provider is configured) ----
  let emailSent = false;
  let emailStatus = isEmailConfigured() ? "attempted" : "email_not_configured";
  if (isEmailConfigured() && order.customerEmail) {
    const itemsHtml = itemsView
      .map(
        (i) => `<tr>
          <td style="padding:6px 4px;border-bottom:1px solid #eef0f6;">${i.name}${i.variantName ? ` <span style="color:#7a8299;">(${i.variantName})</span>` : ""}</td>
          <td align="right" style="padding:6px 4px;border-bottom:1px solid #eef0f6;">${i.quantity}</td>
          <td align="right" style="padding:6px 4px;border-bottom:1px solid #eef0f6;">PKR ${Number(i.amount ?? i.price * i.quantity).toLocaleString("en-PK")}</td>
        </tr>`
      )
      .join("");
    const keysHtml = itemsView.some((i) => (i.licenseKeys || []).length)
      ? `<div style="background:#f6f8ff;border:1px solid #e3e8ff;border-radius:10px;padding:12px 14px;margin:10px 0;font-size:13px;">
           <strong style="color:#10162b;">Your license keys</strong><br/>${itemsView
             .flatMap((i) => i.licenseKeys || [])
             .map((k) => `<code style="display:inline-block;background:#fff;border:1px solid #e3e8ff;border-radius:6px;padding:2px 8px;margin:4px 4px 0 0;">${k}</code>`)
             .join("")}
         </div>`
      : "";
    const emailRes = await sendEmail({
      to: order.customerEmail,
      subject: `PlayBeat Digital — Payment confirmed (${order.orderNumber})`,
      html: orderPaidEmail(freshOrder, itemsHtml, keysHtml),
    });
    emailSent = emailRes.sent;
    emailStatus = emailRes.sent ? "sent" : emailRes.reason || "send_failed";
  }

  // Record the delivery outcome on the order (honest, inspectable)
  try {
    await ordersCol.updateOne(
      { _id: new ObjectId(order._id) },
      {
        $set: {
          fulfillment: {
            fulfilledAt: now,
            source: opts.source,
            invoiceNumber: invoiceNumber || null,
            emailSent,
            emailStatus,
            notificationCreated,
            keysEnsured,
          },
        },
      }
    );
  } catch { /* non-blocking */ }

  // ---- 8. Audit ----
  await writeAudit(db, {
    action: "order.fulfilled",
    targetType: "order",
    targetId: orderNumber,
    detail: `Order ${orderNumber} fulfilled via ${opts.source}: invoice ${invoiceNumber || "n/a"}, email ${emailStatus}, notification ${notificationCreated ? "created" : "failed"}`,
    meta: { eventId: opts.eventId, keysEnsured, emailStatus, invoiceNumber },
    source: opts.source.startsWith("webhook") ? "webhook" : "system",
  });

  return { ok: true, invoiceNumber, emailSent, emailStatus, notificationCreated, keysEnsured };
}
