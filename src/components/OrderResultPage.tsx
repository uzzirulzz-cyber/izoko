import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ArrowRight,
  ShoppingCart,
  CreditCard,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

interface OrderResultPageProps {
  orderNumber: string
  user: { name: string; email: string } | null
  onRequireAuth: () => void
  onNavigate: (path: string) => void
  onClearCart?: () => void
}

interface OrderView {
  orderNumber: string
  status: string
  paymentStatus: string
  totalAmount: number
  currency: string
  paymentMethod?: string
  customerName?: string
  items: { name: string; variantName?: string; price: number; quantity: number; licenseKeys?: string[] }[]
  gatewayTxnRef?: string
  rapidPaymentId?: string
  createdAt?: string
  licenseKeysDelivered?: string[]
}

type ResultState = 'success' | 'pending' | 'failed' | 'loading' | 'error'

function fmtPrice(amount: number, currency = 'PKR') {
  const n = Number(amount) || 0
  return currency === 'PKR' ? `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}` : `${currency} ${n.toFixed(2)}`
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'PENDING', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/30' },
  PROCESSING: { label: 'PROCESSING', cls: 'bg-sky-400/10 text-sky-300 border-sky-400/30' },
  PAID: { label: 'PAID', cls: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' },
  COMPLETED: { label: 'COMPLETED', cls: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' },
  FAILED: { label: 'FAILED', cls: 'bg-rose-400/10 text-rose-300 border-rose-400/30' },
  CANCELLED: { label: 'CANCELLED', cls: 'bg-slate-400/10 text-slate-300 border-slate-400/30' },
  REFUNDED: { label: 'REFUNDED', cls: 'bg-purple-400/10 text-purple-300 border-purple-400/30' },
}

/**
 * OrderResultPage (/order/:orderNumber) — the single landing point after the
 * Rapid Gateway hosted checkout redirects back. Payment truth comes ONLY from
 * the server (webhook-verified): the page polls the owner-scoped order
 * endpoint while payment is pending and renders success / pending / failed
 * states accordingly. The browser redirect itself is never trusted.
 */
export const OrderResultPage: React.FC<OrderResultPageProps> = ({
  orderNumber,
  user,
  onRequireAuth,
  onNavigate,
  onClearCart,
}) => {
  const [state, setState] = useState<ResultState>('loading')
  const [order, setOrder] = useState<OrderView | null>(null)
  const [errMsg, setErrMsg] = useState('')
  const [retrying, setRetrying] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const deriveState = (o: OrderView): ResultState => {
    if (o.paymentStatus === 'paid' || (o.status === 'completed' && o.paymentStatus !== 'pending')) return 'success'
    if (o.status === 'payment_failed' || o.paymentStatus === 'failed') return 'failed'
    if (o.status === 'refunded') return 'failed' // refunded orders land in the failed layout with refund copy
    return 'pending'
  }

  const load = useCallback(async () => {
    const token = localStorage.getItem('playbeat_user_token')
    if (!token) {
      setState('error')
      setErrMsg('Sign in to view this order.')
      return false
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/orders/mine/${encodeURIComponent(orderNumber)}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }
      )
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setState('error')
        setErrMsg(data?.error || 'Order not found.')
        return false
      }
      const o: OrderView = data.order
      setOrder(o)
      const derived = data.paid ? 'success' : deriveState(o)
      setState(derived)
      return derived === 'success'
    } catch {
      setState('error')
      setErrMsg('Could not reach the order service. Please refresh.')
      return false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber])

  // Poll while pending — the webhook usually lands within seconds of payment
  useEffect(() => {
    if (state !== 'pending') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(async () => {
      const done = await load()
      if (done && pollRef.current) clearInterval(pollRef.current)
    }, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [state, load])

  // When a checkout redirect lands here and payment is verified, drop the
  // already-checked-out cart once (flag guarantees we never wipe a NEW cart
  // if the customer revisits this order page later).
  useEffect(() => {
    if (state !== 'success' || !onClearCart) return
    try {
      const flag = sessionStorage.getItem('playbeat_pending_checkout_order')
      if (flag === orderNumber) {
        sessionStorage.removeItem('playbeat_pending_checkout_order')
        onClearCart()
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const retryPayment = async () => {
    setRetrying(true)
    try {
      const token = localStorage.getItem('playbeat_user_token')
      const res = await fetch(`${API_BASE}/api/payments/rapid/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ orderNumber }),
      })
      const data = await res.json()
      if (data?.success && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setErrMsg(data?.error || 'Could not restart the payment. Please try again.')
    } catch {
      setErrMsg('Network error while restarting the payment.')
    } finally {
      setRetrying(false)
    }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  // ---------- render ----------
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050814] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4 bg-[#0B1220] border border-slate-400/20 rounded-3xl p-8">
          <ShieldCheck className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-white font-bold">Sign in to view your order</h2>
          <p className="text-xs text-slate-400">Order {orderNumber} belongs to a customer account.</p>
          <button
            onClick={onRequireAuth}
            className="w-full py-2.5 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#050814] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  if (state === 'error' && !order) {
    return (
      <div className="min-h-screen bg-[#050814] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4 bg-[#0B1220] border border-rose-400/25 rounded-3xl p-8">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-white font-bold">Order unavailable</h2>
          <p className="text-xs text-slate-400">{errMsg}</p>
          <button
            onClick={() => onNavigate('/account')}
            className="w-full py-2.5 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs"
          >
            Go to My Account
          </button>
        </div>
      </div>
    )
  }

  const isSuccess = state === 'success'
  const isPending = state === 'pending'
  const isFailed = state === 'failed'
  const chip = STATUS_CHIP[String(order?.status || '').toUpperCase()]
  const allKeys = isSuccess
    ? [
        ...(order?.licenseKeysDelivered || []),
        ...(order?.items || []).flatMap((it) => it.licenseKeys || []),
      ]
    : []

  return (
    <div className="min-h-screen bg-[#050814] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Status hero */}
        <div
          className={`rounded-3xl border p-8 text-center ${
            isSuccess
              ? 'bg-emerald-400/5 border-emerald-400/30'
              : isPending
                ? 'bg-amber-400/5 border-amber-400/30'
                : 'bg-rose-400/5 border-rose-400/30'
          }`}
        >
          {isSuccess && <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />}
          {isPending && <Clock className="w-14 h-14 text-amber-400 mx-auto mb-3 animate-pulse" />}
          {isFailed && <XCircle className="w-14 h-14 text-rose-400 mx-auto mb-3" />}

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isSuccess && 'Payment successful'}
            {isPending && 'Payment pending'}
            {isFailed &&
              (order?.status === 'refunded' ? 'Order refunded' : 'Payment failed')}
          </h1>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            {isSuccess &&
              'Your payment was verified and confirmed. Digital license keys are shown below and were emailed to you.'}
            {isPending &&
              'We have not received the payment confirmation yet. This page updates automatically — if you completed the payment, it will turn green within a minute. Do not pay twice.'}
            {isFailed &&
              (order?.status === 'refunded'
                ? 'This order was refunded. Contact support if you have questions.'
                : 'The payment did not go through or was declined. You can safely retry — your cart items are preserved in this order.')}
          </p>

          {/* Order number */}
          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#060B1E] border border-slate-400/20">
            <span className="text-[10px] font-mono uppercase text-slate-500">Order</span>
            <span className="text-sm font-bold text-amber-300 font-mono">{order?.orderNumber || orderNumber}</span>
            <button onClick={() => copy(order?.orderNumber || orderNumber)} className="text-slate-400 hover:text-white" title="Copy">
              {copied === order?.orderNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {order && chip && (
            <div className={`mt-3 inline-block px-3 py-1 rounded-full border text-[10px] font-mono font-bold ${chip.cls}`}>
              {chip.label}
            </div>
          )}
        </div>

        {/* Pending helper */}
        {isPending && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-center justify-between">
            <div className="text-[11px] text-amber-200/90">
              Checking every 5 seconds… make sure you completed the payment in the gateway window.
            </div>
            <button
              onClick={() => load()}
              className="shrink-0 ml-3 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-200 text-[10px] font-bold flex items-center gap-1.5 hover:bg-amber-400/25 transition"
            >
              <RefreshCw className="w-3 h-3" /> Check now
            </button>
          </div>
        )}

        {/* Order summary */}
        <div className="rounded-3xl bg-[#0B1220] border border-slate-400/15 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-400/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Order Summary</h3>
            <span className="text-[10px] font-mono text-slate-500">{order?.paymentMethod || 'Rapid Gateway'}</span>
          </div>
          <div className="divide-y divide-slate-400/10">
            {(order?.items || []).map((it, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{it.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {it.variantName ? `${it.variantName} · ` : ''}Qty {it.quantity} · {fmtPrice(it.price, order?.currency)}
                  </div>
                </div>
                <div className="text-xs font-bold text-amber-300 shrink-0">
                  {fmtPrice(it.price * it.quantity, order?.currency)}
                </div>
              </div>
            ))}
            <div className="px-5 py-3.5 flex items-center justify-between bg-[#060B1E]">
              <span className="text-xs font-bold text-white">Total paid</span>
              <span className="text-base font-extrabold text-amber-300">
                {fmtPrice(order?.totalAmount || 0, order?.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* License keys (only after verified payment) */}
        {isSuccess && allKeys.length > 0 && (
          <div className="rounded-3xl bg-[#0B1220] border border-emerald-400/20 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-400/10">
              <h3 className="text-sm font-bold text-white">Your License Keys</h3>
            </div>
            <div className="p-4 space-y-2">
              {allKeys.map((k, i) => (
                <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15">
                  <code className="text-[11px] text-emerald-300 font-mono break-all">{k}</code>
                  <button onClick={() => copy(k)} className="shrink-0 text-slate-400 hover:text-white" title="Copy key">
                    {copied === k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment reference */}
        {(order?.gatewayTxnRef || order?.rapidPaymentId) && (
          <div className="px-5 py-3 rounded-2xl bg-[#0B1220] border border-slate-400/15 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-500">Payment reference</span>
            <span className="text-[11px] font-mono text-slate-300 break-all max-w-[60%] text-right">
              {order?.gatewayTxnRef || order?.rapidPaymentId}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pb-6">
          {isFailed && order?.status !== 'refunded' && (
            <button
              onClick={retryPayment}
              disabled={retrying}
              className="flex-1 min-w-[180px] py-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Retry Payment
            </button>
          )}
          {isPending && (
            <button
              onClick={retryPayment}
              disabled={retrying}
              className="flex-1 min-w-[180px] py-3 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <CreditCard className="w-4 h-4" /> Try another payment method
            </button>
          )}
          <button
            onClick={() => onNavigate('/account')}
            className="flex-1 min-w-[150px] py-3 rounded-xl bg-[#0B1220] border border-slate-400/20 text-white font-bold text-xs flex items-center justify-center gap-2 hover:border-amber-400/40 transition"
          >
            My Orders <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('/storefront')}
            className="flex-1 min-w-[150px] py-3 rounded-xl bg-[#0B1220] border border-slate-400/20 text-white font-bold text-xs flex items-center justify-center gap-2 hover:border-amber-400/40 transition"
          >
            <ShoppingCart className="w-4 h-4" /> Continue Shopping
          </button>
        </div>

        {errMsg && state !== 'error' && (
          <div className="text-center text-[11px] text-rose-300 pb-4">{errMsg}</div>
        )}
      </div>
    </div>
  )
}
