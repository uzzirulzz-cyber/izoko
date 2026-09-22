import React, { useEffect, useMemo, useState } from 'react'
import {
  Smartphone,
  Apple,
  QrCode,
  ShieldCheck,
  Zap,
  Bell,
  RefreshCw,
  ChevronDown,
  Headphones,
  Lock,
  MonitorSmartphone,
  Loader2,
  CloudOff,
  ArrowRight,
  BadgeCheck,
  PackageCheck,
} from 'lucide-react'
import { fetchAppsConfig, detectDevice, isListable, isStandalonePwa, type StorefrontAppsConfig, type DeviceKind } from '../../lib/appLinks'
import { AppleAppStoreBadge, GooglePlayBadge } from './AppStoreBadges'
import { AppQRCode } from './AppQRCode'
import { trackEvent } from '../../lib/googleTag'

/**
 * /download — premium mobile-app landing page.
 * Device-aware ordering (Android → Google Play first, iOS → App Store first,
 * desktop → both + QR), honest pending states for listings that are not yet
 * live, features, security, FAQ and support. Never auto-downloads anything.
 */

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant delivery',
    body: 'License keys and activation codes arrive in seconds — push notification the moment your order is fulfilled.',
  },
  {
    icon: PackageCheck,
    title: 'Live order tracking',
    body: 'Follow every order from checkout to delivery. Courier-dispatched hardware gets live status updates too.',
  },
  {
    icon: Lock,
    title: 'Same secure account',
    body: 'Sign in with the exact account you use on the website — cart, orders and wishlist stay in sync in real time.',
  },
  {
    icon: Bell,
    title: 'Smart notifications',
    body: 'Price drops on your favorite subscriptions, order status changes and support replies — only what matters.',
  },
]

const SECURITY = [
  { icon: ShieldCheck, label: 'HTTPS-only, certificate pinned traffic' },
  { icon: Lock, label: 'Sessions stored in the OS secure enclave / Keystore' },
  { icon: BadgeCheck, label: 'Official store builds — signed & verified' },
  { icon: MonitorSmartphone, label: 'Biometric unlock (fingerprint / face)' },
]

const FAQ = [
  {
    q: 'Is the mobile app free?',
    a: 'Yes — the PlayBeat Digital app is completely free on both Google Play and the App Store. You only pay for the products you purchase, at the same prices as the website.',
  },
  {
    q: 'Do I need a new account for the app?',
    a: 'No. The app uses the same customer accounts as playbeat.digital. Sign in with your existing email and password, or Google / Facebook — your orders, cart and profile sync instantly.',
  },
  {
    q: 'How is the app different from the website?',
    a: 'The app adds push notifications for order status and price drops, biometric login, offline access to your recent orders, and one-tap reordering. Everything else — catalog, prices, checkout — is identical.',
  },
  {
    q: 'What are the system requirements?',
    a: 'Android 8.0 or newer, and iOS 16 or newer. The app is optimized for phones and tablets and works on both Wi-Fi and mobile data.',
  },
  {
    q: 'Is there a web app too?',
    a: 'Yes — on desktop and mobile browsers you can install PlayBeat as a PWA directly from the browser (no store needed). It is lighter and lives alongside the native apps; look for the Install button.',
  },
  {
    q: 'A badge says "pending deployment" — what does that mean?',
    a: 'That store listing is in final review and has not gone live yet. You will be the first to know: the badge activates automatically the moment the app is published. Meanwhile the website and PWA are fully functional.',
  },
]

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/12 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left group"
        aria-expanded={open}
      >
        <span className="text-[13px] font-bold text-slate-200 group-hover:text-white transition">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-amber-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 text-xs text-slate-400 leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  )
}

