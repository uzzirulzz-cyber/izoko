import React, { useState, useEffect, useCallback } from 'react'
import {
  User,
  Package,
  CreditCard,
  LogOut,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  ShoppingCart,
  MessageSquare,
  AlertCircle,
  Headphones,
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

interface AccountPageProps {
  user: { name: string; email: string } | null
  onRequireAuth: () => void
  onLogout: () => void
  onNavigate: (path: string) => void
}

interface OrderRow {
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod?: string
  totalAmount: number
  currency: string
  createdAt: string
  paidAt?: string
  gatewayTxnRef?: string
  rapidPaymentId?: string
  items: { name: string; variantName?: string; price: number; quantity: number }[]
}

type DashboardState = 'loading' | 'ready' | 'error'

function fmtPrice(amount: number, currency = 'PKR') {
  const n = Number(amount) || 0
  return currency === 'PKR' ? `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}` : `${currency} ${n.toFixed(2)}`
}

// Canonical status chips (PENDING/PROCESSING/PAID/COMPLETED/FAILED/CANCELLED/REFUNDED)
function statusChip(order: any): { label: string; cls: string } {
  const s = String(order.status || '')
  const p = String(order.paymentStatus || '')
  if (p === 'paid' && (s === 'completed' || s === 'paid')) return { label: 'COMPLETED', cls: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' }
  if (p === 'paid') return { label: 'PAID', cls: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30' }
  if (s === 'payment_failed' || p === 'failed') return { label: 'FAILED', cls: 'bg-rose-400/10 text-rose-300 border-rose-400/30' }
  if (s === 'refunded' || p === 'refunded') return { label: 'REFUNDED', cls: 'bg-purple-400/10 text-purple-300 border-purple-400/30' }
  if (s === 'cancelled') return { label: 'CANCELLED', cls: 'bg-slate-400/10 text-slate-300 border-slate-400/30' }
  if (s === 'processing') return { label: 'PROCESSING', cls: 'bg-sky-400/10 text-sky-300 border-sky-400/30' }
  if (p === 'pending' || s === 'pending') return { label: 'PENDING', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/30' }
  return { label: s.toUpperCase() || 'PENDING', cls: 'bg-amber-400/10 text-amber-300 border-amber-400/30' }
}

/**
 * AccountPage (/account) — customer dashboard: profile, orders with payment
 * status, payment history and shortcuts. Data is strictly owner-scoped
 * (server filters by the signed-in user id).
 */
export const AccountPage: React.FC<AccountPageProps> = ({ user, onRequireAuth, onLogout, onNavigate }) => {
  const [state, setState] = useState<DashboardState>('loading')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [errMsg, setErrMsg] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = localStorage.getItem('playbeat_user_token')
    if (!token) {
      onRequireAuth()
      return
    }
    setState('loading')
    try {
      const res = await fetch(`${API_BASE}/api/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setOrders(data.orders || [])
        setState('ready')
      } else {
        setErrMsg(data?.error || 'Could not load your orders.')
        setState('error')
      }
    } catch {
      setErrMsg('Network error — please refresh.')
      setState('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const copy = (t: string) => {
    navigator.clipboard.writeText(t)
    setCopied(t)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050814] flex items-center justify-center p-6">
        <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
      </div>
    )
  }

  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid' || (o.status === 'completed' && o.paymentStatus !== 'pending'))
  const totalSpent = paidOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)

  return (
    <div className="min-h-screen bg-[#050814] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Profile header */}
        <div className="rounded-3xl bg-[#0B1220] border border-slate-400/15 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl btn-gold-gradient flex items-center justify-center">
              <User className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white">{user.name}</h1>
              <p className="text-xs text-slate-400 font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl border border-rose-400/30 bg-rose-400/5 text-rose-300 text-xs font-bold flex items-center gap-2 hover:bg-rose-400/10 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[#0B1220] border border-slate-400/15 p-4 text-center">
            <div className="text-2xl font-extrabold text-white">{orders.length}</div>
            <div className="text-[10px] font-mono uppercase text-slate-500 mt-1">Orders</div>
          </div>
          <div className="rounded-2xl bg-[#0B1220] border border-slate-400/15 p-4 text-center">
            <div className="text-2xl font-extrabold text-emerald-300">{paidOrders.length}</div>
            <div className="text-[10px] font-mono uppercase text-slate-500 mt-1">Paid</div>
          </div>
          <div className="rounded-2xl bg-[#0B1220] border border-slate-400/15 p-4 text-center">
            <div className="text-2xl font-extrabold text-amber-300">{fmtPrice(totalSpent)}</div>
            <div className="text-[10px] font-mono uppercase text-slate-500 mt-1">Total Spent</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => onNavigate('/streaming')} className="rounded-2xl bg-[#0B1220] border border-slate-400/15 p-4 flex flex-col items-center gap-2 hover:border-amber-400/40 transition">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] font-semibold text-white">Browse Store</span>
          </button>
          <button onClick={() => onNavigate('/storefront')} className="rounded-2xl bg-[#0B1220] border border-slate-400/15 p-4 flex flex-col items-center gap-2 hover:border-amber-400/40 transition">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] font-semibold text-white">Checkout</span>
          </button>
          <button onClick={() => onNavigate('/contact')} className="rounded-2xl bg-[#0B1220] border border-slate-400/15 p-4 flex flex-col items-center gap-2 hover:border-amber-400/40 transition">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] font-semibold text-white">Support</span>
          </button>
          <button onClick={() => onNavigate('/storefront')} className="rounded-2xl bg-[#0B1220] border border-slate-400/15 p-4 flex flex-col items-center gap-2 hover:border-amber-400/40 transition">
            <Headphones className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] font-semibold text-white">Assistant</span>
          </button>
        </div>

        {/* Orders */}
        <div className="rounded-3xl bg-[#0B1220] border border-slate-400/15 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-400/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" /> My Orders
            </h2>
            <button onClick={load} className="text-[10px] font-mono text-slate-400 hover:text-white transition">REFRESH</button>
          </div>

          {state === 'loading' && (
            <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
          )}
          {state === 'error' && (
            <div className="p-6 flex items-center gap-2 text-xs text-rose-300"><AlertCircle className="w-4 h-4" /> {errMsg}</div>
          )}
          {state === 'ready' && orders.length === 0 && (
            <div className="p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No orders yet — your purchases and license keys will appear here.</p>
              <button onClick={() => onNavigate('/streaming')} className="px-4 py-2 rounded-xl btn-gold-gradient text-slate-950 text-xs font-bold inline-flex items-center gap-1.5">
                Browse Products <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {state === 'ready' && orders.length > 0 && (
            <div className="divide-y divide-slate-400/10">
              {orders.map((o) => {
                const chip = statusChip(o)
                const pending = chip.label === 'PENDING' || chip.label === 'FAILED'
                return (
                  <div key={o.orderNumber} className="px-5 py-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 font-mono">{o.orderNumber}</span>
                        <button onClick={() => copy(o.orderNumber)} className="text-slate-500 hover:text-white" title="Copy">
                          {copied === o.orderNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold ${chip.cls}`}>{chip.label}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{fmtPrice(o.totalAmount, o.currency)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-3">
                      <span>{new Date(o.createdAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span>{o.paymentMethod || '—'}</span>
                      {(o.gatewayTxnRef || o.rapidPaymentId) && <span className="truncate max-w-[200px]">ref {(o.gatewayTxnRef || o.rapidPaymentId || '').slice(0, 18)}</span>}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {(o.items || []).map((it, i) => (
                        <span key={i}>
                          {it.quantity}× {it.name}{it.variantName ? ` (${it.variantName})` : ''}
                          {i < (o.items.length || 0) - 1 ? ' · ' : ''}
                        </span>
                      ))}
                    </div>
                    {pending && (
                      <button
                        onClick={() => onNavigate(`/order/${o.orderNumber}`)}
                        className="text-[10px] font-bold text-amber-300 hover:text-amber-200 font-mono"
                      >
                        {chip.label === 'PENDING' ? 'COMPLETE PAYMENT →' : 'VIEW & RETRY →'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Payment history */}
        {paidOrders.length > 0 && (
          <div className="rounded-3xl bg-[#0B1220] border border-slate-400/15 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-400/10">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" /> Payment History
              </h2>
            </div>
            <div className="divide-y divide-slate-400/10">
              {paidOrders.map((o) => (
                <div key={o.orderNumber} className="px-5 py-3 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-mono text-slate-300">{o.orderNumber}</span>
                    <span className="text-slate-500 ml-2">· {o.paymentMethod || 'Rapid Gateway'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono">
                      {new Date(o.paidAt || o.createdAt).toLocaleDateString('en', { dateStyle: 'medium' })}
                    </span>
                    <span className="font-bold text-emerald-300">{fmtPrice(o.totalAmount, o.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}
