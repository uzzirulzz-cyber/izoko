import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LayoutDashboard, Inbox, MessageCircle, PhoneCall, Phone, Users, UserCircle2,
  CheckSquare, CalendarClock, BarChart3, IdCard, Search, Bell, LogOut,
  Menu, X, ChevronLeft, PhoneIncoming, PhoneOutgoing, Zap, Plus, Minus,
  Mic, MicOff, Volume2, VolumeX, Pause, Square, Star, Clock, Send,
  Tag, MapPin, Mail, Globe, Briefcase, StickyNote, TrendingUp, AlertCircle,
  CheckCircle, ArrowLeft, ArrowRight, RotateCw
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

async function api(path: string, opts: RequestInit = {}) {
  const token = getAdminToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    credentials: 'include',
  })
  const text = await res.text()
  let data: any = null
  if (text) { try { data = JSON.parse(text) } catch { data = text } }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

type CRMView = 'dashboard' | 'inbox' | 'whatsapp' | 'calls' | 'dialer' | 'leads' | 'customers' | 'tasks' | 'followups' | 'employees'

const NAV: { key: CRMView; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'calls', label: 'Calls', icon: PhoneCall },
  { key: 'dialer', label: 'Dialer', icon: Phone },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'customers', label: 'Customers', icon: UserCircle2 },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'followups', label: 'Follow-ups', icon: CalendarClock },
  { key: 'employees', label: 'Employees', icon: IdCard },
]

