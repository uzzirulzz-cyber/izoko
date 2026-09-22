// Trust / security badges — ONLY claims that actually apply to PlayBeat:
// TLS encryption on the checkout, server-side payment verification,
// recognized local payment partners, and the published refund policy.
// No banking certifications or guaranteed-refund claims.
import React from 'react'
import { Lock, ShieldCheck, Handshake, FileCheck2, Headset } from 'lucide-react'
import { PaymentLogoRow, BrandId } from './PaymentLogos'

interface SecurityBadgesProps {
  /** Union of partner brands across the enabled payment methods. */
  partnerBrands?: BrandId[]
  compact?: boolean
}

const ITEMS = [
  {
    icon: Lock,
    title: 'SSL Secured',
    sub: 'Encrypted checkout',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payment',
    sub: 'Verified server-side',
  },
  {
    icon: Handshake,
    title: 'Trusted Partners',
    sub: 'Recognized providers',
  },
  {
    icon: FileCheck2,
    title: 'Buyer Protection',
    sub: 'Per our refund policy',
  },
  {
    icon: Headset,
    title: '24/7 Support',
    sub: "We're here to help",
  },
]

export const SecurityBadges: React.FC<SecurityBadgesProps> = ({ partnerBrands, compact }) => {
  const shown = compact ? ITEMS.slice(0, 3) : ITEMS
  return (
    <div className="pbx-card p-3.5" aria-label="Security and trust">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {shown.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex flex-col items-center text-center gap-1 px-1">
            <span className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
              <Icon className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="text-[11px] font-bold text-slate-800 leading-tight">{title}</span>
            <span className="text-[10px] text-slate-500 leading-tight">{sub}</span>
          </div>
        ))}
      </div>
      {partnerBrands && partnerBrands.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            All transactions are secure and encrypted
          </span>
          <PaymentLogoRow brands={partnerBrands} height={16} />
        </div>
      )}
    </div>
  )
}
