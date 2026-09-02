import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  Inbox,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  UserPlus,
  Headphones,
  X,
} from 'lucide-react'

interface MessageBoxPanelProps {
  adminStaff: any[]
  adminName: string
  onToast: (msg: string) => void
}

interface Conversation {
  id: string
  type: 'live_support' | 'staff_dm'
  status: 'open' | 'pending' | 'closed'
  subject: string
  customer: { name?: string; email?: string; userId?: string | null } | null
  staff: { name?: string; email?: string } | null
  participants: { email?: string; name?: string; kind?: string }[]
  lastMessage: { body: string; senderType: string; at: string } | null
  unreadForStaff: number
  unreadForCustomer: number
  updatedAt: string
}

interface ThreadMsg {
  id: string
  senderType: 'customer' | 'staff' | 'system'
  senderName: string
  senderEmail?: string | null
  body: string
  createdAt: string
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

/**
 * MessageBoxPanel — the admin Message Box.
 * LIVE SUPPORT tab: every storefront chat, view / read / reply / resolve.
 * STAFF DM tab: direct messages between employee accounts.
 */
export const MessageBoxPanel: React.FC<MessageBoxPanelProps> = ({ adminStaff, adminName, onToast }) => {
  const [tab, setTab] = useState<'live' | 'staff'>('live')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [counts, setCounts] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [thread, setThread] = useState<ThreadMsg[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewDm, setShowNewDm] = useState(false)
  const [dmTarget, setDmTarget] = useState('')
  const [dmText, setDmText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const qs = tab === 'live' ? '?type=live_support' : '?type=staff_dm'
      const res = await fetch(`${API_BASE}/api/messages/conversations${qs}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setConversations(data.conversations || [])
        if (data.counts) setCounts(data.counts)
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Poll the inbox every 30s
  useEffect(() => {
    const t = setInterval(fetchConversations, 30000)
    return () => clearInterval(t)
  }, [fetchConversations])

  const openThread = async (conv: Conversation) => {
    setActiveConv(conv)
    setThreadLoading(true)
    setReply('')
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${conv.id}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setThread(data.messages || [])
        setActiveConv(data.conversation || conv)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
        fetchConversations()
      }
    } catch {
      /* silent */
    } finally {
      setThreadLoading(false)
    }
  }

  // Poll the open thread every 8s so staff see customer replies live
  useEffect(() => {
    if (!activeConv) return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/messages/conversations/${activeConv.id}`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (data?.success) {
          setThread((prev) => {
            const next = data.messages || []
            return next.length !== prev.length ? next : prev
          })
        }
      } catch {
        /* silent */
      }
    }, 8000)
    return () => clearInterval(t)
  }, [activeConv])

  const sendReply = async () => {
    const text = reply.trim()
    if (!text || !activeConv) return
    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${activeConv.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json()
      if (data?.success) {
        setReply('')
        const refreshed = await fetch(`${API_BASE}/api/messages/conversations/${activeConv.id}`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const rdata = await refreshed.json()
        if (rdata?.success) {
          setThread(rdata.messages || [])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
        }
        fetchConversations()
      } else {
        onToast(data?.error || 'Reply failed')
      }
    } catch {
      onToast('Network error while sending reply')
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (conv: Conversation, status: 'open' | 'pending' | 'closed') => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${conv.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ status, staffName: adminName }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(`Marked ${status}`)
        setActiveConv((c) => (c && c.id === conv.id ? { ...c, status } : c))
        fetchConversations()
      } else {
        onToast(data?.error || 'Update failed')
      }
    } catch {
      onToast('Network error while updating status')
    }
  }

  const sendNewDm = async () => {
    const text = dmText.trim()
    if (!dmTarget || !text) {
      onToast('Pick a recipient and write a message.')
      return
    }
    const target = adminStaff.find((s) => s.email === dmTarget)
    try {
      const res = await fetch(`${API_BASE}/api/messages/staff-dm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ toEmail: dmTarget, toName: target?.name || dmTarget, body: text }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(`Direct message sent to ${target?.name || dmTarget}`)
        setDmText('')
        setShowNewDm(false)
        fetchConversations()
        if (data.conversation) openThread(data.conversation)
      } else {
        onToast(data?.error || 'Failed to send DM')
      }
    } catch {
      onToast('Network error while sending DM')
    }
  }

  const convTitle = (c: Conversation) => {
    if (c.type === 'staff_dm') {
      const other = (c.participants || []).find((p) => p.kind === 'staff')
      return other?.name || other?.email || 'Staff member'
    }
    return c.customer?.name || c.customer?.email || 'Customer'
  }

  const convSub = (c: Conversation) => {
    if (c.type === 'staff_dm') {
      const other = (c.participants || []).find((p) => p.kind === 'staff')
      return other?.email || ''
    }
    return c.customer?.email || ''
  }

  const filtered = conversations.filter((c) => {
    if (tab === 'live' && statusFilter !== 'all' && (c.status || 'open') !== statusFilter) return false
    if (search.trim()) {
      const hay = `${convTitle(c)} ${convSub(c)} ${c.lastMessage?.body || ''}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  const statusChip = (status: string) =>
    status === 'closed' ? (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-400/10 text-zinc-400 border border-zinc-400/20 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Closed
      </span>
    ) : status === 'pending' ? (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pending
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> Open
      </span>
    )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="pa-viewchip pa-chip--purple">
            <MessagesSquare className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Message Box</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live customer chats from the storefront and direct messages between staff — view, read, reply.
            </p>
          </div>
        </div>
        <button
          onClick={fetchConversations}
          className="pa-iconbtn px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Unread Messages', value: counts?.unread ?? '—', tint: '#fb7185' },
          { label: 'Open Chats', value: counts?.open ?? '—', tint: '#34d399' },
          { label: 'Live Support Threads', value: counts?.live ?? '—', tint: '#a5b4fc' },
          { label: 'Staff DM Threads', value: counts?.staffDm ?? '—', tint: '#fbbf24' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="pa-kpi"
            style={
              {
                '--kpi-rail': kpi.tint,
                '--kpi-tint': `${kpi.tint}1a`,
                '--kpi-edge': `${kpi.tint}38`,
                '--kpi-glow': `${kpi.tint}4d`,
              } as React.CSSProperties
            }
          >
            <div className="pl-2">
              <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1.5">{kpi.label}</div>
              <div className="text-2xl font-black text-white font-mono leading-none">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs: Live Support | Staff DM */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setTab('live'); setActiveConv(null) }}
          className={`px-4 py-2 rounded-xl text-[11px] font-mono font-semibold flex items-center gap-1.5 transition ${
            tab === 'live' ? 'pa-btn-gold' : 'pa-well text-zinc-400 hover:text-white'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" /> LIVE SUPPORT
          {counts?.unread > 0 && tab !== 'staff' && (
            <span className="ml-1 px-1.5 rounded-full bg-rose-500/25 text-rose-300 text-[9px]">{counts.unread}</span>
          )}
        </button>
        <button
          onClick={() => { setTab('staff'); setActiveConv(null) }}
          className={`px-4 py-2 rounded-xl text-[11px] font-mono font-semibold flex items-center gap-1.5 transition ${
            tab === 'staff' ? 'pa-btn-gold' : 'pa-well text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> STAFF MESSAGES
        </button>

        <div className="flex-1" />

        <div className="relative hidden sm:block">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="pl-9 pr-3 py-2 rounded-xl pa-well text-xs text-white placeholder-zinc-500 w-52 focus:outline-none focus:border-amber-400/40"
          />
        </div>

        {tab === 'staff' && (
          <button
            onClick={() => setShowNewDm(true)}
            className="pa-btn-gold px-3.5 py-2 rounded-xl text-[11px] flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> New DM
          </button>
        )}
      </div>

      {/* Status filter (live support only) */}
      {tab === 'live' && (
        <div className="flex items-center gap-2">
          {(['all', 'open', 'pending', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold transition ${
                statusFilter === f ? 'pa-btn-gold' : 'pa-well text-zinc-400 hover:text-white'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* New DM composer */}
      {showNewDm && tab === 'staff' && (
        <div className="pa-card pa-card--gold p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">New Direct Message</h3>
            <button onClick={() => setShowNewDm(false)} className="p-1.5 rounded-lg pa-well text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <select
            value={dmTarget}
            onChange={(e) => setDmTarget(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white text-xs font-mono"
          >
            <option value="">Select a staff member…</option>
            {adminStaff.map((s) => (
              <option key={s.id} value={s.email}>
                {s.name} ({s.email}){s.authority ? ` — ${s.authority}` : ''}
              </option>
            ))}
          </select>
          <textarea
            value={dmText}
            onChange={(e) => setDmText(e.target.value)}
            rows={3}
            placeholder="Write your message…"
            className="w-full px-3 py-2.5 rounded-xl pa-well text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/40"
          />
          <button onClick={sendNewDm} className="pa-btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Send Message
          </button>
        </div>
      )}

      {/* Inbox + Thread layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Conversation list */}
        <div className={`lg:col-span-5 space-y-2.5 ${activeConv ? 'hidden lg:block' : ''}`}>
          {loading && conversations.length === 0 ? (
            <div className="p-10 text-center rounded-2xl pa-card pa-card--slate text-[11px] text-zinc-500">
              <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
              Loading conversations from MongoDB…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center rounded-2xl pa-card pa-card--slate space-y-2">
              <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-sm font-bold text-white">No conversations</div>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                {tab === 'live'
                  ? 'Customer chats from the storefront Live Support bubble land here in real time.'
                  : 'Use New DM to start a direct conversation with a staff member.'}
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => openThread(c)}
                className={`w-full text-left pa-card pa-card--slate p-3.5 transition hover:border-amber-400/30 ${
                  activeConv?.id === c.id ? 'border-amber-400/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl pa-well flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                      {convTitle(c).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{convTitle(c)}</div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate">{convSub(c)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.unreadForStaff > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/25 text-rose-300 text-[9px] font-bold font-mono">
                        {c.unreadForStaff}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-zinc-500">
                      {c.updatedAt ? new Date(c.updatedAt).toLocaleString('en', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 truncate mt-2 pl-[46px]">
                  {c.lastMessage?.senderType === 'staff' ? 'You: ' : ''}
                  {c.lastMessage?.body || '—'}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Thread view */}
        <div className={`lg:col-span-7 ${activeConv ? '' : 'hidden lg:block'}`}>
          {activeConv ? (
            <div className="rounded-2xl pa-card pa-card--slate flex flex-col h-[560px]">
              {/* Thread header */}
              <div className="flex items-start justify-between gap-3 p-4 border-b border-white/5">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConv(null)}
                    className="lg:hidden p-1.5 rounded-lg pa-well text-zinc-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="w-10 h-10 rounded-xl pa-well flex items-center justify-center text-sm font-bold text-violet-300 shrink-0">
                    {convTitle(activeConv).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{convTitle(activeConv)}</div>
                    <div className="text-[10px] font-mono text-zinc-500 truncate">
                      {convSub(activeConv)}
                      {activeConv.staff?.name ? ` · handled by ${activeConv.staff.name}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {statusChip(activeConv.status)}
                  {activeConv.status !== 'pending' && (
                    <button
                      onClick={() => updateStatus(activeConv, 'pending')}
                      className="px-2 py-1 rounded-lg pa-well text-zinc-300 hover:text-amber-300 text-[10px] font-semibold"
                    >
                      Pending
                    </button>
                  )}
                  {activeConv.status !== 'closed' && (
                    <button
                      onClick={() => updateStatus(activeConv, 'closed')}
                      className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadLoading ? (
                  <div className="text-center text-[11px] text-zinc-500 py-8">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Loading thread…
                  </div>
                ) : thread.length === 0 ? (
                  <div className="text-center text-[11px] text-zinc-500 py-8">No messages yet.</div>
                ) : (
                  thread.map((m) => {
                    const mine = m.senderType === 'staff'
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            mine
                              ? 'bg-amber-400/90 text-slate-950 font-medium rounded-br-md'
                              : 'bg-black/30 border border-white/5 text-zinc-100 rounded-bl-md'
                          }`}
                        >
                          <div className={`text-[9px] font-mono mb-0.5 uppercase tracking-wider ${mine ? 'text-slate-800' : 'text-amber-300/90'}`}>
                            {m.senderName || (mine ? 'Staff' : 'Customer')}
                            {m.senderEmail ? ` · ${m.senderEmail}` : ''}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`text-[9px] mt-1 font-mono ${mine ? 'text-slate-800/70' : 'text-zinc-500'}`}>
                            {new Date(m.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply composer */}
              <div className="p-3 border-t border-white/5 flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                  rows={1}
                  placeholder={`Reply to ${convTitle(activeConv)}…`}
                  className="flex-1 resize-none px-3 py-2.5 rounded-xl pa-well text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/40 max-h-24"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shrink-0 disabled:opacity-40 transition"
                  title="Send reply"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center rounded-2xl pa-card pa-card--slate space-y-2 h-[560px] flex flex-col items-center justify-center">
              <MessagesSquare className="w-10 h-10 text-zinc-600" />
              <div className="text-sm font-bold text-white">Select a conversation</div>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Pick a thread from the inbox to read the full history and reply. Customer
                replies appear live — no refresh needed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
