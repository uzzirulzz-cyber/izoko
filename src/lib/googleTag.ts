/**
 * PlayBeat — Google business tracking loader (GA4 · GTM · AdSense · Google Ads).
 *
 * Design rules (per the business-integration brief):
 *  • ONE loader, injected once — the guard below makes double-injection
 *    impossible even if called from multiple components.
 *  • Consent-aware: Google Consent Mode v2 defaults are set to DENIED before
 *    any tag runs; the storefront ConsentBanner upgrades them on accept.
 *  • Config is fetched at runtime from /api/analytics/public-config — IDs are
 *    public by nature, never secrets, and can be managed from the admin
 *    Business Analytics panel without a redeploy.
 *  • Events: trackEvent() fans out to dataLayer (GTM mode) AND gtag()
 *    (direct GA4 mode) so ecommerce events work in either configuration.
 */

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export type PublicTrackingConfig = {
  ga4: string
  gtm: string
  adsense: string
  googleAdsId: string
  googleAdsPurchaseLabel: string
  adsEnabled: boolean
}

declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
    adsbygoogle?: any[]
    __pbGoogleTracking?: { init?: Promise<PublicTrackingConfig | null>; config?: PublicTrackingConfig | null }
  }
}

export const CONSENT_STORAGE_KEY = 'playbeat_consent_v1'

export type StoredConsent = { analytics: boolean; ads: boolean; at: number }

export function readStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (typeof v?.analytics === 'boolean' && typeof v?.ads === 'boolean') return v
    return null
  } catch {
    return null
  }
}

function writeStoredConsent(c: { analytics: boolean; ads: boolean }) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ ...c, at: Date.now() }))
  } catch {
    /* storage unavailable — session-only consent */
  }
}

/** Inject a script tag once (idempotent by id). */
function injectScript(id: string, src: string, async = true) {
  if (document.getElementById(id)) return
  const s = document.createElement('script')
  s.id = id
  s.async = async
  s.src = src
  document.head.appendChild(s)
}

/**
 * Boot the whole stack. Safe to call on every mount — only the first call
 * does work, later callers share the same promise.
 */
export function initGoogleTracking(): Promise<PublicTrackingConfig | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.__pbGoogleTracking?.init) return window.__pbGoogleTracking.init

  const task = (async (): Promise<PublicTrackingConfig | null> => {
    let cfg: PublicTrackingConfig | null = null
    try {
      const res = await fetch(`${API_BASE}/api/analytics/public-config`, { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (data?.success && data?.config) cfg = data.config as PublicTrackingConfig
    } catch {
      return null
    }
    if (!cfg) return null
    window.__pbGoogleTracking!.config = cfg

    const w = window
    w.dataLayer = w.dataLayer || []

    // ---- Google Consent Mode v2 — defaults BEFORE any tag loads. ----------
    // gtag stub: pushing arguments into dataLayer is exactly what the real
    // gtag.js does, so consent commands work even before/without gtag.js.
    if (!w.gtag) {
      w.gtag = function (...args: any[]) {
        w.dataLayer!.push(args)
      }
    }
    w.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
      region: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH', 'GB'],
    })
    // Redact ad request data when consent is denied.
    w.gtag('set', 'ads_data_redaction', true)

    // ---- Apply a previously stored consent choice (if any). ---------------
    const stored = readStoredConsent()
    if (stored) applyConsent(stored)

    // ---- GTM container (preferred tag router). ----------------------------
    if (cfg.gtm) {
      w.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
      injectScript('pb-gtm-src', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cfg.gtm)}`)
    }

    // ---- Direct GA4 (only when GTM is absent — never both). ---------------
    if (cfg.ga4 && !cfg.gtm) {
      injectScript('pb-ga4-src', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4)}`)
      w.gtag('js', new Date())
      w.gtag('config', cfg.ga4, { send_page_view: true, anonymize_ip: true })
    }

    // ---- AdSense (loader + site verification meta). -----------------------
    // index.html ships the hardcoded standard AdSense snippet; the guards
    // below make this dynamic path a no-op in that case (never load the
    // library twice) while still bootstrapping everything when the hardcoded
    // tags are absent or carry a stale client id.
    if (cfg.adsense) {
      if (!document.querySelector('meta[name="google-adsense-account"]')) {
        const meta = document.createElement('meta')
        meta.name = 'google-adsense-account'
        meta.content = cfg.adsense
        document.head.appendChild(meta)
      }
      const clientId = encodeURIComponent(cfg.adsense)
      const existing = document.querySelector<HTMLScriptElement>('script[src*="adsbygoogle.js"]')
      if (existing && existing.src.includes(clientId)) {
        // hardcoded loader already present with the same client id — done
      } else if (existing) {
        // stale client id in the hardcoded tag — swap it for the configured one
        existing.remove()
        injectScript('pb-adsense-src', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`)
      } else {
        injectScript('pb-adsense-src', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`)
      }
    }

    return cfg
  })()

  window.__pbGoogleTracking = window.__pbGoogleTracking || {}
  window.__pbGoogleTracking.init = task
  return task
}

