// Official payment-service brand assets — real logo files (SVG/PNG), never
// recreated text or distorted placeholders. Sources:
//   visa/mastercard/amex  — Wikimedia official brand SVGs
//   jazzcash              — jazzcash.com.pk official asset
//   raast                 — Wikimedia official SVG (SBP instant payment system)
//   easypaisa             — Wikimedia official logo (500px PNG)
//   binance               — simple-icons official glyph (brand gold applied)
// Sizing rule: rendered at a consistent 20–24px height, width auto, never
// stretched (h-auto + fixed height container).

import React from 'react'
import visaSvg from '../../assets/payments/visa.svg'
import mastercardSvg from '../../assets/payments/mastercard.svg'
import amexSvg from '../../assets/payments/amex.svg'
import jazzcashSvg from '../../assets/payments/jazzcash.svg'
import raastSvg from '../../assets/payments/raast.svg'
import easypaisaPng from '../../assets/payments/easypaisa.png'
import binanceGlyph from '../../assets/payments/binance.svg'

export type BrandId =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'jazzcash'
  | 'easypaisa'
  | 'raast'
  | 'binance'
  | 'bank'

const BRAND_META: Record<BrandId, { alt: string; title: string }> = {
  visa: { alt: 'Visa', title: 'Visa' },
  mastercard: { alt: 'Mastercard', title: 'Mastercard' },
  amex: { alt: 'American Express', title: 'American Express' },
  jazzcash: { alt: 'JazzCash', title: 'JazzCash' },
  easypaisa: { alt: 'Easypaisa', title: 'Easypaisa' },
  raast: { alt: 'Raast — instant payments by State Bank of Pakistan', title: 'Raast' },
  binance: { alt: 'Binance Pay', title: 'Binance Pay' },
  bank: { alt: 'Direct Bank Transfer', title: 'Bank Transfer' },
}

interface BrandMarkProps {
  brand: BrandId
  /** Rendered height in px — logos keep their intrinsic aspect ratio. */
  height?: number
  className?: string
}

/** A single official brand mark at a controlled height. */
export const BrandMark: React.FC<BrandMarkProps> = ({ brand, height = 22, className = '' }) => {
  const meta = BRAND_META[brand]
  const imgStyle: React.CSSProperties = { height, width: 'auto' }

  if (brand === 'binance') {
    // Official Binance diamond glyph + wordmark composition
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        title={meta.title}
        aria-label={meta.alt}
      >
        <img src={binanceGlyph} alt="" style={{ height, width: 'auto' }} loading="lazy" />
        <span
          className="font-extrabold tracking-tight"
          style={{ fontSize: height * 0.72, color: '#0B0E11', lineHeight: 1 }}
        >
          BINANCE<span style={{ color: '#B7BDC6', fontWeight: 700 }}> PAY</span>
        </span>
      </span>
    )
  }

  if (brand === 'raast') {
    // Official Raast emblem + wordmark (State Bank of Pakistan instant payments)
    return (
      <span
        className={`inline-flex items-center gap-1 ${className}`}
        title={meta.title}
        aria-label={meta.alt}
      >
        <img src={raastSvg} alt="" style={{ height, width: 'auto' }} loading="lazy" />
        <span
          className="font-extrabold"
          style={{ fontSize: height * 0.78, color: '#095434', lineHeight: 1, letterSpacing: '-0.01em' }}
        >
          Raast
        </span>
      </span>
    )
  }

  if (brand === 'bank') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        title={meta.title}
        aria-label={meta.alt}
      >
        <svg width={height} height={height} viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="22" x2="21" y2="22" />
          <line x1="6" y1="18" x2="6" y2="11" />
          <line x1="10" y1="18" x2="10" y2="11" />
          <line x1="14" y1="18" x2="14" y2="11" />
          <line x1="18" y1="18" x2="18" y2="11" />
          <polygon points="12 2 20 7 4 7" fill="#0f172a" stroke="none" />
        </svg>
        <span
          className="font-extrabold leading-none"
          style={{ fontSize: height * 0.58, color: '#0f172a', letterSpacing: '0.02em' }}
        >
          BANK
          <br />
          TRANSFER
        </span>
      </span>
    )
  }

  const src =
    brand === 'visa'
      ? visaSvg
      : brand === 'mastercard'
        ? mastercardSvg
        : brand === 'amex'
          ? amexSvg
          : brand === 'jazzcash'
            ? jazzcashSvg
            : easypaisaPng

  return (
    <img
      src={src}
      alt={meta.alt}
      title={meta.title}
      style={imgStyle}
      className={`object-contain ${className}`}
      loading="lazy"
    />
  )
}

interface PaymentLogoRowProps {
  brands: BrandId[]
  height?: number
  className?: string
  /** Accessible label describing the brand list. */
  label?: string
}

/** A row of official brand marks with consistent sizing/spacing. */
export const PaymentLogoRow: React.FC<PaymentLogoRowProps> = ({
  brands,
  height = 20,
  className = '',
  label,
}) => {
  if (!brands.length) return null
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}
      role="img"
      aria-label={label || `Accepted: ${brands.map((b) => BRAND_META[b]?.alt || b).join(', ')}`}
    >
      {brands.map((b) => (
        <BrandMark key={b} brand={b} height={height} />
      ))}
    </div>
  )
}
