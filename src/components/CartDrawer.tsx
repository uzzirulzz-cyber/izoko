// CartDrawer — premium light-mode shopping cart (redesigned).
// Header + customer email + line items (qty stepper / remove) + server-side
// validated coupon + dynamic order summary + trust microcopy + a dominant
// gold CTA that hands off to the full-page /checkout experience.
import React, { useState, useEffect } from 'react'
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Zap,
  ShieldCheck,
  Headset,
  AlertCircle,
} from 'lucide-react'
import { CartItem, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'
import { CouponInput } from './checkout/CouponInput'
import { OrderSummary } from './checkout/OrderSummary'
import { AppliedCoupon, CartTotals } from './checkout/types'
import {
  getStoredCoupon,
  setStoredCoupon,
  getStoredContact,
  setStoredContact,
  isValidEmail,
  subscribeCheckoutState,
} from './checkout/checkoutState'
import './checkout/checkout.css'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  currency: CurrencyCode
  onUpdateQty: (productId: string, variantId: string | undefined, newQty: number) => void
  onRemoveItem: (productId: string, variantId: string | undefined) => void
  onClearCart: () => void
  user?: { name: string; email: string } | null
  onRequireAuth?: () => void
  /** Hands off to the full-page checkout (SPA navigation). */
  onProceedToCheckout: () => void
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  currency,
  onUpdateQty,
  onRemoveItem,
  user,
  onRequireAuth,
  onProceedToCheckout,
}) => {
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)

  // Restore shared checkout state (coupon/contact persist across surfaces)
  useEffect(() => {
    const sync = () => {
      setCoupon(getStoredCoupon())
      const contact = getStoredContact()
      setCheckoutEmail((prev) => prev || contact.email || '')
    }
    sync()
    const unsub = subscribeCheckoutState(sync)
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prefill email from the signed-in profile
  useEffect(() => {
    if (user?.email) {
      setCheckoutEmail((prev) => prev || user.email)
    }
  }, [user?.email])

  if (!isOpen) return null

  const itemCount = cart.reduce((a, b) => a + b.quantity, 0)

  // ---- Totals (dynamic — subtotal recomputed on every qty change) ----
  const totals: CartTotals = (() => {
    const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
    let discount = 0
    if (coupon && subtotal > 0) {
      discount =
        coupon.type === 'fixed'
          ? Math.min(coupon.value, subtotal)
          : Math.min((subtotal * coupon.value) / 100, subtotal)
    }
    return {
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      total: Math.max(0, Math.round(subtotal - discount)),
    }
  })()

  const emailErr = emailTouched && !isValidEmail(checkoutEmail) ? true : false

  const proceed = () => {
    if (!user) {
      onRequireAuth?.()
      return
    }
    if (!isValidEmail(checkoutEmail)) {
      setEmailTouched(true)
      return
    }
    setStoredContact({ name: user.name || '', email: checkoutEmail.trim() })
    onProceedToCheckout()
  }

  const maxQtyFor = (item: CartItem): number | null => {
    const stock = (item.product as any).stock
    return typeof stock === 'number' && stock >= 0 ? stock : null
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-[2px] pbx-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Your shopping cart"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div
          className="pbx-scope w-screen max-w-md bg-[#f6f7f9] shadow-2xl flex flex-col pbx-drawer-panel"
          style={{ borderLeft: '1px solid var(--pbx-border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ---------- Header ---------- */}
          <div className="px-5 py-4 bg-white flex items-center justify-between" style={{ borderBottom: '1px solid var(--pbx-border)' }}>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-200 text-slate-900">
                <ShoppingCart className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-extrabold text-slate-900 text-[17px] leading-tight tracking-tight">
                  Your Shopping Cart
                </h2>
                <p className="text-xs text-slate-500" aria-live="polite">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in basket
                </p>
              </div>
            </div>
            <button
              id="cart-drawer-close-btn"
              onClick={onClose}
              aria-label="Close cart"
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <X className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* ---------- Body ---------- */}
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <span className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-4">
                <ShoppingCart className="w-7 h-7 text-slate-300" aria-hidden="true" />
              </span>
              <p className="text-base font-bold text-slate-900">Your cart is empty</p>
              <p className="text-sm text-slate-500 mt-1.5 max-w-[260px] leading-relaxed">
                Explore 4K smart cinema projectors and verified digital subscriptions, then check
                out in seconds.
              </p>
              <button onClick={onClose} className="pbx-btn-blue mt-6">
                Browse Products
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Customer email — keys are delivered instantly to this address */}
                <div>
                  <label htmlFor="pbx-cart-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email address
                    <span className="ml-1.5 font-medium text-slate-400 normal-case">
                      — keys are delivered here instantly
                    </span>
                  </label>
                  <input
                    id="pbx-cart-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={checkoutEmail}
                    onChange={(e) => {
                      setCheckoutEmail(e.target.value)
                      setStoredContact({ ...getStoredContact(), email: e.target.value })
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@example.com"
                    className="pbx-input"
                    aria-invalid={emailErr}
                    aria-describedby={emailErr ? 'pbx-cart-email-error' : undefined}
                  />
                  {emailErr && (
                    <p
                      id="pbx-cart-email-error"
                      className="flex items-center gap-1.5 text-xs font-medium text-rose-600 mt-1.5"
                      role="alert"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Enter a valid email address to continue.
                    </p>
                  )}
                </div>

                {/* ---------- Line items ---------- */}
                <ul className="space-y-3" aria-label="Cart items">
                  {cart.map((item) => {
                    const variantKey = item.selectedVariant?.id || 'none'
                    const maxQty = maxQtyFor(item)
                    const lineTotal = item.unitPrice * item.quantity
                    return (
                      <li
                        key={`${item.product.id}-${variantKey}`}
                        className="pbx-card pbx-card-hover p-3.5"
                        data-testid="cart-item"
                      >
                        <div className="flex gap-3.5">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-[72px] h-[72px] rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-bold text-[13.5px] text-slate-900 leading-snug line-clamp-2">
                                  {item.product.name}
                                </h3>
                                {item.selectedVariant && (
                                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600">
                                    {item.selectedVariant.name}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => onRemoveItem(item.product.id, item.selectedVariant?.id)}
                                aria-label={`Remove ${item.product.name} from cart`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-2.5 gap-2">
                              <div className="pbx-qty" role="group" aria-label={`Quantity for ${item.product.name}`}>
                                <button
                                  onClick={() =>
                                    onUpdateQty(item.product.id, item.selectedVariant?.id, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span aria-live="polite">{item.quantity}</span>
                                <button
                                  onClick={() =>
                                    onUpdateQty(item.product.id, item.selectedVariant?.id, item.quantity + 1)
                                  }
                                  disabled={maxQty != null && item.quantity >= maxQty}
                                  aria-label="Increase quantity"
                                  title={maxQty != null && item.quantity >= maxQty ? 'Maximum available quantity reached' : undefined}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="text-right">
                                <div className="text-[15px] font-extrabold text-slate-900 pbx-num">
                                  {formatPrice(lineTotal, currency)}
                                </div>
                                {item.quantity > 1 && (
                                  <div className="text-[10px] text-slate-400 pbx-num">
                                    {formatPrice(item.unitPrice, currency)} each
                                  </div>
                                )}
                              </div>
                            </div>
                            {maxQty != null && maxQty <= 5 && (
                              <div className="text-[10px] font-semibold text-amber-600 mt-1.5">
                                Only {maxQty} left in stock
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {/* ---------- Coupon (server-validated) ---------- */}
                <CouponInput
                  applied={coupon}
                  subtotal={totals.subtotal}
                  formatAmount={(n) => formatPrice(n, currency)}
                  onApplied={(c) => setStoredCoupon(c)}
                  onRemoved={() => setStoredCoupon(null)}
                />

                {/* ---------- Order summary ---------- */}
                <div className="pbx-card p-4" data-testid="cart-summary">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Order Summary
                  </h3>
                  <OrderSummary totals={totals} coupon={coupon} formatAmount={(n) => formatPrice(n, currency)} compact />
                </div>

                {/* ---------- Trust microcopy ---------- */}
                <div className="pbx-card px-4 py-3.5">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: Zap, title: 'Instant Delivery', sub: 'Digital product' },
                      { icon: ShieldCheck, title: 'Secure Payment', sub: 'SSL encrypted' },
                      { icon: Headset, title: '24/7 Support', sub: "We're here to help" },
                    ].map(({ icon: Icon, title, sub }) => (
                      <div key={title} className="flex flex-col items-center text-center gap-1">
                        <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span className="text-[10.5px] font-bold text-slate-800 leading-tight">{title}</span>
                        <span className="text-[9.5px] text-slate-500 leading-tight">{sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center px-2 pb-1 leading-relaxed">
                  Digital keys are delivered to your email and account immediately after verified
                  payment. All prices are in Pakistani Rupees (PKR / Rs).
                </p>
              </div>

              {/* ---------- Footer CTA ---------- */}
              <div
                className="px-5 py-4 bg-white"
                style={{ borderTop: '1px solid var(--pbx-border)' }}
              >
                <button
                  id="cart-proceed-checkout-btn"
                  onClick={proceed}
                  className="pbx-cta"
                  data-testid="proceed-to-checkout"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight style={{ width: 18, height: 18 }} />
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2.5">
                  {user ? (
                    <>
                      Signed in as <span className="font-semibold text-slate-500">{user.email}</span>
                    </>
                  ) : (
                    'You will be asked to sign in to complete checkout'
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
