// CheckoutPage (/checkout) — premium light two-stage checkout.
//   Section 1 — Customer information (email validated inline, persisted)
//   Section 2 — Payment gateway (dynamic, backend-driven radio cards)
// Right column (desktop): sticky premium summary (items, coupon, totals).
// Mobile: stacked sections + inline summary + sticky bottom CTA bar.
//
// Payment flow (all server-authoritative):
//   1. POST /api/orders  → server recomputes prices + re-validates the coupon
//   2. Rapid  → POST /api/payments/rapid/create → hosted checkout redirect;
//      truth arrives ONLY via the verified webhook (/order/:num result page)
//   3. Direct → order returned complete with released keys (store policy)
// The browser never marks anything paid and totals are never trusted.
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  User,
  CreditCard,
  ShieldCheck,
  Lock,
  ArrowLeft,
  AlertTriangle,
  Info,
  ShoppingCart,
  Minus,
  Plus,
} from 'lucide-react'
import { CartItem, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'
import { PaymentMethodSelector } from './checkout/PaymentMethodSelector'
import { SecurityBadges } from './checkout/SecurityBadges'
import { CouponInput } from './checkout/CouponInput'
import { OrderSummary } from './checkout/OrderSummary'
import { CheckoutCTA } from './checkout/CheckoutCTA'
import { OrderSuccess } from './checkout/OrderSuccess'
import { PaymentLogoRow, BrandId } from './checkout/PaymentLogos'
import { PaymentMethodInfo, AppliedCoupon, CartTotals } from './checkout/types'
import { fetchPaymentMethods } from './checkout/paymentApi'
import {
  getStoredCoupon,
  setStoredCoupon,
  getStoredContact,
  setStoredContact,
  isValidEmail,
  emailError,
  subscribeCheckoutState,
} from './checkout/checkoutState'
import './checkout/checkout.css'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

interface CheckoutPageProps {
  cart: CartItem[]
  currency: CurrencyCode
  user: { name: string; email: string } | null
  onRequireAuth: () => void
  onNavigate: (path: string) => void
  onUpdateQty: (productId: string, variantId: string | undefined, newQty: number) => void
  onRemoveItem: (productId: string, variantId: string | undefined) => void
  onClearCart: () => void
}

const DIRECT_METHOD_LABEL: Record<string, string> = {
  card: 'Credit / Debit Card',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  crypto: 'Binance Pay / Crypto',
  bank: 'Direct Bank Transfer',
}

type PlacedOrder = {
  orderNumber: string
  totalLabel: string
  paymentMethodLabel: string
  keys: { title: string; key: string }[]
  hasDigitalKeys: boolean
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  currency,
  user,
  onRequireAuth,
  onNavigate,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) => {
  // ---- payment methods (backend-driven) ----
  const [methods, setMethods] = useState<PaymentMethodInfo[] | null>(null)
  const [methodsLoading, setMethodsLoading] = useState(true)
  const [methodsError, setMethodsError] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('')

  // ---- customer + legal ----
  const [contact, setContact] = useState(() => getStoredContact())
  const [emailTouched, setEmailTouched] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [acknowledgeRefund, setAcknowledgeRefund] = useState(false)
  const [legalAttempted, setLegalAttempted] = useState(false)

  // ---- coupon (shared store, server-validated) ----
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(() => getStoredCoupon())

  // ---- submission ----
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [methodError, setMethodError] = useState(false)
  const [placed, setPlaced] = useState<PlacedOrder | null>(null)
  const clientRequestId = useRef<string>(
    `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  )

  // ---- shared state sync (drawer ↔ page) ----
  useEffect(() => {
    const sync = () => setCoupon(getStoredCoupon())
    const unsub = subscribeCheckoutState(sync)
    return unsub
  }, [])

  // Prefill from the signed-in profile when empty
  useEffect(() => {
    if (user) {
      setContact((prev) => ({
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
      }))
    }
  }, [user])

  const loadMethods = useCallback(async () => {
    setMethodsLoading(true)
    setMethodsError('')
    try {
      const list = await fetchPaymentMethods()
      setMethods(list)
      // Pre-select the recommended available method (usually Rapid)
      const preferred =
        list.find((m) => m.available && m.recommended) || list.find((m) => m.available)
      setSelectedMethod((prev) =>
        prev && list.some((m) => m.id === prev && m.available) ? prev : preferred?.id || ''
      )
    } catch (err: any) {
      setMethodsError(err?.message || 'Could not load payment methods.')
    } finally {
      setMethodsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMethods()
  }, [loadMethods])

  // ---- totals (dynamic; server recomputes + re-validates at order time) ----
  const totals: CartTotals = useMemo(() => {
    const subtotal = Math.round(cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0))
    let discount = 0
    if (coupon && subtotal > 0) {
      discount =
        coupon.type === 'fixed'
          ? Math.min(coupon.value, subtotal)
          : Math.min((subtotal * coupon.value) / 100, subtotal)
    }
    return {
      subtotal,
      discount: Math.round(discount),
      total: Math.max(0, Math.round(subtotal - discount)),
    }
  }, [cart, coupon])

  const selectedMethodDef = methods?.find((m) => m.id === selectedMethod) || null
  const isRapid = selectedMethodDef?.id === 'rapid'
  const itemCount = cart.reduce((a, b) => a + b.quantity, 0)
  const fmt = useCallback((n: number) => formatPrice(n, currency), [currency])

  // ---- validation gates ----
  const emailErr = emailTouched ? emailError(contact.email) : ''
  const legalOk = agreeTerms && acknowledgeRefund
  const canPay =
    cart.length > 0 &&
    !submitting &&
    isValidEmail(contact.email) &&
    legalOk &&
    !!selectedMethodDef &&
    selectedMethodDef.available &&
    !methodsError

  const partnerBrands = useMemo(() => {
    const ids = new Set<BrandId>()
    ;(methods || []).forEach((m) => m.available && m.brands.forEach((b) => ids.add(b as BrandId)))
    return [...ids]
  }, [methods])

  const maxQtyFor = (item: CartItem): number | null => {
    const stock = (item.product as any).stock
    return typeof stock === 'number' && stock >= 0 ? stock : null
  }

  // ---- place order ----
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    // Gate 1: signed in
    if (!user) {
      onRequireAuth()
      return
    }
    // Gate 2: cart
    if (cart.length === 0) return
    // Gate 3: email
    setEmailTouched(true)
    if (!isValidEmail(contact.email)) {
      document.getElementById('pbx-co-email')?.focus()
      return
    }
    // Gate 4: legal
    setLegalAttempted(true)
    if (!legalOk) {
      setCheckoutError(
        'Please accept the Terms & Conditions and acknowledge the Refund Policy to continue.'
      )
      return
    }
    // Gate 5: payment method
    if (!selectedMethodDef || !selectedMethodDef.available) {
      setMethodError(true)
      setCheckoutError('Please select an available payment method to continue.')
      return
    }

    setSubmitting(true)
    setCheckoutError('')

    // Persist contact for future visits / drawer sync
    setStoredContact({ name: contact.name, email: contact.email.trim() })

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
          customerName: contact.name,
          customerEmail: contact.email.trim(),
          totalAmount: totals.total, // reference only — server recomputes
          currency,
          paymentMethod: isRapid ? 'rapid' : DIRECT_METHOD_LABEL[selectedMethod] || selectedMethod,
          couponCode: coupon?.code || undefined,
          clientRequestId: clientRequestId.current,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        // Server rejected the coupon (expired / min-spend at order time) —
        // clear it so the summary matches reality, keep the cart intact.
        if (res.status === 409 && /coupon/i.test(String(data?.error || ''))) {
          setStoredCoupon(null)
        }
        setCheckoutError(
          data?.error ||
            `Checkout could not be completed (${res.status}). Your cart is safe — please try again.`
        )
        setSubmitting(false)
        clientRequestId.current = `chk-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 10)}`
        return
      }

      const order = data.order || {}
      const orderNumber = order.orderNumber as string

      // ---------- Rapid: start the hosted payment ----------
      if (isRapid) {
        if (!orderNumber) {
          setCheckoutError(
            'Order created but payment could not start. Contact support with your order number.'
          )
          setSubmitting(false)
          return
        }
        const payRes = await fetch(`${API_BASE}/api/payments/rapid/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ orderNumber }),
        })
        const payData = await payRes.json().catch(() => null)
        if (!payRes.ok || !payData?.success || !payData?.checkoutUrl) {
          setCheckoutError(
            payData?.error ||
              `Order ${orderNumber} was saved as PENDING but the payment session could not start. You can retry from My Orders — you will not be charged twice.`
          )
          setSubmitting(false)
          return
        }
        try {
          sessionStorage.setItem('playbeat_pending_checkout_order', orderNumber)
        } catch {
          /* ignore */
        }
        onClearCart()
        setStoredCoupon(null)
        // Hand off to the gateway's hosted checkout — payment truth comes
        // back via the verified webhook and the /order/:num result page.
        window.location.href = payData.checkoutUrl
        return
      }

      // ---------- Direct methods: server confirmed + released keys ----------
      const serverKeys: { title: string; key: string }[] = (order.items || []).flatMap((it: any) =>
        (it.licenseKeys || []).map((k: string) => ({
          title: it.name + (it.variantName ? ` (${it.variantName})` : ''),
          key: k,
        }))
      )
      const hasDigitalKeys = serverKeys.length > 0
      const keys = hasDigitalKeys
        ? serverKeys
        : cart.map((item) => ({
            title:
              item.product.name + (item.selectedVariant ? ` (${item.selectedVariant.name})` : ''),
            key:
              item.product.digital === false
                ? 'COURIER-DISPATCH-PENDING'
                : 'DELIVERY-PENDING-EMAIL',
          }))

      setPlaced({
        orderNumber,
        totalLabel: formatPrice(order.totalAmount ?? totals.total, currency),
        paymentMethodLabel: DIRECT_METHOD_LABEL[selectedMethod] || 'Direct Payment',
        keys,
        hasDigitalKeys,
      })
      onClearCart()
      setStoredCoupon(null)
      setSubmitting(false)
    } catch {
      setCheckoutError(
        'Network error — we could not reach the checkout service. Your cart is safe; please try again.'
      )
      setSubmitting(false)
      clientRequestId.current = `chk-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 10)}`
    }
  }

  // ---------- shared summary nodes ----------
  const itemsList = (showQtyControls: boolean) => (
    <ul className="px-5 py-4 space-y-3.5" style={{ borderBottom: '1px solid var(--pbx-border)' }}>
      {cart.map((item) => (
        <li key={`${item.product.id}-${item.selectedVariant?.id || 'none'}`} className="flex gap-3">
          <div className="relative shrink-0">
            <img
              src={item.product.image}
              alt={item.product.name}
              className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200"
              loading="lazy"
            />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center pbx-num">
              {item.quantity}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold text-slate-900 leading-snug line-clamp-2">
              {item.product.name}
            </div>
            {item.selectedVariant && (
              <div className="text-[10.5px] text-slate-500 mt-0.5">{item.selectedVariant.name}</div>
            )}
            <div className="flex items-center gap-2 mt-1">
              {showQtyControls ? (
                <span className="pbx-qty !rounded-lg" role="group" aria-label={`Quantity for ${item.product.name}`}>
                  <button
                    type="button"
                    style={{ width: 26, height: 26 }}
                    onClick={() => onUpdateQty(item.product.id, item.selectedVariant?.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="!min-w-[22px] text-[12px]">{item.quantity}</span>
                  <button
                    type="button"
                    style={{ width: 26, height: 26 }}
                    onClick={() => onUpdateQty(item.product.id, item.selectedVariant?.id, item.quantity + 1)}
                    disabled={(() => {
                      const max = maxQtyFor(item)
                      return max != null && item.quantity >= max
                    })()}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 pbx-num">{fmt(item.unitPrice)} each</span>
              )}
              <button
                type="button"
                onClick={() => onRemoveItem(item.product.id, item.selectedVariant?.id)}
                className="text-[10.5px] font-semibold text-slate-400 hover:text-rose-600 transition"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="text-[13px] font-extrabold text-slate-900 pbx-num shrink-0">
            {fmt(item.unitPrice * item.quantity)}
          </div>
        </li>
      ))}
    </ul>
  )

  const couponAndTotals = (
    <div className="px-5 py-4 space-y-4">
      <CouponInput
        applied={coupon}
        subtotal={totals.subtotal}
        formatAmount={fmt}
        onApplied={(c) => setStoredCoupon(c)}
        onRemoved={() => setStoredCoupon(null)}
      />
      <OrderSummary totals={totals} coupon={coupon} formatAmount={fmt} />
      {selectedMethodDef?.available && selectedMethodDef.brands.length > 0 && (
        <div className="pt-3" style={{ borderTop: '1px solid var(--pbx-border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Paying with
          </div>
          <PaymentLogoRow brands={selectedMethodDef.brands as BrandId[]} height={16} />
        </div>
      )}
    </div>
  )

  // ---------- success ----------
  if (placed) {
    return (
      <div className="pbx-scope min-h-screen">
        <OrderSuccess
          orderNumber={placed.orderNumber}
          totalLabel={placed.totalLabel}
          paymentMethodLabel={placed.paymentMethodLabel}
          email={contact.email}
          keys={placed.keys}
          hasDigitalKeys={placed.hasDigitalKeys}
          onContinueShopping={() => onNavigate('/')}
          onViewOrders={() => onNavigate('/account')}
        />
      </div>
    )
  }

  // ---------- signed-out ----------
  if (!user) {
    return (
      <div className="pbx-scope min-h-screen flex items-center justify-center p-6">
        <div className="pbx-card p-8 max-w-sm w-full text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-yellow-50 border border-yellow-200 items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-slate-900" />
          </span>
          <h1 className="text-lg font-extrabold text-slate-900">Sign in to check out</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Your cart is saved. Sign in to complete your purchase securely and access your keys
            anytime.
          </p>
          <button onClick={onRequireAuth} className="pbx-cta mt-6">
            <span>Sign In to Continue</span>
          </button>
          <button
            onClick={() => onNavigate('/')}
            className="w-full mt-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition py-2"
          >
            Back to store
          </button>
        </div>
      </div>
    )
  }

  // ---------- empty cart ----------
  if (cart.length === 0) {
    return (
      <div className="pbx-scope min-h-screen flex items-center justify-center p-6">
        <div className="pbx-card p-8 max-w-sm w-full text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 items-center justify-center mb-4">
            <ShoppingCart className="w-6 h-6 text-slate-300" />
          </span>
          <h1 className="text-lg font-extrabold text-slate-900">Your cart is empty</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Add a product to continue to checkout. Digital keys are delivered instantly after
            verified payment.
          </p>
          <button onClick={() => onNavigate('/')} className="pbx-btn-blue mt-6 mx-auto">
            Browse Products
          </button>
        </div>
      </div>
    )
  }

  const ctaDisabled = !canPay

  return (
    <div className="pbx-scope min-h-screen">
      {/* ---------- Top bar ---------- */}
      <header className="bg-white sticky top-0 z-30" style={{ borderBottom: '1px solid var(--pbx-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition py-2 pr-2"
            aria-label="Back to store"
          >
            <ArrowLeft style={{ width: 17, height: 17 }} />
            <span className="hidden sm:inline">Continue shopping</span>
            <span className="sm:hidden">Store</span>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-yellow-50 border border-yellow-200 text-slate-900">
              <Lock style={{ width: 16, height: 16 }} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-slate-900 tracking-tight">Secure Checkout</div>
              <div className="text-[11px] text-slate-400">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} · PKR
              </div>
            </div>
          </div>
        </div>
      </header>

      <form
        onSubmit={handlePay}
        className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-44 lg:pb-10"
        noValidate
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* ================= LEFT: stages ================= */}
          <div className="space-y-5 min-w-0">
            {checkoutError && (
              <div
                className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border"
                style={{ background: 'var(--pbx-red-soft)', borderColor: '#fecaca' }}
                role="alert"
                data-testid="checkout-error"
              >
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" style={{ width: 18, height: 18 }} />
                <div className="text-[13px] text-rose-700 font-medium leading-relaxed">{checkoutError}</div>
              </div>
            )}

            {/* ---------- SECTION 1 — customer information ---------- */}
            <section className="pbx-card p-5 sm:p-6" aria-labelledby="pbx-sec-customer">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-9 h-9 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center font-extrabold text-sm">
                  1
                </span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <h2
                    id="pbx-sec-customer"
                    className="text-[15px] font-extrabold text-slate-900 tracking-tight"
                  >
                    Customer Information
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pbx-co-name" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full name
                  </label>
                  <input
                    id="pbx-co-name"
                    type="text"
                    autoComplete="name"
                    value={contact.name}
                    onChange={(e) => {
                      const next = { ...contact, name: e.target.value }
                      setContact(next)
                      setStoredContact(next)
                    }}
                    placeholder="e.g. Bilal Ahmed"
                    className="pbx-input"
                  />
                </div>
                <div>
                  <label htmlFor="pbx-co-email" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email address{' '}
                    <span className="font-medium text-slate-400">— keys delivered here instantly</span>
                  </label>
                  <input
                    id="pbx-co-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={contact.email}
                    onChange={(e) => {
                      const next = { ...contact, email: e.target.value }
                      setContact(next)
                      setStoredContact(next)
                    }}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@example.com"
                    className="pbx-input"
                    aria-invalid={!!emailErr}
                    aria-describedby={emailErr ? 'pbx-co-email-error' : undefined}
                    required
                  />
                  {emailErr && (
                    <p id="pbx-co-email-error" className="text-xs font-medium text-rose-600 mt-1.5" role="alert">
                      {emailErr}
                    </p>
                  )}
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-3 leading-relaxed">
                <Info style={{ width: 13, height: 13 }} className="shrink-0 mt-px" />
                Order updates and license keys are sent to this email — please double-check it.
              </p>
            </section>

            {/* ---------- SECTION 2 — payment gateway ---------- */}
            <section className="pbx-card p-5 sm:p-6" aria-labelledby="pbx-sec-payment">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center font-extrabold text-sm">
                    2
                  </span>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    <h2
                      id="pbx-sec-payment"
                      className="text-[15px] font-extrabold text-slate-900 tracking-tight"
                    >
                      Payment Gateway
                    </h2>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                  <ShieldCheck style={{ width: 13, height: 13 }} className="text-green-600" />
                  Encrypted
                </span>
              </div>

              <PaymentMethodSelector
                methods={methods}
                loading={methodsLoading}
                loadError={methodsError}
                selectedId={selectedMethod}
                showError={methodError}
                onSelect={(id) => {
                  setSelectedMethod(id)
                  setMethodError(false)
                  if (checkoutError) setCheckoutError('')
                }}
                onRetry={loadMethods}
              />
            </section>

            {/* ---------- Trust / security ---------- */}
            <SecurityBadges partnerBrands={partnerBrands} />

            {/* ---------- Legal ---------- */}
            <section className="pbx-card p-5 sm:p-6 space-y-3" aria-label="Terms and policies">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="pbx-check mt-0.5"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  aria-invalid={legalAttempted && !agreeTerms}
                />
                <span className="text-[13px] text-slate-600 leading-relaxed">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="pbx-link">
                    Terms &amp; Conditions
                  </a>
                  {legalAttempted && !agreeTerms && (
                    <span className="block text-[11px] font-semibold text-rose-600 mt-0.5">
                      Required to continue.
                    </span>
                  )}
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="pbx-check mt-0.5"
                  checked={acknowledgeRefund}
                  onChange={(e) => setAcknowledgeRefund(e.target.checked)}
                  aria-invalid={legalAttempted && !acknowledgeRefund}
                />
                <span className="text-[13px] text-slate-600 leading-relaxed">
                  I acknowledge the{' '}
                  <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="pbx-link">
                    Refund Policy
                  </a>{' '}
                  — digital keys are non-refundable once successfully activated.
                  {legalAttempted && !acknowledgeRefund && (
                    <span className="block text-[11px] font-semibold text-rose-600 mt-0.5">
                      Required to continue.
                    </span>
                  )}
                </span>
              </label>
            </section>

            {/* ---------- Desktop CTA ---------- */}
            <div className="hidden lg:block">
              <CheckoutCTA
                id="checkout-submit-btn"
                amountLabel={fmt(totals.total)}
                disabled={ctaDisabled}
                loading={submitting}
                hosted={isRapid}
                hostedLabel="Pay {amount} Securely & Receive Keys"
                loadingLabel={isRapid ? 'Starting secure payment…' : 'Processing your order…'}
              />
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-3">
                <Lock style={{ width: 12, height: 12 }} />
                Payments are processed on secure provider infrastructure. PlayBeat never sees or
                stores your card details.
              </p>
            </div>
          </div>

          {/* ================= RIGHT: sticky summary (desktop) ================= */}
          <aside className="hidden lg:block lg:sticky lg:top-24" aria-label="Order summary">
            <div className="pbx-card overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--pbx-border)' }}>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Order Summary</h2>
              </div>
              {itemsList(false)}
              {couponAndTotals}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed px-2">
              Currency: Pakistani Rupee (PKR / Rs). Digital delivery — no shipping fees.
            </p>
          </aside>
        </div>

        {/* ================= MOBILE summary (stacked) ================= */}
        <div className="lg:hidden mt-6" aria-label="Order summary">
          <div className="pbx-card overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--pbx-border)' }}>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Order Summary</h2>
            </div>
            {itemsList(true)}
            {couponAndTotals}
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed px-2">
            Currency: Pakistani Rupee (PKR / Rs). Digital delivery — no shipping fees.
          </p>
        </div>

        {/* ================= MOBILE sticky CTA (inside form → submits) ================= */}
        <div className="lg:hidden pbx-mobile-cta-bar" data-testid="mobile-cta-bar">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Final Total
              </div>
              <div className="text-lg font-extrabold pbx-num" style={{ color: 'var(--pbx-blue)' }}>
                {fmt(totals.total)}
              </div>
            </div>
            {totals.discount > 0 && (
              <div className="text-[11px] font-semibold text-green-600 text-right">
                Saving {fmt(totals.discount)}
                <br />
                <span className="text-slate-400 line-through pbx-num">{fmt(totals.subtotal)}</span>
              </div>
            )}
          </div>
          <CheckoutCTA
            id="checkout-submit-mobile-btn"
            amountLabel={fmt(totals.total)}
            disabled={ctaDisabled}
            loading={submitting}
            hosted={isRapid}
            hostedLabel="Pay {amount} Securely & Receive Keys"
            loadingLabel={isRapid ? 'Starting secure payment…' : 'Processing…'}
          />
          <div className="sr-only" aria-live="polite">
            Total due {fmt(totals.total)} for {itemCount} {itemCount === 1 ? 'item' : 'items'}.
          </div>
        </div>
      </form>
    </div>
  )
}
