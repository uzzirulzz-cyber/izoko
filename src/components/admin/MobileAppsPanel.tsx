import React, { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  Apple,
  RefreshCw,
  RotateCcw,
  Loader2,
  Save,
  QrCode,
  Eye,
  EyeOff,
  Send,
  Info,
  Link2,
  ShieldCheck,
  History,
  BellRing,
} from 'lucide-react'
import { AppQRCode } from '../app/AppQRCode'

/**
 * Admin → Platform → Mobile Apps
 * Customer-app configuration: store URLs, versions, availability switches,
 * storefront visibility toggles, QR destination, promo banner, release notes
 * and a push-notification test sender. Saved config reaches the storefront
 * within 30 seconds (30s server cache) — NO redeploy needed.
 */

interface MobileAppsPanelProps {
  isSuperAdmin: boolean
  onToast: (msg: string) => void
}

interface PlatformConfig {
  url: string
  version: string
  buildNumber: number
  minOsVersion: string
  available: boolean
  packageName: string
}

interface AppsConfig {
  android: PlatformConfig
  ios: PlatformConfig
  downloadPageVisible: boolean
  footerVisible: boolean
  homeSectionVisible: boolean
  qrDestination: 'download' | 'android' | 'ios'
  promoBanner: string
  releaseNotes: string[]
}

