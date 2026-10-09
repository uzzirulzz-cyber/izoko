// Shows the server payment state; supplier keys appear after verified payment.
import React, { useState } from 'react'
import { CheckCircle2, Copy, Check, ShoppingCart, Receipt, Mail } from 'lucide-react'
import { GoogleCustomerReviewsOptIn } from './GoogleCustomerReviewsOptIn'
import type { CustomerReviewsOptInData } from '../../lib/googleCustomerReviews'

interface OrderSuccessProps {
  orderNumber: string
  totalLabel: string
  paymentMethodLabel: string
  email: string
  keys: { title: string; key: string }[]
  /** True when the server released real license keys (digital items). */
  hasDigitalKeys: boolean
  paymentPending?: boolean
  /**
   * Google Customer Reviews opt-in payload — built from the REAL server
   * order (real order id + checkout email + derived country/delivery date).
   * Presence of this prop alone does not fire anything: this component is
   * only mounted after the server has confirmed the order, and the loader
   * applies its own validation, host and duplicate-render guards.
   */
  reviewOptIn?: CustomerReviewsOptInData
  onContinueShopping: () => void
  onViewOrders: () => void
}

export const OrderSuccess: React.FC<OrderSuccessProps> = ({
  orderNumber,
  totalLabel,
  paymentMethodLabel,
  email,
  keys,
  hasDigitalKeys,
  paymentPending = false,
  reviewOptIn,
  onContinueShopping,
  onViewOrders,
}) => {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10 pbx-fade-in" data-testid="order-success">
      {!paymentPending && reviewOptIn && (
        <GoogleCustomerReviewsOptIn
          orderId={reviewOptIn.orderId}
          email={reviewOptIn.email}
          deliveryCountry={reviewOptIn.deliveryCountry}
          estimatedDeliveryDate={reviewOptIn.estimatedDeliveryDate}
          enabled
        />
      )}
      <div className="pbx-card p-8 text-center">
        <span className="inline-flex w-16 h-16 rounded-full bg-green-50 border border-green-200 items-center justify-center mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {paymentPending ? 'Order saved — payment pending' : 'Payment confirmed'}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          {paymentPending ? <>Order amount: <strong className="text-slate-900 pbx-num">{totalLabel}</strong> via {paymentMethodLabel}. Payment has not been verified. Keep your order number and check My Orders for payment and delivery updates.</> : <>Payment of <strong className="text-slate-900 pbx-num">{totalLabel}</strong> was verified. {hasDigitalKeys ? 'Your assigned supplier keys are shown below.' : 'Supplier delivery is pending. Check My Orders for updates.'}</>}
        </p>

        <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Order
          </span>
          <span className="text-sm font-bold text-slate-900 font-mono">{orderNumber}</span>
          <button
            onClick={() => copy(orderNumber)}
            aria-label="Copy order number"
            className="text-slate-400 hover:text-slate-700 transition"
          >
            {copied === orderNumber ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {keys.length > 0 && (
        <div className="pbx-card mt-4 overflow-hidden" data-testid="delivered-keys">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">
              {hasDigitalKeys ? 'Your license keys' : 'Delivery updates'}
            </h2>
          </div>
          <div className="p-4 space-y-2">
            {!hasDigitalKeys && (
              <p className="text-xs text-slate-500 leading-relaxed">
                This order includes items dispatched by courier — tracking details will be emailed
                to you as soon as they ship.
              </p>
            )}
            {keys.map((k, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-500 truncate">{k.title}</div>
                  <code className="text-[12px] font-bold text-slate-900 font-mono break-all select-all">
                    {k.key}
                  </code>
                </div>
                <button
                  onClick={() => copy(k.key)}
                  aria-label={`Copy key for ${k.title}`}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-slate-700 transition"
                >
                  {copied === k.key ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-5 pb-6">
        <button onClick={onViewOrders} className="pbx-btn-blue flex-1">
          <Receipt style={{ width: 16, height: 16 }} /> My Orders
        </button>
        <button
          onClick={onContinueShopping}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
        >
          <ShoppingCart style={{ width: 16, height: 16 }} /> Continue Shopping
        </button>
      </div>
    </div>
  )
}
