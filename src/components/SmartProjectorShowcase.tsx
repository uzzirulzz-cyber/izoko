import React from 'react'
import {
  Projector,
  Zap,
  Shield,
  Cpu,
  Sun,
  Wifi,
  ArrowRight,
  CheckCircle2,
  Truck,
  Sparkles,
} from 'lucide-react'
import { Product, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'

interface SmartProjectorShowcaseProps {
  projectors: Product[]
  currency: CurrencyCode
  onAddToCart: (p: Product) => void
  onQuickView: (p: Product) => void
  onExploreAll: () => void
}

export const SmartProjectorShowcase: React.FC<SmartProjectorShowcaseProps> = ({
  projectors,
  currency,
  onAddToCart,
  onQuickView,
  onExploreAll,
}) => {
  if (!projectors.length) return null
  const flagship = projectors[0]
  const rest = projectors.slice(1, 4)

  return (
    <section className="w-full py-10 bg-[#050814] relative overflow-hidden">
      {/* Ambient cyan/blue glow for hardware section */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12)_0%,_rgba(56,189,248,0.04)_50%,_transparent_75%)] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
              <Projector className="w-3.5 h-3.5" />
              Flagship Hardware
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full bg-cyan-400 inline-block"></span>
              Smart 4K Cinema Projectors
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-sans max-w-xl">
              Official Magcubic partner in Pakistan. Auto-keystone, Android 14, WiFi 6, and 1100 ANSI brightness — delivered to your door with 1-year warranty.
            </p>
          </div>

          <button
            onClick={onExploreAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 hover:text-cyan-200 text-xs font-semibold transition group whitespace-nowrap"
          >
            <span>Compare All Specs</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Flagship Hero Card + Side Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Flagship Projector — Large Feature Card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#0B1A35] via-[#0A122E] to-[#050814] border border-cyan-400/25 overflow-hidden shadow-[0_20px_60px_-15px_rgba(56,189,248,0.25)] group">
            {/* Glow aura */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-400/25 transition"></div>

            {/* Top badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-cyan-400 text-slate-950 text-[9px] font-mono font-black uppercase tracking-wider shadow-md">
                Flagship
              </span>
              {flagship.discountPercent ? (
                <span className="px-2 py-0.5 rounded-md bg-rose-500/90 text-white text-[9px] font-mono font-bold">
                  -{flagship.discountPercent}% OFF
                </span>
              ) : null}
              <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[9px] font-mono font-bold">
                ★ {flagship.rating}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-0">
              {/* Image side */}
              <div className="sm:col-span-2 relative aspect-square sm:aspect-auto sm:min-h-[280px] overflow-hidden">
                <img
                  src={flagship.image}
                  alt={flagship.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A122E] via-transparent to-transparent sm:bg-gradient-to-r"></div>
              </div>

              {/* Content side */}
              <div className="sm:col-span-3 p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                    {flagship.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 font-sans">
                    {flagship.shortDescription || flagship.description}
                  </p>

                  {/* Mini specs grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <Sun className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-mono">{flagship.projectorSpec?.brightnessAnsi} ANSI</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{flagship.projectorSpec?.cpu}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{flagship.projectorSpec?.wifi}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{flagship.projectorSpec?.os}</span>
                    </div>
                  </div>

                  {/* Trust line */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400" /> 1-Year Warranty
                    </span>
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-amber-400" /> Free Courier Dispatch
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Official Magcubic Partner
                    </span>
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="flex items-end justify-between gap-3 mt-5 pt-4 border-t border-white/5">
                  <div>
                    {flagship.originalPrice && (
                      <div className="text-[11px] text-slate-500 line-through font-mono">
                        {formatPrice(flagship.originalPrice, currency)}
                      </div>
                    )}
                    <div className="text-xl font-extrabold text-cyan-300 font-mono">
                      {formatPrice(flagship.price, currency)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onQuickView(flagship)}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-[11px] font-semibold transition"
                    >
                      Quick View
                    </button>
                    <button
                      onClick={() => onAddToCart(flagship)}
                      className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[11px] font-bold transition shadow-md shadow-cyan-400/20"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Cards Column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rest.map((p) => (
              <div
                key={p.id}
                className="relative rounded-2xl bg-[#0B1220]/90 border border-slate-400/15 hover:border-cyan-400/30 overflow-hidden transition group"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-transparent to-transparent"></div>
                  {p.discountPercent ? (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-rose-500/90 text-white text-[9px] font-mono font-bold">
                      -{p.discountPercent}%
                    </span>
                  ) : null}
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[9px] font-mono font-bold backdrop-blur-sm">
                    ★ {p.rating}
                  </span>
                </div>

                <div className="p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-white line-clamp-1">{p.name}</h4>

                  <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Sun className="w-3 h-3 text-cyan-400" />
                      <span className="font-mono">{p.projectorSpec?.brightnessAnsi}</span>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span className="truncate max-w-[80px]">{p.projectorSpec?.os}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {p.originalPrice && (
                        <div className="text-[9px] text-slate-500 line-through font-mono">
                          {formatPrice(p.originalPrice, currency)}
                        </div>
                      )}
                      <div className="text-sm font-bold text-cyan-300 font-mono">
                        {formatPrice(p.price, currency)}
                      </div>
                    </div>
                    <button
                      onClick={() => onQuickView(p)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-semibold transition"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* "View All Projectors" tile if fewer than 3 side cards */}
            {rest.length < 3 && (
              <button
                onClick={onExploreAll}
                className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-400/20 hover:border-cyan-400/40 p-5 flex flex-col items-center justify-center text-center transition group min-h-[180px]"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                  <Projector className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-sm font-bold text-white">View Full Lineup</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Compare all {projectors.length} Magcubic models
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 mt-2 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Trust Bar */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Shield, label: '1-Year Warranty', sub: 'Official Magcubic Pakistan' },
            { icon: Truck, label: 'Free Courier Dispatch', sub: '1-3 day express delivery' },
            { icon: Sparkles, label: 'Auto-Keystone + Focus', sub: 'AI screen recognition built-in' },
            { icon: Cpu, label: 'Android 14 Smart OS', sub: 'Native Netflix, YouTube 4K' },
          ].map((t) => {
            const Icon = t.icon
            return (
              <div
                key={t.label}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0B1220]/60 border border-slate-400/10"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{t.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{t.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
