// Server-side coupon validation — the ONLY source of truth for discounts.
//
// WHY: the old checkout applied PLAYBEAT10/CINEMA2026 discounts purely in the
// browser, and the order API ignored the client total anyway — so coupons
// never actually changed what the customer paid. This module moves coupon
// logic into the `coupons` Mongo collection:
//
//   { code, type: "percent"|"fixed", value, minSubtotal, active,
//     expiresAt?, usageLimit?, usedCount, description, createdAt,
//     appliesTo?: { categories?: string[], productIds?: string[] } }
//
// Scoping: when `appliesTo` carries a non-empty categories/productIds list,
// the coupon only applies if at least one cart line matches (server-verified
// against the DB-loaded items — the client cannot scope-bypass).
//
// Validation is fail-closed: any DB error, inactive/expired/over-limit coupon
// returns a rejection. Discounts are recomputed here — the browser value is
// never trusted. Default campaigns (PLAYBEAT10 10%, CINEMA2026 15%) are
// seeded lazily on first use so existing deployments keep working.

import { getDb } from "./mongo.js";

export interface CouponDoc {
  code: string;
  type: "percent" | "fixed";
  value: number; // percent (0-100) or fixed PKR amount
  minSubtotal: number;
  active: boolean;
  expiresAt?: Date | null;
  usageLimit?: number | null;
  usedCount: number;
  description?: string;
  appliesTo?: {
    categories?: string[];
    productIds?: string[];
  } | null;
  createdAt?: Date;
}

const COLL = "coupons";

export class CouponValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Lazy one-time seeding of the two launch campaigns (idempotent).
let seeded = false;
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  try {
    const db = await getDb();
    const col = db.collection(COLL);
    for (const c of DEFAULT_COUPONS) {
      await col.updateOne(
        { code: c.code },
        { $setOnInsert: { ...c, usedCount: 0, createdAt: new Date() } },
        { upsert: true }
      );
    }
    seeded = true;
  } catch {
    /* seeding is best-effort — validation below still works on any docs */
  }
}

const DEFAULT_COUPONS: CouponDoc[] = [
  {
    code: "PLAYBEAT10",
    type: "percent",
    value: 10,
    minSubtotal: 0,
    active: true,
    usedCount: 0,
    description: "10% VIP promo discount",
  },
  {
    code: "CINEMA2026",
    type: "percent",
    value: 15,
    minSubtotal: 5000,
    active: true,
    usedCount: 0,
    description: "15% Cinema promo (min spend Rs 5,000)",
  },
];

function normalizeCode(code: unknown): string {
  return String(code || "").trim().toUpperCase().slice(0, 40);
}

/**
 * Scope check: when the coupon is restricted to categories/products, at least
 * ONE cart line must match. Items arrive server-verified (from the DB product
 * docs), so the browser cannot forge a match.
 */
function passesScope(
  coupon: CouponDoc,
  items: Array<{ productId?: string; category?: string; sku?: string }> | undefined
): boolean {
  const scope = coupon.appliesTo;
  if (!scope || typeof scope !== "object") return true;
  const cats: string[] = Array.isArray(scope.categories)
    ? scope.categories.map((c) => String(c).toLowerCase().trim()).filter(Boolean)
    : [];
  const pids: string[] = Array.isArray(scope.productIds)
    ? scope.productIds.map((p) => String(p).trim()).filter(Boolean)
    : [];
  if (!cats.length && !pids.length) return true; // no restrictions
  if (!items || !items.length) return false;
  return items.some((it) => {
    const pid = String(it.productId || "").trim();
    const cat = String(it.category || "").toLowerCase().trim();
    const sku = String(it.sku || "").trim();
    if (pid && pids.some((p) => p === pid || (sku && p === sku))) return true;
    if (cat && cats.includes(cat)) return true;
    return false;
  });
}

/**
 * Validate a coupon against a server-computed subtotal and return the
 * server-authoritative discount amount in PKR. Throws CouponValidationError
 * with a customer-safe message on any failure (fail-closed).
 *
 * `items` (optional) enables category/product scoping; pass the DB-verified
 * cart lines so scope decisions are never made from client input.
 */
