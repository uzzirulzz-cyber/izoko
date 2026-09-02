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

export default async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (!requireUser(req, res)) return;

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

  // ============ POST /api/orders (create) ============
  if (!route && req.method === "POST") {
    try {
      const { items, customerName, customerEmail, totalAmount, currency = "PKR", paymentMethod = "Credit Card" } = req.body || {};
      if (!items || !Array.isArray(items) || items.length === 0) {
        return jsonError(res, "Cart items are required to create an order.", 400);
      }
      const db = await getDb();
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
          if (pid) {
            let doc: any = null;
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
          return { item, dbPrice };
        })
      );

      const processedItems = priceLookups.map(({ item, dbPrice }: any) => {
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

      const verifiedTotal = Number(
        processedItems.reduce(
          (sum: number, i: any) => sum + i.price * (i.quantity || 1),
          0
        ).toFixed(2)
      );

      const allKeys = processedItems.flatMap((i: any) => i.licenseKeys);
      const orderDoc = {
        orderNumber,
        userId: req.user.id,
        customerName: finalCustomerName,
        customerEmail: finalCustomerEmail,
        items: processedItems,
        // Server-recomputed total (client totalAmount kept only for reference)
        totalAmount: verifiedTotal,
        clientTotalAmount: Number(totalAmount) || 0,
        currency,
        status: "completed",
        paymentMethod,
        licenseKeysDelivered: allKeys,
        createdAt: new Date(),
      };

      const ordersCol = db.collection("orders");
      const insertResult = await ordersCol.insertOne(orderDoc);
      return jsonOk(res, {
        success: true,
        message: "Order placed successfully! Digital licenses allocated instantly.",
        order: { id: insertResult.insertedId.toString(), ...orderDoc },
      }, 201);
    } catch (err: any) {
      console.error("Order Creation Error:", err);
      return jsonError(res, err.message, 500);
    }
  }

  return jsonError(res, `Orders route not found: ${route}`, 404);
}
