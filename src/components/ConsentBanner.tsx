// Storefront consent banner — Google Consent Mode v2 companion.
// Shows ONLY when tracking is configured and the visitor has not chosen yet.
// Never rendered on checkout / order / account / admin surfaces.
import React, { useEffect, useState } from 'react'
import { Cookie, ShieldCheck } from 'lucide-react'
import { applyConsent, CONSENT_STORAGE_KEY, getTrackingConfigSync, initGoogleTracking, readStoredConsent } from '../lib/googleTag'

const EXCLUDED_PREFIXES = ['/checkout', '/order', '/account', '/admin', '/contact', '/compare']

export const ConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    initGoogleTracking().then((cfg) => {
      if (cancelled || !cfg) return
      const anyTracking = Boolean(cfg.ga4 || cfg.gtm || cfg.adsense || cfg.googleAdsId)
      const path = window.location.pathname || '/'
      const blocked = EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
      if (anyTracking && !blocked && !readStoredConsent()) {
        // small delay so it never fights the first paint
        setTimeout(() => !cancelled && setVisible(true), 1200)
      }
    })
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_STORAGE_KEY) setVisible(false)
    }
    window.addEventListener('storage', onStorage)
    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  if (!visible) return null

  const decide = (choice: { analytics: boolean; ads: boolean }) => {
    applyConsent(choice)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie and tracking preferences"
      className="fixed bottom-4 left-4 z-[70] max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl bg-[#0B1220]/95 backdrop-blur-xl border border-slate-400/20 shadow-2xl p-4 animate-in slide-in-from-bottom-3 fade-in duration-200"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
          <Cookie className="w-4 h-4 text-amber-400" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white leading-snug">
            Cookies help us improve PlayBeat
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
            We use analytics and advertising cookies to measure traffic and improve offers.
            You can accept all, or keep only what's essential. See our{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
              Privacy Policy
            </a>
            .
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => decide({ analytics: true, ads: true })}
              className="px-3.5 py-2 rounded-xl btn-gold-gradient text-slate-950 text-[11px] font-extrabold active:scale-95 transition"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => decide({ analytics: true, ads: false })}
              className="px-3.5 py-2 rounded-xl bg-white/5 border border-slate-400/20 text-slate-200 text-[11px] font-semibold hover:bg-white/10 transition"
            >
              Analytics only
            </button>
            <button
              type="button"
              onClick={() => decide({ analytics: false, ads: false })}
              className="px-3.5 py-2 rounded-xl text-slate-400 text-[11px] font-semibold hover:text-white transition"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-500">
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span>Consent Mode v2 · change anytime by clearing site data</span>
      </div>
    </div>
  )
}

/** True when ads may render on this path (checkout/order/admin are always excluded). */
export function adsAllowedOnPath(pathname: string): boolean {
  const cfg = getTrackingConfigSync()
  if (!cfg?.adsEnabled || !cfg.adsense) return false
  const blocked = ['/checkout', '/order', '/account', '/admin', '/contact', '/compare', '/auth']
  return !blocked.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
