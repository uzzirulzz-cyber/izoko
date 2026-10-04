import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Check,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Inbox,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  StickyNote,
  X,
} from 'lucide-react'

interface ServiceRequestsPanelProps {
  onToast?: (msg: string, kind?: 'ok' | 'err') => void
  /** Called after any mutation so the shell can refresh badges/KPIs. */
  onChanged?: () => void
}

type RequestStatus =
  | 'new'
  | 'contacted'
  | 'requirements_review'
  | 'proposal_draft'
  | 'proposal_sent'
  | 'negotiation'
  | 'approved'
  | 'in_progress'
  | 'waiting_customer'
  | 'completed'
  | 'cancelled'
  | 'archived'

interface RequestAttachment {
  name: string
  type?: string
  size?: number
  data: string
}

interface InternalNote {
  text: string
  author?: string
  at?: string
}

interface StatusHistoryEntry {
  status: string
  at?: string
  by?: string
}

interface ServiceRequest {
  _id: string
  requestId?: string
  fullName: string
  businessName?: string
  email?: string
  phone?: string
  country?: string
  city?: string
  industry?: string
  service?: string
  projectType?: string
  budget?: string
  timeline?: string
  status: RequestStatus | string
  assignedTo?: string
  estimatedQuote?: number | null
  finalQuote?: number | null
  createdAt?: string
}

interface RequestDetail extends ServiceRequest {
  description?: string
  features?: string[]
  notes?: string
  currentWebsite?: string
  attachments?: RequestAttachment[]
  internalNotes?: InternalNote[]
  statusHistory?: StatusHistoryEntry[]
  proposalFiles?: Array<string | RequestAttachment>
}

interface RequestStats {
  total?: number
  new?: number
  active?: number
  proposalSent?: number
  approved?: number
  completed?: number
  byStatus?: Record<string, number>
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

async function reqFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/admin/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
      ...(opts.headers || {}),
    },
    credentials: 'include',
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

const STATUS_META: Array<{ value: RequestStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'requirements_review', label: 'Requirements Review' },
  { value: 'proposal_draft', label: 'Proposal Draft' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_customer', label: 'Waiting for Customer' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' },
]

const statusLabel = (s?: string) =>
  STATUS_META.find((m) => m.value === s)?.label || (s || '—').replace(/_/g, ' ')

const STATUS_CHIP: Record<string, string> = {
  new: 'bg-blue-400/10 border-blue-400/30 text-blue-300',
  approved: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300',
  in_progress: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300',
  completed: 'bg-slate-400/10 border-slate-400/30 text-slate-300',
  cancelled: 'bg-rose-400/10 border-rose-400/30 text-rose-300',
  archived: 'bg-rose-400/10 border-rose-400/30 text-rose-300',
}

