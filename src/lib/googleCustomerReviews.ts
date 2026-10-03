/**
 * PlayBeat — Google Customer Reviews survey opt-in (Merchant Center program).
 *
 * Fires ONLY from the successful order confirmation surfaces (direct-checkout
 * OrderSuccess and the webhook-verified /order/:num success state). It is a
 * standalone loader — deliberately NOT routed through GTM or the googleTag
 * loader, per the Google Customer Reviews integration policy.
 *
 * Design rules:
 *  • platform.js is injected at most ONCE per page load (id + module flag).
 *  • The survey renders at most ONCE per order number per page load — React
 *    re-renders / StrictMode double-effects can never double-fire it.
 *  • window.renderOptIn is defined BEFORE the script tag is appended (the
 *    ?onload=renderOptIn parameter invokes it when platform.js is ready).
 *  • Real order data only: order_id and email come from the MongoDB order
 *    document; delivery country and the estimated delivery date are derived
 *    from real order fields (phone country prefix + item delivery types +
 *    createdAt) — no fabricated customer/order values, ever.
 *  • Graceful failure: if the Google script fails to load or gapi is
 *    unavailable, the loader warns once and the confirmation page keeps
 *    working untouched (the once-guard is released so a later visit can
 *    retry).
 *  • Host guard: activates only on the production storefront
 *    (https://playbeat.digital / www) — previews, localhost and the admin
 *    panel never fire real survey renders.
 */

export const GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID = 5847422419

const PLATFORM_JS_ID = 'pb-google-platform-js'
const PLATFORM_JS_URL = 'https://apis.google.com/js/platform.js?onload=renderOptIn'

/** Hosts allowed to render the survey (Google requires the verified domain). */
const ACTIVATION_HOSTS = new Set(['playbeat.digital', 'www.playbeat.digital'])

/**
 * Delivery estimates derived from the store's real fulfillment behaviour:
 * digital items are delivered by email within a day; courier items ship and
 * arrive within a week (Pakistan domestic couriers).
 */
const DIGITAL_DELIVERY_DAYS = 1
const COURIER_DELIVERY_DAYS = 7

/** The store's single delivery market: PKR-only checkout, Pakistani rails. */
const DEFAULT_DELIVERY_COUNTRY = 'PK'

export interface CustomerReviewsOptInData {
  /** Real order number from the database (e.g. "PB-123456-789"). */
  orderId: string
  /** Actual customer checkout email (order.customerEmail). */
  email: string
  /** ISO-3166-1 alpha-2 delivery country code. */
  deliveryCountry: string
  /** Estimated delivery date, YYYY-MM-DD. */
  estimatedDeliveryDate: string
}

interface LoaderState {
  scriptRequested: boolean
  renderedOrderIds: Set<string>
  pending: CustomerReviewsOptInData | null
}

declare global {
  interface Window {
    renderOptIn?: () => void
    gapi?: any
    __pbCustomerReviews?: LoaderState
  }
}

function state(): LoaderState {
  if (!window.__pbCustomerReviews) {
    window.__pbCustomerReviews = {
      scriptRequested: false,
      renderedOrderIds: new Set<string>(),
      pending: null,
    }
  }
  return window.__pbCustomerReviews
}

/** True only on the production storefront over https. */
export function isCustomerReviewsHostAllowed(): boolean {
  try {
    const { protocol, hostname } = window.location
    return protocol === 'https:' && ACTIVATION_HOSTS.has(hostname)
  } catch {
    return false
  }
}

/**
 * ISO-3166-1 alpha-2 delivery country derived from REAL order data:
 *  1. an explicit country stored on the order (future-proof — the field is
 *     read if the order ever carries one),
 *  2. the customer's checkout phone prefix (+92 → PK),
 *  3. the store's sole delivery market (PKR-only checkout).
 */
export function deriveDeliveryCountry(phone?: string, explicitCountry?: string): string {
  const explicit = String(explicitCountry || '').trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(explicit)) return explicit
  const normalized = String(phone || '').replace(/[\s()-]/g, '')
  if (/^\+?92/.test(normalized)) return 'PK'
  return DEFAULT_DELIVERY_COUNTRY
}

function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Valid YYYY-MM-DD estimated delivery date computed from the order's REAL
 * createdAt and its items' real delivery types: any courier-shipped item
 * pushes the estimate out; instant digital delivery is next-day.
 */
