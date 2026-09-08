// Admin → WhatsApp Business — Cloud API configuration + messaging.
// Config (Phone Number ID, WABA ID, access token) is stored in the DB by the
// super admin and overrides WHATSAPP_* Vercel env vars (no redeploy needed).
// The token is a SECRET: it is only ever shown masked by the API. The panel
// supports a live connection check, template listing, free-text sends and
// template sends with body parameters — every send is logged server-side.
// Order notifications: per-event auto-send rules (placed/paid/shipped/
// delivered) with template or free-text mode and {{placeholder}} support.
import React, { useCallback, useEffect, useState } from 'react'
import {
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Activity,
  ShoppingCart,
  BadgeCheck,
  Truck,
  PackageCheck,
  BellRing,
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

type WhatsAppConfigState = {
  phoneNumberId: string
  wabaId: string
  graphVersion: string
  hasToken: boolean
  tokenPreview: string
}

type SourceMap = Record<string, 'db' | 'env' | 'none'>

type RecentSend = {
  at: string
  to: string
  kind: string
  templateName: string | null
  trigger: string | null
  orderNumber: string | null
  ok: boolean
  error: string | null
  wamid: string | null
}

type ConfigResponse = {
  success: boolean
  error?: string
  config: WhatsAppConfigState
  source: SourceMap
  notifications?: NotificationsState
  audits: { at: string; actor: string; keys: string[] }[]
  recent: RecentSend[]
}

type TemplateInfo = {
  name: string
  status: string
  category: string
  language: string
  components: { type: string; text: string | null; example: any }[]
}

type PhoneStatus = {
  display_phone_number?: string
  verified_name?: string
  quality_rating?: string
  code_verification_status?: string
}

const EMPTY_FORM = { phoneNumberId: '', wabaId: '', graphVersion: '', accessToken: '' }

// ---- order notifications ----
type NotifTrigger = 'order_placed' | 'payment_confirmed' | 'order_shipped' | 'order_delivered'

type NotifEvent = {
  enabled: boolean
  mode: 'template' | 'text'
  templateName: string
  templateLang: string
  bodyParams: string[]
  textTemplate: string
}

type NotificationsState = {
  defaultCountryCode: string
  events: Record<NotifTrigger, NotifEvent>
}

const NOTIF_TRIGGERS: NotifTrigger[] = ['order_placed', 'payment_confirmed', 'order_shipped', 'order_delivered']

const NOTIF_META: Record<NotifTrigger, { label: string; desc: string; icon: React.FC<any>; color: string }> = {
  order_placed: { label: 'Order placed', desc: 'Fires when the customer checks out (any payment method)', icon: ShoppingCart, color: 'text-sky-400' },
  payment_confirmed: { label: 'Payment confirmed', desc: 'Fires once the gateway webhook verifies payment', icon: BadgeCheck, color: 'text-emerald-400' },
  order_shipped: { label: 'Order shipped', desc: 'Fires when staff moves the order to “shipped”', icon: Truck, color: 'text-amber-400' },
  order_delivered: { label: 'Order delivered', desc: 'Fires when staff moves the order to “delivered”', icon: PackageCheck, color: 'text-violet-400' },
}

const PLACEHOLDER_VARS = ['customerName', 'orderNumber', 'total', 'currency', 'status', 'paymentStatus', 'paymentMethod', 'itemsSummary', 'itemCount', 'orderUrl', 'storeName', 'orderDate']

function emptyNotifState(): NotificationsState {
  return {
    defaultCountryCode: '92',
    events: {
      order_placed: { enabled: false, mode: 'text', templateName: '', templateLang: 'en_US', bodyParams: ['', '', ''], textTemplate: '' },
      payment_confirmed: { enabled: false, mode: 'text', templateName: '', templateLang: 'en_US', bodyParams: ['', '', ''], textTemplate: '' },
      order_shipped: { enabled: false, mode: 'text', templateName: '', templateLang: 'en_US', bodyParams: ['', '', ''], textTemplate: '' },
      order_delivered: { enabled: false, mode: 'text', templateName: '', templateLang: 'en_US', bodyParams: ['', '', ''], textTemplate: '' },
    },
  }
}

function hydrateNotifState(raw?: NotificationsState): NotificationsState {
  const base = emptyNotifState()
  if (!raw || typeof raw !== 'object') return base
  if (typeof raw.defaultCountryCode === 'string' && /^\d{1,4}$/.test(raw.defaultCountryCode)) {
    base.defaultCountryCode = raw.defaultCountryCode
  }
  for (const key of NOTIF_TRIGGERS) {
    const e = (raw.events || {})[key]
    if (e && typeof e === 'object') {
      base.events[key] = {
        enabled: Boolean(e.enabled),
        mode: e.mode === 'template' ? 'template' : 'text',
        templateName: String(e.templateName || ''),
        templateLang: String(e.templateLang || 'en_US'),
        bodyParams: Array.isArray(e.bodyParams)
          ? [0, 1, 2].map((i) => String(e.bodyParams[i] ?? ''))
          : ['', '', ''],
        textTemplate: String(e.textTemplate || ''),
      }
    }
  }
  return base
}

function fmtWhen(iso?: string) {
  if (!iso) return 'never'
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'moments ago'
  if (mins < 60) return `${mins} min ago`
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`
  return d.toLocaleString()
}

export const WhatsAppPanel: React.FC<{ onToast: (msg: string, type?: string) => void }> = ({ onToast }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ConfigResponse | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)

  const [statusLoading, setStatusLoading] = useState(false)
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus | null>(null)
  const [statusError, setStatusError] = useState('')

  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState('')

  const [sendTo, setSendTo] = useState('+923341079333')
  const [sendKind, setSendKind] = useState<'text' | 'template'>('template')
  const [sendText, setSendText] = useState('')
  const [sendTemplate, setSendTemplate] = useState('jaspers_market_order_confirmation_v1')
  const [sendLang, setSendLang] = useState('en_US')
  const [sendParams, setSendParams] = useState<string[]>(['', '', ''])
  const [sending, setSending] = useState(false)

  const [notif, setNotif] = useState<NotificationsState>(emptyNotifState())
  const [notifSaving, setNotifSaving] = useState(false)
  const [testSending, setTestSending] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const json: ConfigResponse = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load')
      setData(json)
      setNotif(hydrateNotifState(json.notifications))
      setForm({
        phoneNumberId: json.config.phoneNumberId || '',
        wabaId: json.config.wabaId || '',
        graphVersion: json.config.graphVersion || '',
        accessToken: '',
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load WhatsApp configuration.')
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
      const body: Record<string, string> = {
        phoneNumberId: form.phoneNumberId.trim(),
        wabaId: form.wabaId.trim(),
        graphVersion: form.graphVersion.trim(),
      }
      if (form.accessToken.trim()) body.accessToken = form.accessToken.trim()
      const res = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
      onToast('WhatsApp configuration saved — live within 30s.', 'success')
      setForm((f) => ({ ...f, accessToken: '' }))
      await load()
    } catch (e: any) {
      onToast(e?.message || 'Could not save WhatsApp configuration.', 'error')
      setError(e?.message || '')
    } finally {
      setSaving(false)
    }
  }

  const checkStatus = async () => {
    setStatusLoading(true)
    setStatusError('')
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/whatsapp-status`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Status check failed')
      setPhoneStatus(json.status)
      onToast('WhatsApp connection OK.', 'success')
    } catch (e: any) {
      setPhoneStatus(null)
      setStatusError(e?.message || 'Status check failed')
    } finally {
      setStatusLoading(false)
    }
  }

  const saveNotifications = async () => {
    setNotifSaving(true)
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ notifications: notif }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Save failed')
      onToast('Order notification rules saved — live immediately.', 'success')
      await load()
    } catch (e: any) {
      onToast(e?.message || 'Could not save notification rules.', 'error')
    } finally {
      setNotifSaving(false)
    }
  }

  const testNotification = async (trigger: NotifTrigger) => {
    setTestSending((s) => ({ ...s, [trigger]: true }))
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/whatsapp-notify-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ trigger, to: sendTo.trim() }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Test failed')
      onToast(`Test “${NOTIF_META[trigger].label}” sent to +${json.result?.to || sendTo}.`, 'success')
      await load()
    } catch (e: any) {
      onToast(e?.message || 'Test send failed.', 'error')
    } finally {
      setTestSending((s) => ({ ...s, [trigger]: false }))
    }
  }

  const patchEvent = (trigger: NotifTrigger, patch: Partial<NotifEvent>) =>
    setNotif((n) => ({ ...n, events: { ...n.events, [trigger]: { ...n.events[trigger], ...patch } } }))

  const loadTemplates = async () => {
    setTemplatesLoading(true)
    setTemplatesError('')
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const res = await fetch(`${API_BASE}/api/admin/whatsapp-templates`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Could not load templates')
      setTemplates(json.templates || [])
    } catch (e: any) {
      setTemplatesError(e?.message || 'Could not load templates')
    } finally {
      setTemplatesLoading(false)
    }
  }

  const send = async () => {
    setSending(true)
    try {
      const token = localStorage.getItem('playbeat_admin_token') || ''
      const body: Record<string, any> = { to: sendTo.trim(), kind: sendKind }
      if (sendKind === 'text') {
        body.text = sendText
      } else {
        body.templateName = sendTemplate
        body.languageCode = sendLang
        body.params = sendParams.map((p) => p.trim()).filter(Boolean)
      }
      const res = await fetch(`${API_BASE}/api/admin/whatsapp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Send failed')
      onToast(`WhatsApp message sent to ${sendTo}.`, 'success')
      setSendText('')
      await load()
    } catch (e: any) {
      onToast(e?.message || 'WhatsApp send failed.', 'error')
    } finally {
      setSending(false)
    }
  }

  const cfg = data?.config
  const configured = Boolean(cfg?.phoneNumberId && cfg?.hasToken)

  const field = (label: string, key: keyof typeof EMPTY_FORM, placeholder: string, type = 'text') => (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">{label}</span>
      <input
        type={type}
        value={String(form[key])}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition font-mono"
      />
    </label>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-white tracking-tight">WhatsApp Business</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cloud API messaging — order notifications, customer support and template broadcasts
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="pa-card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">Connection</span>
            </div>
            {configured ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                <XCircle className="w-3 h-3" /> Incomplete
              </span>
            )}
          </div>
          <button
            onClick={checkStatus}
            disabled={statusLoading || !configured}
            className="mt-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 transition disabled:opacity-40"
          >
            <Activity className={`w-3.5 h-3.5 ${statusLoading ? 'animate-pulse' : ''}`} />
            {statusLoading ? 'Checking…' : 'Test connection'}
          </button>
          {statusError && <div className="text-[10.5px] text-rose-300">{statusError}</div>}
          {phoneStatus && (
            <div className="text-[10.5px] text-slate-300 space-y-0.5">
              <div>Number: <span className="font-mono text-emerald-300">{phoneStatus.display_phone_number}</span></div>
              <div>Name: <span className="font-semibold">{phoneStatus.verified_name}</span></div>
              <div>
                Quality: <span className={phoneStatus.quality_rating === 'GREEN' ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                  {phoneStatus.quality_rating || '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="pa-card p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">Access token</span>
          </div>
          <div className="text-[11px] font-mono text-slate-300 break-all">{cfg?.tokenPreview || '—'}</div>
          <div className="text-[10.5px] text-slate-500">
            {cfg?.hasToken ? `Source: ${data?.source.accessToken}` : 'No token configured'}
            {' · '}stored server-side, never exposed unmasked
          </div>
          <a
            href="https://business.facebook.com/latest/whatsapp_manager"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10.5px] text-sky-400 hover:text-sky-300 font-semibold mt-auto"
          >
            WhatsApp Manager <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="pa-card p-4 flex flex-col gap-1.5">
          <span className="text-sm font-bold text-white">Test number limits</span>
          <ul className="text-[10.5px] text-slate-400 space-y-1 list-disc list-inside leading-relaxed">
            <li>Only verified test recipients can receive messages</li>
            <li>Free-text replies need an open 24-hour session</li>
            <li>Templates can always be sent — use them for orders</li>
            <li>Test tokens expire in ~24h — paste a fresh one here</li>
          </ul>
        </div>
      </div>

      {/* Configuration form */}
      <div className="pa-card p-4">
        <h3 className="text-sm font-bold text-white mb-1">API credentials</h3>
        <p className="text-[10.5px] text-slate-500 mb-3">
          DB values (saved here) override Vercel env WHATSAPP_* — no redeploy needed. Leave the token field blank to keep the current one.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {field('Phone Number ID', 'phoneNumberId', 'e.g. 1214431751763817')}
          {field('WhatsApp Business Account ID', 'wabaId', 'e.g. 28068728176132257')}
          {field('Graph API version', 'graphVersion', 'v25.0')}
          {field('Access token', 'accessToken', cfg?.hasToken ? '•••••••• (leave blank to keep current)' : 'EAAP…', 'password')}
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl btn-gold-gradient text-slate-950 text-xs font-extrabold active:scale-95 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </div>
      </div>

      {/* Order notifications — automated customer messages */}
      <div className="pa-card p-4">
        <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BellRing className="w-4 h-4 text-emerald-400" /> Order notifications — auto-send
            </h3>
            <p className="text-[10.5px] text-slate-500 mt-1">
              Automatic WhatsApp messages to customers on order events. Sent to the checkout WhatsApp
              number (or the saved profile number). Everything is OFF until you enable it.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Default country code</span>
            <input
              type="text"
              value={notif.defaultCountryCode}
              onChange={(e) => setNotif((n) => ({ ...n, defaultCountryCode: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
              placeholder="92"
              className="w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition font-mono"
            />
          </label>
          <div className="sm:col-span-2 text-[10.5px] text-slate-500 leading-relaxed self-end pb-1">
            Local numbers starting with <span className="font-mono text-slate-300">0</span> (e.g. 03001234567) are
            normalized to <span className="font-mono text-emerald-300">{notif.defaultCountryCode || '92'}3001234567</span>. Numbers already in international form are used as-is.
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {NOTIF_TRIGGERS.map((trigger) => {
            const ev = notif.events[trigger]
            const meta = NOTIF_META[trigger]
            const Icon = meta.icon
            return (
              <div key={trigger} className={`rounded-2xl border p-3.5 transition ${ev.enabled ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : 'border-slate-400/15 bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{meta.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{meta.desc}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ev.enabled}
                    onClick={() => patchEvent(trigger, { enabled: !ev.enabled })}
                    className={`relative shrink-0 w-9 h-5 rounded-full transition ${ev.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${ev.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Mode</span>
                    <select
                      value={ev.mode}
                      onChange={(e) => patchEvent(trigger, { mode: e.target.value as 'template' | 'text' })}
                      className="w-full bg-[#040814] border border-slate-700/70 rounded-lg px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-400 transition"
                    >
                      <option value="text">Free text</option>
                      <option value="template">Template</option>
                    </select>
                  </label>
                  {ev.mode === 'template' ? (
                    <>
                      <label className="block">
                        <span className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Template name</span>
                        <input
                          type="text"
                          value={ev.templateName}
                          onChange={(e) => patchEvent(trigger, { templateName: e.target.value })}
                          placeholder="order_confirmation_v1"
                          className="w-full bg-[#040814] border border-slate-700/70 rounded-lg px-2.5 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition font-mono"
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Language</span>
                        <input
                          type="text"
                          value={ev.templateLang}
                          onChange={(e) => patchEvent(trigger, { templateLang: e.target.value })}
                          placeholder="en_US"
                          className="w-full bg-[#040814] border border-slate-700/70 rounded-lg px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-emerald-400 transition font-mono"
                        />
                      </label>
                      {ev.bodyParams.map((p, i) => (
                        <label key={i} className="block">
                          <span className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Body param {i + 1}</span>
                          <input
                            type="text"
                            value={p}
                            onChange={(e) => patchEvent(trigger, { bodyParams: ev.bodyParams.map((v, j) => (j === i ? e.target.value : v)) })}
                            placeholder={['{{customerName}}', '{{orderNumber}}', 'ETA text'][i] || 'value'}
                            className="w-full bg-[#040814] border border-slate-700/70 rounded-lg px-2.5 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition font-mono"
                          />
                        </label>
                      ))}
                    </>
                  ) : (
                    <label className="block col-span-2">
                      <span className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Message body</span>
                      <textarea
                        value={ev.textTemplate}
                        onChange={(e) => patchEvent(trigger, { textTemplate: e.target.value })}
                        rows={3}
                        placeholder="Hi {{customerName}}, your order {{orderNumber}} …"
                        className="w-full bg-[#040814] border border-slate-700/70 rounded-lg px-2.5 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition"
                      />
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-2.5">
                  <button
                    onClick={() => testNotification(trigger)}
                    disabled={testSending[trigger] || !configured}
                    title={`Send a test “${meta.label}” message to ${sendTo}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-slate-400/20 text-slate-300 text-[10px] font-bold hover:bg-white/10 transition disabled:opacity-40"
                  >
                    <Send className={`w-3 h-3 ${testSending[trigger] ? 'animate-pulse' : ''}`} /> Test
                  </button>
                  <span className={`text-[9.5px] font-bold ${ev.enabled ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {ev.enabled ? 'AUTO-SEND ON' : 'OFF'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 p-2.5 rounded-xl bg-white/[0.03] border border-slate-400/10">
          <div className="text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Available variables — usable in any message, param or template value</div>
          <div className="flex flex-wrap gap-1">
            {PLACEHOLDER_VARS.map((v) => (
              <code key={v} className="px-1.5 py-0.5 rounded bg-[#040814] border border-slate-700/70 text-[9.5px] font-mono text-emerald-300">&#123;&#123;{v}&#125;&#125;</code>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={saveNotifications}
            disabled={notifSaving || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold active:scale-95 transition disabled:opacity-50"
          >
            <Save className={`w-3.5 h-3.5 ${notifSaving ? 'animate-pulse' : ''}`} /> {notifSaving ? 'Saving…' : 'Save notification rules'}
          </button>
          <span className="text-[10px] text-slate-500">Applies to new orders instantly — no redeploy needed.</span>
        </div>
      </div>

      {/* Send message */}
      <div className="pa-card p-4">
        <h3 className="text-sm font-bold text-white mb-1">Send a message</h3>
        <p className="text-[10.5px] text-slate-500 mb-3">
          Templates can be sent anytime; free-text only works inside a 24-hour customer service window.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Recipient</span>
            <input
              type="text"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              placeholder="+923XX#######"
              className="w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition font-mono"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Type</span>
            <select
              value={sendKind}
              onChange={(e) => setSendKind(e.target.value as 'text' | 'template')}
              className="w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 transition"
            >
              <option value="template">Template</option>
              <option value="text">Free text</option>
            </select>
          </label>
          {sendKind === 'template' ? (
            <>
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Template</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={sendTemplate}
                    onChange={(e) => setSendTemplate(e.target.value)}
                    className="flex-1 min-w-0 bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 transition font-mono"
                  />
                  <button
                    onClick={loadTemplates}
                    disabled={templatesLoading || !configured}
                    title="Load approved templates from Meta"
                    className="px-2.5 rounded-xl bg-white/5 border border-slate-400/20 text-slate-300 text-[10px] font-bold hover:bg-white/10 transition disabled:opacity-40"
                  >
                    {templatesLoading ? '…' : 'Load'}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Language</span>
                <input
                  type="text"
                  value={sendLang}
                  onChange={(e) => setSendLang(e.target.value)}
                  className="w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 transition font-mono"
                />
              </label>
              {sendParams.map((p, i) => (
                <label key={i} className="block">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Body param {i + 1}</span>
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => setSendParams((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))}
                    placeholder={['customer name', 'order no.', 'date'][i] || 'value'}
                    className="w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition"
                  />
                </label>
              ))}
            </>
          ) : (
            <label className="block md:col-span-2">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Message body</span>
              <textarea
                value={sendText}
                onChange={(e) => setSendText(e.target.value)}
                rows={3}
                placeholder="What can I help you with today?"
                className="w-full bg-[#040814] border border-slate-700/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition"
              />
            </label>
          )}
        </div>
        {templatesError && <div className="text-[10.5px] text-rose-300 mt-2">{templatesError}</div>}
        {templates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setSendTemplate(t.name)
                  if (t.language) setSendLang(t.language)
                }}
                title={`${t.category} · ${t.language} · ${t.status}`}
                className="px-2 py-1 rounded-lg bg-white/5 border border-slate-400/20 text-[10px] font-mono text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={send}
            disabled={sending || !configured}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold active:scale-95 transition disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${sending ? 'animate-pulse' : ''}`} /> {sending ? 'Sending…' : 'Send via WhatsApp'}
          </button>
        </div>
      </div>

      {/* Recent sends */}
      {data?.recent && data.recent.length > 0 && (
        <div className="pa-card p-4">
          <h3 className="text-sm font-bold text-white mb-2">Recent sends</h3>
          <div className="overflow-hidden rounded-xl border border-slate-400/10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Event / type</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((m, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">{fmtWhen(m.at)}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-200">+{m.to}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-300">
                      {m.trigger ? (
                        <span className="inline-flex items-center gap-1">
                          <BellRing className="w-3 h-3 text-emerald-400" /> {m.trigger}
                        </span>
                      ) : m.kind === 'template' ? (
                        m.templateName
                      ) : (
                        'text'
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-400">{m.orderNumber || '—'}</td>
                    <td className="px-3 py-2 text-[11px]">
                      {m.ok ? (
                        <span className="text-emerald-300 font-semibold">delivered</span>
                      ) : (
                        <span className="text-rose-300" title={m.error || ''}>failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