const statusChip = (status?: string) => (
  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border whitespace-nowrap ${STATUS_CHIP[status || ''] || 'bg-amber-400/10 border-amber-400/30 text-amber-300'}`}>
    {statusLabel(status).toUpperCase()}
  </span>
)

const fmtDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' })
    : '—'

const fmtDateTime = (v?: string) =>
  v
    ? new Date(v).toLocaleString('en', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—'

const fmtBytes = (n?: number) => {
  if (n === undefined || n === null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const fmtQuote = (v?: number | null) =>
  v === undefined || v === null ? '—' : `Rs ${Number(v).toLocaleString()}`

const inputCls =
  'mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40'

const KpiCard: React.FC<{ label: string; value?: number; hint: string; rail: string; tint: string; edge: string; glow: string }> = ({
  label,
  value,
  hint,
  rail,
  tint,
  edge,
  glow,
}) => (
  <div
    className="pa-kpi"
    style={{ ['--kpi-rail' as string]: rail, ['--kpi-tint' as string]: tint, ['--kpi-edge' as string]: edge, ['--kpi-glow' as string]: glow } as React.CSSProperties}
  >
    <div className="pl-2">
      <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-2xl font-black text-[color:var(--pa-text)] font-mono leading-none">{value ?? '—'}</div>
      <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">{hint}</div>
    </div>
  </div>
)

export const ServiceRequestsPanel: React.FC<ServiceRequestsPanelProps> = ({ onToast, onChanged }) => {
  const toast = useCallback(
    (msg: string, kind?: 'ok' | 'err') => { onToast?.(msg, kind) },
    [onToast],
  )

  const [stats, setStats] = useState<RequestStats | null>(null)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  const [assignedToDraft, setAssignedToDraft] = useState('')
  const [estQuoteDraft, setEstQuoteDraft] = useState('')
  const [finQuoteDraft, setFinQuoteDraft] = useState('')
  const [noteText, setNoteText] = useState('')
  const [savingField, setSavingField] = useState<string | null>(null)

  const guardAuth = useCallback((status: number) => {
    if (status === 401) {
      toast('Session expired — sign in again', 'err')
      return true
    }
    return false
  }, [toast])

  // Debounce search input → server query (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadStats = useCallback(async () => {
    const res = await reqFetch('service-requests?stats=1')
    if (guardAuth(res.status)) return
    if (res.data?.success) setStats(res.data.stats || null)
  }, [guardAuth])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const qs = new URLSearchParams()
    if (statusFilter !== 'all') qs.set('status', statusFilter)
    if (search) qs.set('q', search)
    const res = await reqFetch(`service-requests${qs.toString() ? `?${qs.toString()}` : ''}`)
    if (guardAuth(res.status)) {
      setLoading(false)
      return
    }
    if (res.data?.success) {
      setRequests(res.data.requests || [])
      setLoadError(false)
    } else {
      setLoadError(true)
    }
    setLoading(false)
  }, [guardAuth, statusFilter, search])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const refresh = useCallback(() => {
    loadStats()
    loadRequests()
  }, [loadStats, loadRequests])

  // ---------- detail ----------
  const loadDetail = useCallback(async (id: string, silent = false) => {
    if (!silent) setDetailLoading(true)
    setDetailError(false)
    const res = await reqFetch(`service-requests/${id}`)
    if (!silent) setDetailLoading(false)
    if (guardAuth(res.status)) return
    if (res.data?.success && res.data.request) {
      setDetail(res.data.request)
      setDetailError(false)
    } else if (!silent) {
      setDetailError(true)
    }
  }, [guardAuth])

  const openDetail = (id: string) => {
    setOpenId(id)
    setDetail(null)
    setNoteText('')
    loadDetail(id)
  }

  const closeDetail = () => {
    setOpenId(null)
    setDetail(null)
    setDetailError(false)
  }

  // Seed editable fields whenever a (new) request loads into the modal
  useEffect(() => {
    if (detail) {
      setAssignedToDraft(detail.assignedTo || '')
      setEstQuoteDraft(detail.estimatedQuote !== undefined && detail.estimatedQuote !== null ? String(detail.estimatedQuote) : '')
      setFinQuoteDraft(detail.finalQuote !== undefined && detail.finalQuote !== null ? String(detail.finalQuote) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?._id])

  const patchRequest = async (body: Record<string, unknown>) => {
    if (!detail) return false
    setSavingField(String(Object.keys(body)[0] || 'field'))
    const res = await reqFetch(`service-requests/${detail._id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    setSavingField(null)
    if (guardAuth(res.status)) return false
    if (res.data?.success) {
      const updated: RequestDetail | undefined = res.data.request
      if (updated) setDetail(updated)
      else loadDetail(detail._id, true)
      // keep the list row in sync
      setRequests((prev) => prev.map((r) => (r._id === detail._id ? { ...r, ...(body as Partial<ServiceRequest>) } : r)))
      toast('Request updated')
      loadStats()
      onChanged?.()
      return true
    }
    toast(res.data?.error || 'Update failed', 'err')
    return false
  }

  const commitAssignedTo = () => {
    if (!detail) return
    const next = assignedToDraft.trim()
    if (next === (detail.assignedTo || '')) return
    patchRequest({ assignedTo: next })
  }

  const commitQuote = (field: 'estimatedQuote' | 'finalQuote') => {
    if (!detail) return
    const raw = (field === 'estimatedQuote' ? estQuoteDraft : finQuoteDraft).trim()
    const next = raw === '' ? null : Number(raw)
    if (raw !== '' && Number.isNaN(next)) return
    const current = detail[field] ?? null
    if (next === null && current === null) return
    if (next !== null && current !== null && Number(current) === next) return
    patchRequest({ [field]: next })
  }

  const addNote = async () => {
    if (!detail || !noteText.trim()) return
    const ok = await patchRequest({ note: noteText.trim() })
    if (ok) setNoteText('')
  }

  const featuresList = Array.isArray(detail?.features)
    ? detail!.features!
    : typeof detail?.features === 'string'
      ? [detail!.features as unknown as string]
      : []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="pa-viewchip pa-chip--purple">
            <ClipboardList className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-[color:var(--pa-text)] tracking-tight">Service Requests</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Incoming project requests — triage, assign, quote and move each deal through the pipeline.
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="pa-iconbtn px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard label="New" value={stats?.new} hint="status: new" rail="#60a5fa" tint="rgba(96,165,250,0.1)" edge="rgba(96,165,250,0.22)" glow="rgba(96,165,250,0.3)" />
        <KpiCard label="Active" value={stats?.active} hint="contacted → negotiation" rail="#fbbf24" tint="rgba(251,191,36,0.1)" edge="rgba(251,191,36,0.22)" glow="rgba(251,191,36,0.3)" />
        <KpiCard label="Proposal Sent" value={stats?.proposalSent} hint="status: proposal_sent" rail="#38bdf8" tint="rgba(56,189,248,0.1)" edge="rgba(56,189,248,0.22)" glow="rgba(56,189,248,0.3)" />
        <KpiCard label="Approved / In Progress" value={stats?.approved} hint="approved + delivery" rail="#34d399" tint="rgba(52,211,153,0.1)" edge="rgba(52,211,153,0.22)" glow="rgba(52,211,153,0.3)" />
        <KpiCard label="Completed" value={stats?.completed} hint="delivered & closed" rail="#94a3b8" tint="rgba(148,163,184,0.1)" edge="rgba(148,163,184,0.22)" glow="rgba(148,163,184,0.3)" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | RequestStatus)}
          className="bg-[#07090E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[color:var(--pa-text)] focus:outline-none focus:border-amber-400/40"
        >
          <option value="all">All statuses</option>
          {STATUS_META.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[180px] max-w-md pa-search rounded-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, request ID…"
            className="w-full bg-[#07090E] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
          />
        </div>
      </div>

      {/* Error state */}
      {loadError && !loading && (
        <div className="pa-card pa-card--rose p-6 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
          <div className="text-sm font-bold text-[color:var(--pa-text)]">Could not load service requests</div>
          <p className="text-[11px] text-zinc-400">The server did not respond as expected. Check connectivity and try again.</p>
          <button onClick={loadRequests} className="pa-btn-gold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !loadError && (
        <div className="pa-card pa-card--slate p-10 text-center text-[11px] text-zinc-500">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
          Loading requests from MongoDB…
        </div>
      )}

      {/* Requests table */}
      {!loading && !loadError && (
        <div className="pa-tablewrap">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[color:var(--pa-text)]">Pipeline</h3>
            <span className="text-[10px] font-mono text-zinc-500">
              {requests.length} request{requests.length === 1 ? '' : 's'}
              {statusFilter !== 'all' ? ` · ${statusLabel(statusFilter)}` : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="pa-table w-full text-xs">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Phone</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Created</th>
                  <th className="text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                      <Inbox className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                      No requests yet — they will appear here when customers submit the project request form.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr
                      key={r._id}
                      onClick={() => openDetail(r._id)}
                      className="cursor-pointer"
                      title="Open request details"
                    >
                      <td className="font-mono text-[10px] text-sky-300 whitespace-nowrap">{r.requestId || r._id.slice(-8)}</td>
                      <td>
                        <div className="font-semibold text-[color:var(--pa-text)] max-w-[180px] truncate">{r.fullName}</div>
                        {r.businessName && <div className="text-[10px] text-zinc-500 truncate max-w-[180px]">{r.businessName}</div>}
                      </td>
                      <td className="text-zinc-300 max-w-[160px] truncate">{r.service || '—'}</td>
                      <td className="font-mono text-[11px] text-zinc-400 whitespace-nowrap">{r.phone || '—'}</td>
                      <td className="text-zinc-300 whitespace-nowrap">{r.budget || '—'}</td>
                      <td>{statusChip(r.status)}</td>
                      <td>
                        {r.assignedTo ? (
                          <span className="text-zinc-300">{r.assignedTo}</span>
                        ) : (
                          <span className="text-zinc-600 text-[11px] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="text-[11px] font-mono text-zinc-400 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetail(r._id) }}
                            title="Open details"
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-[color:var(--pa-text)] hover:bg-white/10 transition"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= DETAIL MODAL ================= */}
      {openId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0F131D] border border-white/10 shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-white/5 bg-[#0F131D]/95 backdrop-blur">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-[color:var(--pa-text)] truncate">{detail?.fullName || 'Request'}</h3>
                  {detail && statusChip(detail.status)}
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {detail?.requestId || openId}
                  {detail?.businessName ? ` · ${detail.businessName}` : ''}
                  {detail?.createdAt ? ` · submitted ${fmtDateTime(detail.createdAt)}` : ''}
                </p>
              </div>
              <button onClick={closeDetail} className="text-zinc-400 hover:text-[color:var(--pa-text)] shrink-0">
                <span className="sr-only">Close details</span>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loading / error / body */}
            {detailLoading ? (
              <div className="p-12 text-center text-[11px] text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Loading request details…
              </div>
            ) : detailError ? (
              <div className="p-10 text-center space-y-3">
                <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
                <p className="text-xs text-zinc-400">Could not load this request. It may have been deleted.</p>
                <button onClick={() => loadDetail(openId)} className="pa-btn-gold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : detail && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* ============ LEFT COLUMN ============ */}
                <div className="space-y-4 min-w-0">
                  {/* Customer info */}
                  <div className="pa-well p-4 space-y-2.5">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-sky-400" /> Customer
                    </h4>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Name</span>
                      <span className="text-[color:var(--pa-text)] font-semibold truncate">{detail.fullName || '—'}</span>
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Business</span>
                      <span className="text-[color:var(--pa-text)] truncate">{detail.businessName || '—'}</span>
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Email</span>
                      {detail.email ? (
                        <a href={`mailto:${detail.email}`} className="text-sky-300 hover:underline truncate">{detail.email}</a>
                      ) : (
                        <span className="text-[color:var(--pa-text)]">—</span>
                      )}
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Phone</span>
                      {detail.phone ? (
                        <a href={`tel:${detail.phone}`} className="text-sky-300 hover:underline">{detail.phone}</a>
                      ) : (
                        <span className="text-[color:var(--pa-text)]">—</span>
                      )}
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Location</span>
                      <span className="text-[color:var(--pa-text)] truncate">{[detail.city, detail.country].filter(Boolean).join(', ') || '—'}</span>
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Current website</span>
                      {detail.currentWebsite ? (
                        <a href={detail.currentWebsite} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline truncate">{detail.currentWebsite}</a>
                      ) : (
                        <span className="text-zinc-600 italic">none provided</span>
                      )}
                    </div>
                  </div>

                  {/* Project info */}
                  <div className="pa-well p-4 space-y-2.5">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-emerald-400" /> Project
                    </h4>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Service</span>
                      <span className="text-[color:var(--pa-text)] font-semibold truncate">{detail.service || '—'}</span>
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Project type</span>
                      <span className="text-[color:var(--pa-text)] truncate">{detail.projectType || '—'}</span>
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Budget</span>
                      <span className="text-[color:var(--pa-text)] truncate">{detail.budget || '—'}</span>
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Timeline</span>
                      <span className="text-[color:var(--pa-text)] truncate">{detail.timeline || '—'}</span>
                    </div>
                    <div className="pa-kv flex items-center justify-between gap-3 text-xs">
                      <span className="text-zinc-500 shrink-0">Industry</span>
                      <span className="text-[color:var(--pa-text)] truncate">{detail.industry || '—'}</span>
                    </div>
                  </div>

                  {/* Description + notes */}
                  <div className="space-y-2">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500">Description</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed bg-black/20 rounded-xl p-3 border border-white/5 whitespace-pre-wrap">
                      {detail.description || 'No description provided.'}
                    </p>
                    {detail.notes && (
                      <>
                        <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500 pt-1">Additional Notes</h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed bg-black/20 rounded-xl p-3 border border-white/5 whitespace-pre-wrap">
                          {detail.notes}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500">Requested Features</h4>
                    {featuresList.length === 0 ? (
                      <p className="text-[11px] text-zinc-500">No features listed.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {featuresList.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] text-zinc-300">
                            <Check className="w-3 h-3 text-emerald-400" /> {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-amber-400" /> Attachments
                    </h4>
                    {(detail.attachments || []).length === 0 ? (
                      <p className="text-[11px] text-zinc-500">No attachments submitted.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.attachments!.map((a, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 bg-black/20 border border-white/5 rounded-xl px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-[color:var(--pa-text)] truncate">{a.name || `file-${i + 1}`}</div>
                              <div className="text-[10px] text-zinc-500 font-mono">{a.type || 'file'} · {fmtBytes(a.size)}</div>
                            </div>
                            <a
                              href={a.data}
                              download={a.name || `file-${i + 1}`}
                              className="pa-btn-gold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 shrink-0"
                            >
                              <Download className="w-3 h-3" /> Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    {(detail.proposalFiles || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {detail.proposalFiles!.map((f, i) => {
                          const name = typeof f === 'string' ? f : f.name || `file-${i + 1}`
                          const data = typeof f === 'string' ? undefined : f.data
                          return data ? (
                            <a
                              key={i}
                              href={data}
                              download={name}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] text-zinc-300 hover:text-[color:var(--pa-text)] transition"
                            >
                              <FileText className="w-3 h-3 text-sky-400" /> {name}
                            </a>
                          ) : (
                            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] text-zinc-400">
                              <FileText className="w-3 h-3 text-sky-400" /> {name}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ============ RIGHT COLUMN ============ */}
                <div className="space-y-4 min-w-0">
                  {/* Status control */}
                  <div className="pa-well pa-well-hi p-4 space-y-2.5">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" /> Pipeline Status
                    </h4>
                    <select
                      value={String(detail.status || 'new')}
                      onChange={(e) => patchRequest({ status: e.target.value })}
                      disabled={savingField === 'status'}
                      className="w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] focus:outline-none focus:border-amber-400/40 disabled:opacity-60"
                    >
                      {STATUS_META.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-500">
                      {savingField === 'status' ? 'Saving…' : 'Changes save immediately.'}
                    </p>
                  </div>

                  {/* Assignment & quotes */}
                  <div className="pa-well p-4 space-y-3">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500">Assignment & Quotes</h4>
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Assigned Staff</span>
                      <input
                        value={assignedToDraft}
                        onChange={(e) => setAssignedToDraft(e.target.value)}
                        onBlur={commitAssignedTo}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        placeholder="e.g. Sarah K."
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Estimated Quote (Rs)</span>
                      <input
                        type="number"
                        value={estQuoteDraft}
                        onChange={(e) => setEstQuoteDraft(e.target.value)}
                        onBlur={() => commitQuote('estimatedQuote')}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        placeholder="e.g. 250000"
                        className={inputCls}
                      />
                      <span className="block text-[10px] text-zinc-600 mt-1 font-mono">current: {fmtQuote(detail.estimatedQuote)}</span>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Final Quote (Rs)</span>
                      <input
                        type="number"
                        value={finQuoteDraft}
                        onChange={(e) => setFinQuoteDraft(e.target.value)}
                        onBlur={() => commitQuote('finalQuote')}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        placeholder="e.g. 225000"
                        className={inputCls}
                      />
                      <span className="block text-[10px] text-zinc-600 mt-1 font-mono">current: {fmtQuote(detail.finalQuote)}</span>
                    </label>
                    <p className="text-[10px] text-zinc-500">
                      {savingField === 'assignedTo' || savingField === 'estimatedQuote' || savingField === 'finalQuote'
                        ? 'Saving…'
                        : 'Click outside a field (or press Enter) to save.'}
                    </p>
                  </div>

                  {/* Internal notes */}
                  <div className="pa-well p-4 space-y-2.5">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <StickyNote className="w-3.5 h-3.5 text-amber-400" /> Internal Notes
                    </h4>
                    {(detail.internalNotes || []).length === 0 ? (
                      <p className="text-[11px] text-zinc-500">No internal notes yet — staff-only, never shown to the customer.</p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {detail.internalNotes!.map((n, i) => (
                          <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-2.5">
                            <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                            <p className="text-[10px] font-mono text-zinc-600 mt-1.5">
                              {n.author || 'staff'} · {fmtDateTime(n.at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      placeholder="Add an internal note (never shown to the customer)…"
                      className="w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                    />
                    <button
                      onClick={addNote}
                      disabled={!noteText.trim() || savingField === 'note'}
                      className="pa-btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {savingField === 'note' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StickyNote className="w-3.5 h-3.5" />}
                      Add Note
                    </button>
                  </div>

                  {/* Status history */}
                  <div className="pa-well p-4 space-y-3">
                    <h4 className="pa-section-title text-[10px] font-mono uppercase tracking-wider text-zinc-500">Status History</h4>
                    {(detail.statusHistory || []).length === 0 ? (
                      <p className="text-[11px] text-zinc-500">No status changes recorded yet.</p>
                    ) : (
                      <div className="max-h-56 overflow-y-auto pr-1">
                        {[...(detail.statusHistory || [])].reverse().map((h, i, arr) => (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${i === 0 ? 'bg-sky-400' : 'bg-zinc-600'}`} />
                              {i < arr.length - 1 && <span className="w-px flex-1 bg-white/10 my-1" />}
                            </div>
                            <div className="pb-3 min-w-0">
                              <div className="text-[11px] font-bold text-[color:var(--pa-text)]">{statusLabel(h.status)}</div>
                              <div className="text-[10px] font-mono text-zinc-500">
                                {fmtDateTime(h.at)}{h.by ? ` · by ${h.by}` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceRequestsPanel
