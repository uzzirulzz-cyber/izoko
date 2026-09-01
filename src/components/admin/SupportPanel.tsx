import React, { useState } from 'react'
import {
  MessageSquare,
  Headphones,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  Send,
  X,
  Filter,
  User,
  ExternalLink,
} from 'lucide-react'

interface SupportPanelProps {
  triggerToast: (msg: string) => void
  onQuickReply: () => void
}

interface Ticket {
  id: string
  customer: string
  email: string
  subject: string
  message: string
  priority: 'High' | 'Normal' | 'Low'
  status: 'Open' | 'Pending' | 'Resolved'
  channel: 'Email' | 'WhatsApp' | 'Contact Form'
  createdAt: string
  assignedTo?: string
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'TKT-1024',
    customer: 'Ali Raza',
    email: 'ali.raza@gmail.com',
    subject: 'PSN $50 Key delivery query',
    message: 'Hi, I ordered a PlayStation $50 gift card 10 minutes ago but have not received the key yet. Order PB-891234.',
    priority: 'High',
    status: 'Open',
    channel: 'WhatsApp',
    createdAt: '10m ago',
  },
  {
    id: 'TKT-1023',
    customer: 'Zohaib Hassan',
    email: 'zohaib.h@hotmail.com',
    subject: 'Magcubic HY450 delivery tracking',
    message: 'Got the dispatch confirmation but tracking link shows no movement. Can you check?',
    priority: 'Normal',
    status: 'Pending',
    channel: 'Email',
    createdAt: '25m ago',
    assignedTo: 'Staff: PB-STAFF-001',
  },
  {
    id: 'TKT-1022',
    customer: 'Noman Siddiqui',
    email: 'noman.s@yahoo.com',
    subject: 'IPTV M3U playlist activation link',
    message: 'I purchased the 15000 channels IPTV subscription but the M3U link is not working in VLC. Please send a fresh one.',
    priority: 'High',
    status: 'Open',
    channel: 'Contact Form',
    createdAt: '1h ago',
  },
  {
    id: 'TKT-1021',
    customer: 'Fatima Khan',
    email: 'fatima.k@gmail.com',
    subject: 'Netflix Premium account replacement',
    message: 'The Netflix account I bought stopped working after 2 days. Order PB-889012. Need a replacement as per warranty.',
    priority: 'High',
    status: 'Open',
    channel: 'Email',
    createdAt: '2h ago',
  },
  {
    id: 'TKT-1020',
    customer: 'Bilal Ahmed',
    email: 'bilal.ahmed@gmail.com',
    subject: 'Bulk order inquiry — 10 ChatGPT Plus accounts',
    message: 'Looking to buy 10 ChatGPT Plus monthly accounts for our team. Any bulk discount?',
    priority: 'Normal',
    status: 'Pending',
    channel: 'WhatsApp',
    createdAt: '4h ago',
    assignedTo: 'Staff: PB-STAFF-001',
  },
  {
    id: 'TKT-1019',
    customer: 'Sara Malik',
    email: 'sara.malik@gmail.com',
    subject: 'Thank you — refund processed',
    message: 'Just confirming the refund for my cancelled order went through. Thanks for the quick response!',
    priority: 'Low',
    status: 'Resolved',
    channel: 'Email',
    createdAt: '6h ago',
    assignedTo: 'Staff: PB-STAFF-001',
  },
]

