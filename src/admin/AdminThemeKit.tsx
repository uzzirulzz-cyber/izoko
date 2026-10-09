import { createPortal } from 'react-dom'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Check, ChevronRight, Command as CommandIcon, Search, X, AlertTriangle, CheckCircle2,
  Info, AlertCircle, Plus, Package, FileSpreadsheet, Key, Megaphone, Users, LayoutDashboard,
  ShoppingBag, Tag, BarChart3, LayoutTemplate, UserCog, Palette, Minimize2, Maximize2,
  Filter, Sparkles, RefreshCw, Loader2, MousePointerClick, Eye, ShoppingCart, CreditCard,
  Inbox, TrendingUp, TrendingDown, MoreHorizontal, Pencil, Trash2, Layers, SlidersHorizontal,
  Sun, Moon, Monitor,
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
  | 'platinum' | 'arctic' | 'ocean' | 'royal' | 'minimal'
  | 'graphite' | 'midnight-pro' | 'dark-exec'
  | 'custom'

export interface ThemeMeta {
  id: ThemeId
  name: string
  desc: string
  canvas: string   // preview: page canvas
  side: string     // preview: sidebar strip
  card: string     // preview: card fill
  accent: string   // preview: accent dot
  line: string     // preview: content line color
  dark: boolean    // true = dark theme (drives appearance mode pairing)
  pair: ThemeId    // light/dark counterpart used by the mode switch
}

export const ADMIN_THEMES: ThemeMeta[] = [
  { id: 'enterprise-light', name: 'Enterprise Light', desc: 'Bright · reports & daytime ops', canvas: '#f8f9fc', side: 'linear-gradient(180deg,#4e73df,#224abe)', card: '#ffffff', accent: '#4e73df', line: '#c9cede', dark: false, pair: 'midnight-navy' },
  { id: 'midnight-navy', name: 'Midnight Navy', desc: 'Executive dark · glass & glow', canvas: '#0b1322', side: 'linear-gradient(180deg,#0f1d3a,#0a1428)', card: '#12203a', accent: '#4c8dff', line: '#33456b', dark: true, pair: 'enterprise-light' },
  { id: 'obsidian-black', name: 'Obsidian Black', desc: 'Command center · amber highlights', canvas: '#08090b', side: 'linear-gradient(180deg,#121316,#08090b)', card: '#141519', accent: '#f59e0b', line: '#2a2c33', dark: true, pair: 'minimal' },
  { id: 'aurora-glass', name: 'Aurora Glass', desc: 'Glassmorphism · blue/purple/cyan', canvas: 'linear-gradient(120deg,#e8f2fd,#f2ecfd 55%,#e6f6fd)', side: 'linear-gradient(180deg,rgba(17,24,39,.9),rgba(49,33,111,.82))', card: 'rgba(255,255,255,.75)', accent: '#5b5ff1', line: '#c5cbe0', dark: false, pair: 'royal' },
  { id: 'slate-professional', name: 'Slate Professional', desc: 'Neutral clarity · long sessions', canvas: '#f1f5f9', side: 'linear-gradient(180deg,#1e293b,#0f172a)', card: '#ffffff', accent: '#0e7490', line: '#cbd8e4', dark: false, pair: 'graphite' },
  { id: 'executive-gold', name: 'Executive Gold', desc: 'Luxury corporate · muted gold', canvas: '#0e0e12', side: 'linear-gradient(180deg,#17171d,#0b0b0f)', card: '#1a1a20', accent: '#d4af37', line: '#33322a', dark: true, pair: 'platinum' },
  { id: 'platinum', name: 'Platinum Enterprise', desc: 'Clean slate-on-white · light', canvas: '#f4f5f8', side: 'linear-gradient(180deg,#ffffff,#f1f3f8)', card: '#ffffff', accent: '#475569', line: '#e2e5ee', dark: false, pair: 'midnight-pro' },
  { id: 'arctic', name: 'Arctic Silver', desc: 'Cool light · muted blue-gray', canvas: '#eef1f7', side: 'linear-gradient(180deg,#ffffff,#f4f6fb)', card: '#ffffff', accent: '#64748b', line: '#dde2ee', dark: false, pair: 'ocean' },
  { id: 'ocean', name: 'Ocean Enterprise', desc: 'Deep teal · cyan accents', canvas: '#03131a', side: 'linear-gradient(180deg,#051a22,#03131a)', card: '#07212b', accent: '#06b6d4', line: '#123a48', dark: true, pair: 'arctic' },
  { id: 'royal', name: 'Royal Blue', desc: 'Rich indigo-blue depth', canvas: '#060a1c', side: 'linear-gradient(180deg,#080d20,#060a1c)', card: '#0d1430', accent: '#4f5fe8', line: '#1d2a52', dark: true, pair: 'platinum' },
  { id: 'minimal', name: 'Minimal White', desc: 'Flat · airy · minimal chrome', canvas: '#fafafa', side: 'linear-gradient(180deg,#ffffff,#f6f6f8)', card: '#ffffff', accent: '#2563eb', line: '#e7e7ea', dark: false, pair: 'graphite' },
  { id: 'graphite', name: 'Graphite Executive', desc: 'Neutral charcoal tones', canvas: '#0c0d10', side: 'linear-gradient(180deg,#0f1013,#0c0d10)', card: '#151619', accent: '#9ca3af', line: '#262830', dark: true, pair: 'minimal' },
  { id: 'midnight-pro', name: 'Midnight Pro', desc: 'Near-black · high contrast', canvas: '#02050c', side: 'linear-gradient(180deg,#04070f,#02050c)', card: '#070b16', accent: '#3b82f6', line: '#161d33', dark: true, pair: 'platinum' },
  { id: 'dark-exec', name: 'Dark Executive', desc: 'Black · warm gold accent', canvas: '#0a0a0d', side: 'linear-gradient(180deg,#0c0c10,#0a0a0d)', card: '#131317', accent: '#d4af37', line: '#232329', dark: true, pair: 'minimal' },
]

