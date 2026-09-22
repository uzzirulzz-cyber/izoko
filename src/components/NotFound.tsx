import React from 'react'
import { Home, Package, Headphones, Compass, ArrowLeft } from 'lucide-react'

interface NotFoundProps {
  onNavigate: (path: string) => void
  onShopProducts: () => void
}

/**
 * NotFound — professional 404 page for unknown URLs.
 * Rendered by the SPA router whenever a pathname doesn't match a known route,
 * with the three recovery actions recommended by the UX audit:
 * Back to Home / Shop Products / Contact Support.
 */
export const NotFound: React.FC<NotFoundProps> = ({ onNavigate, onShopProducts }) => {
  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* ambient brand glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-yellow-400/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />

      <div className="relative text-center max-w-lg w-full">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-yellow-300 transition mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
        </button>

        <div
          className="text-[96px] sm:text-[140px] leading-none font-black tracking-tighter select-none"
          style={{
            background: 'linear-gradient(135deg,#facc15 10%,#f59e0b 55%,#38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          404
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
          Oops! This page doesn't exist.
        </h1>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          The link may be broken or the page may have moved. Try one of the options below —
          or use the search bar on the homepage to find what you need.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
          <button
            id="notfound-home-btn"
            onClick={() => onNavigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs shadow-xl transition active:scale-95"
          >
            <Home className="w-4 h-4" /> Back to Home
          </button>
          <button
            id="notfound-shop-btn"
            onClick={onShopProducts}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0A122E] border border-slate-400/20 hover:border-yellow-400/45 text-slate-200 hover:text-white font-bold text-xs transition"
          >
            <Package className="w-4 h-4" /> Shop Products
          </button>
          <button
            id="notfound-support-btn"
            onClick={() => onNavigate('/contact')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0A122E] border border-slate-400/20 hover:border-sky-400/45 text-slate-200 hover:text-white font-bold text-xs transition"
          >
            <Headphones className="w-4 h-4" /> Contact Support
          </button>
        </div>

        <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#081028] border border-slate-400/15 text-[11px] font-mono text-slate-500">
          <Compass className="w-3.5 h-3.5 text-amber-300" />
          Popular: /streaming · /giftcards · /smart-projectors · /compare
        </div>
      </div>
    </div>
  )
}