export const SupportPanel: React.FC<SupportPanelProps> = ({ triggerToast, onQuickReply }) => {
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS)
  const [filter, setFilter] = useState<'all' | 'Open' | 'Pending' | 'Resolved'>('all')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [reply, setReply] = useState('')

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter)

  const handleStatusChange = (id: string, status: Ticket['status']) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    if (selectedTicket?.id === id) {
      setSelectedTicket((prev) => (prev ? { ...prev, status } : null))
    }
    triggerToast(`Ticket ${id} marked as ${status}`)
  }

  const handleSendReply = () => {
    if (!selectedTicket || !reply.trim()) return
    triggerToast(`Reply sent to ${selectedTicket.customer} (${selectedTicket.email})`)
    setReply('')
    // Optionally mark as Pending (awaiting customer response)
    handleStatusChange(selectedTicket.id, 'Pending')
  }

  const counts = {
    open: tickets.filter((t) => t.status === 'Open').length,
    pending: tickets.filter((t) => t.status === 'Pending').length,
    resolved: tickets.filter((t) => t.status === 'Resolved').length,
    high: tickets.filter((t) => t.priority === 'High' && t.status === 'Open').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Support Tickets</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Customer support queue. Reply, assign, and resolve tickets across Email, WhatsApp, and Contact Form.
          </p>
        </div>
        <button
          onClick={() => triggerToast('Refreshing tickets…')}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center gap-1.5"
        >
          <Filter className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">Open Tickets</div>
          <div className="text-xl font-bold text-white">{counts.open}</div>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">Pending Reply</div>
          <div className="text-xl font-bold text-white">{counts.pending}</div>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">Resolved</div>
          <div className="text-xl font-bold text-white">{counts.resolved}</div>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-rose-500/20 p-4">
          <div className="flex items-center justify-between mb-1">
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">High Priority</div>
          <div className="text-xl font-bold text-rose-400">{counts.high}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'Open', 'Pending', 'Resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === f ? 'bg-amber-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All Tickets' : f}
            <span className="ml-1.5 text-[10px] opacity-70">
              ({f === 'all' ? tickets.length : tickets.filter((t) => t.status === f).length})
            </span>
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List column */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl bg-[#0B0F19] border border-white/5">
              No tickets in this view.
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  selectedTicket?.id === t.id
                    ? 'bg-[#0F131D] border-amber-400/40'
                    : 'bg-[#0B0F19] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-zinc-500">{t.id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                        t.priority === 'High' ? 'bg-rose-400/10 text-rose-400 border-rose-400/20' :
                        t.priority === 'Normal' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                        'bg-zinc-400/10 text-zinc-400 border-zinc-400/20'
                      }`}>
                        {t.priority}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                        t.status === 'Open' ? 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20' :
                        t.status === 'Pending' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                        'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-white truncate">{t.subject}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {t.customer} • {t.email}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-500">{t.channel}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">{t.createdAt}</div>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2">{t.message}</p>
                {t.assignedTo && (
                  <div className="mt-2 text-[10px] text-cyan-400 font-mono">
                    👤 {t.assignedTo}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Detail / Reply column */}
        <div className="lg:sticky lg:top-24 h-fit">
          {selectedTicket ? (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">{selectedTicket.id}</h3>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#07090E] border border-white/5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-semibold text-white">{selectedTicket.customer}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-mono">{selectedTicket.email}</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {selectedTicket.channel} • {selectedTicket.createdAt}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1">Subject</div>
                <div className="text-xs font-bold text-white">{selectedTicket.subject}</div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1">Message</div>
                <div className="text-xs text-zinc-300 leading-relaxed p-3 rounded-xl bg-[#07090E] border border-white/5">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Status actions */}
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1.5">Update Status</div>
                <div className="flex gap-1.5">
                  {(['Open', 'Pending', 'Resolved'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(selectedTicket.id, s)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                        selectedTicket.status === s
                          ? 'bg-amber-400 text-black'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply box */}
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1.5">Reply to Customer</div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Hi ${selectedTicket.customer.split(' ')[0]}, 

Thank you for contacting PlayBeat Support. `}
                  rows={5}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white text-xs resize-none focus:outline-none focus:border-amber-400"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      setReply(`Hi ${selectedTicket.customer.split(' ')[0]},\n\nThank you for contacting PlayBeat Support. We have received your ticket and are looking into it. You will receive a detailed response within 2-4 hours.\n\nBest regards,\nPlayBeat Support Team`)
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold"
                  >
                    Insert Template
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={!reply.trim()}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    Send Reply
                  </button>
                </div>
              </div>

              <a
                href={`mailto:${selectedTicket.email}?subject=Re: ${encodeURIComponent(selectedTicket.subject)}`}
                className="block text-center text-[10px] text-zinc-400 hover:text-amber-400 transition pt-2 border-t border-white/5"
              >
                <ExternalLink className="w-3 h-3 inline mr-1" />
                Open in mail client →
              </a>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-8 text-center text-zinc-500 text-xs">
              <Headphones className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Select a ticket to view details and reply.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
