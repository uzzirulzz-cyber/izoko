import React from 'react'
import {
  BarChart3,
  RefreshCw,
  Eye,
  Users,
  MousePointerClick,
  UserPlus,
  Globe,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface AnalyticsPanelProps {
  analytics: any
  loading: boolean
  onRefresh: () => void
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ analytics, loading, onRefresh }) => {
  const maxViews = Math.max(1, ...(analytics?.series || []).map((s: any) => s.views))

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-emerald-400 inline-block" />
            Analytics & Traffic
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Real visitor tracking recorded by the storefront — page views, product interest, searches, and
            devices. No fake numbers, only live events from MongoDB.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: 'Page Views', value: analytics?.pageViews ?? 0, icon: Eye, color: 'text-emerald-400' },
          { label: 'Unique Visitors', value: analytics?.uniqueVisitors ?? 0, icon: Users, color: 'text-sky-400' },
          { label: 'Product Views', value: analytics?.productViews ?? 0, icon: MousePointerClick, color: 'text-amber-400' },
          { label: 'Searches', value: (analytics?.topSearches || []).reduce((a: number, s: any) => a + s.count, 0), icon: Search, color: 'text-purple-400' },
          { label: 'Sign-ups', value: analytics?.signups ?? 0, icon: UserPlus, color: 'text-rose-400' },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              <k.icon className={`w-3.5 h-3.5 ${k.color}`} /> {k.label}
            </div>
            <div className="text-xl font-black text-white font-mono">
              {Number(k.value).toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">last {analytics?.days || 14} days</div>
          </div>
        ))}
      </div>

      {/* Traffic chart */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-4">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Daily Page Views — last {analytics?.days || 14} days
        </div>
        {loading ? (
          <div className="h-40 flex items-center justify-center text-zinc-500 text-xs font-mono gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading traffic…
          </div>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {(analytics?.series || []).map((s: any) => {
              const h = Math.max(3, Math.round((s.views / maxViews) * 140))
              return (
                <div key={s.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex items-end justify-center" style={{ height: 140 }}>
                    <div
                      className="w-full max-w-[24px] rounded-t bg-gradient-to-t from-emerald-500/50 to-emerald-400 group-hover:from-emerald-400/70 transition-all"
                      style={{ height: h }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-zinc-500">{s.date.slice(5)}</span>
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                    <div className="px-2 py-1 rounded-lg bg-black/90 border border-white/10 text-[9px] font-mono text-white whitespace-nowrap">
                      {s.views} views · {s.sessions} sessions
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top pages */}
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            <Globe className="w-3.5 h-3.5 text-sky-400" /> Top Pages
          </div>
          {(analytics?.topPages || []).length === 0 ? (
            <div className="text-[11px] text-zinc-500 font-mono py-4 text-center">No traffic recorded yet</div>
          ) : (
            (analytics?.topPages || []).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-300 font-mono truncate">{p.path}</span>
                <span className="text-xs font-bold text-white font-mono shrink-0">{p.views}</span>
              </div>
            ))
          )}
        </div>

        {/* Most viewed products */}
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            <MousePointerClick className="w-3.5 h-3.5 text-amber-400" /> Most Viewed Products
          </div>
          {(analytics?.topProducts || []).length === 0 ? (
            <div className="text-[11px] text-zinc-500 font-mono py-4 text-center">No product views yet</div>
          ) : (
            (analytics?.topProducts || []).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-300 truncate">{p.name}</span>
                <span className="text-xs font-bold text-white font-mono shrink-0">{p.views}</span>
              </div>
            ))
          )}
        </div>

        {/* Devices + referrers */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              <Monitor className="w-3.5 h-3.5 text-purple-400" /> Devices
            </div>
            {(analytics?.devices || []).length === 0 ? (
              <div className="text-[11px] text-zinc-500 font-mono py-2 text-center">No data yet</div>
            ) : (
              (analytics?.devices || []).map((d: any, i: number) => {
                const Icon = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor
                return (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-300 flex items-center gap-1.5 capitalize">
                      <Icon className="w-3.5 h-3.5 text-zinc-500" /> {d.device}
                    </span>
                    <span className="text-xs font-bold text-white font-mono">{d.count}</span>
                  </div>
                )
              })
            )}
          </div>
          <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" /> Top Referrers
            </div>
            {(analytics?.referrers || []).slice(0, 5).map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-300 font-mono truncate max-w-[180px]">{r.source}</span>
                <span className="text-xs font-bold text-white font-mono shrink-0">{r.count}</span>
              </div>
            ))}
            {(analytics?.referrers || []).length === 0 && (
              <div className="text-[11px] text-zinc-500 font-mono py-2 text-center">No referrer data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