export const isPresetTheme = (id: string): id is Exclude<ThemeId, 'custom'> =>
  ADMIN_THEMES.some((t) => t.id === id)

export function themeMeta(id: string): ThemeMeta | undefined {
  return ADMIN_THEMES.find((t) => t.id === id)
}

export type Density = 'comfortable' | 'compact' | 'dense'
export type AppearanceMode = 'light' | 'dark' | 'auto'

export interface DashboardWidgets {
  kpi: boolean; revenue: boolean; funnel: boolean; topProducts: boolean
  recentOrders: boolean; activity: boolean; traffic: boolean
}

// ---------------- Custom theme builder ----------------
export type CustomColorKey =
  | 'primary' | 'secondary' | 'background' | 'surface' | 'sidebar' | 'text'
  | 'muted' | 'border' | 'success' | 'warning' | 'danger' | 'info'

export interface CustomThemeSpec {
  colors: Record<CustomColorKey, string>
  radius: number                                // px, base corner radius (0-24)
  shadow: 0 | 1 | 2                             // none / soft / elevated
  sideW: number                                 // px, sidebar width (208-320)
  bgStyle: 'solid' | 'gradient' | 'mesh' | 'glow'
}

export const CUSTOM_BUILDER_FIELDS: { key: CustomColorKey; label: string }[] = [
  { key: 'primary', label: 'Primary' }, { key: 'secondary', label: 'Secondary' },
  { key: 'background', label: 'Background' }, { key: 'surface', label: 'Surface' },
  { key: 'sidebar', label: 'Sidebar' }, { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted text' }, { key: 'border', label: 'Border' },
  { key: 'success', label: 'Success' }, { key: 'warning', label: 'Warning' },
  { key: 'danger', label: 'Danger' }, { key: 'info', label: 'Info' },
]

export const CUSTOM_DEFAULTS: CustomThemeSpec = {
  colors: {
    primary: '#2f7cf6', secondary: '#1d5fd8', background: '#050a16', surface: '#0b1324',
    sidebar: '#070d1c', text: '#e6ebf5', muted: '#7d8aa5', border: '#1a2540',
    success: '#22c88a', warning: '#f59e0b', danger: '#ef4444', info: '#22d3ee',
  },
  radius: 12, shadow: 1, sideW: 256, bgStyle: 'gradient',
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

const hexAdjust = (hex: string, amt: number) => {
  const [r, g, b] = hexToRgb(hex)
  const c = (v: number) => clamp(Math.round(v + amt), 0, 255)
  return `#${((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1)}`
}

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex)
  return r * 0.299 + g * 0.587 + b * 0.114
}

