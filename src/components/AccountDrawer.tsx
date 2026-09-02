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

          {activeTab === 'messages' && <MessagesTab user={user} />}

          {(activeTab === 'profile' || activeTab === 'orders' || activeTab === 'settings') && (
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
