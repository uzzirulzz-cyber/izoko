// OpsPanels — Section 4 admin panels: Coupon Codes, Inventory, Reviews
// Moderation, Homepage Builder and the Audit Log feed. All panels talk to the
// consolidated /api/admin router with permission-gated endpoints; every panel
// degrades to an honest error message on 401/403 (server is the authority).

import React, { useEffect, useState, useCallback } from 'react'
import {
  Tag, Boxes, Star, LayoutTemplate, ScrollText, Plus, Trash2, RefreshCw,
  Loader2, ShieldAlert, Check, X, ArrowUp, ArrowDown, Pencil, Save,
} from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

function adminFetch(path: string, opts: any = {}) {
  const token = localStorage.getItem('playbeat_admin_token')
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    credentials: 'include',
  })
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-[#070D22] border border-slate-400/15 ${className}`}>{children}</div>
)

const PanelShell: React.FC<{
  icon: React.ReactNode
  tone: string
  title: string
  desc: string
  children: React.ReactNode
  onRefresh?: () => void
  actions?: React.ReactNode
}> = ({ icon, tone, title, desc, children, onRefresh, actions }) => (
  <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>{icon}</div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onRefresh && (
          <button onClick={onRefresh} className="px-3 py-2 rounded-xl border border-slate-400/20 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        )}
      </div>
    </div>
    {children}
  </div>
)

const Denied: React.FC<{ msg: string }> = ({ msg }) => (
  <Card className="p-6 flex items-center gap-3">
    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
    <p className="text-sm text-slate-300">{msg}</p>
  </Card>
)

// ===========================================================================
// COUPON CODES — CRUD (GET/POST /api/admin/coupons, POST …/delete)
// ===========================================================================
export const CouponCodesPanel: React.FC<{ onToast?: (m: string) => void }> = ({ onToast }) => {
  const [coupons, setCoupons] = useState<any[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setError('')
    adminFetch('/api/admin/coupons')
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (r.status === 401 || r.status === 403) { setError(d?.error || 'Not authorized'); setCoupons([]); return }
        if (r.ok && d?.success) setCoupons(d.coupons)
        else { setError(d?.error || 'Failed to load coupons'); setCoupons([]) }
      })
      .catch(() => { setError('Network error'); setCoupons([]) })
  }, [])
  useEffect(load, [load])

  const blank = { code: '', type: 'percent', value: 10, minSubtotal: 0, usageLimit: '', expiresAt: '', description: '', active: true, categories: '', productIds: '' }
  const openCreate = () => { setEditing({}); setForm({ ...blank }) }
  const openEdit = (c: any) => {
    setEditing(c)
    setForm({
      ...blank,
      code: c.code, type: c.type, value: c.value, minSubtotal: c.minSubtotal,
      usageLimit: c.usageLimit ?? '', expiresAt: c.expiresAt ? String(c.expiresAt).slice(0, 10) : '',
      description: c.description || '', active: c.active,
      categories: (c.appliesTo?.categories || []).join(', '),
      productIds: (c.appliesTo?.productIds || []).join(', '),
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload: any = {
        code: form.code, type: form.type, value: Number(form.value), minSubtotal: Number(form.minSubtotal) || 0,
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        expiresAt: form.expiresAt || null, description: form.description, active: form.active,
        appliesTo: {
          categories: String(form.categories || '').split(',').map((s: string) => s.trim()).filter(Boolean),
          productIds: String(form.productIds || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        },
      }
      const r = await adminFetch('/api/admin/coupons', { method: 'POST', body: JSON.stringify(payload) })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.success) { onToast?.(d.message || 'Saved'); setEditing(null); load() }
      else onToast?.(d?.error || `Save failed (${r.status})`)
    } finally { setSaving(false) }
  }

  const remove = async (code: string) => {
    if (!window.confirm(`Delete coupon ${code}?`)) return
    const r = await adminFetch('/api/admin/coupons/delete', { method: 'POST', body: JSON.stringify({ code }) })
    const d = await r.json().catch(() => null)
    if (r.ok && d?.success) { onToast?.(`Coupon ${code} deleted`); load() }
    else onToast?.(d?.error || 'Delete failed')
  }

  if (coupons === null) return <Card className="p-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading coupons…</Card>
  if (error) return <Denied msg={error} />

  return (
    <PanelShell icon={<Tag className="w-5 h-5 text-rose-300" />} tone="bg-rose-500/15" title="Coupon Codes"
      desc="Server-validated promo codes — percentage or fixed, scoped to categories or products, with usage caps and expiry."
      onRefresh={load}
      actions={<button onClick={openCreate} className="pa-btn-gold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Coupon</button>}>
      <div className="grid gap-3">
        {editing !== null && (
          <Card className="p-5 space-y-3 border-yellow-400/30">
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-xs text-slate-300">Code
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={editing?.code}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm uppercase disabled:opacity-50 focus:outline-none focus:border-yellow-400/50" placeholder="SUMMER20" /></label>
              <label className="text-xs text-slate-300">Type
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50">
                  <option value="percent">Percent (%)</option><option value="fixed">Fixed (PKR)</option>
                </select></label>
              <label className="text-xs text-slate-300">Value ({form.type === 'percent' ? '%' : 'PKR'})
                <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
              <label className="text-xs text-slate-300">Min Subtotal (PKR)
                <input type="number" value={form.minSubtotal} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
              <label className="text-xs text-slate-300">Usage Limit (blank = ∞)
                <input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
              <label className="text-xs text-slate-300">Expires (blank = never)
                <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
              <label className="text-xs text-slate-300 sm:col-span-3">Applies to categories (comma-separated, blank = all)
                <input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" placeholder="Gift Cards, Gaming" /></label>
              <label className="text-xs text-slate-300 sm:col-span-3">Applies to product IDs / SKUs (comma-separated, blank = all)
                <input value={form.productIds} onChange={(e) => setForm({ ...form, productIds: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
              <label className="text-xs text-slate-300 sm:col-span-3">Description
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
              </label>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border border-slate-400/20 text-xs text-slate-300 hover:text-white">Cancel</button>
                <button onClick={save} disabled={saving} className="pa-btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Coupon
                </button>
              </div>
            </div>
          </Card>
        )}

        {coupons.length === 0 && <Card className="p-6 text-sm text-slate-400">No coupon codes yet — create the first one.</Card>}
        {coupons.map((c) => (
          <Card key={c.code} className={`p-4 flex flex-wrap items-center justify-between gap-3 ${c.active ? '' : 'opacity-60'}`}>
            <div className="min-w-[200px]">
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-bold text-yellow-300">{c.code}</code>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-slate-500/15 text-slate-400 border-slate-400/30'}`}>
                  {c.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {c.type === 'percent' ? `${c.value}% off` : `Rs ${c.value.toLocaleString()} off`}
                {c.minSubtotal > 0 && ` · min Rs ${c.minSubtotal.toLocaleString()}`}
                {c.usageLimit != null && ` · ${c.usedCount}/${c.usageLimit} used`}
                {c.expiresAt && ` · expires ${String(c.expiresAt).slice(0, 10)}`}
                {(c.appliesTo?.categories?.length || c.appliesTo?.productIds?.length) && ' · scoped'}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="p-2 rounded-lg border border-slate-400/20 text-slate-300 hover:text-yellow-300 transition" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(c.code)} className="p-2 rounded-lg border border-slate-400/20 text-slate-300 hover:text-rose-400 transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </Card>
        ))}
      </div>
    </PanelShell>
  )
}

// ===========================================================================
// INVENTORY — stock modes, thresholds, adjustments + movement history
// ===========================================================================
export const InventoryPanel: React.FC<{ onToast?: (m: string) => void }> = ({ onToast }) => {
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [adjusting, setAdjusting] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    setError('')
    adminFetch('/api/admin/inventory')
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (r.status === 401 || r.status === 403) { setError(d?.error || 'Not authorized'); setData({ items: [] }); return }
        if (r.ok && d?.success) setData(d)
        else { setError(d?.error || 'Failed to load inventory'); setData({ items: [] }) }
      })
      .catch(() => { setError('Network error'); setData({ items: [] }) })
  }, [])
  useEffect(load, [load])

  const adjust = async (item: any, mode: 'add' | 'set') => {
    const raw = adjusting[item.id]
    if (raw === undefined || raw === '') return
    const r = await adminFetch('/api/admin/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ productId: item.id, mode, amount: Number(raw), reason: 'admin panel' }),
    })
    const d = await r.json().catch(() => null)
    if (r.ok && d?.success) { onToast?.(`Stock updated → ${d.stock ?? '∞'}`); setAdjusting({ ...adjusting, [item.id]: '' }); load() }
    else onToast?.(d?.error || 'Adjust failed')
  }

  if (data === null) return <Card className="p-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading inventory…</Card>
  if (error) return <Denied msg={error} />

  const items = (data.items || []).filter((i: any) =>
    !filter || `${i.name} ${i.sku} ${i.slug}`.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <PanelShell icon={<Boxes className="w-5 h-5 text-teal-300" />} tone="bg-teal-500/15" title="Inventory"
      desc="Unlimited mode for digital products, finite stock with low-stock thresholds, and a full movement history."
      onRefresh={load}
      actions={<input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search…" className="px-3 py-2 rounded-xl bg-[#040816] border border-slate-400/20 text-xs text-white w-44 focus:outline-none focus:border-teal-400/50" />}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Finite-tracked', value: data.summary.finite, tone: 'text-sky-300' },
          { label: 'Unlimited (digital)', value: data.summary.unlimited, tone: 'text-emerald-300' },
          { label: 'Low stock', value: data.summary.lowStock, tone: 'text-amber-300' },
          { label: 'Out of stock', value: data.summary.outOfStock, tone: 'text-rose-300' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`text-2xl font-extrabold font-mono ${s.tone}`}>{s.value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0A122E] sticky top-0">
              <tr className="text-slate-400 text-left">
                <th className="px-4 py-2.5 font-semibold">Product</th>
                <th className="px-3 py-2.5 font-semibold">Mode</th>
                <th className="px-3 py-2.5 font-semibold">Stock</th>
                <th className="px-3 py-2.5 font-semibold">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i: any) => (
                <tr key={i.id} className="border-t border-slate-400/10">
                  <td className="px-4 py-2.5">
                    <div className="text-white font-medium">{i.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{i.sku} · {i.category}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${i.stockMode === 'unlimited' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-sky-500/15 text-sky-300 border-sky-400/30'}`}>
                      {i.stockMode === 'unlimited' ? 'Unlimited' : 'Finite'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {i.stockMode === 'unlimited' ? (
                      <span className="text-emerald-300 font-mono">∞</span>
                    ) : (
                      <span className={`font-mono font-bold ${i.outOfStock ? 'text-rose-400' : i.lowStock ? 'text-amber-300' : 'text-slate-200'}`}>
                        {i.stock}{i.lowStock ? ` ⚠ (≤${i.lowStockThreshold})` : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {i.stockMode === 'finite' && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" value={adjusting[i.id] ?? ''} onChange={(e) => setAdjusting({ ...adjusting, [i.id]: e.target.value })}
                          placeholder="±qty" className="w-20 px-2 py-1 rounded-lg bg-[#040816] border border-slate-400/20 text-white focus:outline-none focus:border-teal-400/50" />
                        <button onClick={() => adjust(i, 'add')} className="px-2 py-1 rounded-lg border border-slate-400/20 text-[10px] text-slate-300 hover:text-teal-300">±</button>
                        <button onClick={() => adjust(i, 'set')} className="px-2 py-1 rounded-lg border border-slate-400/20 text-[10px] text-slate-300 hover:text-teal-300">Set</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3">Recent Stock Movements</h4>
        {(data.movements || []).length === 0 ? (
          <p className="text-xs text-slate-500">No movements recorded yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data.movements.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-400/10 pb-1.5">
                <span><span className={m.delta >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>{m.delta >= 0 ? `+${m.delta}` : m.delta}</span> {m.productName}</span>
                <span className="font-mono text-slate-500">{m.reason} · {m.actor} · {new Date(m.at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PanelShell>
  )
}

// ===========================================================================
// REVIEWS MODERATION — approve / hide / feature / delete
// ===========================================================================
export const ReviewsModerationPanel: React.FC<{ onToast?: (m: string) => void }> = ({ onToast }) => {
  const [data, setData] = useState<any | null>(null)
  const [status, setStatus] = useState('pending')
  const [error, setError] = useState('')

  const load = useCallback((s = status) => {
    setError('')
    adminFetch(`/api/admin/reviews?status=${s}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (r.status === 401 || r.status === 403) { setError(d?.error || 'Not authorized'); setData({ reviews: [] }); return }
        if (r.ok && d?.success) setData(d)
        else { setError(d?.error || 'Failed to load reviews'); setData({ reviews: [] }) }
      })
      .catch(() => { setError('Network error'); setData({ reviews: [] }) })
  }, [status])
  useEffect(() => { load(status) /* eslint-disable-line react-hooks/exhaustive-deps */, [status] }, [status])

  const moderate = async (id: string, action: string) => {
    const r = await adminFetch('/api/admin/reviews/update', { method: 'POST', body: JSON.stringify({ id, action }) })
    const d = await r.json().catch(() => null)
    if (r.ok && d?.success) { onToast?.(d.message || `Review ${action}d`); load() }
    else onToast?.(d?.error || `${action} failed`)
  }

  if (data === null) return <Card className="p-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading reviews…</Card>
  if (error) return <Denied msg={error} />

  return (
    <PanelShell icon={<Star className="w-5 h-5 text-amber-300" />} tone="bg-amber-500/15" title="Reviews Moderation"
      desc="Only verified purchasers can submit reviews (server-enforced). Approve, feature or hide before they appear on the storefront."
      onRefresh={() => load()}>
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'hidden', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${status === s ? 'pa-nav-item--active-gold' : 'pa-nav-item'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}{s === 'pending' && data?.counts?.pending ? ` (${data.counts.pending})` : ''}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {(data.reviews || []).length === 0 && <Card className="p-6 text-sm text-slate-400">No reviews in this bucket.</Card>}
        {(data.reviews || []).map((r: any) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[240px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{r.userName}</span>
                  <span className="flex text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-current' : ''}`} />)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : r.status === 'hidden' ? 'bg-slate-500/15 text-slate-400 border-slate-400/30' : 'bg-amber-500/15 text-amber-300 border-amber-400/30'}`}>{r.status}</span>
                  {r.featured && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-slate-950">FEATURED</span>}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">{r.productSlug || r.productId} · order {r.orderNumber} · {new Date(r.createdAt).toLocaleDateString()}</div>
                {r.title && <div className="text-xs font-semibold text-slate-200 mt-1.5">{r.title}</div>}
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">"{r.body}"</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {r.status !== 'approved' && <button onClick={() => moderate(r.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/25 transition">Approve</button>}
                {r.status !== 'hidden' && <button onClick={() => moderate(r.id, 'hide')} className="px-3 py-1.5 rounded-lg border border-slate-400/25 text-slate-300 text-[11px] hover:text-white transition">Hide</button>}
                {!r.featured ? <button onClick={() => moderate(r.id, 'feature')} className="px-3 py-1.5 rounded-lg bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 text-[11px] font-bold hover:bg-yellow-400/25 transition">Feature</button>
                  : <button onClick={() => moderate(r.id, 'unfeature')} className="px-3 py-1.5 rounded-lg border border-yellow-400/30 text-yellow-300 text-[11px] transition">Unfeature</button>}
                <button onClick={() => moderate(r.id, 'delete')} className="p-1.5 rounded-lg border border-slate-400/25 text-slate-400 hover:text-rose-400 transition" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PanelShell>
  )
}

// ===========================================================================
// HOMEPAGE BUILDER — hero/banner/featured/FAQ/testimonial sections
// ===========================================================================
const SECTION_TYPES = ['banner', 'faq', 'testimonial', 'featured', 'hero'] as const

export const HomepageBuilderPanel: React.FC<{ onToast?: (m: string) => void }> = ({ onToast }) => {
  const [sections, setSections] = useState<any[] | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setError('')
    adminFetch('/api/admin/cms/homepage')
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (r.status === 401 || r.status === 403) { setError(d?.error || 'Not authorized'); setSections([]); return }
        if (r.ok && d?.success) setSections(d.sections)
        else { setError(d?.error || 'Failed to load sections'); setSections([]) }
      })
      .catch(() => { setError('Network error'); setSections([]) })
  }, [])
  useEffect(load, [load])

  const save = async () => {
    setSaving(true)
    try {
      const payload: any = {
        type: form.type, title: form.title, subtitle: form.subtitle, body: form.body,
        badge: form.badge, link: form.link, linkLabel: form.linkLabel, enabled: true,
        items: (form.itemsText || '')
          .split('\n')
          .map((l: string) => l.trim())
          .filter(Boolean)
          .map((l: string) => {
            // format: Title | Body | Author | Rating  (author/rating optional)
            const [title, body, author, rating] = l.split('|').map((s) => s.trim())
            return { title, body: body || title, author, rating: rating ? Number(rating) : undefined }
          }),
      }
      const url = form.id ? '/api/admin/cms/homepage/update' : '/api/admin/cms/homepage'
      if (form.id) payload.id = form.id
      const r = await adminFetch(url, { method: 'POST', body: JSON.stringify(payload) })
      const d = await r.json().catch(() => null)
      if (r.ok && d?.success) { onToast?.(d.message || 'Saved'); setForm(null); load() }
      else onToast?.(d?.error || `Save failed (${r.status})`)
    } finally { setSaving(false) }
  }

  const mutate = async (url: string, body: any, msg: string) => {
    const r = await adminFetch(url, { method: 'POST', body: JSON.stringify(body) })
    const d = await r.json().catch(() => null)
    if (r.ok && d?.success) { onToast?.(msg); load() }
    else onToast?.(d?.error || 'Action failed')
  }

  const move = async (id: string, dir: -1 | 1) => {
    const ids = (sections || []).map((s) => s.id)
    const idx = ids.indexOf(id)
    const to = idx + dir
    if (to < 0 || to >= ids.length) return
    ;[ids[idx], ids[to]] = [ids[to], ids[idx]]
    await mutate('/api/admin/cms/homepage/reorder', { ids }, 'Sections reordered')
  }

  if (sections === null) return <Card className="p-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading sections…</Card>
  if (error) return <Denied msg={error} />

  return (
    <PanelShell icon={<LayoutTemplate className="w-5 h-5 text-violet-300" />} tone="bg-violet-500/15" title="Homepage Builder"
      desc="Create, enable/disable and reorder hero, banner, featured, FAQ and testimonial sections — live on the storefront, no redeploy."
      onRefresh={load}
      actions={<button onClick={() => setForm({ type: 'banner', title: '', subtitle: '', body: '', badge: '', link: '', linkLabel: '', itemsText: '' })} className="pa-btn-gold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New Section</button>}>
      {form !== null && (
        <Card className="p-5 space-y-3 border-yellow-400/30">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs text-slate-300">Type
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50">
                {SECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select></label>
            <label className="text-xs text-slate-300 sm:col-span-2">Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
            <label className="text-xs text-slate-300 sm:col-span-3">Subtitle
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
            {form.type === 'banner' && <>
              <label className="text-xs text-slate-300">Badge
                <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
              <label className="text-xs text-slate-300">Link URL
                <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
              <label className="text-xs text-slate-300">Link Label
                <input value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm focus:outline-none focus:border-yellow-400/50" /></label>
            </>}
            {['faq', 'testimonial', 'featured'].includes(form.type) && (
              <label className="text-xs text-slate-300 sm:col-span-3">
                Items — one per line: Title | Body | Author | Rating(1-5)
                <textarea rows={4} value={form.itemsText} onChange={(e) => setForm({ ...form, itemsText: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-[#040816] border border-slate-400/20 text-white text-sm font-mono focus:outline-none focus:border-yellow-400/50"
                  placeholder={'Delivery in 15 seconds | Keys arrive instantly by email | Ali R. | 5\nGreat support | WhatsApp replies within minutes | Sana K. | 5'} /></label>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-xl border border-slate-400/20 text-xs text-slate-300 hover:text-white">Cancel</button>
            <button onClick={save} disabled={saving} className="pa-btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {form.id ? 'Update' : 'Create'} Section
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-3">
        {(sections || []).length === 0 && (
          <Card className="p-6 text-sm text-slate-400">No sections yet — the storefront renders its built-in layout until you add one.</Card>
        )}
        {(sections || []).map((s, idx) => (
          <Card key={s.id} className={`p-4 flex flex-wrap items-center justify-between gap-3 ${s.enabled === false ? 'opacity-60' : ''}`}>
            <div className="min-w-[220px]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-400/30 text-[10px] font-mono font-bold uppercase">{s.type}</span>
                <span className="text-sm font-bold text-white">{s.title || '(untitled)'}</span>
                <span className="text-[10px] font-mono text-slate-500">#{s.order}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.enabled !== false ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-slate-500/15 text-slate-400 border-slate-400/30'}`}>
                  {s.enabled !== false ? 'Live' : 'Off'}
                </span>
              </div>
              {s.subtitle && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{s.subtitle}</div>}
              {Array.isArray(s.items) && s.items.length > 0 && <div className="text-[10px] text-slate-500 mt-0.5">{s.items.length} item(s)</div>}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => move(s.id, -1)} disabled={idx === 0} className="p-2 rounded-lg border border-slate-400/20 text-slate-300 hover:text-white disabled:opacity-30" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => move(s.id, 1)} disabled={idx === (sections?.length || 0) - 1} className="p-2 rounded-lg border border-slate-400/20 text-slate-300 hover:text-white disabled:opacity-30" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button
                onClick={() => mutate('/api/admin/cms/homepage/update', { id: s.id, enabled: s.enabled === false }, s.enabled === false ? 'Section enabled' : 'Section disabled')}
                className="p-2 rounded-lg border border-slate-400/20 text-slate-300 hover:text-emerald-300" title={s.enabled !== false ? 'Disable' : 'Enable'}>
                {s.enabled !== false ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setForm({
                id: s.id, type: s.type, title: s.title || '', subtitle: s.subtitle || '', body: s.body || '', badge: s.badge || '',
                link: s.link || '', linkLabel: s.linkLabel || '',
                itemsText: (s.items || []).map((i: any) => [i.title, i.body, i.author, i.rating].filter((x: any) => x != null && x !== '').join(' | ')).join('\n'),
              })} className="p-2 rounded-lg border border-slate-400/20 text-slate-300 hover:text-yellow-300" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
              <button
                onClick={() => { if (window.confirm('Delete this section?')) mutate('/api/admin/cms/homepage/delete', { id: s.id }, 'Section deleted') }}
                className="p-2 rounded-lg border border-slate-400/20 text-slate-300 hover:text-rose-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </Card>
        ))}
      </div>
    </PanelShell>
  )
}

// ===========================================================================
// AUDIT LOG — append-only feed of every admin mutation
// ===========================================================================
export const AuditLogPanel: React.FC = () => {
  const [data, setData] = useState<any[] | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setError('')
    adminFetch(`/api/admin/audit-logs?limit=150${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ''}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (r.status === 401 || r.status === 403) { setError(d?.error || 'Not authorized'); setData([]); return }
        if (r.ok && d?.success) setData(d.entries)
        else { setError(d?.error || 'Failed to load audit log'); setData([]) }
      })
      .catch(() => { setError('Network error'); setData([]) })
  }, [actionFilter])
  useEffect(load, [load])

  if (data === null) return <Card className="p-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading audit log…</Card>
  if (error) return <Denied msg={error} />

  return (
    <PanelShell icon={<ScrollText className="w-5 h-5 text-cyan-300" />} tone="bg-cyan-500/15" title="Audit Log"
      desc="Append-only record of every admin change: orders, products, permissions, coupons, CMS, reviews and inventory."
      onRefresh={load}
      actions={<input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="Filter by action…" className="px-3 py-2 rounded-xl bg-[#040816] border border-slate-400/20 text-xs text-white w-44 focus:outline-none focus:border-cyan-400/50" />}>
      <Card className="p-4">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500">No audit entries yet — they appear as soon as admins make changes.</p>
        ) : (
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {data.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] py-1.5 border-b border-slate-400/10">
                <span className="font-mono text-cyan-300 font-bold min-w-[130px]">{e.action}</span>
                <span className="text-slate-300 min-w-[180px]">{e.actorName || e.actorEmail}</span>
                <span className="text-slate-400 flex-1 min-w-[200px]">{e.detail}</span>
                <span className="text-slate-500 font-mono">{new Date(e.at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PanelShell>
  )
}