export const isCustomThemeSpec = (v: any): v is CustomThemeSpec => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const c = v.colors
  if (!c || typeof c !== 'object') return false
  const hex = (x: any) => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x)
  if (!CUSTOM_BUILDER_FIELDS.every(({ key }) => hex(c[key]))) return false
  if (!Number.isFinite(v.radius) || !Number.isFinite(v.sideW)) return false
  if (![0, 1, 2].includes(v.shadow)) return false
  return ['solid', 'gradient', 'mesh', 'glow'].includes(v.bgStyle)
}

/** Builds the full inline CSS-variable layer for a custom theme.
 *  Mirrors the pa/rm token contract in themes.css — every admin
 *  component picks it up automatically. */
export function customThemeStyle(spec: CustomThemeSpec): React.CSSProperties {
  const c = spec.colors
  const dark = luminance(c.background) < 128
  const s: Record<string, string> = {}

  // canvas — composed per background style
  if (spec.bgStyle === 'solid') s['--pa-bg'] = c.background
  else if (spec.bgStyle === 'gradient') s['--pa-bg'] = `linear-gradient(160deg, ${c.background}, ${hexAdjust(c.background, dark ? 14 : -12)})`
  else if (spec.bgStyle === 'mesh') s['--pa-bg'] = `radial-gradient(at 20% 20%, ${rgba(c.primary, 0.14)}, transparent 60%), radial-gradient(at 80% 0%, ${rgba(c.secondary, 0.12)}, transparent 55%), ${c.background}`
  else s['--pa-bg'] = `radial-gradient(900px circle at 15% 0%, ${rgba(c.primary, 0.16)}, transparent 45%), ${c.background}`

  // chrome
  s['--pa-side'] = `linear-gradient(180deg, ${c.sidebar} 0%, ${hexAdjust(c.sidebar, dark ? -6 : 6)} 100%)`
  s['--pa-side-solid'] = c.sidebar
  s['--pa-card-a'] = c.surface
  s['--pa-card-b'] = hexAdjust(c.surface, dark ? -4 : 5)
  s['--pa-inset'] = hexAdjust(c.surface, dark ? -8 : 8)
  s['--pa-line'] = c.border
  s['--pa-primary'] = c.primary
  s['--pa-primary-dark'] = c.secondary
  s['--pa-ring'] = rgba(c.primary, 0.28)
  s['--pa-gold'] = c.primary
  s['--pa-gold-soft'] = rgba(c.primary, 0.13)
  s['--pa-text'] = '#ffffff' // sidebar text — inverted by CSS on light sidebars
  s['--pa-muted'] = c.muted
  s['--pa-ink'] = c.text
  s['--pa-ink-soft'] = hexAdjust(c.text, dark ? -18 : 8)
  s['--pa-topbar-bg'] = rgba(c.background, 0.92)
  s['--pa-input-bg'] = dark ? rgba(c.surface, 0.85) : '#ffffff'
  s['--pa-success'] = c.success
  s['--pa-warning'] = c.warning
  s['--pa-danger'] = c.danger
  s['--pa-info'] = c.info
  s['--pa-glass-blur'] = dark ? '10px' : '6px'
  s['--pa-glass-border'] = c.border
  s['--pa-glow'] = dark ? `0 0 22px -6px ${rgba(c.primary, 0.5)}` : 'none'

  // elevation
  const ring = rgba(c.primary, 0.1)
  if (spec.shadow === 0) {
    s['--pa-card-shadow'] = 'none'
    s['--pa-card-shadow-hover'] = `0 0 0 1px ${ring}`
  } else if (spec.shadow === 1) {
    s['--pa-card-shadow'] = dark
      ? `0 6px 20px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px ${rgba(c.border, 0.55)}`
      : `0 1px 2px rgba(15, 23, 42, 0.05), 0 10px 26px -14px rgba(15, 23, 42, 0.14)`
    s['--pa-card-shadow-hover'] = dark
      ? `0 14px 34px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px ${rgba(c.primary, 0.22)}`
      : `0 2px 4px rgba(15, 23, 42, 0.06), 0 16px 36px -14px rgba(15, 23, 42, 0.2)`
  } else {
    s['--pa-card-shadow'] = dark
      ? `0 18px 44px -18px rgba(0, 0, 0, 0.85), 0 0 0 1px ${rgba(c.border, 0.6)}`
      : `0 12px 34px -14px rgba(15, 23, 42, 0.22), 0 0 0 1px ${rgba(c.border, 0.5)}`
    s['--pa-card-shadow-hover'] = dark
      ? `0 22px 54px -18px rgba(0, 0, 0, 0.92), 0 0 0 1px ${rgba(c.primary, 0.3)}`
      : `0 18px 44px -14px rgba(15, 23, 42, 0.28), 0 0 0 1px ${rgba(c.primary, 0.28)}`
  }

  // corner radius tokens
  const lg = clamp(Math.round(spec.radius), 0, 24)
  s['--radius-lg'] = `${lg}px`
  s['--radius-md'] = `${Math.max(lg - 3, 0)}px`
  s['--radius-sm'] = `${Math.max(lg - 6, 0)}px`

  // sidebar width token (consumed when [data-pb-side-w] is set on the root)
  s['--pa-side-w'] = `${clamp(Math.round(spec.sideW), 208, 320)}px`

  // dark-era Tailwind utility remap for dark customs (light customs inherit
  // the adaptive base defaults from admin-theme.css)
  if (dark) {
    Object.assign(s, {
      '--rm-white': c.text,
      '--rm-zinc-100': c.text,
      '--rm-zinc-200': hexAdjust(c.text, -10),
      '--rm-zinc-300': hexAdjust(c.text, -30),
      '--rm-zinc-400': c.muted,
      '--rm-zinc-600': hexAdjust(c.muted, -20),
      '--rm-amber-300': '#fcd34d',
      '--rm-amber-400': '#fbbf24',
      '--rm-emerald-300': '#6ee7b7',
      '--rm-emerald-400': '#34d399',
      '--rm-sky-300': '#7dd3fc',
      '--rm-sky-400': '#38bdf8',
      '--rm-rose-300': '#fda4af',
      '--rm-rose-400': '#fb7185',
      '--rm-fuchsia-300': '#f0abfc',
      '--rm-fuchsia-400': '#e879f9',
      '--rm-teal': '#2dd4bf',
      '--rm-indigo': '#818cf8',
      '--rm-soft-ink': hexAdjust(c.muted, 22),
      '--rm-placeholder': hexAdjust(c.muted, -24),
      '--rm-row-line': rgba(c.border, 0.75),
      '--rm-hover-solid': rgba(c.muted, 0.09),
      '--rm-border-strong': rgba(c.muted, 0.26),
      '--rm-scrollbar': rgba(c.muted, 0.3),
      '--rm-scrollbar-hover': rgba(c.muted, 0.5),
      '--rm-card-hover': rgba(c.muted, 0.35),
    })
  }

  s['color-scheme'] = dark ? 'dark' : 'light'
  return s as React.CSSProperties
}

