import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Inbox,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
  icons as LucideIcons,
  type LucideIcon,
} from 'lucide-react'

interface ServicesPanelProps {
  onToast?: (msg: string, kind?: 'ok' | 'err') => void
}

interface ServiceSection {
  heading: string
  body: string
  items: string[]
}

interface ServiceDoc {
  _id: string
  slug: string
  title: string
  category: string
  tagline?: string
  shortDescription?: string
  sections?: ServiceSection[]
  features?: string[]
  ctaLabel?: string
  seoTitle?: string
  seoDescription?: string
  icon?: string
  displayOrder?: number
  featured?: boolean
  published?: boolean
  updatedAt?: string
}

interface PortfolioItem {
  _id: string
  slug: string
  title: string
  industry?: string
  service?: string
  description?: string
  problem?: string
  solution?: string
  features?: string[]
  results?: string
  techSummary?: string
  clientName?: string
  showClientName?: boolean
  featured?: boolean
  published?: boolean
  updatedAt?: string
}

interface SectionDraft {
  heading: string
  body: string
  itemsText: string
}

interface ServiceDraft {
  title: string
  slug: string
  slugTouched: boolean
  category: string
  icon: string
  tagline: string
  shortDescription: string
  ctaLabel: string
  displayOrder: string
  featured: boolean
  published: boolean
  seoTitle: string
  seoDescription: string
  featuresText: string
  sections: SectionDraft[]
}

