import React, { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Inbox,
} from 'lucide-react'

interface SupportPanelProps {
  triggerToast: (msg: string) => void
  onQuickReply?: () => void
}

interface LiveMessage {
  _id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'new' | 'pending' | 'resolved'
  createdAt: string
  updatedAt?: string
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

// NO MOCK DATA — every ticket here is a real customer message from MongoDB contact_messages.

export const SupportPanel: React.FC<SupportPanelProps> = ({ triggerToast }) => {
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [counts, setCounts] = useState<{ all: number; new: number; pending: number; resolved: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'new' | 'pending' | 'resolved'>('all')
  const [replyTo, setReplyTo] = useState<LiveMessage | null>(null)
  const [replyText, setReplyText] = useState('')

  const getToken = () => localStorage.getItem('playbeat_admin_token')

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/support-messages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setMessages(data.messages || [])
        setCounts(data.counts || null)
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const updateStatus = async (m: LiveMessage, status: 'new' | 'pending' | 'resolved') => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/support-messages/${m._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data?.success) {
        setMessages((prev) => prev.map((x) => (x._id === m._id ? { ...x, status } : x)))
        triggerToast(`Ticket marked ${status}`)
        fetchMessages()
      } else {
        triggerToast(data?.error || 'Update failed')
      }
    } catch {
      triggerToast('Network error while updating ticket')
    }
  }

  const sendReply = () => {
    if (!replyTo || !replyText.trim()) return
    // Open the customer's mail client with the pre-filled reply — real delivery path
    const subject = `Re: ${replyTo.subject}`
    window.location.href = `mailto:${replyTo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(replyText)}`
    updateStatus(replyTo, 'pending')
    setReplyTo(null)
    setReplyText('')
  }

  const filtered = filter === 'all' ? messages : messages.filter((m) => m.status === filter)
  const openCount = counts?.new ?? 0

  const statusChip = (status: string) =>
    status === 'resolved' ? (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Resolved
      </span>
    ) : status === 'pending' ? (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pending
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-400/10 text-rose-300 border border-rose-400/25 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> New
      </span>
    )

  return (
    <div className="space-y-5">
      {/* Enterprise view header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="pa-viewchip pa-chip--purple">
            <MessageSquare className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Support Inbox</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live customer messages from the storefront contact form — reply, triage, resolve.
            </p>
          </div>
        </div>
        <button
          onClick={fetchMessages}
          className="pa-iconbtn px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#a5b4fc', ['--kpi-tint' as string]: 'rgba(165,180,252,0.1)', ['--kpi-edge' as string]: 'rgba(165,180,252,0.22)', ['--kpi-glow' as string]: 'rgba(165,180,252,0.3)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1.5">Total Messages</div>
            <div className="text-2xl font-black text-white font-mono leading-none">{counts?.all ?? '—'}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">all time</div>
          </div>
        </div>
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#fb7185', ['--kpi-tint' as string]: 'rgba(251,113,133,0.1)', ['--kpi-edge' as string]: 'rgba(251,113,133,0.22)', ['--kpi-glow' as string]: 'rgba(251,113,133,0.3)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1.5">Awaiting Reply</div>
            <div className="text-2xl font-black text-rose-300 font-mono leading-none">{counts?.new ?? '—'}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">status: new</div>
          </div>
        </div>
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#fbbf24', ['--kpi-tint' as string]: 'rgba(251,191,36,0.1)', ['--kpi-edge' as string]: 'rgba(251,191,36,0.22)', ['--kpi-glow' as string]: 'rgba(251,191,36,0.3)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1.5">In Progress</div>
            <div className="text-2xl font-black text-amber-300 font-mono leading-none">{counts?.pending ?? '—'}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">status: pending</div>
          </div>
        </div>
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#34d399', ['--kpi-tint' as string]: 'rgba(52,211,153,0.1)', ['--kpi-edge' as string]: 'rgba(52,211,153,0.22)', ['--kpi-glow' as string]: 'rgba(52,211,153,0.3)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1.5">Resolved</div>
            <div className="text-2xl font-black text-emerald-300 font-mono leading-none">{counts?.resolved ?? '—'}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">closed tickets</div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'new', 'pending', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold transition ${
              filter === f
                ? 'pa-btn-gold'
                : 'pa-well text-zinc-400 hover:text-white'
            }`}
          >
            {f.toUpperCase()}
            {f === 'new' && openCount > 0 && (
              <span className="ml-1.5 px-1.5 rounded-full bg-rose-500/25 text-rose-300 text-[9px]">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Live message list */}
      <div className="space-y-2.5">
        {loading && messages.length === 0 ? (
          <div className="p-10 text-center rounded-2xl pa-card pa-card--slate text-[11px] text-zinc-500">
            <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
            Fetching live messages from MongoDB…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center rounded-2xl pa-card pa-card--slate space-y-2">
            <Inbox className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-sm font-bold text-white">Inbox zero</div>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              No {filter !== 'all' ? `${filter} ` : ''}customer messages yet. Every message submitted through the
              storefront contact form lands here in real time.
            </p>
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m._id} className="pa-card pa-card--slate p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl pa-well flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                    {m.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{m.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{m.email}</span>
                    </div>
                    <div className="text-xs text-zinc-300 font-semibold mt-0.5">{m.subject}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {statusChip(m.status)}
                  <span className="text-[10px] font-mono text-zinc-500">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString('en', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed bg-black/20 rounded-xl p-3 border border-white/5">
                {m.message}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => { setReplyTo(m); setReplyText(`Hi ${m.name},\n\nThank you for contacting PlayBeat Digital.\n\n`) }}
                  className="pa-btn-gold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1"
                >
                  Reply
                </button>
                {m.status !== 'pending' && (
                  <button
                    onClick={() => updateStatus(m, 'pending')}
                    className="px-3 py-1.5 rounded-lg pa-well text-zinc-300 hover:text-amber-300 text-[10px] font-semibold transition"
                  >
                    Mark Pending
                  </button>
                )}
                {m.status !== 'resolved' && (
                  <button
                    onClick={() => updateStatus(m, 'resolved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold transition"
                  >
                    Resolve
                  </button>
                )}
                {m.status !== 'new' && (
                  <button
                    onClick={() => updateStatus(m, 'new')}
                    className="px-3 py-1.5 rounded-lg pa-well text-zinc-400 hover:text-white text-[10px] font-semibold transition"
                  >
                    Reopen
                  </button>
                )}
              </div>

              {replyTo?._id === m._id && (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Write your reply…"
                    className="w-full px-3 py-2.5 rounded-xl pa-well text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/40"
                  />
                  <div className="flex gap-2">
                    <button onClick={sendReply} className="pa-btn-gold px-4 py-1.5 rounded-lg text-[10px]">
                      Send via Email
                    </button>
                    <button
                      onClick={() => { setReplyTo(null); setReplyText('') }}
                      className="px-4 py-1.5 rounded-lg pa-well text-zinc-300 text-[10px] font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
