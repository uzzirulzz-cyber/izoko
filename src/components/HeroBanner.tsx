import React from 'react'
import { ArrowRight, ShieldCheck, Zap, Tag, Headphones } from 'lucide-react'

interface HeroBannerProps {
  onExploreProducts: () => void
  onExploreSubscriptions: () => void
  onBrowseCategories?: () => void
  productsCount?: number
  categoriesCount?: number
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreProducts,
  onExploreSubscriptions,
  onBrowseCategories,
}) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 bg-[#050814] border-b border-slate-400/10">
      {/* Deep-space backdrop — glowing earth horizon + diagonal streaks (design PDF) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[560px] h-[360px] bg-[radial-gradient(ellipse,_rgba(37,99,235,0.14)_0%,_transparent_65%)] blur-3xl"></div>
        <div className="absolute top-6 right-0 w-[620px] h-[420px] bg-[radial-gradient(ellipse,_rgba(56,189,248,0.10)_0%,_transparent_65%)] blur-3xl"></div>
        {/* earth horizon arc glow at the section's bottom edge */}
        <div
          className="absolute -bottom-[420px] left-1/2 -translate-x-1/2 w-[1400px] h-[560px] rounded-[100%] opacity-70"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(96,165,250,0.38) 0%, rgba(37,99,235,0.22) 30%, rgba(29,78,216,0.10) 55%, transparent 75%)',
            filter: 'blur(6px)',
          }}
        ></div>
        <div
          className="absolute -bottom-[430px] left-1/2 -translate-x-1/2 w-[1300px] h-[520px] rounded-[100%] border-t border-blue-400/40"
          style={{ boxShadow: '0 -18px 60px -10px rgba(59,130,246,0.45)' }}
        ></div>
        {/* diagonal light streaks */}
        <div className="absolute -top-10 left-1/4 w-px h-[420px] bg-gradient-to-b from-transparent via-sky-300/20 to-transparent rotate-[28deg]"></div>
        <div className="absolute -top-10 left-2/3 w-px h-[460px] bg-gradient-to-b from-transparent via-blue-400/15 to-transparent rotate-[28deg]"></div>
        <div className="absolute -top-16 right-1/4 w-px h-[380px] bg-gradient-to-b from-transparent via-slate-200/10 to-transparent rotate-[28deg]"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Eyebrow */}
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.26em] uppercase text-slate-200/90">
              Premium Digital Products &amp; Subscriptions
            </p>

            {/* Headline — all-white bold italic caps (design PDF) */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold uppercase italic tracking-tight leading-[1.06] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              Your World of
              <br />
              Digital Possibilities
            </h1>

            {/* Category bullet line */}
            <p className="text-base sm:text-lg font-semibold text-white/95 tracking-tight">
              Movies <span className="text-amber-400 mx-1">•</span> Streaming{' '}
              <span className="text-amber-400 mx-1">•</span> Software{' '}
              <span className="text-amber-400 mx-1">•</span> Games{' '}
              <span className="text-amber-400 mx-1">•</span> Gadgets
            </p>

            {/* Tagline line */}
            <p className="text-sm text-slate-400">
              All in One Place. Genuine Products. Instant Delivery. Best Rates.
            </p>

            {/* Trust pills — gold circular icons (design PDF) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {[
                { icon: ShieldCheck, label: 'Genuine Products' },
                { icon: Zap, label: 'Instant Delivery' },
                { icon: Tag, label: 'Best Rates' },
                { icon: Headphones, label: '24/7 Support' },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border border-white/12 bg-white/[0.03] backdrop-blur-sm"
                >
                  <span className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center shrink-0">
                    <chip.icon className="w-4 h-4 text-amber-400" />
                  </span>
                  <span className="text-xs font-semibold text-white/90">{chip.label}</span>
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-full blur-md opacity-40 group-hover:opacity-90 transition duration-300 pointer-events-none"></div>
                <button
                  id="hero-explore-products-btn"
                  onClick={onExploreProducts}
                  className="relative flex items-center gap-2 px-7 py-3 rounded-full btn-gold-gradient text-slate-950 font-bold text-sm shadow-xl active:scale-95 transition-all"
                >
                  <span>Explore Products</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <button
                id="hero-view-subscriptions-btn"
                onClick={onBrowseCategories || onExploreSubscriptions}
                className="px-6 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-blue-400/30 hover:border-blue-400/50 text-slate-200 hover:text-white text-sm font-semibold transition active:scale-95 backdrop-blur"
              >
                Browse Categories
              </button>
            </div>
          </div>

          {/* Right Brand Visual — 3D logo composition (design PDF) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative text-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[radial-gradient(circle,_rgba(59,130,246,0.20)_0%,_transparent_65%)] blur-3xl pointer-events-none"></div>
            <img
              src="/playbeat-logo.png"
              alt="PlayBeat Digital"
              className="relative w-44 sm:w-56 h-auto object-contain drop-shadow-[0_10px_40px_rgba(59,130,246,0.45)]"
            />
            <div className="relative mt-5">
              <div className="text-4xl sm:text-5xl font-black italic tracking-tight text-silver-gradient leading-none">
                PLAY<span className="text-sky-400">BEAT</span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-3">
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-sky-400/70"></span>
                <span className="text-sm sm:text-base font-bold tracking-[0.42em] text-white/90">
                  DIGITAL
                </span>
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-sky-400/70"></span>
              </div>
            </div>
            <p className="relative mt-5 text-[11px] font-semibold tracking-[0.24em] uppercase text-sky-300/90">
              The Gateway to Digital Subscriptions
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
