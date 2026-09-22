import React, { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  Download,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Wifi,
  WifiOff,
  Loader2,
  Lock,
  Users2,
  CheckCircle2,
  Info,
  Settings2,
  Save,
  AlertTriangle,
} from 'lucide-react'

interface AndroidAppPanelProps {
  isSuperAdmin: boolean
  onToast: (msg: string) => void
}

interface AppMeta {
  name: string
  version: string
  versionCode: number
  apkUrl: string
  sizeBytes: number
  sha256: string
  minSupportedVersion?: string
  forceUpdate?: boolean
  buildDate?: string
  minAndroid: string
  targetAndroid: string
  releaseNotes: string[]
}

interface AppDevice {
  deviceId: string
  adminEmail: string
  adminName: string
  adminRole: 'admin' | 'staff'
  deviceModel: string
  androidVersion: string
  appVersion: string
  lastSeenAt: string
  revoked: boolean
  status: 'online' | 'idle' | 'offline' | 'revoked'
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')
const FALLBACK_APK_URL = '/downloads/playbeat-admin.apk'

const fmtBytes = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

const fmtAgo = (iso: string) => {
  if (!iso) return '—'
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const STATUS_DOT: Record<AppDevice['status'], string> = {
  online: 'bg-emerald-400 shadow-[0_0_8px_currentColor]',
  idle: 'bg-amber-400',
  offline: 'bg-zinc-500',
  revoked: 'bg-rose-500',
}

export function AndroidAppPanel({ isSuperAdmin, onToast }: AndroidAppPanelProps) {
  const [app, setApp] = useState<AppMeta | null>(null)
  const [appLoading, setAppLoading] = useState(true)

  // Release editor (super admin)
  const [minSupported, setMinSupported] = useState('')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingRelease, setSavingRelease] = useState(false)

  // Devices (super admin)
  const [devices, setDevices] = useState<AppDevice[]>([])
  const [devLoading, setDevLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const loadApp = useCallback(async () => {
    setAppLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/app/version`)
      const data = await res.json()
      if (data?.success && data.app) {
        setApp(data.app)
        setMinSupported(data.app.minSupportedVersion || '')
        setForceUpdate(Boolean(data.app.forceUpdate))
        setNotes((data.app.releaseNotes || []).join('\n'))
      }
    } catch {
      /* keep previous state; hero falls back to static defaults */
    } finally {
      setAppLoading(false)
    }
  }, [])

  const loadDevices = useCallback(async () => {
    if (!isSuperAdmin) return
    setDevLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/devices`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      })
      const data = await res.json()
      if (data?.success) setDevices(data.devices || [])
    } catch {
      /* silent */
    } finally {
      setDevLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    loadApp()
    loadDevices()
  }, [loadApp, loadDevices])

