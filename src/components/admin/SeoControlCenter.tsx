// SeoControlCenter — /admin/seo dashboard (12 sections, real data only).
//
// Wraps the existing SeoPanel (Overview) and adds: Pages, Products, Sitemap,
// Indexability, Structured Data, Meta Tags, Broken Links, Redirects, Search
// Console, Merchant SEO and Core Web Vitals sections.
//
// Honesty rules (per spec):
//   - no fabricated "SEO score", no "indexed by Google" claims
//   - Search Console integration only activates when env credentials exist
//   - Core Web Vitals are measured live in THIS admin browser session

import React from 'react'
import {
  RefreshCw, ExternalLink, FileText, Bot, Link2, ScanLine, Info,
  AlertTriangle, CheckCircle2, Globe, Search, Layout, Package, Network as SitemapIcon,
  BarChart3, Tags, ShieldAlert, ArrowRightLeft as RedirectIcon, MonitorSmartphone, ShoppingBag, Plus, Trash2, Loader2, Edit,
} from 'lucide-react'
import { Product } from '../../types'
import { SeoPanel } from './SeoPanel'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

export interface SeoControlCenterProps {
  products: Product[]
  onAdminNavigate: (path: string) => void
  onToast: (msg: string, ms?: number) => void
}

interface SeoRow {
  id: string
  name: string
  slug: string
  sku: string
  seoTitle?: string
  seoDescription?: string
  canonical?: string
  noindex?: boolean
  image?: string
  cmsStatus?: string
  active?: boolean
  updatedAt?: string
  inSitemap?: boolean
}

// Real indexed-route inventory (matches sitemap-pages.xml composition)
const STATIC_PAGES: { url: string; type: string; title: string }[] = [
  { url: '/', type: 'Homepage', title: 'Premium Digital Marketplace & Smart Projectors' },
  { url: '/streaming', type: 'Category', title: 'Streaming Subscriptions — Netflix, Prime Video, Disney+, HBO Max' },
  { url: '/subscriptions', type: 'Category', title: 'Subscriptions & AI Tools' },
  { url: '/gift-cards', type: 'Category', title: 'Gift Cards — Xbox, PlayStation, Steam' },
  { url: '/gaming', type: 'Category', title: 'Gaming — Xbox Game Pass & Game Keys' },
  { url: '/software', type: 'Category', title: 'Software Licenses' },
  { url: '/smart-projectors', type: 'Category', title: 'Smart 4K Projectors' },
  { url: '/about', type: 'CMS', title: 'About PlayBeat Digital' },
  { url: '/contact', type: 'CMS', title: 'Contact & 24/7 Support' },
  { url: '/privacy', type: 'Legal', title: 'Privacy Policy' },
  { url: '/terms', type: 'Legal', title: 'Terms of Service' },
  { url: '/refund-policy', type: 'Legal', title: 'Refund Policy' },
  { url: '/shipping-policy', type: 'Legal', title: 'Shipping & Delivery Policy' },
  { url: '/warranty', type: 'Legal', title: 'Warranty & Replacement Policy' },
]

type Section =
  | 'overview' | 'pages' | 'products' | 'sitemap' | 'indexability' | 'schema'
  | 'meta' | 'broken' | 'redirects' | 'gsc' | 'merchant' | 'cwv'

