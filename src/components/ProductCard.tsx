import React, { useState } from 'react'
import {
  Star,
  Heart,
  ShoppingCart,
  Check,
  Zap,
  Truck,
} from 'lucide-react'
import { Product, CurrencyCode, ProductVariant } from '../types'
import { formatPrice } from '../lib/currency'

// Category chip colors (color-coded storefront)
const CAT_CHIP: Record<string, string> = {
  Streaming: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
  Subscriptions: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
  'Gift Cards': 'bg-amber-500/20 text-amber-300 border-amber-400/30',
  Gaming: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
  Software: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  'Smart Projectors': 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
}

interface ProductCardProps {
  product: Product
  currency: CurrencyCode
  onAddToCart: (product: Product, variant?: ProductVariant) => void
  onQuickView: (product: Product) => void
  onToggleWishlist: (product: Product) => void
  isWishlisted: boolean
  onInstantBuy: (product: Product, variant?: ProductVariant) => void
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currency,
  onAddToCart,
  onQuickView,
  onToggleWishlist,
  isWishlisted,
  onInstantBuy,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  )
  const [addedAnimation, setAddedAnimation] = useState(false)

  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const originalPrice = selectedVariant?.originalPrice || product.originalPrice
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : product.discountPercent
  const hasReviews = (product.reviewCount || 0) > 0 || (product.rating || 0) > 0
  const isDigital = product.digital !== false && product.productType !== 'physical'
  const catChip = CAT_CHIP[product.category] || 'bg-slate-500/20 text-slate-300 border-slate-400/30'

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToCart(product, selectedVariant)
    setAddedAnimation(true)
    setTimeout(() => setAddedAnimation(false), 1500)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleWishlist(product)
  }

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation()
    onInstantBuy(product, selectedVariant)
  }

  return (
    <div className="relative group">
      {/* Premium lift + gold halo on hover */}
      <div className="absolute -inset-0.5 rounded-[24px] bg-gradient-to-b from-amber-300/60 via-yellow-400/25 to-transparent opacity-0 group-hover:opacity-100 blur-[6px] transition-all duration-500 pointer-events-none"></div>

      <div
        id={`product-card-${product.id}`}
        onClick={() => onQuickView(product)}
        className="relative flex flex-col h-full rounded-[22px] bg-gradient-to-b from-[#0C1428] to-[#0A101F] border border-white/[0.07] group-hover:border-amber-400/50 overflow-hidden transition-all duration-300 cursor-pointer group-hover:-translate-y-1 shadow-[0_8px_28px_rgba(0,0,0,0.45)] group-hover:shadow-[0_18px_44px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,193,7,0.18)] p-3"
      >
        {/* Media */}
        <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#060D26]">
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover object-center group-hover:scale-[1.06] transition-transform duration-700 ease-out"
            />
            {/* Premium scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A101F]/70 via-transparent to-transparent pointer-events-none"></div>
          </div>

          {/* Discount badge */}
          <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1.5">
            {discountPercent && discountPercent > 0 ? (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-gradient-to-r from-amber-300 to-yellow-500 text-slate-950 shadow-lg">
                -{discountPercent}%
              </span>
            ) : null}
            {isDigital ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm">
                <Zap className="w-2.5 h-2.5 fill-emerald-300" />
                INSTANT
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 backdrop-blur-sm">
                <Truck className="w-2.5 h-2.5" />
                SHIPPED
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            id={`wishlist-btn-${product.id}`}
            onClick={handleWishlist}
            aria-label="Wishlist"
            className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-xl bg-black/30 backdrop-blur-sm text-slate-300 hover:text-rose-400 hover:bg-black/50 transition"
          >
            <Heart
              className={`w-4 h-4 ${
                isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-200 stroke-[1.8]'
              }`}
            />
          </button>
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col pt-3 px-1">
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-amber-200 transition-colors">
            {product.name}
          </h3>

          {/* Category chip + rating */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold border ${catChip}`}
            >
              {product.category}
            </span>
            {hasReviews && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 fill-[#FFC107] text-[#FFC107]" />
                <span className="font-bold text-white">{product.rating}</span>
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mt-auto pt-2 flex items-baseline gap-2 mb-3">
            {originalPrice && originalPrice > currentPrice && (
              <span className="text-xs text-slate-500 line-through font-mono">
                {formatPrice(originalPrice, currency)}
              </span>
            )}
            <span className="font-extrabold text-base sm:text-lg text-white font-mono tracking-tight">
              {formatPrice(currentPrice, currency)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              id={`buy-now-btn-${product.id}`}
              onClick={handleBuyNow}
              className="flex-1 py-2 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all text-center"
            >
              Buy Now
            </button>

            <button
              id={`add-cart-btn-${product.id}`}
              onClick={handleAddToCart}
              className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                addedAnimation
                  ? 'bg-emerald-400 text-slate-950 border-emerald-400'
                  : 'bg-white/[0.04] border-amber-400/30 text-amber-300 hover:border-amber-300 hover:bg-amber-400/10'
              }`}
              title="Add to cart"
            >
              {addedAnimation ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : (
                <ShoppingCart className="w-4 h-4 stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
