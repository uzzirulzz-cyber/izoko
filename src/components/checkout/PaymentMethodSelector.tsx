// Payment method selector — radiogroup rendering ONLY the methods returned
// by the backend. Guarantees a single selection at a time (native radiogroup
// semantics) and supports skeleton loading + load-failure retry.
import React from 'react'
import { PaymentMethodCard } from './PaymentMethodCard'
import { PaymentMethodInfo } from './types'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface PaymentMethodSelectorProps {
  methods: PaymentMethodInfo[] | null
  loading: boolean
  loadError: string
  selectedId: string
  showError: boolean
  onSelect: (id: string) => void
  onRetry: () => void
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  methods,
  loading,
  loadError,
  selectedId,
  showError,
  onSelect,
  onRetry,
}) => {
  if (loading && !methods) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading payment methods">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pbx-card p-4">
            <div className="flex items-center gap-3">
              <div className="pbx-skeleton w-5 h-5 !rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="pbx-skeleton h-3.5 w-1/3" />
                <div className="pbx-skeleton h-3 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="pbx-card p-5 text-center" role="alert">
        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">{loadError}</p>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          Payment methods could not be loaded — please check your connection and retry.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="pbx-btn-blue mx-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div role="radiogroup" aria-label="Payment method" className="space-y-3">
      {(methods || []).map((m) => (
        <PaymentMethodCard
          key={m.id}
          method={m}
          selected={selectedId === m.id}
          showError={showError}
          onSelect={onSelect}
        />
      ))}
      {showError && !selectedId && (
        <p className="text-xs font-semibold text-rose-600 px-1" role="alert">
          Please select a payment method to continue.
        </p>
      )}
    </div>
  )
}
