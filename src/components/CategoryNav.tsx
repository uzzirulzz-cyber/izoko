import React, { useEffect, useState } from 'react'
import {
  Gift,
  PlaySquare,
  Layers,
  Gamepad2,
  CreditCard,
  Projector,
  ArrowRight,
  Share2,
  Server,
  TrendingUp,
  Hexagon,
  Briefcase,
} from 'lucide-react'
import { CATEGORIES_DATA } from '../data/products'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

interface CategoryNavProps {
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  onViewAll?: () => void
}

// Per-category premium accent system (color-coded storefront)
const CATEGORY_ACCENTS: Record<
  string,
  { icon: any; from: string; to: string; ring: string; glow: string; text: string; chipBg: string }
> = {
  Streaming: {
    icon: PlaySquare,
    from: 'from-rose-500/20',
    to: 'to-rose-500/5',
    ring: 'border-rose-400/60',
    glow: 'bg-rose-500/40',
    text: 'text-rose-300',
    chipBg: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
  },
  Subscriptions: {
    icon: Layers,
    from: 'from-emerald-500/20',
    to: 'to-emerald-500/5',
    ring: 'border-emerald-400/60',
    glow: 'bg-emerald-500/40',
    text: 'text-emerald-300',
    chipBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
  'Gift Cards': {
    icon: Gift,
    from: 'from-amber-500/20',
    to: 'to-amber-500/5',
    ring: 'border-amber-400/70',
    glow: 'bg-amber-400/40',
    text: 'text-amber-300',
    chipBg: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  Gaming: {
    icon: Gamepad2,
    from: 'from-indigo-500/20',
    to: 'to-indigo-500/5',
    ring: 'border-indigo-400/60',
    glow: 'bg-indigo-500/40',
    text: 'text-indigo-300',
    chipBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  },
  Software: {
    icon: CreditCard,
    from: 'from-purple-500/20',
    to: 'to-purple-500/5',
    ring: 'border-purple-400/60',
    glow: 'bg-purple-500/40',
    text: 'text-purple-300',
    chipBg: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
  },
  'Smart Projectors': {
    icon: Projector,
    from: 'from-cyan-500/20',
    to: 'to-cyan-500/5',
    ring: 'border-cyan-400/60',
    glow: 'bg-cyan-400/40',
    text: 'text-cyan-300',
    chipBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  },
  // ---- Section 3: new target categories (DB registry keys) ----
  Services: {
    icon: Briefcase,
    from: 'from-sky-500/20',
    to: 'to-sky-500/5',
    ring: 'border-sky-400/60',
    glow: 'bg-sky-500/40',
    text: 'text-sky-300',
    chipBg: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
  'Social Media': {
    icon: Share2,
    from: 'from-pink-500/20',
    to: 'to-pink-500/5',
    ring: 'border-pink-400/60',
    glow: 'bg-pink-500/40',
    text: 'text-pink-300',
    chipBg: 'bg-pink-500/15 text-pink-300 border-pink-400/30',
  },
  'Web Hosting': {
    icon: Server,
    from: 'from-teal-500/20',
    to: 'to-teal-500/5',
    ring: 'border-teal-400/60',
    glow: 'bg-teal-500/40',
    text: 'text-teal-300',
    chipBg: 'bg-teal-500/15 text-teal-300 border-teal-400/30',
  },
  'Digital Marketing': {
    icon: TrendingUp,
    from: 'from-orange-500/20',
    to: 'to-orange-500/5',
    ring: 'border-orange-400/60',
    glow: 'bg-orange-500/40',
    text: 'text-orange-300',
    chipBg: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  },
  Web3: {
    icon: Hexagon,
    from: 'from-violet-500/20',
    to: 'to-violet-500/5',
    ring: 'border-violet-400/60',
    glow: 'bg-violet-500/40',
    text: 'text-violet-300',
    chipBg: 'bg-violet-500/15 text-violet-300 border-violet-400/30',
  },
}

interface CategoryNavProps2 {
  products?: { category: string }[]
}

// Category name → canonical category-page route (real, indexable URLs like
// /streaming, /gift-cards). Each card is a real link to its category page.
const ROUTE_BY_NAME: Record<string, string> = {
  Streaming: 'streaming',
  Subscriptions: 'subscriptions',
  'Gift Cards': 'gift-cards',
  Gaming: 'gaming',
  Software: 'software',
  'Smart Projectors': 'smart-projectors',
  Services: 'services',
  'Social Media': 'social-media',
  'Web Hosting': 'web-hosting',
  'Digital Marketing': 'digital-marketing',
  Web3: 'web3',
}

// Static fallback mirrors CATEGORIES_DATA + the registry's new categories
// (the API at /api/categories remains the source of truth — counts, copy and
// ordering come from MongoDB; this list only bootstraps the first paint).
const FALLBACK_CATEGORIES = [
  ...CATEGORIES_DATA.filter((c) => c.slug !== 'all'),
  { name: 'Services', slug: 'services' },
  { name: 'Social Media', slug: 'social-media' },
  { name: 'Web Hosting', slug: 'web-hosting' },
  { name: 'Digital Marketing', slug: 'digital-marketing' },
  { name: 'Web3', slug: 'web3' },
] as Array<{ name: string; slug: string }>

export const CategoryNav: React.FC<CategoryNavProps & CategoryNavProps2> = ({
  selectedCategory,
  onSelectCategory,
  onViewAll,
  products = [],
}) => {
  // DB-driven categories (Section 3): the registry at /api/categories defines
  // the 8 target categories + the established storefront ones. Static data is
  // only the fallback when the API is unreachable.
  const [registry, setRegistry] = useState<Array<{ name: string; slug: string; count?: number }>>(
    FALLBACK_CATEGORIES
  )
  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/api/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.success || !Array.isArray(d.categories)) return
        const cats = d.categories
          .filter((c: any) => c.slug !== 'all')
          .map((c: any) => ({ name: c.label || c.name, slug: c.slug, count: c.count }))
        if (cats.length) setRegistry(cats)
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => {
      alive = false
    }
  }, [])

  const displayCategories = registry

  // Products store the category NAME (e.g. "Gift Cards") — filter/count by
  // name; registry-provided counts (DB-accurate) win when present.
  const countFor = (name: string, regCount?: number) =>
    regCount != null ? regCount : products.filter((p) => p.category === name).length

  return (
    <section className="w-full py-10 bg-gradient-to-b from-[#050814] via-[#060B1E] to-[#050814] relative overflow-hidden">
      {/* Ambient premium glow */}
      <div className="absolute -top-24 left-1/4 w-[500px] h-[250px] bg-[radial-gradient(ellipse,_rgba(255,193,7,0.07)_0%,_transparent_70%)] blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[420px] h-[200px] bg-[radial-gradient(ellipse,_rgba(56,189,248,0.06)_0%,_transparent_70%)] blur-3xl pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex w-6 h-[2px] rounded-full bg-gradient-to-r from-[#FFC107] to-transparent"></span>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.22em] text-slate-400">
                Collections
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Shop by Category
            </h2>
          </div>

          <button
            onClick={onViewAll}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-slate-400/15 hover:border-amber-400/40 text-xs sm:text-sm font-medium text-slate-300 hover:text-amber-300 transition-all"
          >
            <span>Browse everything</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Category Cards — premium color-coded tiles (DB registry driven) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {displayCategories.map((cat) => {
            const acc = CATEGORY_ACCENTS[cat.name] || {
              icon: Layers,
              from: 'from-slate-500/20',
              to: 'to-slate-500/5',
              ring: 'border-slate-400/60',
              glow: 'bg-slate-500/40',
              text: 'text-slate-300',
              chipBg: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
            }
            const Icon = acc.icon
            const isSelected = selectedCategory === cat.name
            const count = countFor(cat.name, (cat as any).count)
            const catHref = `/${ROUTE_BY_NAME[cat.name] || cat.slug || ''}`

            return (
              <div key={cat.slug} className="relative group">
                {/* Color glow beneath on hover / active */}
                <div
                  className={`absolute -bottom-2 inset-x-3 h-4 rounded-full blur-md transition duration-300 ${
                    isSelected
                      ? `${acc.glow} opacity-100`
                      : 'bg-transparent group-hover:opacity-80 opacity-0 group-hover:' + acc.glow.replace('bg-', 'bg-')
                  }`}
                ></div>

                <a
                  id={`cat-card-${cat.slug.replace(/\s+/g, '-').toLowerCase()}`}
                  href={catHref}
                  onClick={(e) => {
                    e.preventDefault() // SPA navigation — handleSelectCategory pushes the real URL
                    onSelectCategory(isSelected ? 'all' : cat.name)
                  }}
                  className={`w-full relative z-10 flex flex-col items-center text-center px-3 pt-5 pb-4 rounded-3xl transition-all duration-300 border ${
                    isSelected
                      ? `bg-gradient-to-b ${acc.from} ${acc.to} border-2 ${acc.ring} -translate-y-1 shadow-[0_10px_32px_rgba(0,0,0,0.45)]`
                      : 'bg-[#0A101F]/80 border-slate-400/12 hover:border-slate-400/25 hover:-translate-y-1 hover:bg-[#0C1327]'
                  }`}
                >
                  {/* Icon medallion */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border transition-all ${
                      isSelected
                        ? `bg-white/10 ${acc.text} border-white/20`
                        : `bg-white/[0.04] text-slate-300 group-hover:${acc.text} border-white/10`
                    }`}
                    style={!isSelected ? { transition: 'all .3s' } : undefined}
                  >
                    <Icon className="w-[22px] h-[22px] stroke-[1.7]" />
                  </div>

                  <span
                    className={`text-[13px] font-semibold tracking-tight line-clamp-1 ${
                      isSelected ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {cat.name}
                  </span>

                  {/* Count chip — color coded */}
                  <span
                    className={`mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${acc.chipBg}`}
                  >
                    {count} items
                  </span>
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
