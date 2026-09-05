import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare,
  X,
  Send,
  Headphones,
  ChevronDown,
  Bot,
  User as UserIcon,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'

interface LiveSupportWidgetProps {
  user: { name: string; email: string } | null
  onNavigate?: (path: string) => void
}

interface BotLink {
  label: string
  href: string
}

interface ChatMsg {
  id: string
  senderType: 'customer' | 'staff' | 'system' | 'bot'
  senderName: string
  body: string
  createdAt: string
  links?: BotLink[]
  quickReplies?: string[]
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const BOT_SESSION_KEY = 'playbeat_bot_session'

/**
 * LiveSupportWidget — the ONE customer chat on the storefront.
 *
 * Two layers, one system, one floating button:
 *   1. BOT (default): instant, catalog-grounded answers — products, pricing,
 *      checkout, order status (own orders only). Server endpoint
 *      POST /api/messages/bot; nothing sensitive reaches the browser.
 *   2. HUMAN (escalation): the existing live-support thread backed by the
 *      admin Message Box — "Contact Support" hands the conversation over.
 */
export const LiveSupportWidget: React.FC<LiveSupportWidgetProps> = ({ user, onNavigate }) => {
  const [open, setOpen] = useState(false)
  // 'bot' until the customer explicitly escalates to a human thread
  const [mode, setMode] = useState<'bot' | 'human'>('bot')
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
  const [hasThread, setHasThread] = useState<boolean>(
    () => Boolean(localStorage.getItem('playbeat_chat_conversation'))
  )
  const bottomRef = useRef<HTMLDivElement>(null)

  // Restore bot transcript for this browser session (lightweight state only —
  // no secrets, no PII beyond what the visitor typed themselves)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(BOT_SESSION_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {
      /* ignore corrupt session state */
    }
  }, [])

  const persistBot = (msgs: ChatMsg[]) => {
    try {
      sessionStorage.setItem(BOT_SESSION_KEY, JSON.stringify(msgs.slice(-40)))
    } catch {
      /* storage full — non-critical */
    }
  }

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

  useEffect(scrollToBottom, [messages, open])

  // ---------- human thread polling (existing behavior) ----------
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
      }
    } catch {
      /* polling must never break the page */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, visitorId, email])

  useEffect(() => {
    if (!open || mode !== 'human' || !conversationId) return
    poll()
    const t = setInterval(poll, 5000)
    return () => clearInterval(t)
  }, [open, mode, conversationId, poll])

  // ---------- bot ----------
  const askBot = async (text: string) => {
    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      senderType: 'customer',
      senderName: user?.name || 'You',
      body: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => {
      const next = [...m, userMsg]
      persistBot(next)
      return next
    })
    setBusy(true)
    setError(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const token = localStorage.getItem('playbeat_user_token')
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/api/messages/bot`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      const botMsg: ChatMsg = {
        id: `b-${Date.now()}`,
        senderType: 'bot',
        senderName: 'PlayBeat Assistant',
        body:
          res.status === 429
            ? data?.error || 'One moment — you are sending questions very quickly.'
            : data?.reply || data?.error || 'Something went wrong — please try again.',
        createdAt: new Date().toISOString(),
        links: data?.links || undefined,
        quickReplies: data?.quickReplies || undefined,
      }
      setMessages((m) => {
        const next = [...m, botMsg]
        persistBot(next)
        return next
      })
    } catch {
      setError('Network error — the assistant is unreachable right now.')
    } finally {
      setBusy(false)
    }
  }

  // ---------- human thread (existing flow) ----------
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

  const submit = () => {
    const text = draft.trim()
    if (!text || busy) return
    if (mode === 'bot') {
      setDraft('')
      askBot(text)
    } else {
      hasThread ? send() : startChat()
    }
  }

  const escalateToHuman = () => {
    setMode('human')
    setMessages([])
    setError(null)
    // Seed the human thread view with context
    setMessages([
      {
        id: `s-${Date.now()}`,
        senderType: 'system',
        senderName: 'PlayBeat',
        body:
          'You are now connected with the PlayBeat support team. Send a message and our staff will reply right here — typically within minutes during business hours.',
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const backToBot = () => {
    setMode('bot')
    setError(null)
    try {
      const saved = sessionStorage.getItem(BOT_SESSION_KEY)
      setMessages(saved ? JSON.parse(saved) : [])
    } catch {
      setMessages([])
    }
  }

  const navigate = (href: string) => {
    setOpen(false)
    if (onNavigate) onNavigate(href)
    else window.location.assign(href)
  }

  const lastQuickReplies =
    mode === 'bot' ? [...messages].reverse().find((m) => m.senderType === 'bot')?.quickReplies || [] : []

  return (
    <>
      {/* Floating launcher — bottom-right, does not collide with the toast */}
      <button
        id="live-support-launcher"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] group"
        title="Help & Support — PlayBeat Assistant"
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
        <div className="fixed bottom-24 right-4 sm:right-6 z-[60] w-[calc(100vw-2rem)] sm:w-[380px] max-h-[72vh] rounded-3xl bg-[#060B1E] border border-slate-400/20 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#0A122E] to-[#081028] border-b border-slate-400/15">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#081028] border border-amber-400/30 flex items-center justify-center">
                {mode === 'bot' ? (
                  <Bot className="w-4 h-4 text-amber-400" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                )}
              </span>
              <div>
                <div className="text-sm font-bold text-white leading-tight">
                  {mode === 'bot' ? 'PlayBeat Assistant' : 'Live Support'}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {mode === 'bot' ? 'Online · instant answers' : 'Online · replies in minutes'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mode === 'human' && (
                <button
                  onClick={backToBot}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                  title="Back to the assistant"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[220px]">
            {mode === 'bot' && messages.length === 0 && (
              <div className="text-center py-4 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0A122E] border border-amber-400/25 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-sm font-bold text-white">
                  Hi{user?.name ? ` ${user.name.split(' ')[0]}` : ' there'} 👋
                </div>
                <p className="text-[11px] text-slate-400 max-w-[270px] mx-auto leading-relaxed">
                  I'm the PlayBeat assistant. Ask me about our products, pricing and plans, checkout
                  and payment, or your orders — I answer instantly.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {['What products do you have?', 'How do I checkout?', 'Track my order'].map((q) => (
                    <button
                      key={q}
                      onClick={() => askBot(q)}
                      className="px-2.5 py-1.5 rounded-full bg-[#0A122E] border border-amber-400/25 text-[10px] text-amber-200 hover:border-amber-400/60 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.senderType === 'customer'
              const isBot = m.senderType === 'bot'
              const isSystem = m.senderType === 'system'
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${isSystem ? 'w-full' : ''}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        mine
                          ? 'bg-[#FFC107] text-slate-950 font-medium rounded-br-md'
                          : isSystem
                            ? 'bg-[#0A122E] border border-sky-400/20 text-slate-200 rounded-xl text-[11px]'
                            : 'bg-[#0A122E] border border-slate-400/15 text-slate-100 rounded-bl-md'
                      }`}
                    >
                      {!mine && !isSystem && (
                        <div className="text-[9px] font-mono text-amber-300/90 mb-1 uppercase tracking-wider flex items-center gap-1">
                          {isBot ? <Bot className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          {m.senderName || (isBot ? 'PlayBeat Assistant' : 'PlayBeat Team')}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className={`text-[9px] mt-1 font-mono ${mine ? 'text-slate-800/70' : 'text-slate-500'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {/* Action links under bot messages */}
                    {isBot && m.links && m.links.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {m.links.map((l) => (
                          <button
                            key={l.label + l.href}
                            onClick={() => navigate(l.href)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#0A122E] border border-amber-400/30 text-[10px] font-semibold text-amber-200 hover:border-amber-400/70 hover:text-amber-100 transition"
                          >
                            {l.label}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {busy && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl bg-[#0A122E] border border-slate-400/15">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-bounce [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies (bot mode) */}
          {mode === 'bot' && lastQuickReplies.length > 0 && !busy && (
            <div className="px-4 pb-1 flex flex-wrap gap-1.5">
              {lastQuickReplies.map((q) => (
                <button
                  key={q}
                  onClick={() => askBot(q)}
                  className="px-2.5 py-1.5 rounded-full bg-[#0A122E] border border-slate-400/20 text-[10px] text-slate-200 hover:border-amber-400/60 hover:text-amber-200 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Escalation row (bot mode) */}
          {mode === 'bot' && (
            <div className="px-4 pt-2">
              <button
                onClick={escalateToHuman}
                className="w-full py-2 rounded-xl border border-sky-400/25 bg-sky-400/5 text-[10px] font-mono uppercase tracking-wider text-sky-300 hover:bg-sky-400/10 transition"
              >
                Contact Support — talk to a human
              </button>
            </div>
          )}

          {/* Composer */}
          <div className="px-4 py-3 border-t border-slate-400/15 bg-[#081028] space-y-2">
            {mode === 'human' && !hasThread && (
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
                    submit()
                  }
                }}
                rows={1}
                placeholder={
                  mode === 'bot'
                    ? 'Ask about products, pricing, checkout…'
                    : hasThread
                      ? 'Type your message…'
                      : 'How can we help you today?'
                }
                className="flex-1 resize-none px-3.5 py-2.5 rounded-xl bg-[#0A122E] border border-slate-400/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 max-h-24"
              />
              <button
                onClick={submit}
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
