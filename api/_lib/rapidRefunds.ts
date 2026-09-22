// Rapid Gateway Refunds API client (server-side only).
//
// Vendor docs (Refunds API — secure.rapid-gateway.com):
//   Auth : OAuth2 client-credentials — POST {refundsBase}/oauth2/token
//          Authorization: Basic base64(merchantId:clientSecret)
//          grant_type=client_credentials → { access_token, token_type, expires_in }
//          (client_id = merchant id; same secret as Pay-In)
//   Create: POST {refundsBase}/api/v1/payments/refunds   (Idempotency-Key REQUIRED)
//           body { merchantId, basketId, amount?, reasonCode, reasonNote? }
//           201 = auto-approved (status SUCCEEDED), 202 = queued (PENDING_APPROVAL)
//   Get   : GET  {refundsBase}/api/v1/payments/refunds/{refundRef}?merchantId=
//   List  : GET  {refundsBase}/api/v1/payments/refunds?merchantId=&basketId=&status=&page=&size=
//   Cancel: POST {refundsBase}/api/v1/payments/refunds/{refundRef}/cancel?merchantId=
//           (only while PENDING_APPROVAL)
//
// Refund statuses: PENDING_APPROVAL → SUCCEEDED (approved) with terminal
// REJECTED / FAILED / CANCELLED.
//
// Error codes (dispatch on `error`, never on message text):
//   404 TRANSACTION_NOT_FOUND            422 TRANSACTION_NOT_REFUNDABLE
//   422 REFUND_AMOUNT_EXCEEDS_BALANCE    422 REFUND_WINDOW_EXPIRED
//   422 INSUFFICIENT_MERCHANT_BALANCE    422 DUPLICATE_IDEMPOTENCY_KEY_DIFFERENT_PAYLOAD
//   409 REFUND_IN_PROGRESS               422 REFUND_NOT_CANCELABLE
//   403 MERCHANT_NOT_ELIGIBLE            429 RATE_LIMITED
//
// Idempotency: replaying the same Idempotency-Key returns the ORIGINAL
// response + X-Idempotent-Replay: true — never a second refund. On a 5xx or
// network error, retry with the SAME key. Keys are kept 7 days server-side.
//
// Token caching: expires_in is short (~299s per docs, observed 3600s) — the
// token is cached module-level and refreshed 60s before expiry.

import crypto from "crypto";
import { getRapidConfig } from "./gatewayConfig.js";

export interface RefundTokenState {
  token: string;
  expiresAt: number; // epoch ms
}

let tokenState: RefundTokenState | null = null;

export function resetRefundTokenCache(): void {
  tokenState = null;
}

/** OAuth2 client-credentials token, cached until ~60s before expiry. */
export async function getRefundAccessToken(force = false): Promise<string> {
  if (!force && tokenState && Date.now() < tokenState.expiresAt) {
    return tokenState.token;
  }
  const cfg = await getRapidConfig();
  if (!cfg.merchantId || !cfg.secretKey) {
    throw new Error(
      "Refunds API is not configured (need merchant ID + secret key — set them in Admin → Payment Gateway)."
    );
  }
  const basic = Buffer.from(`${cfg.merchantId}:${cfg.secretKey}`).toString("base64");
  const res = await fetch(`${cfg.refundsBase}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    const detail = data?.error_description || data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(`Rapid refunds OAuth token request failed: ${detail}`);
  }
  const ttlMs = Math.max(60, (Number(data.expires_in) || 240) - 60) * 1000;
  tokenState = { token: String(data.access_token), expiresAt: Date.now() + ttlMs };
  return tokenState.token;
}

export interface RefundResult {
  ok: boolean;
  httpStatus?: number;
  idempotentReplay?: boolean;
  refund?: RapidRefund;
  error?: string; // machine code, e.g. TRANSACTION_NOT_FOUND
  errorDetail?: string;
}

export interface RapidRefund {
  refundRef?: string;
  basketId?: string;
  transactionAmount?: number;
  refundAmount?: number;
  remainingRefundableAmount?: number;
  currency?: string;
  status?: string; // PENDING_APPROVAL | SUCCEEDED | REJECTED | FAILED | CANCELLED
  requiresApproval?: boolean;
  reasonCode?: string;
  reasonNote?: string;
  raw?: any;
}

const REASON_CODES = new Set([
  "CUSTOMER_REQUEST",
  "PRODUCT_ISSUE",
  "SERVICE_ISSUE",
  "DUPLICATE_CHARGE",
  "FRAUD_SUSPECTED",
  "OTHER",
]);

export function isValidReasonCode(code: string): boolean {
  return REASON_CODES.has(code);
}

async function refundFetch(
  path: string,
  init: { method: string; body?: string; query?: string; idempotencyKey?: string }
): Promise<RefundResult> {
  const cfg = await getRapidConfig();
  if (!cfg.merchantId || !cfg.secretKey) {
    return { ok: false, error: "NOT_CONFIGURED", errorDetail: "merchant ID / secret key missing" };
  }
  const token = await getRefundAccessToken();
  const url = `${cfg.refundsBase}${path}${init.query || ""}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers,
      body: init.body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e: any) {
    return { ok: false, error: "NETWORK_ERROR", errorDetail: e?.message || "request failed" };
  }

  const data: any = await res.json().catch(() => null);
  const replay = res.headers.get("x-idempotent-replay") === "true";

  if (res.ok) {
    return { ok: true, httpStatus: res.status, idempotentReplay: replay, refund: normalizeRefund(data) };
  }

  // Gateway errors carry a machine-readable `error` code — dispatch on it.
  const code = String(data?.error || data?.code || `HTTP_${res.status}`);
  const detail = String(data?.error_description || data?.message || data?.detail || "");
  return { ok: false, httpStatus: res.status, error: code, errorDetail: detail };
}

