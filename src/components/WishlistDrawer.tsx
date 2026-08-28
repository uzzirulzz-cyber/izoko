import React from 'react'
import { X, Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { Product, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'

interface WishlistDrawerProps {
  isOpen: boolean
  onClose: () => void
  wishlist: Product[]
  currency: CurrencyCode
  onAddToCart: (p: Product) => void
  onRemoveWishlist: (p: Product) => void
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlist,
  currency,
  onAddToCart,
  onRemoveWishlist,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#040711]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0A122E] border-l border-slate-400/20 text-slate-100 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-400/10 flex items-center justify-between bg-[#060B1E]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Saved Wishlist</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {wishlist.length} saved products
                </p>
              </div>
            </div>

            <button
              id="wishlist-drawer-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0A122E] hover:bg-[#0E1E4A] text-slate-400 hover:text-white border border-slate-400/15 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Heart className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Your wishlist is empty</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Click the heart icon on any product card to bookmark it for later.
                </p>
              </div>
            ) : (
              wishlist.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#060B1E] border border-slate-400/15 flex gap-3.5 items-center"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover bg-slate-900 shrink-0 border border-slate-400/10"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-white truncate">{item.name}</h4>
                    <span className="text-[9px] text-yellow-400 font-mono uppercase block mt-0.5">
                      {item.category}
                    </span>
                    <div className="font-mono font-bold text-xs text-white mt-1">
                      {formatPrice(item.price, currency)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => onAddToCart(item)}
                      className="p-2 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow-sm"
                      title="Add to cart"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                    <button
                      onClick={() => onRemoveWishlist(item)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
