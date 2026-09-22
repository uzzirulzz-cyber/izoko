// Rapid Gateway server-side payment client.
// Uses env vars directly for speed (avoids MongoDB round-trip in getRapidConfig).

const RAPID_MERCHANT_ID = process.env.RAPID_MERCHANT_ID || "";
const RAPID_SECRET_KEY = process.env.RAPID_SECRET_KEY || "";
const RAPID_API_BASE = (process.env.RAPID_API_BASE || "https://secure.rapid-gateway.com").replace(/\/+$/, "");
const RAPID_WEBHOOK_URL = "https://playbeat.digital/webhooks/rapid-gateway";

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

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getRapidAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!RAPID_MERCHANT_ID || !RAPID_SECRET_KEY) return null;

  const basicAuth = Buffer.from(`${RAPID_MERCHANT_ID}:${RAPID_SECRET_KEY}`).toString("base64");

  try {
    const res = await fetch(`${RAPID_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.access_token) return null;

    const expiresIn = Number(data.expires_in) || 299;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresIn - 49) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

export async function createRapidPayment(
  req: RapidPaymentRequest
): Promise<RapidPaymentResult> {
  if (!RAPID_SECRET_KEY) {
    return { ok: false, error: "Rapid Gateway is not configured." };
  }

  const accessToken = await getRapidAccessToken();
  if (!accessToken) {
    return { ok: false, error: "Could not authenticate with Rapid Gateway." };
  }

  const body: Record<string, unknown> = {
    merchantId: Number(RAPID_MERCHANT_ID) || RAPID_MERCHANT_ID,
    basketId: req.orderNumber,
    amount: Math.round(Number(req.amount) * 100) / 100,
    currencyCode: (req.currency || "PKR").toUpperCase(),
    callbackUrl: req.returnUrl,
    webhookUrl: req.webhookUrl || RAPID_WEBHOOK_URL,
    accountNumber: (req.customerPhone || req.orderNumber || "").replace(/[^\d]/g, "").slice(0, 24).padStart(6, "0"),
    customerIp: req.customerIp || "127.0.0.1",
    orderDescription: `PlayBeat order ${req.orderNumber}`,
    bankCode: req.bankCode || 1,
  };

  if (req.customerName) body.customerName = req.customerName;
  if (req.customerEmail) body.customerEmail = req.customerEmail;

  try {
    const res = await fetch(`${RAPID_API_BASE}/api/v1/payments/process`, {
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
        error: (data && (data.message || data.error)) || `Rapid Gateway error (${res.status}).`,
        raw: data,
      };
    }

    const checkoutUrl = String(data?.checkout_url || data?.redirect_url || data?.checkoutUrl || "");
    const paymentId = String(data?.id || data?.paymentId || data?.transactionId || "");

    if (!checkoutUrl) {
      const loc = res.headers.get("location");
      if (loc) return { ok: true, paymentId, checkoutUrl: loc, raw: data };
      return { ok: false, error: "Rapid Gateway did not return a checkout URL.", raw: data };
    }

    return { ok: true, paymentId, checkoutUrl, raw: data };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Rapid Gateway." };
  }
}
