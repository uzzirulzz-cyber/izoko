// InvoicePage — /invoice/:orderNumber
// Owner-only printable invoice. Data comes from GET /api/orders/invoice/:num
// which is scoped to the signed-in user (admin can use the admin API). PDF
// export uses the browser's print dialog ("Save as PDF") — no third-party
// dependency, works everywhere, and never fabricates a stored PDF.

import React, { useEffect, useState } from 'react'
import { FileText, Printer, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

interface InvoiceItem {
  name: string
  variantName?: string | null
  quantity: number
  unitPrice: number
  amount: number
  deliveryType?: string | null
}

interface InvoiceData {
  invoiceNumber: string
  orderNumber: string
  customerName: string
  customerEmail: string
  brand: {
    name: string
    tagline: string
    address: string
    email: string
    whatsapp: string
    siteUrl: string
  }
  items: InvoiceItem[]
  subtotalAmount: number
  discountAmount?: number
  coupon?: { code: string; discount: number } | null
  totalAmount: number
  currency: string
  paymentMethod: string
  paymentStatus: string
  issuedAt: string
}

function money(n: number, currency: string) {
  const symbol = currency === 'PKR' ? 'Rs ' : `${currency} `
  return `${symbol}${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}

export const InvoicePage: React.FC<{
  orderNumber: string
  user: { name: string; email: string } | null
  onRequireAuth: () => void
  onNavigate: (path: string) => void
}> = ({ orderNumber, user, onRequireAuth, onNavigate }) => {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderNumber) return
    const token = localStorage.getItem('playbeat_user_token')
    if (!token) {
      setLoading(false)
      setError('auth')
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/orders/invoice/${encodeURIComponent(orderNumber)}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!alive) return
        if (r.ok && d?.success && d?.invoice) setInvoice(d.invoice)
        else setError(d?.error || `Invoice unavailable (${r.status})`)
      })
      .catch(() => alive && setError('Could not reach the invoice service. Please try again.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [orderNumber])

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans pb-16">
      {/* Toolbar (screen only) */}
      <div className="max-w-[860px] mx-auto px-4 pt-8 pb-4 flex items-center justify-between gap-3 no-print">
        <button
          onClick={() => onNavigate('/account')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-yellow-300 transition"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Account
        </button>
        <button
          onClick={() => window.print()}
          disabled={!invoice}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFC107] text-[#0b1020] text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ffd54d] transition"
        >
          <Printer className="w-4 h-4" /> Download PDF / Print
        </button>
      </div>

      {loading && (
        <div className="max-w-[860px] mx-auto px-4 py-24 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-yellow-400" />
          <p className="text-sm">Preparing your invoice…</p>
        </div>
      )}

      {!loading && error === 'auth' && (
        <div className="max-w-[860px] mx-auto px-4 py-24 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto text-yellow-400 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Sign in to view this invoice</h1>
          <p className="text-sm text-slate-400 mb-6">Invoices are private — only the order owner can open them.</p>
          <button
            onClick={onRequireAuth}
            className="px-6 py-3 rounded-xl bg-[#FFC107] text-[#0b1020] text-sm font-bold hover:bg-[#ffd54d] transition"
          >
            Sign In / Sign Up
          </button>
        </div>
      )}

      {!loading && error && error !== 'auth' && (
        <div className="max-w-[860px] mx-auto px-4 py-24 text-center">
          <FileText className="w-10 h-10 mx-auto text-slate-500 mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invoice unavailable</h1>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      )}

      {!loading && invoice && (
        <div className="max-w-[860px] mx-auto px-4">
          <div className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            {/* Branded header */}
            <div className="bg-gradient-to-r from-[#0b1020] to-[#1a2340] px-8 py-7 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[#FFC107] font-extrabold text-2xl tracking-wide">
                  {invoice.brand?.name || 'PlayBeat Digital'}
                </div>
                <div className="text-slate-300 text-xs mt-1">{invoice.brand?.tagline}</div>
                <div className="text-slate-400 text-[11px] mt-2 leading-relaxed">
                  {invoice.brand?.address}
                  <br />
                  {invoice.brand?.email} · WhatsApp {invoice.brand?.whatsapp}
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-300 text-[11px] uppercase tracking-widest">Invoice</div>
                <div className="text-white font-bold text-lg">{invoice.invoiceNumber}</div>
                <div className="text-slate-300 text-xs mt-1">
                  Issued {new Date(invoice.issuedAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold uppercase tracking-wide">
                  ● {invoice.paymentStatus === 'paid' ? 'Paid' : invoice.paymentStatus}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="px-8 py-6 grid sm:grid-cols-2 gap-6 border-b border-slate-200">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Billed To</div>
                <div className="font-semibold text-slate-900">{invoice.customerName}</div>
                <div className="text-slate-500 text-sm">{invoice.customerEmail}</div>
              </div>
              <div className="sm:text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Order Reference</div>
                <div className="font-semibold text-slate-900">{invoice.orderNumber}</div>
                <div className="text-slate-500 text-sm">Paid via {invoice.paymentMethod}</div>
              </div>
            </div>

            {/* Line items */}
            <div className="px-8 py-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Item</th>
                    <th className="text-center py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold w-16">Qty</th>
                    <th className="text-right py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold w-28">Unit</th>
                    <th className="text-right py-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-3 pr-2">
                        <div className="font-medium text-slate-900">{it.name}</div>
                        {it.variantName && <div className="text-xs text-slate-500">{it.variantName}</div>}
                        {it.deliveryType && <div className="text-[11px] text-slate-400">{it.deliveryType}</div>}
                      </td>
                      <td className="py-3 text-center text-slate-700">{it.quantity}</td>
                      <td className="py-3 text-right text-slate-700">{money(it.unitPrice, invoice.currency)}</td>
                      <td className="py-3 text-right font-semibold text-slate-900">{money(it.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-full sm:w-72 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{money(invoice.subtotalAmount, invoice.currency)}</span>
                  </div>
                  {invoice.discountAmount && invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount{invoice.coupon?.code ? ` (${invoice.coupon.code})` : ''}</span>
                      <span>−{money(invoice.discountAmount, invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-extrabold text-slate-900">
                    <span>Total Paid</span>
                    <span>{money(invoice.totalAmount, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
              This invoice was generated automatically by PlayBeat Digital upon verified payment.
              Payment status is confirmed by our payment gateway webhook — never by browser input.
              For any question about this invoice contact {invoice.brand?.email} or WhatsApp {invoice.brand?.whatsapp} (24/7).
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
