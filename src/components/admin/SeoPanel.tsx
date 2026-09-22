import React from 'react'
import {
  Search,
  RefreshCw,
  ExternalLink,
  FileText,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Link2,
  Globe,
  ScanLine,
  Info,
} from 'lucide-react'

// SeoPanel — URL Indexing dashboard (audit §43).
// Live data from /api/admin/seo: sitemap composition, indexability issues,
// broken-link resolution and slug-history (redirect) coverage.
//
// IMPORTANT: this dashboard intentionally does NOT claim "Indexed by Google".
// Real indexing status can only come from Google Search Console — the panel
// surfaces crawlability/URL health instead, plus quick links to the live
// sitemap and robots.txt.

interface SeoIssue {
  product: string
  sku: string
  issue: string
  severity: string
}

interface SeoOverview {
  publicUrls?: number
  sitemap?: { pages: number; categories: number; products: number; lastProductUpdate: string | null }
  products?: {
    total: number
    active: number
    inSitemap: number
    noindex: number
    missingDescription: number
    missingImage: number
    missingSlug: number
    duplicateSlugs: string[]
    duplicateSeoTitles: string[]
    withSlugHistory: number
  }
  notes?: string[]
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

export const SeoPanel: React.FC<{ onToast?: (msg: string) => void }> = ({ onToast }) => {
  const [overview, setOverview] = React.useState<SeoOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [issues, setIssues] = React.useState<SeoIssue[] | null>(null)
  const [broken, setBroken] = React.useState<{ url: string; problem: string }[] | null>(null)
  const [auditMeta, setAuditMeta] = React.useState<{ checked: number; count: number } | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/seo`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setOverview(data.seo || null)
    } catch {
      /* silent — empty state renders */
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const runAction = async (action: 'audit' | 'broken-links' | 'regenerate') => {
    setBusy(action)
    try {
      const res = await fetch(`${API_BASE}/api/admin/seo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data?.success) {
        if (action === 'audit') {
          setIssues(data.issues || [])
          setAuditMeta({ checked: data.checked || 0, count: data.issueCount || 0 })
          onToast?.(`SEO audit finished — ${data.issueCount || 0} findings across ${data.checked || 0} products`)
        } else if (action === 'broken-links') {
          setBroken(data.broken || [])
          onToast?.(`Broken-link check finished — ${data.brokenCount || 0} issues on ${data.checked || 0} URLs`)
        } else {
          await load()
          onToast?.('Sitemap verified — generated live from MongoDB')
        }
      }
    } catch {
      onToast?.('SEO action failed — check the API connection')
    } finally {
      setBusy(null)
    }
  }

  const kpi =
    'rounded-2xl bg-[#0B0F19] border border-white/5 p-4 flex flex-col gap-1'
  const kpiLabel = 'text-[10px] font-mono uppercase tracking-wider text-zinc-500'
  const kpiValue = 'text-xl font-black text-white'
  const btn =
    'flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-60 shrink-0'

  const sitemap = overview?.sitemap
  const products = overview?.products

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-sky-400 inline-block" />
            SEO &amp; URL Indexing
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Crawlability health for playbeat.digital — live sitemap, indexability and internal URL checks.
          </p>
        </div>
        <button onClick={load} disabled={loading} className={btn}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <a href="/sitemap.xml" target="_blank" rel="noreferrer" className={btn}>
          <FileText className="w-3.5 h-3.5 text-sky-400" /> View Sitemap <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
        <a href="/robots.txt" target="_blank" rel="noreferrer" className={btn}>
          <Bot className="w-3.5 h-3.5 text-emerald-400" /> View Robots.txt <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
        <a href="/sitemap-products.xml" target="_blank" rel="noreferrer" className={btn}>
          <Link2 className="w-3.5 h-3.5 text-amber-400" /> Product Map <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={kpi}>
          <span className={kpiLabel}>Public URLs</span>
          <span className={kpiValue}>{overview?.publicUrls ?? '—'}</span>
          <span className="text-[10px] text-zinc-500">pages + categories + products</span>
        </div>
        <div className={kpi}>
          <span className={kpiLabel}>In Sitemap</span>
          <span className={kpiValue}>
            {sitemap ? `${sitemap.products}` : '—'}
          </span>
          <span className="text-[10px] text-zinc-500">
            products · {sitemap ? sitemap.categories : '—'} categories · {sitemap ? sitemap.pages : '—'} pages
          </span>
        </div>
        <div className={kpi}>
          <span className={kpiLabel}>Noindex</span>
          <span className={kpiValue}>{products ? products.noindex : '—'}</span>
          <span className="text-[10px] text-zinc-500">manually excluded products</span>
        </div>
        <div className={kpi}>
          <span className={kpiLabel}>301 Redirects</span>
          <span className={kpiValue}>{products ? products.withSlugHistory : '—'}</span>
          <span className="text-[10px] text-zinc-500">products with slug history</span>
        </div>
      </div>

      {/* Health rows */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 divide-y divide-white/5">
        {[
          {
            label: 'Products missing description',
            value: products?.missingDescription,
            bad: (products?.missingDescription || 0) > 0,
          },
          {
            label: 'Products missing image (OG fallback used)',
            value: products?.missingImage,
            bad: (products?.missingImage || 0) > 0,
          },
          {
            label: 'Products missing slug',
            value: products?.missingSlug,
            bad: (products?.missingSlug || 0) > 0,
          },
          {
            label: 'Duplicate slugs',
            value: products?.duplicateSlugs?.length,
            bad: (products?.duplicateSlugs?.length || 0) > 0,
          },
          {
            label: 'Duplicate SEO titles',
            value: products?.duplicateSeoTitles?.length,
            bad: (products?.duplicateSeoTitles?.length || 0) > 0,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              {row.bad ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs text-zinc-300">{row.label}</span>
            </div>
            <span className={`text-xs font-bold font-mono ${row.bad ? 'text-amber-300' : 'text-emerald-300'}`}>
              {row.value ?? '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => runAction('audit')} disabled={busy !== null} className={btn}>
          <ScanLine className={`w-3.5 h-3.5 text-sky-400 ${busy === 'audit' ? 'animate-pulse' : ''}`} />
          Run SEO Audit
        </button>
        <button onClick={() => runAction('broken-links')} disabled={busy !== null} className={btn}>
          <Link2 className={`w-3.5 h-3.5 text-amber-400 ${busy === 'broken-links' ? 'animate-pulse' : ''}`} />
          Check Broken Links
        </button>
        <button onClick={() => runAction('regenerate')} disabled={busy !== null} className={btn}>
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${busy === 'regenerate' ? 'animate-spin' : ''}`} />
          Verify Sitemap
        </button>
      </div>

      {/* Last sitemap update */}
      {sitemap?.lastProductUpdate && (
        <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          Newest catalog change: {new Date(sitemap.lastProductUpdate).toLocaleString()} (drives &lt;lastmod&gt;)
        </p>
      )}

      {/* Audit results */}
      {issues !== null && (
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white">
              SEO Audit — {auditMeta?.count ?? 0} findings on {auditMeta?.checked ?? 0} products
            </span>
          </div>
          {issues.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> No issues found — every active product is fully indexable.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {issues.map((it, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-2.5">
                  <Info
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      it.severity === 'error'
                        ? 'text-rose-400'
                        : it.severity === 'warning'
                          ? 'text-amber-400'
                          : 'text-sky-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-200 truncate">
                      {it.product} <span className="text-zinc-500 font-mono text-[10px]">{it.sku}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">{it.issue}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Broken link results */}
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
              {broken.map((b, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="text-xs text-zinc-200 font-mono">{b.url}</div>
                  <div className="text-[11px] text-zinc-500">{b.problem}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Honest scope note */}
      <div className="rounded-xl bg-[#07090E] border border-white/5 p-4 flex items-start gap-2.5">
        <Search className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
        <div className="text-[11px] text-zinc-400 leading-relaxed">
          {overview?.notes?.[0] || 'Sitemap is generated live from MongoDB on every request.'}{' '}
          {overview?.notes?.[1] ||
            'Actual Google indexing status is only visible in Google Search Console — this dashboard reports URL and crawlability health.'}
        </div>
      </div>
    </div>
  )
}
