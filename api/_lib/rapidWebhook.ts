// /webhooks/rapid-gateway — Rapid Gateway payment webhook receiver
// (vendor docs: rapidgateway.pk → Resources → Payment Webhooks Guide)
//
// Delivery model (per Rapid Gateway docs):
//   POST JSON + X-RapidGateway-* headers. Any non-2xx response — or a timeout
//   beyond 15 seconds — triggers automatic retries at ~30s, 2m, 10m, 1h and 6h
//   (6 attempts total), then the event is dead-lettered.
//
// Signature scheme (per docs — verify on EVERY webhook):
//   - X-RapidGateway-Signature: UPPERCASE hex HMAC-SHA256
//   - message  = timestamp + "." + rawBody        (raw bytes, never re-serialized)
//   - secret   = the webhook "salt" from the portal (env RAPID_WEBHOOK_SECRET)
//   - X-RapidGateway-Timestamp: unix seconds; reject if more than 5 minutes old
//   - constant-time comparison
//   - during a salt rotation accept the current OR previous salt
//     (env RAPID_WEBHOOK_SECRET_PREVIOUS)
//   - legacy X-RapidPay-* header aliases exist but the X-RapidGateway-* headers
//     are authoritative and always sent — only those are trusted here.
//
// Event types:
//   transaction.completed  → payment succeeded
//   transaction.failed     → payment failed / declined
//   refund.completed / refund.failed
//   reversal.completed / reversal.failed
//   webhook.test           → portal test-fire (no order side effects)
//
// Mapping to PlayBeat orders (audit §14 — never trust payment success from the
// browser; the order is ONLY ever marked paid here, from a verified webhook):
//   merchantTransactionId = PlayBeat orderNumber (PB-XXXXXX-XXX)
//   transaction.completed → paymentStatus "paid",     orderStatus "completed"
//   transaction.failed    → paymentStatus "failed",   orderStatus "payment_failed"
//   refund.completed      → paymentStatus "refunded", orderStatus "refunded"
//   reversal.completed    → paymentStatus "refunded", orderStatus "refunded" (void)
//   refund/reversal.failed → no transition; delivery logged for manual review
//
// Idempotency: payment_events (unique index on eventId) absorbs duplicate
// deliveries — replaying the same event never double-fulfills an order.
// Amount cross-check: a paid amount that disagrees with the server-recomputed
// order total flags the order for review instead of fulfilling it.
//
// Fail-closed: if no salt is configured in the environment, every delivery is
// rejected with 503 (Rapid will retry, giving time to fix the configuration).

import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./mongo.js";
import { handleOptions, jsonOk, jsonError } from "./auth.js";

const WEBHOOK_SECRET = process.env.RAPID_WEBHOOK_SECRET || "";
const WEBHOOK_SECRET_PREVIOUS = process.env.RAPID_WEBHOOK_SECRET_PREVIOUS || "";
const MAX_TIMESTAMP_SKEW = 300; // seconds — Rapid docs: reject if > 5 minutes

// ---------------------------------------------------------------------------
// Raw body capture.
// The signature is computed over the RAW request bytes, so we must avoid
// re-serializing JSON whenever possible. Depending on the runtime mode, the
// body may still be available in one of three places:
//   1. req.body as a string (parsing skipped / JSON parse failed)
//   2. the request stream itself (Fluid compute parses lazily — reading the
//      stream first keeps the bytes byte-exact)
//   3. req.body as a parsed object → JSON.stringify round-trip (last resort —
//      byte equality is NOT guaranteed; delivery is fully logged for diagnosis
//      and Rapid's retry schedule allows a fix + redelivery)
// ---------------------------------------------------------------------------
async function captureRawBody(
  req: VercelRequest
): Promise<{ candidates: string[]; via: string }> {
  if (typeof req.body === "string" && req.body.length > 0) {
    return { candidates: [req.body], via: "body-string" };
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req as unknown as AsyncIterable<unknown>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    if (chunks.length) {
      return { candidates: [Buffer.concat(chunks).toString("utf8")], via: "stream" };
    }
  } catch {
    /* stream already consumed by an eager parser — fall through */
  }
  if (req.body && typeof req.body === "object") {
    return { candidates: [JSON.stringify(req.body)], via: "re-serialize" };
  }
  return { candidates: [], via: "empty" };
}

function verifyRapidSignature(
  salt: string,
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  if (!salt || !timestamp || !rawBody || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_TIMESTAMP_SKEW) return false;
  const expected = crypto
    .createHmac("sha256", salt)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")
    .toUpperCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).trim().toUpperCase());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Event type → order transition map. null = acknowledge, no order side effects.
const TRANSITIONS: Record<
  string,
  { paymentStatus: string; orderStatus: string; markPaid?: boolean } | null
> = {
  "transaction.completed": { paymentStatus: "paid", orderStatus: "completed", markPaid: true },
  "transaction.failed": { paymentStatus: "failed", orderStatus: "payment_failed" },
  "refund.completed": { paymentStatus: "refunded", orderStatus: "refunded" },
  "reversal.completed": { paymentStatus: "refunded", orderStatus: "refunded" },
  "refund.failed": null,
  "reversal.failed": null,
  "webhook.test": null,
};

