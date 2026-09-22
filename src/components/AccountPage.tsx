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
  RefreshCw,
  ChevronRight,
  Inbox,
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
  customerEmail?: string
  items: { name: string; variantName?: string; price: number; quantity: number }[]
}

type DashboardState = 'loading' | 'ready' | 'error'

function fmtPrice(amount: number, currency = 'PKR') {
  const n = Number(amount) || 0
  return currency === 'PKR' ? `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}` : `${currency} ${n.toFixed(2)}`
}

// Canonical status chips (PENDING/PROCESSING/PAID/COMPLETED/FAILED/CANCELLED/REFUNDED)
// Light-theme pastel variants per the ProfileCraft reference.
function statusChip(order: any): { label: string; cls: string } {
  const s = String(order.status || '')
  const p = String(order.paymentStatus || '')
  if (p === 'paid' && (s === 'completed' || s === 'paid')) return { label: 'COMPLETED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (p === 'paid') return { label: 'PAID', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (s === 'payment_failed' || p === 'failed') return { label: 'FAILED', cls: 'bg-rose-50 text-rose-600 border-rose-200' }
  if (s === 'refunded' || p === 'refunded') return { label: 'REFUNDED', cls: 'bg-violet-50 text-violet-700 border-violet-200' }
  if (s === 'cancelled') return { label: 'CANCELLED', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  if (s === 'processing') return { label: 'PROCESSING', cls: 'bg-blue-50 text-blue-600 border-blue-200' }
  if (p === 'pending' || s === 'pending') return { label: 'PENDING', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: s.toUpperCase() || 'PENDING', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
}

/** Initials for the avatar disc (ProfileCraft round avatar). */
function initials(name: string): string {
  return (name || 'P')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'P'
}

/**
 * AccountPage (/account) — customer dashboard: profile, orders with payment
 * status, payment history and shortcuts. Data is strictly owner-scoped
 * (server filters by the signed-in user id).
 *
 * Visual language: ProfileCraft (light theme) — near-white canvas, dark hero
 * band with overlapping round avatar, white rounded cards, blue interactive
 * values, quiet gray metadata. Data flow and actions are unchanged.
 */
export const AccountPage: React.FC<AccountPageProps> = ({ user, onRequireAuth, onLogout, onNavigate }) => {
  const [state, setState] = useState<DashboardState>('loading')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [errMsg, setErrMsg] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const token = localStorage.getItem('playbeat_user_token')
    if (!token) {
      onRequireAuth()
      return
    }
    setRefreshing(true)
    try {
      const res = await fetch(`${API_BASE}/api/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setOrders(data.orders || [])
        setState('ready')
      } else if (res.status === 401) {
        // Stale/invalid token (e.g. signed in with a different account since
        // this session was stored) — self-heal: drop the dead credentials and
        // prompt sign-in instead of showing an empty or zeroed dashboard.
        localStorage.removeItem('playbeat_user_token')
        localStorage.removeItem('playbeat_user')
        onRequireAuth()
        return
      } else {
        setErrMsg(data?.error || 'Could not load your orders.')
        setState('error')
      }
    } catch {
      setErrMsg('Network error — please refresh.')
      setState('error')
    } finally {
      setRefreshing(false)
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
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-6">
        <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
      </div>
    )
  }

  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid' || (o.status === 'completed' && o.paymentStatus !== 'pending'))
  const totalSpent = paidOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)
  const userEmailLc = user.email.toLowerCase()

  const menuItems: { icon: React.ReactNode; label: string; value?: string; onClick: () => void; danger?: boolean }[] = [
    { icon: <ShoppingCart className="w-[18px] h-[18px]" />, label: 'Browse Store', value: 'Open', onClick: () => onNavigate('/streaming') },
    { icon: <CreditCard className="w-[18px] h-[18px]" />, label: 'Checkout', value: 'Cart', onClick: () => onNavigate('/storefront') },
    { icon: <MessageSquare className="w-[18px] h-[18px]" />, label: 'Help & Support', value: 'Chat', onClick: () => onNavigate('/contact') },
    { icon: <Headphones className="w-[18px] h-[18px]" />, label: 'Live Assistant', value: '24/7', onClick: () => onNavigate('/storefront') },
  ]

  return (
    <div className="pcraft-root min-h-screen bg-[#F4F5F7] font-sans">
      {/* ===== Dark hero band with overlapping avatar (ProfileCraft signature) ===== */}
      <div className="bg-[#17181C] pb-16 pt-8 px-4">
        <div className="max-w-2xl mx-auto" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-14 pb-14">
        {/* ===== Identity card ===== */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-900 select-none">{initials(user.name)}</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
          <h1 className="mt-3 text-xl font-extrabold text-[#17181C] tracking-tight">{user.name}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{user.email}</p>
          <button
            onClick={onLogout}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </div>

        {/* ===== Stats ===== */}
        <div className="grid grid-cols-3 gap-3 mt-7">
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] px-3 py-4 text-center">
            <div className="text-2xl font-extrabold text-[#17181C]">{orders.length}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">Orders</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] px-3 py-4 text-center">
            <div className="text-2xl font-extrabold text-blue-600">{paidOrders.length}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">Paid</div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] px-3 py-4 text-center">
            <div className="text-xl sm:text-2xl font-extrabold text-[#17181C] leading-8">{fmtPrice(totalSpent)}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">Total Spent</div>
          </div>
        </div>

        {/* ===== Orders ===== */}
        <div className="mt-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#17181C] flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" /> My Orders
            </h2>
            <button
              onClick={load}
              disabled={refreshing}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 disabled:opacity-60 transition"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {state === 'loading' && (
            <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
          )}
          {state === 'error' && (
            <div className="px-5 py-6 flex items-center gap-2 text-sm text-rose-600"><AlertCircle className="w-4 h-4" /> {errMsg}</div>
          )}
          {state === 'ready' && orders.length === 0 && (
            <div className="px-6 py-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed max-w-[300px] mx-auto">
                No orders yet — your purchases and license keys will appear here the moment you check out.
              </p>
              <button
                onClick={() => onNavigate('/streaming')}
                className="px-4 py-2 rounded-xl bg-[#17181C] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-black transition"
              >
                Browse Products <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {state === 'ready' && orders.length > 0 && (
            <div className="divide-y divide-slate-100">
              {orders.map((o) => {
                const chip = statusChip(o)
                const pending = chip.label === 'PENDING' || chip.label === 'FAILED'
                const emailMismatch = Boolean(o.customerEmail && userEmailLc && o.customerEmail.toLowerCase() !== userEmailLc)
                return (
                  <div key={o.orderNumber} className="px-5 py-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] font-bold text-[#17181C] font-mono truncate">{o.orderNumber}</span>
                        <button onClick={() => copy(o.orderNumber)} className="text-slate-300 hover:text-slate-500 transition" title="Copy">
                          {copied === o.orderNumber ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide ${chip.cls}`}>{chip.label}</span>
                      </div>
                      <span className="text-[13px] font-bold text-[#17181C]">{fmtPrice(o.totalAmount, o.currency)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                      <span>{new Date(o.createdAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span>{o.paymentMethod || '—'}</span>
                      {(o.gatewayTxnRef || o.rapidPaymentId) && <span className="truncate max-w-[200px]">ref {(o.gatewayTxnRef || o.rapidPaymentId || '').slice(0, 18)}</span>}
                    </div>
                    <div className="text-[12px] text-slate-600">
                      {(o.items || []).map((it, i) => (
                        <span key={i}>
                          {it.quantity}× {it.name}{it.variantName ? ` (${it.variantName})` : ''}
                          {i < (o.items.length || 0) - 1 ? ' · ' : ''}
                        </span>
                      ))}
                    </div>
                    {emailMismatch && (
                      <div className="text-[10px] text-slate-400 italic">placed for {o.customerEmail}</div>
                    )}
                    {pending && (
                      <button
                        onClick={() => onNavigate(`/order/${o.orderNumber}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500"
                      >
                        {chip.label === 'PENDING' ? 'Complete payment' : 'View & retry'} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ===== Payment history ===== */}
        {paidOrders.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#17181C] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" /> Payment History
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {paidOrders.map((o) => (
                <div key={o.orderNumber} className="px-5 py-3 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-[#17181C]">{o.orderNumber}</span>
                    <span className="text-slate-400 ml-2">· {o.paymentMethod || 'Rapid Gateway'}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400">
                      {new Date(o.paidAt || o.createdAt).toLocaleDateString('en', { dateStyle: 'medium' })}
                    </span>
                    <span className="font-bold text-emerald-600">{fmtPrice(o.totalAmount, o.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Quick menu (ProfileCraft menu-card) ===== */}
        <div className="mt-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {menuItems.map((m) => (
              <button
                key={m.label}
                onClick={m.onClick}
                className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50 transition"
              >
                <span className="text-slate-700">{m.icon}</span>
                <span className="text-[13px] font-semibold text-[#17181C] flex-1">{m.label}</span>
                <span className="text-xs font-semibold text-blue-600">{m.value}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