interface PortfolioDraft {
  title: string
  slug: string
  slugTouched: boolean
  industry: string
  service: string
  description: string
  problem: string
  solution: string
  featuresText: string
  results: string
  techSummary: string
  clientName: string
  showClientName: boolean
  featured: boolean
  published: boolean
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

async function svcFetch(path: string, opts: RequestInit = {}) {
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

const CATEGORIES = ['development', 'business', 'creative', 'advanced'] as const

const CATEGORY_CHIP: Record<string, string> = {
  development: 'bg-sky-400/10 border-sky-400/30 text-sky-300',
  business: 'bg-amber-400/10 border-amber-400/30 text-amber-300',
  creative: 'bg-fuchsia-400/10 border-fuchsia-400/30 text-fuchsia-300',
  advanced: 'bg-rose-400/10 border-rose-400/30 text-rose-300',
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const lines = (s: string) =>
  s.split('\n').map((l) => l.trim()).filter(Boolean)

const fmtDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString('en', { month: 'short', day: '2-digit', year: 'numeric' })
    : '—'

const resolveIcon = (name?: string): LucideIcon => {
  const key = (name || '').trim()
  if (key && Object.prototype.hasOwnProperty.call(LucideIcons, key)) {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[key]
  }
  return Sparkles
}

const IconPreview: React.FC<{ name?: string; className?: string }> = ({ name, className }) => {
  const Icon = resolveIcon(name)
  return <Icon className={className} />
}

const emptyServiceDraft = (): ServiceDraft => ({
  title: '',
  slug: '',
  slugTouched: false,
  category: 'development',
  icon: 'Sparkles',
  tagline: '',
  shortDescription: '',
  ctaLabel: 'Request this Service',
  displayOrder: '0',
  featured: false,
  published: true,
  seoTitle: '',
  seoDescription: '',
  featuresText: '',
  sections: [],
})

const toServiceDraft = (d: ServiceDoc): ServiceDraft => ({
  title: d.title || '',
  slug: d.slug || '',
  slugTouched: true,
  category: CATEGORIES.includes(d.category as (typeof CATEGORIES)[number]) ? d.category : 'development',
  icon: d.icon || 'Sparkles',
  tagline: d.tagline || '',
  shortDescription: d.shortDescription || '',
  ctaLabel: d.ctaLabel || '',
  displayOrder: String(d.displayOrder ?? 0),
  featured: Boolean(d.featured),
  published: d.published !== false,
  seoTitle: d.seoTitle || '',
  seoDescription: d.seoDescription || '',
  featuresText: (d.features || []).join('\n'),
  sections: (d.sections || []).map((s) => ({
    heading: s.heading || '',
    body: s.body || '',
    itemsText: (s.items || []).join('\n'),
  })),
})

const emptyPortfolioDraft = (): PortfolioDraft => ({
  title: '',
  slug: '',
  slugTouched: false,
  industry: '',
  service: '',
  description: '',
  problem: '',
  solution: '',
  featuresText: '',
  results: '',
  techSummary: '',
  clientName: '',
  showClientName: false,
  featured: false,
  published: true,
})

const toPortfolioDraft = (d: PortfolioItem): PortfolioDraft => ({
  title: d.title || '',
  slug: d.slug || '',
  slugTouched: true,
  industry: d.industry || '',
  service: d.service || '',
  description: d.description || '',
  problem: d.problem || '',
  solution: d.solution || '',
  featuresText: (d.features || []).join('\n'),
  results: d.results || '',
  techSummary: d.techSummary || '',
  clientName: d.clientName || '',
  showClientName: Boolean(d.showClientName),
  featured: Boolean(d.featured),
  published: d.published !== false,
})

export const ServicesPanel: React.FC<ServicesPanelProps> = ({ onToast }) => {
  const toast = useCallback(
    (msg: string, kind?: 'ok' | 'err') => { onToast?.(msg, kind) },
    [onToast],
  )

  const [tab, setTab] = useState<'services' | 'portfolio'>('services')
  const [services, setServices] = useState<ServiceDoc[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | (typeof CATEGORIES)[number]>('all')

  const [editorKind, setEditorKind] = useState<'service' | 'portfolio' | null>(null)
  const [editingService, setEditingService] = useState<ServiceDoc | null>(null)
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioItem | null>(null)
  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>(emptyServiceDraft())
  const [portfolioDraft, setPortfolioDraft] = useState<PortfolioDraft>(emptyPortfolioDraft())
  const [saving, setSaving] = useState(false)

  const [busyFlag, setBusyFlag] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const guardAuth = useCallback((status: number) => {
    if (status === 401) {
      toast('Session expired — sign in again', 'err')
      return true
    }
    return false
  }, [toast])

  const loadServices = useCallback(async () => {
    const res = await svcFetch('services')
    if (guardAuth(res.status)) return
    if (res.data?.success) {
      setServices(res.data.services || [])
    } else {
      setLoadError(true)
    }
  }, [guardAuth])

  const loadPortfolio = useCallback(async () => {
    const res = await svcFetch('services-portfolio')
    if (guardAuth(res.status)) return
    if (res.data?.success) {
      setPortfolio(res.data.portfolio || [])
    } else {
      setLoadError(true)
    }
  }, [guardAuth])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    await Promise.all([loadServices(), loadPortfolio()])
    setLoading(false)
  }, [loadServices, loadPortfolio])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ---------- row actions ----------
  const toggleFlag = async (kind: 'service' | 'portfolio', doc: ServiceDoc | PortfolioItem, flag: 'featured' | 'published') => {
    const key = `${kind}:${flag}:${doc._id}`
    setBusyFlag(key)
    const base = kind === 'service' ? 'services' : 'services-portfolio'
    const res = await svcFetch(`${base}/${doc._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [flag]: !doc[flag] }),
    })
    setBusyFlag(null)
    if (guardAuth(res.status)) return
    if (res.data?.success) {
      const updated = res.data.service || res.data.portfolio || null
      if (kind === 'service') {
        setServices((prev) => prev.map((s) => (s._id === doc._id ? (updated || { ...s, [flag]: !doc[flag] }) : s)))
      } else {
        setPortfolio((prev) => prev.map((p) => (p._id === doc._id ? (updated || { ...p, [flag]: !doc[flag] }) : p)))
      }
      toast(`Service ${flag} ${!doc[flag] ? 'enabled' : 'disabled'}`)
    } else {
      toast(res.data?.error || 'Update failed', 'err')
    }
  }

  const deleteDoc = async (kind: 'service' | 'portfolio', doc: ServiceDoc | PortfolioItem) => {
    const label = kind === 'service' ? 'service' : 'portfolio project'
    if (!window.confirm(`Delete the ${label} "${doc.title}"? This cannot be undone.`)) return
    setDeletingId(doc._id)
    const base = kind === 'service' ? 'services' : 'services-portfolio'
    const res = await svcFetch(`${base}/${doc._id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (guardAuth(res.status)) return
    if (res.data?.success) {
      if (kind === 'service') setServices((prev) => prev.filter((s) => s._id !== doc._id))
      else setPortfolio((prev) => prev.filter((p) => p._id !== doc._id))
      toast(`${kind === 'service' ? 'Service' : 'Portfolio project'} deleted`)
    } else {
      toast(res.data?.error || 'Delete failed', 'err')
    }
  }

  // ---------- services editor ----------
  const openNewService = () => {
    setEditingService(null)
    setServiceDraft(emptyServiceDraft())
    setEditorKind('service')
  }

  const openEditService = (s: ServiceDoc) => {
    setEditingService(s)
    setServiceDraft(toServiceDraft(s))
    setEditorKind('service')
  }

  const patchServiceDraft = (patch: Partial<ServiceDraft>) =>
    setServiceDraft((prev) => ({ ...prev, ...patch }))

  const setServiceTitle = (title: string) =>
    setServiceDraft((prev) => ({
      ...prev,
      title,
      slug: prev.slugTouched ? prev.slug : slugify(title),
    }))

  const setServiceSlug = (slug: string) =>
    setServiceDraft((prev) => ({ ...prev, slug, slugTouched: true }))

  const addSection = () =>
    setServiceDraft((prev) => ({ ...prev, sections: [...prev.sections, { heading: '', body: '', itemsText: '' }] }))

  const patchSection = (idx: number, patch: Partial<SectionDraft>) =>
    setServiceDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }))

  const removeSection = (idx: number) =>
    setServiceDraft((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }))

