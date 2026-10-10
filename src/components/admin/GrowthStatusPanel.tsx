import { useCallback, useEffect, useState } from 'react';
export function GrowthStatusPanel() {
  const [data,setData]=useState<any>(null); const [error,setError]=useState('');
  const load=useCallback(async(signal?:AbortSignal)=>{try{
    const res=await fetch(`${(import.meta as any).env?.VITE_API_BASE || ''}/api/admin/growth-status`,{credentials:'include',signal,headers:{Authorization:`Bearer ${localStorage.getItem('playbeat_admin_token') || ''}`}});
    const body=await res.json(); if(!res.ok||!body.success)throw new Error(body.error||'Growth status unavailable'); if(!signal?.aborted){setData(body.dashboard);setError('');}
  }catch(e:any){if(!signal?.aborted)setError(e.message||'Growth status unavailable');}},[]);
  useEffect(()=>{const c=new AbortController();void load(c.signal);const timer=setInterval(()=>{if(!document.hidden)void load(c.signal);},60000);return()=>{c.abort();clearInterval(timer);};},[load]);
  return <section className="pa-card rounded-2xl p-5 space-y-3" aria-label="Traffic target and promotion status"><div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">Traffic & free promotion</h3><button className="pa-btn px-3 py-2 text-xs" onClick={()=>void load()}>Refresh growth status</button></div>
    {error&&<p role="alert" className="text-amber-300 text-xs">{error}</p>}
    {!data&&!error&&<p className="text-zinc-400 text-xs">Loading actual traffic and publishing status…</p>}
    {data&&<><p className="text-xs text-zinc-400">{data.date} · {data.timezone} · Refreshes every 60 seconds</p><div className="grid md:grid-cols-2 gap-3">{data.sites.map((site:any)=><div key={site.domain} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-zinc-300">{site.domain}</p><p className="text-xl font-bold text-white">{site.sessions.toLocaleString()} / {site.target.toLocaleString()}</p><p className="text-xs text-zinc-400">Unique sessions today · target, not a guarantee</p><progress className="w-full mt-2" value={Math.min(site.sessions,site.target)} max={site.target} aria-label={`${site.domain} daily traffic target`}/></div>)}</div>
      <p className="text-xs text-zinc-400">{data.measure}. Last checked: {new Date(data.fetchedAt).toLocaleString()}.</p>
      <p className="text-xs text-zinc-300">GA4: {data.google.ga4||'Not configured'} · AdSense: {data.google.adsense||'Not configured'} · Approval not verified · Google reports and ad revenue disconnected</p>
      <div className="space-y-2">{data.promotion?.placements?.map((p:any)=><div key={`${p.site}-${p.channel}`} className="rounded-lg border border-white/10 p-3 text-xs"><strong className="text-white">{p.site} · {p.channel}</strong><span className="text-zinc-300"> · {p.status}</span><p className="text-zinc-400 mt-1">{p.detail}</p>{p.url&&<a className="text-yellow-300 underline" href={p.url} target="_blank" rel="noreferrer">View placement</a>}</div>)}</div>
      {!data.promotion&&<p className="text-xs text-amber-300">Promotion status source unavailable.</p>}
      <p className="text-xs text-zinc-400">{data.promotion?.social?.detail||'Social publishing connection not verified.'}</p>
    </>}
  </section>;
}
