// Rapid Gateway server-side payment client (OAuth2 + Embedded Checkout sessions).
//
// Flow (contract verified live against secure.rapid-gateway.com — worklog
// Tasks 55/56):
//   Step 1: POST {apiBase}/oauth2/token
//           Authorization: Basic base64(merchantId:clientSecret)
//           Content-Type: application/x-www-form-urlencoded
//           body: grant_type=client_credentials
//           → { access_token, token_type:"Bearer", expires_in: ~299 }
//
//   Step 2: POST {apiBase}/v1/checkout-sessions
//           Authorization: Bearer <token>, X-Environment: LIVE
//           body: { merchantId, amount, currency, basketId,
//                   customerEmail?, customerMobile? }
//           → { code:"201", additionalData:{ data:{ sessionId, clientSecret,
//               publishableKey, status:"CREATED", environment, amount,
//               currency, basketId, expiresAt } } }
//           clientSecret format: "<sessionId>_secret_<secret>" — the embedded
//           widget recovers the session id from it (split on "_secret_").
//
//   Step 3: FRONTEND mounts {apiBase}/embedded?boot in an iframe and
//           postMessages {type:"rp:init", clientSecret} once the widget
//           announces {type:"rp:ready"}. The widget renders the payment UI
//           (card / account / wallet / Raast tabs), finalizes itself via
//           POST /v1/checkout-sessions/{id}/finalize and reports
//           rp:pending → rp:success | rp:error back to the parent window.
//
//   Step 4: Truth stays server-side — the order is marked paid ONLY by the
//           verified webhook (POST /api/rapid/webhook or
//           /webhooks/rapid-gateway, HMAC X-RapidGateway-Signature).
//
// Dead paths kept for the record (do NOT use):
//   - POST /rapid/process-transaction → HTTP 415 for application/json
//   - POST /api/v1/payments/process   → 422 ROUTE_NOT_CONFIGURED for this
//     merchant (routes are provisioned for the checkout-session model only)

import { getRapidConfig } from "./gatewayConfig.js";

const RAPID_MERCHANT_ID = process.env.RAPID_MERCHANT_ID || "";
const RAPID_SECRET_KEY = process.env.RAPID_SECRET_KEY || "";
const RAPID_API_BASE = (process.env.RAPID_API_BASE || "https://secure.rapid-gateway.com").replace(
  /\/+$/,
  ""
);

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
  environment?: string;
}

export interface RapidPaymentResult {
  ok: boolean;
  paymentId?: string;
  sessionId?: string;
  clientSecret?: string;
  publishableKey?: string;
  embeddedUrl?: string; // merchant frontend mounts this in an iframe
  expiresAt?: number;
  raw?: any;
  error?: string;
}

