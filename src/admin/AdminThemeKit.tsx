import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Check, ChevronRight, Command as CommandIcon, Search, X, AlertTriangle, CheckCircle2,
  Info, AlertCircle, Plus, Package, FileSpreadsheet, Key, Megaphone, Users, LayoutDashboard,
  ShoppingBag, Tag, BarChart3, LayoutTemplate, UserCog, Palette, Minimize2, Maximize2,
  Filter, Sparkles, RefreshCw, Loader2, MousePointerClick, Eye, ShoppingCart, CreditCard,
  Inbox, TrendingUp, TrendingDown, MoreHorizontal, Pencil, Trash2, Layers, SlidersHorizontal,
} from 'lucide-react'

/* ============================================================
   PLAYBEAT ADMIN — PREMIUM UI KIT
   Theme system · command palette · toasts · badges · skeletons
   empty and error states · metric cards · funnel · drawers · FAB
   All visuals consume the pa/rm token layer (themes.css) so every
   component instantly matches the active theme.
   ============================================================ */

// ---------------- Theme registry ----------------
export type ThemeId =
  | 'enterprise-light' | 'midnight-navy' | 'obsidian-black'
  | 'aurora-glass' | 'slate-professional' | 'executive-gold'

export interface ThemeMeta {
  id: ThemeId
  name: string
  desc: string
  canvas: string   // preview: page canvas
  side: string     // preview: sidebar strip
  card: string     // preview: card fill
  accent: string   // preview: accent dot
  line: string     // preview: content line color
}

export const ADMIN_THEMES: ThemeMeta[] = [
  { id: 'enterprise-light', name: 'Enterprise Light', desc: 'Bright · reports & daytime ops', canvas: '#f8f9fc', side: 'linear-gradient(180deg,#4e73df,#224abe)', card: '#ffffff', accent: '#4e73df', line: '#c9cede' },
  { id: 'midnight-navy', name: 'Midnight Navy', desc: 'Executive dark · glass & glow', canvas: '#0b1322', side: 'linear-gradient(180deg,#0f1d3a,#0a1428)', card: '#12203a', accent: '#4c8dff', line: '#33456b' },
  { id: 'obsidian-black', name: 'Obsidian Black', desc: 'Command center · amber highlights', canvas: '#08090b', side: 'linear-gradient(180deg,#121316,#08090b)', card: '#141519', accent: '#f59e0b', line: '#2a2c33' },
  { id: 'aurora-glass', name: 'Aurora Glass', desc: 'Glassmorphism · blue/purple/cyan', canvas: 'linear-gradient(120deg,#e8f2fd,#f2ecfd 55%,#e6f6fd)', side: 'linear-gradient(180deg,rgba(17,24,39,.9),rgba(49,33,111,.82))', card: 'rgba(255,255,255,.75)', accent: '#5b5ff1', line: '#c5cbe0' },
  { id: 'slate-professional', name: 'Slate Professional', desc: 'Neutral clarity · long sessions', canvas: '#f1f5f9', side: 'linear-gradient(180deg,#1e293b,#0f172a)', card: '#ffffff', accent: '#0e7490', line: '#cbd8e4' },
  { id: 'executive-gold', name: 'Executive Gold', desc: 'Luxury corporate · muted gold', canvas: '#0e0e12', side: 'linear-gradient(180deg,#17171d,#0b0b0f)', card: '#1a1a20', accent: '#d4af37', line: '#33322a' },
]

export type Density = 'comfortable' | 'compact' | 'dense'

export interface DashboardWidgets {
  kpi: boolean; revenue: boolean; funnel: boolean; topProducts: boolean
  recentOrders: boolean; activity: boolean; traffic: boolean
}

export interface AdminPrefs {
  theme: ThemeId
  density: Density
  widgets: DashboardWidgets
}

const LS_KEY = 'playbeat_admin_prefs'

const DEFAULT_PREFS: AdminPrefs = {
  theme: 'enterprise-light',
  density: 'comfortable',
  widgets: { kpi: true, revenue: true, funnel: true, topProducts: true, recentOrders: true, activity: true, traffic: true },
}

/** Synchronous read — call before first admin render (no theme flash). */
export function readAdminPrefs(): AdminPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const p = JSON.parse(raw)
    return {
      theme: ADMIN_THEMES.some((t) => t.id === p.theme) ? p.theme : DEFAULT_PREFS.theme,
      density: ['comfortable', 'compact', 'dense'].includes(p.density) ? p.density : DEFAULT_PREFS.density,
      widgets: { ...DEFAULT_PREFS.widgets, ...(p.widgets && typeof p.widgets === 'object' ? p.widgets : {}) },
    }
  } catch { return { ...DEFAULT_PREFS } }
}