  const saveRelease = async () => {
    setSavingRelease(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/release`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({
          minSupportedVersion: minSupported.trim(),
          forceUpdate,
          releaseNotes: notes.split('\n').map((l) => l.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        onToast('Release settings saved — enforced on every installed app')
        loadApp()
      } else {
        onToast(data?.message || 'Could not save release settings')
      }
    } catch {
      onToast('Network error while saving release settings')
    } finally {
      setSavingRelease(false)
    }
  }

  const setRevoked = async (deviceId: string, revoked: boolean) => {
    setRevokingId(deviceId)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/devices/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ deviceId, revoked }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        onToast(revoked ? 'Device revoked — it will lock on next heartbeat' : 'Device restored')
        loadDevices()
      } else {
        onToast(data?.message || 'Could not update device')
      }
    } catch {
      onToast('Network error while updating device')
    } finally {
      setRevokingId(null)
    }
  }

  const copySha = async () => {
    try {
      await navigator.clipboard.writeText(app?.sha256 || '')
      onToast('SHA-256 copied')
    } catch {
      onToast('Copy failed — select the hash manually')
    }
  }

  const apkUrl = app?.apkUrl || FALLBACK_APK_URL

  return (
    <div className="space-y-5">
      {/* ================= SECTION HEADER ================= */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-fuchsia-400" />
            Android App
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Official Playbeat Admin app — download, install, and manage connected devices
          </p>
        </div>
        <button
          onClick={() => { loadApp(); loadDevices() }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-zinc-300 hover:border-fuchsia-400/40 transition"
        >
          <RefreshCw className={`w-3 h-3 ${appLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ================= DOWNLOAD HERO ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 rounded-2xl bg-[#0A122E]/80 border border-fuchsia-400/20 p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-fuchsia-500/10 blur-2xl pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-violet-600/20 border border-fuchsia-400/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-7 h-7 text-fuchsia-300" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white font-mono">Playbeat Admin</h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                  v{app?.version || '2.0.0'}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-zinc-300 text-[9px] font-mono">
                  Android 7.0+ (API 24)
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-zinc-300 text-[9px] font-mono">
                  {app ? fmtBytes(app.sizeBytes) : '140 KB'} · APK
                </span>
                {app?.forceUpdate && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/30 text-rose-300 text-[9px] font-mono font-bold">
                    FORCE UPDATE ON
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1.5 font-mono">
                digital.playbeat.adminapp · signed release · updated {app?.buildDate ? fmtAgo(app.buildDate) : '—'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {['Native login', 'Biometric unlock', 'Live ops badges', 'Full admin console', 'Device revoke', 'AES-256 sessions'].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[9px] font-mono text-zinc-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <a
            href={apkUrl}
            download
            className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl btn-gold-gradient text-slate-950 font-extrabold text-sm active:scale-[0.98] transition shadow-lg"
          >
            <Download className="w-5 h-5" />
            Download Android App — v{app?.version || '2.0.0'}
          </a>
          <p className="text-center text-[9px] text-zinc-600 font-mono mt-1.5">{apkUrl}</p>

          {app?.sha256 && (
            <button
              onClick={copySha}
              className="mt-2 w-full flex items-center gap-2 rounded-xl bg-[#060B1E] border border-slate-400/10 px-3 py-2 text-left hover:border-emerald-400/30 transition group"
              title="Copy SHA-256"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono text-[9px] text-zinc-500 break-all flex-1">
                SHA-256 {app.sha256.slice(0, 40)}…
              </span>
              <span className="text-[9px] font-mono text-emerald-300 opacity-0 group-hover:opacity-100 transition">copy</span>
            </button>
          )}
        </div>

        {/* Install guide */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0A122E]/80 border border-sky-400/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Install in 4 steps</h3>
          </div>
          <ol className="space-y-2.5">
            {[
              'Tap Download and open the APK on your Android phone.',
              'Allow "Install unknown apps" for your browser when prompted.',
              'Install, then open Playbeat Admin.',
              'Sign in with your web admin email & password — customer accounts are rejected.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 font-mono">
                  {i + 1}
                </span>
                <span className="text-[10px] text-zinc-400 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#060B1E] border border-slate-400/10 p-2.5">
            <Lock className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[9px] text-zinc-500 leading-relaxed">
              Already installed v1? The new build upgrades in place — same signature, your saved session stays.
            </p>
          </div>
        </div>
      </div>

      {/* ================= WHAT'S NEW ================= */}
      {app?.releaseNotes?.length > 0 && (
        <div className="rounded-2xl bg-[#0A122E]/80 border border-emerald-400/15 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">What's new in v{app.version}</h3>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            {app.releaseNotes.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] text-zinc-400 leading-relaxed">
                <span className="text-emerald-400 mt-0.5 shrink-0">▸</span>
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ================= SUPER ADMIN: RELEASE + DEVICES ================= */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Release settings */}
          <div className="rounded-2xl bg-[#0A122E]/80 border border-amber-400/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Release settings</h3>
            </div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">Minimum supported version</label>
            <input
              value={minSupported}
              onChange={(e) => setMinSupported(e.target.value)}
              placeholder="1.0.0"
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40"
            />
            <button
              onClick={() => setForceUpdate(!forceUpdate)}
              className={`mt-3 w-full flex items-center justify-between rounded-lg border px-3 py-2 transition ${
                forceUpdate ? 'border-rose-400/40 bg-rose-500/10' : 'border-slate-400/15 bg-[#060B1E]'
              }`}
            >
              <span className="text-[10px] font-mono text-zinc-300">Force update (blocking gate for old versions)</span>
              <span className={`w-8 h-4 rounded-full relative transition ${forceUpdate ? 'bg-rose-500' : 'bg-zinc-600'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${forceUpdate ? 'left-4' : 'left-0.5'}`} />
              </span>
            </button>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1 mt-3">Release notes (one per line)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-3 py-2 text-[10px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40 resize-y"
            />
            <button
              onClick={saveRelease}
              disabled={savingRelease}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl btn-gold-gradient text-slate-950 font-extrabold text-xs active:scale-[0.98] transition disabled:opacity-50"
            >
              {savingRelease ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save release settings
            </button>
            <p className="text-[9px] text-zinc-600 font-mono mt-2">
              Applied server-side via /api/app/version — every installed app picks it up, no reinstall needed.
            </p>
          </div>

          {/* Devices */}
          <div className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users2 className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Connected devices</h3>
              </div>
              <button onClick={loadDevices} className="text-zinc-500 hover:text-sky-300 transition">
                <RefreshCw className={`w-3.5 h-3.5 ${devLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <WifiOff className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-500 font-mono">No devices have signed in yet — install the app to see it here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {devices.map((d) => (
                  <div key={d.deviceId} className="flex items-center gap-3 rounded-xl bg-[#060B1E] border border-slate-400/10 px-3 py-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[d.status] || 'bg-zinc-500'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-zinc-200 font-semibold truncate">
                        {d.deviceModel || 'Unknown device'}{' '}
                        <span className="text-zinc-500 font-mono text-[9px]">· v{d.appVersion} · Android {d.androidVersion}</span>
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono truncate">
                        {d.adminEmail} ({d.adminRole}) · {fmtAgo(d.lastSeenAt)}
                      </p>
                    </div>
                    {d.revoked ? (
                      <button
                        onClick={() => setRevoked(d.deviceId, false)}
                        disabled={revokingId === d.deviceId}
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[9px] font-mono font-bold hover:bg-emerald-500/25 transition disabled:opacity-50"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => setRevoked(d.deviceId, true)}
                        disabled={revokingId === d.deviceId}
                        className="px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-300 text-[9px] font-mono font-bold hover:bg-rose-500/25 transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {revokingId === d.deviceId ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#060B1E] border border-slate-400/10 p-2.5">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[9px] text-zinc-500 leading-relaxed">
                Revoking a device blocks it at the API instantly — the app wipes its session and locks to the login screen.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
