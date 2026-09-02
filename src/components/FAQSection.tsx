import React, { useState, useEffect } from 'react'
import { ChevronDown, MessageCircleQuestion, Headphones } from 'lucide-react'

interface FAQSectionProps {
  onNavigate: (path: string) => void
}

/**
 * FAQ items grounded in the live PlayBeat policies (shipping, refund,
 * warranty, terms) so answers never contradict the legal documents.
 */
export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How fast will I receive my digital product?',
    a: 'Digital license keys, subscriptions and gift cards are delivered automatically to your email — typically within 15 seconds of payment confirmation, and never later than 15 minutes even during gateway incidents. If your email does not arrive, check spam first, then contact support and we will re-issue the delivery instantly from the order log.',
  },
  {
    q: 'How do I activate the license key I received?',
    a: 'Every delivery email includes your license key plus step-by-step activation instructions for the exact product you bought. Follow them on the account or device you want activated. If a key ever fails to activate, send us your order number and a short screenshot or video — verified failures get a free replacement or full refund within 24 hours.',
  },
  {
    q: 'What is the refund policy for digital products?',
    a: 'PlayBeat offers a 24-hour satisfaction guarantee: invalid, already-redeemed or non-activating keys are replaced or fully refunded within 24 hours of verification. Refund requests can be submitted within 7 days of delivery. Approved refunds return to your original payment method within 5-7 business days (crypto and wallets within 48 hours). Keys that were successfully activated are not refundable.',
  },
  {
    q: 'Do the subscriptions work in my country?',
    a: 'Most digital products are global, but a few streaming plans and licenses are region-specific — the region is always stated on the product page before you buy. If you are unsure, message our live chat with your country and the product name and we will confirm compatibility before you order.',
  },
  {
    q: 'How long does smart projector delivery take?',
    a: 'Projectors and hardware ship free anywhere in Pakistan via tracked courier. Orders confirmed before 2:00 PM PKT dispatch the same working day. Typical transit is 1-3 working days for major cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan) and 2-4 working days for remote districts. Every order includes SMS + email tracking.',
  },
  {
    q: 'What warranty do smart projectors include?',
    a: 'Every projector carries a one-year manufacturer warranty covering optical engine faults, mainboard and power failures, speaker defects and remote/WiFi/Bluetooth malfunctions under normal use. Selected bundles extend coverage to 24 months. Approved claims include free courier pickup, with repaired or replacement units dispatched within 7-14 working days.',
  },
  {
    q: 'Which payment methods do you accept?',
    a: 'We accept Visa and Mastercard debit/credit cards, EasyPaisa, JazzCash, Binance Pay and other cryptocurrencies, and direct bank transfer. All payments are processed by PCI-DSS compliant gateways — we never see or store your full card details. Prices are listed in PKR with optional currency display.',
  },
  {
    q: 'How do I contact support if something goes wrong?',
    a: 'Our team replies within 2-4 hours on every channel: the live chat bubble on the site, email at support@playbeat.digital, or WhatsApp. Include your order number (PB-XXXXXX) for the fastest resolution. Account holders can also message us directly from the Messages tab in their account drawer.',
  },
]

/**
 * FAQ — homepage accordion grounded in the live policies.
 * Publishes FAQPage structured data (JSON-LD) so the storefront is eligible
 * for FAQ rich results in Google.
 */
export const FAQSection: React.FC<FAQSectionProps> = ({ onNavigate }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  // Inject FAQPage structured data while mounted (homepage only)
  useEffect(() => {
    const id = 'faq-jsonld'
    let el = document.getElementById(id) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = id
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    })
    return () => {
      document.getElementById(id)?.remove()
    }
  }, [])

  return (
    <section id="faq-section" className="w-full py-12 bg-[#050814] border-t border-slate-400/10">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-1.5 h-5 rounded-full bg-[#FFC107] inline-block"></span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                Frequently Asked Questions
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-sans max-w-lg">
              Straight answers about delivery, activation, refunds and warranty —
              aligned with our official policies.
            </p>
          </div>
          <button
            id="faq-support-cta"
            onClick={() => onNavigate('/contact')}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A122E] border border-slate-400/20 hover:border-yellow-400/45 text-xs font-bold text-slate-200 hover:text-white transition shrink-0"
          >
            <Headphones className="w-4 h-4 text-yellow-400" />
            Still stuck? Contact Support
          </button>
        </div>

        {/* Accordion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FAQ_ITEMS.map((item, idx) => {
            const open = openIdx === idx
            return (
              <div
                key={item.q}
                className={`rounded-2xl border transition-all duration-200 ${
                  open
                    ? 'bg-[#0A122E] border-yellow-400/35 shadow-[0_0_24px_-8px_rgba(255,193,7,0.25)]'
                    : 'bg-[#0A122E]/60 border-slate-400/12 hover:border-slate-400/30'
                } ${idx === 0 ? 'lg:col-span-2' : ''}`}
              >
                <button
                  id={`faq-q-${idx + 1}`}
                  onClick={() => setOpenIdx(open ? null : idx)}
                  aria-expanded={open}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="flex items-start gap-2.5 min-w-0">
                    <MessageCircleQuestion
                      className={`w-4 h-4 mt-0.5 shrink-0 ${open ? 'text-yellow-400' : 'text-slate-500'}`}
                    />
                    <span
                      className={`text-[13px] font-bold leading-snug ${
                        open ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {item.q}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      open ? 'rotate-180 text-yellow-400' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 pl-12 text-xs text-slate-300 leading-relaxed font-sans">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Policy links row */}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-slate-500 mr-1">Read the full policies:</span>
          {[
            ['/shipping-policy', 'Shipping & Delivery'],
            ['/refund-policy', 'Refund Policy'],
            ['/warranty', 'Warranty'],
            ['/terms', 'Terms'],
            ['/privacy', 'Privacy'],
          ].map(([path, label]) => (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              className="px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 hover:text-yellow-300 transition"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