function persistPrefs(prefs: AdminPrefs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)) } catch { /* private mode */ }
}

/** Debounced DB sync — best-effort; localStorage is the source of truth. */
let prefsSyncTimer: ReturnType<typeof setTimeout> | null = null
function syncPrefsToServer(prefs: AdminPrefs) {
  if (prefsSyncTimer) clearTimeout(prefsSyncTimer)
  prefsSyncTimer = setTimeout(() => {
    try {
      const token = localStorage.getItem('playbeat_admin_token')
      if (!token) return
      const base = (import.meta as any).env?.VITE_API_BASE || ''
      fetch(`${base}/api/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: prefs }),
      }).catch(() => {})
    } catch { /* noop */ }
  }, 900)
}

export function useAdminPrefs() {
  const [prefs, setPrefs] = useState<AdminPrefs>(() => readAdminPrefs())
  const serverMerged = useRef(false)

  // Adopt server-side preferences once (only when local has no saved choice)
  useEffect(() => {
    if (serverMerged.current) return
    serverMerged.current = true
    const token = localStorage.getItem('playbeat_admin_token')
    if (!token || localStorage.getItem(LS_KEY)) return
    const base = (import.meta as any).env?.VITE_API_BASE || ''
    fetch(`${base}/api/admin/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const sp = d?.profile?.preferences
        if (!sp?.theme) return
        setPrefs((prev) => ({ ...prev, theme: sp.theme, density: sp.density || prev.density, widgets: { ...prev.widgets, ...(sp.widgets || {}) } }))
      })
      .catch(() => {})
  }, [])

  const update = useCallback((patch: Partial<AdminPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch, widgets: { ...prev.widgets, ...(patch.widgets || {}) } }
      persistPrefs(next)
      syncPrefsToServer(next)
      return next
    })
  }, [])

  return { prefs, update }
}

/** Applies prefs as data-attributes — call on the .pbadmin root element. */
export function prefsToRootProps(prefs: AdminPrefs): React.HTMLAttributes<HTMLDivElement> {
  return { 'data-pb-theme': prefs.theme, 'data-pb-density': prefs.density } as React.HTMLAttributes<HTMLDivElement>
}

// ---------------- Toast bus ----------------
export type ToastKind = 'success' | 'error' | 'warning' | 'info'
interface ToastItem { id: number; msg: string; kind: ToastKind }
type ToastListener = (items: ToastItem[]) => void

const toastListeners = new Set<ToastListener>()
let toastSeq = 1
let toastItems: ToastItem[] = []

export function adminToast(msg: string, kind: ToastKind = 'success') {
  const item: ToastItem = { id: toastSeq++, msg, kind }
  toastItems = [...toastItems, item].slice(-5)
  toastListeners.forEach((l) => l(toastItems))
  setTimeout(() => {
    toastItems = toastItems.filter((t) => t.id !== item.id)
    toastListeners.forEach((l) => l(toastItems))
  }, 4200)
}

const TOAST_ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
}

export const AdminToastHost: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>(toastItems)
  useEffect(() => {
    const l: ToastListener = (next) => setItems([...next])
    toastListeners.add(l)
    return () => { toastListeners.delete(l) }
  }, [])
  if (!items.length) return null
  return (
    <div className="pb-toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`pb-toast pb-toast--${t.kind}`}>
          <span className="pb-toast-icon">{TOAST_ICON[t.kind]}</span>
          <span className="pb-toast-msg">{t.msg}</span>
          <button
            className="pb-toast-x" aria-label="Dismiss notification"
            onClick={() => { toastItems = toastItems.filter((x) => x.id !== t.id); toastListeners.forEach((l) => l(toastItems)) }}
          ><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  )
}

