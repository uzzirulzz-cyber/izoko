import React from 'react'
import {
  Home,
  Package,
  Repeat,
  LayoutGrid,
  BadgePercent,
  Headphones,
  Search,
  ArrowRight,
  Gamepad2,
  Gift,
  CreditCard,
  PlaySquare,
  Projector,
  ShieldCheck,
  FileText,
  Lock,
  RefreshCw,
  Mail,
  GitCompareArrows,
} from 'lucide-react'
import { UserAccount } from '../types'

interface BrowseNowProps {
  user: { name: string; email: string } | null
  onNavigate: (path: string) => void
  onSelectCategory: (category: string) => void
  onOpenAuth: () => void
  onFocusSearch: () => void
  onOpenOffers: () => void
}

// Subcategory collections (each maps to a real, indexable URL)
const SUBCATEGORIES: { label: string; path: string; desc: string }[] = [
  { label: 'Smart 4K Projectors', path: '/smart-4k-projectors', desc: 'Native 4K & 1080p home cinema' },
  { label: 'AI Subscriptions', path: '/ai-subscriptions', desc: 'ChatGPT, Perplexity, Leonardo' },
  { label: 'Steam & Game Keys', path: '/steam-game-keys', desc: 'Wallet codes & game keys' },
  { label: 'Windows & Office', path: '/windows-office', desc: 'Genuine retail license keys' },
  { label: 'Creative Software', path: '/creative-software', desc: 'Adobe CC, CapCut, Freepik' },
]

const CATEGORIES: {
  name: string
  path: string
  icon: React.ReactNode
  desc: string
  accent: string
  edge: string
}[] = [
  { name: 'Streaming', path: '/streaming', icon: <PlaySquare className="w-5 h-5" />, desc: 'Netflix, Prime Video, Disney+', accent: 'text-rose-300', edge: 'hover:border-rose-400/50' },
  { name: 'Subscriptions', path: '/subscriptions', icon: <Repeat className="w-5 h-5" />, desc: 'ChatGPT, Office 365, VPNs', accent: 'text-emerald-300', edge: 'hover:border-emerald-400/50' },
  { name: 'Gift Cards', path: '/giftcards', icon: <Gift className="w-5 h-5" />, desc: 'Xbox, PSN, Steam, Apple', accent: 'text-amber-300', edge: 'hover:border-amber-400/50' },
  { name: 'Gaming', path: '/gaming', icon: <Gamepad2 className="w-5 h-5" />, desc: 'Game Pass & top-ups', accent: 'text-indigo-300', edge: 'hover:border-indigo-400/50' },
  { name: 'Software', path: '/software', icon: <CreditCard className="w-5 h-5" />, desc: 'Windows 11, Office, antivirus', accent: 'text-purple-300', edge: 'hover:border-purple-400/50' },
  { name: 'Smart Projectors', path: '/smart-projectors', icon: <Projector className="w-5 h-5" />, desc: 'Magcubic 4K home cinema', accent: 'text-cyan-300', edge: 'hover:border-cyan-400/50' },
]

