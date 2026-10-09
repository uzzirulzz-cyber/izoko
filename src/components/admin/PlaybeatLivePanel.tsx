import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, AlertCircle, ArrowUpRight, BarChart3, CheckCircle2, DollarSign, Eye, Globe, Loader2, RefreshCw, Save, ShoppingBag, Tv, Users } from 'lucide-react'
import type { LiveBreakdown, PlaybeatLiveSnapshot } from '../../types/playbeatLive'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const count = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString()
function money(value: number | undefined, currency: string | null) {
  if (value === undefined) return '—'
  return /^[A-Z]{3}$/.test(currency || '') ? `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
function Breakdown({ title, unit, rows, connected }: { title: string; unit: string; rows?: LiveBreakdown[]; connected: boolean }) {
  const max = Math.max(1, ...(rows || []).map(row => row.value))
  return <section className="pa-card p-5 space-y-4">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">{title}</h3><span className="text-xs text-zinc-400">{unit}</span></div>
    {!connected ? <p className="text-sm text-zinc-400">This report is unavailable until its connection is ready.</p>
      : !rows?.length ? <p className="text-sm text-zinc-400">No data recorded for this period.</p>
      : <div className="space-y-3">{rows.map((row, index) => <div key={`${row.label}-${index}`}>
        <div className="flex justify-between gap-3 text-xs mb-1.5"><span className="truncate" title={row.label}>{row.label}</span><span className="font-mono shrink-0">{count(row.value)}</span></div>
        <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-sky-400/70" style={{ width: `${Math.max(1, row.value / max * 100)}%` }} /></div>
      </div>)}</div>}
  </section>
}

export function PlaybeatLivePanel({ onToast }: { onToast: (message: string, type?: string) => void }) {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<PlaybeatLiveSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [saving, setSaving] = useState(false)
  const request = useRef<AbortController | null>(null)
  const load = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setData(null)
    setError('')
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const response = await fetch(`${API_BASE}/api/admin/playbeat-live?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: 'include', signal: controller.signal,
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.error || 'Reports could not be loaded.')
      if (json.site !== 'playbeat.live' || json.days !== days) throw new Error('Unexpected site report. Please retry.')
      if (!controller.signal.aborted) { setData(json); setPropertyId(json.config.propertyId) }
    } catch (err: any) {
      if (!controller.signal.aborted) setError(err.message || 'Reports could not be loaded.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [days])
  useEffect(() => { void load(); return () => request.current?.abort() }, [load])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const id = propertyId.trim()
    if (id && !/^\d{1,20}$/.test(id)) { onToast('Enter the numeric GA4 property ID, not a G- measurement ID.', 'error'); return }
    setSaving(true)
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const response = await fetch(`${API_BASE}/api/admin/playbeat-live/config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, credentials: 'include',
        body: JSON.stringify({ propertyId: id }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.error || 'Connection could not be saved.')
      onToast('PlayBeat.live reporting property saved.', 'success')
      await load()
    } catch (err: any) { onToast(err.message || 'Connection could not be saved.', 'error') }
    finally { setSaving(false) }
  }
  const analytics = data?.analytics.available ? data.analytics.data : undefined
  const catalog = data?.catalog.available ? data.catalog.data : undefined
  const commerce = data?.commerce.available ? data.commerce.data : undefined
  const maxViews = Math.max(1, ...(analytics?.series || []).map(row => row.views))
  const metrics = [
    { label: 'Active visitors', value: count(analytics?.activeUsers), icon: Users, note: 'Google Analytics' },
    { label: 'Sessions', value: count(analytics?.sessions), icon: Activity, note: 'Google Analytics' },
    { label: 'Page views', value: count(analytics?.pageViews), icon: Eye, note: 'Google Analytics' },
    { label: 'Engagement rate', value: analytics ? `${(analytics.engagementRate * 100).toFixed(1)}%` : '—', icon: Activity, note: 'Engaged sessions · Google Analytics' },
    { label: 'Orders', value: count(commerce?.orderCount), icon: ShoppingBag, note: 'Connected order service' },
    { label: 'Revenue (GA4)', value: money(analytics?.totalRevenue, analytics?.currency || null), icon: DollarSign, note: 'Reported purchases, subscriptions & ads' },
    { label: 'Purchases (GA4)', value: count(analytics?.purchases), icon: ShoppingBag, note: 'Recorded purchase events' },
    { label: 'Channel catalogue', value: count(catalog?.channelCount), icon: Tv, note: 'Current catalogue · not a playback test' },
  ]
  return <div className="space-y-5" aria-busy={loading}>
    <header className="pa-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-center gap-3"><span className="p-3 rounded-2xl bg-sky-500/10 text-sky-300"><Tv className="w-6 h-6" /></span><div>
        <h2 className="text-xl font-bold">PlayBeat.live</h2><p className="text-xs text-zinc-400 mt-1">Entertainment, audience and commerce in your PlayBeat Digital admin.</p>
      </div></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="live-report-days">Reporting period</label>
        <select id="live-report-days" value={days} disabled={saving} onChange={event => setDays(Number(event.target.value))} className="pa-select text-xs px-3 py-2.5">
          {[1, 7, 14, 30, 90].map(value => <option key={value} value={value}>{value === 1 ? 'Today' : `Last ${value} days`}</option>)}
        </select>
        <button type="button" onClick={() => void load()} disabled={loading || saving} className="rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-50 px-3 py-2.5 text-xs flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        <a href="https://playbeat.live" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/10 hover:bg-white/5 px-3 py-2.5 text-xs flex items-center gap-1">Open website <ArrowUpRight className="w-4 h-4" /></a>
      </div>
    </header>
    {error && <div role="alert" className="pa-card p-4 border border-rose-400/30 text-rose-300 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
    {loading && <div role="status" className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" />Loading PlayBeat.live reports…</div>}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map(metric => <section key={metric.label} className="pa-card p-4 space-y-2">
      <div className="text-xs text-zinc-400 flex items-center gap-2"><metric.icon className="w-4 h-4 text-sky-300" />{metric.label}</div>
      <div className="text-xl font-bold break-words">{metric.value}</div><p className="text-[11px] text-zinc-500">{metric.note}</p>
    </section>)}</div>
    {data && <section className="pa-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Connections</h3><span className="text-xs text-zinc-500">Updated {new Date(data.syncedAt).toLocaleString()} · refreshes up to once a minute</span></div>
      {[
        { title: 'Broadcast catalogue', connection: data.catalog, detail: `${catalog?.latencyMs ?? ''} ms catalogue response. Stream playback is not measured here.` },
        { title: 'Google Analytics', connection: data.analytics, detail: `Property ${analytics?.propertyId} · ${analytics?.timezone || 'property timezone'} · recent data may still be processing.` },
        { title: 'Orders & paid revenue', connection: data.commerce, detail: 'PlayBeat.live orders only. Paid revenue is grouped by currency.' },
      ].map(item => <div key={item.title} className="flex items-start gap-2 text-xs">
        {item.connection.available ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />}
        <div><span className="font-bold">{item.title}</span><span className="text-zinc-400"> — {item.connection.available ? item.detail : item.connection.reason}</span></div>
      </div>)}
      <p className="text-xs text-zinc-500">Audience reports include playbeat.live and www.playbeat.live only. PlayBeat Digital traffic and sales stay in their existing reports.</p>
    </section>}
    <section className="pa-card p-5">
      <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-sky-300" />Daily traffic</h3>
      {!analytics ? <p className="text-sm text-zinc-400">Traffic history appears after Google Analytics is connected.</p>
        : !analytics.series.length ? <p className="text-sm text-zinc-400">No traffic recorded for this period.</p>
        : <div className="overflow-x-auto"><div className="flex items-end gap-2 h-44" style={{ minWidth: days > 30 ? days * 18 : undefined }}>
          {analytics.series.map(row => <div key={row.date} className="flex-1 min-w-3 text-center" title={`${row.date}: ${row.views} views, ${row.sessions} sessions`}>
            <div className="flex items-end h-36"><div className="w-full rounded-t bg-gradient-to-t from-sky-600/60 to-sky-300" style={{ height: `${row.views / maxViews * 100}%` }} /></div>
            <span className="text-[9px] text-zinc-500">{row.date.slice(4, 6)}/{row.date.slice(6, 8)}</span>
          </div>)}
        </div></div>}
    </section>
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <Breakdown title="Traffic sources" unit="sessions" rows={analytics?.sources} connected={Boolean(analytics)} />
      <Breakdown title="Countries" unit="active visitors" rows={analytics?.countries} connected={Boolean(analytics)} />
      <Breakdown title="Devices" unit="active visitors" rows={analytics?.devices} connected={Boolean(analytics)} />
      <Breakdown title="Top pages" unit="views" rows={analytics?.pages} connected={Boolean(analytics)} />
      <Breakdown title="Audience events" unit="events" rows={analytics?.events} connected={Boolean(analytics)} />
      <Breakdown title="Channel groups" unit="channels" rows={catalog?.groups} connected={Boolean(catalog)} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="pa-card p-5 space-y-3"><h3 className="text-sm font-bold">Revenue & purchases</h3>
        <div className="flex justify-between gap-3 text-sm"><span className="text-zinc-400">GA4 recorded purchases</span><strong>{count(analytics?.purchases)}</strong></div>
        <div className="flex justify-between gap-3 text-sm"><span className="text-zinc-400">GA4 purchase revenue</span><strong>{money(analytics?.purchaseRevenue, analytics?.currency || null)}</strong></div>
        <div className="border-t border-white/10 pt-3 text-xs text-zinc-400">Paid revenue from the order service</div>
        {!commerce ? <p className="text-sm text-zinc-400">Connect the PlayBeat.live order service to see paid totals.</p> : !commerce.paidRevenueByCurrency.length ? <p className="text-sm text-zinc-400">No paid revenue recorded for this period.</p>
          : commerce.paidRevenueByCurrency.map(row => <div key={row.currency} className="text-sm font-bold">{money(row.amount, row.currency)}</div>)}
        <p className="text-xs text-zinc-500">GA4 revenue is reported in the property's currency. Recorded purchase events are separate from operational orders.</p>
      </section>
      <section className="pa-card p-5 space-y-3"><h3 className="text-sm font-bold">Recent PlayBeat.live orders</h3>
        {!commerce ? <p className="text-sm text-zinc-400">Orders appear when the PlayBeat.live commerce connection is available.</p> : !commerce.recentOrders.length ? <p className="text-sm text-zinc-400">No orders recorded for this period.</p>
          : <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-zinc-400 border-b border-white/10"><th className="text-left py-2">Order</th><th className="text-left">Status</th><th className="text-right">Total</th></tr></thead><tbody>{commerce.recentOrders.map(order => <tr key={order.id} className="border-b border-white/5"><td className="py-3"><span className="block font-mono">{order.id}</span><span className="text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</span></td><td>{order.status}</td><td className="text-right">{money(order.total, order.currency)}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
    {data?.config.canConfigure && <form onSubmit={save} className="pa-card p-5 space-y-3">
      <h3 className="text-sm font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-sky-300" />Google Analytics connection</h3>
      <p className="text-xs text-zinc-400">Enter the numeric property ID from GA4 → Admin → Property details. The property's website must track PlayBeat.live.</p>
      <div className="flex flex-col sm:flex-row gap-3"><label className="flex-1"><span className="sr-only">GA4 property ID</span><input value={propertyId} onChange={event => setPropertyId(event.target.value)} inputMode="numeric" placeholder="GA4 property ID" maxLength={20} disabled={saving || loading} className="pa-input w-full px-3 py-2.5 text-sm" /></label>
        <button type="submit" disabled={saving || loading} className="pa-btn-gold disabled:opacity-50 px-4 py-2.5 text-xs flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save connection'}</button></div>
      <p className="text-xs text-zinc-500">{data.config.credentialsConfigured ? 'Server reporting credentials are configured. The service account needs Viewer access to this property.' : 'Server reporting credentials still need configuration. Your administrator can connect a Google service account with read-only property access.'}</p>
    </form>}
  </div>
}
