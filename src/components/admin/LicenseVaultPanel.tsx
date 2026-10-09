import React, { useEffect, useState } from 'react'
import { Product } from '../../types'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
export function LicenseVaultPanel({ products, onToast }: { products: Product[]; onToast: (message: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [productId, setProductId] = useState('')
  const [variant, setVariant] = useState('')
  const [keys, setKeys] = useState('')
  const digital = products.filter(p => p.digital !== false && p.productType !== 'physical')
  const selected = digital.find(p => String(p._id || p.id) === productId)
  const request = async (route: string, body?: any) => {
    const response = await fetch(`${API_BASE}/api/admin/licenses${route}`, {
      method: body ? 'POST' : 'GET', credentials: 'include',
      headers: { Authorization: `Bearer ${localStorage.getItem('playbeat_admin_token') || ''}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || 'License inventory could not be loaded.')
    return result
  }
  const load = async () => {
    try { setData(await request('')); setError('') } catch (err: any) { setError(err.message) }
  }
  useEffect(() => { void load() }, [])
  const importKeys = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await request('/import', { productId, variantName: variant, keys })
      setKeys(''); onToast(`${result.imported} supplier keys saved; ${result.duplicates} duplicates skipped.`); await load()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  const assign = async (orderNumber: string) => {
    setBusy(true)
    try {
      const result = await request('/assign', { orderNumber })
      onToast(`${result.assigned} keys assigned; ${result.missing} units still awaiting supplier delivery.`); await load()
    } catch (err: any) { setError(err.message) } finally { setBusy(false) }
  }
  const field = 'w-full p-3 rounded-xl bg-[#07090E] border border-white/10 text-white text-sm'
  return <div className="space-y-5">
    <div className="flex justify-between gap-3"><div><h2 className="text-lg font-bold text-white">Digital License Vault</h2><p className="text-xs text-zinc-400 mt-1">Import supplier keys for the exact product and variant. Supplier validity must be checked before import.</p></div><button className="pa-btn px-3 py-2" onClick={load} disabled={busy}>Refresh</button></div>
    {error && <div role="alert" className="p-3 rounded-xl border border-rose-400/30 text-rose-300">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="pa-card p-4"><div className="text-xs text-zinc-400">Available supplier keys</div><div className="text-2xl text-white">{data ? data.pools.reduce((sum: number, p: any) => sum + p.available, 0) : '—'}</div></div>
      <div className="pa-card p-4"><div className="text-xs text-zinc-400">Assigned supplier keys</div><div className="text-2xl text-white">{data ? data.pools.reduce((sum: number, p: any) => sum + p.assigned, 0) : '—'}</div></div>
    </div>
    <form onSubmit={importKeys} className="pa-card p-5 space-y-3">
      <h3 className="font-bold text-white">Import supplier keys</h3>
      <label className="block text-xs text-zinc-300">Product<select required className={field} value={productId} onChange={e => { setProductId(e.target.value); setVariant('') }}><option value="">Choose a product</option>{digital.map(p => <option key={p.id} value={String(p._id || p.id)}>{p.name}</option>)}</select></label>
      {!!selected?.variants?.length && <label className="block text-xs text-zinc-300">Variant<select required className={field} value={variant} onChange={e => setVariant(e.target.value)}><option value="">Choose a variant</option>{selected.variants.map(v => <option key={v.id || v.name} value={v.name}>{v.name}</option>)}</select></label>}
      <label className="block text-xs text-zinc-300">Supplier keys, one per line<textarea required rows={5} autoComplete="off" spellCheck={false} className={field} value={keys} onChange={e => setKeys(e.target.value)} /></label>
      <button disabled={busy || !productId} className="pa-btn-gold px-4 py-2 rounded-xl disabled:opacity-50">{busy ? 'Saving…' : 'Save Supplier Keys'}</button>
    </form>
    <div className="pa-card p-5 space-y-3"><h3 className="font-bold text-white">Inventory by product</h3>{!data ? <p className="text-zinc-400">Loading inventory…</p> : data.pools.length ? data.pools.map((p: any) => <div key={`${p.productId}:${p.variantName}`} className="flex justify-between gap-3 text-sm text-zinc-300"><span>{p.productName}{p.variantName ? ` · ${p.variantName}` : ''}</span><span>{p.available} available · {p.assigned} assigned</span></div>) : <p className="text-sm text-zinc-400">No supplier keys imported yet.</p>}</div>
    <div className="pa-card p-5 space-y-3"><h3 className="font-bold text-white">Paid orders awaiting supplier delivery</h3><p className="text-xs text-zinc-400">Assignments appear in the customer’s account. Importing or assigning keys does not send a broadcast.</p>{data?.pending.length ? data.pending.map((o: any) => <div key={o.orderNumber} className="flex justify-between gap-3 text-sm text-zinc-300"><span>{o.orderNumber} · {o.customerName}</span><button className="pa-btn px-3 py-1" disabled={busy} onClick={() => assign(o.orderNumber)}>Assign Available Keys</button></div>) : data && <p className="text-sm text-zinc-400">No paid orders in the supplier delivery queue.</p>}</div>
  </div>
}
