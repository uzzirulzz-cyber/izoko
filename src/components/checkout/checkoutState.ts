// Shared checkout state that must survive navigation between the cart drawer
// and the /checkout page (and full page reloads):
//   - applied coupon (server-validated; the stored discount is recomputed
//     against the live subtotal by the consumer, order creation re-validates)
//   - customer contact (name + email)
// Kept in localStorage with a tiny pub/sub so both surfaces stay in sync.

import { AppliedCoupon } from './types'

const COUPON_KEY = 'playbeat_coupon_v1'
const CONTACT_KEY = 'playbeat_checkout_contact_v1'

type Listener = () => void
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeCheckoutState(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ---------------- coupon ----------------

export function getStoredCoupon(): AppliedCoupon | null {
  try {
    const raw = localStorage.getItem(COUPON_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    if (c && typeof c.code === 'string') return c as AppliedCoupon
    return null
  } catch {
    return null
  }
}

export function setStoredCoupon(coupon: AppliedCoupon | null): void {
  try {
    if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon))
    else localStorage.removeItem(COUPON_KEY)
  } catch {
    /* storage unavailable — keep in-memory behavior */
  }
  emit()
}

// ---------------- contact ----------------

export interface CheckoutContact {
  name: string
  email: string
}

export function getStoredContact(): CheckoutContact {
  try {
    const raw = localStorage.getItem(CONTACT_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c && (typeof c.email === 'string' || typeof c.name === 'string')) {
        return { name: String(c.name || ''), email: String(c.email || '') }
      }
    }
  } catch {
    /* ignore */
  }
  return { name: '', email: '' }
}

export function setStoredContact(contact: CheckoutContact): void {
  try {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(contact))
  } catch {
    /* ignore */
  }
  emit()
}

// ---------------- email validation ----------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/** Inline error for an email field; empty string when valid. */
export function emailError(email: string): string {
  const v = email.trim()
  if (!v) return 'Email is required for instant key delivery.'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address, e.g. you@example.com'
  return ''
}
