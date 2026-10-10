import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Radio, Settings2 } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';
export const PlaybeatLivePanel: React.FC<{ compact?: boolean; onNavigate: (nav: string) => void }> = ({ compact = false, onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try { const res = await fetch(`${API_BASE}/api/admin/playbeat-live?days=${days}`, { credentials: 'include', signal,
      headers: { Authorization: `Bearer ${localStorage.getItem('playbeat_admin_token') || ''}` } });
      const body = await res.json(); if (!res.ok || !body.success) throw new Error(body.error || 'Live report unavailable.');
      if (!signal?.aborted) { setData(body.dashboard); setError(''); }
    } catch (err: any) { if (!signal?.aborted) setError(err.message || 'Live report unavailable.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [days]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal);
    const interval = window.setInterval(() => { if (!document.hidden) void load(controller.signal); }, 60000);
    const visible = () => { if (!document.hidden) void load(controller.signal); };
    document.addEventListener('visibilitychange', visible);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', visible); };
  }, [load]);
  const source = data?.source;
  const traffic = data?.traffic;
  const stamp = (date: any) => date ? new Date(date).toLocaleString() : 'Not available';
  const value = (v: any, connected = true) => connected && v !== null && v !== undefined ? Number(v).toLocaleString() : '—';
  return <section className="pa-card rounded-2xl p-5 space-y-4" aria-label="PlayBeat.live connected dashboard">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="flex items-center gap-2 font-bold text-white"><Radio size={17} />PlayBeat.live</h3><p className="text-xs text-zinc-400 mt-1">Digital is the main admin · automatic refresh every 60 seconds · {days} days, UTC</p></div>
      <div className="flex items-center gap-2">
        {!compact && <select value={days} onChange={e => setDays(Number(e.target.value))} className="rounded-lg p-2 text-xs" aria-label="Live report period">{[7,14,30,90].map(n => <option key={n} value={n}>{n} days</option>)}</select>}
        <button className="pa-btn p-2" disabled={loading} onClick={() => void load()} aria-label="Refresh Live reports"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        {compact && <button className="pa-btn px-3 py-2 text-xs" onClick={() => onNavigate('iptv')}>Open Live dashboard</button>}
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-rose-300">{error}{data && ' Previous successful snapshot shown below.'}</p>}
    {!data && !error && <p className="text-xs text-zinc-400">Loading connected Live sources…</p>}
    {data && <>
      {!source?.connected && <p role="alert" className="text-xs text-amber-300">{source?.error || 'Live bridge is not connected.'}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[
        ['Live channels', value(source?.library?.channels, source?.library?.connected)],
        ['Page views', value(traffic?.views, traffic?.connected)],
        ['Unique sessions', value(traffic?.sessions, traffic?.connected)],
        ['Play requests', value(traffic?.playRequests, traffic?.connected)],
      ].map(([label,total]) => <div key={label} className="rounded-xl border border-white/10 p-3"><p className="text-[11px] text-zinc-400">{label}</p><strong className="block text-xl text-white mt-1">{total}</strong></div>)}</div>
      <p className="text-[11px] text-zinc-400">Last checked: {stamp(data.fetchedAt)} · Activity recorded from: {stamp(traffic?.startedAt)}. Play requests count clicks, not confirmed playback.</p>
      {!compact && <>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 p-4 space-y-2"><h4 className="font-semibold text-sm text-white">Deployed settings & latest release</h4>
            <p className="text-xs text-zinc-400">Release: {source?.release?.release?.slice(0,12) || 'Unavailable'} · Built: {stamp(source?.release?.builtAt)}</p>
            <dl className="space-y-2 text-xs">{Object.entries(source?.release?.settings || {}).map(([key,val]) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt className="text-zinc-400">{key}</dt><dd className="text-zinc-200 break-all">{String(val)}</dd></div>)}</dl>
            <ul className="text-xs text-zinc-300 space-y-1">{(source?.release?.updates || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="rounded-xl border border-white/10 p-4 space-y-2"><h4 className="font-semibold text-sm text-white">Catalog & provider sync</h4>
            <p className="text-xs text-zinc-300">Backend: {source?.backend?.connected ? 'Reachable' : 'Unavailable'} · Provider: {source?.backend?.connected ? source.backend.configured ? 'Configured' : 'Not configured' : 'Unknown'}</p>
            <p className="text-xs text-zinc-400">Last sync: {stamp(source?.backend?.lastSync?.syncedAt || source?.backend?.lastSync?.completedAt || source?.backend?.lastSync?.at)}</p>
            <dl className="space-y-1 text-xs">{Object.entries(source?.library?.categories || {}).map(([key,count]) => <div key={key} className="flex justify-between gap-3"><dt className="text-zinc-400">{key}</dt><dd className="text-zinc-200">{Number(count).toLocaleString()}</dd></div>)}</dl>
          </div>
          <div className="rounded-xl border border-white/10 p-4 space-y-2"><h4 className="font-semibold text-sm text-white">Traffic sources</h4>
            {!traffic?.sources?.length && <p className="text-xs text-zinc-400">No recorded page views for this period.</p>}
            {traffic?.sources?.map((row: any) => <div key={row.source} className="flex justify-between text-xs"><span className="text-zinc-400">{row.source}</span><span className="text-zinc-200">{row.count}</span></div>)}
          </div>
          <div className="rounded-xl border border-white/10 p-4 space-y-2"><h4 className="font-semibold text-sm text-white">Google & advertising settings</h4>
            <p className="text-xs text-zinc-400">Central configuration: {data.google.ga4 || 'GA4 not configured'} · {data.google.gtm || 'GTM not configured'} · {data.google.adsense || 'AdSense not configured'}</p>
            <p className="text-xs text-zinc-300">Live loader: {data.google.liveInstallation?.installation || 'Not verified'} · ads.txt: {data.google.liveInstallation?.adsTxt || 'Not verified'}</p>
            <p className="text-xs text-zinc-400">Latest browser observation: {data.google.observation ? `GA4 ${data.google.observation.ga4 ? 'loaded' : 'not loaded'} · AdSense ${data.google.observation.adsense ? 'loaded' : 'not loaded'} · ${stamp(data.google.observation.at)}` : 'No tag-loader observation received yet'}. Script load does not confirm Google collection.</p>
            <p className="text-xs text-amber-300">GA4 reports and AdSense revenue are not connected. AdSense approval is not verified.</p>
            <button className="pa-btn px-3 py-2 text-xs inline-flex gap-2 items-center" onClick={() => onNavigate('business')}><Settings2 size={14} />Manage central Google settings</button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">{[['Orders & revenue',data.commerce.reason],['Inquiries & messaging',data.inquiries.reason]].map(([title,reason]) => <div key={title} className="rounded-xl border border-amber-400/20 p-4"><h4 className="font-semibold text-sm text-white">{title}</h4><p className="text-xs text-zinc-400 mt-2">{reason}</p></div>)}</div>
        <p className="text-xs text-zinc-400">Default rule: {data.rule}</p>
      </>}
    </>}
  </section>;
};
