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

      const processedItems = items.map((item: any) => {
        const isDigital = item.product?.digital !== false;
        const generatedKeys = isDigital
          ? Array.from({ length: item.quantity || 1 }).map(
              () =>
                `PB-${item.product?.sku || "KEY"}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            )
          : [];
        return {
          id: item.product?.id || `item-${Date.now()}`,
          productId: item.product?.id || item.product?._id,
          name: item.product?.name || "PlayBeat Product",
          price: item.unitPrice || item.product?.price || 0,
          quantity: item.quantity || 1,
          variantName: item.selectedVariant?.name,
          licenseKeys: generatedKeys,
          deliveryType: item.product?.deliveryType || (isDigital ? "Instant Auto-Email" : "Courier Shipping"),
        };
      });

      const allKeys = processedItems.flatMap((i: any) => i.licenseKeys);
      const orderDoc = {
        orderNumber,
        userId: req.user.id,
        customerName: finalCustomerName,
        customerEmail: finalCustomerEmail,
        items: processedItems,
        totalAmount: Number(totalAmount) || 0,
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
