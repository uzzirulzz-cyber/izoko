// Rapid Gateway server-side payment client (OAuth2 + Pay-In API).
//
// Two-step flow per Rapid Gateway developer docs (contract verified live
// against secure.rapid-gateway.com — see worklog Task 55):
//   Step 1: POST https://secure.rapid-gateway.com/oauth2/token
//     Headers:
//       Authorization: Basic base64(merchantId:clientSecret)
//       Content-Type: application/x-www-form-urlencoded
//     Body: grant_type=client_credentials
//     Response: { access_token, token_type: "Bearer", expires_in: ~299 }
//
//   Step 2: POST https://secure.rapid-gateway.com/api/v1/payments/process
//     (same JSON API generation as /api/v1/payments/refunds — the legacy
//      /rapid/process-transaction path is DEAD: it 415s on application/json
//      and was never the correct contract)
//     Headers:
//       Authorization: Bearer <access_token from step 1>
//       Content-Type: application/json
//     Body (validated field-by-field against the live gateway):
//       merchantId      number   (required)
//       basketId        string   (required — our order number)
//       amount          number   (required)
//       currencyCode    string   (required — "PKR")
//       callbackUrl     string   (required — customer-facing return URL)
//       accountNumber   string   (required — 6-24 digits; customer phone
//                                 digits or order-number digits fallback)
//       customerIp      string   (required)
//       orderDescription string  (required)
//       bankCode        number   (required — positive code; 1 = default)
//       webhookUrl      string   (optional — unknown fields are tolerated)
//     Response: hosted-checkout reference/URL → redirect customer there.
//
// Fulfillment rule: the return redirect is NEVER trusted — the order is
// marked paid exclusively by the verified webhook.

import { getRapidConfig } from "./gatewayConfig.js";

const RAPID_MERCHANT_ID = process.env.RAPID_MERCHANT_ID || "";
const RAPID_SECRET_KEY = process.env.RAPID_SECRET_KEY || "";

export interface RapidPaymentRequest {
  orderNumber: string;
  amount: number;
  currency?: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
  returnUrl: string;
  webhookUrl?: string;
  customerIp?: string;
  bankCode?: number;
}

export interface RapidPaymentResult {
  ok: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  raw?: any;
  error?: string;
}

// Cached OAuth2 token (expires in ~299s, we refresh at 250s)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Step 1: Get an OAuth2 access token from Rapid Gateway.
 * Uses client_credentials grant with Basic auth (merchantId:clientSecret).
 */