// Cached OAuth2 token (expires in ~299s, refresh at 250s to be safe)
let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchAccessToken(merchantId: string, clientSecret: string, apiBase: string) {
  const basicAuth = Buffer.from(`${merchantId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${apiBase}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    console.error("Rapid OAuth token error:", res.status, data);
    return null;
  }
  const expiresIn = Number(data.expires_in) || 299;
  cachedToken = { token: String(data.access_token), expiresAt: Date.now() + (expiresIn - 49) * 1000 };
  return String(data.access_token);
}

/**
 * Step 1: Get an OAuth2 access token. Credentials resolve DB-first (admin
 * panel managed, AES-GCM at rest) with env vars as the bootstrap fallback —
 * a panel-side secret rotation takes effect without a redeploy.
 */
async function getRapidAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  const cfg = await getRapidConfig();
  const merchantId = String((cfg as any)?.merchantId || RAPID_MERCHANT_ID || "").trim();
  const clientSecret = cfg.secretKey || RAPID_SECRET_KEY;
  if (!merchantId || !clientSecret) {
    console.error("Rapid OAuth: missing merchantId or clientSecret");
    return null;
  }
  try {
    return await fetchAccessToken(merchantId, clientSecret, cfg.apiBase || RAPID_API_BASE);
  } catch (err: any) {
    console.error("Rapid OAuth fetch error:", err?.message);
    return null;
  }
}

/**
 * Step 2: Create an Embedded Checkout session. The customer pays inside the
 * iframe mounted by the frontend (see RapidEmbeddedCheckout.tsx); this call
 * carries no customer-entered data and the amount is server-computed.
 */
export async function createRapidPayment(
  req: RapidPaymentRequest
): Promise<RapidPaymentResult> {
  const cfg = await getRapidConfig();
  const merchantIdRaw = String((cfg as any)?.merchantId || RAPID_MERCHANT_ID || "").trim();
  const merchantId = Number(merchantIdRaw.replace(/\D/g, ""));

  if (!cfg.secretKey && !RAPID_SECRET_KEY) {
    return { ok: false, error: "Rapid Gateway is not configured (no secret key — set it in Admin → Payment Gateway)." };
  }
  if (!merchantId || !Number.isFinite(merchantId)) {
    return { ok: false, error: "Rapid Gateway is not configured (merchant ID missing or invalid)." };
  }

  const accessToken = await getRapidAccessToken();
  if (!accessToken) {
    return { ok: false, error: "Could not authenticate with Rapid Gateway. Please try again." };
  }

  const apiBase = (cfg.apiBase || RAPID_API_BASE).replace(/\/+$/, "");
  const amount = Math.round(Number(req.amount) * 100) / 100;

  const body: Record<string, unknown> = {
    merchantId,
    amount,
    currency: (req.currency || "PKR").toUpperCase(),
    basketId: req.orderNumber,
  };
  if (req.customerEmail) body.customerEmail = String(req.customerEmail).slice(0, 120);
  if (req.customerPhone) body.customerMobile = String(req.customerPhone).slice(0, 20);

  try {
    const res = await fetch(`${apiBase}/v1/checkout-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Environment": "LIVE",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const code = String(data?.error || data?.code || "");
      const message = String(data?.message || data?.error_description || "");
      const detail =
        message && message.toLowerCase() !== code.toLowerCase()
          ? `${code ? code + ": " : ""}${message}`
          : message || code || `Rapid Gateway rejected the payment request (${res.status}).`;
      return { ok: false, error: detail, raw: data };
    }

    // Success shape: { code:"201", additionalData:{ data:{ sessionId, clientSecret, ... } } }
    const sessionData = data?.additionalData?.data || data?.data || data || {};
    const sessionId = String(sessionData.sessionId || "");
    const clientSecret = String(sessionData.clientSecret || "");
    const publishableKey = String(sessionData.publishableKey || "");
    const expiresAt = Number(sessionData.expiresAt) || undefined;

    if (!sessionId || !clientSecret) {
      return { ok: false, error: "Rapid Gateway did not return a checkout session.", raw: data };
    }

    return {
      ok: true,
      paymentId: sessionId,
      sessionId,
      clientSecret,
      publishableKey,
      embeddedUrl: `${apiBase}/embedded?boot`,
      expiresAt,
      raw: data,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Rapid Gateway." };
  }
}

/**
 * Server-side session status check (GET /v1/checkout-sessions/{id}) — for
 * support diagnostics only; payment truth always comes from the webhook.
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<{ status: string; raw?: any; error?: string }> {
  const cfg = await getRapidConfig();
  const accessToken = await getRapidAccessToken();
  if (!accessToken) return { status: "UNKNOWN", error: "not authenticated" };
  const apiBase = (cfg.apiBase || RAPID_API_BASE).replace(/\/+$/, "");
  try {
    const res = await fetch(
      `${apiBase}/v1/checkout-sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json().catch(() => null);
    const sessionData = data?.additionalData?.data || data?.data || data || {};
    return { status: String(sessionData.status || data?.status || "UNKNOWN"), raw: data };
  } catch (err: any) {
    return { status: "UNKNOWN", error: err?.message || "request failed" };
  }
}