interface FullState {
  config: AppsConfig
  source: Record<string, string>
  qrValue: string
  pushTokens: number
  audit: { at: string; actor: string; keys: string[] }[]
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> = ({
  on,
  onChange,
  label,
  hint,
}) => (
  <button
    onClick={() => onChange(!on)}
    className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition ${
      on ? 'border-emerald-400/40 bg-emerald-500/[0.07]' : 'border-slate-400/15 bg-[#060B1E]'
    }`}
  >
    <span className="text-left">
      <span className="block text-[11px] font-mono font-bold text-zinc-200">{label}</span>
      {hint && <span className="block text-[9px] text-zinc-500 mt-0.5 leading-snug">{hint}</span>}
    </span>
    <span className={`w-9 h-5 rounded-full relative transition shrink-0 ${on ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-4.5' : 'left-0.5'}`}
        style={{ left: on ? 18 : 2 }} />
    </span>
  </button>
)

export function MobileAppsPanel({ isSuperAdmin, onToast }: MobileAppsPanelProps) {
  const [state, setState] = useState<FullState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [draft, setDraft] = useState<AppsConfig | null>(null)
  const [loadError, setLoadError] = useState('')

  // push test
  const [pushTitle, setPushTitle] = useState('PlayBeat Digital')
  const [pushBody, setPushBody] = useState('Flash deal — 15% off all subscriptions today!')
  const [pushing, setPushing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/storefront-config`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        setState(data)
        setDraft(data.config)
      } else if (res.status === 401) {
        setLoadError('Admin session expired — reload this page and sign in again.')
      } else if (res.status === 403) {
        setLoadError('This panel needs the super admin (owner) account — you are signed in as staff.')
      } else {
        setLoadError(`Config load failed (HTTP ${res.status}).${data?.error ? ' ' + data.error : ''}`)
      }
    } catch {
      setLoadError('Network error while loading config — check your connection and Refresh.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/storefront-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        onToast('Mobile app config saved — storefront updates within 30s, no redeploy')
        load()
      } else {
        onToast(data?.error || data?.message || 'Could not save mobile app config')
      }
    } catch {
      onToast('Network error while saving mobile app config')
    } finally {
      setSaving(false)
    }
  }

  const resetConfig = async () => {
    if (
      !window.confirm(
        'Reset mobile app config to defaults?\n\nThis wipes every saved override (store URLs, availability switches, visibility toggles, QR destination, promo banner, release notes). The storefront falls back to env vars / safe defaults — the honest “pending deployment” state. This cannot be undone.'
      )
    )
      return
    setResetting(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/storefront-config/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        onToast('Mobile app config reset to defaults — storefront updates within 30s')
        load()
      } else {
        const hint =
          res.status === 401
            ? ' — admin session expired, reload the page and sign in again'
            : res.status === 403
              ? ' — super admin (owner) account required'
              : ''
        onToast((data?.error || data?.message || 'Could not reset mobile app config') + hint)
      }
    } catch {
      onToast('Network error while resetting mobile app config')
    } finally {
      setResetting(false)
    }
  }

  const sendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      onToast('Push title and message are required')
      return
    }
    setPushing(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ title: pushTitle, body: pushBody }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        onToast(`Push sent — ${data.delivered} delivered, ${data.failed} failed`)
      } else {
        onToast(data?.error || 'Push failed')
      }
    } catch {
      onToast('Network error while sending push')
    } finally {
      setPushing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }
  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl bg-[#0A122E]/80 border border-amber-400/25 p-6 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-white font-mono">Super admin only</h3>
          <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-relaxed">
            Mobile app link management changes what every visitor sees on the storefront — it is restricted to the super admin account.
          </p>
        </div>
      </div>
    )
  }
  if (!state || !draft) {
    return (
      <div className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 p-8 text-center">
        <p className="text-[11px] text-zinc-400 font-mono">{loadError || 'Config unavailable — try Refresh.'}</p>
        <button
          onClick={load}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-zinc-300 hover:border-fuchsia-400/40 transition"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    )
  }

  const patchPlatform = (p: 'android' | 'ios', k: keyof PlatformConfig, v: any) =>
    setDraft({ ...draft, [p]: { ...draft[p], [k]: v } })

  const PlatformCard = ({ p, icon, name }: { p: 'android' | 'ios'; icon: React.ReactNode; name: string }) => {
    const cfg = draft[p]
    const src = state.source[`${p}Url`]
    return (
      <div className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#060B1E] border border-slate-400/20 flex items-center justify-center">
              {icon}
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-white font-mono">{name}</h3>
              <p className="text-[9px] text-zinc-500 font-mono">{cfg.packageName || '—'}</p>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold border ${
              cfg.available
                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
            }`}
          >
            {cfg.available ? 'AVAILABLE' : 'PENDING'}
          </span>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-400 mb-1">
            Store / download URL {src === 'db' && <span className="text-emerald-400">(DB override)</span>}
            {src === 'env' && <span className="text-sky-400">(env fallback)</span>}
          </label>
          <input
            value={cfg.url}
            onChange={(e) => patchPlatform(p, 'url', e.target.value)}
            placeholder={p === 'android' ? 'https://play.google.com/store/apps/details?id=… or /downloads/app.apk' : 'https://apps.apple.com/app/…'}
            className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40"
          />
          <p className="text-[9px] text-zinc-600 font-mono mt-1">https:// only · validated before display · empty = “Coming soon” badge on the storefront</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">Version</label>
            <input
              value={cfg.version}
              onChange={(e) => patchPlatform(p, 'version', e.target.value)}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-2.5 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">Build #</label>
            <input
              value={String(cfg.buildNumber)}
              onChange={(e) => patchPlatform(p, 'buildNumber', parseInt(e.target.value, 10) || 0)}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-2.5 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">{p === 'android' ? 'Min Android' : 'Min iOS'}</label>
            <input
              value={cfg.minOsVersion}
              onChange={(e) => patchPlatform(p, 'minOsVersion', e.target.value)}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-2.5 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40"
            />
          </div>
        </div>

        <Toggle
          on={cfg.available}
          onChange={(v) => patchPlatform(p, 'available', v)}
          label={p === 'android' ? 'Android app available' : 'iOS app available'}
          hint="Master switch — off (or empty URL) renders an honest “Pending deployment” state, never a fake link"
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-fuchsia-400" />
            Mobile Apps
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Customer app (Android + iOS) — storefront links, visibility, QR &amp; push
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-zinc-300">
            {state.pushTokens} push device{state.pushTokens === 1 ? '' : 's'}
          </span>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-zinc-300 hover:border-fuchsia-400/40 transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={resetConfig}
            disabled={resetting}
            title="Wipe all overrides — back to env vars / safe defaults (pending launch state)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-400/30 text-[10px] font-mono text-red-300 hover:bg-red-500/20 hover:border-red-400/50 transition disabled:opacity-50"
          >
            {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Reset to defaults
          </button>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PlatformCard p="android" name="Android App" icon={<Smartphone className="w-4.5 h-4.5 text-emerald-400" style={{ width: 18, height: 18 }} />} />
        <PlatformCard p="ios" name="iOS App" icon={<Apple className="w-4.5 h-4.5 text-sky-300" style={{ width: 18, height: 18 }} />} />
      </div>

      {/* Storefront visibility + QR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Storefront visibility</h3>
          </div>
          <Toggle
            on={draft.homeSectionVisible}
            onChange={(v) => setDraft({ ...draft, homeSectionVisible: v })}
            label="Homepage “Get the App” section"
            hint="The premium hero section above the footer on the storefront homepage"
          />
          <Toggle
            on={draft.footerVisible}
            onChange={(v) => setDraft({ ...draft, footerVisible: v })}
            label="Footer “Download App” column + CTA band"
            hint="Compact premium band + footer links on every storefront page"
          />
          <Toggle
            on={draft.downloadPageVisible}
            onChange={(v) => setDraft({ ...draft, downloadPageVisible: v })}
            label="/download landing page"
            hint="Device-aware download page with QR, FAQ and support"
          />
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">Promo banner (optional — shows on /download)</label>
            <input
              value={draft.promoBanner}
              onChange={(e) => setDraft({ ...draft, promoBanner: e.target.value })}
              placeholder="e.g. v2.0 is live — biometric login + push notifications"
              maxLength={240}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">App release notes (one per line — shown on /download)</label>
            <textarea
              value={(draft.releaseNotes || []).join('\n')}
              onChange={(e) =>
                setDraft({ ...draft, releaseNotes: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 20) })
              }
              rows={3}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-3 py-2 text-[10px] text-zinc-200 font-mono focus:outline-none focus:border-amber-400/40 resize-y"
            />
          </div>
        </div>

        {/* QR destination */}
        <div className="rounded-2xl bg-[#0A122E]/80 border border-amber-400/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">QR destination</h3>
          </div>
          <div className="space-y-1.5">
            {(
              [
                ['download', '/download — smart page, adapts to the scanning device'],
                ['android', 'Direct to the Android listing / APK (when available)'],
                ['ios', 'Direct to the App Store listing (when available)'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDraft({ ...draft, qrDestination: val })}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
                  draft.qrDestination === val
                    ? 'border-amber-400/40 bg-amber-500/10'
                    : 'border-slate-400/15 bg-[#060B1E] hover:border-slate-400/30'
                }`}
              >
                <span className="block text-[10px] font-mono font-bold text-zinc-200">{val}</span>
                <span className="block text-[9px] text-zinc-500 leading-snug mt-0.5">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1.5 pt-1">
            <div className="p-2 rounded-xl bg-white">
              <AppQRCode value={state.qrValue} size={92} />
            </div>
            <p className="text-[9px] text-zinc-500 font-mono text-center break-all leading-snug">{state.qrValue}</p>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-gold-gradient text-slate-950 font-extrabold text-xs active:scale-[0.98] transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save mobile app config
        </button>
        <p className="text-[9px] text-zinc-600 font-mono flex items-center gap-1.5">
          <Info className="w-3 h-3" />
          Applied via /api/app/storefront — live on the storefront within 30 seconds, no redeploy
        </p>
      </div>

      {/* Push notifications + audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-[#0A122E]/80 border border-violet-400/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-violet-300" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Push notification</h3>
          </div>
          <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
            Sends via Expo Push to every registered customer device ({state.pushTokens}). Devices register on app login.
          </p>
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">Title</label>
            <input
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-violet-400/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 mb-1">Message</label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              rows={2}
              maxLength={200}
              className="w-full rounded-lg bg-[#060B1E] border border-slate-400/15 px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-violet-400/40 resize-y"
            />
          </div>
          <button
            onClick={sendPush}
            disabled={pushing || state.pushTokens === 0}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500/20 border border-violet-400/40 text-violet-200 font-extrabold text-xs hover:bg-violet-500/30 transition disabled:opacity-40"
          >
            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send to all devices
          </button>
        </div>

        <div className="rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Recent changes</h3>
          </div>
          {state.audit.length === 0 ? (
            <p className="text-[10px] text-zinc-500 font-mono">No changes recorded yet.</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {state.audit.map((a, i) => (
                <li key={i} className="rounded-xl bg-[#060B1E] border border-slate-400/10 px-3 py-2">
                  <p className="text-[10px] font-mono text-zinc-300">
                    {a.actor || 'admin'} — {new Date(a.at).toLocaleString()}
                  </p>
                  <p className="text-[9px] font-mono text-zinc-500 mt-0.5">{(a.keys || []).join(', ')}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#060B1E] border border-slate-400/10 p-2.5">
            <Link2 className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[9px] text-zinc-500 leading-relaxed">
              Sources: DB overrides → env vars (ANDROID_APP_URL / IOS_APP_URL…) → safe defaults. Values are
              re-validated (https-only) before the storefront renders them.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