function normalizeRefund(data: any): RapidRefund {
  if (!data || typeof data !== "object") return { raw: data };
  return {
    refundRef: data.refundRef != null ? String(data.refundRef) : undefined,
    basketId: data.basketId != null ? String(data.basketId) : undefined,
    transactionAmount: toNum(data.transactionAmount),
    refundAmount: toNum(data.refundAmount),
    remainingRefundableAmount: toNum(data.remainingRefundableAmount),
    currency: data.currency != null ? String(data.currency) : undefined,
    status: data.status != null ? String(data.status) : undefined,
    requiresApproval: Boolean(data.requiresApproval),
    reasonCode: data.reasonCode != null ? String(data.reasonCode) : undefined,
    reasonNote: data.reasonNote != null ? String(data.reasonNote) : undefined,
    raw: data,
  };
}

function toNum(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Create a refund (full when amount is omitted, partial otherwise).
 * Multiple partial refunds per transaction are allowed until the remaining
 * balance reaches zero. 201 = auto-approved; 202 = queued for review — both
 * are SUCCESS for the caller (the webhook reports the final state).
 */
export async function createRefund(opts: {
  basketId: string;
  amount?: number; // omit → full refund of the remaining balance
  reasonCode: string;
  reasonNote?: string;
  idempotencyKey?: string; // server-generated when omitted
}): Promise<RefundResult> {
  const cfg = await getRapidConfig();
  const basketId = String(opts.basketId || "").trim();
  if (!basketId) return { ok: false, error: "BAD_REQUEST", errorDetail: "basketId is required" };
  if (!isValidReasonCode(opts.reasonCode)) {
    return { ok: false, error: "BAD_REQUEST", errorDetail: "invalid reasonCode" };
  }
  const amount =
    opts.amount != null ? Math.round(Number(opts.amount) * 100) / 100 : undefined;
  if (amount != null && !(amount > 0)) {
    return { ok: false, error: "BAD_REQUEST", errorDetail: "amount must be > 0" };
  }

  const body: Record<string, unknown> = {
    merchantId: Number(cfg.merchantId),
    basketId,
    reasonCode: opts.reasonCode,
  };
  if (amount != null) body.amount = amount;
  if (opts.reasonNote) body.reasonNote = String(opts.reasonNote).slice(0, 500);

  return refundFetch("/api/v1/payments/refunds", {
    method: "POST",
    query: "",
    idempotencyKey: opts.idempotencyKey || crypto.randomUUID(),
    body: JSON.stringify(body),
  });
}

/** Fetch one refund by refundRef. */
export async function getRefund(refundRef: string): Promise<RefundResult> {
  const cfg = await getRapidConfig();
  const ref = String(refundRef || "").trim();
  if (!ref) return { ok: false, error: "BAD_REQUEST", errorDetail: "refundRef is required" };
  return refundFetch(`/api/v1/payments/refunds/${encodeURIComponent(ref)}`, {
    method: "GET",
    query: `?merchantId=${encodeURIComponent(cfg.merchantId)}`,
  });
}

/** List refunds (filters: basketId, status, page, size). */
export async function listRefunds(opts: {
  basketId?: string;
  status?: string;
  page?: number;
  size?: number;
} = {}): Promise<RefundResult & { items?: RapidRefund[]; page?: number; total?: number }> {
  const cfg = await getRapidConfig();
  const q = new URLSearchParams();
  q.set("merchantId", cfg.merchantId);
  if (opts.basketId) q.set("basketId", opts.basketId);
  if (opts.status) q.set("status", opts.status);
  if (opts.page != null) q.set("page", String(Math.max(0, Number(opts.page) || 0)));
  if (opts.size != null) q.set("size", String(Math.min(100, Math.max(1, Number(opts.size) || 25))));
  const result = await refundFetch("/api/v1/payments/refunds", { method: "GET", query: `?${q.toString()}` });
  if (result.ok) {
    const raw: any = result.refund?.raw;
    const items = Array.isArray(raw)
      ? raw.map(normalizeRefund)
      : Array.isArray(raw?.content)
      ? raw.content.map(normalizeRefund)
      : Array.isArray(raw?.data)
      ? raw.data.map(normalizeRefund)
      : result.refund?.refundRef
      ? [result.refund]
      : [];
    return { ...result, items, page: raw?.page ?? raw?.number, total: raw?.totalElements ?? raw?.total };
  }
  return result;
}

/** Cancel a refund — only while still PENDING_APPROVAL. */
export async function cancelRefund(refundRef: string): Promise<RefundResult> {
  const cfg = await getRapidConfig();
  const ref = String(refundRef || "").trim();
  if (!ref) return { ok: false, error: "BAD_REQUEST", errorDetail: "refundRef is required" };
  return refundFetch(`/api/v1/payments/refunds/${encodeURIComponent(ref)}/cancel`, {
    method: "POST",
    query: `?merchantId=${encodeURIComponent(cfg.merchantId)}`,
  });
}

