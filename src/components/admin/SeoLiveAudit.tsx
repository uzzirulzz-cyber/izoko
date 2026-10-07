// SeoLiveAudit — SEO Control Center → Live Audit + Integrations sections.
//
// Functional upgrade only: reuses the existing SeoControlCenter design system
// (same dark cards, chips, pa-table styles) — no redesign of any existing UI.
//
// Honesty rules (per spec):
//   - every number comes from a real production crawl / MongoDB run document /
//     official Google API response; unavailable data renders "Not available"
//   - progress is driven by the admin client (crawl-batch loop) so the UI
//     never freezes and each request stays inside serverless time limits

import React from 'react'
import {
  RefreshCw, ExternalLink, ScanLine, Loader2, Download, Globe, Play,
  AlertTriangle, CheckCircle2, XCircle, Info, Activity, Gauge, FileJson,
  FileSpreadsheet, Server, ShieldCheck, ChevronDown, ChevronRight, Ban,
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

export interface SeoLiveAuditProps {
  onToast: (msg: string, ms?: number) => void
  products: Array<{ id?: string; _id?: string; name?: string; slug?: string; sku?: string }>
}

const btn =
  'flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-60 shrink-0'
const btnPrimary =
  'flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition disabled:opacity-60 shrink-0'
const inputCls =
  'px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 min-w-0'

const SEV_STYLE: Record<string, { chip: string; text: string; label: string }> = {
  critical: { chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30', text: 'text-rose-300', label: 'CRITICAL' },
  high: { chip: 'bg-orange-500/15 text-orange-300 border-orange-500/30', text: 'text-orange-300', label: 'HIGH' },
  medium: { chip: 'bg-amber-400/15 text-amber-300 border-amber-400/30', text: 'text-amber-300', label: 'MEDIUM' },
  low: { chip: 'bg-sky-400/15 text-sky-300 border-sky-400/30', text: 'text-sky-300', label: 'LOW' },
  info: { chip: 'bg-zinc-400/10 text-zinc-300 border-white/10', text: 'text-zinc-300', label: 'INFO' },
}

const scoreTone = (v: number | null | undefined) =>
  v == null ? 'text-zinc-500'
    : v >= 90 ? 'text-emerald-300'
    : v >= 80 ? 'text-emerald-300'
    : v >= 65 ? 'text-amber-300'
    : v >= 40 ? 'text-orange-300'
    : 'text-rose-300'

const scoreLabel = (v: number | null | undefined) =>
  v == null ? 'Not available'
    : v >= 90 ? 'Excellent' : v >= 80 ? 'Good' : v >= 65 ? 'Needs Improvement' : v >= 40 ? 'Poor' : 'Critical'

interface PageResult {
  url: string; type: string; httpStatus: number; finalUrl: string
  redirectChain: Array<{ url: string; status: number; location?: string }>
  ttfbMs: number | null; indexable: boolean; indexReason: string
  title: string; titleLength: number; metaDescription: string; metaDescriptionLength: number
  canonical: string | null; canonicalSelf: boolean | null
  h1: string[]; h1Count: number; h2Count: number; h3Count: number; wordCount: number
  ogTitle: string; ogDescription: string; ogImage: string
  twitterCard: string; twitterTitle: string; twitterImage: string
  jsonLd: Array<{ valid: boolean; types: string[]; error?: string }>
  imagesTotal: number; imagesMissingAlt: number; imagesEmptyAlt: number
  anchorsTotal: number; anchorsInternal: number; anchorsExternal: number
  spaShell: boolean; soft404Suspected: boolean; sitemapIncluded: boolean
  score: number; scoreNotes: Array<{ label: string; points: number; max: number; note?: string }>
  issues: Array<{ severity: string; code: string; message: string }>
}
interface RunDoc {
  _id?: string; mode?: string; trigger?: string; status: string
  startedAt: string; completedAt: string | null; durationMs: number | null
  totalUrls: number; crawledUrls: number; failedUrls: number
  progress: { phase: string; crawled: number; total: number }
  discovered?: any; robots?: any; pages: PageResult[]
  score?: { total: number; breakdown: Array<{ component: string; weight: number; earned: number; measured: boolean; basis: string }>; partial: boolean; note: string } | null
  duplicates?: any; sitemapValidation?: any; summary?: any
}
interface Finding {
  _id: string; key: string; severity: string; category: string
  title: string; detail: string; urls: string[]; data?: any
  firstSeenAt: string; lastSeenAt: string; ignored?: boolean; resolved?: boolean
}

async function apiPost<T = any>(body: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`${API_BASE}/api/admin/seo/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!data || data.success === false) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}
async function apiGet<T = any>(runId?: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}/api/admin/seo/audit${runId ? `?runId=${runId}` : ''}`, {
    headers: { Authorization: `Bearer ${getAdminToken()}` },
    credentials: 'include',
  })
  const data = await res.json().catch(() => null)
  if (!data || data.success === false) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}

// ---------------------------------------------------------------------------
// LIVE AUDIT SECTION
// ---------------------------------------------------------------------------
export const SeoLiveAudit: React.FC<SeoLiveAuditProps> = ({ onToast }) => {
  const [run, setRun] = React.useState<RunDoc | null>(null)
  const [findings, setFindings] = React.useState<Finding[]>([])
  const [history, setHistory] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [auditing, setAuditing] = React.useState(false)
  const [progressMsg, setProgressMsg] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [pageAuditUrl, setPageAuditUrl] = React.useState('')
  const [pageResult, setPageResult] = React.useState<PageResult | null>(null)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [expandedFinding, setExpandedFinding] = React.useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = React.useState<string>('')
  const [pageFilter, setPageFilter] = React.useState('')
  const [cwv, setCwv] = React.useState<any>(null)
  const [cwvHistory, setCwvHistory] = React.useState<any[]>([])
  const [gsc, setGsc] = React.useState<any>(null)
  const [inspectUrl, setInspectUrl] = React.useState('')
  const [inspection, setInspection] = React.useState<any>(null)
  const [selectedPage, setSelectedPage] = React.useState<PageResult | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiGet<any>()
      setRun(d.run || null)
      setFindings(d.findings || [])
      setHistory(d.history || [])
    } catch (e: any) {
      onToast(e.message || 'Failed to load audit status', 6000)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load() }, [load])

  // ---- Full audit driver: start → crawl-batch loop → finalize ----
  const runFullAudit = async () => {
    setAuditing(true)
    setPageResult(null)
    try {
      setProgressMsg('Discovering URLs (sitemaps, MongoDB, navigation)…')
      const started = await apiPost<any>({ action: 'start', mode: 'full' })
      const { runId, totalUrls, batchSize } = started
      let crawled = 0
      let done = false
      while (!done) {
        const batch = await apiPost<any>({ action: 'crawl-batch', runId, batchSize })
        crawled = batch.crawled
        setProgressMsg(`Crawling ${crawled} / ${totalUrls} URLs — checking metadata, canonicals, structured data…`)
        setRun((prev) => prev && prev._id === runId ? { ...prev, crawledUrls: crawled, totalUrls, progress: { phase: 'crawling', crawled, total: totalUrls } } : prev)
        done = batch.done
      }
      setProgressMsg('Checking sitemap truth, duplicates, structured data and scoring…')
      const fin = await apiPost<any>({ action: 'finalize', runId })
      setProgressMsg(null)
      onToast(`Live audit completed — SEO Health Score ${fin.score?.total ?? 'n/a'}%, ${fin.findingsCount} findings`)
      await load()
    } catch (e: any) {
      onToast(e.message || 'Audit failed', 7000)
      setProgressMsg(null)
    } finally {
      setAuditing(false)
    }
  }

  const recheckFailed = async () => {
    setAuditing(true)
    try {
      setProgressMsg('Re-checking previously failed URLs…')
      const started = await apiPost<any>({ action: 'recheck-failed' })
      if (started.failedCount === 0) {
        onToast(started.message || 'No failed URLs to recheck')
        setProgressMsg(null)
        setAuditing(false)
        return
      }
      const { runId, totalUrls } = started
      let done = false
      while (!done) {
        const batch = await apiPost<any>({ action: 'crawl-batch', runId, batchSize: 10 })
        setProgressMsg(`Re-checking ${batch.crawled} / ${totalUrls} URLs…`)
        done = batch.done
      }
      await apiPost({ action: 'finalize', runId })
      setProgressMsg(null)
      onToast('Recheck completed')
      await load()
    } catch (e: any) {
      onToast(e.message || 'Recheck failed', 7000)
      setProgressMsg(null)
    } finally {
      setAuditing(false)
    }
  }

  const runPageAudit = async () => {
    if (!pageAuditUrl.trim()) return
    setBusy('page-audit')
    try {
      const d = await apiPost<any>({ action: 'page-audit', url: pageAuditUrl.trim() })
      setPageResult(d.page)
      onToast(`Page audited — score ${d.page.score}/100`)
    } catch (e: any) {
      onToast(e.message || 'Page audit failed', 6000)
    } finally {
      setBusy(null)
    }
  }

  const refreshCwv = async (strategy: 'mobile' | 'desktop') => {
    setBusy(`cwv-${strategy}`)
    try {
      const d = await apiPost<any>({ action: 'pagespeed', strategy })
      setCwv(d.pagespeed)
      if (!d.pagespeed.available) onToast(`PageSpeed ${strategy}: ${d.pagespeed.reason || 'unavailable'}`, 7000)
      else onToast(`${strategy === 'mobile' ? 'Mobile' : 'Desktop'} PageSpeed captured — LCP ${Math.round((d.pagespeed.lab.lcpMs || 0) / 100) / 10}s`)
    } catch (e: any) {
      onToast(e.message || 'PageSpeed run failed', 7000)
    } finally {
      setBusy(null)
    }
  }
  const loadCwvHistory = React.useCallback(async () => {
    try {
      const d = await apiPost<any>({ action: 'cwv-history' })
      setCwvHistory(d.history || [])
    } catch { /* leave empty */ }
  }, [])
  const refreshGsc = async () => {
    setBusy('gsc')
    try {
      const d = await apiPost<any>({ action: 'gsc-refresh' })
      setGsc(d.gsc)
      if (!d.gsc.available) onToast(`Search Console: ${d.gsc.reason || 'not available'}`, 7000)
      else onToast('Search Console data refreshed (official API)')
    } catch (e: any) {
      onToast(e.message || 'Search Console refresh failed', 7000)
    } finally {
      setBusy(null)
    }
  }
  const runInspect = async () => {
    if (!inspectUrl.trim()) return
    setBusy('inspect')
    try {
      const d = await apiPost<any>({ action: 'gsc-inspect', url: inspectUrl.trim() })
      setInspection(d.inspection)
      if (!d.inspection.available) onToast(d.inspection.reason || 'URL inspection unavailable', 7000)
    } catch (e: any) {
      onToast(e.message || 'URL inspection failed', 6000)
    } finally {
      setBusy(null)
    }
  }

  const exportRun = async (format: 'csv' | 'json') => {
    setBusy(`export-${format}`)
    try {
      const res = await fetch(`${API_BASE}/api/admin/seo/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
        body: JSON.stringify({ action: 'export', format, runId: run?._id || '' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error || `Export failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `seo-audit-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      onToast(`Audit report exported (${format.toUpperCase()})`)
    } catch (e: any) {
      onToast(e.message || 'Export failed', 6000)
    } finally {
      setBusy(null)
    }
  }

  const ignoreFinding = async (id: string) => {
    try {
      await apiPost({ action: 'finding-ignore', id })
      setFindings((prev) => prev.filter((f) => f._id !== id))
      onToast('Finding marked ignored (it will not reappear in the open list)')
    } catch (e: any) {
      onToast(e.message || 'Could not ignore finding', 6000)
    }
  }

  const score = run?.score
  const counts = run?.summary?.counts
  const sevCounts = run?.summary?.severityCounts
  const pages = run?.pages || []
  const filteredPages = pages.filter((p) => {
    if (!pageFilter) return true
    const q = pageFilter.toLowerCase()
    return p.url.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || String(p.httpStatus).includes(q)
  })

  const cwvStatus = (kind: 'lcp' | 'cls' | 'inp', v: number | null) => {
    if (v == null) return { label: 'Not available', cls: 'text-zinc-500' }
    if (kind === 'lcp') return v <= 2500 ? { label: 'Good', cls: 'text-emerald-300' } : v <= 4000 ? { label: 'Needs Improvement', cls: 'text-amber-300' } : { label: 'Poor', cls: 'text-rose-300' }
    if (kind === 'cls') return v <= 0.1 ? { label: 'Good', cls: 'text-emerald-300' } : v <= 0.25 ? { label: 'Needs Improvement', cls: 'text-amber-300' } : { label: 'Poor', cls: 'text-rose-300' }
    return v <= 200 ? { label: 'Good', cls: 'text-emerald-300' } : v <= 500 ? { label: 'Needs Improvement', cls: 'text-amber-300' } : { label: 'Poor', cls: 'text-rose-300' }
  }

  const dup = run?.duplicates
  const smap = run?.sitemapValidation

  return (
    <div className="space-y-4">
      {/* ---- Action bar ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={runFullAudit} disabled={auditing || busy !== null} className={btnPrimary}>
          {auditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {auditing ? 'Audit running…' : 'Run Full Audit'}
        </button>
        <button onClick={recheckFailed} disabled={auditing || busy !== null} className={btn}>
          <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin text-sky-400' : 'text-sky-400'}`} /> Recheck Failed URLs
        </button>
        <button onClick={refreshGsc} disabled={busy !== null || auditing} className={btn}>
          {busy === 'gsc' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" /> : <Globe className="w-3.5 h-3.5 text-sky-400" />} Refresh Search Console
        </button>
        <button onClick={() => refreshCwv('mobile')} disabled={busy !== null || auditing} className={btn}>
          {busy === 'cwv-mobile' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Gauge className="w-3.5 h-3.5 text-emerald-400" />} Refresh Core Web Vitals (Mobile)
        </button>
        <button onClick={() => refreshCwv('desktop')} disabled={busy !== null || auditing} className={btn}>
          {busy === 'cwv-desktop' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Gauge className="w-3.5 h-3.5 text-emerald-400" />} Desktop
        </button>
        <button onClick={() => exportRun('csv')} disabled={busy !== null || !run?.status || run.status !== 'completed'} className={btn}>
          {busy === 'export-csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Export CSV
        </button>
        <button onClick={() => exportRun('json')} disabled={busy !== null || !run?.status || run.status !== 'completed'} className={btn}>
          {busy === 'export-json' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileJson className="w-3.5 h-3.5" />} Export JSON
        </button>
      </div>

      {progressMsg && (
        <div className="rounded-2xl bg-[#0B0F19] border border-sky-400/20 p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400 shrink-0" />
          <span className="text-xs text-sky-200 font-medium">{progressMsg}</span>
        </div>
      )}

      {loading && !run ? (
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-6 text-xs text-zinc-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading audit status…
        </div>
      ) : !run ? (
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-6 text-xs text-zinc-400">
          <p className="font-semibold text-zinc-200 mb-1.5">No live audit has been run yet.</p>
          <p className="text-zinc-500">Run Full Audit crawls every public URL on playbeat.digital (sitemaps + MongoDB + navigation), checks metadata, canonicals, headings, structured data, broken links and sitemap truth, then computes the SEO Health Score from the measured results.</p>
        </div>
      ) : (
        <>
          {/* ---- Status + score ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Last Full SEO Audit</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${run.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : run.status === 'running' ? 'bg-sky-400/15 text-sky-300 border-sky-400/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>
                  {run.status === 'completed' ? 'Completed' : run.status === 'running' ? 'In Progress' : run.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Date + Time', value: run.completedAt ? new Date(run.completedAt).toLocaleString() : run.status === 'running' ? 'running…' : 'Not available' },
                  { label: 'URLs Crawled', value: `${run.crawledUrls} / ${run.totalUrls}` },
                  { label: 'Audit Duration', value: run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : 'Not available' },
                  { label: 'Failed URLs', value: run.failedUrls ?? 0 },
                ].map((k) => (
                  <div key={k.label}>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">{k.label}</span>
                    <div className="text-sm font-bold text-white mt-0.5">{k.value}</div>
                  </div>
                ))}
              </div>
              {run.discovered && (
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                  <span>Discovered: <b className="text-zinc-300">{run.discovered.total} URLs</b></span>
                  <span>sitemap: {run.discovered.sources?.sitemap ?? 0}</span>
                  <span>MongoDB: {run.discovered.sources?.mongodb ?? 0}</span>
                  <span>static routes: {run.discovered.sources?.static ?? 0}</span>
                  <span>navigation: {run.discovered.sources?.nav ?? 0}</span>
                  {run.robots && <span>robots.txt: {run.robots.ok ? <span className="text-emerald-300">200 OK</span> : <span className="text-rose-300">unreachable</span>}</span>}
                </div>
              )}
              {run.summary?.previousRun && (
                <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-zinc-500">
                  Previous audit {new Date(run.summary.previousRun.startedAt).toLocaleString()} — score {run.summary.previousRun.score ?? 'n/a'} · {run.summary.previousRun.findingsCount ?? 'n/a'} findings · broken URLs {run.summary.previousRun.brokenUrls ?? 'n/a'}
                  {score?.total != null && run.summary.previousRun.score != null && (
                    <span className={score.total >= run.summary.previousRun.score ? 'text-emerald-300' : 'text-amber-300'}>
                      {' '}→ this run {score.total >= run.summary.previousRun.score ? '+' : ''}{score.total - run.summary.previousRun.score}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">SEO Health Score</span>
              <div className="flex items-end gap-2 mt-1">
                <span className={`text-4xl font-black ${scoreTone(score?.total)}`}>{score?.total ?? '—'}</span>
                <span className="text-zinc-500 text-xs mb-1.5">/ 100 · {scoreLabel(score?.total)}</span>
              </div>
              {score ? (
                <>
                  <div className="space-y-1.5 mt-3">
                    {score.breakdown.map((b) => (
                      <div key={b.component} title={b.basis}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className={b.measured ? 'text-zinc-400' : 'text-zinc-600 italic'}>{b.component} ({b.weight}%)</span>
                          <span className={b.measured ? 'text-zinc-300' : 'text-zinc-600 italic'}>{b.measured ? `${b.earned}/${b.weight}` : 'Not measured'}</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full ${b.measured ? (b.earned / b.weight >= 0.8 ? 'bg-emerald-400' : b.earned / b.weight >= 0.5 ? 'bg-amber-400' : 'bg-rose-400') : 'bg-zinc-700'}`} style={{ width: `${b.measured ? Math.min(100, (b.earned / b.weight) * 100) : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2.5 leading-relaxed">{score.note}</p>
                </>
              ) : (
                <p className="text-[11px] text-zinc-500 mt-2">Score appears after a completed audit. It is computed only from measured results.</p>
              )}
            </div>
          </div>

          {/* ---- Live findings grouped by severity ---- */}
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center gap-2">
              <ScanLine className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white flex-1">Live Audit Findings ({findings.length} open)</span>
              {['', 'critical', 'high', 'medium', 'low', 'info'].map((s) => (
                <button key={s || 'all'} onClick={() => setSeverityFilter(s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${severityFilter === s ? 'bg-amber-400 text-black border-amber-400' : s && SEV_STYLE[s] ? SEV_STYLE[s].chip + ' hover:brightness-125' : 'bg-transparent text-zinc-400 border-white/10'}`}>
                  {s ? SEV_STYLE[s].label : 'ALL'}
                </button>
              ))}
            </div>
            {findings.filter((f) => !severityFilter || f.severity === severityFilter).length === 0 ? (
              <div className="p-5 text-xs text-zinc-500 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No open findings in this severity group.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {findings.filter((f) => !severityFilter || f.severity === severityFilter).map((f) => (
                  <div key={f._id}>
                    <button className="w-full px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] text-left" onClick={() => setExpandedFinding(expandedFinding === f._id ? null : f._id)}>
                      {expandedFinding === f._id ? <ChevronDown className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${SEV_STYLE[f.severity]?.chip || SEV_STYLE.info.chip}`}>{SEV_STYLE[f.severity]?.label || f.severity.toUpperCase()}</span>
                      <span className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-zinc-200 block">{f.title}</span>
                        <span className="text-[10px] text-zinc-500">{f.category}{f.detail ? ` — ${f.detail.slice(0, 140)}` : ''}</span>
                      </span>
                      <span className="text-[10px] text-zinc-600 shrink-0">first seen {new Date(f.firstSeenAt).toLocaleDateString()}</span>
                    </button>
                    {expandedFinding === f._id && (
                      <div className="px-4 pb-4 pt-1 bg-black/20">
                        {f.data?.examples && (
                          <div className="mb-2 text-[11px] text-zinc-400 space-y-1">
                            {f.data.examples.map((x: any, i: number) => (
                              <div key={i} className="font-mono text-[10px] text-amber-200/80">{x.url} → canonical: {x.canonical}</div>
                            ))}
                          </div>
                        )}
                        {f.data?.value && <div className="mb-2 text-[11px] text-zinc-300">Value: <span className="font-mono text-[10px] text-amber-200/80">{String(f.data.value).slice(0, 300)}</span></div>}
                        {f.data?.usedBy && (
                          <div className="mb-2 text-[11px] text-zinc-300">
                            <span className="text-zinc-500">Used by:</span>
                            <ul className="mt-1 space-y-0.5">
                              {f.data.usedBy.map((u: any, i: number) => (
                                <li key={i} className="font-mono text-[10px] text-sky-300">{u.name} <span className="text-zinc-600">({u.sku || u.slug || u.id})</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {f.urls?.length ? (
                          <div className="max-h-40 overflow-y-auto rounded-xl bg-[#07090E] border border-white/5 p-2.5 space-y-0.5">
                            {f.urls.map((u, i) => (
                              <a key={i} href={u} target="_blank" rel="noreferrer" className="block font-mono text-[10px] text-sky-300 hover:underline break-all">{u}</a>
                            ))}
                          </div>
                        ) : <p className="text-[11px] text-zinc-600">No specific URLs (site-wide condition).</p>}
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => ignoreFinding(f._id)} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-zinc-300 flex items-center gap-1.5">
                            <Ban className="w-3 h-3" /> Ignore
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---- Duplicate metadata groups ---- */}
          {dup && (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white flex-1">Duplicate Metadata Detection</span>
                <span className="text-[10px] text-zinc-500">served-HTML layer + MongoDB configured values</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
                <div className="p-4 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Served &lt;title&gt; — {(dup.live?.titles || []).length} duplicate group(s)</p>
                  {(dup.live?.titles || []).length === 0 && <p className="text-[11px] text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> No duplicate served titles found in this crawl.</p>}
                  {(dup.live?.titles || []).slice(0, 8).map((g: any, i: number) => (
                    <div key={i} className="rounded-xl bg-[#07090E] border border-white/5 p-2.5">
                      <p className="text-[11px] text-zinc-300 font-semibold truncate">"{g.value.slice(0, 90)}"</p>
                      <p className="text-[10px] text-zinc-500 mb-1">used by {g.count} URLs</p>
                      {g.urls.slice(0, 6).map((u: any, j: number) => (
                        <a key={j} href={u.url} target="_blank" rel="noreferrer" className="block font-mono text-[10px] text-sky-300 hover:underline break-all">{u.url.replace('https://playbeat.digital', '')}</a>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Product SEO titles in MongoDB — {(dup.database?.productTitles || []).length} duplicate group(s)</p>
                  {(dup.database?.productTitles || []).length === 0 && <p className="text-[11px] text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Every published product has a unique configured SEO title.</p>}
                  {(dup.database?.productTitles || []).slice(0, 8).map((g: any, i: number) => (
                    <div key={i} className="rounded-xl bg-[#07090E] border border-white/5 p-2.5">
                      <p className="text-[11px] text-zinc-300 font-semibold truncate">"{g.value.slice(0, 90)}"</p>
                      <p className="text-[10px] text-zinc-500 mb-1">used by {g.count} products</p>
                      {g.urls.slice(0, 6).map((u: any, j: number) => (
                        <div key={j} className="font-mono text-[10px] text-sky-300 break-all">{u.label}</div>
                      ))}
                    </div>
                  ))}
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 pt-2">Served meta descriptions — {(dup.live?.descriptions || []).length} exact / {(dup.live?.nearDuplicateDescriptions || []).length} near-duplicate pair(s)</p>
                  {(dup.live?.descriptions || []).slice(0, 4).map((g: any, i: number) => (
                    <div key={i} className="rounded-xl bg-[#07090E] border border-white/5 p-2.5">
                      <p className="text-[11px] text-zinc-300 truncate">"{g.value.slice(0, 110)}"</p>
                      <p className="text-[10px] text-zinc-500">{g.count} URLs share this exact description</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---- Sitemap validation ---- */}
          {smap && (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white flex-1">Sitemap Validation</span>
                <span className="text-[10px] text-zinc-500">{smap.counts?.sitemapUrls ?? 0} sitemap URLs compared against MongoDB + live HTTP</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 p-4">
                {[
                  { label: 'Missing from sitemap', value: (smap.missingFromSitemap || []).length, bad: true },
                  { label: '404 in sitemap', value: (smap.http404 || []).length, bad: true },
                  { label: 'Redirects', value: (smap.redirected || []).length, bad: true },
                  { label: 'Noindex in sitemap', value: (smap.noindex || []).length, bad: true },
                  { label: 'Canonical mismatch', value: (smap.canonicalMismatch || []).length, bad: true },
                  { label: 'Duplicate entries', value: (smap.duplicates || []).length, bad: true },
                  { label: 'Not in DB', value: (smap.deletedFromDb || []).length, bad: true },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl bg-[#07090E] border border-white/5 p-3">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block leading-tight">{k.label}</span>
                    <div className={`text-lg font-black mt-1 ${k.value > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{k.value}</div>
                  </div>
                ))}
              </div>
              {Object.entries(smap.sitemaps || {}).map(([name, meta]: [string, any]) => (
                <div key={name} className="px-4 py-2 border-t border-white/5 flex items-center gap-2 text-[11px]">
                  {meta.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="font-mono text-zinc-300">/{name}</span>
                  <span className="text-zinc-500">HTTP {meta.status} · {meta.kind} · {meta.count} URLs</span>
                  {!meta.ok && meta.error && <span className="text-rose-300">{meta.error}</span>}
                </div>
              ))}
              {(smap.missingFromSitemap || []).length > 0 && (
                <div className="px-4 pb-4">
                  <p className="text-[10px] text-zinc-500 mb-1">Published products missing from sitemap-products.xml:</p>
                  <div className="max-h-32 overflow-y-auto rounded-xl bg-[#07090E] border border-white/5 p-2.5 space-y-0.5">
                    {smap.missingFromSitemap.slice(0, 30).map((u: string) => <div key={u} className="font-mono text-[10px] text-amber-200/80 break-all">{u}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- Pages table ---- */}
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white flex-1">Crawled Pages — real per-URL SEO scores ({pages.length})</span>
              <input value={pageFilter} onChange={(e) => setPageFilter(e.target.value)} placeholder="Filter URL / type / status…" className={inputCls + ' w-52'} />
            </div>
            <div className="pa-tablewrap overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="pa-table w-full text-left text-xs">
                <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3">URL</th>
                    <th className="p-3">HTTP</th>
                    <th className="p-3">SEO Score</th>
                    <th className="p-3">Indexable</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Schema</th>
                    <th className="p-3">ALT</th>
                    <th className="p-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPages.map((p) => (
                    <tr key={p.url} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-[10px] text-sky-300 max-w-[260px] truncate">
                        <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline">{p.url.replace('https://playbeat.digital', '') || '/'}</a>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold ${p.httpStatus === 200 ? 'text-emerald-300' : p.httpStatus >= 400 || p.httpStatus === 0 ? 'text-rose-300' : 'text-amber-300'}`}>{p.httpStatus || 'ERR'}</span>
                      </td>
                      <td className="p-3">
                        <span className={`font-bold text-xs ${scoreTone(p.score)}`}>{p.score}%</span>
                        <span className={`ml-1.5 text-[9px] ${scoreTone(p.score)}`}>{scoreLabel(p.score)}</span>
                      </td>
                      <td className="p-3">
                        {p.indexable ? <span className="text-emerald-300 text-[10px] font-bold">Yes</span> : <span className="text-rose-300 text-[10px] font-bold" title={p.indexReason}>No — {p.indexReason}</span>}
                      </td>
                      <td className="p-3 max-w-[180px] truncate text-zinc-300">{p.title || <span className="text-zinc-600 italic">missing</span>}</td>
                      <td className="p-3 text-[10px] text-zinc-400">{(p.jsonLd || []).filter((b) => b.valid).length ? p.jsonLd.flatMap((b) => b.types).slice(0, 3).join(', ') : <span className="text-zinc-600">none</span>}</td>
                      <td className="p-3 text-[10px] text-zinc-400">{p.imagesTotal === 0 ? '—' : p.imagesMissingAlt === 0 ? <span className="text-emerald-300">OK</span> : <span className="text-amber-300">{p.imagesMissingAlt}/{p.imagesTotal}</span>}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => setSelectedPage(p)} className="p-1.5 rounded-lg bg-sky-400/10 hover:bg-sky-400/20 text-sky-300 border border-sky-400/25" title="Explain score">
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- Page audit + page detail drawer ---- */}
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <ScanLine className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Run Page Audit — single URL, full checks</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={pageAuditUrl} onChange={(e) => setPageAuditUrl(e.target.value)} placeholder="/product/example or full URL" className={inputCls + ' flex-1 min-w-[240px]'} />
              <button onClick={runPageAudit} disabled={busy !== null || !pageAuditUrl.trim()} className={btnPrimary}>
                {busy === 'page-audit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Audit Page
              </button>
            </div>
            {pageResult && <PageDetail page={pageResult} onClose={() => setPageResult(null)} />}
            {selectedPage && <PageDetail page={selectedPage} onClose={() => setSelectedPage(null)} />}
          </div>

          {/* ---- Core Web Vitals ---- */}
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white flex-1">Core Web Vitals — live PageSpeed / Lighthouse</span>
              <button onClick={loadCwvHistory} className="text-[10px] text-sky-300 hover:underline">load history</button>
            </div>
            <div className="p-4">
              {cwv === null ? (
                <p className="text-[11px] text-zinc-500">No CWV measurement in this session yet. Refresh Core Web Vitals runs a real Lighthouse test via the official PageSpeed Insights API (mobile and desktop separately). Values shown only when the API returns them.</p>
              ) : !cwv.available ? (
                <p className="text-[11px] text-amber-300">Unable to verify — {cwv.reason || 'PageSpeed API unavailable'}.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Lab data (Lighthouse) — {cwv.strategy} · performance score {cwv.lab.performanceScore ?? 'n/a'}/100</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { k: 'LCP', v: cwv.lab.lcpMs, fmt: (x: number) => `${(x / 1000).toFixed(1)}s`, st: cwvStatus('lcp', cwv.lab.lcpMs), target: '≤ 2.5s' },
                        { k: 'CLS', v: cwv.lab.cls, fmt: (x: number) => x.toFixed(3), st: cwvStatus('cls', cwv.lab.cls), target: '≤ 0.1' },
                        { k: 'TBT', v: cwv.lab.tbtMs, fmt: (x: number) => `${x}ms`, st: cwvStatus('inp', cwv.lab.tbtMs), target: '(INP proxy)' },
                        { k: 'FCP', v: cwv.lab.fcpMs, fmt: (x: number) => `${(x / 1000).toFixed(1)}s`, st: null, target: '' },
                        { k: 'Speed Index', v: cwv.lab.speedIndexMs, fmt: (x: number) => `${(x / 1000).toFixed(1)}s`, st: null, target: '' },
                        { k: 'TTFB', v: cwv.lab.ttfbMs, fmt: (x: number) => `${x}ms`, st: null, target: '' },
                      ].map((m) => (
                        <div key={m.k} className="rounded-xl bg-[#07090E] border border-white/5 p-2.5">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{m.k} <span className="text-zinc-700">{m.target}</span></span>
                          <div className="text-sm font-bold text-white mt-0.5">{m.v != null ? m.fmt(m.v) : 'Not available'}</div>
                          {m.st && <div className={`text-[10px] font-semibold ${m.st.cls}`}>{m.st.label}</div>}
                        </div>
                      ))}
                    </div>
                    {cwv.field.available && (
                      <p className="text-[10px] text-zinc-500 mt-2">
                        Field data (real Chrome users): INP {cwv.field.inpMs != null ? `${cwv.field.inpMs}ms` : 'n/a'} · LCP {cwv.field.lcpMs != null ? `${(cwv.field.lcpMs / 1000).toFixed(1)}s` : 'n/a'} · CLS {cwv.field.cls != null ? cwv.field.cls : 'n/a'} — {(() => { const s = cwvStatus('inp', cwv.field.inpMs); return <span className={s.cls}>{s.label}</span> })()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Diagnostics (detected causes, not generic advice)</p>
                    {cwv.diagnostics.length === 0 ? <p className="text-[11px] text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> No significant performance opportunities flagged by Lighthouse.</p> : (
                      <ul className="space-y-1.5">
                        {cwv.diagnostics.map((d: string, i: number) => (
                          <li key={i} className="text-[11px] text-zinc-300 flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" /> {d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {cwvHistory.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">History (only stored measurements)</p>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {cwvHistory.map((h) => (
                      <div key={h._id} className="flex flex-wrap gap-x-3 text-[10px] text-zinc-400">
                        <span className="text-zinc-500">{new Date(h.measuredAt).toLocaleString()}</span>
                        <span className={h.strategy === 'mobile' ? 'text-sky-300' : 'text-purple-300'}>{h.strategy}</span>
                        <span>LCP {h.metrics?.lcp != null ? `${(h.metrics.lcp / 1000).toFixed(1)}s` : 'n/a'}</span>
                        <span>CLS {h.metrics?.cls ?? 'n/a'}</span>
                        <span>TBT {h.metrics?.tbt != null ? `${h.metrics.tbt}ms` : 'n/a'}</span>
                        <span>INP {h.metrics?.inp ?? (h.fieldData?.inp ?? 'n/a')}{h.metrics?.inp != null ? 'ms' : ''}</span>
                        {h.available === false && <span className="text-rose-300">failed</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---- Search Console ---- */}
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white flex-1">Google Search Performance — official Search Console API</span>
              {gsc && <span className="text-[10px] text-zinc-500">synced {new Date(gsc.syncedAt).toLocaleTimeString()}</span>}
            </div>
            <div className="p-4">
              {gsc === null ? (
                <p className="text-[11px] text-zinc-500">Not synced in this session. Refresh Search Console pulls clicks, impressions, CTR and average position for the last 7/28/90 days plus top pages — only when the service-account environment variables are configured. SEO Health Score is never presented as a Google metric.</p>
              ) : !gsc.available ? (
                <div className="text-[11px]">
                  <p className="text-amber-300 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> Search Console: {gsc.reason || 'Not available'} </p>
                  <p className="text-zinc-500 mt-1.5">Configure GOOGLE_SEARCH_CONSOLE_PROPERTY, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on the server and add the service account as a property owner in Google Search Console.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(gsc.ranges || {}).map(([label, r]: [string, any]) => (
                      <div key={label} className="rounded-xl bg-[#07090E] border border-white/5 p-3">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
                        <div className="text-sm font-bold text-white mt-1">{r.clicks.toLocaleString()} clicks</div>
                        <div className="text-[10px] text-zinc-400">{r.impressions.toLocaleString()} impressions · CTR {r.ctr}% · pos {r.position ?? 'n/a'}</div>
                      </div>
                    ))}
                  </div>
                  {gsc.topPages?.length > 0 && (
                    <div className="pa-tablewrap overflow-x-auto">
                      <table className="pa-table w-full text-left text-xs">
                        <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                          <tr><th className="p-2.5">URL</th><th className="p-2.5">Clicks</th><th className="p-2.5">Impressions</th><th className="p-2.5">CTR</th><th className="p-2.5">Avg Position</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {gsc.topPages.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 font-mono text-[10px] text-sky-300 max-w-[280px] truncate">{r.url}</td>
                              <td className="p-2.5 text-zinc-200">{r.clicks}</td>
                              <td className="p-2.5 text-zinc-300">{r.impressions}</td>
                              <td className="p-2.5 text-zinc-300">{r.ctr}%</td>
                              <td className="p-2.5 text-zinc-300">{r.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <input value={inspectUrl} onChange={(e) => setInspectUrl(e.target.value)} placeholder="URL Inspection API — inspect a URL" className={inputCls + ' flex-1 min-w-[240px]'} />
                    <button onClick={runInspect} disabled={busy !== null || !inspectUrl.trim()} className={btn}>
                      {busy === 'inspect' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Inspect
                    </button>
                  </div>
                  {inspection && (
                    <div className="rounded-xl bg-[#07090E] border border-white/5 p-3 text-[11px]">
                      {!inspection.available ? <span className="text-amber-300">{inspection.reason}</span> : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
                          <span>Google indexed: <b className={inspection.result.verdict === 'PASS' ? 'text-emerald-300' : 'text-amber-300'}>{inspection.result.verdict === 'PASS' ? inspection.result.coverageState || 'Yes' : inspection.result.coverageState || inspection.result.verdict}</b></span>
                          <span>Last crawl: {inspection.result.lastCrawlTime ? new Date(inspection.result.lastCrawlTime).toLocaleString() : 'Not available'}</span>
                          <span>Crawled as: {inspection.result.crawlingAs || 'Not available'}</span>
                          <span>Indexing state: {inspection.result.indexingState || 'Not available'}</span>
                          <span className="sm:col-span-2 break-all">User canonical: {inspection.result.userCanonical || '—'}</span>
                          <span className="sm:col-span-2 break-all">Google canonical: {inspection.result.googleCanonical || '—'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ---- Audit history ---- */}
          {history.length > 0 && (
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold text-white">Audit History (stored runs)</span>
              </div>
              <div className="pa-tablewrap overflow-x-auto">
                <table className="pa-table w-full text-left text-xs">
                  <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                    <tr><th className="p-3">Started</th><th className="p-3">Mode</th><th className="p-3">Status</th><th className="p-3">URLs</th><th className="p-3">Score</th><th className="p-3">Findings</th><th className="p-3">Broken</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((h) => (
                      <tr key={h._id} className="hover:bg-white/[0.02]">
                        <td className="p-3 text-zinc-300">{new Date(h.startedAt).toLocaleString()}</td>
                        <td className="p-3 text-zinc-400">{h.mode}{h.trigger ? ` · ${h.trigger}` : ''}</td>
                        <td className="p-3"><span className={h.status === 'completed' ? 'text-emerald-300 text-[10px] font-bold' : 'text-amber-300 text-[10px] font-bold'}>{h.status}</span></td>
                        <td className="p-3 text-zinc-300">{h.crawledUrls ?? '—'} / {h.totalUrls ?? '—'}</td>
                        <td className={`p-3 font-bold ${scoreTone(h.score?.total)}`}>{h.score?.total ?? '—'}{h.score?.partial ? '*' : ''}</td>
                        <td className="p-3 text-zinc-300">{h.summary?.findingsCount ?? '—'}</td>
                        <td className="p-3 text-zinc-300">{h.summary?.counts?.brokenUrls ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page detail drawer — full measured data + score explanation
// ---------------------------------------------------------------------------
const PageDetail: React.FC<{ page: PageResult; onClose: () => void }> = ({ page, onClose }) => {
  const [tab, setTab] = React.useState<'score' | 'meta' | 'social' | 'schema' | 'links'>('score')
  return (
    <div className="mt-4 rounded-2xl bg-[#07090E] border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 flex-wrap">
        <a href={page.url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-sky-300 hover:underline break-all flex-1 min-w-[200px]">{page.url}</a>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${page.score >= 80 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : page.score >= 65 ? 'bg-amber-400/15 text-amber-300 border-amber-400/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>SEO Score {page.score}%</span>
        <button onClick={onClose} className="text-[10px] text-zinc-400 hover:text-white">close</button>
      </div>
      <div className="px-4 pt-2.5 flex flex-wrap gap-1.5">
        {(['score', 'meta', 'social', 'schema', 'links'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${tab === t ? 'bg-amber-400 text-black border-amber-400' : 'bg-transparent text-zinc-400 border-white/10 hover:text-white'}`}>
            {t === 'score' ? 'Why this score' : t === 'meta' ? 'Metadata' : t === 'social' ? 'OG / Twitter' : t === 'schema' ? 'Structured Data' : 'Links & Images'}
          </button>
        ))}
      </div>
      <div className="p-4 text-[11px]">
        {tab === 'score' && (
          <div className="space-y-1.5">
            {page.scoreNotes.map((n) => (
              <div key={n.label} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-zinc-400">{n.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${n.points / n.max >= 0.8 ? 'bg-emerald-400' : n.points / n.max >= 0.5 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${(n.points / n.max) * 100}%` }} />
                </div>
                <span className="w-14 text-right text-zinc-300 font-mono">{n.points}/{n.max}</span>
                <span className="w-44 text-zinc-500 truncate" title={n.note}>{n.note}</span>
              </div>
            ))}
            {page.issues.length > 0 && (
              <div className="pt-2 mt-2 border-t border-white/5 space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Issues detected on this page</p>
                {page.issues.map((i, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${SEV_STYLE[i.severity]?.chip || SEV_STYLE.info.chip}`}>{SEV_STYLE[i.severity]?.label || i.severity}</span>
                    <span className="text-zinc-300">{i.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'meta' && (
          <div className="space-y-1.5 text-zinc-300">
            <Row k="HTTP status" v={`${page.httpStatus}${page.redirectChain.length > 1 ? ` (redirected: ${page.redirectChain.map((h) => h.status).join(' → ')})` : ''}`} />
            <Row k="TTFB" v={page.ttfbMs != null ? `${page.ttfbMs}ms` : 'Not available'} />
            <Row k="Title" v={page.title ? `"${page.title}" (${page.titleLength} chars)` : 'MISSING'} bad={!page.title} />
            <Row k="Meta description" v={page.metaDescription ? `"${page.metaDescription}" (${page.metaDescriptionLength} chars)` : 'MISSING'} bad={!page.metaDescription} />
            <Row k="Canonical" v={page.canonical || 'MISSING'} bad={!page.canonical} note={page.canonicalSelf === false ? ' — points to another URL!' : page.canonicalSelf ? ' — self-referencing' : ''} />
            <Row k="Indexable" v={`${page.indexable ? 'Yes' : 'No'} — ${page.indexReason}`} />
            <Row k="Robots meta" v={page.metaRobots || '(none)'} />
            <Row k="H1" v={page.h1Count === 0 ? 'none' : page.h1.join(' | ')} bad={page.h1Count !== 1} />
            <Row k="H2 / H3" v={`${page.h2Count} / ${page.h3Count}`} />
            <Row k="Word count (raw HTML)" v={`${page.wordCount} words${page.spaShell ? ' — SPA shell: content renders client-side' : ''}`} />
          </div>
        )}
        {tab === 'social' && (
          <div className="space-y-1.5 text-zinc-300">
            <Row k="og:title" v={page.ogTitle || 'MISSING'} bad={!page.ogTitle} />
            <Row k="og:description" v={page.ogDescription || 'MISSING'} bad={!page.ogDescription} />
            <Row k="og:image" v={page.ogImage || 'MISSING'} bad={!page.ogImage} />
            <Row k="twitter:card" v={page.twitterCard || 'MISSING'} bad={!page.twitterCard} />
            <Row k="twitter:title" v={page.twitterTitle || 'MISSING'} bad={!page.twitterTitle} />
            <Row k="twitter:image" v={page.twitterImage || 'MISSING'} bad={!page.twitterImage} />
          </div>
        )}
        {tab === 'schema' && (
          <div className="space-y-1.5">
            {page.jsonLd.length === 0 ? <p className="text-zinc-500">No JSON-LD structured data found in served HTML.</p> : page.jsonLd.map((b, i) => (
              <div key={i} className={`rounded-xl border p-2.5 ${b.valid ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                {b.valid ? <span className="text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Valid JSON-LD — types: {b.types.join(', ') || '(no @type)'}</span>
                  : <span className="text-rose-300 flex items-start gap-1.5"><XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Invalid JSON-LD — {b.error}</span>}
              </div>
            ))}
          </div>
        )}
        {tab === 'links' && (
          <div className="space-y-1.5 text-zinc-300">
            <Row k="Internal links" v={String(page.anchorsInternal)} />
            <Row k="External links" v={String(page.anchorsExternal)} />
            <Row k="Images" v={`${page.imagesTotal} total · ${page.imagesMissingAlt} missing ALT · ${page.imagesEmptyAlt} empty ALT`} bad={page.imagesMissingAlt > 0} />
            <Row k="Sitemap included" v={page.sitemapIncluded ? 'Yes' : 'No'} />
          </div>
        )}
      </div>
    </div>
  )
}

const Row: React.FC<{ k: string; v: string; bad?: boolean; note?: string }> = ({ k, v, bad, note }) => (
  <div className="flex flex-wrap gap-x-2">
    <span className="w-40 shrink-0 text-zinc-500">{k}</span>
    <span className={`flex-1 min-w-[200px] break-all ${bad ? 'text-rose-300' : 'text-zinc-200'}`}>{v}{note && <span className={note.includes('!') ? 'text-rose-300' : 'text-emerald-300'}>{note}</span>}</span>
  </div>
)

// ---------------------------------------------------------------------------
// INTEGRATIONS SECTION
// ---------------------------------------------------------------------------
export const SeoIntegrations: React.FC<SeoLiveAuditProps> = ({ onToast }) => {
  const [integrations, setIntegrations] = React.useState<any[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiPost<any>({ action: 'integrations-status' })
      setIntegrations(d.integrations || [])
    } catch (e: any) {
      onToast(e.message || 'Failed to load integrations', 6000)
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { load() }, [load])

  const test = async (id: string) => {
    setBusy(id)
    try {
      if (id === 'gsc') {
        const d = await apiPost<any>({ action: 'gsc-refresh' })
        onToast(d.gsc.available ? `Search Console OK — ${d.gsc.ranges?.last28?.clicks ?? 0} clicks in the last 28 days` : `Search Console: ${d.gsc.reason || 'unavailable'}`, 7000)
      } else if (id === 'psi' || id === 'lighthouse') {
        const d = await apiPost<any>({ action: 'pagespeed', strategy: 'mobile' })
        onToast(d.pagespeed.available ? `PageSpeed OK — mobile LCP ${(d.pagespeed.lab.lcpMs / 1000).toFixed(1)}s` : `PageSpeed: ${d.pagespeed.reason}`, 7000)
      } else if (id === 'merchant') {
        const d = await apiPost<any>({ action: 'integrations-status' })
        onToast(d.merchant.available ? `Merchant feed reachable (HTTP ${d.merchant.status}, ${d.merchant.latencyMs}ms)` : `Merchant feed: ${d.merchant.note}`, 7000)
      }
      await load()
    } catch (e: any) {
      onToast(e.message || 'Test failed', 6000)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">SEO Integrations / Plugins</h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Official Google APIs. Credentials live exclusively in server environment variables — never in the browser, repository or logs.</p>
        </div>
        <button onClick={load} disabled={loading} className={btn}><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>
      {loading && !integrations ? (
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 text-xs text-zinc-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking provider status…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {(integrations || []).map((p) => (
            <div key={p.id} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{p.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${p.status === 'Connected' || p.status.startsWith('Connected') ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : p.status === 'Disconnected' ? 'bg-zinc-500/15 text-zinc-300 border-white/10' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'}`}>{p.status}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">{p.description}</p>
                  {p.envVars?.length > 0 && (
                    <p className="text-[10px] text-zinc-600 mt-1.5">Env: {p.envVars.join(' · ')}</p>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-1">Last sync: {p.lastSync ? new Date(p.lastSync).toLocaleString() : 'Not available'}</p>
                </div>
                <button onClick={() => test(p.id)} disabled={busy !== null} className={btn}>
                  {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Test
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 text-[11px] text-zinc-500 space-y-1.5">
        <p className="flex items-start gap-2"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-sky-400" /> Search Console connection requires a service account added as an OWNER of the Search Console property, with the three environment variables set on the server. Connection states: Connected, Disconnected, Authentication Error, API Error — always derived from real API responses.</p>
        <p className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" /> This dashboard never displays credential values — only connection booleans and API metrics.</p>
      </div>
    </div>
  )
}
