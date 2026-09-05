// Rapid Gateway server-side payment client (Pay-In API).
//
// Vendor docs (rapidgateway.pk developer guide — JazzCash/easypaisa integration):
//   POST {RAPID_API_BASE}/v1/payments
//     Headers:
//       Authorization: Bearer <RAPID_SECRET_KEY>   (secret key — NEVER in browser)
//       Content-Type: application/json
//       Idempotency-Key: <stable per-order key>    (safe redelivery/retry)
//     Body:
//       amount        — major units (PKR), e.g. 4250
//       currency      — "PKR"
//       methods       — e.g. ["easypaisa","jazzcash","card"]
//       customer      — { phone?: "+92..." } (E.164)
//       return_url    — where the hosted checkout redirects the customer
//       webhook_url   — signed webhook target (server-to-server truth)
//     Response:
//       { id, checkout_url } → redirect the customer to checkout_url
//
// Fulfillment rule (audit §14): the return redirect is NEVER trusted — the
// order is marked paid exclusively by the verified webhook at
// /webhooks/rapid-gateway (see api/_lib/rapidWebhook.ts).
//
// Credentials resolution order (runtime, per request):
//   1. gateway_config Mongo collection (admin-panel managed, encrypted) — see
//      api/_lib/gatewayConfig.ts
//   2. environment variables (bootstrap fallback)
// Fail-closed: if neither is present the client refuses to charge.

import { getRapidConfig } from "./gatewayConfig.js";

export interface RapidPaymentRequest {
  orderNumber: string;
  amount: number; // major units
  currency?: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  returnUrl: string;
  webhookUrl?: string;
}

export interface RapidPaymentResult {
  ok: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  raw?: any;
  error?: string;
}

/**
 * Create a hosted-checkout payment intent on Rapid Gateway.
 * Idempotent per orderNumber: Rapid's Idempotency-Key guarantees that retrying
 * a timeout never double-charges the customer.
 */
export async function createRapidPayment(
  req: RapidPaymentRequest
): Promise<RapidPaymentResult> {
  const cfg = await getRapidConfig();
  if (!cfg.secretKey) {
    return { ok: false, error: "Rapid Gateway is not configured (no secret key — set it in Admin → Payment Gateway)." };
  }
  const body: Record<string, unknown> = {
    amount: Math.round(Number(req.amount) * 100) / 100, // major units, 2dp
    currency: (req.currency || "PKR").toUpperCase(),
    methods: cfg.methods,
    merchantTransactionId: req.orderNumber,
    return_url: req.returnUrl,
    webhook_url: req.webhookUrl || cfg.webhookUrl,
  };
  const customer: Record<string, unknown> = {};
  if (req.customerPhone) customer.phone = req.customerPhone; // E.164 per docs
  if (req.customerName) customer.name = req.customerName;
  if (req.customerEmail) customer.email = req.customerEmail;
  if (Object.keys(customer).length) body.customer = customer;

  try {
    const res = await fetch(`${cfg.apiBase}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.secretKey}`,
        "Content-Type": "application/json",
        // Idempotent per order — retries cannot create a second charge.
        "Idempotency-Key": `playbeat-order-${req.orderNumber}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error:
          (data && (data.message || data.error)) ||
          `Rapid Gateway rejected the payment request (${res.status}).`,
        raw: data,
      };
    }
    const paymentId = String(data?.id || "");
    const checkoutUrl = String(data?.checkout_url || data?.checkoutUrl || "");
    if (!checkoutUrl) {
      return { ok: false, error: "Rapid Gateway did not return a checkout URL.", raw: data };
    }
    return { ok: true, paymentId, checkoutUrl, raw: data };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Rapid Gateway." };
  }
}