  const saveService = async () => {
    if (!serviceDraft.title.trim()) {
      toast('Title is required', 'err')
      return
    }
    setSaving(true)
    const payload = {
      title: serviceDraft.title.trim(),
      slug: (serviceDraft.slug || slugify(serviceDraft.title)).trim(),
      category: serviceDraft.category,
      icon: serviceDraft.icon.trim() || 'Sparkles',
      tagline: serviceDraft.tagline.trim(),
      shortDescription: serviceDraft.shortDescription.trim(),
      ctaLabel: serviceDraft.ctaLabel.trim(),
      displayOrder: Number(serviceDraft.displayOrder) || 0,
      featured: serviceDraft.featured,
      published: serviceDraft.published,
      seoTitle: serviceDraft.seoTitle.trim(),
      seoDescription: serviceDraft.seoDescription.trim(),
      features: lines(serviceDraft.featuresText),
      sections: serviceDraft.sections.map((s) => ({
        heading: s.heading.trim(),
        body: s.body.trim(),
        items: lines(s.itemsText),
      })),
    }
    const res = editingService
      ? await svcFetch(`services/${editingService._id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : await svcFetch('services', { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (guardAuth(res.status)) return
    if (res.data?.success) {
      setEditorKind(null)
      toast(editingService ? 'Service saved' : 'Service created')
      loadServices()
    } else {
      toast(res.data?.error || 'Save failed', 'err')
    }
  }

  // ---------- portfolio editor ----------
  const openNewPortfolio = () => {
    setEditingPortfolio(null)
    setPortfolioDraft(emptyPortfolioDraft())
    setEditorKind('portfolio')
  }

  const openEditPortfolio = (p: PortfolioItem) => {
    setEditingPortfolio(p)
    setPortfolioDraft(toPortfolioDraft(p))
    setEditorKind('portfolio')
  }

  const patchPortfolioDraft = (patch: Partial<PortfolioDraft>) =>
    setPortfolioDraft((prev) => ({ ...prev, ...patch }))

  const setPortfolioTitle = (title: string) =>
    setPortfolioDraft((prev) => ({
      ...prev,
      title,
      slug: prev.slugTouched ? prev.slug : slugify(title),
    }))

  const setPortfolioSlug = (slug: string) =>
    setPortfolioDraft((prev) => ({ ...prev, slug, slugTouched: true }))

  const savePortfolio = async () => {
    if (!portfolioDraft.title.trim()) {
      toast('Title is required', 'err')
      return
    }
    setSaving(true)
    const payload = {
      title: portfolioDraft.title.trim(),
      slug: (portfolioDraft.slug || slugify(portfolioDraft.title)).trim(),
      industry: portfolioDraft.industry.trim(),
      service: portfolioDraft.service.trim(),
      description: portfolioDraft.description.trim(),
      problem: portfolioDraft.problem.trim(),
      solution: portfolioDraft.solution.trim(),
      features: lines(portfolioDraft.featuresText),
      results: portfolioDraft.results.trim(),
      techSummary: portfolioDraft.techSummary.trim(),
      clientName: portfolioDraft.clientName.trim(),
      showClientName: portfolioDraft.showClientName,
      featured: portfolioDraft.featured,
      published: portfolioDraft.published,
    }
    const res = editingPortfolio
      ? await svcFetch(`services-portfolio/${editingPortfolio._id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : await svcFetch('services-portfolio', { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (guardAuth(res.status)) return
    if (res.data?.success) {
      setEditorKind(null)
      toast(editingPortfolio ? 'Portfolio project saved' : 'Portfolio project created')
      loadPortfolio()
    } else {
      toast(res.data?.error || 'Save failed', 'err')
    }
  }

  // ---------- derived ----------
  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
      if (!q) return true
      return (s.title || '').toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q)
    })
  }, [services, search, categoryFilter])

  const filteredPortfolio = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return portfolio
    return portfolio.filter(
      (p) => (p.title || '').toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q),
    )
  }, [portfolio, search])

  const categoryChip = (cat?: string) => (
    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${CATEGORY_CHIP[cat || ''] || 'bg-zinc-400/10 border-zinc-400/20 text-zinc-400'}`}>
      {(cat || 'uncategorised').toUpperCase()}
    </span>
  )

  const flagToggle = (
    kind: 'service' | 'portfolio',
    doc: ServiceDoc | PortfolioItem,
    flag: 'featured' | 'published',
  ) => {
    const isOn = Boolean(doc[flag])
    const busy = busyFlag === `${kind}:${flag}:${doc._id}`
    if (flag === 'featured') {
      return (
        <button
          onClick={() => toggleFlag(kind, doc, 'featured')}
          disabled={busy}
          title={isOn ? 'Unmark featured' : 'Mark featured'}
          className="p-1.5 rounded-lg hover:bg-white/5 transition disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
          ) : (
            <Star className={`w-3.5 h-3.5 ${isOn ? 'text-amber-300 fill-amber-300' : 'text-zinc-500'}`} />
          )}
        </button>
      )
    }
    return (
      <button
        onClick={() => toggleFlag(kind, doc, 'published')}
        disabled={busy}
        title={isOn ? 'Unpublish (hide from public site)' : 'Publish (visible on public site)'}
        className="p-1.5 rounded-lg hover:bg-white/5 transition disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
        ) : isOn ? (
          <Eye className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>
    )
  }

  const rowActions = (kind: 'service' | 'portfolio', doc: ServiceDoc | PortfolioItem) => (
    <div className="flex gap-1.5 justify-end">
      <button
        onClick={() => (kind === 'service' ? openEditService(doc as ServiceDoc) : openEditPortfolio(doc as PortfolioItem))}
        title="Edit"
        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-[color:var(--pa-text)] hover:bg-white/10 transition"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => deleteDoc(kind, doc)}
        disabled={deletingId === doc._id}
        title="Delete"
        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
      >
        {deletingId === doc._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="pa-viewchip pa-chip--sky">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-[color:var(--pa-text)] tracking-tight">Services CMS</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage the public service catalogue and portfolio case studies — content, SEO, ordering and visibility.
            </p>
          </div>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="pa-iconbtn px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('services')}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold transition ${
            tab === 'services' ? 'pa-btn-gold' : 'pa-well text-zinc-400 hover:text-[color:var(--pa-text)]'
          }`}
        >
          SERVICES <span className="ml-1 opacity-70">{services.length}</span>
        </button>
        <button
          onClick={() => setTab('portfolio')}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-semibold transition ${
            tab === 'portfolio' ? 'pa-btn-gold' : 'pa-well text-zinc-400 hover:text-[color:var(--pa-text)]'
          }`}
        >
          PORTFOLIO <span className="ml-1 opacity-70">{portfolio.length}</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-md pa-search rounded-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'services' ? 'Search services by title or slug…' : 'Search projects by title or slug…'}
            className="w-full bg-[#07090E] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
          />
        </div>
        {tab === 'services' && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | (typeof CATEGORIES)[number])}
            className="bg-[#07090E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[color:var(--pa-text)] focus:outline-none focus:border-amber-400/40"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <button
          onClick={tab === 'services' ? openNewService : openNewPortfolio}
          className="pa-btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          {tab === 'services' ? 'New Service' : 'New Project'}
        </button>
      </div>

      {/* Error state */}
      {loadError && !loading && (
        <div className="pa-card pa-card--rose p-6 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
          <div className="text-sm font-bold text-[color:var(--pa-text)]">Could not load CMS content</div>
          <p className="text-[11px] text-zinc-400">The server did not respond as expected. Check connectivity and try again.</p>
          <button onClick={loadAll} className="pa-btn-gold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="pa-card pa-card--slate p-10 text-center text-[11px] text-zinc-500">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
          Loading services and portfolio from MongoDB…
        </div>
      )}

      {/* ================= SERVICES TAB ================= */}
      {!loading && tab === 'services' && (
        <div className="pa-tablewrap">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[color:var(--pa-text)]">Service Catalogue</h3>
            <span className="text-[10px] font-mono text-zinc-500">{filteredServices.length} of {services.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="pa-table w-full text-xs">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Icon</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Featured</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                      <Inbox className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                      No services yet — click "New Service" to publish your first catalogue entry.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((s) => {
                    const Icon = resolveIcon(s.icon)
                    return (
                      <tr key={s._id}>
                        <td className="font-mono text-zinc-400">{s.displayOrder ?? 0}</td>
                        <td>
                          <span className="pa-well w-8 h-8 rounded-lg flex items-center justify-center" title={s.icon || 'Sparkles'}>
                            <Icon className="w-4 h-4 text-sky-300" />
                          </span>
                        </td>
                        <td>
                          <div className="font-semibold text-[color:var(--pa-text)] max-w-xs truncate">{s.title}</div>
                          <div className="text-[10px] font-mono text-zinc-500">/{s.slug}</div>
                        </td>
                        <td>{categoryChip(s.category)}</td>
                        <td>{flagToggle('service', s, 'featured')}</td>
                        <td>{flagToggle('service', s, 'published')}</td>
                        <td className="text-[11px] font-mono text-zinc-400">{fmtDate(s.updatedAt)}</td>
                        <td>{rowActions('service', s)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= PORTFOLIO TAB ================= */}
      {!loading && tab === 'portfolio' && (
        <div className="pa-tablewrap">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[color:var(--pa-text)]">Portfolio Case Studies</h3>
            <span className="text-[10px] font-mono text-zinc-500">{filteredPortfolio.length} of {portfolio.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="pa-table w-full text-xs">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Industry</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Featured</th>
                  <th>Published</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPortfolio.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                      <Inbox className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                      No portfolio projects yet — click "New Project" to add your first case study.
                    </td>
                  </tr>
                ) : (
                  filteredPortfolio.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <div className="font-semibold text-[color:var(--pa-text)] max-w-xs truncate">{p.title}</div>
                        <div className="text-[10px] font-mono text-zinc-500">/{p.slug}</div>
                      </td>
                      <td className="text-zinc-300">{p.industry || '—'}</td>
                      <td className="text-zinc-300 max-w-[160px] truncate">{p.service || '—'}</td>
                      <td>
                        <div className="font-semibold text-[color:var(--pa-text)]">{p.clientName || '—'}</div>
                        {!p.showClientName && (
                          <span className="mt-1 inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border bg-rose-400/10 border-rose-400/30 text-rose-300">
                            HIDDEN
                          </span>
                        )}
                      </td>
                      <td>{flagToggle('portfolio', p, 'featured')}</td>
                      <td>{flagToggle('portfolio', p, 'published')}</td>
                      <td className="text-[11px] font-mono text-zinc-400">{fmtDate(p.updatedAt)}</td>
                      <td>{rowActions('portfolio', p)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= SERVICE EDITOR MODAL ================= */}
      {editorKind === 'service' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0F131D] border border-white/10 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0F131D]/95 backdrop-blur">
              <h3 className="text-sm font-bold text-[color:var(--pa-text)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                {editingService ? `Edit Service — ${editingService.title}` : 'New Service'}
              </h3>
              <button onClick={() => setEditorKind(null)} className="text-zinc-400 hover:text-[color:var(--pa-text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Title *</span>
                  <input
                    value={serviceDraft.title}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="e.g. Web Application Development"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Slug (URL)</span>
                  <input
                    value={serviceDraft.slug}
                    onChange={(e) => setServiceSlug(e.target.value)}
                    placeholder="auto-generated from title"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Category</span>
                  <select
                    value={serviceDraft.category}
                    onChange={(e) => patchServiceDraft({ category: e.target.value })}
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] focus:outline-none focus:border-amber-400/40"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Icon (lucide name)</span>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      value={serviceDraft.icon}
                      onChange={(e) => patchServiceDraft({ icon: e.target.value })}
                      placeholder="e.g. Code2, Briefcase, Palette"
                      className="flex-1 min-w-0 bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                    />
                    <span className="pa-well w-10 h-10 rounded-xl flex items-center justify-center shrink-0" title="Icon preview">
                      <IconPreview name={serviceDraft.icon} className="w-4 h-4 text-sky-300" />
                    </span>
                  </div>
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Display Order</span>
                  <input
                    type="number"
                    value={serviceDraft.displayOrder}
                    onChange={(e) => patchServiceDraft({ displayOrder: e.target.value })}
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-[color:var(--pa-text)] focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Tagline</span>
                  <input
                    value={serviceDraft.tagline}
                    onChange={(e) => patchServiceDraft({ tagline: e.target.value })}
                    placeholder="One-line hook shown under the service title"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Short Description</span>
                  <textarea
                    value={serviceDraft.shortDescription}
                    onChange={(e) => patchServiceDraft({ shortDescription: e.target.value })}
                    rows={2}
                    placeholder="Card summary used on the services grid"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">CTA Label</span>
                  <input
                    value={serviceDraft.ctaLabel}
                    onChange={(e) => patchServiceDraft({ ctaLabel: e.target.value })}
                    placeholder="e.g. Request this Service"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 pa-well px-3 py-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={serviceDraft.featured}
                      onChange={(e) => patchServiceDraft({ featured: e.target.checked })}
                      className="w-4 h-4 accent-amber-400"
                    />
                    <span className="text-xs text-zinc-300 font-semibold">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 pa-well px-3 py-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={serviceDraft.published}
                      onChange={(e) => patchServiceDraft({ published: e.target.checked })}
                      className="w-4 h-4 accent-emerald-400"
                    />
                    <span className="text-xs text-zinc-300 font-semibold">Published</span>
                  </label>
                </div>
              </div>

              {/* SEO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">SEO Title</span>
                  <input
                    value={serviceDraft.seoTitle}
                    onChange={(e) => patchServiceDraft({ seoTitle: e.target.value })}
                    placeholder="Browser tab / search result title"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">SEO Description</span>
                  <textarea
                    value={serviceDraft.seoDescription}
                    onChange={(e) => patchServiceDraft({ seoDescription: e.target.value })}
                    rows={2}
                    placeholder="Meta description for search engines"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                  />
                </label>
              </div>

              {/* Features */}
              <label className="block">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Features (one per line)</span>
                <textarea
                  value={serviceDraft.featuresText}
                  onChange={(e) => patchServiceDraft({ featuresText: e.target.value })}
                  rows={4}
                  placeholder={'Custom UI/UX design\nAPI integrations\nDeployments & hosting'}
                  className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                />
              </label>

              {/* Sections */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Content Sections</span>
                  <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-semibold text-zinc-300 hover:text-[color:var(--pa-text)] transition"
                  >
                    <Plus className="w-3 h-3" /> Add Section
                  </button>
                </div>
                {serviceDraft.sections.length === 0 && (
                  <p className="text-[11px] text-zinc-500">
                    No sections yet — add blocks like "What you get", "Our process" or "Deliverables".
                  </p>
                )}
                {serviceDraft.sections.map((sec, i) => (
                  <div key={i} className="pa-well p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="pa-chip pa-chip--sky">{i + 1}</span>
                      <input
                        value={sec.heading}
                        onChange={(e) => patchSection(i, { heading: e.target.value })}
                        placeholder={`Section ${i + 1} heading`}
                        className="flex-1 min-w-0 bg-[#07090E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(i)}
                        title="Remove section"
                        className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      value={sec.body}
                      onChange={(e) => patchSection(i, { body: e.target.value })}
                      rows={3}
                      placeholder="Section body text…"
                      className="w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                    />
                    <textarea
                      value={sec.itemsText}
                      onChange={(e) => patchSection(i, { itemsText: e.target.value })}
                      rows={2}
                      placeholder="List items — one per line"
                      className="w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-white/5 bg-[#0F131D]/95 backdrop-blur">
              <button
                onClick={() => setEditorKind(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-[color:var(--pa-text)] transition"
              >
                Cancel
              </button>
              <button
                onClick={saveService}
                disabled={saving}
                className="pa-btn-gold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : editingService ? 'Save Changes' : 'Create Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PORTFOLIO EDITOR MODAL ================= */}
      {editorKind === 'portfolio' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0F131D] border border-white/10 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0F131D]/95 backdrop-blur">
              <h3 className="text-sm font-bold text-[color:var(--pa-text)] flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                {editingPortfolio ? `Edit Project — ${editingPortfolio.title}` : 'New Portfolio Project'}
              </h3>
              <button onClick={() => setEditorKind(null)} className="text-zinc-400 hover:text-[color:var(--pa-text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Title *</span>
                  <input
                    value={portfolioDraft.title}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    placeholder="e.g. FinTech Dashboard for Meridian Capital"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Slug (URL)</span>
                  <input
                    value={portfolioDraft.slug}
                    onChange={(e) => setPortfolioSlug(e.target.value)}
                    placeholder="auto-generated from title"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Industry</span>
                  <input
                    value={portfolioDraft.industry}
                    onChange={(e) => patchPortfolioDraft({ industry: e.target.value })}
                    placeholder="e.g. Fintech, Healthcare, Retail"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Service</span>
                  <input
                    value={portfolioDraft.service}
                    onChange={(e) => patchPortfolioDraft({ service: e.target.value })}
                    placeholder="Related service, e.g. Web Application Development"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Description</span>
                  <textarea
                    value={portfolioDraft.description}
                    onChange={(e) => patchPortfolioDraft({ description: e.target.value })}
                    rows={3}
                    placeholder="What the project was and what was built"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Problem</span>
                  <textarea
                    value={portfolioDraft.problem}
                    onChange={(e) => patchPortfolioDraft({ problem: e.target.value })}
                    rows={2}
                    placeholder="The challenge the client faced"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Solution</span>
                  <textarea
                    value={portfolioDraft.solution}
                    onChange={(e) => patchPortfolioDraft({ solution: e.target.value })}
                    rows={2}
                    placeholder="How the team solved it"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Features (one per line)</span>
                  <textarea
                    value={portfolioDraft.featuresText}
                    onChange={(e) => patchPortfolioDraft({ featuresText: e.target.value })}
                    rows={3}
                    placeholder={'Realtime analytics\nRole-based access control'}
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Results</span>
                  <textarea
                    value={portfolioDraft.results}
                    onChange={(e) => patchPortfolioDraft({ results: e.target.value })}
                    rows={2}
                    placeholder="Outcome metrics, e.g. 3× faster reporting, 40% cost reduction"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Tech Summary</span>
                  <input
                    value={portfolioDraft.techSummary}
                    onChange={(e) => patchPortfolioDraft({ techSummary: e.target.value })}
                    placeholder="e.g. Next.js, Node.js, PostgreSQL, AWS"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Client Name</span>
                  <input
                    value={portfolioDraft.clientName}
                    onChange={(e) => patchPortfolioDraft({ clientName: e.target.value })}
                    placeholder="e.g. Meridian Capital"
                    className="mt-1.5 w-full bg-[#07090E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[color:var(--pa-text)] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                </label>
                <div className="flex items-end">
                  <label className="pa-well pa-well-hi px-3 py-2.5 flex items-start gap-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={portfolioDraft.showClientName}
                      onChange={(e) => patchPortfolioDraft({ showClientName: e.target.checked })}
                      className="mt-0.5 w-4 h-4 accent-sky-400"
                    />
                    <span>
                      <span className="block text-xs text-[color:var(--pa-text)] font-semibold">Show client name publicly</span>
                      <span className="block text-[10px] text-zinc-500 mt-0.5">
                        Client names are HIDDEN on the public site unless enabled.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="flex items-end gap-2 sm:col-span-2">
                  <label className="flex items-center gap-2 pa-well px-3 py-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={portfolioDraft.featured}
                      onChange={(e) => patchPortfolioDraft({ featured: e.target.checked })}
                      className="w-4 h-4 accent-amber-400"
                    />
                    <span className="text-xs text-zinc-300 font-semibold">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 pa-well px-3 py-2.5 cursor-pointer select-none flex-1">
                    <input
                      type="checkbox"
                      checked={portfolioDraft.published}
                      onChange={(e) => patchPortfolioDraft({ published: e.target.checked })}
                      className="w-4 h-4 accent-emerald-400"
                    />
                    <span className="text-xs text-zinc-300 font-semibold">Published</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-white/5 bg-[#0F131D]/95 backdrop-blur">
              <button
                onClick={() => setEditorKind(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-[color:var(--pa-text)] transition"
              >
                Cancel
              </button>
              <button
                onClick={savePortfolio}
                disabled={saving}
                className="pa-btn-gold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : editingPortfolio ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesPanel
