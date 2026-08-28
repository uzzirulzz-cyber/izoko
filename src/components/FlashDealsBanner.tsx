import React, { useState, useEffect } from 'react'
import { Clock, Star, Sparkles } from 'lucide-react'
import { Product, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'

interface FlashDealsBannerProps {
  products: Product[]
  currency: CurrencyCode
  onQuickView: (p: Product) => void
  onAddToCart: (p: Product) => void
}

export const FlashDealsBanner: React.FC<FlashDealsBannerProps> = ({
  products,
  currency,
  onQuickView,
}) => {
  // Live ticking countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return { hours: 4, minutes: 30, seconds: 0 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const flashProducts = products.filter((p) => p.isFlashDeal || (p.discountPercent && p.discountPercent >= 20)).slice(0, 4)

  if (flashProducts.length === 0) return null

  return (
    <section className="py-7 border-b border-slate-400/10 bg-[#050814] relative overflow-hidden">
      {/* Dynamic Water-Glow Layer */}
      <div className="absolute top-1/2 left-1/3 w-96 h-96 water-glow-layer blur-3xl opacity-35 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header with Countdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Limited VIP Promotional Drops
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
                  UP TO 46% OFF
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Verified digital licenses and smart hardware allocations
              </p>
            </div>
          </div>

          {/* Countdown Clock Badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0A122E] border border-slate-400/20 text-xs text-slate-300 shrink-0 font-mono shadow-sm">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400">Offer Expires:</span>
            <div className="flex items-center gap-1 font-mono font-bold text-yellow-400">
              <span className="bg-[#060B1E] px-2 py-0.5 rounded-lg border border-slate-400/15 text-slate-100">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span className="text-slate-500">:</span>
              <span className="bg-[#060B1E] px-2 py-0.5 rounded-lg border border-slate-400/15 text-slate-100">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span className="text-slate-500">:</span>
              <span className="bg-[#060B1E] px-2 py-0.5 rounded-lg border border-slate-400/15 text-yellow-300">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </div>

        {/* Flash Deals Horizontal Carousel / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {flashProducts.map((product) => {
            const currentPrice = product.price
            const originalPrice = product.originalPrice || currentPrice * 1.3
            const discount = product.discountPercent || 25

            return (
              <div
                key={product.id}
                id={`flash-card-${product.id}`}
                onClick={() => onQuickView(product)}
                className="group relative rounded-[18px] bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between hover:shadow-[0_12px_30px_-8px_rgba(0,0,0,0.8),0_0_20px_-3px_rgba(250,204,21,0.15)]"
              >
                <div className="flex gap-3.5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#060B1E] shrink-0 border border-slate-400/20">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-yellow-400 text-slate-950 shadow">
                      -{discount}%
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 mb-1 font-mono">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="font-bold text-slate-200">{product.rating}</span>
                      <span className="text-slate-500">({product.reviewCount})</span>
                    </div>

                    <h4 className="font-semibold text-xs text-white line-clamp-2 leading-snug group-hover:text-yellow-300 transition-colors">
                      {product.name}
                    </h4>

                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="font-extrabold text-xs font-mono text-white">
                        {formatPrice(currentPrice, currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 line-through font-mono">
                        {formatPrice(originalPrice, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Claim Bar */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-400/10 font-mono">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span>Allocated: 84%</span>
                    <span className="text-yellow-400 font-bold">In High Demand</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#060B1E] overflow-hidden border border-slate-400/10">
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 w-[84%] rounded-full shadow-sm"></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
