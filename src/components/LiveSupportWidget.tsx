import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, X, Send, Headphones, ChevronDown } from 'lucide-react'

interface LiveSupportWidgetProps {
  user: { name: string; email: string } | null
}

interface ChatMsg {
  id: string
  senderType: 'customer' | 'staff' | 'system'
  senderName: string
  body: string
  createdAt: string
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

/**
 * LiveSupportWidget — storefront live chat linked to the admin Message Box.
 * Customers (signed-in or visitors) chat with the PlayBeat team; every message
 * lands in MongoDB and appears instantly in the admin panel for staff to
 * view, read and reply.
 */
export const LiveSupportWidget: React.FC<LiveSupportWidgetProps> = ({ user }) => {
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string>(
    () => localStorage.getItem('playbeat_chat_conversation') || ''
  )
  const [visitorId] = useState<string>(() => {
    let v = localStorage.getItem('playbeat_visitor_id')
    if (!v) {
      v = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('playbeat_visitor_id', v)
    }
    return v
  })
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasThread, setHasThread] = useState<boolean>(() => Boolean(localStorage.getItem('playbeat_chat_conversation')))
  const [staffTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Prefill identity when the customer signs in
  useEffect(() => {
    if (user) {
      setName((n) => n || user.name)
      setEmail((e) => e || user.email)
    }
  }, [user])

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  const poll = useCallback(async () => {
    if (!conversationId) return
    try {
      const qs = new URLSearchParams({ conversationId, visitorId })
      if (email) qs.set('email', email)
      const res = await fetch(`${API_BASE}/api/messages/mine?${qs.toString()}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success && Array.isArray(data.messages)) {
        setMessages(data.messages)
        scrollToBottom()
      }
    } catch {
      /* polling must never break the page */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, visitorId, email])

  // Poll while the chat is open (5s) — lightweight, resilient
  useEffect(() => {
    if (!open || !conversationId) return
    poll()
    const t = setInterval(poll, 5000)
    return () => clearInterval(t)
  }, [open, conversationId, poll])

  const startChat = async () => {
    setError(null)
    if (!name.trim() || !email.trim() || !draft.trim()) {
      setError('Please fill in your name, email and a short message.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/messages/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, message: draft, visitorId }),
      })
      const data = await res.json()
      if (data?.success && data?.conversation?.id) {
        const cid = data.conversation.id
        setConversationId(cid)
        localStorage.setItem('playbeat_chat_conversation', cid)
        setHasThread(true)
        setDraft('')
        poll()
      } else {
        setError(data?.error || 'Could not start the chat. Please try again.')
      }
    } catch {
      setError('Network error — please try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

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
        body: JSON.stringify({ conversationId, body: text, visitorId, email }),
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

  return (
    <>
      {/* Floating launcher — bottom-right, does not collide with the toast */}
      <button
        id="live-support-launcher"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] group"
        title="Live Support — chat with the PlayBeat team"
      >
        <span className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-full blur-md opacity-40 group-hover:opacity-80 transition duration-300 pointer-events-none"></span>
        <span className="relative flex items-center justify-center w-14 h-14 rounded-full btn-gold-gradient shadow-2xl active:scale-95 transition-all">
          {open ? (
            <ChevronDown className="w-6 h-6 text-slate-950" />
          ) : (
            <Headphones className="w-6 h-6 text-slate-950" />
          )}
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-[#050814]"></span>
            </span>
          )}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[380px] max-h-[70vh] rounded-3xl bg-[#060B1E] border border-slate-400/20 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#0A122E] to-[#081028] border-b border-slate-400/15">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#081028] border border-amber-400/30 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-amber-400" />
              </span>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Live Support</div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online · replies in minutes
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[220px]">
            {messages.length === 0 && !hasThread && (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0A122E] border border-amber-400/25 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-sm font-bold text-white">Hi there 👋</div>
                <p className="text-[11px] text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                  Questions about a product, your order, or warranty? Send us a message —
                  the PlayBeat support team replies here in real time.
                </p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.senderType === 'customer'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                      mine
                        ? 'bg-[#FFC107] text-slate-950 font-medium rounded-br-md'
                        : 'bg-[#0A122E] border border-slate-400/15 text-slate-100 rounded-bl-md'
                    }`}
                  >
                    {!mine && (
                      <div className="text-[9px] font-mono text-amber-300/90 mb-1 uppercase tracking-wider">
                        {m.senderName || 'PlayBeat Team'}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`text-[9px] mt-1 font-mono ${mine ? 'text-slate-800/70' : 'text-slate-500'}`}>
                      {new Date(m.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            {staffTyping && (
              <div className="text-[10px] text-slate-500 font-mono px-2">PlayBeat team is typing…</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="px-4 py-3 border-t border-slate-400/15 bg-[#081028] space-y-2">
            {!hasThread && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="px-3 py-2 rounded-xl bg-[#0A122E] border border-slate-400/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  type="email"
                  className="px-3 py-2 rounded-xl bg-[#0A122E] border border-slate-400/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                />
              </div>
            )}
            {error && <div className="text-[10px] text-rose-300 font-mono">{error}</div>}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    hasThread ? send() : startChat()
                  }
                }}
                rows={1}
                placeholder={hasThread ? 'Type your message…' : 'How can we help you today?'}
                className="flex-1 resize-none px-3.5 py-2.5 rounded-xl bg-[#0A122E] border border-slate-400/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 max-h-24"
              />
              <button
                onClick={() => (hasThread ? send() : startChat())}
                disabled={busy || !draft.trim()}
                className="w-10 h-10 rounded-xl btn-gold-gradient text-slate-950 flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