async function getRapidAccessToken(): Promise<string | null> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const cfg = await getRapidConfig();
  const merchantId = RAPID_MERCHANT_ID || (cfg as any)?.merchantId || "";
  const clientSecret = cfg.secretKey || RAPID_SECRET_KEY;

  if (!merchantId || !clientSecret) {
    console.error("Rapid OAuth: missing merchantId or clientSecret");
    return null;
  }

  const basicAuth = Buffer.from(`${merchantId}:${clientSecret}`).toString("base64");
  const apiBase = (cfg.apiBase || "https://secure.rapid-gateway.com").replace(/\/+$/, "");

  try {
    const res = await fetch(`${apiBase}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.access_token) {
      console.error("Rapid OAuth token error:", res.status, data);
      return null;
    }

    // Cache token — expires in 299s, refresh at 250s to be safe
    const expiresIn = Number(data.expires_in) || 299;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresIn - 49) * 1000,
    };

    return data.access_token;
  } catch (err: any) {
    console.error("Rapid OAuth fetch error:", err?.message);
    return null;
  }
}

/**
 * Step 2: Create a hosted-checkout payment on Rapid Gateway.
 * Uses the OAuth2 access token from step 1.
 *
 * Endpoint: POST {apiBase}/api/v1/payments/process (JSON contract, verified
 * live 2026-09 — see file header). accountNumber must be 6-24 DIGITS: we use
 * the customer's phone digits when we have them, otherwise digits recovered
 * from the order number (always ≥ 9 digits in our numbering scheme).
 */
export async function createRapidPayment(
  req: RapidPaymentRequest
): Promise<RapidPaymentResult> {
  const cfg = await getRapidConfig();
  const merchantIdRaw = RAPID_MERCHANT_ID || (cfg as any)?.merchantId || "";
  const merchantId = Number(String(merchantIdRaw).replace(/\D/g, ""));

  if (!cfg.secretKey && !RAPID_SECRET_KEY) {
    return { ok: false, error: "Rapid Gateway is not configured (no secret key — set it in Admin → Payment Gateway)." };
  }
  if (!merchantId || !Number.isFinite(merchantId)) {
    return { ok: false, error: "Rapid Gateway is not configured (merchant ID missing or invalid)." };
  }

  // Step 1: Get OAuth2 access token
  const accessToken = await getRapidAccessToken();
  if (!accessToken) {
    return { ok: false, error: "Could not authenticate with Rapid Gateway. Please try again." };
  }

  const apiBase = (cfg.apiBase || "https://secure.rapid-gateway.com").replace(/\/+$/, "");
  const amount = Math.round(Number(req.amount) * 100) / 100;
  const currency = (req.currency || "PKR").toUpperCase();

  // accountNumber: 6-24 digits, required by the gateway. Prefer the customer's
  // real phone digits; fall back to digits from the order number (padded if
  // ever short) so the request always satisfies the gateway's validator.
  const phoneDigits = String(req.customerPhone || "").replace(/\D/g, "");
  const orderDigits = String(req.orderNumber || "").replace(/\D/g, "");
  let accountNumber = phoneDigits.length >= 6 ? phoneDigits.slice(0, 24) : "";
  if (accountNumber.length < 6) {
    accountNumber = (orderDigits + "00").slice(0, 24);
  }
  if (accountNumber.length < 6 || accountNumber.length > 24) {
    accountNumber = (accountNumber + "0000000000").slice(0, 12);
  }

  const orderDescription = `PlayBeat Digital order ${req.orderNumber}`.slice(0, 120);

  // Build the transaction body per the verified Rapid Gateway contract.
  const body: Record<string, unknown> = {
    merchantId,
    basketId: req.orderNumber,
    amount: amount,
    currencyCode: currency,
    callbackUrl: req.returnUrl,
    accountNumber,
    customerIp: String(req.customerIp || "0.0.0.0").slice(0, 45),
    orderDescription,
    bankCode: Number(req.bankCode) > 0 ? Number(req.bankCode) : 1, // positive code required; 1 = default channel on hosted checkout
    webhookUrl: req.webhookUrl || cfg.webhookUrl,
  };

  try {
    const res = await fetch(`${apiBase}/api/v1/payments/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // New-style errors: { error: "VALIDATION_FAILED"|..., message: "..." }.
      // Old-style Spring errors: { error: "Unsupported Media Type" }.
      // Surface the message whenever it adds information beyond the code.
      const code = String(data?.error || "");
      const message = String(data?.message || data?.error_description || "");
      const detail =
        message && message.toLowerCase() !== code.toLowerCase()
          ? `${code ? code + ": " : ""}${message}`
          : message || code || `Rapid Gateway rejected the payment request (${res.status}).`;
      return { ok: false, error: detail, raw: data };
    }

    // Response may contain the checkout URL under several field names —
    // scan shallowly (and one level deep) for anything URL-shaped.
    const pickUrl = (obj: any): string => {
      if (!obj || typeof obj !== "object") return "";
      const candidates = [
        obj.checkoutUrl, obj.checkout_url, obj.redirectUrl, obj.redirect_url,
        obj.paymentUrl, obj.payment_url, obj.checkoutPageUrl, obj.hostedCheckoutUrl,
        obj.payUrl, obj.url, obj.link,
        Array.isArray(obj.data) ? "" : pickUrl(obj.data),
      ];
      for (const c of candidates) {
        const s = String(c || "");
        if (/^https:\/\//i.test(s)) return s;
      }
      return "";
    };
    const checkoutUrl = pickUrl(data) || res.headers.get("location") || "";
    const paymentId = String(
      data?.id || data?.paymentId || data?.transactionId || data?.transactionRef ||
      data?.reference || data?.basketId || ""
    );

    if (!checkoutUrl) {
      return { ok: false, error: "Rapid Gateway did not return a checkout URL.", raw: data };
    }

    return { ok: true, paymentId, checkoutUrl, raw: data };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Rapid Gateway." };
  }
}
