// Rapid Gateway server-side payment client (OAuth2 + Pay-In API).
//
// Two-step flow per Rapid Gateway developer docs:
//   Step 1: POST https://secure.rapid-gateway.com/oauth2/token
//     Headers:
//       Authorization: Basic base64(merchantId:clientSecret)
//       Content-Type: application/x-www-form-urlencoded
//     Body: grant_type=client_credentials
//     Response: { access_token, token_type: "Bearer", expires_in: 299 }
//
//   Step 2: POST https://secure.rapid-gateway.com/rapid/process-transaction
//     Headers:
//       Authorization: Bearer <access_token from step 1>
//       Content-Type: application/json
//       Idempotency-Key: <stable per-order key>
//     Body:
//       merchantId, basketId, amount, currency, returnUrl, webhookUrl
//     Response: { checkout_url } → redirect customer there
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
 * Idempotent per orderNumber.
 */
export async function createRapidPayment(
  req: RapidPaymentRequest
): Promise<RapidPaymentResult> {
  const cfg = await getRapidConfig();
  const merchantId = RAPID_MERCHANT_ID || (cfg as any)?.merchantId || "";

  if (!cfg.secretKey && !RAPID_SECRET_KEY) {
    return { ok: false, error: "Rapid Gateway is not configured (no secret key — set it in Admin → Payment Gateway)." };
  }

  // Step 1: Get OAuth2 access token
  const accessToken = await getRapidAccessToken();
  if (!accessToken) {
    return { ok: false, error: "Could not authenticate with Rapid Gateway. Please try again." };
  }

  const apiBase = (cfg.apiBase || "https://secure.rapid-gateway.com").replace(/\/+$/, "");
  const amount = Math.round(Number(req.amount) * 100) / 100;

  // Build the transaction body per Rapid Gateway docs
  const body: Record<string, unknown> = {
    merchantId: merchantId,
    basketId: req.orderNumber,
    amount: amount,
    currency: (req.currency || "PKR").toUpperCase(),
    returnUrl: req.returnUrl,
    webhookUrl: req.webhookUrl || cfg.webhookUrl,
  };

  // Add customer info if available
  if (req.customerName) body.customerName = req.customerName;
  if (req.customerEmail) body.customerEmail = req.customerEmail;
  if (req.customerPhone) body.customerPhone = req.customerPhone;

  try {
    const res = await fetch(`${apiBase}/rapid/process-transaction`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

    // Response may contain checkout_url, redirect_url, or checkoutUrl
    const checkoutUrl =
      String(data?.checkout_url || data?.redirect_url || data?.checkoutUrl || data?.redirectUrl || "");
    const paymentId =
      String(data?.id || data?.paymentId || data?.transactionId || data?.basketId || "");

    if (!checkoutUrl) {
      // Some responses return the URL in a Location header or different field
      const locationHeader = res.headers.get("location") || res.headers.get("Location");
      if (locationHeader) {
        return { ok: true, paymentId, checkoutUrl: locationHeader, raw: data };
      }
      return { ok: false, error: "Rapid Gateway did not return a checkout URL.", raw: data };
    }

    return { ok: true, paymentId, checkoutUrl, raw: data };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Rapid Gateway." };
  }
}
