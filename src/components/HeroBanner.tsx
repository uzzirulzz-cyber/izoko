import React from 'react'
import { ArrowRight } from 'lucide-react'
import { PlayBeatHeroVisual } from './BrandLogos'

interface HeroBannerProps {
  onExploreProducts: () => void
  onExploreSubscriptions: () => void
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreProducts,
  onExploreSubscriptions,
}) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-12 bg-[#050814] border-b border-slate-400/10">
      {/* Background Liquid Water Glow Waves */}
      <div className="absolute top-1/4 left-1/3 w-[550px] h-[350px] bg-[radial-gradient(circle,_rgba(37,99,235,0.18)_0%,_rgba(255,193,7,0.1)_50%,_transparent_75%)] blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Top Pill Badge (Exact from Screenshot 1) */}
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-[#081028] border border-slate-400/25 text-[11px] font-mono tracking-wider uppercase text-slate-300 shadow-sm">
              WELCOME TO PLAYBEAT
            </div>

            {/* Main Headline (Exact from Screenshot 1) */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-white tracking-tight leading-[1.12]">
              Premium Digital Products. One Powerful{' '}
              <span className="text-[#FFC107] drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]">
                PlayBeat
              </span>{' '}
              Experience.
            </h1>

            {/* Subtitle (Exact from Screenshot 1) */}
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-sans font-normal">
              Discover digital products, subscriptions and entertainment services with a fast, secure and seamless shopping experience.
            </p>

            {/* CTAs (Exact from Screenshot 1) */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Primary Explore Products with Yellow Water Glow Aura */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-full blur-md opacity-40 group-hover:opacity-100 transition duration-300 pointer-events-none"></div>
                <button
                  id="hero-explore-products-btn"
                  onClick={onExploreProducts}
                  className="relative flex items-center gap-2 px-7 py-3 rounded-full btn-gold-gradient text-slate-950 font-bold text-sm shadow-xl active:scale-95 transition-all"
                >
                  <span>Explore Products</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Secondary View Subscriptions Button */}
              <button
                id="hero-view-subscriptions-btn"
                onClick={onExploreSubscriptions}
                className="px-6 py-3 rounded-full bg-[#0A122E]/90 hover:bg-[#0E1A3D] border border-slate-400/25 hover:border-slate-400/40 text-slate-200 hover:text-white text-sm font-semibold transition active:scale-95 shadow-md"
              >
                View Subscriptions
              </button>
            </div>
          </div>

          {/* Right 3D Visual (PlayBeat Orbit Ring + Gold Play + Water Energy Waves) */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <PlayBeatHeroVisual />
          </div>
        </div>
      </div>
    </section>
  )
}