function header(req: VercelRequest, name: string): string {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v || "";
}

export async function handleRapidGatewayWebhook(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") {
    return jsonError(res, "Rapid Gateway webhooks are POST-only.", 405);
  }

  const sigHeader = header(req, "x-rapidgateway-signature");
  const tsHeader = header(req, "x-rapidgateway-timestamp");
  const eventHeader = header(req, "x-rapidgateway-event");
  const deliveryHeader = header(req, "x-rapidgateway-delivery");

  const { candidates, via } = await captureRawBody(req);

  // ---- 0. Fail-closed configuration guard ----
  if (!WEBHOOK_SECRET && !WEBHOOK_SECRET_PREVIOUS) {
    console.error(
      "rapid-webhook: RAPID_WEBHOOK_SECRET not configured — rejecting delivery (fail closed)"
    );
    return jsonError(res, "Webhook endpoint not configured.", 503);
  }

  // ---- 1. Signature verification (every webhook, before any parsing/trust) ----
  let verified = false;
  let verifiedVia = "";
  for (const raw of candidates) {
    const salts = [WEBHOOK_SECRET, WEBHOOK_SECRET_PREVIOUS].filter(Boolean);
    for (const salt of salts) {
      if (verifyRapidSignature(salt, tsHeader, raw, sigHeader)) {
        verified = true;
        verifiedVia = `${via}${salts.length > 1 && salt === WEBHOOK_SECRET_PREVIOUS ? " (previous salt)" : ""}`;
        break;
      }
    }
    if (verified) break;
  }

  if (!verified) {
    // Log the rejected delivery for diagnosis (best-effort — never blocks).
    // 403 (not 401): request identified as a webhook, integrity failed.
    try {
      const db = await getDb();
      await db.collection("rapid_webhook_log").insertOne({
        verified: false,
        rejectReason: !candidates.length ? "empty-body" : "signature-mismatch",
        bodyCaptureVia: via,
        bodyPreview: (candidates[0] || "").slice(0, 2000),
        headers: {
          signature: sigHeader ? String(sigHeader).slice(0, 128) : "",
          timestamp: tsHeader,
          event: eventHeader,
          delivery: deliveryHeader,
        },
        receivedAt: new Date(),
      });
    } catch (e) {
      console.error("rapid-webhook: failed to log unverified delivery", e);
    }
    return jsonError(res, "Invalid webhook signature.", 403);
  }

  // ---- 2. Parse the (now authenticated) payload ----
  let body: any;
  try {
    body = JSON.parse(candidates[0]);
  } catch {
    return jsonError(res, "Webhook body must be valid JSON.", 400);
  }

  const eventId = String(body?.eventId || deliveryHeader || "");
  const eventType = String(body?.eventType || eventHeader || "");
  const merchantTxnId = String(
    body?.merchantTransactionId ?? body?.reference ?? body?.orderNumber ?? ""
  ).trim();
  const gatewayTxnRef = String(body?.gatewayTxnRef || "");
  const environment = String(body?.environment || "");

  if (!eventId || !eventType) {
    return jsonError(res, "eventId and eventType are required.", 400);
  }

  try {
    const db = await getDb();
    const logCol = db.collection("rapid_webhook_log");
    const ordersCol = db.collection("orders");
    const eventsCol = db.collection("payment_events");

    // ---- 3. Test-fire from the portal: acknowledge, no order side effects ----
    if (eventType === "webhook.test") {
      try {
        await logCol.insertOne({
          verified: true,
          verifiedVia,
          eventId,
          eventType,
          environment,
          action: "test_acknowledged",
          receivedAt: new Date(),
        });
      } catch (e) {
        console.error("rapid-webhook: log write failed", e);
      }
      return jsonOk(res, { success: true, test: true, eventId });
    }

    const transition = TRANSITIONS[eventType];

    // ---- 4. Unknown / non-order event types: acknowledge + log ----
    if (transition === undefined || transition === null) {
      try {
        await logCol.insertOne({
          verified: true,
          verifiedVia,
          eventId,
          eventType,
          merchantTransactionId: merchantTxnId,
          gatewayTxnRef,
          status: body?.status,
          amount: body?.amount,
          currency: body?.currency,
          environment,
          action:
            transition === null
              ? "logged_no_transition"
              : "ignored_unknown_event_type",
          receivedAt: new Date(),
        });
      } catch (e) {
        console.error("rapid-webhook: log write failed", e);
      }
      return jsonOk(res, {
        success: true,
        eventId,
        ignored: transition === null ? "no_transition_for_event_type" : "unknown_event_type",
      });
    }

    // ---- 5. Idempotency: absorb Rapid's redeliveries (unique eventId) ----
    try {
      await eventsCol.createIndex({ eventId: 1 }, { unique: true });
    } catch {
      /* index already exists */
    }
    try {
      await eventsCol.insertOne({
        eventId,
        type: eventType,
        orderNumber: merchantTxnId,
        source: "rapid-gateway",
        environment,
        receivedAt: new Date(),
      });
    } catch (err: any) {
      if (err && (err.code === 11000 || /duplicate/i.test(err.message || ""))) {
        return jsonOk(res, { success: true, duplicate: true, eventId });
      }
      throw err;
    }

    // ---- 6. Locate the order ----
    let order: any = null;
    const lookupAttempts: string[] = [];
    if (merchantTxnId) {
      lookupAttempts.push(`orderNumber:${merchantTxnId}`);
      order = await ordersCol.findOne({ orderNumber: merchantTxnId });
    }
    if (!order && body?.metadata?.orderNumber) {
      lookupAttempts.push(`metadata.orderNumber:${body.metadata.orderNumber}`);
      order = await ordersCol.findOne({ orderNumber: String(body.metadata.orderNumber) });
    }
    if (!order && body?.metadata?.orderId && /^[0-9a-fA-F]{24}$/.test(String(body.metadata.orderId))) {
      lookupAttempts.push(`metadata.orderId:${body.metadata.orderId}`);
      try {
        order = await ordersCol.findOne({ _id: new ObjectId(String(body.metadata.orderId)) });
      } catch {
        /* bad id shape — ignore */
      }
    }

    if (!order) {
      // 200 (not 404): retrying a permanently-unknown reference is pointless —
      // Rapid's portal history + our audit log keep the event reconcilable.
      try {
        await logCol.insertOne({
          verified: true,
          verifiedVia,
          eventId,
          eventType,
          merchantTransactionId: merchantTxnId,
          gatewayTxnRef,
          status: body?.status,
          amount: body?.amount,
          currency: body?.currency,
          environment,
          action: "order_not_found",
          lookupAttempts,
          receivedAt: new Date(),
        });
      } catch (e) {
        console.error("rapid-webhook: log write failed", e);
      }
      return jsonOk(res, { success: true, matched: false, eventId, orderNumber: merchantTxnId });
    }

    // ---- 7. Amount cross-check on paid events (server-recomputed total wins) ----
    if (transition.markPaid && body?.amount != null && order.totalAmount != null) {
      const expectedAmount = Number(order.totalAmount);
      const receivedAmount = Number(body.amount);
      if (
        Number.isFinite(expectedAmount) &&
        Number.isFinite(receivedAmount) &&
        Math.abs(receivedAmount - expectedAmount) > 0.01
      ) {
        await ordersCol.updateOne(
          { _id: new ObjectId(order._id as any) },
          {
            $set: {
              paymentFlag: "amount_mismatch",
              paymentFlagDetail: {
                expected: expectedAmount,
                received: receivedAmount,
                currency: body?.currency || order.currency || "PKR",
                gateway: "rapid",
                gatewayTxnRef,
                eventId,
                at: new Date(),
              },
            },
          }
        );
        try {
          await logCol.insertOne({
            verified: true,
            verifiedVia,
            eventId,
            eventType,
            orderNumber: order.orderNumber,
            merchantTransactionId: merchantTxnId,
            gatewayTxnRef,
            amount: receivedAmount,
            expectedAmount,
            currency: body?.currency,
            environment,
            action: "flagged_amount_mismatch",
            receivedAt: new Date(),
          });
        } catch (e) {
          console.error("rapid-webhook: log write failed", e);
        }
        // 200: the event IS handled (order flagged for review) — a retry would
        // not change the amount, so we acknowledge instead of dead-lettering.
        return jsonOk(res, {
          success: true,
          matched: true,
          flagged: "amount_mismatch",
          eventId,
          orderNumber: order.orderNumber,
        });
      }
    }

    // ---- 8. Apply the status transition ----
    const now = new Date();
    await ordersCol.updateOne(
      { _id: new ObjectId(order._id as any) },
      {
        $set: {
          status: transition.orderStatus,
          paymentStatus: transition.paymentStatus,
          ...(transition.markPaid ? { paidAt: now } : {}),
          paymentUpdatedAt: now,
          lastPaymentEventId: eventId,
          gatewayName: "rapid",
          gatewayTxnRef,
          gatewayEnvironment: environment,
        },
      }
    );

    try {
      await logCol.insertOne({
        verified: true,
        verifiedVia,
        eventId,
        eventType,
        orderNumber: order.orderNumber,
        merchantTransactionId: merchantTxnId,
        gatewayTxnRef,
        status: body?.status,
        amount: body?.amount,
        currency: body?.currency,
        environment,
        action: "order_updated",
        appliedPaymentStatus: transition.paymentStatus,
        appliedOrderStatus: transition.orderStatus,
        receivedAt: now,
      });
    } catch (e) {
      console.error("rapid-webhook: log write failed", e);
    }

    return jsonOk(res, {
      success: true,
      matched: true,
      eventId,
      orderNumber: order.orderNumber,
      paymentStatus: transition.paymentStatus,
      orderStatus: transition.orderStatus,
    });
  } catch (err: any) {
    console.error("rapid-webhook: processing error", err);
    // 500 → Rapid retries per its schedule (30s/2m/10m/1h/6h).
    return jsonError(res, err?.message || "Webhook processing failed.", 500);
  }
}