// ---------------- Status badges (centralized color system) ----------------
type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold'
const STATUS_TONES: Record<string, { tone: BadgeTone; label?: string }> = {
  active: { tone: 'success' }, published: { tone: 'success' }, completed: { tone: 'success' },
  paid: { tone: 'success' }, approved: { tone: 'success' }, delivered: { tone: 'success' }, in_stock: { tone: 'success' },
  draft: { tone: 'neutral' }, inactive: { tone: 'neutral' }, archived: { tone: 'neutral' },
  pending: { tone: 'warning' }, processing: { tone: 'info' }, unpaid: { tone: 'warning' },
  low_stock: { tone: 'warning' }, lowstock: { tone: 'warning' }, refunded: { tone: 'warning' },
  cancelled: { tone: 'danger' }, canceled: { tone: 'danger' }, failed: { tone: 'danger' },
  out_of_stock: { tone: 'danger' }, expired: { tone: 'danger' }, rejected: { tone: 'danger' },
  new: { tone: 'gold' },
}

export const StatusBadge: React.FC<{ status?: string | null; children?: React.ReactNode }> = ({ status, children }) => {
  if (status === undefined || status === null || status === '') return null
  const key = String(status).toLowerCase().replace(/[\s-]+/g, '_')
  const conf = STATUS_TONES[key] || { tone: 'neutral' as BadgeTone }
  const label = children ?? String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return <span className={`pb-badge pb-badge--${conf.tone}`}>{label}</span>
}

// ---------------- Skeletons ----------------
export const SkeletonKPIs: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => <div key={i} className="pb-skel pb-skel--kpi" />)}
  </div>
)
export const SkeletonRows: React.FC<{ rows?: number; height?: number }> = ({ rows = 6, height }) => (
  <div aria-hidden="true">{Array.from({ length: rows }).map((_, i) => <div key={i} className="pb-skel pb-skel--row" style={height ? { height } : undefined} />)}</div>
)
export const SkeletonChart: React.FC = () => <div className="pb-skel pb-skel--chart" aria-hidden="true" />

// ---------------- Empty / Error states ----------------
export const EmptyState: React.FC<{
  icon?: React.ReactNode; title: string; desc?: string; actions?: React.ReactNode
}> = ({ icon, title, desc, actions }) => (
  <div className="pb-empty">
    {icon && <div className="pb-empty-icon">{icon}</div>}
    <div className="pb-empty-title">{title}</div>
    {desc && <p className="pb-empty-desc">{desc}</p>}
    {actions && <div className="pb-empty-actions">{actions}</div>}
  </div>
)

export const ErrorState: React.FC<{ message?: string; technical?: string; onRetry?: () => void }> = ({
  message = "We couldn't load this data right now.", technical, onRetry,
}) => (
  <div className="pb-error" role="alert">
    <div className="pb-error-title"><AlertTriangle className="w-4 h-4" /> {message}</div>
    {technical && (
      <details>
        <summary>View technical details</summary>
        <div className="pb-error-details">{technical}</div>
      </details>
    )}
    {onRetry && (
      <button onClick={onRetry} className="pa-btn-gold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mt-1">
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    )}
  </div>
)

