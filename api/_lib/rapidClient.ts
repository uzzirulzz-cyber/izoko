// Rapid Gateway server-side payment client.
// Uses the Embedded Checkout flow (POST /v1/checkout-sessions).
//
// Step 1: POST /oauth2/token → get OAuth2 access token
// Step 2: POST /v1/checkout-sessions → create checkout session
//   Returns: { sessionId, clientSecret, publishableKey }
// Step 3: Frontend mounts RapidPay SDK with clientSecret + publishableKey
// Step 4: Backend verifies via GET /v1/checkout-sessions/{sessionId}

const RAPID_MERCHANT_ID = process.env.RAPID_MERCHANT_ID || "";
const RAPID_SECRET_KEY = process.env.RAPID_SECRET_KEY || "";
const RAPID_API_BASE = (process.env.RAPID_API_BASE || "https://secure.rapid-gateway.com").replace(/\/+$/, "");

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
  sessionId?: string;
  clientSecret?: string;
  publishableKey?: string;
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
    merchantId: Number(RAPID_MERCHANT_ID),
    amount: Math.round(Number(req.amount) * 100) / 100,
    currency: (req.currency || "PKR").toUpperCase(),
    basketId: req.orderNumber,
  };

  if (req.customerEmail) body.customerEmail = req.customerEmail;
  if (req.customerPhone) body.customerMobile = req.customerPhone;

  try {
    const res = await fetch(`${RAPID_API_BASE}/v1/checkout-sessions`, {
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
      const errMsg = data?.message || data?.error || data?.additionalData?.data?.message || `Rapid Gateway error (${res.status}).`;
      return { ok: false, error: errMsg, raw: data };
    }

    // Response: { code: "201", message: "Created", additionalData: { data: { sessionId, clientSecret, publishableKey, ... } } }
    const sessionData = data?.additionalData?.data || data?.data || data;
    const sessionId = String(sessionData?.sessionId || "");
    const clientSecret = String(sessionData?.clientSecret || "");
    const publishableKey = String(sessionData?.publishableKey || "");

    if (!sessionId || !clientSecret) {
      return { ok: false, error: "Rapid Gateway did not return a checkout session.", raw: data };
    }

    return {
      ok: true,
      paymentId: sessionId,
      sessionId,
      clientSecret,
      publishableKey,
      checkoutUrl: `${RAPID_API_BASE}/checkout?session=${sessionId}`,
      raw: data,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Could not reach Rapid Gateway." };
  }
}

/**
 * Verify a checkout session status (server-side, never trust the browser).
 * GET /v1/checkout-sessions/{sessionId}
 */
export async function verifyCheckoutSession(sessionId: string): Promise<{ status: string; raw?: any }> {
  const accessToken = await getRapidAccessToken();
  if (!accessToken) return { status: "UNKNOWN" };

  try {
    const res = await fetch(`${RAPID_API_BASE}/v1/checkout-sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => null);
    const sessionData = data?.additionalData?.data || data?.data || data;
    return { status: String(sessionData?.status || "UNKNOWN"), raw: data };
  } catch {
    return { status: "UNKNOWN" };
  }
}