export async function validateCoupon(
  rawCode: unknown,
  subtotalPkr: number,
  items?: Array<{ productId?: string; category?: string; sku?: string }>
): Promise<{ coupon: CouponDoc; discount: number }> {
  const code = normalizeCode(rawCode);
  const subtotal = Number(subtotalPkr) || 0;
  if (!code) throw new CouponValidationError("Enter a coupon code.");
  if (subtotal <= 0) throw new CouponValidationError("Your cart is empty — add a product before applying a coupon.");

  await ensureSeeded();

  let coupon: CouponDoc | null = null;
  try {
    const db = await getDb();
    coupon = (await db.collection(COLL).findOne({ code })) as unknown as CouponDoc | null;
  } catch (err: any) {
    // DB unavailable → cannot verify → reject (never discount on trust)
    throw new CouponValidationError("Coupon service is unavailable right now. Please try again shortly.", 503);
  }

  if (!coupon) throw new CouponValidationError("Invalid coupon code. Please check and try again.");
  if (coupon.active === false) throw new CouponValidationError("This coupon is no longer active.");
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    throw new CouponValidationError("This coupon has expired.");
  }
  if (coupon.usageLimit != null && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)) {
    throw new CouponValidationError("This coupon has reached its usage limit.");
  }
  if (subtotal < Number(coupon.minSubtotal || 0)) {
    throw new CouponValidationError(
      `This coupon requires a minimum order of Rs ${Number(coupon.minSubtotal).toLocaleString("en-PK")}.`
    );
  }
  if (!passesScope(coupon, items)) {
    const scopeDesc = [
      Array.isArray(coupon.appliesTo?.categories) && coupon.appliesTo!.categories!.length
        ? `categories: ${coupon.appliesTo!.categories!.join(", ")}`
        : "",
      Array.isArray(coupon.appliesTo?.productIds) && coupon.appliesTo!.productIds!.length
        ? "specific products"
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    throw new CouponValidationError(
      `This coupon only applies to ${scopeDesc || "selected items"} — it does not cover the items in your cart.`
    );
  }

  const discount =
    coupon.type === "fixed"
      ? Math.min(Number(coupon.value) || 0, subtotal)
      : Math.min((subtotal * (Number(coupon.value) || 0)) / 100, subtotal);

  return { coupon, discount: Number(discount.toFixed(2)) };
}

/** Public-safe projection for API responses (never leaks usage counters). */
export function couponPublicView(coupon: CouponDoc, discount: number) {
  return {
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value) || 0,
    discount,
    description: coupon.description || "",
  };
}

/** Admin-safe projection (hides nothing sensitive — no secrets on coupons). */
export function couponAdminView(coupon: any) {
  return {
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value) || 0,
    minSubtotal: Number(coupon.minSubtotal || 0),
    active: coupon.active !== false,
    expiresAt: coupon.expiresAt || null,
    usageLimit: coupon.usageLimit ?? null,
    usedCount: Number(coupon.usedCount || 0),
    description: coupon.description || "",
    appliesTo: {
      categories: Array.isArray(coupon.appliesTo?.categories) ? coupon.appliesTo.categories : [],
      productIds: Array.isArray(coupon.appliesTo?.productIds) ? coupon.appliesTo.productIds : [],
    },
    createdAt: coupon.createdAt || null,
  };
}

/** Validate + normalize an admin-submitted coupon payload (hand-written schema). */
export function parseCouponPayload(
  body: any
): { ok: boolean; value?: Partial<CouponDoc>; error?: string } {
  const code = normalizeCode(body.code);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    return { ok: false, error: "Code must be 3-40 characters (A-Z, 0-9, dash, underscore)." };
  }
  const type = body.type === "fixed" ? "fixed" : body.type === "percent" ? "percent" : null;
  if (!type) return { ok: false, error: "type must be \"percent\" or \"fixed\"." };
  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "value must be a positive number." };
  if (type === "percent" && value > 100) return { ok: false, error: "percent value cannot exceed 100." };
  const minSubtotal = Number(body.minSubtotal || 0);
  if (!Number.isFinite(minSubtotal) || minSubtotal < 0) return { ok: false, error: "minSubtotal must be a non-negative number." };
  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    const d = new Date(String(body.expiresAt));
    if (isNaN(d.getTime())) return { ok: false, error: "expiresAt must be a valid date." };
    expiresAt = d;
  }
  let usageLimit: number | null = null;
  if (body.usageLimit != null && body.usageLimit !== "") {
    usageLimit = Number(body.usageLimit);
    if (!Number.isFinite(usageLimit) || usageLimit < 1) return { ok: false, error: "usageLimit must be a positive integer." };
  }
  let appliesTo: CouponDoc["appliesTo"] = null;
  if (body.appliesTo && typeof body.appliesTo === "object") {
    const categories = Array.isArray(body.appliesTo.categories)
      ? body.appliesTo.categories.map((c: any) => String(c).trim()).filter(Boolean).slice(0, 20)
      : [];
    const productIds = Array.isArray(body.appliesTo.productIds)
      ? body.appliesTo.productIds.map((p: any) => String(p).trim()).filter(Boolean).slice(0, 100)
      : [];
    if (categories.length || productIds.length) appliesTo = { categories, productIds };
  }
  return {
    ok: true,
    value: {
      code,
      type: type as "percent" | "fixed",
      value: Number(value.toFixed(2)),
      minSubtotal: Number(minSubtotal.toFixed(2)),
      active: body.active !== false,
      expiresAt,
      usageLimit,
      description: String(body.description || "").slice(0, 200),
      appliesTo,
    },
  };
}

/** Record a redeemed coupon (called after the order document is persisted). */
export async function recordCouponRedemption(code: string): Promise<void> {
  try {
    const db = await getDb();
    await db
      .collection(COLL)
      .updateOne({ code: normalizeCode(code) }, { $inc: { usedCount: 1 } });
  } catch {
    /* never block order creation on coupon bookkeeping */
  }
}
