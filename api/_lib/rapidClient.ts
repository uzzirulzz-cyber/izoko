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
// Credentials come exclusively from the environment (fail-closed):
//   RAPID_SECRET_KEY  — secret key from the Rapid portal (required to charge)
//   RAPID_API_BASE    — defaults to https://api.rapidgateway.pk
//   RAPID_METHODS     — optional comma-separated list, default all three

import { PUBLIC_SITE_URL } from "./config.js";

export const RAPID_API_BASE = (
  process.env.RAPID_API_BASE || "https://api.rapidgateway.pk"
).replace(/\/+$/, "");
const RAPID_SECRET_KEY = process.env.RAPID_SECRET_KEY || "";
const RAPID_METHODS = (process.env.RAPID_METHODS || "easypaisa,jazzcash,card")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export function isRapidConfigured(): boolean {
  return Boolean(RAPID_SECRET_KEY);
}

export function rapidWebhookUrl(): string {
  return `${PUBLIC_SITE_URL.replace(/\/+$/, "")}/webhooks/rapid-gateway`;
}

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
  if (!RAPID_SECRET_KEY) {
    return { ok: false, error: "Rapid Gateway is not configured (missing RAPID_SECRET_KEY)." };
  }
  const body: Record<string, unknown> = {
    amount: Math.round(Number(req.amount) * 100) / 100, // major units, 2dp
    currency: (req.currency || "PKR").toUpperCase(),
    methods: RAPID_METHODS,
    merchantTransactionId: req.orderNumber,
    return_url: req.returnUrl,
    webhook_url: req.webhookUrl || rapidWebhookUrl(),
  };
  const customer: Record<string, unknown> = {};
  if (req.customerPhone) customer.phone = req.customerPhone; // E.164 per docs
  if (req.customerName) customer.name = req.customerName;
  if (req.customerEmail) customer.email = req.customerEmail;
  if (Object.keys(customer).length) body.customer = customer;

  try {
    const res = await fetch(`${RAPID_API_BASE}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RAPID_SECRET_KEY}`,
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
