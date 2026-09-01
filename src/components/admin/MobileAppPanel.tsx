import React, { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  Lock,
  Users2,
  Activity,
  MonitorSmartphone,
  CheckCircle2,
  Info,
} from 'lucide-react'

interface MobileAppPanelProps {
  isSuperAdmin: boolean
  onToast: (msg: string) => void
}

interface AppDevice {
  deviceId: string
  adminEmail: string
  adminName: string
  adminRole: 'admin' | 'staff'
  deviceModel: string
  androidVersion: string
  appVersion: string
  firstSeenAt: string
  lastSeenAt: string
  revoked: boolean
  lastIp: string
  status: 'online' | 'idle' | 'offline' | 'revoked'
}

interface AppMeta {
  name: string
  version: string
  versionCode: number
  apkUrl: string
  sizeBytes: number
  sha256: string
  updatedAt: string
  minAndroid: string
  targetAndroid: string
  changelog: string[]
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

const fmtBytes = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

const fmtAgo = (iso: string) => {
  if (!iso) return '—'
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const STATUS_STYLE: Record<string, { dot: string; label: string; chip: string }> = {
  online: { dot: 'bg-emerald-400', label: 'LIVE', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' },
  idle: { dot: 'bg-amber-400', label: 'IDLE', chip: 'bg-amber-500/15 text-amber-300 border-amber-400/30' },
  offline: { dot: 'bg-slate-500', label: 'OFFLINE', chip: 'bg-slate-500/15 text-slate-400 border-slate-400/30' },
  revoked: { dot: 'bg-rose-500', label: 'REVOKED', chip: 'bg-rose-500/15 text-rose-300 border-rose-400/30' },
}

export const MobileAppPanel: React.FC<MobileAppPanelProps> = ({ isSuperAdmin, onToast }) => {
  const [app, setApp] = useState<AppMeta | null>(null)
  const [devices, setDevices] = useState<AppDevice[]>([])
  const [stats, setStats] = useState({ total: 0, onlineNow: 0, revoked: 0 })
  const [loading, setLoading] = useState(true)
  const [busyDevice, setBusyDevice] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/devices`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setDevices(data.devices || [])
        setStats(data.stats || { total: 0, onlineNow: 0, revoked: 0 })
        setLastSync(new Date())
      }
    } catch {
      /* silent — live panel */
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAppMeta = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/version`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setApp(data.app)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    loadDevices()
    loadAppMeta()
    const t = setInterval(loadDevices, 30000) // live poll
    return () => clearInterval(t)
  }, [loadDevices, loadAppMeta])

  const toggleRevoke = async (device: AppDevice) => {
    setBusyDevice(device.deviceId)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/devices/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ deviceId: device.deviceId, revoked: !device.revoked }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(data.revoked ? 'Device revoked — heartbeat access blocked.' : 'Device restored.')
        loadDevices()
      } else {
        onToast(data?.error || 'Failed to update device.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setBusyDevice(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* ============ HEADER ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/30 flex items-center justify-center">
              <MonitorSmartphone className="w-4 h-4 text-fuchsia-400" />
            </span>
            Mobile App — Android Admin
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 font-sans">
            Official Playbeat Admin Android client · same super admin / staff login as this panel · live API status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-300 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {stats.onlineNow} DEVICE{stats.onlineNow === 1 ? '' : 'S'} LIVE
          </span>
          <button
            onClick={() => {
              setLoading(true)
              loadDevices()
              loadAppMeta()
            }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ============ APP RELEASE + SECURITY ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Release card */}
        <div className="lg:col-span-3 rounded-2xl bg-[#0A122E]/80 border border-fuchsia-400/20 p-5">
          <div className="flex items-start gap-4">
            <img
              src="/playbeat-logo.png"
              alt="Playbeat Admin"
              className="w-16 h-16 rounded-2xl object-contain bg-[#060B1E] border border-fuchsia-400/25 p-2"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-white">Playbeat Admin</h3>
                <span className="px-1.5 py-0.5 rounded bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-300 text-[9px] font-mono font-bold">
                  v{app?.version || '1.0.0'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[9px] font-mono font-bold">
                  OFFICIAL
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                digital.playbeat.adminapp · APK {app ? fmtBytes(app.sizeBytes) : '—'} · updated{' '}
                {app ? fmtAgo(app.updatedAt) : '—'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {['Android 7.0+', 'Role-restricted', 'Live heartbeat', 'Device revoke'].map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[9px] font-mono text-zinc-400"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <a
            href={app?.apkUrl || '/downloads/playbeat-admin-v1.0.0.apk'}
            download
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl btn-gold-gradient text-slate-950 font-extrabold text-xs active:scale-[0.98] transition shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download APK — v{app?.version || '1.0.0'}
          </a>

          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-[#060B1E] border border-slate-400/10 p-3">
            <Info className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
            <div className="text-[10px] text-zinc-400 leading-relaxed font-sans">
              Install: open the APK on your Android phone → allow “Install unknown apps” for your browser →
              install → sign in with your <span className="text-zinc-200 font-semibold">web admin email &amp; password</span>.
              Only super admin and staff IDs are accepted — customer accounts are rejected.
              {app?.sha256 && (
                <>
                  <br />
                  <span className="font-mono text-[9px] text-zinc-500 break-all">SHA-256 {app.sha256}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Security card */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0A122E]/80 border border-amber-400/20 p-5 space-y-3.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
              Access & Control
            </h3>
          </div>
          {[
            {
              icon: <Users2 className="w-3.5 h-3.5 text-amber-400" />,
              text: 'Same login & password as this web panel — super admin and staff IDs only.',
            },
            {
              icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
              text: 'Staff sessions carry role “staff” — restricted access matches the web exactly.',
            },
            {
              icon: <Activity className="w-3.5 h-3.5 text-sky-400" />,
              text: 'Signed-in devices heartbeat every 60s → live status shown below.',
            },
            {
              icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
              text: isSuperAdmin
                ? 'You can revoke any device — it is blocked at the API instantly.'
                : 'Device revocation is a super administrator capability.',
            },
          ].map((row, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0">{row.icon}</span>
              <p className="text-[10.5px] text-zinc-300 leading-relaxed font-sans">{row.text}</p>
            </div>
          ))}

          {/* QR */}
          <div className="flex items-center gap-3 pt-1">
            <img
              src="/assets/images/playbeat/admin-app-qr.png"
              alt="Scan to download APK"
              className="w-20 h-20 rounded-xl border border-slate-400/20 bg-white p-1"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-white font-mono">
                <QrCode className="w-3 h-3 text-amber-400" /> SCAN TO INSTALL
              </div>
              <p className="text-[9.5px] text-zinc-500 mt-1 font-sans leading-snug">
                Scan from your phone camera to open the APK download directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============ LIVE DEVICES ============ */}
      <div className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-[#060B1E]/60">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
              Connected Devices — Live Status
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-[9px] font-mono font-bold">
              {stats.onlineNow} LIVE
            </span>
            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/25 text-sky-300 text-[9px] font-mono font-bold">
              {stats.total} TOTAL
            </span>
            {stats.revoked > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/25 text-rose-300 text-[9px] font-mono font-bold">
                {stats.revoked} REVOKED
              </span>
            )}
          </div>
        </div>

        {loading && devices.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-zinc-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading device status…
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-6">
            <Smartphone className="w-8 h-8 text-zinc-600" />
            <p className="text-xs font-bold text-zinc-300">No devices have connected yet</p>
            <p className="text-[10px] text-zinc-500 max-w-xs font-sans">
              Install the APK on your Android phone, sign in with your admin account, and the device
              will appear here within a minute with live status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] min-w-[760px]">
              <thead>
                <tr className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider border-b border-white/5">
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Device</th>
                  <th className="px-3 py-2.5">Signed-in Admin</th>
                  <th className="px-3 py-2.5">App / Android</th>
                  <th className="px-3 py-2.5">Last Seen</th>
                  {isSuperAdmin && <th className="px-5 py-2.5 text-right">Control</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {devices.map((d) => {
                  const st = STATUS_STYLE[d.status] || STATUS_STYLE.offline
                  return (
                    <tr key={d.deviceId} className="hover:bg-white/[0.02] transition">
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold ${st.chip}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${d.status === 'online' ? 'animate-pulse' : ''}`}></span>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-white">{d.deviceModel}</div>
                        <div className="font-mono text-[9px] text-zinc-600">{d.deviceId.slice(0, 22)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-zinc-200">{d.adminName || d.adminEmail}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold ${
                              d.adminRole === 'staff'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            {d.adminRole === 'staff' ? 'STAFF' : 'SUPER ADMIN'}
                          </span>
                        </div>
                        <div className="text-[9px] text-zinc-600 font-mono">{d.adminEmail}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-zinc-400">
                        v{d.appVersion || '—'} · Android {d.androidVersion || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-zinc-400">{fmtAgo(d.lastSeenAt)}</td>
                      {isSuperAdmin && (
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => toggleRevoke(d)}
                            disabled={busyDevice === d.deviceId}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition border ${
                              d.revoked
                                ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 border-rose-400/30 text-rose-300 hover:bg-rose-500/20'
                            } disabled:opacity-50`}
                            title={d.revoked ? 'Restore device access' : 'Block this device at the API'}
                          >
                            {busyDevice === d.deviceId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : d.revoked ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <ShieldOff className="w-3 h-3" />
                            )}
                            {d.revoked ? 'Restore' : 'Revoke'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/5 bg-[#060B1E]/40">
          <span className="text-[9px] font-mono text-zinc-600">
            Auto-refresh every 30s · device goes LIVE on heartbeat within 60s of sign-in
          </span>
          {lastSync && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> synced {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ============ WHAT'S NEW ============ */}
      {app?.changelog?.length ? (
        <div className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 p-5">
          <div className="flex items-center gap-2 mb-3">
            <WifiOff className="w-0 h-0" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
              What's New — v{app.version}
            </h3>
          </div>
          <ul className="space-y-1.5">
            {app.changelog.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[10.5px] text-zinc-400 font-sans">
                <span className="w-1 h-1 rounded-full bg-fuchsia-400 mt-1.5 shrink-0"></span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