const SUPPORT_LINKS = [
  { label: 'Warranty & Replacement Policy', path: '/warranty', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { label: 'Privacy Policy', path: '/privacy', icon: <Lock className="w-3.5 h-3.5" /> },
  { label: 'Terms of Service', path: '/terms', icon: <FileText className="w-3.5 h-3.5" /> },
  { label: 'Refund Policy', path: '/refund-policy', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { label: 'Contact', path: '/contact', icon: <Mail className="w-3.5 h-3.5" /> },
]

/**
 * Browse Now — the storefront discovery hub.
 * One section that links every key destination: quick nav, product search,
 * account actions, all 6 categories, 5 curated subcategory collections,
 * the projector comparison tool and the full support/legal library.
 */
export const BrowseNow: React.FC<BrowseNowProps> = ({
  user,
  onNavigate,
  onSelectCategory,

  onFocusSearch,
  onOpenOffers,
}) => {
  const quickNav = [
    { label: 'PlayBeat Home', path: '/', icon: <Home className="w-4 h-4" />, action: () => { onSelectCategory('all'); onNavigate('/') } },
    { label: 'Products', path: '/products', icon: <Package className="w-4 h-4" />, action: () => { onSelectCategory('all'); document.getElementById('popular-products-section')?.scrollIntoView({ behavior: 'smooth' }) } },
    { label: 'Subscriptions', path: '/subscriptions', icon: <Repeat className="w-4 h-4" />, action: () => onSelectCategory('Subscriptions') },
    { label: 'Categories', path: '/#categories', icon: <LayoutGrid className="w-4 h-4" />, action: () => { document.getElementById('browse-categories')?.scrollIntoView({ behavior: 'smooth' }) } },
    { label: 'Offers', path: '/offers', icon: <BadgePercent className="w-4 h-4" />, action: onOpenOffers },
    { label: 'Support', path: '/contact', icon: <Headphones className="w-4 h-4" />, action: () => onNavigate('/contact') },
  ]

  return (
    <section id="browse-now-section" className="w-full py-10 bg-[#050814] border-b border-slate-400/10">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 space-y-6">
        {/* Section heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-5 rounded-full bg-[#FFC107] inline-block"></span>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
              Browse Now
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold text-amber-300 bg-[#0A122E] border border-amber-400/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Every section, one tap away
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Browsing as {user.name}
            </div>
          )}
        </div>

        {/* Quick navigation tiles */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
          {quickNav.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="group flex flex-col items-center gap-2 px-3 py-4 rounded-2xl bg-[#0A122E]/80 border border-slate-400/12 hover:border-amber-400/45 hover:bg-[#0A122E] transition-all text-center"
            >
              <span className="w-9 h-9 rounded-xl bg-[#081028] border border-amber-400/25 flex items-center justify-center text-amber-300 group-hover:scale-110 group-hover:shadow-[0_0_16px_-2px_rgba(255,193,7,0.5)] transition-all">
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold text-slate-200 group-hover:text-white leading-tight">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Search bar — big, obvious, wired to the live product search */}
        <button
          id="browse-search-trigger"
          onClick={onFocusSearch}
          className="w-full group flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#091330]/90 border border-slate-400/15 hover:border-yellow-400/60 hover:ring-2 hover:ring-yellow-400/15 transition-all text-left"
        >
          <Search className="w-5 h-5 text-yellow-400 shrink-0" />
          <span className="flex-1 text-sm text-slate-400 group-hover:text-slate-300 transition">
            Search products… <span className="hidden sm:inline text-slate-500">— Netflix, ChatGPT, Windows 11, projector, gift card</span>
          </span>
          <kbd className="hidden sm:inline-flex px-2 py-1 rounded-lg bg-[#081028] border border-slate-400/20 text-[10px] font-mono text-slate-400">
            Press /
          </kbd>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-yellow-300 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Category grid */}
        <div id="browse-categories" className="space-y-2.5">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
            Shop by Category
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => onNavigate(cat.path)}
                className={`group p-4 rounded-2xl bg-[#0A122E]/80 border border-slate-400/12 transition-all text-left hover:-translate-y-0.5 ${cat.edge}`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`w-9 h-9 rounded-xl bg-[#081028] border border-slate-400/15 flex items-center justify-center ${cat.accent} group-hover:scale-110 transition-transform`}>
                    {cat.icon}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-sm font-bold text-white leading-tight">{cat.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 leading-snug">{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Curated subcategory collections */}
        <div className="space-y-2.5">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
            Curated Collections
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {SUBCATEGORIES.map((sub) => (
              <button
                key={sub.path}
                onClick={() => onNavigate(sub.path)}
                className="group flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-br from-[#0A122E] to-[#081028] border border-slate-400/12 hover:border-amber-400/45 transition-all text-left"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white truncate">{sub.label}</span>
                  <span className="block text-[10px] text-slate-500 truncate mt-0.5">{sub.desc}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Projector Comparison + Support links row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          <button
            onClick={() => onNavigate('/compare')}
            className="lg:col-span-4 group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#0A122E] border border-cyan-400/25 hover:border-cyan-400/60 transition-all text-left"
          >
            <span className="w-9 h-9 rounded-xl bg-[#081028] border border-cyan-400/25 flex items-center justify-center text-cyan-300 shrink-0 group-hover:scale-110 transition-transform">
              <GitCompareArrows className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-white">Projector Comparison</span>
              <span className="block text-[10px] text-slate-500 mt-0.5">Side-by-side hardware spec matrix</span>
            </span>
          </button>

          <div className="lg:col-span-8 flex flex-wrap items-center gap-2 px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mr-1">
              Support & Legal:
            </span>
            {SUPPORT_LINKS.map((l) => (
              <button
                key={l.path}
                onClick={() => onNavigate(l.path)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A122E] border border-slate-400/15 text-[11px] font-semibold text-slate-300 hover:text-yellow-300 hover:border-yellow-400/40 transition"
              >
                {l.icon}
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
