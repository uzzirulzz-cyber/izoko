// Rapid Gateway server-side payment client (Pay-In API).
//
// Vendor docs (rapidgateway.pk developer guide):
//   POST {RAPID_API_BASE}/v1/payments
//     Headers:
//       Authorization: Bearer <RAPID_SECRET_KEY>   (secret key — NEVER in browser)
//       Content-Type: application/json
//       Idempotency-Key: <stable per-order key>    (safe redelivery/retry)
//     Body:
//       amount        — major units (PKR), e.g. 4250
//       currency      — "PKR"
//       methods       — e.g. ["easypaisa","jazzcash","card","raast"]
//       customer      — { phone?: "+92..." } (E.164)
//       return_url    — where the hosted checkout redirects the customer
//       webhook_url   — signed webhook target (server-to-server truth)
//     Response:
//       { id, checkout_url } → redirect the customer to checkout_url
//
// Fulfillment rule: the return redirect is NEVER trusted — the order is
// marked paid exclusively by the verified webhook.

import { getRapidConfig } from "./gatewayConfig.js";

const RAPID_SECRET_KEY = process.env.RAPID_SECRET_KEY || "";

export interface RapidPaymentRequest {
  orderNumber: string;
  amount: number;
  currency?: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  customerIp?: string;
  bankCode?: number;
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

export async function createRapidPayment(
  req: RapidPaymentRequest
): Promise<RapidPaymentResult> {
  const cfg = await getRapidConfig();
  const secretKey = cfg.secretKey || RAPID_SECRET_KEY;

  if (!secretKey) {
    return { ok: false, error: "Rapid Gateway is not configured (no secret key)." };
  }

  const apiBase = (cfg.apiBase || "https://api.rapidgateway.pk").replace(/\/+$/, "");

  const body: Record<string, unknown> = {
    amount: Math.round(Number(req.amount) * 100) / 100,
    currency: (req.currency || "PKR").toUpperCase(),
    methods: cfg.methods.length ? cfg.methods : ["card", "easypaisa", "jazzcash", "raast"],
    merchantTransactionId: req.orderNumber,
    return_url: req.returnUrl,
    webhook_url: req.webhookUrl || cfg.webhookUrl,
  };

  const customer: Record<string, unknown> = {};
  if (req.customerPhone) customer.phone = req.customerPhone;
  if (req.customerName) customer.name = req.customerName;
  if (req.customerEmail) customer.email = req.customerEmail;
  if (Object.keys(customer).length) body.customer = customer;

  try {
    const res = await fetch(`${apiBase}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `playbeat-order-${req.orderNumber}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        error:
          (data && (data.message || data.error || data.error_description)) ||
          `Rapid Gateway rejected the payment request (${res.status}).`,
        raw: data,
      };
    }

    const paymentId = String(data?.id || data?.paymentId || "");
    const checkoutUrl = String(data?.checkout_url || data?.checkoutUrl || data?.redirect_url || "");

    if (!checkoutUrl) {
      return { ok: false, error: "Rapid Gateway did not return a checkout URL.", raw: data };
    }

    return { ok: true, paymentId, checkoutUrl, raw: data };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Rapid Gateway." };
  }
}
