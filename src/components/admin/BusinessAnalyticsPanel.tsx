// Admin → Business Analytics — Google stack status & configuration.
// GA4 · GTM · AdSense · Google Ads: live status cards, runtime ID management
// (DB overrides env — no redeploy needed), storefront heartbeat, event catalog,
// and an honest pointer for full traffic/revenue reporting (GA4 Data API).
import React, { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  Tag,
  Megaphone,
  DollarSign,
  RefreshCw,
  Save,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

type TrackingConfigState = {
  ga4MeasurementId: string
  gtmContainerId: string
  adsenseClientId: string
  googleAdsConversionId: string
  googleAdsPurchaseLabel: string
  adsEnabled: boolean
}

type SourceMap = Record<string, 'db' | 'env' | 'none'>

interface Heartbeat {
  lastAt: string
  ga4Loaded: boolean
  gtmLoaded: boolean
  adsenseLoaded: boolean
  userAgent: string
}

interface TrackingResponse {
  success: boolean
  error?: string
  config: TrackingConfigState
  source: SourceMap
  heartbeat: Heartbeat | null
  audits: { at: string; actor: string; keys: string[] }[]
}

const EMPTY_FORM: TrackingConfigState = {
  ga4MeasurementId: '',
  gtmContainerId: '',
  adsenseClientId: '',
  googleAdsConversionId: '',
  googleAdsPurchaseLabel: '',
  adsEnabled: true,
}

const EVENTS_CATALOG: { event: string; when: string }[] = [
  { event: 'page_view', when: 'Every route change (GA4 standard)' },
  { event: 'view_item', when: 'Product quick-view opened' },
  { event: 'view_item_list', when: 'Category / listing impressions' },
  { event: 'search', when: 'Search term (debounced, 3+ chars)' },
  { event: 'add_to_cart', when: 'Add-to-cart / instant-buy' },
  { event: 'begin_checkout', when: 'Checkout page opened with a cart' },
  { event: 'purchase', when: 'Order CONFIRMED by the server (webhook or direct) — fires once per order' },
  { event: 'conversion (Google Ads)', when: 'Purchase conversion with transaction_id' },
  { event: 'pb_consent_update', when: 'Visitor updates cookie consent' },
]

function fmtWhen(iso?: string) {
  if (!iso) return 'never'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'moments ago'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  return d.toLocaleString()
}

export const BusinessAnalyticsPanel: React.FC<{ onToast: (msg: string, type?: string) => void }> = ({ onToast }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<TrackingResponse | null>(null)
  const [form, setForm] = useState<TrackingConfigState>(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/tracking-config`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const json: TrackingResponse = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load')
      setData(json)
      setForm({ ...EMPTY_FORM, ...json.config })
    } catch (e: any) {
      setError(e?.message || 'Failed to load tracking configuration.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/tracking-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          ga4MeasurementId: form.ga4MeasurementId.trim(),
          gtmContainerId: form.gtmContainerId.trim(),
          adsenseClientId: form.adsenseClientId.trim(),
          googleAdsConversionId: form.googleAdsConversionId.trim(),
          googleAdsPurchaseLabel: form.googleAdsPurchaseLabel.trim(),
          adsEnabled: Boolean(form.adsEnabled),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
      onToast('Tracking configuration saved — live within 30s (cache TTL).', 'success')
      await load()
    } catch (e: any) {
      onToast(e?.message || 'Could not save tracking configuration.', 'error')
      setError(e?.message || '')
    } finally {
      setSaving(false)
    }
  }

  const statusOf = (id: string, src?: string) => {
    if (!id) return { label: 'Not configured', tone: 'bad', detail: 'Set an ID below or via Vercel env' }
    if (src === 'db') return { label: 'Active', tone: 'ok', detail: 'Set from Admin panel' }
    return { label: 'Active', tone: 'ok', detail: 'Set from Vercel env' }
  }

  const StatusCard: React.FC<{
    icon: React.ReactNode
    title: string
    id?: string
    src?: string
    hint: string
    consoleUrl: string
  }> = ({ icon, title, id, src, hint, consoleUrl }) => {
    const st = statusOf(id || '', src)
    return (
      <div className="pa-card p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon}
            <span className="text-sm font-bold text-white">{title}</span>
          </div>
          {st.tone === 'ok' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3" /> {st.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
              <XCircle className="w-3 h-3" /> {st.label}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 font-mono break-all min-h-[16px]">
          {id || '—'}
        </div>
        <div className="text-[10.5px] text-slate-500">{st.detail} · {hint}</div>
        <a
          href={consoleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10.5px] text-sky-400 hover:text-sky-300 font-semibold mt-auto"
        >
          Open console <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    )
  }

  const hb = data?.heartbeat
  const hbAlive = hb && (Date.now() - new Date(hb.lastAt).getTime()) < 30 * 60 * 1000

  const field = (
    label: string,
    key: keyof TrackingConfigState,
    placeholder: string,
    mono = true
  ) => (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </span>
      <input
        type="text"
        value={String(form[key])}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={`w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition ${mono ? 'font-mono' : ''}`}
      />
    </label>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight">Business Analytics</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Google Analytics 4 · Tag Manager · AdSense · Google Ads — status, configuration and event coverage
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-slate-400/20 text-slate-200 text-xs font-semibold hover:bg-white/10 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatusCard
          icon={<BarChart3 className="w-4 h-4 text-amber-400" />}
          title="Google Analytics 4"
          id={data?.config.ga4MeasurementId}
          src={data?.source.ga4MeasurementId}
          hint="page_view · ecommerce · revenue"
          consoleUrl="https://analytics.google.com/"
        />
        <StatusCard
          icon={<Tag className="w-4 h-4 text-sky-400" />}
          title="Google Tag Manager"
          id={data?.config.gtmContainerId}
          src={data?.source.gtmContainerId}
          hint="central tag routing (overrides direct GA4)"
          consoleUrl="https://tagmanager.google.com/"
        />
        <StatusCard
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          title="Google AdSense"
          id={data?.config.adsenseClientId}
          src={data?.source.adsenseClientId}
          hint={data?.config.adsEnabled ? 'on-site units ENABLED' : 'on-site units PAUSED'}
          consoleUrl="https://adsense.google.com/"
        />
        <StatusCard
          icon={<Megaphone className="w-4 h-4 text-violet-400" />}
          title="Google Ads"
          id={data?.config.googleAdsConversionId}
          src={data?.source.googleAdsConversionId}
          hint="purchase conversion + remarketing lists"
          consoleUrl="https://ads.google.com/"
        />
      </div>

      {/* Realtime heartbeat */}
      <div className="pa-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Real-time tracking status</h3>
          {hbAlive ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-400/20 text-slate-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> IDLE
            </span>
          )}
        </div>
        {hb ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="text-slate-400">
              Last storefront ping: <span className="text-slate-200 font-semibold">{fmtWhen(hb.lastAt)}</span>
            </div>
            <div className="text-slate-400">GA4 configured client: <span className={hb.ga4Loaded ? 'text-emerald-300' : 'text-slate-300'}>{hb.ga4Loaded ? 'yes' : 'no'}</span></div>
            <div className="text-slate-400">GTM configured client: <span className={hb.gtmLoaded ? 'text-emerald-300' : 'text-slate-300'}>{hb.gtmLoaded ? 'yes' : 'no'}</span></div>
            <div className="text-slate-400">AdSense configured client: <span className={hb.adsenseLoaded ? 'text-emerald-300' : 'text-slate-300'}>{hb.adsenseLoaded ? 'yes' : 'no'}</span></div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">
            No storefront pings yet. The heartbeat updates whenever a visitor opens the store while tracking is configured.
          </p>
        )}
      </div>

      {/* Configuration form */}
      <div className="pa-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Tracking IDs & configuration</h3>
          <span className="text-[10px] font-mono text-slate-500">public IDs only — secrets stay in Vercel env</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field('GA4 Measurement ID', 'ga4MeasurementId', 'G-XXXXXXXXXX')}
          {field('GTM Container ID', 'gtmContainerId', 'GTM-XXXXXXX')}
          {field('AdSense Client ID', 'adsenseClientId', 'ca-pub-XXXXXXXXXXXXXXXX')}
          {field('Google Ads Conversion ID', 'googleAdsConversionId', 'AW-XXXXXXXXX')}
          {field('Google Ads Purchase Label', 'googleAdsPurchaseLabel', 'conversion label (e.g. abc123XYZ…)')}
          <label className="flex items-center gap-3 mt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.adsEnabled}
              onChange={(e) => setForm((f) => ({ ...f, adsEnabled: e.target.checked }))}
              className="w-4 h-4 rounded accent-amber-400"
            />
            <span className="text-xs text-slate-300 font-semibold">
              Serve on-site AdSense units
              <span className="block text-[10px] text-slate-500 font-normal">
                Always excluded from checkout, order, account, contact and admin routes
              </span>
            </span>
          </label>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-gold-gradient text-slate-950 text-xs font-extrabold active:scale-95 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save configuration'}
          </button>
          <span className="text-[10.5px] text-slate-500">
            Saved IDs override Vercel env values within ~30s. ads.txt picks up ADSENSE_CLIENT_ID from the build env on the next deploy.
          </span>
        </div>
      </div>

      {/* Event catalog */}
      <div className="pa-card p-4">
        <h3 className="text-sm font-bold text-white mb-2">Conversion events implemented</h3>
        <div className="overflow-hidden rounded-xl border border-slate-400/10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Fires when</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS_CATALOG.map((e) => (
                <tr key={e.event} className="border-t border-white/5">
                  <td className="px-3 py-2 text-[11px] font-mono text-amber-300 whitespace-nowrap">{e.event}</td>
                  <td className="px-3 py-2 text-[11px] text-slate-300">{e.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reporting note */}
      <div className="pa-card p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-200">Traffic & revenue reporting:</span> purchase/revenue reporting
            lives in GA4 (Ecommerce reports) and Google Ads (Conversions) — this panel never duplicates raw reports or
            stores ad credentials. To pull GA4 numbers into this dashboard later, add a read-only
            <span className="font-mono text-slate-300"> GA4_DATA_API_JSON </span>
            service-account key to Vercel env (never in the repo or the Android APK) and the panel will light up.
          </div>
        </div>
      </div>

      {/* Audit */}
      {data?.audits && data.audits.length > 0 && (
        <div className="pa-card p-4">
          <h3 className="text-sm font-bold text-white mb-2">Recent configuration changes</h3>
          <div className="space-y-1.5">
            {data.audits.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-slate-300">{a.actor}</span>
                <span className="font-mono text-slate-500">{(a.keys || []).join(', ')}</span>
                <span>{fmtWhen(a.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
