import React, { useCallback, useEffect, useState } from 'react'
import {
  CreditCard,
  RefreshCw,
  Save,
  Copy,
  CheckCircle2,
  XCircle,
  Radio,
  Play,
  Trash2,
  ShieldCheck,
  KeyRound,
  Webhook,
  Globe,
  FlaskConical,
  AlertTriangle,
  Undo2,
  Ban,
} from 'lucide-react'

interface GatewayPanelProps {
  onToast: (msg: string) => void
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

async function gwFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}/api/admin/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
      ...(opts.headers || {}),
    },
    credentials: 'include',
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

const statusChip = (on: boolean, onLabel: string, offLabel: string) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
      on
        ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300'
        : 'bg-rose-400/10 border-rose-400/30 text-rose-300'
    }`}
  >
    {on ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {on ? onLabel : offLabel}
  </span>
)

export const GatewayPanel: React.FC<GatewayPanelProps> = ({ onToast }) => {
  const [config, setConfig] = useState<any>(null)
  const [logs, setLogs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // form state — secrets are write-only (placeholder shows "keep current")
  const [secretKey, setSecretKey] = useState('')
  const [webhookSalt, setWebhookSalt] = useState('')
  const [webhookSaltPrev, setWebhookSaltPrev] = useState('')
  const [apiBase, setApiBase] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [methods, setMethods] = useState('')

  const [testResult, setTestResult] = useState<any>(null)

  // refunds state
  const [refunds, setRefunds] = useState<any[]>([])
  const [refundLedger, setRefundLedger] = useState<any[]>([])
  const [refundsMeta, setRefundsMeta] = useState<any>(null)
  const [refundsLoading, setRefundsLoading] = useState(false)
  const [refundOrderNumber, setRefundOrderNumber] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('CUSTOMER_REQUEST')
  const [refundNote, setRefundNote] = useState('')
  const [refundBusy, setRefundBusy] = useState(false)
  const [refundResult, setRefundResult] = useState<any>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [cfgRes, logRes] = await Promise.all([
      gwFetch('gateway-config'),
      gwFetch('gateway-logs'),
    ])
    if (cfgRes.data?.success) {
      setConfig(cfgRes.data)
      setApiBase(cfgRes.data.apiBase || '')
      setMerchantId(cfgRes.data.merchantId || '')
      setMethods((cfgRes.data.methods || []).join(', '))
    }
    if (logRes.data?.success) setLogs(logRes.data)
    setLoading(false)
  }, [])

  const loadRefunds = useCallback(async () => {
    setRefundsLoading(true)
    const res = await gwFetch('gateway-refunds')
    setRefundsLoading(false)
    if (res.data?.success) {
      setRefunds(res.data.refunds || [])
      setRefundLedger(res.data.ledger || [])
      setRefundsMeta({ ok: res.data.ok, error: res.data.error, errorDetail: res.data.errorDetail })
    } else {
      onToast(res.data?.error || 'Could not load refunds.')
    }
  }, [])

  useEffect(() => {
    loadAll()
    loadRefunds()
  }, [loadAll, loadRefunds])

  const save = async (clear: string[] = []) => {
    setSaving(true)
    const body: any = {}
    if (secretKey.trim()) body.secretKey = secretKey.trim()
    if (webhookSalt.trim()) body.webhookSalt = webhookSalt.trim()
    if (webhookSaltPrev.trim()) body.webhookSaltPrev = webhookSaltPrev.trim()
    if (apiBase !== (config?.apiBase || '')) body.apiBase = apiBase
    if (merchantId !== (config?.merchantId || '')) body.merchantId = merchantId.trim()
    if (methods !== (config?.methods || []).join(', ')) body.methods = methods
    if (clear.length) body.clear = clear
    const res = await gwFetch('gateway-config', { method: 'POST', body: JSON.stringify(body) })
    setSaving(false)
    if (res.data?.success) {
      setSecretKey(''); setWebhookSalt(''); setWebhookSaltPrev('')
      onToast(res.data.message || 'Gateway configuration saved.')
      loadAll()
    } else {
      onToast(res.data?.error || 'Save failed.')
    }
  }

  const submitRefund = async () => {
    if (!refundOrderNumber.trim()) {
      onToast('Order number is required.')
      return
    }
    setRefundBusy(true)
    setRefundResult(null)
    const res = await gwFetch('gateway-refund', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: refundOrderNumber.trim(),
        amount: refundAmount.trim() === '' ? undefined : Number(refundAmount),
        reasonCode: refundReason,
        reasonNote: refundNote.trim() || undefined,
      }),
    })
    setRefundBusy(false)
    setRefundResult(res.data || { success: false, error: 'Request failed' })
    if (res.data?.success) {
      onToast(`Refund ${res.data.refund?.refundRef || ''} ${res.data.refund?.status || 'submitted'}`.trim())
      setRefundAmount(''); setRefundNote('')
      loadRefunds()
    } else {
      onToast(res.data?.errorDetail || res.data?.error || 'Refund failed.')
    }
  }

  const cancelRefundByRef = async (refundRef: string) => {
    setRefundBusy(true)
    const res = await gwFetch('gateway-refund-cancel', {
      method: 'POST',
      body: JSON.stringify({ refundRef }),
    })
    setRefundBusy(false)
    if (res.data?.success) {
      onToast(`Refund ${refundRef} cancelled.`)
      loadRefunds()
    } else {
      onToast(res.data?.errorDetail || res.data?.error || 'Cancel failed.')
    }
  }

  const runTest = async (action: string, extra: any = {}) => {
    setBusyAction(action)
    setTestResult(null)
    const res = await gwFetch('gateway-test', {
      method: 'POST',
      body: JSON.stringify({ action, ...extra }),
    })
    setBusyAction(null)
    setTestResult({ action, ...(res.data || {}), httpError: res.ok ? null : res.status })
    if (action === 'test-payment' && res.data?.success) loadAll()
  }

  const resolve = async (orderNumber: string, action: string) => {
    const res = await gwFetch('gateway-resolve', {
      method: 'POST',
      body: JSON.stringify({ orderNumber, action }),
    })
    if (res.data?.success) {
      onToast(res.data.message || 'Done.')
      loadAll()
    } else {
      onToast(res.data?.error || 'Action failed.')
    }
  }

  const copyWebhookUrl = () => {
    if (!config?.webhookUrl) return
    try {
      navigator.clipboard.writeText(config.webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const srcLabel: Record<string, string> = {
    database: 'DB (panel)', environment: 'ENV', none: 'not set',
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-sky-400 inline-block" />
            Payment Gateway — Rapid
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configure credentials, run integration tests and resolve webhook deliveries.
            Secrets are encrypted at rest and never displayed again.
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Secret Key
            </span>
            {statusChip(Boolean(config?.configured?.secretKey), 'CONFIGURED', 'MISSING')}
          </div>
          <p className="text-xs text-zinc-300 font-mono mt-2 truncate">
            {config?.masked?.secretKey || '— not set —'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Source: {srcLabel[config?.sources?.secretKey] || '—'} · charges customers
          </p>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-sky-400" /> Webhook Salt
            </span>
            {statusChip(Boolean(config?.configured?.webhookSalt), 'CONFIGURED', 'MISSING')}
          </div>
          <p className="text-xs text-zinc-300 font-mono mt-2 truncate">
            {config?.masked?.webhookSalt || '— not set —'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">
            Source: {srcLabel[config?.sources?.webhookSalt] || '—'} · verifies deliveries
          </p>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" /> API Base
            </span>
            {statusChip(Boolean(config?.apiBase), 'SET', 'NOT SET')}
          </div>
          <p className="text-xs text-zinc-300 font-mono mt-2 truncate">{config?.apiBase || '—'}</p>
          <p className="text-[10px] text-zinc-500 mt-1">
            methods: {(config?.methods || []).join(' / ') || '—'}
          </p>
        </div>
      </div>

      {/* Webhook URL banner */}
      <div className="rounded-2xl bg-[#0B0F19] border border-sky-400/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-wider text-sky-300/90 mb-1">
            Register this URL in the Rapid portal (Dashboard → Webhooks)
          </p>
          <p className="text-xs text-white font-mono truncate">{config?.webhookUrl || '…'}</p>
        </div>
        <button
          onClick={copyWebhookUrl}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-400/10 border border-sky-400/30 text-sky-300 text-[11px] font-semibold hover:bg-sky-400/20 transition shrink-0"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy URL'}
        </button>
      </div>

      {/* Configuration form */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-teal-400" /> Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Rapid Secret Key {config?.configured?.secretKey && '(leave blank to keep current)'}
            </span>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={config?.masked?.secretKey || 'paste the secret key from the Rapid portal'}
              autoComplete="new-password"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Webhook Signing Salt {config?.configured?.webhookSalt && '(leave blank to keep current)'}
            </span>
            <input
              type="password"
              value={webhookSalt}
              onChange={(e) => setWebhookSalt(e.target.value)}
              placeholder={config?.masked?.webhookSalt || 'salt from the Rapid portal'}
              autoComplete="new-password"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Previous Salt (rotation — optional)
            </span>
            <input
              type="password"
              value={webhookSaltPrev}
              onChange={(e) => setWebhookSaltPrev(e.target.value)}
              placeholder="old salt while rotating"
              autoComplete="new-password"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">API Base URL</span>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.rapidgateway.pk"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Merchant ID {config?.configured?.merchantId && '(refunds OAuth client_id)'}
            </span>
            <input
              type="text"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="e.g. 1367"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Payment Methods (comma-separated)
            </span>
            <input
              type="text"
              value={methods}
              onChange={(e) => setMethods(e.target.value)}
              placeholder="easypaisa, jazzcash, card"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-teal-400/50"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button
            onClick={() => save()}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-400/15 border border-teal-400/40 text-teal-300 text-xs font-bold hover:bg-teal-400/25 transition disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Configuration'}
          </button>
          {config?.configured?.secretKey && (
            <button
              onClick={() => save(['secretKey'])}
              disabled={saving}
              className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/20 transition disabled:opacity-60"
            >
              Clear Secret Key
            </button>
          )}
          {config?.configured?.webhookSalt && (
            <button
              onClick={() => save(['webhookSalt', 'webhookSaltPrev'])}
              disabled={saving}
              className="px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/20 transition disabled:opacity-60"
            >
              Clear Salts
            </button>
          )}
          {config?.updatedAt && (
            <span className="text-[10px] text-zinc-500 font-mono ml-auto">
              last updated {new Date(config.updatedAt).toLocaleString()} · {config.updatedBy}
            </span>
          )}
        </div>
      </div>

      {/* Test console */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <FlaskConical className="w-4 h-4 text-violet-400" /> Integration Tests
        </h3>
        <p className="text-[11px] text-zinc-500 mb-4">
          Safe diagnostics — the test payment creates a clearly-labelled PENDING order
          (PB-GWTEST-*) and never marks anything paid; only a verified webhook can.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runTest('connectivity')}
            disabled={busyAction !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs font-semibold text-zinc-200 hover:bg-[#181d2d] transition disabled:opacity-60"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            {busyAction === 'connectivity' ? 'Checking…' : '1 · Check API Connectivity'}
          </button>
          <button
            onClick={() => runTest('webhook-selftest')}
            disabled={busyAction !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs font-semibold text-zinc-200 hover:bg-[#181d2d] transition disabled:opacity-60"
          >
            <Webhook className="w-3.5 h-3.5 text-sky-400" />
            {busyAction === 'webhook-selftest' ? 'Firing…' : '2 · Fire Signed Test Webhook'}
          </button>
          <button
            onClick={() => runTest('test-payment', { amount: 100 })}
            disabled={busyAction !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs font-semibold text-zinc-200 hover:bg-[#181d2d] transition disabled:opacity-60"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            {busyAction === 'test-payment' ? 'Creating…' : '3 · Create Rs 100 Test Payment'}
          </button>
          <button
            onClick={() => runTest('refunds-token')}
            disabled={busyAction !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs font-semibold text-zinc-200 hover:bg-[#181d2d] transition disabled:opacity-60"
          >
            <Undo2 className="w-3.5 h-3.5 text-orange-400" />
            {busyAction === 'refunds-token' ? 'Checking…' : '4 · Check Refunds API Token'}
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-4 rounded-xl border p-4 font-mono text-[11px] leading-relaxed overflow-x-auto ${
              testResult.ok === false || testResult.httpError
                ? 'bg-rose-500/5 border-rose-500/25 text-rose-200'
                : 'bg-emerald-500/5 border-emerald-500/25 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5 font-bold">
              {testResult.ok === false || testResult.httpError ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {testResult.action} — {testResult.ok === false || testResult.httpError ? 'FAILED' : 'RESULT'}
            </div>
            {testResult.action === 'connectivity' && (
              <p>
                {testResult.reachable
                  ? `API base reachable — HTTP ${testResult.httpStatus} in ${testResult.latencyMs}ms`
                  : `API base UNREACHABLE (${testResult.error}) after ${testResult.latencyMs}ms`}
                {' · '}secret key: {testResult.secretKeyPresent ? 'present' : 'MISSING'}
              </p>
            )}
            {testResult.action === 'webhook-selftest' && (
              <p>
                HTTP {testResult.httpStatus} in {testResult.latencyMs}ms —{' '}
                {testResult.verified
                  ? 'signature VERIFIED by the webhook endpoint (full pipeline OK)'
                  : `NOT verified: ${JSON.stringify(testResult.response || testResult.httpError)}`}
              </p>
            )}
            {testResult.action === 'test-payment' && (
              <>
                <p>
                  Order {testResult.orderNumber || '—'} · Rs {testResult.amount} ·{' '}
                  {testResult.ok
                    ? `checkout session created${testResult.sessionId ? ` (${String(testResult.sessionId).slice(0, 18)}…)` : ''}`
                    : `gateway error: ${testResult.error || 'unknown'}`}
                </p>
                {testResult.checkoutUrl && (
                  <p className="mt-1.5">
                    Hosted checkout:{' '}
                    <a
                      href={testResult.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-amber-300 break-all"
                    >
                      {testResult.checkoutUrl}
                    </a>
                    <span className="text-zinc-400"> — open it to see the real Rapid checkout.</span>
                  </p>
                )}
              </>
            )}
            {testResult.action === 'refunds-token' && (
              <p>
                {testResult.ok
                  ? `Refunds API OAuth token OK in ${testResult.latencyMs}ms (${testResult.tokenMasked})`
                  : `Token request FAILED after ${testResult.latencyMs}ms — ${testResult.error}`}
              </p>
            )}
            {testResult.error && testResult.action !== 'test-payment' && (
              <p className="mt-1">{String(testResult.error)}</p>
            )}
          </div>
        )}
      </div>

      {/* Refunds — create / list / cancel */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Undo2 className="w-4 h-4 text-orange-400" /> Refunds — full &amp; partial
          </h3>
          <button
            onClick={loadRefunds}
            className="text-[10px] font-mono text-zinc-400 hover:text-white transition"
          >
            reload
          </button>
        </div>
        <p className="text-[11px] text-zinc-500 mb-4">
          Refund a completed Rapid payment — leave the amount blank for a full refund, or enter any
          amount up to the remaining balance (repeatable). Refunds at or above your auto-approve
          threshold queue for review (PENDING_APPROVAL) and can be cancelled until approved.
        </p>

        {/* create refund */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Order # (basketId)</span>
            <input
              type="text"
              value={refundOrderNumber}
              onChange={(e) => setRefundOrderNumber(e.target.value)}
              placeholder="PB-XXXXXX-XXX"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-400/50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Amount (blank = full)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="full refund"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-400/50"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Reason</span>
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-orange-400/50"
            >
              <option value="CUSTOMER_REQUEST">Customer request</option>
              <option value="PRODUCT_ISSUE">Product issue</option>
              <option value="SERVICE_ISSUE">Service issue</option>
              <option value="DUPLICATE_CHARGE">Duplicate charge</option>
              <option value="FRAUD_SUSPECTED">Fraud suspected</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Note (optional)</span>
            <input
              type="text"
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              placeholder="e.g. one of two items returned"
              className="mt-1.5 w-full bg-[#121622] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-400/50"
            />
          </label>
        </div>
        <button
          onClick={submitRefund}
          disabled={refundBusy || !refundOrderNumber.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-400/15 border border-orange-400/40 text-orange-300 text-xs font-bold hover:bg-orange-400/25 transition disabled:opacity-60"
        >
          <Undo2 className="w-3.5 h-3.5" /> {refundBusy ? 'Submitting…' : 'Submit Refund'}
        </button>

        {refundResult && (
          <div
            className={`mt-3 rounded-xl border p-4 font-mono text-[11px] leading-relaxed overflow-x-auto ${
              refundResult.success
                ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-200'
                : 'bg-rose-500/5 border-rose-500/25 text-rose-200'
            }`}
          >
            {refundResult.success ? (
              <>
                <p className="font-bold">
                  {refundResult.refund?.refundRef || 'refund accepted'} — {refundResult.refund?.status || 'submitted'}
                  {refundResult.httpStatus === 202 || refundResult.refund?.requiresApproval
                    ? ' (queued for approval)'
                    : refundResult.httpStatus === 201
                    ? ' (auto-approved)'
                    : ''}
                  {refundResult.idempotentReplay ? ' · idempotent replay' : ''}
                </p>
                <p>
                  {refundResult.refund?.refundAmount != null && <>refunded Rs {refundResult.refund.refundAmount} · </>}
                  {refundResult.refund?.remainingRefundableAmount != null &&
                    <>remaining Rs {refundResult.refund.remainingRefundableAmount} · </>}
                  {refundResult.refund?.currency || 'PKR'}
                </p>
              </>
            ) : (
              <p>
                Refund FAILED — {refundResult.error || 'unknown'}
                {refundResult.errorDetail ? ` (${refundResult.errorDetail})` : ''}
              </p>
            )}
          </div>
        )}

        {/* refunds list */}
        <div className="mt-4">
          {refundsMeta && !refundsMeta.ok && (
            <p className="text-[10px] text-amber-300 font-mono mb-2">
              Gateway list unavailable ({refundsMeta.error}) — showing the local ledger below.
              {refundsMeta.error === 'MERCHANT_NOT_ELIGIBLE' &&
                ' Refunds are not enabled on this account yet — contact support@rapidgateway.pk.'}
            </p>
          )}
          {(refunds.length === 0 && refundLedger.length === 0) ? (
            <p className="text-[11px] text-zinc-600 font-mono">No refunds yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/10">
                    <th className="py-2 pr-3">Refund Ref</th>
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Refunded</th>
                    <th className="py-2 pr-3">Remaining</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(refunds.length > 0 ? refunds : refundLedger).map((r: any, i: number) => (
                    <tr key={r.refundRef || i} className="text-[10px] font-mono text-zinc-300 border-b border-white/5">
                      <td className="py-2 pr-3 text-orange-300">{r.refundRef || '—'}</td>
                      <td className="py-2 pr-3">{r.basketId || '—'}</td>
                      <td className="py-2 pr-3">{r.refundAmount != null ? `Rs ${r.refundAmount}` : '—'}</td>
                      <td className="py-2 pr-3">{r.remainingRefundableAmount != null ? `Rs ${r.remainingRefundableAmount}` : '—'}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            r.status === 'SUCCEEDED'
                              ? 'bg-emerald-400/10 text-emerald-300'
                              : r.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-400/10 text-amber-300'
                              : 'bg-rose-400/10 text-rose-300'
                          }`}
                        >
                          {r.status || '—'}
                        </span>
                      </td>
                      <td className="py-2">
                        {r.status === 'PENDING_APPROVAL' && r.refundRef ? (
                          <button
                            onClick={() => cancelRefundByRef(r.refundRef)}
                            disabled={refundBusy}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[9px] font-semibold hover:bg-rose-500/20 transition disabled:opacity-60"
                          >
                            <Ban className="w-3 h-3" /> Cancel
                          </button>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Flagged orders — check & resolve */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-rose-400" /> Flagged Payments — needs review
        </h3>
        <p className="text-[11px] text-zinc-500 mb-3">
          Orders the webhook refused to fulfil (e.g. paid amount ≠ order total). Investigate in the
          Rapid portal, then mark reviewed.
        </p>
        {(logs?.flagged || []).length === 0 ? (
          <p className="text-[11px] text-zinc-600 font-mono">No flagged orders — all clear.</p>
        ) : (
          <div className="space-y-2">
            {logs.flagged.map((o: any) => (
              <div
                key={o.orderNumber}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-rose-500/5 border border-rose-500/20 px-3.5 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-mono font-bold">
                    {o.orderNumber}
                    <span className="ml-2 text-rose-300 font-semibold">{o.paymentFlag}</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {o.customerName} · total Rs {o.totalAmount}
                    {o.paymentFlagDetail?.received != null && (
                      <> · gateway sent Rs {o.paymentFlagDetail.received}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => resolve(o.orderNumber, 'mark-reviewed')}
                  className="px-3 py-2 rounded-lg bg-teal-400/10 border border-teal-400/30 text-teal-300 text-[11px] font-semibold hover:bg-teal-400/20 transition shrink-0"
                >
                  Mark Reviewed
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test orders */}
      {(logs?.testOrders || []).length > 0 && (
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Play className="w-4 h-4 text-amber-400" /> Gateway Test Orders
          </h3>
          <div className="space-y-2">
            {logs.testOrders.map((o: any) => (
              <div
                key={o.orderNumber}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-white/[0.02] border border-white/10 px-3.5 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-mono font-bold">{o.orderNumber}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Rs {o.totalAmount} · {o.status}/{o.paymentStatus}
                    {(o.checkoutUrl || o.rapidSessionId) && ' · checkout created'}
                    {' · '}
                    {new Date(o.createdAt).toLocaleString()}
                  </p>
                </div>
                {o.checkoutUrl && (
                  <a
                    href={o.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-semibold hover:bg-amber-400/20 transition shrink-0"
                  >
                    Open Checkout
                  </a>
                )}
                <button
                  onClick={() => resolve(o.orderNumber, 'delete-test-order')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-semibold hover:bg-rose-500/20 transition shrink-0"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live webhook deliveries */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Webhook className="w-4 h-4 text-sky-400" /> Live Webhook Deliveries
          </h3>
          <button
            onClick={loadAll}
            className="text-[10px] font-mono text-zinc-400 hover:text-white transition"
          >
            reload
          </button>
        </div>
        {(logs?.deliveries || []).length === 0 ? (
          <p className="text-[11px] text-zinc-600 font-mono">
            No deliveries yet — fire a test webhook or wait for the Rapid portal test button.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/10">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Event</th>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Verified</th>
                  <th className="py-2">Action / Result</th>
                </tr>
              </thead>
              <tbody>
                {logs.deliveries.map((d: any, i: number) => (
                  <tr key={d._id || i} className="text-[10px] font-mono text-zinc-300 border-b border-white/5">
                    <td className="py-2 pr-3 whitespace-nowrap text-zinc-500">
                      {d.receivedAt ? new Date(d.receivedAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-3 text-sky-300">{d.eventType || '—'}</td>
                    <td className="py-2 pr-3">{d.orderNumber || d.merchantTransactionId || '—'}</td>
                    <td className="py-2 pr-3">
                      {d.amount != null ? `Rs ${d.amount}` : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {d.verified ? (
                        <span className="text-emerald-400">yes{d.verifiedVia?.includes('previous') ? ' (prev salt)' : ''}</span>
                      ) : (
                        <span className="text-rose-400">NO ({d.rejectReason || 'rejected'})</span>
                      )}
                    </td>
                    <td className="py-2">
                      {d.action === 'order_updated'
                        ? `order → ${d.appliedPaymentStatus}/${d.appliedOrderStatus}`
                        : d.action || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
