import React, { useState } from 'react'
import {
  ScrollText,
  Search,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Download,
  Users,
  Mail,
} from 'lucide-react'

interface OrdersLogPanelProps {
  onToast: (msg: string) => void
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  pending: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  processing: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
  cancelled: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
}

export const OrdersLogPanel: React.FC<OrdersLogPanelProps> = ({ onToast }) => {
  const [orders, setOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCustomers, setShowCustomers] = useState(true)
  const [initialLoaded, setInitialLoaded] = useState(false)

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
  const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

  const fetchLog = React.useCallback(
    async (p = page, s = status, q = appliedSearch) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(p), limit: '20', status: s })
        if (q) params.set('search', q)
        const res = await fetch(`${API_BASE}/api/admin/orders-log?${params.toString()}`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (data?.success) {
          setOrders(data.orders || [])
          setCustomers(data.customers || [])
          setTotal(data.total || 0)
          setPage(data.page || p)
          setTotalPages(data.totalPages || 1)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
        setInitialLoaded(true)
      }
    },
    [API_BASE, page, status, appliedSearch]
  )

  React.useEffect(() => {
    fetchLog(1, status, appliedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = (newStatus: string) => {
    setStatus(newStatus)
    fetchLog(1, newStatus, appliedSearch)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedSearch(search.trim())
    fetchLog(1, status, search.trim())
  }

  const exportCsv = () => {
    const rows = [
      ['Order #', 'Date', 'Customer', 'Email', 'Items', 'Total', 'Currency', 'Status', 'Payment'],
      ...orders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.customerName,
        o.customerEmail,
        (o.items || []).map((i: any) => `${i.quantity}x ${i.name}`).join(' | '),
        o.totalAmount,
        o.currency,
        o.status,
        o.paymentMethod,
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `playbeat_orders_log_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    onToast('Order log exported to CSV.')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-amber-400 inline-block" />
            Customer Orders Log
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Every order ever placed, with delivered license keys, per-customer lifetime value, and CSV export.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportCsv}
            disabled={orders.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
          </button>
          <button
            onClick={() => fetchLog(page, status, appliedSearch)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, email, payment…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#121622] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 transition"
          />
        </form>
        <div className="flex items-center bg-[#121622] border border-white/10 rounded-xl p-1 gap-1 overflow-x-auto">
          {['all', 'completed', 'pending', 'processing', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition whitespace-nowrap ${
                status === s ? 'bg-amber-400 text-black font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono text-zinc-500 px-1">{total} orders</span>
      </div>

      {/* Customer summary strip */}
      <button
        onClick={() => setShowCustomers(!showCustomers)}
        className="w-full flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold hover:text-white transition"
      >
        {showCustomers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <Users className="w-3.5 h-3.5 text-teal-400" /> Customer Lifetime Summary ({customers.length})
      </button>
      {showCustomers && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {customers.length === 0 ? (
            <div className="col-span-full text-[11px] text-zinc-500 font-mono text-center py-3">
              No customer orders recorded yet
            </div>
          ) : (
            customers.slice(0, 8).map((c) => (
              <div key={c.email} className="rounded-xl bg-[#0B0F19] border border-white/5 p-3.5 space-y-1">
                <div className="text-xs font-bold text-white truncate">{c.name || c.email}</div>
                <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" /> {c.email}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-zinc-400">{c.orderCount} orders</span>
                  <span className="text-[11px] font-bold text-emerald-300 font-mono">
                    Rs {Number(c.lifetimeValue || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Orders table */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
        {loading && !initialLoaded ? (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading order log…
          </div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-zinc-500">
            {appliedSearch || status !== 'all'
              ? 'No orders match the current filters.'
              : 'No orders have been placed yet.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {orders.map((o) => (
              <div key={o.id} className="hover:bg-white/[0.02] transition">
                <button
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {expanded === o.id ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white font-mono">{o.orderNumber}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${
                            STATUS_STYLES[o.status] || 'bg-zinc-500/15 border-zinc-500/30 text-zinc-300'
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                        {o.customerName} · {o.customerEmail}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:block text-right">
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-zinc-400">{o.paymentMethod}</div>
                    </div>
                    <div className="text-sm font-black text-amber-300 font-mono">
                      {o.currency === 'PKR' ? 'Rs' : o.currency} {Number(o.totalAmount).toLocaleString()}
                    </div>
                  </div>
                </button>

                {expanded === o.id && (
                  <div className="px-5 pb-4 pl-12 space-y-2.5">
                    {(o.items || []).map((i: any, idx: number) => (
                      <div key={idx} className="rounded-xl bg-black/20 border border-white/5 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-white">
                            {i.quantity}× {i.name}
                            {i.variantName && (
                              <span className="text-amber-300/90 font-mono"> · {i.variantName}</span>
                            )}
                          </span>
                          <span className="text-[11px] text-zinc-300 font-mono shrink-0">
                            Rs {Number(i.price).toLocaleString()}
                          </span>
                        </div>
                        {(i.licenseKeys || []).length > 0 && (
                          <div className="flex items-start gap-1.5 flex-wrap">
                            <KeyRound className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                            {i.licenseKeys.map((k: string, ki: number) => (
                              <span
                                key={ki}
                                className="px-1.5 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/25 text-emerald-300 text-[9px] font-mono"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Placed {new Date(o.createdAt).toLocaleString()} via {o.paymentMethod}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <button
              onClick={() => {
                const p = Math.max(1, page - 1)
                fetchLog(p)
              }}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-zinc-300 hover:text-white transition disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-[11px] font-mono text-zinc-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => {
                const p = Math.min(totalPages, page + 1)
                fetchLog(p)
              }}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-semibold text-zinc-300 hover:text-white transition disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
