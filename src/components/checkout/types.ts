// Shared checkout types — used by the cart drawer, checkout page and
// payment method components.

export interface PaymentMethodInfo {
  id: string
  label: string
  tagline: string
  description: string
  available: boolean
  mode: 'hosted' | 'direct'
  recommended?: boolean
  brands: string[]
  unavailableReason?: string
}

export interface AppliedCoupon {
  code: string
  type: 'percent' | 'fixed'
  value: number
  discount: number
  description?: string
}

export interface CartTotals {
  subtotal: number
  discount: number
  total: number
}
