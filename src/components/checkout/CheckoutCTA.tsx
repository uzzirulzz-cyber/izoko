// The dominant gold checkout CTA — dynamic amount, disabled until all
// validation gates pass, loading state while the order/payment session is
// created, double-submit protection (disabled while submitting).
import React from 'react'
import { Lock, Loader2, Zap } from 'lucide-react'

interface CheckoutCTAProps {
  amountLabel: string
  disabled: boolean
  loading: boolean
  label?: string
  loadingLabel?: string
  /** Rapid hosted-checkout variant text. */
  hostedLabel?: string
  hosted?: boolean
  id?: string
}

export const CheckoutCTA: React.FC<CheckoutCTAProps> = ({
  amountLabel,
  disabled,
  loading,
  label,
  loadingLabel = 'Processing…',
  hostedLabel,
  hosted,
  id,
}) => {
  const text =
    loading
      ? loadingLabel
      : hosted && hostedLabel
        ? hostedLabel.replace('{amount}', amountLabel)
        : label
          ? `${label.replace('{amount}', amountLabel)}`
          : `Pay ${amountLabel} & Receive Keys`

  return (
    <button
      type="submit"
      id={id}
      className="pbx-cta"
      disabled={disabled || loading}
      aria-busy={loading}
      data-testid="checkout-cta"
    >
      {loading ? (
        <>
          <Loader2 className="w-4.5 h-4.5 animate-spin" style={{ width: 18, height: 18 }} />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {hosted ? <Lock style={{ width: 17, height: 17 }} /> : <Zap style={{ width: 17, height: 17 }} fill="currentColor" />}
          <span>{text}</span>
        </>
      )}
    </button>
  )
}