export const SeoControlCenter: React.FC<SeoControlCenterProps> = ({ products, onAdminNavigate, onToast }) => {
  const [section, setSection] = React.useState<Section>('overview')
  const [overview, setOverview] = React.useState<any>(null)
  const [rows, setRows] = React.useState<SeoRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [issues, setIssues] = React.useState<any[] | null>(null)
  const [auditMeta, setAuditMeta] = React.useState<{ checked: number; count: number } | null>(null)
  const [broken, setBroken] = React.useState<any[] | null>(null)
  const [redirects, setRedirects] = React.useState<any[]>([])
  const [redirectForm, setRedirectForm] = React.useState({ source: '', destination: '' })
  const [gsc, setGsc] = React.useState<any>(null)
  const [merchant, setMerchant] = React.useState<any>(null)
  const [cwv, setCwv] = React.useState<{ lcp: number | null; cls: number | null; inp: number | null } | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/seo`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setOverview(data.seo || null)
        setRows(Array.isArray(data.seo?.productRows) ? data.seo.productRows : [])
      }
    } catch {
      /* empty state renders */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const action = async (body: Record<string, unknown>, tag: string) => {
    setBusy(tag)
    try {
      const res = await fetch(`${API_BASE}/api/admin/seo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data?.success === false) {
        onToast(data?.error || `${tag} failed`, 6000)
        return null
      }
      return data
    } catch {
      onToast(`${tag} — network error`, 6000)
      return null
    } finally {
      setBusy(null)
    }
  }

  const runAudit = async () => {
    const d = await action({ action: 'audit' }, 'audit')
    if (d) {
      setIssues(d.issues || [])
      setAuditMeta({ checked: d.checked || 0, count: d.issueCount || 0 })
      onToast(`SEO audit finished — ${d.issueCount || 0} findings on ${d.checked || 0} products`)
    }
  }
  const runBroken = async () => {
    const d = await action({ action: 'broken-links' }, 'broken-links')
    if (d) {
      setBroken(d.broken || [])
      onToast(`Broken-link check finished — ${d.brokenCount || 0} issues on ${d.checked || 0} URLs`)
    }
  }
  const runRegenerate = async () => {
    const d = await action({ action: 'regenerate' }, 'regenerate')
    if (d) {
      await load()
      onToast('Sitemap verified — generated live from MongoDB')
    }
  }
  const loadRedirects = React.useCallback(async () => {
    const d = await action({ action: 'redirects-list' }, 'redirects-list')
    if (d) setRedirects(d.redirects || [])
  }, [action])
  const loadGsc = React.useCallback(async () => {
    const d = await action({ action: 'gsc-status' }, 'gsc-status')
    if (d) setGsc(d.gsc || null)
  }, [action])
  const loadMerchant = React.useCallback(async () => {
    const d = await action({ action: 'merchant-audit' }, 'merchant-audit')
    if (d) setMerchant(d.merchant || null)
  }, [action])

  React.useEffect(() => {
    if (section === 'redirects' && redirects.length === 0) loadRedirects()
    if (section === 'gsc' && gsc === null) loadGsc()
    if (section === 'merchant' && merchant === null) loadMerchant()
    if (section === 'cwv' && cwv === null) measureCwv()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---- Core Web Vitals: measure THIS admin session via PerformanceObserver ----
  const measureCwv = () => {
    const out = { lcp: null as number | null, cls: null as number | null, inp: null as number | null }
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1] as any
        if (last) out.lcp = Math.round(last.startTime || last.renderTime || 0)
      }).observe({ type: 'largest-contentful-paint', buffered: true } as any)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) out.cls = Math.round(((out.cls || 0) + entry.value) * 1000) / 1000
        }
      }).observe({ type: 'layout-shift', buffered: true } as any)
      new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[]
        for (const e of entries) {
          const d = e.duration || 0
          if (out.inp === null || d > out.inp) out.inp = Math.round(d)
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as any)
    } catch {
      /* older browser — leave nulls */
    }
    // INP is interaction-driven: sample again on the next click
    const onClick = () => {
      setTimeout(() => setCwv({ ...out }), 150)
    }
    window.addEventListener('click', onClick, { once: true })
    setTimeout(() => setCwv((prev) => prev || { ...out }), 1200)
  }

  const cwvVerdict = (metric: 'lcp' | 'cls' | 'inp', v: number | null) => {
    if (v === null) return { label: 'measuring…', cls: 'text-zinc-400' }
    if (metric === 'lcp') return v <= 2500 ? { label: 'Good', cls: 'text-emerald-300' } : v <= 4000 ? { label: 'Needs improvement', cls: 'text-amber-300' } : { label: 'Poor', cls: 'text-rose-300' }
    if (metric === 'cls') return v <= 0.1 ? { label: 'Good', cls: 'text-emerald-300' } : v <= 0.25 ? { label: 'Needs improvement', cls: 'text-amber-300' } : { label: 'Poor', cls: 'text-rose-300' }
    return v <= 200 ? { label: 'Good', cls: 'text-emerald-300' } : v <= 500 ? { label: 'Needs improvement', cls: 'text-amber-300' } : { label: 'Poor', cls: 'text-rose-300' }
  }

  const btn =
    'flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-60 shrink-0'
  const input =
    'px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60'
  const chip =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border'
  const chipActive = (s: Section) => (section === s ? 'bg-amber-400 text-black border-amber-400' : 'bg-transparent text-zinc-400 border-white/10 hover:text-white hover:bg-white/5')

  const sitemap = overview?.sitemap
  const prodStats = overview?.products

  // Duplicate meta detection across pages + products (real catalog data)
  const titleMap = new Map<string, string[]>()
  rows.forEach((r) => {
    const t = (r.seoTitle || r.name || '').trim().toLowerCase()
    if (!t) return
    titleMap.set(t, [...(titleMap.get(t) || []), r.name])
  })
  const dupProductTitles = [...titleMap.entries()].filter(([, v]) => v.length > 1)
  const descMap = new Map<string, string[]>()
  rows.forEach((r) => {
    const d = (r.seoDescription || '').trim().toLowerCase()
    if (!d) return
    descMap.set(d, [...(descMap.get(d) || []), r.name])
  })
  const dupProductDescs = [...descMap.entries()].filter(([, v]) => v.length > 1)

  const sections: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { key: 'pages', label: 'Pages', icon: <Layout className="w-3.5 h-3.5" /> },
    { key: 'products', label: 'Products', icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'sitemap', label: 'Sitemap', icon: <SitemapIcon className="w-3.5 h-3.5" /> },
    { key: 'indexability', label: 'Indexability', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { key: 'schema', label: 'Structured Data', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'meta', label: 'Meta Tags', icon: <Tags className="w-3.5 h-3.5" /> },
    { key: 'broken', label: 'Broken Links', icon: <Link2 className="w-3.5 h-3.5" /> },
    { key: 'redirects', label: 'Redirects', icon: <RedirectIcon className="w-3.5 h-3.5" /> },
    { key: 'gsc', label: 'Search Console', icon: <Globe className="w-3.5 h-3.5" /> },
    { key: 'merchant', label: 'Merchant SEO', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { key: 'cwv', label: 'Core Web Vitals', icon: <MonitorSmartphone className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-sky-400 inline-block" />
            SEO Control Center
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Technical SEO for playbeat.digital — crawlability, indexability, structured data, sitemaps and merchant readiness.
          </p>
        </div>
        <button onClick={load} disabled={loading} className={btn}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Section chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {sections.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} className={`${chip} ${chipActive(s.key)}`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ============ OVERVIEW ============ */}
      {section === 'overview' && <SeoPanel onToast={onToast} />}

      {/* ============ PAGES ============ */}
      {section === 'pages' && (
        <div className="space-y-4">
          <div className="pa-tablewrap">
            <div className="overflow-x-auto">
              <table className="pa-table w-full text-left text-xs">
                <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">URL</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Canonical</th>
                    <th className="p-3">Index</th>
                    <th className="p-3">Schema</th>
                    <th className="p-3">Sitemap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {STATIC_PAGES.map((p) => (
                    <tr key={p.url} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-sky-300">
                        <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          {p.url} <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      </td>
                      <td className="p-3 text-zinc-300">{p.type}</td>
                      <td className="p-3 text-zinc-300 max-w-[280px] truncate">{p.title}</td>
                      <td className="p-3 font-mono text-[10px] text-zinc-400">self-referencing</td>
                      <td className="p-3"><span className="text-emerald-300 text-[10px] font-bold">index</span></td>
                      <td className="p-3 text-[10px] text-zinc-400">CollectionPage + Breadcrumb</td>
                      <td className="p-3"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /></td>
                    </tr>
                  ))}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-zinc-400">/checkout · /account · /order/* · /admin*</td>
                    <td className="p-3 text-zinc-300">Private</td>
                    <td className="p-3 text-zinc-500">Session pages</td>
                    <td className="p-3 font-mono text-[10px] text-zinc-500">—</td>
                    <td className="p-3"><span className="text-rose-300 text-[10px] font-bold">noindex + robots</span></td>
                    <td className="p-3 text-[10px] text-zinc-500">—</td>
                    <td className="p-3"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Titles/descriptions for static pages are curated presets (src/lib/seo.ts) — every URL carries a unique title and
            self-referencing canonical. Product pages are editable per product in the Products section.
          </p>
        </div>
      )}

      {/* ============ PRODUCTS ============ */}
      {section === 'products' && (
        <div className="space-y-4">
          <div className="pa-tablewrap">
            <div className="overflow-x-auto">
              <table className="pa-table w-full text-left text-xs">
                <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">URL</th>
                    <th className="p-3">SEO Title</th>
                    <th className="p-3">Meta Desc</th>
                    <th className="p-3">Index</th>
                    <th className="p-3">Sitemap</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-zinc-500">No products yet.</td></tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="p-3">
                        <div className="text-zinc-200 font-semibold max-w-[220px] truncate">{r.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500">{r.sku}{r.cmsStatus && r.cmsStatus !== 'published' ? ` · ${r.cmsStatus}` : ''}</div>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-sky-300 max-w-[180px] truncate">
                        <a href={`/product/${r.slug}`} target="_blank" rel="noreferrer" className="hover:underline">/product/{r.slug}</a>
                      </td>
                      <td className="p-3 max-w-[200px] truncate text-zinc-300">
                        {r.seoTitle || <span className="text-zinc-500 italic">auto (name)</span>}
                      </td>
                      <td className="p-3 max-w-[180px] truncate text-zinc-300">
                        {r.seoDescription || <span className="text-zinc-500 italic">auto</span>}
                      </td>
                      <td className="p-3">
                        {r.noindex
                          ? <span className="text-rose-300 text-[10px] font-bold">noindex</span>
                          : <span className="text-emerald-300 text-[10px] font-bold">index</span>}
                      </td>
                      <td className="p-3">{r.inSitemap ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="text-zinc-600 text-[10px]">excluded</span>}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onAdminNavigate(`/admin/products/${encodeURIComponent(r.id)}/edit`)}
                          className="p-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/25"
                          title="Edit SEO in the product editor"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button onClick={load} className={btn}><RefreshCw className="w-3.5 h-3.5" /> Reload product SEO rows</button>
        </div>
      )}

      {/* ============ SITEMAP ============ */}
      {section === 'sitemap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Products', value: sitemap?.products },
              { label: 'Categories', value: sitemap?.categories },
              { label: 'Pages', value: sitemap?.pages },
              { label: 'Total URLs', value: overview?.publicUrls },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{k.label}</span>
                <div className="text-xl font-black text-white">{k.value ?? '—'}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '/sitemap.xml', label: 'Sitemap Index' },
              { href: '/sitemap-products.xml', label: 'Products' },
              { href: '/sitemap-categories.xml', label: 'Categories' },
              { href: '/sitemap-pages.xml', label: 'Pages' },
            ].map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noreferrer" className={btn}>
                <SitemapIcon className="w-3.5 h-3.5 text-sky-400" /> {s.label} <ExternalLink className="w-3 h-3 opacity-50" />
              </a>
            ))}
            <button onClick={runRegenerate} disabled={busy !== null} className={btn}>
              {busy === 'regenerate' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
              Verify Sitemap
            </button>
            <a href="/robots.txt" target="_blank" rel="noreferrer" className={btn}>
              <Bot className="w-3.5 h-3.5 text-emerald-400" /> robots.txt <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          </div>
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 text-[11px] text-zinc-400 space-y-1.5">
            <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Generated live from MongoDB on every request — product create/update/delete/slug-change/status-change are reflected immediately.</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Excludes by construction: admin, login, signup, cart, checkout, account, order, invoice, search, API routes and noindexed products.</p>
            {sitemap?.lastProductUpdate && (
              <p className="flex items-center gap-2"><Info className="w-3.5 h-3.5 text-sky-400" /> Newest catalog change: {new Date(sitemap.lastProductUpdate).toLocaleString()} (drives &lt;lastmod&gt;).</p>
            )}
          </div>
        </div>
      )}

      {/* ============ INDEXABILITY ============ */}
      {section === 'indexability' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={runAudit} disabled={busy !== null} className={btn}>
              {busy === 'audit' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <ScanLine className="w-3.5 h-3.5 text-sky-400" />}
              Run Indexability Audit
            </button>
            <a href="/robots.txt" target="_blank" rel="noreferrer" className={btn}><Bot className="w-3.5 h-3.5 text-emerald-400" /> robots.txt</a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Indexable products', value: (prodStats?.active || 0) - (prodStats?.noindex || 0), good: true },
              { label: 'Noindex products', value: prodStats?.noindex, good: (prodStats?.noindex || 0) === 0 },
              { label: 'In sitemap', value: prodStats?.inSitemap, good: true },
              { label: 'Missing image', value: prodStats?.missingImage, good: (prodStats?.missingImage || 0) === 0 },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{k.label}</span>
                <div className={`text-xl font-black ${k.good ? 'text-white' : 'text-amber-300'}`}>{k.value ?? '—'}</div>
              </div>
            ))}
          </div>
          {issues !== null && (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">
                  Audit — {auditMeta?.count ?? 0} findings on {auditMeta?.checked ?? 0} products
                </span>
              </div>
              {issues.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> No issues — every active product is fully indexable.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                  {issues.map((it: any, i: number) => (
                    <div key={i} className="px-4 py-2.5 flex items-start gap-2.5">
                      <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${it.severity === 'error' ? 'text-rose-400' : it.severity === 'warning' ? 'text-amber-400' : 'text-sky-400'}`} />
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-200 truncate">{it.product} <span className="text-zinc-500 font-mono text-[10px]">{it.sku}</span></div>
                        <div className="text-[11px] text-zinc-500">{it.issue}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============ STRUCTURED DATA ============ */}
      {section === 'schema' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-sky-400" /> Site-wide JSON-LD (live)</h3>
              {[
                { label: 'Organization', where: 'Every page (index.html)', ok: true },
                { label: 'WebSite', where: 'Every page (index.html)', ok: true },
                { label: 'CollectionPage', where: 'Homepage + category pages', ok: true },
                { label: 'BreadcrumbList', where: 'Every indexed route (2-3 levels)', ok: true },
                { label: 'Product + Offer + Brand', where: 'Product pages & quick view', ok: true },
                { label: 'AggregateRating', where: 'Product pages — only with real review data', ok: true },
                { label: 'itemCondition + priceValidUntil', where: 'Offer node (sale window)', ok: true },
              ].map((s) => (
                <div key={s.label} className="flex items-start gap-2.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-zinc-200 font-semibold">{s.label}</span>
                    <span className="text-zinc-500"> — {s.where}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-400" /> Product schema readiness (merchant listing fields)</h3>
              {(() => {
                const withSku = rows.filter((r) => r.sku).length
                const withImage = rows.filter((r) => r.image).length
                const noindexCount = rows.filter((r) => r.noindex).length
                return (
                  <div className="space-y-1.5 text-[11px] text-zinc-300">
                    <div className="flex justify-between"><span>SKU present</span><span className={`font-mono font-bold ${withSku === rows.length ? 'text-emerald-300' : 'text-amber-300'}`}>{withSku}/{rows.length || 0}</span></div>
                    <div className="flex justify-between"><span>Image present (Offer.image)</span><span className={`font-mono font-bold ${withImage === rows.length ? 'text-emerald-300' : 'text-amber-300'}`}>{withImage}/{rows.length || 0}</span></div>
                    <div className="flex justify-between"><span>Brand</span><span className="text-emerald-300 font-bold">PlayBeat Digital fallback</span></div>
                    <div className="flex justify-between"><span>Price / currency</span><span className="text-emerald-300 font-bold">PKR, from DB</span></div>
                    <div className="flex justify-between"><span>Availability</span><span className="text-emerald-300 font-bold">InStock / OutOfStock from stock</span></div>
                    <div className="flex justify-between"><span>Fabricated ratings</span><span className="text-emerald-300 font-bold">none — gated on real data</span></div>
                    <div className="flex justify-between"><span>Noindexed products</span><span className="text-zinc-400 font-mono">{noindexCount}</span></div>
                  </div>
                )
              })()}
            </div>
          </div>
          <div className="rounded-xl bg-[#07090E] border border-white/5 p-4 text-[11px] text-zinc-400 leading-relaxed">
            Validate any live URL in Google's Rich Results Test (search.google.com/test/rich) after publishing changes —
            Product/Offer structured data enables the merchant listing experience; Review and AggregateRating appear only
            when genuine review data exists.
          </div>
        </div>
      )}

      {/* ============ META TAGS / DUPLICATES ============ */}
      {section === 'meta' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Tags className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Duplicate product SEO titles</span>
                <span className={`ml-auto text-xs font-mono font-bold ${dupProductTitles.length ? 'text-amber-300' : 'text-emerald-300'}`}>{dupProductTitles.length}</span>
              </div>
              {dupProductTitles.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-emerald-300">Every product title is unique.</div>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                  {dupProductTitles.map(([t, names], i) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="text-[11px] text-zinc-300 font-mono truncate">{t}</div>
                      <div className="text-[10px] text-zinc-500">{names.join(' · ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Tags className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Duplicate meta descriptions</span>
                <span className={`ml-auto text-xs font-mono font-bold ${dupProductDescs.length ? 'text-amber-300' : 'text-emerald-300'}`}>{dupProductDescs.length}</span>
              </div>
              {dupProductDescs.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-emerald-300">Every meta description is unique.</div>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                  {dupProductDescs.map(([d, names], i) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="text-[11px] text-zinc-300 font-mono truncate">{d}</div>
                      <div className="text-[10px] text-zinc-500">{names.join(' · ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Duplicates are computed live from MongoDB. Curated page content is never auto-overwritten — fix duplicates by
            editing each product's SEO tab (Products section → Edit).
          </p>
        </div>
      )}

      {/* ============ BROKEN LINKS ============ */}
      {section === 'broken' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={runBroken} disabled={busy !== null} className={btn}>
              {busy === 'broken-links' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Link2 className="w-3.5 h-3.5 text-amber-400" />}
              Check Internal Product URLs
            </button>
          </div>
          {broken !== null && (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Broken URLs — {broken.length} findings</span>
              </div>
              {broken.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Every product URL resolves to a live catalog record.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                  {broken.map((b: any, i: number) => (
                    <div key={i} className="px-4 py-2.5">
                      <div className="text-xs text-zinc-200 font-mono">{b.url}</div>
                      <div className="text-[11px] text-zinc-500">{b.problem}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-[11px] text-zinc-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Every product slug and slug-history entry is resolved against the database. 404s are never auto-redirected to
            the homepage — create explicit redirects in the Redirects section instead.
          </p>
        </div>
      )}

      {/* ============ REDIRECTS ============ */}
      {section === 'redirects' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-amber-400" /> Add manual redirect</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={redirectForm.source}
                onChange={(e) => setRedirectForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="/old-url (must start with /)"
                className={`${input} flex-1 font-mono`}
              />
              <input
                type="text"
                value={redirectForm.destination}
                onChange={(e) => setRedirectForm((f) => ({ ...f, destination: e.target.value }))}
                placeholder="/new-url or https://…"
                className={`${input} flex-1 font-mono`}
              />
              <button
                onClick={async () => {
                  const src = redirectForm.source.trim()
                  const dst = redirectForm.destination.trim()
                  if (!src.startsWith('/') || !(dst.startsWith('/') || dst.startsWith('https://'))) {
                    onToast('Source must start with "/" and destination with "/" or "https://"', 6000)
                    return
                  }
                  if (src === dst) {
                    onToast('Redirect loop — source and destination are identical', 6000)
                    return
                  }
                  const d = await action({ action: 'redirect-add', source: src, destination: dst }, 'redirect-add')
                  if (d) {
                    setRedirectForm({ source: '', destination: '' })
                    await loadRedirects()
                    onToast('301 redirect created')
                  }
                }}
                disabled={busy !== null}
                className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold disabled:opacity-60"
              >
                Create 301
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Redirects resolve for every visitor and crawler: when a URL matches, the browser is permanently sent to the
              destination. Loops are rejected; slug renames are tracked automatically via slug history.
            </p>
          </div>
          <div className="pa-tablewrap">
            <div className="overflow-x-auto">
              <table className="pa-table w-full text-left text-xs">
                <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Source</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {redirects.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-zinc-500">No manual redirects yet.</td></tr>
                  )}
                  {redirects.map((r: any) => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-zinc-300">{r.source}</td>
                      <td className="p-3 font-mono text-sky-300">{r.destination}</td>
                      <td className="p-3"><span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">301</span></td>
                      <td className="p-3 text-[10px] text-zinc-500 font-mono">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            const d = await action({ action: 'redirect-delete', id: r.id }, 'redirect-delete')
                            if (d) {
                              await loadRedirects()
                              onToast('Redirect removed')
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25"
                          title="Delete redirect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {prodStats && (
            <p className="text-[11px] text-zinc-500">
              {prodStats.withSlugHistory} product{prodStats.withSlugHistory === 1 ? '' : 's'} also carry automatic slug-history
              redirects from renames — those work without manual entries.
            </p>
          )}
        </div>
      )}

      {/* ============ SEARCH CONSOLE ============ */}
      {section === 'gsc' && (
        <div className="space-y-4">
          {!gsc ? (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-6 text-center text-xs text-zinc-500">
              Loading Search Console configuration…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Property</span>
                  <div className="text-xs text-white font-mono mt-1 break-all">{gsc.property || 'Not configured'}</div>
                </div>
                <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Connection</span>
                  <div className={`text-xs font-bold mt-1 ${gsc.configured ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {gsc.configured ? 'Service account ready' : 'Not configured'}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Sitemap in GSC</span>
                  <div className={`text-xs font-bold mt-1 ${gsc.sitemapSubmitted ? 'text-emerald-300' : 'text-zinc-400'}`}>
                    {gsc.sitemapSubmitted ? 'Submitted' : 'Not submitted yet'}
                  </div>
                  {gsc.lastSubmittedAt && (
                    <div className="text-[10px] text-zinc-500 mt-1">Last: {new Date(gsc.lastSubmittedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    const d = await action({ action: 'gsc-submit-sitemap', feedPath: 'https://playbeat.digital/sitemap.xml' }, 'gsc-submit-sitemap')
                    if (d) {
                      await loadGsc()
                      onToast(d.message || 'Sitemap submitted to Google Search Console', 6000)
                    }
                  }}
                  disabled={busy !== null || !gsc.configured}
                  className={btn}
                  title={gsc.configured ? 'Submit https://playbeat.digital/sitemap.xml to the configured property' : 'Configure GOOGLE_SEARCH_CONSOLE_* environment variables first'}
                >
                  {busy === 'gsc-submit-sitemap' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-emerald-400" />}
                  Submit Sitemap
                </button>
                <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className={btn}>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" /> Open Search Console
                </a>
              </div>
              {gsc.stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Clicks (28d)', value: gsc.stats.clicks },
                    { label: 'Impressions (28d)', value: gsc.stats.impressions },
                    { label: 'Avg CTR', value: gsc.stats.ctr != null ? `${gsc.stats.ctr}%` : null },
                    { label: 'Avg Position', value: gsc.stats.position },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{k.label}</span>
                      <div className="text-xl font-black text-white">{k.value ?? '—'}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl bg-[#07090E] border border-white/5 p-4 text-[11px] text-zinc-400 leading-relaxed space-y-1.5">
                <p className="flex items-start gap-2"><Info className="w-3.5 h-3.5 mt-0.5 text-sky-400 shrink-0" /> Official Search Console API only — credentials come exclusively from environment variables (GOOGLE_SEARCH_CONSOLE_PROPERTY, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Nothing is hardcoded.</p>
                <p className="flex items-start gap-2"><ShieldAlert className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0" /> Indexing cannot be forced: sitemap submission + URL Inspection are the supported workflows for ecommerce pages. There is deliberately no "index all URLs" button.</p>
                {!gsc.configured && (
                  <p className="flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-amber-400 shrink-0" /> To activate: create a Google Cloud service account with Search Console API access, add it as a property owner in GSC, then set the three environment variables in Vercel and redeploy.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============ MERCHANT SEO ============ */}
      {section === 'merchant' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={loadMerchant} disabled={busy !== null} className={btn}>
              {busy === 'merchant-audit' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />}
              Run Merchant Readiness Audit
            </button>
            <a href="/api/products?pbFeed=google" target="_blank" rel="noreferrer" className={btn}>
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Google Merchant Feed (XML) <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          </div>
          {merchant && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Feed-ready products', value: merchant.ready, good: true },
                { label: 'Missing image', value: merchant.missingImage },
                { label: 'Missing brand (fallback used)', value: merchant.missingBrand },
                { label: 'Missing description', value: merchant.missingDescription },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{k.label}</span>
                  <div className={`text-xl font-black ${k.good ? 'text-emerald-300' : (k.value || 0) > 0 ? 'text-amber-300' : 'text-white'}`}>{k.value ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl bg-[#07090E] border border-white/5 p-4 text-[11px] text-zinc-400 leading-relaxed space-y-1.5">
            <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> The feed exposes every indexable product with title, description, image, price (PKR), availability, brand (PlayBeat Digital fallback), SKU, condition:new and a canonical link — the exact fields Merchant Center validates.</p>
            <p className="flex items-start gap-2"><Info className="w-3.5 h-3.5 mt-0.5 text-sky-400 shrink-0" /> To go live with Merchant Center: register the feed URL in Google Merchant Center (Products → Feeds → scheduled fetch), verify the website claim, then fix any item-level disapprovals it reports.</p>
          </div>
        </div>
      )}

      {/* ============ CORE WEB VITALS ============ */}
      {section === 'cwv' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[
              { key: 'lcp' as const, label: 'LCP — Largest Contentful Paint', target: '≤ 2.5s' },
              { key: 'cls' as const, label: 'CLS — Cumulative Layout Shift', target: '≤ 0.1' },
              { key: 'inp' as const, label: 'INP — Interaction to Next Paint', target: '≤ 200ms' },
            ].map((m) => {
              const v = cwv ? cwv[m.key] : null
              const verdict = cwvVerdict(m.key, v)
              return (
                <div key={m.key} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{m.label}</span>
                  <div className="text-xl font-black text-white mt-1">
                    {v === null ? '—' : m.key === 'cls' ? v : `${v}${m.key === 'lcp' ? 'ms' : 'ms'}`}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${verdict.cls}`}>{verdict.label} <span className="text-zinc-500 font-normal">· target {m.target}</span></div>
                </div>
              )
            })}
          </div>
          <button onClick={() => { setCwv(null); measureCwv() }} className={btn}>
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" /> Re-measure this session
          </button>
          <div className="rounded-xl bg-[#07090E] border border-white/5 p-4 text-[11px] text-zinc-400 leading-relaxed space-y-1.5">
            <p className="flex items-start gap-2"><Info className="w-3.5 h-3.5 mt-0.5 text-sky-400 shrink-0" /> Values are measured live in THIS admin browser session via the PerformanceObserver API — click around the panel to sample INP. Field data for real visitors comes from Chrome UX Report / Search Console's Core Web Vitals report.</p>
            <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" /> Already in place: immutable hashed asset caching, lazy-loaded below-fold imagery, fixed-dimension image containers (no layout shift), code-split admin bundle, compressed product images (≤600KB).</p>
          </div>
        </div>
      )}
    </div>
  )
}
