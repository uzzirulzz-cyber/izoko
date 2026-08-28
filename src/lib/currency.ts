import { CurrencyCode } from '../types'

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD']

export const CURRENCY_META: Record<
  CurrencyCode,
  { label: string; symbol: string; rate: number; flag: string }
> = {
  PKR: { label: 'Pakistani Rupee', symbol: 'Rs ', rate: 1.0, flag: '🇵🇰' },
  USD: { label: 'US Dollar', symbol: '$', rate: 0.0036, flag: '🇺🇸' },
  EUR: { label: 'Euro', symbol: '€', rate: 0.0033, flag: '🇪🇺' },
  GBP: { label: 'British Pound', symbol: '£', rate: 0.0028, flag: '🇬🇧' },
  AED: { label: 'UAE Dirham', symbol: 'AED ', rate: 0.0132, flag: '🇦🇪' },
  SAR: { label: 'Saudi Riyal', symbol: 'SAR ', rate: 0.0135, flag: '🇸🇦' },
  CAD: { label: 'Canadian Dollar', symbol: 'CA$', rate: 0.0049, flag: '🇨🇦' },
}

export function formatPrice(amountInPkr: number, currency: CurrencyCode = 'PKR'): string {
  const meta = CURRENCY_META[currency] || CURRENCY_META.PKR
  const converted = amountInPkr * meta.rate

  if (currency === 'PKR') {
    return `${meta.symbol}${Math.round(converted).toLocaleString('en-PK')}`
  }

  return `${meta.symbol}${converted.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
