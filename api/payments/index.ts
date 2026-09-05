// /api/payments/* — payment gateway webhook router
// Routes:
//   POST /api/payments/webhook  (gateway → server payment confirmation)
//
// Security model (per audit §14 — "Never trust payment success from the browser"):
//   1. The BROWSER never marks an order paid. Only this verified webhook does.
//   2. Every webhook request must carry an HMAC-SHA256 signature in the
//      `x-playbeat-signature` header, computed over the RAW request body with
//      the shared secret in env PAYMENT_WEBHOOK_SECRET.
//   3. Signature comparison is timing-safe.
//   4. Duplicate webhook deliveries are absorbed idempotently via the
//      `payment_events` collection (unique index on eventId) — replaying the
//      same event never double-fulfills an order.
//
// Connecting a real gateway:
//   - Set PAYMENT_WEBHOOK_SECRET in Vercel env vars.
//   - Point the gateway at https://playbeat.digital/api/payments/webhook
//   - Gateway payload: { eventId, type, orderNumber, status, amount?, currency? }
//     type:    "payment.succeeded" | "payment.failed" | "payment.refunded"
//     status:  "paid" | "failed" | "refunded"
import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "../_lib/mongo.js";
import { handleOptions, jsonOk, jsonError } from "../_lib/auth.js";
import { handleRapidGatewayWebhook } from "../_lib/rapidWebhook.js";

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || "";

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifySignature(rawBody: string, signature: string | undefined): boolean {
  if (!WEBHOOK_SECRET) return false; // no secret configured → reject everything
  if (!signature) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

const ALLOWED_STATUS = new Set(["paid", "failed", "refunded"]);
const ALLOWED_TYPES = new Set(["payment.succeeded", "payment.failed", "payment.refunded"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const url = new URL(req.url || "", "http://localhost");
  const route = url.pathname.split("/").filter(Boolean).slice(2)[0] || "";

  // Rapid Gateway webhook: gateway callbacks arrive server-to-server with no
  // user session — they are authenticated by HMAC signature inside the handler
  // itself (fail-closed). It lives inside this function because the Hobby
  // plan caps deployments at 12 serverless functions.
  // Dispatch conditions:
  //   - query ?rapid=1  → the /webhooks/rapid-gateway rewrite (destination must
  //     resolve to the bare function path; suffix destinations are NOT_FOUND)
  //   - route "rapid-gateway" → direct /api/payments/rapid-gateway calls
  if (route === "rapid-gateway" || url.searchParams.get("rapid") === "1") {
    return handleRapidGatewayWebhook(req, res);
  }

  if (route !== "webhook") return jsonError(res, "Payments route not found", 404);
  if (req.method !== "POST") return jsonError(res, "Method not allowed", 405);

  // ---- 1. Raw body + signature verification (server-side, always) ----
  const rawBody =
    typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  const signature =
    (req.headers["x-playbeat-signature"] as string | undefined) ||
    (req.headers["X-Playbeat-Signature"] as string | undefined);

  if (!verifySignature(rawBody, signature)) {
    // 403 (not 401) — the request is identified but its integrity failed.
    return jsonError(res, "Invalid webhook signature.", 403);
  }

  // ---- 2. Parse + validate payload ----
  let event: any;
  try {
    event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch {
    return jsonError(res, "Webhook body must be valid JSON.", 400);
  }

  const { eventId, type, orderNumber, status, amount, currency } = event || {};
  if (!eventId || !orderNumber || !status) {
    return jsonError(res, "eventId, orderNumber and status are required.", 400);
  }
  if (!ALLOWED_STATUS.has(status)) {
    return jsonError(res, `status must be one of: ${[...ALLOWED_STATUS].join(", ")}`, 400);
  }
  if (type && !ALLOWED_TYPES.has(type)) {
    return jsonError(res, `type must be one of: ${[...ALLOWED_TYPES].join(", ")}`, 400);
  }

  try {
    const db = await getDb();

    // ---- 3. Idempotency: absorb duplicate webhook deliveries safely ----
    const eventsCol = db.collection("payment_events");
    try {
      await eventsCol.createIndex({ eventId: 1 }, { unique: true });
    } catch {
      /* index already exists */
    }
    try {
      await eventsCol.insertOne({
        eventId: String(eventId),
        type: type || `payment.${status}`,
        orderNumber: String(orderNumber),
        receivedAt: new Date(),
      });
    } catch (err: any) {
      if (err && (err.code === 11000 || /duplicate/i.test(err.message || ""))) {
        // Same event already processed — acknowledge without side effects.
        return jsonOk(res, { success: true, duplicate: true, eventId });
      }
      throw err;
    }

    // ---- 4. Apply the status transition to the order ----
    const ordersCol = db.collection("orders");
    const order = await ordersCol.findOne({ orderNumber: String(orderNumber) });
    if (!order) {
      return jsonError(res, `Order ${orderNumber} not found.`, 404);
    }

    // Optional amount cross-check: if the gateway sends the paid amount and we
    // have a stored total, a mismatch is logged and the order is NOT marked paid.
    if (status === "paid" && typeof amount === "number" && order.totalAmount != null) {
      const expected = Number(order.totalAmount);
      if (Math.abs(Number(amount) - expected) > 0.01) {
        await ordersCol.updateOne(
          { _id: order._id },
          {
            $set: {
              paymentFlag: "amount_mismatch",
              paymentFlagDetail: {
                expected,
                received: Number(amount),
                currency: currency || order.currency || "PKR",
                eventId: String(eventId),
                at: new Date(),
              },
            },
          }
        );
        return jsonError(res, "Payment amount mismatch — order flagged for review.", 409);
      }
    }

    const statusMap: Record<string, { status: string; paidAt?: Date }> = {
      paid: { status: "completed", paidAt: new Date() },
      failed: { status: "payment_failed" },
      refunded: { status: "refunded" },
    };
    const update = statusMap[status];

    await ordersCol.updateOne(
      { _id: new ObjectId(order._id as any) },
      {
        $set: {
          ...update,
          paymentStatus: status,
          paymentUpdatedAt: new Date(),
          lastPaymentEventId: String(eventId),
        },
      }
    );

    return jsonOk(res, {
      success: true,
      orderNumber,
      paymentStatus: status,
      orderStatus: update.status,
    });
  } catch (err: any) {
    console.error("Payment Webhook Error:", err);
    return jsonError(res, err.message || "Webhook processing failed.", 500);
  }
}
