// Premium order summary — Subtotal / Discount / Final Total computed
// dynamically from cart data + the server-validated coupon. PKR formatted.
import React from 'react'
import { CartTotals } from './types'
import { AppliedCoupon } from './types'

interface OrderSummaryProps {
  totals: CartTotals
  coupon: AppliedCoupon | null
  formatAmount: (pkr: number) => string
  /** Optional per-item lines (used on the checkout page summary card). */
  children?: React.ReactNode
  compact?: boolean
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  totals,
  coupon,
  formatAmount,
  children,
  compact,
}) => {
  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      {children}

      <div className={compact ? 'pt-2 space-y-2 text-[13px]' : 'pt-1 space-y-2.5 text-sm'}>
        <div className="flex items-center justify-between text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-900 pbx-num">{formatAmount(totals.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Discount{coupon ? ` (${coupon.code})` : ''}</span>
          {totals.discount > 0 ? (
            <span className="font-semibold text-green-600 pbx-num" data-testid="discount-amount">
              − {formatAmount(totals.discount)}
            </span>
          ) : (
            <span className="font-semibold text-slate-900 pbx-num">Rs 0</span>
          )}
        </div>
      </div>

      <div
        className="flex items-center justify-between pt-3 border-t border-slate-200"
        data-testid="final-total"
      >
        <span className={`${compact ? 'text-[15px]' : 'text-base'} font-bold text-slate-900`}>
          Final Total
        </span>
        <span
          className={`${compact ? 'text-xl' : 'text-2xl'} font-extrabold pbx-num`}
          style={{ color: 'var(--pbx-blue)' }}
        >
          {formatAmount(totals.total)}
        </span>
      </div>
    </div>
  )
}
