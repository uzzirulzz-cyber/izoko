// Coupon input with tag icon + Apply — validated SERVER-SIDE via
// /api/payments/coupon. Shows the applied state (code + description +
// live discount amount) with a remove control.
import React, { useState } from 'react'
import { Tag, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { AppliedCoupon } from './types'
import { validateCouponServerSide } from './paymentApi'

interface CouponInputProps {
  applied: AppliedCoupon | null
  subtotal: number
  /** Formats PKR amounts for the live discount line. */
  formatAmount: (pkr: number) => string
  onApplied: (c: AppliedCoupon) => void
  onRemoved: () => void
}

export const CouponInput: React.FC<CouponInputProps> = ({
  applied,
  subtotal,
  formatAmount,
  onApplied,
  onRemoved,
}) => {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const apply = async (e: React.FormEvent) => {
    e.preventDefault()
    const c = code.trim()
    if (!c || busy) return
    setBusy(true)
    setError('')
    try {
      const coupon = await validateCouponServerSide(c, subtotal)
      onApplied(coupon)
      setCode('')
    } catch (err: any) {
      setError(err?.message || 'Could not validate the coupon. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (applied) {
    return (
      <div>
        <div className="pbx-coupon-applied" data-testid="coupon-applied">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-green-100 border border-green-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                Coupon applied
              </div>
              <div className="text-sm font-bold text-slate-900 font-mono">
                {applied.code}
                {applied.description && (
                  <span className="ml-2 text-[11px] font-medium text-slate-500 font-sans normal-case">
                    {applied.description}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-semibold text-green-700">
                You save {formatAmount(applied.discount)} on this order
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onRemoved()
              setError('')
            }}
            aria-label={`Remove coupon ${applied.code}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <form onSubmit={apply} className="flex gap-2" noValidate>
        <div className="relative flex-1">
          <Tag
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="pbx-coupon-code" className="sr-only">
            Coupon code
          </label>
          <input
            id="pbx-coupon-code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (error) setError('')
            }}
            placeholder="Enter coupon code"
            autoComplete="off"
            autoCapitalize="characters"
            className="pbx-input !pl-9 font-mono uppercase text-[13px]"
            aria-invalid={!!error}
            aria-describedby={error ? 'pbx-coupon-error' : undefined}
            disabled={busy}
          />
        </div>
        <button type="submit" className="pbx-btn-blue shrink-0 !px-5" disabled={busy || !code.trim()}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
        </button>
      </form>
      {error && (
        <p
          id="pbx-coupon-error"
          className="flex items-start gap-1.5 text-xs font-medium text-rose-600 mt-2 px-1"
          role="alert"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          {error}
        </p>
      )}
    </div>
  )
}
