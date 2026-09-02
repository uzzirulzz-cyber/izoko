import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  X,
  User,
  ShoppingBag,
  CreditCard,
  FolderLock,
  Heart,
  Settings,
  LogOut,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Send,
  AlertCircle,
  RefreshCw,
  Truck,
} from 'lucide-react'
import { CurrencyCode, Product } from '../types'
import { formatPrice } from '../lib/currency'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

interface AccountDrawerProps {
  isOpen: boolean
  onClose: () => void
  activeTab: 'profile' | 'orders' | 'subscriptions' | 'library' | 'messages' | 'wishlist' | 'settings'
  onSelectTab: (tab: any) => void
  user: { name: string; email: string }
  currency: CurrencyCode
  onSignOut: () => void
  onOpenWishlist: () => void
}

interface AccountChatMsg {
  id: string
  senderType: 'customer' | 'staff' | 'system'
  senderName: string
  body: string
  createdAt: string
}

/**
 * Orders tab — real order tracking from /api/orders/me.
 * Shows every order with a status timeline (placed → paid → fulfilled),
 * payment status badge, line items, license keys (re-copyable) and delivery
 * method. Supports manual refresh and handles empty/error states.
 */
interface OrderItem {
  name: string
  variantName?: string
  price: number
  quantity: number
  licenseKeys?: string[]
  deliveryType?: string
}

interface PlaybeatOrder {
  orderNumber: string
  items: OrderItem[]
  totalAmount: number
  currency: string
  status: string
  paymentStatus?: string
  paymentMethod?: string
  createdAt: string
  paidAt?: string
}

function orderTimeline(order: PlaybeatOrder): { label: string; done: boolean; note?: string }[] {
  const placed = { label: 'Order Placed', done: true, note: new Date(order.createdAt).toLocaleDateString() }
  const paidDone = order.status === 'completed' || order.paymentStatus === 'paid' || !!order.paidAt
  const paid = {
    label: 'Payment Verified',
    done: paidDone,
    note:
      order.paymentStatus === 'failed' || order.status === 'payment_failed'
        ? 'Payment failed — retry or contact support'
        : order.paidAt
          ? new Date(order.paidAt).toLocaleDateString()
          : order.status === 'refunded'
            ? 'Refunded'
            : paidDone
              ? 'Confirmed by gateway/webhook'
              : 'Awaiting confirmation',
  }
  const failed = order.status === 'payment_failed'
  const refunded = order.status === 'refunded'
  const fulfil = {
    label: order.items?.some((i) => i.deliveryType && /courier|shipped/i.test(i.deliveryType))
      ? 'Dispatch / Delivery'
      : 'Keys Delivered',
    done: order.status === 'completed' && !failed && !refunded,
    note: refunded ? 'Order refunded' : failed ? 'Held — payment not verified' : undefined,
  }
  return [placed, paid, fulfil]
}