export const DownloadPage: React.FC = () => {
  const [cfg, setCfg] = useState<StorefrontAppsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const device = useMemo<DeviceKind>(() => detectDevice(), [])

  useEffect(() => {
    let alive = true
    fetchAppsConfig().then((c) => {
      if (!alive) return
      setCfg(c)
      setLoading(false)
    })
    // fire a lightweight event so admins can see funnel interest
    trackEvent('view_item_list', { item_list_id: 'app_download_page', item_list_name: 'App Download Page' })
    return () => {
      alive = false
    }
  }, [])

  const androidLive = isListable(cfg?.android)
  const iosLive = isListable(cfg?.ios)

  // Device-first ordering: primary platform first
  const primaryIsAndroid = device === 'android' || device === 'desktop'

  const PlatformButton: React.FC<{ platform: 'android' | 'ios'; primary: boolean }> = ({ platform, primary }) => {
    const live = platform === 'android' ? androidLive : iosLive
    const href = platform === 'android' ? cfg?.android.url : cfg?.ios.url
    const badge =
      platform === 'android' ? (
        <GooglePlayBadge href={live ? href : ''} height={52} pendingLabel="Google Play listing pending deployment" />
      ) : (
        <AppleAppStoreBadge href={live ? href : ''} height={52} pendingLabel="App Store listing pending deployment" />
      )
    return (
      <div className={`flex flex-col items-center gap-1.5 ${primary ? 'order-1' : 'order-2'}`}>
        {badge}
        {!live && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-300/90">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending deployment
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#040816] text-slate-300">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-slate-400/10">
        <div
          className="pointer-events-none absolute -top-32 right-1/4 w-[520px] h-[520px] rounded-full bg-amber-500/[0.08] blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-40 -left-32 w-[380px] h-[380px] rounded-full bg-violet-500/[0.07] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 pt-12 pb-14 sm:pt-16 sm:pb-20">
          {/* logo */}
          <div className="flex items-center justify-center mb-8">
            <img
              src="/playbeat-logo.png"
              alt="PlayBeat Digital"
              className="h-11 w-auto object-contain drop-shadow-[0_0_16px_rgba(255,193,7,0.35)]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 text-center lg:text-left space-y-5">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-[1.1] font-sans">
                PlayBeat Digital,
                <br />
                <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">
                  now in your pocket.
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
                Shop digital products faster, manage your orders, and access your account anywhere.
                One account across web and app — instant delivery, secure checkout, zero compromises.
              </p>

              {/* device hint */}
              {loading ? (
                <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-500 font-mono h-8">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting your device…
                </div>
              ) : (
                <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400 font-mono">
                  {device === 'android' && <><Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Android detected — Google Play first</>}
                  {device === 'ios' && <><Apple className="w-3.5 h-3.5 text-sky-300" /> iPhone / iPad detected — App Store first</>}
                  {device === 'desktop' && <><MonitorSmartphone className="w-3.5 h-3.5 text-violet-300" /> Desktop — pick a store or scan the QR with your phone</>}
                </div>
              )}

              {/* badges — device-primary first */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-2">
                {primaryIsAndroid ? (
                  <>
                    <PlatformButton platform="android" primary />
                    <PlatformButton platform="ios" primary={false} />
                  </>
                ) : (
                  <>
                    <PlatformButton platform="ios" primary />
                    <PlatformButton platform="android" primary={false} />
                  </>
                )}
              </div>

              <p className="text-[11px] text-slate-500 font-mono flex items-center justify-center lg:justify-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Official builds only · we never auto-download or install anything
              </p>
            </div>

            {/* mockup + QR */}
            <div className="lg:col-span-5 flex flex-col items-center gap-6">
              <div className="relative" aria-hidden="true">
                <div className="w-[190px] h-[380px] sm:w-[210px] sm:h-[420px] rounded-[2.4rem] bg-gradient-to-b from-[#101B3F] to-[#050814] border border-slate-400/25 shadow-[0_24px_70px_rgba(0,0,0,0.65)] p-2">
                  <div className="w-full h-full rounded-[2rem] bg-[#070C1F] overflow-hidden border border-slate-400/10 flex flex-col">
                    <div className="h-6 flex items-center justify-center">
                      <div className="w-16 h-1.5 rounded-full bg-slate-400/30" />
                    </div>
                    <div className="px-3 pt-1 flex items-center justify-between">
                      <img src="/playbeat-logo.png" alt="" className="h-5 object-contain" />
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-amber-400/25" />
                        <div className="w-3 h-3 rounded-full bg-slate-400/25" />
                      </div>
                    </div>
                    <div className="mx-3 mt-2.5 h-7 rounded-lg bg-[#0A122E] border border-slate-400/10 flex items-center px-2">
                      <div className="w-3 h-3 rounded-full border border-slate-400/40" />
                      <div className="ml-2 h-1 w-20 rounded bg-slate-400/20" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-3">
                      {['#F59E0B22', '#8B5CF622', '#10B98122', '#3B82F622', '#EF444422', '#F59E0B22'].map((c, i) => (
                        <div key={i} className="h-14 rounded-lg bg-[#0A122E] border border-slate-400/10 p-1.5">
                          <div className="w-5 h-5 rounded" style={{ background: c }} />
                          <div className="mt-1 h-1 w-6 rounded bg-slate-400/20" />
                        </div>
                      ))}
                    </div>
                    <div className="px-3">
                      <div className="h-10 rounded-xl bg-[#0A122E] border border-amber-400/20 p-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <div className="flex-1">
                          <div className="h-1.5 w-16 rounded bg-slate-400/30" />
                          <div className="mt-1 h-1 w-10 rounded bg-emerald-400/40" />
                        </div>
                      </div>
                    </div>
                    <div className="mx-3 mt-auto mb-3 h-8 rounded-lg bg-gradient-to-r from-amber-300 to-yellow-500 flex items-center justify-center gap-1.5">
                      <div className="h-1.5 w-20 rounded bg-slate-900/70" />
                    </div>
                  </div>
                </div>
                <div className="absolute -inset-4 rounded-[3rem] bg-amber-400/[0.07] blur-2xl -z-10" />
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="p-3.5 rounded-2xl bg-white shadow-[0_10px_40px_rgba(255,193,7,0.18)]">
                  <AppQRCode value={cfg?.qrValue || 'https://playbeat.digital/download'} size={136} />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  Scan with your phone camera
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= VERSIONS STRIP ================= */}
      {cfg && (
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 -mt-px py-5 border-b border-slate-400/10">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] font-mono text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${androidLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              Android v{cfg.android.version} · {cfg.android.minOsVersion}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${iosLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              iOS v{cfg.ios.version} · iOS {cfg.ios.minOsVersion}+
            </span>
            {cfg.promoBanner && (
              <span className="text-amber-300/90">📣 {cfg.promoBanner}</span>
            )}
          </div>
        </section>
      )}

      {/* ================= FEATURES ================= */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white text-center font-sans mb-2">
          Built for the way you shop
        </h2>
        <p className="text-center text-slate-500 text-sm mb-9 max-w-lg mx-auto">
          Everything you love about the storefront, engineered natively for Android and iOS.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/12 p-5 hover:border-amber-400/30 hover:shadow-[0_0_30px_rgba(255,193,7,0.08)] transition-all duration-300"
            >
              <span className="w-10 h-10 rounded-xl bg-amber-500/12 border border-amber-400/25 flex items-center justify-center mb-3.5">
                <f.icon className="w-5 h-5 text-amber-400" />
              </span>
              <h3 className="text-sm font-bold text-white mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECURITY / TRUST ================= */}
      <section className="border-y border-slate-400/10 bg-[#03060F]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2.5 mb-6 justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-extrabold text-white font-sans">Security &amp; trust</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SECURITY.map((s) => (
              <div key={s.label} className="flex items-start gap-2.5 rounded-xl bg-[#0A122E]/70 border border-slate-400/10 p-3.5">
                <s.icon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-xs text-slate-300 leading-relaxed">{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-slate-500 font-mono mt-6 max-w-2xl mx-auto leading-relaxed">
            PlayBeat never asks for card details in chat or email, never auto-installs software, and only
            distributes apps through official stores and this page. Report anything suspicious to support immediately.
          </p>
        </div>
      </section>

      {/* ================= PWA DISTINCTION ================= */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl bg-[#0A122E]/80 border border-violet-400/20 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
          <span className="w-14 h-14 rounded-2xl bg-violet-500/12 border border-violet-400/30 flex items-center justify-center shrink-0">
            <CloudOff className="w-7 h-7 text-violet-300" />
          </span>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-base font-extrabold text-white font-sans mb-1">Prefer not to install an app?</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
              Install the PlayBeat <strong className="text-slate-200">PWA (Progressive Web App)</strong> directly from your
              browser — it is lighter than a store app, works offline for browsing, and uses the exact same
              account. This is different from the native Android / iOS apps above; both can coexist on your device.
            </p>
          </div>
          {isStandalonePwa() ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-400/30 text-emerald-300 text-xs font-bold shrink-0">
              <BadgeCheck className="w-4 h-4" /> PWA already installed
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-mono shrink-0">
              Look for the <span className="text-violet-300">Install</span> chip or use your browser's
              "Install app" menu.
            </span>
          )}
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="max-w-[860px] mx-auto px-4 sm:px-6 pb-14">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white text-center font-sans mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-2.5">
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ================= SUPPORT ================= */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-2xl bg-gradient-to-br from-[#0A122E] to-[#0D1830] border border-amber-400/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
          <span className="w-12 h-12 rounded-2xl bg-amber-500/12 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-amber-400" />
          </span>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base font-extrabold text-white font-sans">Need help with the app?</h3>
            <p className="text-xs text-slate-400 mt-1">
              24/7 WhatsApp and live-chat support — installation help, login issues, everything.
            </p>
          </div>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl btn-gold-gradient text-slate-950 text-xs font-extrabold active:scale-[0.98] transition shrink-0"
          >
            Customer support
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  )
}
