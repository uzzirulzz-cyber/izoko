// Server-side coupon validation — the ONLY source of truth for discounts.
//
// WHY: the old checkout applied PLAYBEAT10/CINEMA2026 discounts purely in the
// browser, and the order API ignored the client total anyway — so coupons
// never actually changed what the customer paid. This module moves coupon
// logic into the `coupons` Mongo collection:
//
//   { code, type: "percent"|"fixed", value, minSubtotal, active,
//     expiresAt?, usageLimit?, usedCount, description, createdAt }
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
 * Validate a coupon against a server-computed subtotal and return the
 * server-authoritative discount amount in PKR. Throws CouponValidationError
 * with a customer-safe message on any failure (fail-closed).
 */
export async function validateCoupon(
  rawCode: unknown,
  subtotalPkr: number
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