const OrdersTab: React.FC<{
  user: { name: string; email: string }
  currency: CurrencyCode
  onBrowse: () => void
}> = ({ currency, onBrowse }) => {
  const [orders, setOrders] = useState<PlaybeatOrder[] | null>(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      const token = localStorage.getItem('playbeat_user_token')
      const res = await fetch(`${API_BASE}/api/orders/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setError(data?.error || `Could not load orders (${res.status}).`)
        setOrders([])
      } else {
        setOrders(Array.isArray(data.orders) ? data.orders : [])
      }
    } catch {
      setError('Network error — could not reach the order service.')
      setOrders([])
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const statusBadge = (o: PlaybeatOrder) => {
    if (o.status === 'refunded')
      return { label: 'Refunded', cls: 'text-slate-300 bg-slate-500/10 border-slate-400/30' }
    if (o.status === 'payment_failed')
      return { label: 'Payment Failed', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30' }
    return { label: 'Completed', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' }
  }

  if (error && !orders?.length) {
    return (
      <div className="space-y-3">
        <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/25 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-white/5 border border-slate-400/20 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!orders) {
    return (
      <div className="space-y-3" aria-label="Loading orders">
        {[0, 1].map((i) => (
          <div key={i} className="p-4 rounded-2xl bg-[#070D22] border border-slate-400/10 animate-pulse space-y-2.5">
            <div className="h-3 w-2/5 bg-slate-400/15 rounded" />
            <div className="h-2.5 w-3/5 bg-slate-400/10 rounded" />
            <div className="h-2.5 w-1/4 bg-slate-400/10 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#070D22] border border-slate-400/15 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-yellow-400" />
        </div>
        <h4 className="text-sm font-bold text-white">No orders yet</h4>
        <p className="text-xs text-slate-400 leading-relaxed max-w-[260px] mx-auto">
          Your digital keys, subscriptions and projector orders will appear here the moment you
          check out — with live status tracking.
        </p>
        <button
          onClick={onBrowse}
          className="px-4 py-2 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs transition"
        >
          Browse Products
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
          Order Tracking
        </h4>
        <button
          id="orders-refresh-btn"
          onClick={load}
          disabled={refreshing}
          className="text-[10px] font-mono text-yellow-400 hover:text-yellow-300 disabled:opacity-50 flex items-center gap-1 transition"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {orders.map((o) => {
        const badge = statusBadge(o)
        const timeline = orderTimeline(o)
        return (
          <div key={o.orderNumber} className="p-4 rounded-2xl bg-[#070D22] border border-slate-400/15 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono font-bold text-xs text-white truncate">
                  #{o.orderNumber}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {new Date(o.createdAt).toLocaleString()} · {o.paymentMethod || 'Paid'}
                </div>
              </div>
              <span className={`shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${badge.cls}`}>
                {badge.label}
              </span>
            </div>

            {/* Status timeline */}
            <div className="flex items-center gap-1.5 py-1">
              {timeline.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border text-[8px] font-mono font-bold ${
                        step.done
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-500/10 border-slate-400/25 text-slate-500'
                      }`}
                    >
                      {step.done ? '✓' : i + 1}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase tracking-wide truncate ${
                        step.done ? 'text-slate-200' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < timeline.length - 1 && (
                    <span
                      className={`flex-1 h-px min-w-[8px] ${
                        step.done ? 'bg-emerald-500/40' : 'bg-slate-400/15'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            {timeline.some((s) => s.note) && (
              <div className="text-[10px] text-slate-400 font-mono">
                {timeline.find((s) => s.note)?.note}
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              {(o.items || []).map((it, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#040816] border border-slate-400/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-200 truncate">
                      {it.name}
                      {it.variantName ? ` (${it.variantName})` : ''}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      ×{it.quantity} · {formatPrice(it.price, currency)}
                    </span>
                  </div>
                  {it.licenseKeys?.map((k) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#070D22] border border-yellow-400/20"
                    >
                      <code className="text-[10px] font-mono text-yellow-300 select-all truncate">{k}</code>
                      <button
                        onClick={() => copyKey(k)}
                        className="text-slate-400 hover:text-white p-0.5 transition shrink-0"
                        title="Copy key"
                      >
                        {copiedKey === k ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                  {it.deliveryType && /courier|shipped/i.test(it.deliveryType) && (
                    <div className="text-[10px] text-sky-300 font-mono flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {it.deliveryType} — tracking sent by SMS & email
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-400/10">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Total</span>
              <span className="text-sm font-extrabold font-mono text-yellow-300">
                {formatPrice(o.totalAmount, currency)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Messages tab — the customer's direct message thread with the PlayBeat team.
 * Same conversation as the storefront Live Support widget (staff reply from the
 * admin Message Box); polls every 6 seconds while visible.
 */
const MessagesTab: React.FC<{ user: { name: string; email: string } }> = ({ user }) => {
  const [conversationId, setConversationId] = useState(() => localStorage.getItem('playbeat_chat_conversation') || '')
  const [messages, setMessages] = useState<AccountChatMsg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visitorId] = useState(() => {
    let v = localStorage.getItem('playbeat_visitor_id')
    if (!v) {
      v = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('playbeat_visitor_id', v)
    }
    return v
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  const poll = useCallback(async () => {
    if (!conversationId) return
    try {
      const qs = new URLSearchParams({ conversationId, visitorId, email: user.email })
      const res = await fetch(`${API_BASE}/api/messages/mine?${qs.toString()}`, { credentials: 'include' })
      const data = await res.json()
      if (data?.success && Array.isArray(data.messages)) {
        setMessages(data.messages)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      }
    } catch {
      /* silent */
    }
  }, [conversationId, visitorId, user.email])

  useEffect(() => {
    poll()
    const t = setInterval(poll, 6000)
    return () => clearInterval(t)
  }, [poll])

  const send = async () => {
    const text = draft.trim()
    if (!text || !conversationId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/messages/mine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ conversationId, body: text, visitorId, email: user.email }),
      })
      const data = await res.json()
      if (data?.success) {
        setDraft('')
        poll()
      } else {
        setError(data?.error || 'Message failed to send.')
      }
    } catch {
      setError('Network error — message not sent.')
    } finally {
      setBusy(false)
    }
  }

  if (!conversationId) {
    return (
      <div className="p-6 rounded-2xl bg-[#070D22] border border-slate-400/15 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0A122E] border border-amber-400/25 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-sm font-bold text-white">No conversations yet</div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Open the Live Support chat bubble (bottom-right) to message the PlayBeat team.
          Your conversations will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
        Messages — PlayBeat Support
      </h4>
      <div className="rounded-2xl bg-[#070D22] border border-slate-400/15 p-3 space-y-2.5 max-h-[50vh] overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-[11px] text-slate-500 text-center py-4">Loading conversation…</div>
        )}
        {messages.map((m) => {
          const mine = m.senderType === 'customer'
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                  mine
                    ? 'bg-[#FFC107] text-slate-950 font-medium rounded-br-md'
                    : 'bg-[#0A122E] border border-slate-400/15 text-slate-100 rounded-bl-md'
                }`}
              >
                {!mine && (
                  <div className="text-[9px] font-mono text-amber-300/90 mb-0.5 uppercase tracking-wider">
                    {m.senderName || 'PlayBeat Team'}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`text-[8px] mt-0.5 font-mono ${mine ? 'text-slate-800/70' : 'text-slate-500'}`}>
                  {new Date(m.createdAt).toLocaleString('en', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {error && <div className="text-[10px] text-rose-300 font-mono">{error}</div>}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder="Reply to the PlayBeat team…"
          className="flex-1 resize-none px-3 py-2.5 rounded-xl bg-[#0A122E] border border-slate-400/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 max-h-24"
        />
        <button
          onClick={send}
          disabled={busy || !draft.trim()}
          className="w-10 h-10 rounded-xl btn-gold-gradient text-slate-950 flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export const AccountDrawer: React.FC<AccountDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  user,
  currency,
  onSignOut,
  onOpenWishlist,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // Simulated active user library with verified keys
  const sampleDigitalKeys = [
    {
      product: 'PlayStation Gift Card $50 (USA)',
      code: 'PB-PSN-8942-XQ91-MKL8',
      date: '2026-08-25',
      status: 'Active',
    },
    {
      product: 'Netflix Premium 1 Month',
      code: 'NETFLIX-VIP-ACC: playbeat_usr92@stream.vip | PIN: 4821',
      date: '2026-08-20',
      status: 'Active',
    },
    {
      product: 'Windows 11 Professional Lifetime',
      code: 'W269N-WFGWX-YVC9B-4J6C9-T83GX',
      date: '2026-08-15',
      status: 'Activated',
    },
  ]

  const sampleSubscriptions = [
    {
      name: 'ChatGPT Plus Premium',
      status: 'Active Auto-Renew',
      nextBilling: '2026-09-25',
      plan: '1 Month Access',
      cost: 7800,
    },
    {
      name: 'Spotify Premium Individual',
      status: 'Active',
      nextBilling: '2026-11-20',
      plan: '3 Months Pass',
      cost: 2499,
    },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0B1220] border-l border-slate-400/15 h-full flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-400/15 flex items-center justify-between bg-[#080E1C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#122254] to-[#0A1128] border border-yellow-400/40 flex items-center justify-center text-yellow-400 font-bold font-mono text-base shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{user.name}</h3>
              <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Nav Links */}
        <div className="flex items-center px-4 py-2 border-b border-slate-400/10 bg-[#060B1E] overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'library', label: 'Digital Library', icon: FolderLock },
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition font-medium ${
                  isSelected
                    ? 'bg-yellow-400/15 text-yellow-300 font-semibold border border-yellow-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'library' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Instant License Keys & Credentials
                </h4>
                <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                  Verified
                </span>
              </div>

              {sampleDigitalKeys.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#070D22] border border-slate-400/15 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{item.product}</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                      {item.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#040816] border border-yellow-400/25 flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-yellow-300 select-all truncate">
                      {item.code}
                    </code>
                    <button
                      onClick={() => handleCopy(item.code)}
                      className="p-1.5 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 transition shrink-0"
                      title="Copy Key"
                    >
                      {copiedKey === item.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">Issued on: {item.date}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Active Subscriptions
              </h4>
              {sampleSubscriptions.map((sub, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#070D22] border border-slate-400/15 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-white">{sub.name}</h5>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Plan: {sub.plan}</span>
                    <span className="text-white font-bold">{formatPrice(sub.cost, currency)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Next billing cycle: {sub.nextBilling}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              user={user}
              currency={currency}
              onBrowse={() => {
                onClose()
                setTimeout(() => {
                  document.getElementById('popular-products-section')?.scrollIntoView({ behavior: 'smooth' })
                }, 120)
              }}
            />
          )}

          {activeTab === 'messages' && <MessagesTab user={user} />}

          {(activeTab === 'profile' || activeTab === 'settings') && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#070D22] border border-slate-400/15 space-y-3">
                <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                  Member Details
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Name:</span>
                    <span className="text-white font-medium">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Email:</span>
                    <span className="text-white font-medium truncate block">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Membership:</span>
                    <span className="text-yellow-400 font-mono font-bold">VIP Early Access</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Currency:</span>
                    <span className="text-white font-mono">{currency}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#070D22] border border-slate-400/15 space-y-2 text-xs">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>PlayBeat Security Guarantee</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed font-sans">
                  All digital licenses purchased from PlayBeat are protected by automated 24/7 key verification and full refund warranty.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Sign Out */}
        <div className="p-4 border-t border-slate-400/15 bg-[#080E1C] flex items-center justify-between">
          <button
            onClick={() => {
              onClose()
              onOpenWishlist()
            }}
            className="flex items-center gap-2 text-xs text-slate-300 hover:text-white"
          >
            <Heart className="w-4 h-4 text-rose-400" />
            <span>View Wishlist</span>
          </button>

          <button
            onClick={() => {
              onSignOut()
              onClose()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
