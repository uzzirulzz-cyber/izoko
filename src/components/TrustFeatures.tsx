import React from 'react'
import { Zap, ShieldCheck, Tag, Headphones } from 'lucide-react'

export const TrustFeatures: React.FC = () => {
  return (
    <section className="w-full pt-4 pb-6">
      <div className="rounded-2xl bg-[#081024]/90 border border-slate-400/15 p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Item 1: Instant Delivery */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-[#FFC107] shrink-0 shadow-inner">
              <Zap className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Instant Delivery</h4>
              <p className="text-[11px] text-slate-400 font-sans">On all digital products</p>
            </div>
          </div>

          {/* Item 2: Secure Checkout */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-[#FFC107] shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Secure Checkout</h4>
              <p className="text-[11px] text-slate-400 font-sans">100% safe & trusted</p>
            </div>
          </div>

          {/* Item 3: Best Prices */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-[#FFC107] shrink-0 shadow-inner">
              <Tag className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Best Prices</h4>
              <p className="text-[11px] text-slate-400 font-sans">Unbeatable value</p>
            </div>
          </div>

          {/* Item 4: 24/7 Support */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-[#FFC107] shrink-0 shadow-inner">
              <Headphones className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">24/7 Support</h4>
              <p className="text-[11px] text-slate-400 font-sans">We are here to help</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
