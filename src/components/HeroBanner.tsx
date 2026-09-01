import React from 'react'
import { ArrowRight, Zap, ShieldCheck, Star } from 'lucide-react'
import { PlayBeatHeroVisual } from './BrandLogos'

interface HeroBannerProps {
  onExploreProducts: () => void
  onExploreSubscriptions: () => void
  productsCount?: number
  categoriesCount?: number
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreProducts,
  onExploreSubscriptions,
  productsCount = 178,
  categoriesCount = 6,
}) => {
  return (
    <section className="relative overflow-hidden pt-10 pb-14 bg-[#050814] border-b border-slate-400/10">
      {/* Premium aurora backdrop — layered gold/blue depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-24 w-[640px] h-[420px] bg-[radial-gradient(ellipse,_rgba(255,193,7,0.10)_0%,_transparent_65%)] blur-3xl"></div>
        <div className="absolute top-10 right-0 w-[560px] h-[400px] bg-[radial-gradient(ellipse,_rgba(37,99,235,0.16)_0%,_transparent_65%)] blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[240px] bg-[radial-gradient(ellipse,_rgba(16,185,129,0.05)_0%,_transparent_70%)] blur-3xl"></div>
        {/* Fine grid texture */}
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 90% 80% at 50% 20%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 20%, black 30%, transparent 75%)',
          }}
        ></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-7 space-y-7 text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#081028]/80 backdrop-blur border border-amber-400/25 shadow-[0_0_24px_rgba(255,193,7,0.08)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-[11px] font-mono tracking-[0.18em] uppercase text-amber-200/90">
                Pakistan&rsquo;s Premium Digital Marketplace
              </span>
            </div>

            {/* Headline — gradient premium type */}
            <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-extrabold tracking-tight leading-[1.08] text-white">
              Your Digital World.
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-[#FFC107] to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(255,193,7,0.25)]">
                One Marketplace.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300/95 max-w-xl leading-relaxed">
              Streaming, subscriptions, AI tools, software, gift cards, gaming and smart
              technology — <span className="text-white font-medium">verified products, instant delivery</span> and
              secure global payments in one place.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
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
                onClick={onExploreSubscriptions}
                className="px-6 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-slate-400/20 hover:border-slate-400/40 text-slate-200 hover:text-white text-sm font-semibold transition active:scale-95 backdrop-blur"
              >
                View Subscriptions
              </button>
            </div>

            {/* Live stats strip */}
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pt-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300">
                  <span className="font-bold text-white font-mono">{productsCount}+</span> products in stock
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-300">
                  <span className="font-bold text-white font-mono">{categoriesCount}</span> curated categories
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-300">
                  <span className="font-bold text-white font-mono">100%</span> genuine &amp; warranted
                </span>
              </div>
            </div>
          </div>

          {/* Right 3D Visual */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <PlayBeatHeroVisual />
          </div>
        </div>
      </div>
    </section>
  )
}