// ---------------- Preferences (localStorage + best-effort server sync) ----------------
export interface AdminPrefs {
  theme: ThemeId
  density: Density
  mode: AppearanceMode
  custom: CustomThemeSpec | null
  widgets: DashboardWidgets
}

const LS_KEY = 'playbeat_admin_prefs'

const DEFAULT_PREFS: AdminPrefs = {
  theme: 'enterprise-light',
  density: 'comfortable',
  mode: 'auto',
  custom: null,
  widgets: { kpi: true, revenue: true, funnel: true, topProducts: true, recentOrders: true, activity: true, traffic: true },
}

/** Synchronous read — call before first admin render (no theme flash). */
export function readAdminPrefs(): AdminPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const p = JSON.parse(raw)
    return {
      theme: p.theme === 'custom' && isCustomThemeSpec(p.custom) ? 'custom' : isPresetTheme(p.theme) ? p.theme : DEFAULT_PREFS.theme,
      density: ['comfortable', 'compact', 'dense'].includes(p.density) ? p.density : DEFAULT_PREFS.density,
      mode: ['light', 'dark', 'auto'].includes(p.mode) ? p.mode : DEFAULT_PREFS.mode,
      custom: isCustomThemeSpec(p.custom) ? p.custom : null,
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
        setPrefs((prev) => ({
          ...prev,
          theme: sp.theme === 'custom' && (sp.custom && isCustomThemeSpec(sp.custom) ? sp.custom : prev.custom) ? 'custom' : isPresetTheme(sp.theme) ? sp.theme : prev.theme,
          density: ['comfortable', 'compact', 'dense'].includes(sp.density) ? sp.density : prev.density,
          mode: ['light', 'dark', 'auto'].includes(sp.mode) ? sp.mode : prev.mode,
          custom: sp.custom && isCustomThemeSpec(sp.custom) ? sp.custom : prev.custom,
          widgets: { ...prev.widgets, ...(sp.widgets || {}) },
        }))
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

  // Appearance mode: light / dark / auto (follows the OS color scheme).
  // Swaps the active theme to its light/dark pair when needed — same
  // contract as the Theme Studio mockup (applyMode → pair theme).
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const applyMode = () => {
      const p = prefsRef.current
      const meta = themeMeta(p.theme)
      if (!meta || p.theme === 'custom') return // custom themes ignore pairing
      const wantDark = p.mode === 'dark' || (p.mode === 'auto' && mql.matches)
      if (meta.dark !== wantDark) update({ theme: themeMeta(meta.pair)?.dark === wantDark ? meta.pair : p.theme })
    }
    applyMode()
    const onChange = () => { if (prefsRef.current.mode === 'auto') applyMode() }
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [update, prefs.mode])

  return { prefs, update }
}

