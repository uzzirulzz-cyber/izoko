// Checkout API client — payment methods catalog + server-side coupon validation.
import { AppliedCoupon, PaymentMethodInfo } from './types'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('playbeat_user_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Fetch the dynamically available payment methods. The checkout UI renders
 * ONLY what the backend returns here — a gateway that is not configured
 * (e.g. Rapid without its secret key) comes back with available:false and is
 * shown disabled with an honest reason instead of failing at pay time.
 */
export async function fetchPaymentMethods(): Promise<PaymentMethodInfo[]> {
  const res = await fetch(`${API_BASE}/api/payments/methods`, {
    credentials: 'include',
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.success || !Array.isArray(data.methods)) {
    throw new Error(data?.error || 'Could not load payment methods.')
  }
  return data.methods as PaymentMethodInfo[]
}

/**
 * Validate a coupon SERVER-SIDE against the current subtotal. Returns the
 * applied coupon (with the server-computed discount) or throws with a
 * customer-safe message. The client total is never trusted — order creation
 * re-validates and recomputes the discount authoritatively.
 */
export async function validateCouponServerSide(
  code: string,
  subtotal: number
): Promise<AppliedCoupon> {
  const res = await fetch(`${API_BASE}/api/payments/coupon`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ code: code.trim().toUpperCase(), subtotal }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.success || !data?.coupon) {
    throw new Error(data?.error || 'Invalid coupon code. Please check and try again.')
  }
  const c = data.coupon
  return {
    code: c.code,
    type: c.type === 'fixed' ? 'fixed' : 'percent',
    value: Number(c.value) || 0,
    discount: Number(c.discount) || 0,
    description: c.description || '',
  }
}