export function CRMApp({ onExit }: { onExit: () => void }) {
  const [view, setView] = useState<CRMView>('dashboard')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [search, setSearch] = useState('')

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar — enterprise navy */}
      <aside className="w-60 shrink-0 flex flex-col bg-[#0B1220] text-[#CBD5E1] border-r border-[#1a2332]">
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-[#1a2332]">
          <div className="w-8 h-8 rounded-lg bg-[#F4C542] flex items-center justify-center shrink-0">
            <PhoneCall className="w-4 h-4 text-[#0B1220]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">PlayBeat CRM</span>
            <span className="text-[10px] text-[#94A3B8] -mt-0.5">Communication Center</span>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((n) => {
            const Icon = n.icon
            return (
              <button key={n.key} onClick={() => setView(n.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  view === n.key ? 'bg-[#F4C542] text-[#0B1220] font-semibold' : 'text-[#CBD5E1] hover:bg-[#1a2332] hover:text-white'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{n.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="border-t border-[#1a2332] p-3">
          <button onClick={onExit} className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-white px-2 py-1.5">
            <ArrowLeft className="w-3 h-3" /> Back to Storefront
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-4 flex items-center justify-between border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <button onClick={() => setMobileNavOpen(true)} className="md:hidden"><Menu className="w-5 h-5" /></button>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search customers, leads, phone…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 rounded-md border border-transparent focus:bg-white focus:border-[#F4C542] focus:outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-slate-100">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#0B1220] text-white flex items-center justify-center text-xs font-semibold">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {view === 'dashboard' && <DashboardView />}
          {view === 'inbox' && <InboxView />}
          {view === 'whatsapp' && <WhatsAppView />}
          {view === 'calls' && <CallsView />}
          {view === 'dialer' && <DialerView />}
          {view === 'leads' && <LeadsView />}
          {view === 'customers' && <CustomersView />}
          {view === 'tasks' && <TasksView />}
          {view === 'followups' && <FollowupsView />}
          {view === 'employees' && <EmployeesView />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-center justify-around border-t border-slate-200 bg-white px-1 py-1">
          {['inbox', 'calls', 'dialer', 'leads'].map((v) => {
            const item = NAV.find(n => n.key === v)!
            const Icon = item.icon
            return <button key={v} onClick={() => setView(v as CRMView)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md ${view === v ? 'text-[#0B1220]' : 'text-slate-500'}`}>
              <Icon className="w-5 h-5" /><span className="text-[10px]">{item.label}</span>
            </button>
          })}
          <button onClick={() => setMobileNavOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-500">
            <Menu className="w-5 h-5" /><span className="text-[10px]">More</span>
          </button>
        </nav>
      </div>

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-64 bg-[#0B1220] text-[#CBD5E1] flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#1a2332]">
              <span className="text-sm font-semibold text-white">PlayBeat CRM</span>
              <button onClick={() => setMobileNavOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <nav className="flex-1 py-3 px-2 space-y-0.5">
              {NAV.map((n) => {
                const Icon = n.icon
                return <button key={n.key} onClick={() => { setView(n.key); setMobileNavOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm ${view === n.key ? 'bg-[#F4C542] text-[#0B1220]' : 'text-[#CBD5E1] hover:bg-[#1a2332]'}`}>
                  <Icon className="w-4 h-4" /> {n.label}
                </button>
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────
function DashboardView() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    api('/api/analytics').then(setStats).catch(() => {})
    api('/api/messages/crm/calls?').then((r: any) => {
      setStats((s: any) => ({ ...s, calls: r.counts }))
    }).catch(() => {})
  }, [])
  if (!stats) return <div className="p-8 text-slate-400">Loading dashboard…</div>
  const t = stats.totals || {}
  const cards = [
    { label: 'Total Leads', value: t.totalLeads || 0, icon: Users, color: 'text-[#0B1220]' },
    { label: 'Calls Today', value: t.callsToday || 0, icon: PhoneCall, color: 'text-[#0B1220]' },
    { label: 'Messages', value: t.totalMessages || 0, icon: MessageCircle, color: 'text-[#0B1220]' },
    { label: 'Active Campaigns', value: t.activeCampaigns || 0, icon: BarChart3, color: 'text-[#0B1220]' },
  ]
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0B1220]">Dashboard</h1>
        <p className="text-sm text-slate-500">One workspace. Every customer conversation.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500">{c.label}</span><Icon className={`w-3.5 h-3.5 ${c.color}`} /></div>
              <div className="text-2xl font-bold text-[#0B1220]">{c.value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Inbox ───────────────────────────────────────────────────────────────
function InboxView() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    setLoading(true)
    api(`/api/messages/crm/inbox?filter=${filter}`).then((r: any) => setItems(r.items || [])).catch(() => {}).finally(() => setLoading(false))
  }, [filter])
  return (
    <div className="flex h-full">
      <div className="w-full md:w-96 shrink-0 border-r border-slate-200 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-[#0B1220] mb-3">Inbox</h1>
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'unread', 'whatsapp'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${filter === f ? 'bg-[#0B1220] text-white' : 'bg-slate-100 text-slate-600'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-6 text-center text-sm text-slate-500">Loading…</div>}
          {!loading && items.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No conversations.</div>}
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0B1220] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {(item.name || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2"><span className="font-medium text-sm truncate">{item.name}</span>
                    <span className="text-xs text-slate-400">{item.lastActivity ? new Date(item.lastActivity).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : ''}</span></div>
                  <div className="text-xs text-slate-500 truncate">{item.lastMessage}</div>
                  {item.unreadCount > 0 && <span className="inline-block mt-1 bg-[#F4C542] text-[#0B1220] text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.unreadCount}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400"><MessageCircle className="w-12 h-12 mx-auto opacity-30" /><p className="text-sm mt-2">Select a conversation</p></div>
      </div>
    </div>
  )
}

// ─── WhatsApp ────────────────────────────────────────────────────────────
function WhatsAppView() {
  return (
    <div className="flex h-full bg-white items-center justify-center">
      <div className="text-center text-slate-400 space-y-2">
        <MessageCircle className="w-12 h-12 mx-auto opacity-30" />
        <p className="text-sm">WhatsApp conversations load from the Inbox.</p>
        <p className="text-xs">Inbound messages appear here when the webhook is configured.</p>
      </div>
    </div>
  )
}

// ─── Calls ───────────────────────────────────────────────────────────────
function CallsView() {
  const [calls, setCalls] = useState<any[]>([])
  const [counts, setCounts] = useState<any>({ all: 0, incoming: 0, outgoing: 0, missed: 0 })
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const qs = tab === 'incoming' ? '?direction=INBOUND' : tab === 'outgoing' ? '?direction=OUTBOUND' : tab === 'missed' ? '?status=MISSED' : ''
    api(`/api/messages/crm/calls${qs}`).then((r: any) => { setCalls(r.calls || []); setCounts(r.counts || {}) }).catch(() => {}).finally(() => setLoading(false))
  }, [tab])
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-[#0B1220] flex items-center gap-2"><PhoneCall className="w-5 h-5" /> Calls</h1>
      <div className="flex gap-2">
        {['all','incoming','outgoing','missed'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${tab === t ? 'bg-[#0B1220] text-white' : 'bg-slate-100 text-slate-600'}`}>
            {t} ({counts[t] || 0})
          </button>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="text-left font-medium px-3 py-2.5">Direction</th><th className="text-left font-medium px-3 py-2.5">Customer</th><th className="text-left font-medium px-3 py-2.5">Phone</th><th className="text-left font-medium px-3 py-2.5">Duration</th><th className="text-left font-medium px-3 py-2.5">Status</th><th className="text-left font-medium px-3 py-2.5">Time</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={6} className="text-center py-8 text-slate-500">Loading…</td></tr>}
            {!loading && calls.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-500">No calls yet.</td></tr>}
            {calls.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">{c.direction === 'INBOUND' ? <span className="text-blue-600 flex items-center gap-1"><PhoneIncoming className="w-3.5 h-3.5" /> In</span> : <span className="text-[#0B1220] flex items-center gap-1"><PhoneOutgoing className="w-3.5 h-3.5" /> Out</span>}</td>
                <td className="px-3 py-2.5 font-medium">{c.leadName || 'Unknown'}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{c.phone}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{String(Math.floor((c.durationSec||0)/60)).padStart(2,'0')}:{String((c.durationSec||0)%60).padStart(2,'0')}</td>
                <td className="px-3 py-2.5"><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{c.status}</span></td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{c.startedAt ? new Date(c.startedAt).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Dialer ──────────────────────────────────────────────────────────────
function DialerView() {
  const [number, setNumber] = useState('')
  const [call, setCall] = useState<any>(null)
  const [callStatus, setCallStatus] = useState<'IDLE'|'CALLING'|'RINGING'|'CONNECTED'|'ENDED'>('IDLE')
  const [timer, setTimer] = useState(0)
  const timerRef = useRef<any>(null)

  async function startCall() {
    if (!number) return
    try {
      const r = await api('/api/messages/crm/calls', { method: 'POST', body: JSON.stringify({ to: number }) })
      setCall(r); setCallStatus('CALLING')
    } catch (e: any) { alert(e.message) }
  }
  async function endCall() {
    if (!call?.callId) return
    try { await api(`/api/messages/crm/calls/${call.callId}/end`, { method: 'POST', body: JSON.stringify({}) }) } catch {}
    setCallStatus('ENDED'); setCall(null); setCallStatus('IDLE')
  }
  useEffect(() => {
    if (callStatus === 'CONNECTED') { timerRef.current = setInterval(() => setTimer(t => t+1), 1000) }
    else { if (timerRef.current) clearInterval(timerRef.current); setTimer(0) }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callStatus])
  useEffect(() => {
    if (!call?.callId || callStatus === 'IDLE') return
    const t = setInterval(async () => {
      try { const r = await api(`/api/messages/crm/calls/${call.callId}`); if (r.call.status === 'RINGING') setCallStatus('RINGING'); if (r.call.status === 'CONNECTED') setCallStatus('CONNECTED'); if (r.call.status === 'ENDED') { setCallStatus('IDLE'); setCall(null) } } catch {}
    }, 1000)
    return () => clearInterval(t)
  }, [call?.callId, callStatus])

  const KEYS = [{d:'1',s:''},{d:'2',s:'ABC'},{d:'3',s:'DEF'},{d:'4',s:'GHI'},{d:'5',s:'JKL'},{d:'6',s:'MNO'},{d:'7',s:'PQRS'},{d:'8',s:'TUV'},{d:'9',s:'WXYZ'},{d:'*',s:''},{d:'0',s:'+'},{d:'#',s:''}]

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#0B1220] to-[#111827]">
      <div className="w-full max-w-sm space-y-5 p-6">
        <div className="text-center"><div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#F4C542] mb-2"><Phone className="w-6 h-6 text-[#0B1220]" /></div>
          <h1 className="text-2xl font-bold text-white">Phone Dialer</h1></div>
        <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Enter phone number"
          className="w-full bg-[#1a2332] border border-[#CBD5E1]/20 text-white text-lg font-mono text-center rounded-md py-2.5 focus:outline-none focus:border-[#F4C542]" />
        <div className="grid grid-cols-3 gap-2.5">
          {KEYS.map(k => (
            <button key={k.d} onClick={() => setNumber(n => n + k.d)}
              className="h-16 rounded-xl bg-gradient-to-br from-[#1a2332] to-[#0B1220] border border-[#CBD5E1]/15 flex flex-col items-center justify-center text-white hover:border-[#F4C542]/40 active:scale-95 transition-all">
              <span className="text-2xl font-semibold">{k.d}</span>{k.s && <span className="text-[10px] text-[#94A3B8]">{k.s}</span>}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          <button className="h-12 rounded-xl bg-[#1a2332] border border-[#CBD5E1]/15 flex items-center justify-center text-[#CBD5E1]"><Users className="w-5 h-5" /></button>
          <button onClick={startCall} disabled={callStatus !== 'IDLE'}
            className={`h-12 rounded-xl flex items-center justify-center text-white font-medium ${callStatus !== 'IDLE' ? 'bg-slate-600 opacity-50' : 'bg-[#F4C542] text-[#0B1220] hover:opacity-90'}`}>
            <PhoneCall className="w-5 h-5 mr-1.5" /><span className="text-sm">Call</span>
          </button>
          <button className="h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white"><MessageCircle className="w-5 h-5" /></button>
          <button onClick={() => setNumber(n => n.slice(0,-1))} className="h-12 rounded-xl bg-[#1a2332] border border-[#CBD5E1]/15 flex items-center justify-center text-[#CBD5E1]"><ChevronLeft className="w-5 h-5" /></button>
        </div>
        {call && callStatus !== 'IDLE' && (
          <div className="bg-[#1a2332] rounded-xl p-4 text-center text-white">
            <div className="text-sm font-medium">{callStatus === 'CALLING' ? 'Calling…' : callStatus === 'RINGING' ? 'Ringing…' : callStatus === 'CONNECTED' ? `${String(Math.floor(timer/60)).padStart(2,'0')}:${String(timer%60).padStart(2,'0')}` : ''}</div>
            {callStatus === 'CONNECTED' && <button onClick={endCall} className="mt-3 bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium"><Square className="w-3 h-3 inline mr-1" /> End Call</button>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Leads ───────────────────────────────────────────────────────────────
function LeadsView() {
  return <PlaceholderView icon={Users} title="Leads" desc="Lead management with CRM assignment, scoring, and status tracking." />
}
function CustomersView() {
  return <PlaceholderView icon={UserCircle2} title="Customers" desc="Customer workspace with timeline, notes, tasks, and follow-ups." />
}
function TasksView() {
  const [tasks, setTasks] = useState<any[]>([])
  useEffect(() => { api('/api/messages/crm/tasks?status=OPEN').then((r:any) => setTasks(r.tasks||[])).catch(() => {}) }, [])
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-[#0B1220] flex items-center gap-2"><CheckSquare className="w-5 h-5" /> Tasks</h1>
      {tasks.length === 0 ? <div className="text-center py-12 text-slate-400"><CheckSquare className="w-10 h-10 mx-auto opacity-30 mb-2" /><p className="text-sm">No open tasks.</p></div> :
        <div className="space-y-2">{tasks.map(t => (
          <div key={t._id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
            <div className="w-4 h-4 rounded border-2 border-slate-300" />
            <div className="flex-1"><div className="font-medium text-sm text-[#0B1220]">{t.title}</div><div className="text-xs text-slate-500">{t.priority} • {t.employeeName}</div></div>
          </div>
        ))}</div>}
    </div>
  )
}
function FollowupsView() {
  const [followups, setFollowups] = useState<any[]>([])
  useEffect(() => { api('/api/messages/crm/followups?upcoming=true').then((r:any) => setFollowups(r.followups||[])).catch(() => {}) }, [])
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-[#0B1220] flex items-center gap-2"><CalendarClock className="w-5 h-5" /> Follow-ups</h1>
      {followups.length === 0 ? <div className="text-center py-12 text-slate-400"><CalendarClock className="w-10 h-10 mx-auto opacity-30 mb-2" /><p className="text-sm">No upcoming follow-ups.</p></div> :
        <div className="space-y-2">{followups.map(f => (
          <div key={f._id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-[#F4C542]" />
            <div className="flex-1"><div className="font-medium text-sm text-[#0B1220]">{f.leadName || 'Unknown'}</div><div className="text-xs text-slate-500">{f.scheduledAt ? new Date(f.scheduledAt).toLocaleString() : ''} • {f.channel}</div></div>
          </div>
        ))}</div>}
    </div>
  )
}
function EmployeesView() {
  const [employees, setEmployees] = useState<any[]>([])
  useEffect(() => { api('/api/messages/crm/employees').then((r:any) => setEmployees(r.employees||[])).catch(() => {}) }, [])
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-[#0B1220] flex items-center gap-2"><IdCard className="w-5 h-5" /> Employees</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {employees.map(e => (
          <div key={e.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#0B1220] text-white flex items-center justify-center font-semibold">{e.name?.charAt(0)}</div>
              <div><div className="font-medium text-sm text-[#0B1220]">{e.name}</div><div className="text-xs text-slate-500">{e.title || e.role}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 rounded p-1.5"><div className="text-slate-500 uppercase text-[10px]">Calls</div><div className="font-semibold">{e.stats?.callsMade || 0}</div></div>
              <div className="bg-slate-50 rounded p-1.5"><div className="text-slate-500 uppercase text-[10px]">Messages</div><div className="font-semibold">{e.stats?.messagesSent || 0}</div></div>
              <div className="bg-slate-50 rounded p-1.5"><div className="text-slate-500 uppercase text-[10px]">Tasks</div><div className="font-semibold">{e.stats?.activeTasks || 0}</div></div>
              <div className="bg-slate-50 rounded p-1.5"><div className="text-slate-500 uppercase text-[10px]">Follow-ups</div><div className="font-semibold">{e.stats?.followupsScheduled || 0}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlaceholderView({ icon: Icon, title, desc }: any) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#0B1220] mb-2">{title}</h1>
      <p className="text-sm text-slate-500 mb-8">{desc}</p>
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400">
        <Icon className="w-12 h-12 mx-auto opacity-30 mb-3" />
        <p className="text-sm">This view is being populated with data from your MongoDB.</p>
      </div>
    </div>
  )
}