// ---------------- Metric card (KPI v2) ----------------
export function sparkPath(values: number[], w = 92, h = 30): { line: string; area: string } {
  if (!values.length) return { line: '', area: '' }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = values.length > 1 ? w / (values.length - 1) : w
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L${w},${h} L0,${h} Z`
  return { line, area }
}

export const MetricCard: React.FC<{
  label: string; value: string; icon: React.ReactNode
  deltaPct?: number | null; compareLabel?: string; spark?: number[]
  tone?: string; onClick?: () => void
}> = ({ label, value, icon, deltaPct, compareLabel = 'vs previous period', spark, onClick }) => {
  const { line, area } = useMemo(() => sparkPath(spark || []), [spark])
  const up = (deltaPct ?? 0) >= 0
  return (
    <button type="button" className="pb-kpi2" onClick={onClick} aria-label={`${label}: ${value}`}>
      <div className="flex items-center gap-3">
        <span className="pb-kpi2-icon">{icon}</span>
        <div className="min-w-0">
          <div className="pb-kpi2-label">{label}</div>
          <div className="pb-kpi2-value truncate">{value}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {deltaPct !== null && deltaPct !== undefined && (
          <span className={`pb-kpi2-delta ${up ? 'pb-kpi2-delta--up' : 'pb-kpi2-delta--down'}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {up ? '+' : ''}{deltaPct.toFixed(1)}%
          </span>
        )}
        <span className="pb-kpi2-sub">{compareLabel}</span>
      </div>
      {spark && spark.length > 1 && (
        <svg className="pb-kpi2-spark" width="92" height="30" viewBox="0 0 92 30" aria-hidden="true">
          <defs>
            <linearGradient id={`pbspark-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pa-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--pa-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#pbspark-${label.replace(/\W/g, '')})`} stroke="none" />
          <path d={line} fill="none" stroke="var(--pa-primary)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}

// ---------------- Funnel ----------------
export const Funnel: React.FC<{ stages: { label: string; count: number }[] }> = ({ stages }) => {
  const max = Math.max(...stages.map((s) => s.count), 1)
  return (
    <div className="pb-funnel">
      {stages.map((s, i) => {
        const pctOfTop = Math.round((s.count / max) * 100)
        const conv = i === 0 ? 100 : Math.round((s.count / (stages[0].count || 1)) * 100)
        return (
          <div key={s.label} className="pb-funnel-row">
            <span className="pb-funnel-label">{s.label}</span>
            <div className="pb-funnel-track">
              <div className="pb-funnel-fill" style={{ width: `${Math.max(pctOfTop, 4)}%` }}>{s.count.toLocaleString()}</div>
            </div>
            <span className="pb-funnel-pct">{i === 0 ? '—' : `${conv}%`}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------- Range chips ----------------
export const RangeChips: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div className="pb-range" role="tablist" aria-label="Time range">
    {options.map((o) => (
      <button key={o} role="tab" aria-selected={value === o} className={value === o ? 'pb-range--on' : ''} onClick={() => onChange(o)}>{o}</button>
    ))}
  </div>
)

// ---------------- Command palette (Ctrl/Cmd+K) ----------------
export interface CmdkAction {
  id: string; label: string; icon: React.ReactNode; group: string
  hint?: string; run: () => void; keywords?: string
}

export const CommandPalette: React.FC<{
  open: boolean; onClose: () => void; actions: CmdkAction[]
}> = ({ open, onClose, actions }) => {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return actions
    return actions.filter((a) => `${a.label} ${a.group} ${a.keywords || ''}`.toLowerCase().includes(query))
  }, [q, actions])

  const groups = useMemo(() => {
    const m = new Map<string, CmdkAction[]>()
    filtered.forEach((a) => { const g = m.get(a.group) || []; g.push(a); m.set(a.group, g) })
    return [...m.entries()]
  }, [filtered])

  useEffect(() => { if (open) { setQ(''); setIdx(0) } }, [open])
  useEffect(() => { setIdx(0) }, [q])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
      else if (e.key === 'Enter') {
        e.preventDefault()
        const flat = groups.flatMap(([, items]) => items)
        const act = flat[idx]
        if (act) { onClose(); act.run() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, groups, idx, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${idx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  if (!open) return null
  let flatIdx = -1
  return (
    <div className="pb-cmdk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="pb-cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="pb-cmdk-input">
          <Search className="w-4 h-4" style={{ color: 'var(--pa-muted)' }} />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search commands, pages, products…"
            aria-label="Search commands"
          />
          <span className="pb-cmdk-kbd">ESC</span>
        </div>
        <div className="pb-cmdk-list" ref={listRef}>
          {groups.length === 0 && <div className="pb-cmdk-empty">No matches for “{q}”</div>}
          {groups.map(([group, items]) => (
            <div key={group}>
              <div className="pb-cmdk-group">{group}</div>
              {items.map((a) => {
                flatIdx++
                const active = flatIdx === idx
                const myIdx = flatIdx
                return (
                  <div
                    key={a.id} data-idx={myIdx}
                    className={`pb-cmdk-item ${active ? 'pb-cmdk-item--active' : ''}`}
                    onMouseEnter={() => setIdx(myIdx)}
                    onMouseDown={(e) => { e.preventDefault(); onClose(); a.run() }}
                    role="option" aria-selected={active}
                  >
                    {a.icon}
                    <span>{a.label}</span>
                    {a.hint && <span className="pb-cmdk-kbd">{a.hint}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 border-t" style={{ borderColor: 'var(--pa-line)' }}>
          <span className="pb-cmdk-kbd">↑↓</span><span className="pb-cmdk-kbd">Enter</span><span className="pb-cmdk-kbd">Esc</span>
          <span className="text-[10px] ml-auto" style={{ color: 'var(--pa-muted)' }}>PlayBeat Command Center</span>
        </div>
      </div>
    </div>
  )
}

// ---------------- Theme picker (header popover) ----------------
export const ThemePicker: React.FC<{
  prefs: AdminPrefs; onChange: (patch: Partial<AdminPrefs>) => void
}> = ({ prefs, onChange }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div className="relative" ref={wrapRef}>
      <button
        className="pa-iconbtn p-2" title="Appearance — themes & density" aria-label="Appearance settings"
        aria-expanded={open} onClick={() => setOpen((v) => !v)}
      ><Palette className="w-4 h-4" /></button>
      {open && (
        <div className="pb-themepop">
          <div className="pb-themepop-title">Appearance</div>
          <div className="pb-themegrid">
            {ADMIN_THEMES.map((t) => {
              const on = prefs.theme === t.id
              return (
                <button key={t.id} className={`pb-themecard ${on ? 'pb-themecard--on' : ''}`} onClick={() => onChange({ theme: t.id })} aria-pressed={on} title={t.desc}>
                  <div className="pb-themecard-prev" style={{ background: t.canvas }}>
                    <div className="pb-themecard-side" style={{ background: t.side }} />
                    <div className="pb-themecard-main">
                      <span className="pb-themecard-line" style={{ width: '72%', background: t.line }} />
                      <span className="pb-themecard-line" style={{ width: '52%', background: t.line, opacity: 0.55 }} />
                      <span className="pb-themecard-dot" style={{ background: t.accent }} />
                    </div>
                  </div>
                  <div className="pb-themecard-name">
                    {t.name}
                    {on && <Check className="w-3.5 h-3.5 pb-themecard-check" />}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="pb-themepop-title" style={{ marginTop: 13 }}>Display density</div>
          <div className="pb-density">
            {(['comfortable', 'compact', 'dense'] as Density[]).map((d) => (
              <button key={d} className={prefs.density === d ? 'pb-density--on' : ''} onClick={() => onChange({ density: d })} aria-pressed={prefs.density === d}>
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- Quick actions FAB ----------------
export interface QuickAction { id: string; label: string; icon: React.ReactNode; run: () => void }
export const QuickActionsFAB: React.FC<{ actions: QuickAction[] }> = ({ actions }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="pb-fab-wrap">
      {open && (
        <div className="pb-fabmenu" role="menu">
          {actions.map((a) => (
            <button key={a.id} className="pb-fabmenu-item" role="menuitem" onClick={() => { setOpen(false); a.run() }}>
              {a.icon}<span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        className={`pb-fab ${open ? 'pb-fab--open' : ''}`} aria-label="Quick actions" aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      ><Plus className="w-6 h-6" /></button>
    </div>
  )
}

// ---------------- Filter drawer ----------------
export const FilterDrawer: React.FC<{
  open: boolean; onClose: () => void; title?: string
  children: React.ReactNode; onApply: () => void; onReset: () => void
}> = ({ open, onClose, title = 'Advanced Filters', children, onApply, onReset }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="pb-drawer-overlay" onMouseDown={onClose} />
      <aside className="pb-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pb-drawer-head">
          <span className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--pa-primary)' }} /> {title}</span>
          <button className="pa-iconbtn p-1.5" onClick={onClose} aria-label="Close filters"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="pb-drawer-body">{children}</div>
        <div className="pb-drawer-foot">
          <button className="pa-btn-gold flex-1 py-2 rounded-lg text-xs" onClick={onApply}>Apply Filters</button>
          <button className="px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: 'var(--pa-line)', color: 'var(--pa-muted)' }} onClick={onReset}>Reset</button>
        </div>
      </aside>
    </>
  )
}

// ---------------- Row actions menu (•••) ----------------
export const RowMenu: React.FC<{ items: { id: string; label: string; icon?: React.ReactNode; danger?: boolean; run: () => void }[] }> = ({ items }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div className="relative pb-rowmenu-cell" ref={ref}>
      <button className="pa-iconbtn p-1.5" aria-label="Row actions" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="pb-rowmenu" role="menu">
          {items.map((it) => (
            <button key={it.id} className={`pb-rowmenu-item ${it.danger ? 'pb-rowmenu-item--danger' : ''}`} role="menuitem" onClick={() => { setOpen(false); it.run() }}>
              {it.icon}<span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- CSV export helper ----------------
export function exportCsv(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// Shared icon set for palette consumers
export {
  LayoutDashboard, Package, ShoppingBag, Users, Tag, BarChart3, LayoutTemplate,
  UserCog, Plus, FileSpreadsheet, Key, Megaphone, Search, CommandIcon as Command,
  Filter, Sparkles, Eye, ShoppingCart, CreditCard, Inbox, Layers, Pencil, Trash2,
  Minimize2, Maximize2, MousePointerClick, ChevronRight,
}
