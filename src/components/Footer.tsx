import React, { useEffect, useState } from 'react'
import {
  ShieldCheck,
  FileText,
  Lock,
  Headphones,
  RefreshCw,
  ArrowRight,
  User,
  Package,
  ShoppingCart,
  LifeBuoy,
  Download,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  ExternalLink,
  Store,
  Truck,
} from 'lucide-react'
import { FooterInfoModal } from './FooterInfoModal'
import { fetchAppsConfig, isListable, type StorefrontAppsConfig } from '../lib/appLinks'
import { AppleAppStoreBadge, GooglePlayBadge } from './app/AppStoreBadges'

type InfoType = 'privacy' | 'terms' | 'refund' | 'track' | 'warranty' | 'contact'

export interface FooterCms {
  contact: {
    email?: string
    supportEmail?: string
    whatsapp?: string
    phone?: string
    address?: string
    hours?: string
    wechat?: string
    whatsappBusiness?: string
    telegram?: string
  }
  social: {
    instagram?: string
    facebook?: string
    tiktok?: string
    telegram?: string
  }
  footer?: {
    uptimeNote?: string
  }
}

export const Footer: React.FC<{ cms?: FooterCms | null }> = ({ cms }) => {
  const [infoType, setInfoType] = useState<InfoType | null>(null)
  const [apps, setApps] = useState<StorefrontAppsConfig | null>(null)
  const supportEmail = cms?.contact?.supportEmail || 'support@playbeat.pro'
  const whatsapp = cms?.contact?.whatsapp || '923321049333'
  const uptimeNote = cms?.footer?.uptimeNote || 'Fulfillment Systems Active (99.99% Uptime)'

  // ---- Complete contact section values (CMS-driven with the same fallbacks
  // as /contact so the footer always shows the real channels) ----
  const contactEmail = cms?.contact?.email || 'support@playbeat.digital'
  const contactPhone = cms?.contact?.phone || '+92 332 1049333'
  const contactAddress =
    cms?.contact?.address ||
    'HOUSE 334, Street 6, Jinnahabad, Abbottabad, Pakistan'
  const company = 'Playbeat Digital Private Limited'
  const waDigits = whatsapp.replace(/[^\d]/g, '')
  const waLink = `https://wa.me/${waDigits}`
  const prettyWa = `+${waDigits.replace(/^92/, '92 ')}`
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactAddress)}`
  const waLines = [
    { label: 'WhatsApp Line 1 — Orders', num: '923321049333', pretty: '+92 332 1049333' },
    { label: 'WhatsApp Line 2 — Support', num: '923321029333', pretty: '+92 332 1029333' },
    { label: 'WhatsApp Line 3 — Escalations', num: '923341079333', pretty: '+92 334 1079333' },
  ]
  const messagingHandle = '@playbeatdigital01'

  useEffect(() => {
    let alive = true
    fetchAppsConfig().then((c) => {
      if (alive) setApps(c)
    })
    return () => {
      alive = false
    }
  }, [])

  const showApps = apps ? apps.footerVisible : true // render optimistically; hidden after config loads if disabled
  const androidHref = isListable(apps?.android) ? apps!.android.url : ''
  const iosHref = isListable(apps?.ios) ? apps!.ios.url : ''

  return (
    <>
      <footer className="w-full bg-[#040816] border-t border-slate-400/10 text-slate-400 text-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12">
          {/* ============ APP CTA BAND (premium, compact) ============ */}
          {showApps && (
            <div className="mb-10 rounded-2xl bg-gradient-to-r from-[#0A122E]/95 via-[#0D1531] to-[#0A122E]/95 border border-amber-400/20 p-5 sm:p-6 relative overflow-hidden">
              <div
                className="pointer-events-none absolute -top-16 right-10 w-56 h-56 rounded-full bg-amber-500/[0.08] blur-2xl"
                aria-hidden="true"
              />
              <div className="relative flex flex-col lg:flex-row items-center gap-5">
                <div className="flex-1 text-center lg:text-left">
                  <h3 className="text-base sm:text-lg font-extrabold text-white font-sans tracking-tight">
                    Download the PlayBeat Digital App
                  </h3>
                  <p className="text-[11px] sm:text-xs text-amber-300/90 font-mono mt-1 tracking-wide">
                    Shop • Manage Orders • Secure Checkout
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <GooglePlayBadge href={androidHref} height={42} pendingLabel="Google Play listing pending deployment" />
                  <AppleAppStoreBadge href={iosHref} height={42} pendingLabel="App Store listing pending deployment" />
                  <a
                    href="/download"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl btn-gold-gradient text-slate-950 text-xs font-extrabold active:scale-[0.98] transition"
                  >
                    <Download className="w-4 h-4" />
                    Download &amp; Install
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
            {/* Brand Col */}
            <div className="md:col-span-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <img
                  src="/playbeat-logo.png"
                  alt="PlayBeat"
                  className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                />
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm font-sans">
                Your premier digital license marketplace and official partner for Magcubic 4K smart
                projectors. Instant 24/7 automated delivery worldwide.
              </p>
              <div className="flex items-center gap-2 text-yellow-400 text-[11px] font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                {uptimeNote}
              </div>
            </div>

            {/* Quick Links — every link is a real, indexable URL */}
            <div className="md:col-span-3 space-y-2.5 font-sans">
              <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                Quick Links
              </h4>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <a href="/" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Home
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/storefront" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Products
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/streaming" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Categories
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/about" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    About &amp; Business Model
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/compare" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Projector Comparison
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Customer Care */}
            <div className="md:col-span-2 space-y-2.5 font-sans">
              <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                Customer
              </h4>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <a href="/account" className="flex items-center gap-2 hover:text-yellow-300 transition">
                    <User className="w-3.5 h-3.5 text-yellow-400" /> My Account
                  </a>
                </li>
                <li>
                  <a href="/account?tab=orders" className="flex items-center gap-2 hover:text-yellow-300 transition">
                    <Package className="w-3.5 h-3.5 text-yellow-400" /> Orders
                  </a>
                </li>
                <li>
                  <a href="/storefront" className="flex items-center gap-2 hover:text-yellow-300 transition">
                    <ShoppingCart className="w-3.5 h-3.5 text-yellow-400" /> Cart
                  </a>
                </li>
                <li>
                  <a href="/contact" className="flex items-center gap-2 hover:text-yellow-300 transition">
                    <LifeBuoy className="w-3.5 h-3.5 text-yellow-400" /> Support
                  </a>
                </li>
                <li>
                  <a href="/refund-policy" className="flex items-center gap-2 hover:text-yellow-300 transition">
                    <RefreshCw className="w-3.5 h-3.5 text-yellow-400" /> Refund Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* Download App column */}
            {showApps && (
              <div className="md:col-span-3 space-y-2.5 font-sans">
                <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                  Download App
                </h4>
                <ul className="space-y-2 text-slate-400 text-xs">
                  <li>
                    <a
                      href={androidHref || '/download'}
                      target={androidHref ? '_blank' : undefined}
                      rel={androidHref ? 'noopener noreferrer' : undefined}
                      className="flex items-center gap-2 hover:text-yellow-300 transition group"
                    >
                      <span className="scale-[0.52] origin-left -mr-2"><GooglePlayBadge href={androidHref} height={40} pendingLabel="Google Play — pending deployment" /></span>
                      {!androidHref && <span className="text-slate-500 group-hover:text-yellow-300 transition">Google Play</span>}
                    </a>
                  </li>
                  <li>
                    <a
                      href={iosHref || '/download'}
                      target={iosHref ? '_blank' : undefined}
                      rel={iosHref ? 'noopener noreferrer' : undefined}
                      className="flex items-center gap-2 hover:text-yellow-300 transition group"
                    >
                      <span className="scale-[0.52] origin-left -mr-2"><AppleAppStoreBadge href={iosHref} height={40} pendingLabel="App Store — pending deployment" /></span>
                      {!iosHref && <span className="text-slate-500 group-hover:text-yellow-300 transition">App Store</span>}
                    </a>
                  </li>
                  <li>
                    <a href="/download" className="flex items-center gap-2 hover:text-yellow-300 transition">
                      <Download className="w-3.5 h-3.5 text-yellow-400" /> Download &amp; Install
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="flex items-center gap-2 hover:text-yellow-300 transition">
                      <Headphones className="w-3.5 h-3.5 text-yellow-400" /> App Support
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* ============ CONTACT PLAYBEAT — complete contact section ============ */}
          <div className="pt-8 pb-6 border-t border-slate-400/10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5">
              <div>
                <h3 className="text-sm font-extrabold text-white font-sans tracking-tight flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-yellow-400" />
                  Contact PlayBeat
                </h3>
                <p className="text-[11px] text-slate-500 font-sans mt-1">
                  Real humans, real channels — pick whichever suits you best.
                </p>
              </div>
              <a
                href="/contact"
                className="group inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-yellow-300 transition"
              >
                Full contact page
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            {/* 4 direct channels */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <a
                href={`mailto:${contactEmail}`}
                className="group flex items-start gap-3 p-3.5 rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 hover:border-yellow-400/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-400/30 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-yellow-400" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-white">Email Us</span>
                  <span className="block text-[10px] text-slate-400 truncate group-hover:text-yellow-300 transition">{contactEmail}</span>
                </span>
              </a>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 p-3.5 rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 hover:border-emerald-400/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-white">WhatsApp 24/7</span>
                  <span className="block text-[10px] text-slate-400 font-mono group-hover:text-emerald-300 transition">{prettyWa}</span>
                </span>
              </a>
              <a
                href={`tel:${contactPhone.replace(/\s/g, '')}`}
                className="group flex items-start gap-3 p-3.5 rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 hover:border-sky-400/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-white">Call Support</span>
                  <span className="block text-[10px] text-slate-400 font-mono group-hover:text-sky-300 transition">{contactPhone}</span>
                </span>
              </a>
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 p-3.5 rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 hover:border-pink-400/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-400/30 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-pink-400" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold text-white">Visit Office</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-pink-300 transition">
                    Open in Maps <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </span>
              </a>
            </div>

            {/* Registered office · WhatsApp order lines · Quick messaging */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#0A122E]/60 border border-slate-400/15">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[11px] font-bold text-white">Registered Office</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{company}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{contactAddress}</p>
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2.5 text-[10px] font-semibold text-yellow-300 hover:text-yellow-200 transition"
                >
                  Get Directions <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-[#0A122E]/60 border border-slate-400/15">
                <div className="flex items-center gap-2 mb-2.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-bold text-white">WhatsApp Order Lines</span>
                </div>
                <div className="space-y-1.5">
                  {waLines.map((l) => (
                    <a
                      key={l.num}
                      href={`https://wa.me/${l.num}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 hover:border-emerald-400/40 transition group"
                    >
                      <span className="text-[10px] text-slate-400 truncate">{l.label}</span>
                      <span className="text-[10px] font-mono font-bold text-emerald-300 group-hover:text-emerald-200 shrink-0">{l.pretty}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0A122E]/60 border border-slate-400/15">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[11px] font-bold text-white">Quick Messaging</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  WeChat / WhatsApp / Telegram:{' '}
                  <code className="text-amber-300 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">{messagingHandle}</code>
                </p>
                <p className="text-[10px] text-slate-500 mt-2.5 leading-relaxed">
                  Fastest replies on WhatsApp — average response under 15 minutes, 24/7.
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Dynamic Buttons — Policies & Contact (all real indexable URLs) */}
          <div className="pt-2 pb-6 border-t border-slate-400/10">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              {
                [
                  {
                    href: '/warranty',
                    icon: <ShieldCheck className="w-4 h-4" />,
                    title: 'Warranty & Replacement',
                    subtitle: 'Coverage & how to claim',
                    chip: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-300',
                    glow: 'hover:border-yellow-400/60 hover:shadow-[0_0_28px_rgba(255,193,7,0.25)]',
                  },
                  {
                    href: '/privacy',
                    icon: <Lock className="w-4 h-4" />,
                    title: 'Privacy Policy',
                    subtitle: 'How your data is protected',
                    chip: 'bg-violet-500/15 border-violet-400/30 text-violet-300',
                    glow: 'hover:border-violet-400/60 hover:shadow-[0_0_28px_rgba(139,92,246,0.25)]',
                  },
                  {
                    href: '/terms',
                    icon: <FileText className="w-4 h-4" />,
                    title: 'Terms & Conditions',
                    subtitle: 'Fair usage & licensing terms',
                    chip: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
                    glow: 'hover:border-sky-400/60 hover:shadow-[0_0_28px_rgba(56,189,248,0.25)]',
                  },
                  {
                    href: '/refund-policy',
                    icon: <RefreshCw className="w-4 h-4" />,
                    title: 'Refund Policy',
                    subtitle: 'Fast, transparent resolutions',
                    chip: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
                    glow: 'hover:border-emerald-400/60 hover:shadow-[0_0_28px_rgba(52,211,153,0.25)]',
                  },
                  {
                    href: '/shipping-policy',
                    icon: <Truck className="w-4 h-4" />,
                    title: 'Shipping Policy',
                    subtitle: 'Digital & hardware delivery',
                    chip: 'bg-orange-500/15 border-orange-400/30 text-orange-300',
                    glow: 'hover:border-orange-400/60 hover:shadow-[0_0_28px_rgba(251,146,60,0.25)]',
                  },
                  {
                    href: '/about',
                    icon: <Store className="w-4 h-4" />,
                    title: 'About & Business Model',
                    subtitle: 'How we operate & payments work',
                    chip: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-300',
                    glow: 'hover:border-yellow-400/60 hover:shadow-[0_0_28px_rgba(255,193,7,0.25)]',
                  },
                  {
                    href: '/contact',
                    icon: <Headphones className="w-4 h-4" />,
                    title: 'Contact',
                    subtitle: '24/7 channels & office address',
                    chip: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
                    glow: 'hover:border-amber-400/60 hover:shadow-[0_0_28px_rgba(255,193,7,0.25)]',
                  },
                ].map((btn) => (
                <a
                  key={btn.href}
                  href={btn.href}
                  className={`group relative flex items-center gap-3 p-3.5 rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 ${btn.glow}`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${btn.chip}`}
                  >
                    {btn.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white truncate font-sans">
                      {btn.title}
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate font-sans group-hover:text-slate-400 transition">
                      {btn.subtitle}
                    </span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-yellow-300 group-hover:translate-x-1 transition-all duration-300" />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-slate-400/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[10px] font-mono">
            <div className="text-center sm:text-left leading-relaxed">
              <div>© {new Date().getFullYear()} Playbeat Digital Private Limited. All rights reserved.</div>
              <div className="text-slate-600 mt-0.5">{contactAddress}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Secure checkout · Instant delivery
              </span>
            </div>
          </div>
        </div>
      </footer>

      <FooterInfoModal type={infoType} onClose={() => setInfoType(null)} />
    </>
  )
}