export function computeEstimatedDeliveryDate(
  createdAt: string | Date | undefined,
  items: { deliveryType?: string; digital?: boolean }[] | undefined
): string {
  const parsed = createdAt ? new Date(createdAt) : new Date()
  const base = isNaN(parsed.getTime()) ? new Date() : parsed
  const hasCourier = (items || []).some(
    (it) =>
      /courier|shipping|ship|physical|post/i.test(String(it?.deliveryType || '')) ||
      it?.digital === false
  )
  const days = hasCourier ? COURIER_DELIVERY_DAYS : DIGITAL_DELIVERY_DAYS
  return toLocalYYYYMMDD(new Date(base.getTime() + days * 24 * 60 * 60 * 1000))
}

function renderPendingOnce(): void {
  const s = state()
  const data = s.pending
  if (!data) return
  // Consume immediately — re-fires (platform.js onload, extra invocations)
  // are then always harmless no-ops.
  s.pending = null
  // Duplicate-render guard: once per order number per page load.
  if (s.renderedOrderIds.has(data.orderId)) return
  s.renderedOrderIds.add(data.orderId)
  try {
    window.gapi.load('surveyoptin', () => {
      try {
        window.gapi.surveyoptin.render({
          // Google Customer Reviews survey opt-in — exact parameter contract:
          merchant_id: GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID,
          order_id: data.orderId,
          email: data.email,
          delivery_country: data.deliveryCountry,
          estimated_delivery_date: data.estimatedDeliveryDate,
        })
      } catch (err) {
        // Module loaded but rendering failed — release the guard so a later
        // visit of the confirmation page can retry; page stays unaffected.
        console.warn('[pb-gcr] survey render failed:', err)
        s.renderedOrderIds.delete(data.orderId)
      }
    })
  } catch (err) {
    console.warn('[pb-gcr] gapi surveyoptin unavailable:', err)
    s.renderedOrderIds.delete(data.orderId)
  }
}

function injectPlatformJs(): void {
  const s = state()
  if (s.scriptRequested) return

  const existing = document.getElementById(PLATFORM_JS_ID) as HTMLScriptElement | null
  if (existing) {
    // An element is already loading (or loaded) — the onload chain will
    // route through renderOptIn → renderPendingOnce.
    s.scriptRequested = true
    return
  }

  s.scriptRequested = true
  const script = document.createElement('script')
  script.id = PLATFORM_JS_ID
  script.src = PLATFORM_JS_URL
  script.async = true
  script.defer = true
  script.onerror = () => {
    // Graceful degradation: the confirmation page keeps working. Remove the
    // dead element and release the guards so a later attempt can re-inject.
    console.warn('[pb-gcr] Google platform.js failed to load — opt-in skipped.')
    s.scriptRequested = false
    try {
      script.remove()
    } catch {
      /* non-fatal */
    }
  }
  document.head.appendChild(script)
}

/**
 * Queue the Google Customer Reviews opt-in for a successfully completed
 * order. Safe to call from any effect: invalid input, non-production hosts
 * and duplicate orders are all silent no-ops.
 */
export function renderCustomerReviewsOptIn(data: CustomerReviewsOptInData): void {
  // ---- hard input guards (never render with fabricated/empty values) ----
  if (!data || typeof data.orderId !== 'string' || !data.orderId.trim()) return
  if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return
  if (!/^[A-Z]{2}$/.test(data.deliveryCountry)) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.estimatedDeliveryDate)) return
  // ---- environment guards ----
  if (!isCustomerReviewsHostAllowed()) return

  const s = state()
  s.pending = {
    orderId: data.orderId.trim(),
    email: data.email.trim(),
    deliveryCountry: data.deliveryCountry,
    estimatedDeliveryDate: data.estimatedDeliveryDate,
  }

  // platform.js already fully loaded (e.g. an earlier order in this SPA
  // session) — render straight away.
  if (window.gapi && window.gapi.surveyoptin) {
    renderPendingOnce()
    return
  }

  // Define window.renderOptIn BEFORE the script loads: platform.js invokes
  // it via the ?onload= callback once its core is ready. renderPendingOnce
  // is idempotent (consumes the pending slot + per-order guard), so the
  // chain can never double-render a survey.
  window.renderOptIn = renderPendingOnce
  injectPlatformJs()
}
