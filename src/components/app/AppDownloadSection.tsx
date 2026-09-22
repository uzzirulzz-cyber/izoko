import React, { useEffect, useState } from 'react'
import { Smartphone, QrCode, ShieldCheck, Zap, Bell, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react'
import { fetchAppsConfig, isListable, type StorefrontAppsConfig } from '../../lib/appLinks'
import { AppleAppStoreBadge, GooglePlayBadge } from './AppStoreBadges'
import { AppQRCode } from './AppQRCode'

/** Ambient brand clip shown behind the section, faded to 20% opacity. */
const BG_VIDEO_SRC = '/media/app-bg.mp4'
const BG_POSTER_SRC = '/media/app-bg-poster.jpg'

/**
 * Homepage "Get the PlayBeat Digital App" section — premium dark/amber
 * treatment consistent with the storefront theme. Fully driven by the
 * admin-configurable app config: hidden entirely when the admin turns the
 * section off; badges render honest "Coming soon" states when a store
 * listing is not yet live.
 */
export const AppDownloadSection: React.FC = () => {
  const [cfg, setCfg] = useState<StorefrontAppsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [bgReady, setBgReady] = useState(false)

  useEffect(() => {
    let alive = true
    fetchAppsConfig().then((c) => {
      if (!alive) return
      setCfg(c)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <section className="w-full bg-[#040816] border-t border-slate-400/10 py-10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
      </section>
    )
  }
  // Admin visibility switch — respect it silently
  if (!cfg?.homeSectionVisible) return null

  const features = [
    { icon: Zap, label: 'Instant key delivery' },
    { icon: ShoppingBag, label: 'Live order tracking' },
    { icon: Bell, label: 'Order notifications' },
    { icon: ShieldCheck, label: 'Secure checkout' },
  ]

  return (
    <section className="w-full bg-[#040816] border-t border-slate-400/10 overflow-hidden relative" aria-label="Get the PlayBeat Digital app">
      {/* Ambient brand video background — user-supplied clip, faded to 20%.
          Silent (no audio track), loops seamlessly, never intercepts input.
          prefers-reduced-motion users get the static poster frame instead. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <video
          className={`absolute inset-0 w-full h-full object-cover object-center blur-[1.5px] scale-[1.03] transition-opacity duration-[1400ms] ease-out motion-reduce:hidden ${bgReady ? 'opacity-20' : 'opacity-0'}`}
          src={BG_VIDEO_SRC}
          poster={BG_POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setBgReady(true)}
          onLoadedData={() => setBgReady(true)}
          onPlaying={() => setBgReady(true)}
        />
        {/* static poster fallback — only rendered for reduced-motion users */}
        <img
          src={BG_POSTER_SRC}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20 motion-safe:hidden"
        />
        {/* blend the clip into the section background (edge fades + text-side scrim) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040816] via-transparent to-[#040816]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040816]/55 via-transparent to-[#040816]/25" />
      </div>
      {/* ambient glow */}
      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <div
          className="pointer-events-none absolute -top-24 left-1/4 w-[420px] h-[420px] rounded-full bg-amber-500/[0.07] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Copy + badges */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/25 bg-amber-500/10 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Smartphone className="w-3.5 h-3.5" />
              Android &amp; iOS
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight font-sans">
              Get the PlayBeat Digital App{' '}
              <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
                on your mobile
              </span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl font-sans">
              Shop digital products faster, manage your orders, and access your account anywhere.
              Same account, same prices, same instant delivery — synced with the website in real time.
            </p>

            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl">
              {features.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0A122E]/80 border border-slate-400/12 text-slate-300"
                >
                  <f.icon className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">{f.label}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <GooglePlayBadge
                href={isListable(cfg.android) ? cfg.android.url : ''}
                height={46}
                pendingLabel="Google Play listing pending deployment"
              />
              <AppleAppStoreBadge
                href={isListable(cfg.ios) ? cfg.ios.url : ''}
                height={46}
                pendingLabel="App Store listing pending deployment"
              />
              <a
                href="/download"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition group"
              >
                Download &amp; Install
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            {(!isListable(cfg.android) || !isListable(cfg.ios)) && (
              <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {!isListable(cfg.android) && !isListable(cfg.ios)
                  ? 'Both store listings are in final review — pending deployment.'
                  : !isListable(cfg.android)
                    ? 'Google Play listing pending deployment.'
                    : 'App Store listing pending deployment.'}
              </p>
            )}
          </div>

          {/* QR + phone mockup */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end gap-8">
            <div className="hidden sm:flex flex-col items-center gap-2.5">
              <div className="p-3 rounded-2xl bg-white shadow-[0_8px_36px_rgba(255,193,7,0.15)] border border-slate-200">
                <AppQRCode value={cfg.qrValue} size={128} />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <QrCode className="w-3 h-3 text-amber-400" />
                Scan to install
              </div>
            </div>

            {/* phone mockup */}
            <div className="relative" aria-hidden="true">
              <div className="w-[150px] h-[300px] sm:w-[170px] sm:h-[340px] rounded-[2rem] bg-gradient-to-b from-[#101B3F] to-[#050814] border border-slate-400/25 shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-2">
                <div className="w-full h-full rounded-[1.6rem] bg-[#070C1F] overflow-hidden border border-slate-400/10 flex flex-col">
                  <div className="h-5 flex items-center justify-center">
                    <div className="w-14 h-1.5 rounded-full bg-slate-400/30" />
                  </div>
                  <div className="px-2.5 pt-1">
                    <img src="/playbeat-logo.png" alt="" className="h-5 object-contain" />
                  </div>
                  <div className="mx-2.5 mt-2 h-6 rounded-lg bg-[#0A122E] border border-slate-400/10 flex items-center px-2">
                    <div className="w-2.5 h-2.5 rounded-full border border-slate-400/40" />
                    <div className="ml-1.5 h-1 w-14 rounded bg-slate-400/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-2.5">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 rounded-lg bg-[#0A122E] border border-slate-400/10 p-1.5">
                        <div className="w-4 h-4 rounded bg-amber-400/20" />
                        <div className="mt-1 h-1 w-8 rounded bg-slate-400/20" />
                      </div>
                    ))}
                  </div>
                  <div className="mx-2.5 mt-auto mb-2.5 h-7 rounded-lg bg-gradient-to-r from-amber-300 to-yellow-500 flex items-center justify-center">
                    <div className="h-1.5 w-16 rounded bg-slate-900/70" />
                  </div>
                </div>
              </div>
              <div className="absolute -inset-3 rounded-[2.5rem] bg-amber-400/[0.06] blur-xl -z-10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
