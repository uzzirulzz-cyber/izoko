import React from 'react'
import {
  Activity,
  Database,
  Server,
  Cpu,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Clock,
  HardDrive,
} from 'lucide-react'

interface SystemHealthPanelProps {
  health: any
  loading: boolean
  onRefresh: () => void
}

const fmtUptime = (s: number) => {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ health, loading, onRefresh }) => {
  const operational = health?.status === 'operational'

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-emerald-400 inline-block" />
            System Health
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Live infrastructure diagnostics from MongoDB and the API runtime.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Diagnostics
        </button>
      </div>

      {!health ? (
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-10 text-center text-xs text-zinc-500 font-mono">
          {loading ? 'Running diagnostics…' : 'No health data — run diagnostics.'}
        </div>
      ) : (
        <>
          {/* Status banner */}
          <div
            className={`rounded-2xl border p-5 flex items-center gap-4 ${
              operational
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : 'bg-rose-500/5 border-rose-500/30'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                operational ? 'bg-emerald-400/15 border border-emerald-400/40' : 'bg-rose-400/15 border border-rose-400/40'
              }`}
            >
              {operational ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              )}
            </div>
            <div className="flex-1">
              <div className={`text-base font-extrabold ${operational ? 'text-emerald-300' : 'text-rose-300'}`}>
                {operational ? 'All Systems Operational' : 'Degraded — Database Issues Detected'}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Database {health.database?.connected ? `connected · ${health.database.latencyMs}ms ping` : 'unreachable'}
                {' · '}
                checked {health.checkedAt ? new Date(health.checkedAt).toLocaleString() : '—'}
              </div>
            </div>
          </div>

          {health.database?.error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-[11px] text-rose-300 font-mono">
              {health.database.error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Collections */}
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                <Database className="w-3.5 h-3.5 text-amber-400" /> Collections
              </div>
              {[
                ['Products', health.collections?.products ?? '—'],
                ['Orders', health.collections?.orders ?? '—'],
                ['Users', health.collections?.users ?? '—'],
                ['Restore Points', health.collections?.backups ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">{label}</span>
                  <span className="text-sm font-bold text-white font-mono">{value}</span>
                </div>
              ))}
            </div>

            {/* Alerts */}
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                <Activity className="w-3.5 h-3.5 text-rose-400" /> Alerts
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Pending / processing orders</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    (health.alerts?.pendingOrders || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {health.alerts?.pendingOrders ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Low-stock products (≤5)</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    (health.alerts?.lowStockProducts || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {health.alerts?.lowStockProducts ?? 0}
                </span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="text-[11px] text-zinc-400">Last restore point</div>
                <div className="text-[11px] text-white font-mono mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {health.lastBackup?.createdAt
                    ? new Date(health.lastBackup.createdAt).toLocaleString()
                    : 'None yet'}
                </div>
                {health.lastBackup?.name && (
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{health.lastBackup.name}</div>
                )}
              </div>
            </div>

            {/* Runtime */}
            <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                <Server className="w-3.5 h-3.5 text-sky-400" /> API Runtime
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" /> Uptime
                </span>
                <span className="text-xs font-bold text-white font-mono">
                  {health.runtime?.uptimeSeconds != null ? fmtUptime(health.runtime.uptimeSeconds) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-zinc-500" /> Memory
                </span>
                <span className="text-xs font-bold text-white font-mono">
                  {health.runtime?.memoryUsedMB != null
                    ? `${health.runtime.memoryUsedMB} / ${health.runtime.memoryTotalMB} MB`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Node version</span>
                <span className="text-xs font-bold text-white font-mono">{health.runtime?.nodeVersion || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-zinc-500" /> Platform
                </span>
                <span className="text-xs font-bold text-white font-mono">{health.runtime?.platform || '—'}</span>
              </div>
            </div>

            {/* Database identity */}
            <div className="rounded-2xl bg-[#0B0F19] border border-emerald-500/20 p-5 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                <Database className="w-3.5 h-3.5 text-emerald-400" /> Database
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Cluster</span>
                <span className="text-xs font-bold text-white font-mono">Atlas Cluster0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Database</span>
                <span className="text-xs font-bold text-emerald-300 font-mono">{health.database?.name || 'playbeat'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Ping</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    (health.database?.latencyMs || 999) < 300 ? 'text-emerald-300' : 'text-amber-400'
                  }`}
                >
                  {health.database?.latencyMs != null ? `${health.database.latencyMs}ms` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Connection</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {health.database?.connected ? 'Live' : 'Down'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