/** Applies prefs as data-attributes — call on the .pbadmin root element. */
export function prefsToRootProps(prefs: AdminPrefs): React.HTMLAttributes<HTMLDivElement> {
  const props: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown> = {
    'data-pb-theme': prefs.theme,
    'data-pb-density': prefs.density,
    'data-pb-mode': prefs.mode || 'auto',
  }
  if (prefs.theme === 'custom' && prefs.custom) {
    props.style = customThemeStyle(prefs.custom)
    // light sidebar → dark ink via the light-sidebar override layer
    if (luminance(prefs.custom.colors.sidebar) > 140) props['data-pb-side-ink'] = 'dark'
    props['data-pb-side-w'] = 'on'
  }
  return props as React.HTMLAttributes<HTMLDivElement>
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

// ---------------- Theme Studio (drawer: presets · custom builder) ----------------
const MODE_OPTIONS: { id: AppearanceMode; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
  { id: 'auto', label: 'Auto', icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
]

export const ThemeStudio: React.FC<{
  open: boolean; onClose: () => void; prefs: AdminPrefs; onChange: (patch: Partial<AdminPrefs>) => void
}> = ({ open, onClose, prefs, onChange }) => {
  const [tab, setTab] = useState<'presets' | 'builder'>('presets')

  useEffect(() => {
    if (!open) return
    setTab(prefs.theme === 'custom' ? 'builder' : 'presets')
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const draft: CustomThemeSpec = prefs.custom || CUSTOM_DEFAULTS
  const setCustom = (patch: Partial<CustomThemeSpec>) =>
    onChange({ theme: 'custom', custom: { ...draft, ...patch, colors: { ...draft.colors, ...(patch.colors || {}) } } })
  const setColor = (key: CustomColorKey, value: string) => setCustom({ colors: { ...draft.colors, [key]: value } })

  const applyPreset = (t: ThemeMeta) => {
    // Picking a preset is an explicit choice — align appearance mode with
    // it (same contract as the mockup, where the mode switch follows the
    // applied theme's darkness). Auto users can re-enable Auto after.
    onChange({ theme: t.id, mode: t.dark ? 'dark' : 'light' })
    adminToast(`${t.name} applied`, 'success')
  }
  const applyMode = (mode: AppearanceMode) => {
    onChange({ mode })
    adminToast(mode === 'auto' ? 'Following system appearance' : `${mode[0].toUpperCase() + mode.slice(1)} mode`, 'info')
  }
  const resetTheme = () => {
    // Factory reset — default preset, auto appearance, drop custom spec.
    onChange({ theme: DEFAULT_PREFS.theme, custom: null, mode: DEFAULT_PREFS.mode })
    adminToast('Theme reset to default', 'info')
    setTab('presets')
  }

  const mode = prefs.mode || 'auto'

  return createPortal(
    <>
      <div className="pb-drawer-overlay" onMouseDown={onClose} />
      <aside className="pb-drawer pb-studio" role="dialog" aria-modal="true" aria-label="Theme Studio">
        <div className="pb-drawer-head">
          <span className="flex items-center gap-2"><Palette className="w-4 h-4" style={{ color: 'var(--pa-primary)' }} /> Theme Studio</span>
          <button className="pa-iconbtn p-1.5" onClick={onClose} aria-label="Close Theme Studio"><X className="w-3.5 h-3.5" /></button>
        </div>

        <div className="pb-drawer-body">
          <div className="pb-studio-sub">
            Choose a preset or build your own — changes preview instantly and sync to your account.
          </div>

          {/* Appearance mode */}
          <div className="pb-studio-sec">
            <div className="pb-themepop-title">Appearance mode</div>
            <div className="pb-density">
              {MODE_OPTIONS.map((m) => (
                <button key={m.id} className={mode === m.id ? 'pb-density--on' : ''} onClick={() => applyMode(m.id)} aria-pressed={mode === m.id}>
                  {m.icon}<span className="ml-1">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="pb-studio-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'presets'} className={`pb-studio-tab ${tab === 'presets' ? 'pb-studio-tab--on' : ''}`} onClick={() => setTab('presets')}>Presets</button>
            <button role="tab" aria-selected={tab === 'builder'} className={`pb-studio-tab ${tab === 'builder' ? 'pb-studio-tab--on' : ''}`} onClick={() => setTab('builder')}>Custom Builder</button>
          </div>

          {tab === 'presets' ? (
            <div className="pb-studio-grid">
              {ADMIN_THEMES.map((t) => {
                const on = prefs.theme === t.id
                return (
                  <button key={t.id} className={`pb-studio-preset ${on ? 'pb-studio-preset--on' : ''}`} onClick={() => applyPreset(t)} aria-pressed={on} title={t.desc}>
                    <div className="pb-studio-mini" style={{ background: t.canvas }}>
                      <span className="pb-studio-mini-side" style={{ background: t.side }} />
                      <span className="pb-studio-mini-bar" style={{ width: '58%', background: t.line }} />
                      <span className="pb-studio-mini-bar" style={{ width: '40%', background: t.line, opacity: 0.55 }} />
                      <span className="pb-studio-mini-bar" style={{ width: '22%', background: t.accent }} />
                    </div>
                    <span className="pb-studio-name">{t.name}{on && <Check className="w-3 h-3" style={{ color: 'var(--pa-primary)' }} />}</span>
                    <span className="pb-studio-sub2">{t.desc}</span>
                  </button>
                )
              })}
              <button className="pb-studio-preset" onClick={() => setTab('builder')} title="Build your own theme">
                <div className="pb-studio-mini" style={{ background: 'conic-gradient(from 180deg, #2f7cf6, #8b5cf6, #f43f5e, #f59e0b, #2f7cf6)' }}>
                  <span className="pb-studio-mini-bar" style={{ width: '58%', background: 'rgba(255,255,255,.75)' }} />
                  <span className="pb-studio-mini-bar" style={{ width: '40%', background: 'rgba(255,255,255,.5)' }} />
                </div>
                <span className="pb-studio-name">Custom Theme</span>
                <span className="pb-studio-sub2">Build your own</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="pb-themepop-title">Colors</div>
              <div className="pb-studio-colors">
                {CUSTOM_BUILDER_FIELDS.map(({ key, label }) => (
                  <div key={key} className="pb-studio-field">
                    <label htmlFor={`ts-color-${key}`}>{label}</label>
                    <input id={`ts-color-${key}`} type="color" value={draft.colors[key]} onChange={(e) => setColor(key, e.target.value)} aria-label={`${label} color`} />
                  </div>
                ))}
              </div>

              <div className="pb-themepop-title" style={{ marginTop: 14 }}>Layout & finish</div>
              <div className="pb-studio-field">
                <label htmlFor="ts-radius">Corner radius</label>
                <span className="flex items-center gap-2">
                  <input id="ts-radius" type="range" min={0} max={24} step={1} value={draft.radius} onChange={(e) => setCustom({ radius: Number(e.target.value) })} />
                  <span className="pb-studio-rangeval">{draft.radius}px</span>
                </span>
              </div>
              <div className="pb-studio-field">
                <label htmlFor="ts-shadow">Card shadow</label>
                <select id="ts-shadow" className="pb-studio-select" value={draft.shadow} onChange={(e) => setCustom({ shadow: Number(e.target.value) as 0 | 1 | 2 })}>
                  <option value={0}>None</option>
                  <option value={1}>Soft</option>
                  <option value={2}>Elevated</option>
                </select>
              </div>
              <div className="pb-studio-field">
                <label htmlFor="ts-sidew">Sidebar width</label>
                <span className="flex items-center gap-2">
                  <input id="ts-sidew" type="range" min={208} max={320} step={4} value={draft.sideW} onChange={(e) => setCustom({ sideW: Number(e.target.value) })} />
                  <span className="pb-studio-rangeval">{draft.sideW}px</span>
                </span>
              </div>
              <div className="pb-studio-field">
                <label htmlFor="ts-bg">Background style</label>
                <select id="ts-bg" className="pb-studio-select" value={draft.bgStyle} onChange={(e) => setCustom({ bgStyle: e.target.value as CustomThemeSpec['bgStyle'] })}>
                  <option value="solid">Solid</option>
                  <option value="gradient">Gradient</option>
                  <option value="mesh">Mesh</option>
                  <option value="glow">Glow</option>
                </select>
              </div>

              <div className="pb-studio-note">
                The builder composes a full token layer — canvas, sidebar, cards, borders, glows and
                the dark/light utility remap are derived from these colors. Light backgrounds
                automatically flip the sidebar ink and color scheme.
              </div>
            </div>
          )}

          {/* Density */}
          <div className="pb-studio-sec">
            <div className="pb-themepop-title">Display density</div>
            <div className="pb-density">
              {(['comfortable', 'compact', 'dense'] as Density[]).map((d) => (
                <button key={d} className={prefs.density === d ? 'pb-density--on' : ''} onClick={() => onChange({ density: d })} aria-pressed={prefs.density === d}>
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pb-studio-foot">
          <button className="px-4 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: 'var(--pa-line)', color: 'var(--pa-muted)' }} onClick={resetTheme}>
            Reset to default
          </button>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--pa-muted)' }}>Auto-saved · synced to your account</span>
        </div>
      </aside>
    </>,
    document.querySelector('.pbadmin') || document.body
  )
}

/** Topbar palette button that opens the Theme Studio drawer.
 *  Also listens for the `pb:theme-studio` window event so the
 *  command palette / shortcuts can open it from anywhere. */
export const ThemeStudioLauncher: React.FC<{
  prefs: AdminPrefs; onChange: (patch: Partial<AdminPrefs>) => void
}> = ({ prefs, onChange }) => {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('pb:theme-studio', onOpen)
    return () => window.removeEventListener('pb:theme-studio', onOpen)
  }, [])
  return (
    <>
      <button
        className="pa-iconbtn p-2" title="Theme Studio — presets & custom builder" aria-label="Open Theme Studio"
        aria-expanded={open} onClick={() => setOpen(true)}
      ><Palette className="w-4 h-4" /></button>
      <ThemeStudio open={open} onClose={() => setOpen(false)} prefs={prefs} onChange={onChange} />
    </>
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