/** Upgrade consent after the banner interaction. */
export function applyConsent(choice: { analytics: boolean; ads: boolean }) {
  const w = window
  if (!w.gtag) return
  w.gtag('consent', 'update', {
    ad_storage: choice.ads ? 'granted' : 'denied',
    ad_user_data: choice.ads ? 'granted' : 'denied',
    ad_personalization: choice.ads ? 'granted' : 'denied',
    analytics_storage: choice.analytics ? 'granted' : 'denied',
  })
  writeStoredConsent(choice)
  w.dataLayer?.push({ event: 'pb_consent_update', ...choice })
}

/** Currently active public config (null until init resolves). */
export function getTrackingConfigSync(): PublicTrackingConfig | null {
  return (typeof window !== 'undefined' && window.__pbGoogleTracking?.config) || null
}

/**
 * Push an ecommerce/interaction event.
 *  • GTM present  → dataLayer push (GTM triggers route it to GA4/Ads).
 *  • GA4 direct   → dataLayer push + explicit gtag('event', …) so the
 *    measurement protocol receives it without GTM triggers.
 */
export function trackEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined') return
  const w = window
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({ event: name, ...params })
  const cfg = getTrackingConfigSync()
  // Direct-GA4 mode (no GTM container): forward GA4 events explicitly.
  if (cfg && !cfg.gtm && cfg.ga4 && typeof w.gtag === 'function') {
    try {
      w.gtag('event', name, params)
    } catch {
      /* never let tracking break the UI */
    }
  }
}

/** Google Ads purchase conversion (label optional — only fires when set). */
export function trackAdsConversion(value?: number, currency = 'PKR', transactionId?: string) {
  const cfg = getTrackingConfigSync()
  if (!cfg?.googleAdsId) return
  const w = window
  if (typeof w.gtag !== 'function') return
  const target = cfg.googleAdsPurchaseLabel
    ? `${cfg.googleAdsId}/${cfg.googleAdsPurchaseLabel}`
    : cfg.googleAdsId
  try {
    w.gtag('event', 'conversion', {
      send_to: target,
      value,
      currency,
      transaction_id: transactionId,
    })
  } catch {
    /* noop */
  }
}

// ---------- ecommerce helpers (GA4 recommended event names) ----------------

export type EcomItem = {
  item_id: string
  item_name: string
  item_category?: string
  price?: number
  quantity?: number
}

function toItems(products: { id?: string; name: string; category?: string; price?: number; quantity?: number }[]): EcomItem[] {
  return products.map((p) => ({
    item_id: p.id || p.name,
    item_name: p.name,
    ...(p.category ? { item_category: p.category } : {}),
    ...(typeof p.price === 'number' ? { price: p.price } : {}),
    ...(typeof p.quantity === 'number' ? { quantity: p.quantity } : {}),
  }))
}

export function trackViewItem(p: { id?: string; name: string; category?: string; price?: number }) {
  trackEvent('view_item', { items: toItems([p]), currency: 'PKR', value: p.price || 0 })
}

export function trackViewItemList(items: { id?: string; name: string; category?: string; price?: number }[], listId = 'storefront') {
  trackEvent('view_item_list', { item_list_id: listId, items: toItems(items.slice(0, 20)) })
}

export function trackSearch(searchTerm: string) {
  trackEvent('search', { search_term: searchTerm })
}

export function trackAddToCart(p: { id?: string; name: string; category?: string; price?: number; quantity?: number }) {
  const value = (p.price || 0) * (p.quantity || 1)
  trackEvent('add_to_cart', { currency: 'PKR', value, items: toItems([p]) })
}

export function trackBeginCheckout(args: { value: number; currency?: string; coupon?: string; items: Parameters<typeof toItems>[0] }) {
  trackEvent('begin_checkout', {
    currency: args.currency || 'PKR',
    value: args.value,
    ...(args.coupon ? { coupon: args.coupon } : {}),
    items: toItems(args.items),
  })
}

/** Purchase — call ONLY with server-verified order data, once per order. */
export function trackPurchase(args: {
  transactionId: string
  value: number
  currency?: string
  coupon?: string
  tax?: number
  items: Parameters<typeof toItems>[0]
}) {
  if (typeof window === 'undefined') return
  // Fire exactly once per order per browser (survives SPA re-renders).
  const key = `pb_purchase_fired_${args.transactionId}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* sessionStorage unavailable — proceed (server webhook remains the source of truth) */
  }
  trackEvent('purchase', {
    transaction_id: args.transactionId,
    currency: args.currency || 'PKR',
    value: args.value,
    ...(args.coupon ? { coupon: args.coupon } : {}),
    items: toItems(args.items),
  })
  trackAdsConversion(args.value, args.currency || 'PKR', args.transactionId)
}
