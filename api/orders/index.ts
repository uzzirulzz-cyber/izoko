// /api/orders/* — consolidated orders router
// Routes:
//   POST /api/orders      (create order — requires signed-in user)
//   GET  /api/orders/me   (list current user's orders)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import {
  handleOptions,
  jsonOk,
  jsonError,
  requireUser,
  AuthenticatedRequest,
} from "../_lib/auth.js";
import {
  validateCoupon,
  CouponValidationError,
  recordCouponRedemption,
} from "../_lib/coupons.js";

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!requireUser(req, res)) return;

  /** Out-of-stock rejection — customer-safe message, mapped to HTTP 409. */
  class StockError extends Error {
    constructor(name: string, stock: number) {
      super(
        stock === 0
          ? `${name} is currently out of stock. Please remove it from your cart to continue.`
          : `Only ${stock} left in stock for ${name}. Please adjust the quantity.`
      );
    }
  }

  // Extract sub-path from req.url (Vercel rewrites /api/auth/:path* → /api/auth)
  // So we parse the ORIGINAL path from req.url to get the sub-route
  const url = new URL(req.url || '', 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  // Drop the first 2 segments ("api", "auth" or "products" etc.)
  const pathSegments = parts.slice(2);
  const route = pathSegments[0] || "";

  // ============ GET /api/orders/me ============
  if (route === "me" && req.method === "GET") {
    try {
      const db = await getDb();
      const ordersCol = db.collection("orders");
      const orders = await ordersCol
        .find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return jsonOk(res, { success: true, orders });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ GET /api/orders/mine/:orderNumber ============
  // Owner-scoped single order — powers the payment result page and account
  // dashboard. License keys are ONLY returned once the order is paid
  // (pending Rapid orders never expose keys, no matter how they were created).
  if (pathSegments[0] === "mine" && pathSegments[1] && req.method === "GET") {
    try {
      const orderNumber = String(pathSegments[1]);
      const db = await getDb();
      const order = await db
        .collection("orders")
        .findOne({ orderNumber, userId: req.user.id });
      if (!order) return jsonError(res, "Order not found.", 404);
      const paid =
        order.paymentStatus === "paid" ||
        (order.status === "completed" && order.paymentStatus !== "pending");
      const safe = { ...order };
      if (!paid) {
        delete (safe as any).licenseKeysDelivered;
        safe.items = (safe.items || []).map((it: any) => ({ ...it, licenseKeys: [] }));
      }
      return jsonOk(res, { success: true, order: safe, paid });
    } catch (err: any) {
      return jsonError(res, err.message, 500);
    }
  }

  // ============ POST /api/orders (create) ============
  if (!route && req.method === "POST") {
    try {
      const { items, customerName, customerEmail, totalAmount, currency = "PKR", paymentMethod = "Credit Card", couponCode, clientRequestId } = req.body || {};
      if (!items || !Array.isArray(items) || items.length === 0) {
        return jsonError(res, "Cart items are required to create an order.", 400);
      }
      const db = await getDb();

      // ---- Idempotency: a repeated submit (double-click, retried fetch,
      // flaky network) must never create a second order. When the client
      // sends a stable clientRequestId and an order already exists for it,
      // the ORIGINAL order is returned unchanged. ----
      if (clientRequestId) {
        const existing = await db
          .collection("orders")
          .findOne({ userId: req.user.id, clientRequestId: String(clientRequestId).slice(0, 64) });
        if (existing) {
          const wasRapid = existing.paymentProvider === "rapid";
          return jsonOk(
            res,
            {
              success: true,
              duplicate: true,
              message: "Order already exists for this checkout session.",
              order: wasRapid
                ? {
                    id: String(existing._id),
                    orderNumber: existing.orderNumber,
                    subtotalAmount: existing.subtotalAmount,
                    coupon: existing.coupon,
                    discountAmount: existing.discountAmount,
                    totalAmount: existing.totalAmount,
                    currency: existing.currency,
                    status: "pending",
                    paymentStatus: "pending",
                    paymentMethod: "Rapid Gateway",
                  }
                : { id: String(existing._id), ...existing },
            },
            200
          );
        }
      }

      const usersCol = db.collection("users");
      const authedUser = await usersCol.findOne({ _id: new ObjectId(req.user.id) });
      if (!authedUser) {
        return jsonError(res, "Authentication required to place an order.", 401);
      }
      const finalCustomerName = customerName || authedUser.name || "PlayBeat Customer";
      const finalCustomerEmail = customerEmail || authedUser.email || "customer@playbeat.digital";
      const orderNumber = `PB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // ---- Server-side price verification (audit §14: never trust the browser) ----
      // Recompute each line's unit price from the products collection when the
      // product exists in the database; fall back to the client price only for
      // items that are not in the DB. The order total is ALWAYS recomputed
      // server-side — the client-sent totalAmount is ignored.
      const productsCol = db.collection("products");
      const priceLookups = await Promise.all(
        items.map(async (item: any) => {
          const pid = item.product?._id || item.product?.id;
          let dbPrice: number | null = null;
          let doc: any = null;
          if (pid) {
            try {
              if (/^[0-9a-fA-F]{24}$/.test(String(pid))) {
                doc = await productsCol.findOne({ _id: new ObjectId(String(pid)) });
              }
              if (!doc) doc = await productsCol.findOne({ id: String(pid) });
            } catch {
              /* lookup failure → fall back to client price below */
            }
            if (doc) {
              dbPrice = typeof doc.price === "number" ? doc.price : Number(doc.price) || null;
              // Variant price override: match the selected variant by name/id
              if (
                item.selectedVariant &&
                Array.isArray(doc.variants) &&
                doc.variants.length > 0
              ) {
                const v = doc.variants.find(
                  (x: any) =>
                    (item.selectedVariant.id && x.id === item.selectedVariant.id) ||
                    (item.selectedVariant.name && x.name === item.selectedVariant.name)
                );
                if (v && typeof v.price === "number") dbPrice = v.price;
              }
            }
          }
          return { item, dbPrice, dbDoc: doc };
        })
      );

      const processedItems = priceLookups.map(({ item, dbPrice, dbDoc }: any) => {
        // ---- Stock guard: reject (never silently clamp) when the DB product
        // tracks stock and the requested quantity exceeds it ----
        if (
          dbDoc &&
          typeof dbDoc.stock === "number" &&
          dbDoc.stock >= 0 &&
          (item.quantity || 1) > dbDoc.stock
        ) {
          throw new StockError(item.product?.name || "An item", dbDoc.stock);
        }
        const isDigital = item.product?.digital !== false;
        const generatedKeys = isDigital
          ? Array.from({ length: item.quantity || 1 }).map(
              () =>
                `PB-${item.product?.sku || "KEY"}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            )
          : [];
        const unitPrice =
          dbPrice != null
            ? dbPrice // verified server-side
            : Number(item.unitPrice) || Number(item.product?.price) || 0;
        return {
          id: item.product?.id || `item-${Date.now()}`,
          productId: item.product?.id || item.product?._id,
          name: item.product?.name || "PlayBeat Product",
          price: unitPrice,
          clientPrice: Number(item.unitPrice) || 0,
          priceVerified: dbPrice != null,
          quantity: item.quantity || 1,
          variantName: item.selectedVariant?.name,
          licenseKeys: generatedKeys,
          deliveryType: item.product?.deliveryType || (isDigital ? "Instant Auto-Email" : "Courier Shipping"),
        };
      });

      const verifiedSubtotal = Number(
        processedItems.reduce(
          (sum: number, i: any) => sum + i.price * (i.quantity || 1),
          0
        ).toFixed(2)
      );

      // ---- Server-side coupon validation (audit §14: never trust the client).
      // The discount is recomputed from the VERIFIED subtotal — a coupon that
      // was valid in the cart but not at order time (expired / min-spend) is
      // rejected here instead of silently changing the price. ----
      let couponDiscount = 0;
      let appliedCoupon: Record<string, any> | null = null;
      if (couponCode) {
        try {
          const { coupon, discount } = await validateCoupon(couponCode, verifiedSubtotal);
          couponDiscount = discount;
          appliedCoupon = { code: coupon.code, type: coupon.type, value: coupon.value, discount };
        } catch (err: any) {
          if (err instanceof CouponValidationError) {
            return jsonError(res, `Coupon rejected: ${err.message}`, 409);
          }
          throw err;
        }
      }

      const verifiedTotal = Number(Math.max(0, verifiedSubtotal - couponDiscount).toFixed(2));

      const allKeys = processedItems.flatMap((i: any) => i.licenseKeys);

      // Rapid Gateway orders start PENDING — the verified webhook at
      // /webhooks/rapid-gateway is the ONLY thing that may mark them paid
      // (audit §14: never trust payment success from the browser). The server
      // has pre-allocated the license keys in this document, but they are NOT
      // returned to the client and are stripped from customer reads until the
      // webhook confirms payment.
      const isRapidPayment =
        paymentMethod === "rapid" ||
        paymentMethod === "rapid-gateway" ||
        paymentMethod === "Rapid Gateway";

      const orderDoc: Record<string, any> = {
        orderNumber,
        userId: req.user.id,
        ...(clientRequestId ? { clientRequestId: String(clientRequestId).slice(0, 64) } : {}),
        customerName: finalCustomerName,
        customerEmail: finalCustomerEmail,
        items: processedItems,
        // Server-recomputed total (client totalAmount kept only for reference)
        subtotalAmount: verifiedSubtotal,
        ...(appliedCoupon ? { coupon: appliedCoupon, discountAmount: couponDiscount } : {}),
        totalAmount: verifiedTotal,
        clientTotalAmount: Number(totalAmount) || 0,
        currency,
        status: isRapidPayment ? "pending" : "completed",
        paymentMethod: isRapidPayment ? "Rapid Gateway" : paymentMethod,
        paymentStatus: isRapidPayment ? "pending" : "paid",
        ...(isRapidPayment ? { paymentProvider: "rapid" } : {}),
        licenseKeysDelivered: allKeys,
        createdAt: new Date(),
      };

      const ordersCol = db.collection("orders");
      const insertResult = await ordersCol.insertOne(orderDoc);

      // Coupon bookkeeping after the order is persisted (never blocks)
      if (appliedCoupon) await recordCouponRedemption(appliedCoupon.code);

      // Pending Rapid orders: never echo keys or act like payment happened.
      const responseBody = isRapidPayment
        ? {
            success: true,
            message: "Order created — awaiting payment.",
            order: {
              id: insertResult.insertedId.toString(),
              orderNumber,
              subtotalAmount: verifiedSubtotal,
              ...(appliedCoupon ? { coupon: appliedCoupon, discountAmount: couponDiscount } : {}),
              totalAmount: verifiedTotal,
              currency,
              status: "pending",
              paymentStatus: "pending",
              paymentMethod: "Rapid Gateway",
            },
          }
        : {
            success: true,
            message: "Order placed successfully! Digital licenses allocated instantly.",
            order: { id: insertResult.insertedId.toString(), ...orderDoc },
          };
      return jsonOk(res, responseBody, 201);
    } catch (err: any) {
      if (err instanceof StockError) {
        return jsonError(res, err.message, 409);
      }
      console.error("Order Creation Error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  return jsonError(res, `Orders route not found: ${route}`, 404);
}
