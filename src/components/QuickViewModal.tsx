import React, { useState } from 'react'
import {
  X,
  Star,
  Check,
  Zap,
  ShieldCheck,
  ShoppingCart,
  Heart,
  Globe,
  Copy,
  CheckCheck,
  ChevronRight,
} from 'lucide-react'
import { Product, CurrencyCode, ProductVariant } from '../types'
import { formatPrice } from '../lib/currency'

interface QuickViewModalProps {
  product: Product | null
  currency: CurrencyCode
  isOpen: boolean
  onClose: () => void
  onAddToCart: (p: Product, variant?: ProductVariant) => void
  onInstantBuy: (p: Product, variant?: ProductVariant) => void
  isWishlisted: boolean
  onToggleWishlist: (p: Product) => void
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  currency,
  isOpen,
  onClose,
  onAddToCart,
  onInstantBuy,
  isWishlisted,
  onToggleWishlist,
}) => {
  if (!isOpen || !product) return null

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  )
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'activation' | 'reviews'>('overview')
  const [activeImage, setActiveImage] = useState<string>(product.image)
  const [copiedSku, setCopiedSku] = useState(false)
  const [addedToast, setAddedToast] = useState(false)

  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const originalPrice = selectedVariant?.originalPrice || product.originalPrice

  const handleCopySku = () => {
    navigator.clipboard.writeText(product.sku)
    setCopiedSku(true)
    setTimeout(() => setCopiedSku(false), 2000)
  }

  const handleAdd = () => {
    onAddToCart(product, selectedVariant)
    setAddedToast(true)
    setTimeout(() => setAddedToast(false), 2000)
  }

  const allImages = product.galleryImages && product.galleryImages.length > 0
    ? product.galleryImages
    : [product.image]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#040711]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        id="quickview-modal-container"
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[22px] bg-[#0A122E] border border-slate-400/20 shadow-2xl text-slate-100 flex flex-col"
      >
        {/* Liquid Glass Highlight */}
        <div className="liquid-glass-highlight"></div>

        {/* Modal Close Button */}
        <button
          id="quickview-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-xl bg-[#060B1E]/80 hover:bg-[#0E1E4A] border border-slate-400/20 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8 relative z-10">
          {/* Left Column: Media Gallery */}
          <div className="md:col-span-5 flex flex-col gap-3.5">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#060B1E] border border-slate-400/15">
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {product.discountPercent && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-yellow-400 text-slate-950 shadow-md">
                    -{product.discountPercent}%
                  </span>
                )}
                {product.isHot && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-[#0A122E]/80 text-yellow-300 backdrop-blur-md border border-yellow-400/30">
                    FEATURED
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Row */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border transition shrink-0 ${
                      activeImage === img
                        ? 'border-yellow-400 shadow-md'
                        : 'border-slate-400/15 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Guarantee Box */}
            <div className="p-3.5 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-yellow-400 font-bold">
                <ShieldCheck className="w-4 h-4 text-sky-400" /> Genuine License Guarantee
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Directly provisioned from verified vendor channels. Full duration warranty with instant replacement guarantee.
              </p>
            </div>
          </div>

          {/* Right Column: Information & Actions */}
          <div className="md:col-span-7 flex flex-col justify-between">
            <div>
              {/* Category & SKU row */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                <span className="px-2.5 py-0.5 rounded-md bg-yellow-400/10 text-yellow-300 font-bold border border-yellow-400/25 uppercase tracking-wider text-[9px]">
                  {product.category}
                </span>

                <button
                  onClick={handleCopySku}
                  className="flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-white transition"
                  title="Copy SKU"
                >
                  <span>{product.sku}</span>
                  {copiedSku ? (
                    <CheckCheck className="w-3.5 h-3.5 text-yellow-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-2.5 font-sans">
                {product.name}
              </h2>

              {/* Rating & Region */}
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3.5 font-mono">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-slate-100 font-bold">{product.rating}</span>
                  <span className="text-slate-500 font-normal">({product.reviewCount} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Globe className="w-3.5 h-3.5" /> Region: <strong className="text-slate-200 font-semibold">{product.region}</strong>
                </div>
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase font-mono text-slate-400 tracking-wider">
                    Price
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-extrabold font-mono text-white">
                      {formatPrice(currentPrice, currency)}
                    </span>
                    {originalPrice && originalPrice > currentPrice && (
                      <span className="text-xs font-mono text-slate-500 line-through">
                        {formatPrice(originalPrice, currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-mono bg-yellow-400/10 text-yellow-300 border border-yellow-400/30">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> {product.deliveryType}
                  </span>
                </div>
              </div>

              {/* Variant Selector (if available) */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-4">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                    Available Packages:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-200 shadow-sm'
                              : 'bg-[#060B1E] border-slate-400/15 text-slate-300 hover:border-slate-400/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="truncate text-slate-100 font-medium">{v.name}</span>
                            {v.badge && (
                              <span className="px-1.5 py-0.2 text-[8px] font-mono rounded bg-yellow-400 text-slate-950 font-bold">
                                {v.badge}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-yellow-400 font-bold">
                            {formatPrice(v.price, currency)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Detail Tabs */}
              <div className="border-b border-slate-400/10 mb-3 flex items-center gap-5 text-xs font-semibold font-mono">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 transition ${
                    activeTab === 'overview'
                      ? 'text-yellow-300 border-b-2 border-yellow-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overview
                </button>
                {product.projectorSpec && (
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`pb-2 transition ${
                      activeTab === 'specs'
                        ? 'text-yellow-300 border-b-2 border-yellow-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Specifications
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('activation')}
                  className={`pb-2 transition ${
                    activeTab === 'activation'
                      ? 'text-yellow-300 border-b-2 border-yellow-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Delivery Guide
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2 transition ${
                    activeTab === 'reviews'
                      ? 'text-yellow-300 border-b-2 border-yellow-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reviews ({product.reviewCount})
                </button>
              </div>

              {/* Tab Content Area */}
              <div className="text-xs text-slate-300 leading-relaxed mb-6 min-h-[80px]">
                {activeTab === 'overview' && (
                  <div>
                    <p className="mb-2 text-slate-200">{product.detailedDescription || product.description}</p>
                    {product.features && (
                      <ul className="space-y-1.5">
                        {product.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-slate-200">
                            <Check className="w-3.5 h-3.5 text-yellow-400 shrink-0 stroke-[2.5]" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {activeTab === 'specs' && product.projectorSpec && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15">
                      <strong className="text-yellow-400">Brightness:</strong> {product.projectorSpec.brightnessAnsi} ANSI LM
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15">
                      <strong className="text-yellow-400">Resolution:</strong> {product.projectorSpec.nativeResolution}
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15">
                      <strong className="text-yellow-400">Smart OS:</strong> {product.projectorSpec.os}
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15">
                      <strong className="text-yellow-400">Chipset:</strong> {product.projectorSpec.cpu} ({product.projectorSpec.ramRom})
                    </div>
                  </div>
                )}

                {activeTab === 'activation' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-md bg-yellow-400/20 text-yellow-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                      <p className="text-slate-200">Complete checkout through our secure payment gateway with instant automated verification.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-md bg-yellow-400/20 text-yellow-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      <p className="text-slate-200">Your unique activation key or courier tracking details are dispatched immediately to your email.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-[#060B1E] border border-slate-400/15">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white">Ali R. (Verified Buyer)</span>
                        <div className="flex text-amber-400"><Star className="w-3 h-3 fill-current" /> 5/5</div>
                      </div>
                      <p className="text-slate-300 text-[11px]">"Received key in seconds. Activated flawlessly. Best digital marketplace in the region."</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-400/10">
              <button
                id="modal-toggle-wishlist-btn"
                onClick={() => onToggleWishlist(product)}
                className={`p-3 rounded-xl border transition ${
                  isWishlisted
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                    : 'bg-[#060B1E] border-slate-400/20 text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
                }`}
                title="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>

              <button
                id="modal-add-to-cart-btn"
                onClick={handleAdd}
                className="flex-1 py-3 px-4 rounded-xl btn-silver-metallic text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-98"
              >
                {addedToast ? (
                  <>
                    <Check className="w-4 h-4 text-yellow-400" />
                    <span>Added to Basket</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Basket</span>
                  </>
                )}
              </button>

              <button
                id="modal-instant-buy-btn"
                onClick={() => {
                  onInstantBuy(product, selectedVariant)
                  onClose()
                }}
                className="flex-1 py-3 px-4 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs sm:text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-1.5"
              >
                <span>Instant Checkout</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
