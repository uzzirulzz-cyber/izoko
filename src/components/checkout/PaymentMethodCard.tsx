// Radio-card for a single payment method — selected / hover / focus /
// disabled / error states, smooth selection animation, official brand row.
import React from 'react'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { PaymentMethodInfo } from './types'
import { PaymentLogoRow, BrandId } from './PaymentLogos'

interface PaymentMethodCardProps {
  method: PaymentMethodInfo
  selected: boolean
  showError: boolean
  onSelect: (id: string) => void
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  method,
  selected,
  showError,
  onSelect,
}) => {
  const disabled = !method.available

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onSelect(method.id)}
      className={`pbx-method ${selected ? 'pbx-method-selected' : ''} ${
        showError && !selected ? 'pbx-method-error' : ''
      }`}
      data-method-id={method.id}
    >
      {/* radio indicator */}
      <span className="pbx-radio" aria-hidden="true">
        <span className="pbx-radio-dot" />
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-bold text-slate-900 leading-tight">{method.label}</span>
          {method.recommended && method.available && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-800 text-[10px] font-bold uppercase tracking-wide">
              <ShieldCheck className="w-3 h-3" /> Recommended
            </span>
          )}
        </span>

        <span className="block text-[13px] text-slate-500 mt-0.5 leading-snug">
          {disabled ? method.unavailableReason || 'Currently unavailable' : method.description}
        </span>

        {/* official brand row */}
        {method.available && method.brands.length > 0 && (
          <PaymentLogoRow
            brands={method.brands as BrandId[]}
            height={18}
            className="mt-2.5"
            label={`${method.label} accepts: ${method.brands.join(', ')}`}
          />
        )}

        {disabled && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold text-rose-600">
            <AlertCircle className="w-3.5 h-3.5" /> Unavailable
          </span>
        )}
      </span>
    </button>
  )
}
