import React, { useState } from 'react'
import {
  Star,
  Heart,
  ShoppingCart,
  Check,
} from 'lucide-react'
import { Product, CurrencyCode, ProductVariant } from '../types'
import { formatPrice } from '../lib/currency'
import {
  NetflixArtwork,
  PlayStationArtwork,
  SpotifyArtwork,
  DisneyArtwork,
  XboxArtwork,
} from './BrandLogos'

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

  // Current active price based on variant
  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const originalPrice = selectedVariant?.originalPrice || product.originalPrice
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : product.discountPercent

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

  // Render matching brand artwork from screenshots 2 & 3
  const renderArtwork = () => {
    if (product.image === 'brand:netflix' || product.id.includes('netflix')) {
      return <NetflixArtwork className="w-full h-full" />
    }
    if (product.image === 'brand:playstation' || product.id.includes('psn')) {
      return <PlayStationArtwork className="w-full h-full" />
    }
    if (product.image === 'brand:spotify' || product.id.includes('spotify')) {
      return <SpotifyArtwork className="w-full h-full" />
    }
    if (product.image === 'brand:disney' || product.id.includes('disney')) {
      return <DisneyArtwork className="w-full h-full" />
    }
    if (product.image === 'brand:xbox' || product.id.includes('xbox')) {
      return <XboxArtwork className="w-full h-full" />
    }

    return (
      <div className="relative w-full h-full bg-[#070D22] overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-transparent to-transparent"></div>
      </div>
    )
  }

  // Review count formatter (e.g. 2400 -> 2.4K)
  const formatReviewCount = (cnt: number) => {
    if (cnt >= 1000) {
      return (cnt / 1000).toFixed(1).replace('.0', '') + 'K'
    }
    return cnt.toString()
  }

  return (
    <div className="relative group">
      {/* Golden Liquid Water-Glow Layer Beneath Card on Hover (Matching Screenshot 2) */}
      <div className="absolute -inset-0.5 rounded-[22px] bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 opacity-0 group-hover:opacity-100 blur-sm transition-all duration-300 pointer-events-none"></div>

      <div
        id={`product-card-${product.id}`}
        onClick={() => onQuickView(product)}
        className="relative flex flex-col rounded-[20px] bg-[#0B1220] border border-slate-400/15 group-hover:border-yellow-400/80 overflow-hidden transition-all duration-300 cursor-pointer shadow-lg group-hover:shadow-[0_0_25px_rgba(255,193,7,0.35),inset_0_0_15px_rgba(255,193,7,0.12)] p-3"
      >
        {/* Top Media & Badges */}
        <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#060D26]">
          {/* Main Visual */}
          {renderArtwork()}

          {/* Top Left Badge (e.g. TOP RATED / -20% / -15%) */}
          <div className="absolute top-2.5 left-2.5 z-20">
            {product.tags && product.tags.includes('TOP RATED') ? (
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FFC107] text-slate-950 shadow-md uppercase tracking-wider">
                TOP RATED
              </span>
            ) : discountPercent && discountPercent > 0 ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FFC107] text-slate-950 shadow-md">
                -{discountPercent}%
              </span>
            ) : null}
          </div>

          {/* Top Right Wishlist Heart Icon (Exact from Screenshot 2 & 3) */}
          <button
            id={`wishlist-btn-${product.id}`}
            onClick={handleWishlist}
            aria-label="Wishlist"
            className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg text-slate-300 hover:text-rose-400 transition"
          >
            <Heart
              className={`w-4 h-4 ${
                isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-300 stroke-[1.8]'
              }`}
            />
          </button>
        </div>

        {/* Card Details */}
        <div className="flex-1 flex flex-col pt-3 px-1">
          {/* Product Title */}
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-1 group-hover:text-yellow-300 transition-colors font-sans">
            {product.name}
          </h3>

          {/* Rating Row (Matching Screenshot 2 & 3: Star, Rating, ReviewCount) */}
          <div className="flex items-center gap-1.5 text-xs mb-2">
            <Star className="w-3.5 h-3.5 fill-[#FFC107] text-[#FFC107]" />
            <span className="font-bold text-white text-xs">{product.rating}</span>
            <span className="text-slate-400 text-xs">({formatReviewCount(product.reviewCount)})</span>
          </div>

          {/* Pricing Row (Matching Screenshot 2 & 3) */}
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

          {/* Action Row: Buy Now + Cart Button (Exact from Screenshot 2 & 3) */}
          <div className="flex items-center gap-2">
            {/* Buy Now Button (Glossy Golden Capsule) */}
            <button
              id={`buy-now-btn-${product.id}`}
              onClick={handleBuyNow}
              className="flex-1 py-2 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all text-center"
            >
              Buy Now
            </button>

            {/* Cart Icon Button (Dark Navy with Gold Cart Icon) */}
            <button
              id={`add-cart-btn-${product.id}`}
              onClick={handleAddToCart}
              className={`p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                addedAnimation
                  ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                  : 'bg-[#0B1536] border-yellow-500/40 text-[#FFC107] hover:border-yellow-400 hover:bg-[#101E4A]'
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
