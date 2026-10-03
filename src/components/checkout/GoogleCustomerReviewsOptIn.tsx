// Google Customer Reviews — survey opt-in trigger (React side).
//
// Renders nothing to the DOM (Google's surveyoptin module paints its own
// fixed-position dialog). The component exists purely to invoke the loader
// exactly once per successfully completed order:
//  • `enabled` must only be true when the SERVER has confirmed the order is
//    completed/paid (never on optimistic UI, pending or failed states).
//  • firedRef guards React re-renders of the same component instance;
//    the loader itself additionally guards once-per-order per page load,
//    so StrictMode remounts can never double-fire either.
//  • A failure inside the loader (script blocked/offline) is swallowed
//    there — the confirmation page must never break because of it.
import React, { useEffect, useRef } from 'react'
import { renderCustomerReviewsOptIn } from '../../lib/googleCustomerReviews'

interface GoogleCustomerReviewsOptInProps {
  /** Real order number from the database (e.g. "PB-123456-789"). */
  orderId: string
  /** Actual customer checkout email. */
  email: string
  /** ISO-3166-1 alpha-2 delivery country code. */
  deliveryCountry: string
  /** Estimated delivery date, YYYY-MM-DD. */
  estimatedDeliveryDate: string
  /** True ONLY in the server-confirmed success state. */
  enabled: boolean
}

export const GoogleCustomerReviewsOptIn: React.FC<GoogleCustomerReviewsOptInProps> = ({
  orderId,
  email,
  deliveryCountry,
  estimatedDeliveryDate,
  enabled,
}) => {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!enabled || firedRef.current) return
    if (!orderId || !email || !deliveryCountry || !estimatedDeliveryDate) return
    firedRef.current = true
    try {
      renderCustomerReviewsOptIn({ orderId, email, deliveryCountry, estimatedDeliveryDate })
    } catch {
      /* opt-in must never break the order confirmation page */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return null
}
