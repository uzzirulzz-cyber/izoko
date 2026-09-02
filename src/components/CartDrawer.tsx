import React, { useState } from 'react'
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  CheckCircle2,
  CreditCard,
  Building2,
  QrCode,
  Copy,
  CheckCheck,
  Lock,
  AlertTriangle,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { CartItem, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

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
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  currency,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  user,
  onRequireAuth,
}) => {
  const [couponInput, setCouponInput] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  // Separate flag: order submission in flight (isCheckingOut only means the
  // checkout form is open — reusing it for both left the pay button permanently
  // disabled, so checkout could never be submitted)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'easypaisa' | 'jazzcash' | 'crypto' | 'bank'>('card')
  const [checkoutEmail, setCheckoutEmail] = useState('')
  const [checkoutName, setCheckoutName] = useState('')
  // Legal consent (audit §5): both checkboxes are required before payment
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [acknowledgeRefund, setAcknowledgeRefund] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [orderCompleted, setOrderCompleted] = useState<{
    orderId: string
    keys: { title: string; key: string }[]
    totalPaid: string
  } | null>(null)
  const [copiedKeyIndex, setCopiedKeyIndex] = useState<number | null>(null)

  if (!isOpen) return null

  // Subtotal calculation
  const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  const discountAmount = subtotal * appliedDiscount
  const finalTotal = Math.max(0, subtotal - discountAmount)

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    setCouponError('')
    setCouponSuccess('')

    const code = couponInput.trim().toUpperCase()
    if (code === 'PLAYBEAT10') {
      setAppliedDiscount(0.10)
      setCouponSuccess('10% VIP Promo Discount Applied!')
    } else if (code === 'CINEMA2026') {
      setAppliedDiscount(0.15)
      setCouponSuccess('15% Cinema Promo Discount Applied!')
    } else {
      setCouponError('Invalid coupon code. Try PLAYBEAT10')
    }
  }

  const PAYMENT_LABELS: Record<string, string> = {
    card: 'Credit / Debit Card',
    easypaisa: 'EasyPaisa / JazzCash',
    crypto: 'Binance Pay / Crypto',
    bank: 'Direct Bank Transfer',
  }

  // REAL checkout — creates the order on the server via POST /api/orders.
  // The server verifies prices against the product database, generates the
  // license keys and persists the order. A failed request never clears the
  // cart and never shows a success screen (audit §4/§5/§14).
  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkoutEmail) return
    // Final auth guard — no guest checkout
    if (!user) {
      onRequireAuth?.()
      return
    }
    if (!agreeTerms || !acknowledgeRefund) {
      setCheckoutError('Please accept the Terms & Conditions and acknowledge the Refund Policy to continue.')
      return
    }

    setIsPlacingOrder(true)
    setCheckoutError('')

    try {
      const token = localStorage.getItem('playbeat_user_token')
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          items: cart.map((item) => ({
            product: {
              id: item.product.id,
              _id: (item.product as any)._id,
              sku: item.product.sku,
              name: item.product.name,
              price: item.product.price,
              digital: item.product.digital,
              deliveryType: (item.product as any).deliveryType,
            },
            selectedVariant: item.selectedVariant
              ? { id: item.selectedVariant.id, name: item.selectedVariant.name }
              : undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          customerName: checkoutName,
          customerEmail: checkoutEmail,
          totalAmount: finalTotal,
          currency,
          paymentMethod: PAYMENT_LABELS[selectedPaymentMethod] || selectedPaymentMethod,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        // Payment/order failure — cart is preserved, no fake confirmation.
        setCheckoutError(data?.error || `Order could not be placed (${res.status}). Please try again or contact support.`)
        setIsPlacingOrder(false)
        return
      }

      // Adopt the SERVER-created order (real order number + real keys)
      const serverOrder = data.order || {}
      const serverKeys: { title: string; key: string }[] = (serverOrder.items || [])
        .flatMap((it: any) =>
          (it.licenseKeys || []).map((k: string) => ({
            title: it.name + (it.variantName ? ` (${it.variantName})` : ''),
            key: k,
          }))
        )
      const generatedKeys = serverKeys.length
        ? serverKeys
        : cart.map((item) => ({
            title: item.product.name + (item.selectedVariant ? ` (${item.selectedVariant.name})` : ''),
            key: item.product.digital === false ? 'COURIER-DISPATCH-PENDING' : 'DELIVERY-PENDING-EMAIL',
          }))

      // Trigger celebratory confetti only after a verified successful order
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FACC15', '#38BDF8', '#FDE047', '#EAB308'],
        })
      } catch {
        // ignore
      }

      setOrderCompleted({
        orderId: serverOrder.orderNumber || `PB-${Date.now().toString().slice(-6)}`,
        keys: generatedKeys,
        totalPaid: formatPrice(serverOrder.totalAmount ?? finalTotal, currency),
      })

      onClearCart()
      setIsCheckingOut(false)
      setIsPlacingOrder(false)
      setAgreeTerms(false)
      setAcknowledgeRefund(false)
    } catch (err) {
      setCheckoutError('Network error — we could not reach the order service. Your cart is safe; please try again.')
      setIsPlacingOrder(false)
    }
  }

  const handleCopyKey = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedKeyIndex(idx)
    setTimeout(() => setCopiedKeyIndex(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#040711]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0A122E] border-l border-slate-400/20 text-slate-100 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-400/10 flex items-center justify-between bg-[#060B1E]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/25">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Your Shopping Cart</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {cart.reduce((a, b) => a + b.quantity, 0)} items in basket
                </p>
              </div>
            </div>

            <button
              id="cart-drawer-close-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#0A122E] hover:bg-[#0E1E4A] text-slate-400 hover:text-white border border-slate-400/15 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Content or Order Success */}
          {orderCompleted ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 mb-4 animate-bounce shadow-xl">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <h3 className="text-xl font-extrabold text-white mb-1">
                Order Confirmed & Fulfilled
              </h3>
              <p className="text-xs text-slate-400 mb-5 font-mono">
                Order #{orderCompleted.orderId} • Total: <strong className="text-yellow-300 font-bold">{orderCompleted.totalPaid}</strong>
              </p>

              <div className="w-full rounded-2xl bg-[#060B1E] p-4 border border-slate-400/15 text-left space-y-3 mb-6">
                <div className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Instant Digital Keys:
                </div>
                {orderCompleted.keys.map((k, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-[#0A122E] border border-slate-400/15 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-200 truncate">{k.title}</div>
                    <div className="flex items-center justify-between bg-[#060B1E] px-3 py-2 rounded-lg border border-slate-400/15">
                      <span className="font-mono text-xs font-bold text-yellow-300 select-all">{k.key}</span>
                      <button
                        onClick={() => handleCopyKey(k.key, idx)}
                        className="text-slate-400 hover:text-white p-1 transition"
                        title="Copy Key"
                      >
                        {copiedKeyIndex === idx ? (
                          <CheckCheck className="w-3.5 h-3.5 text-yellow-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 mb-6 font-sans">
                A confirmation receipt and setup guide have been dispatched to your email address.
              </p>

              <button
                onClick={() => {
                  setOrderCompleted(null)
                  onClose()
                }}
                className="w-full py-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs shadow-xl transition"
              >
                Continue Shopping
              </button>
            </div>
          ) : isCheckingOut ? (
            /* Checkout Form View */
            <form onSubmit={handleCompleteOrder} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Express VIP Checkout
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCheckingOut(false)}
                  className="text-xs text-yellow-400 hover:underline font-mono"
                >
                  ← Back to basket
                </button>
              </div>

              {checkoutError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Customer Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={checkoutName}
                    onChange={(e) => setCheckoutName(e.target.value)}
                    placeholder="e.g. Bilal Ahmed"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address (For Instant Delivery)
                  </label>
                  <input
                    type="email"
                    required
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    placeholder="youremail@domain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/20 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/60"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'card', name: 'Credit / Debit Card', icon: CreditCard },
                    { id: 'easypaisa', name: 'EasyPaisa / JazzCash', icon: QrCode },
                    { id: 'crypto', name: 'Binance Pay / Crypto', icon: Zap },
                    { id: 'bank', name: 'Direct Bank Transfer', icon: Building2 },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setSelectedPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border text-left text-xs transition flex flex-col justify-between ${
                        selectedPaymentMethod === m.id
                          ? 'bg-yellow-400/10 border-yellow-400/60 text-yellow-200 shadow-sm'
                          : 'bg-[#060B1E] border-slate-400/15 text-slate-400 hover:text-slate-200 hover:border-slate-400/30'
                      }`}
                    >
                      <m.icon className="w-4 h-4 mb-2 text-yellow-400" />
                      <span className="font-semibold text-[11px]">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Legal consent (audit §5) — required checkboxes with working links */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-yellow-400"
                  />
                  <span className="text-[11px] text-slate-300 leading-relaxed">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-semibold hover:underline">
                      Terms &amp; Conditions
                    </a>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={acknowledgeRefund}
                    onChange={(e) => setAcknowledgeRefund(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 shrink-0 accent-yellow-400"
                  />
                  <span className="text-[11px] text-slate-300 leading-relaxed">
                    I acknowledge the{' '}
                    <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-semibold hover:underline">
                      Refund Policy
                    </a>{' '}
                    — digital keys are non-refundable once successfully activated.
                  </span>
                </label>
              </div>

              {/* Order Summary in Checkout */}
              <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2 text-xs text-slate-300 font-mono">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-slate-100">{formatPrice(subtotal, currency)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-yellow-400">
                    <span>VIP Promo Discount:</span>
                    <span>-{formatPrice(discountAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-white pt-2.5 border-t border-slate-400/10">
                  <span>Total Due:</span>
                  <span className="text-yellow-300 font-mono text-base">{formatPrice(finalTotal, currency)}</span>
                </div>
              </div>

              <button
                type="submit"
                id="complete-checkout-btn"
                disabled={isPlacingOrder}
                className="w-full py-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs shadow-xl transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
              >
                {isPlacingOrder ? (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950 animate-pulse" />
                    <span>Processing your order…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Pay {formatPrice(finalTotal, currency)} &amp; Receive Keys</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Standard Cart List */
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <ShoppingCart className="w-12 h-12 text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Your basket is empty</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Explore our 4K smart cinema projectors and verified digital AI subscriptions.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => {
                    const variantKey = item.selectedVariant?.id || 'none'
                    return (
                      <div
                        key={`${item.product.id}-${variantKey}`}
                        className="p-3 rounded-2xl bg-[#060B1E] border border-slate-400/15 flex gap-3.5 items-center"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-900 shrink-0 border border-slate-400/10"
                        />

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-white truncate">
                            {item.product.name}
                          </h4>
                          {item.selectedVariant && (
                            <span className="text-[10px] text-yellow-400 font-mono block">
                              {item.selectedVariant.name}
                            </span>
                          )}
                          <div className="font-mono font-bold text-xs text-slate-200 mt-1">
                            {formatPrice(item.unitPrice, currency)}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 bg-[#0A122E] border border-slate-400/15 rounded-lg p-0.5">
                            <button
                              onClick={() =>
                                onUpdateQty(item.product.id, item.selectedVariant?.id, item.quantity - 1)
                              }
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs px-1.5 text-slate-100 font-bold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                onUpdateQty(item.product.id, item.selectedVariant?.id, item.quantity + 1)
                              }
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.product.id, item.selectedVariant?.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="p-4 sm:p-5 border-t border-slate-400/10 bg-[#060B1E] space-y-3.5">
                  {/* Coupon Code Input */}
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Coupon: PLAYBEAT10"
                        className="w-full bg-[#0A122E] border border-slate-400/20 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 uppercase font-mono focus:outline-none focus:border-yellow-400/60"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl btn-silver-metallic text-xs font-bold text-white transition"
                    >
                      Apply
                    </button>
                  </form>

                  {couponSuccess && (
                    <div className="text-[11px] text-yellow-400 font-mono font-semibold">{couponSuccess}</div>
                  )}
                  {couponError && (
                    <div className="text-[11px] text-rose-400 font-mono">{couponError}</div>
                  )}

                  {/* Summary Totals */}
                  <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="text-slate-200">{formatPrice(subtotal, currency)}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-yellow-400">
                        <span>VIP Coupon (10%):</span>
                        <span>-{formatPrice(discountAmount, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-white pt-2.5 border-t border-slate-400/10">
                      <span>Final Total:</span>
                      <span className="font-mono text-yellow-300 text-base font-extrabold">
                        {formatPrice(finalTotal, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Proceed to Checkout Button — sign-in required (no guest checkout) */}
                  {!user ? (
                    <button
                      id="cart-proceed-checkout-btn"
                      onClick={() => onRequireAuth?.()}
                      className="w-full py-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs sm:text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Sign In to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      id="cart-proceed-checkout-btn"
                      onClick={() => {
                        // pre-populate checkout form with user's profile
                        if (!checkoutEmail && user.email) setCheckoutEmail(user.email)
                        if (!checkoutName && user.name) setCheckoutName(user.name)
                        setIsCheckingOut(true)
                      }}
                      className="w-full py-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs sm:text-sm shadow-xl transition active:scale-98 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
