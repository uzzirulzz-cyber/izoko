import React from 'react'
import { X, ShieldCheck, Truck, RefreshCw, Mail, Lock, FileText, Package, HeadphonesIcon } from 'lucide-react'

type InfoType = 'privacy' | 'terms' | 'refund' | 'track' | 'warranty' | 'contact'

interface FooterInfoModalProps {
  type: InfoType | null
  onClose: () => void
}

const CONTENT: Record<InfoType, { title: string; icon: React.ReactNode; body: React.ReactNode }> = {
  privacy: {
    title: 'Privacy Policy',
    icon: <Lock className="w-5 h-5 text-yellow-400" />,
    body: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
        <p>
          PlayBeat Digital Pvt Ltd ("PlayBeat", "we", "us") is committed to protecting the privacy of every customer who transacts on our marketplace. This Privacy Policy describes what data we collect, how we use it, who we share it with, and the choices you have.
        </p>
        <p>
          <strong className="text-white">Data We Collect:</strong> When you create an account or complete a purchase, we collect your full name, email address, contact number (optional), and payment method metadata. We do NOT store full credit/debit card numbers — payment processing is handled by our PCI-DSS compliant gateways (Visa, Mastercard, EasyPaisa, JazzCash, Binance Pay).
        </p>
        <p>
          <strong className="text-white">How We Use Your Data:</strong> Order fulfillment (instant digital license delivery via email), warranty tracking, fraud prevention, customer support, and order history access via your account dashboard.
        </p>
        <p>
          <strong className="text-white">Data Sharing:</strong> We do not sell or rent your personal data. We share minimal data only with payment processors (for transaction approval) and our delivery courier (for physical product shipments).
        </p>
        <p>
          <strong className="text-white">Your Rights:</strong> You may request access, correction, or deletion of your personal data at any time by emailing <span className="text-yellow-300">privacy@playbeat.digital</span>. We respond to all verified requests within 72 hours.
        </p>
        <p className="text-slate-500 text-[10px] pt-2 border-t border-slate-400/10">
          Last updated: August 2026. This policy is governed by the laws of the Islamic Republic of Pakistan.
        </p>
      </div>
    ),
  },
  terms: {
    title: 'Terms of Service',
    icon: <FileText className="w-5 h-5 text-yellow-400" />,
    body: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
        <p>
          By accessing or purchasing from the PlayBeat Digital marketplace, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use of the platform immediately.
        </p>
        <p>
          <strong className="text-white">Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old (or have parental consent) to transact.
        </p>
        <p>
          <strong className="text-white">Digital License Usage:</strong> All digital license keys, account credentials, and subscription access delivered by PlayBeat are intended for the buyer's personal use only unless explicitly marked as "Commercial License". Reselling, sharing, or redistributing keys is strictly prohibited and will result in immediate account termination without refund.
        </p>
        <p>
          <strong className="text-white">Pricing & Availability:</strong> All prices are listed in PKR (default currency) and may be converted at checkout based on your selected currency. We reserve the right to modify pricing, remove products, or refuse service to any customer at our discretion.
        </p>
        <p>
          <strong className="text-white">Limitation of Liability:</strong> PlayBeat's maximum liability for any single transaction is limited to the amount paid by the customer for that specific product. We are not liable for indirect, incidental, or consequential damages arising from misuse of digital products.
        </p>
        <p className="text-slate-500 text-[10px] pt-2 border-t border-slate-400/10">
          Last updated: August 2026. Disputes will be resolved through binding arbitration in Karachi, Pakistan.
        </p>
      </div>
    ),
  },
  refund: {
    title: 'Refund Policy',
    icon: <RefreshCw className="w-5 h-5 text-yellow-400" />,
    body: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
        <p>
          PlayBeat offers a 24-hour satisfaction guarantee on all digital license purchases. If a key fails to activate or is found invalid, we will issue a replacement key or full refund within 24 hours of verified complaint.
        </p>
        <p>
          <strong className="text-white">Eligible Refunds:</strong> Invalid or already-activated license keys, products not delivered within 15 seconds of successful payment, duplicate purchases of the same product, and orders cancelled before digital key generation.
        </p>
        <p>
          <strong className="text-white">Non-Refundable Cases:</strong> Keys that have been successfully activated by the customer, subscription accounts where the warranty period has expired, products marked "Final Sale", and orders where the customer provided an incorrect email address causing delivery failure.
        </p>
        <p>
          <strong className="text-white">Refund Process:</strong> Email <span className="text-yellow-300">refunds@playbeat.digital</span> with your order number and a screenshot showing the activation failure. Approved refunds are credited back to the original payment method within 5-7 business days.
        </p>
        <p>
          <strong className="text-white">Physical Items (Projectors):</strong> Covered by the manufacturer's warranty. Returns accepted within 7 days for unopened units only. Opened/used projectors cannot be returned but are eligible for warranty service.
        </p>
        <p className="text-slate-500 text-[10px] pt-2 border-t border-slate-400/10">
          Last updated: August 2026.
        </p>
      </div>
    ),
  },
  track: {
    title: 'Track Courier Dispatch',
    icon: <Truck className="w-5 h-5 text-yellow-400" />,
    body: (
      <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
        <p>
          Enter your PlayBeat order number (starts with <span className="font-mono text-yellow-300">PB-</span>) or courier tracking ID to check the live status of your physical shipment. Digital license deliveries are not trackable here — they arrive instantly via email.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); alert('Tracking ID submitted — for live status, please check your email inbox for the courier confirmation.') }} className="space-y-2">
          <label className="block text-[11px] font-mono uppercase text-slate-300 tracking-wider">
            Order Number or Tracking ID
          </label>
          <input
            type="text"
            required
            placeholder="PB-123456-789 or LEOPARDS-XXXXX"
            className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition font-mono"
          />
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Track My Dispatch
          </button>
        </form>
        <div className="p-3 rounded-xl bg-[#0A122E] border border-slate-400/15 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300 mb-1">Courier Partners:</div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {['Leopards Courier', 'TCS Express', 'DPD', 'DHL Express', 'Stallion Delivery'].map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-slate-300">{c}</span>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-slate-500">
          Shipments typically dispatch within 24 hours of order confirmation. Standard delivery: 1-3 business days (Pakistan), 5-10 business days (International).
        </p>
      </div>
    ),
  },
  warranty: {
    title: 'Warranty & Replacement Policy',
    icon: <ShieldCheck className="w-5 h-5 text-yellow-400" />,
    body: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
        <p>
          PlayBeat backs every digital and physical product with a structured warranty program. Below is what's covered and for how long.
        </p>
        <p>
          <strong className="text-white">Digital License Keys:</strong> 30-day replacement warranty from the date of delivery. If a key stops working within this period (and was not misused by the customer), we will provide a free replacement key within 6 hours of verified complaint.
        </p>
        <p>
          <strong className="text-white">Subscription Accounts (Netflix, Spotify, ChatGPT Plus, etc.):</strong> Warranty matches the purchased plan duration. If the account stops working before the plan expires, contact support with your order ID for an instant replacement account.
        </p>
        <p>
          <strong className="text-white">Smart Projectors (Magcubic, etc.):</strong> 12-month manufacturer warranty covering manufacturing defects in LED lamp, motherboard, and power supply. Physical damage, water damage, and unauthorized repairs are not covered.
        </p>
        <p>
          <strong className="text-white">Replacement Process:</strong> Email <span className="text-yellow-300">warranty@playbeat.digital</span> with your order number, a description of the issue, and any supporting screenshots or videos. Our team responds within 4 hours during business hours (9 AM – 11 PM PKT).
        </p>
        <p className="text-slate-500 text-[10px] pt-2 border-t border-slate-400/10">
          Last updated: August 2026.
        </p>
      </div>
    ),
  },
  contact: {
    title: 'Contact PlayBeat Support',
    icon: <HeadphonesIcon className="w-5 h-5 text-yellow-400" />,
    body: (
      <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
        <p>Our support team is available 24/7 across multiple channels. Pick whichever is most convenient for you — average response time is under 30 minutes.</p>
        <div className="grid grid-cols-1 gap-2">
          <a href="mailto:support@playbeat.digital" className="flex items-center gap-3 p-3 rounded-xl bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 transition">
            <Mail className="w-4 h-4 text-yellow-400" />
            <div>
              <div className="text-xs font-semibold text-white">Email Support</div>
              <div className="text-[10px] text-slate-400 font-mono">support@playbeat.digital</div>
            </div>
          </a>
          <a href="https://wa.me/923000000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-[#0A122E] border border-slate-400/15 hover:border-emerald-400/40 transition">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-semibold text-white">WhatsApp (24/7)</div>
              <div className="text-[10px] text-slate-400 font-mono">+92 300 0000000</div>
            </div>
          </a>
        </div>
        <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-400/10">
          For order-specific questions, always include your PB- order number for fastest resolution.
        </p>
      </div>
    ),
  },
}

export const FooterInfoModal: React.FC<FooterInfoModalProps> = ({ type, onClose }) => {
  if (!type) return null
  const content = CONTENT[type]

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#040714]/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-[24px] bg-[#0B1220] border border-yellow-400/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(255,193,7,0.15)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 bg-[#0B1220] border-b border-slate-400/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {content.icon}
            <h3 className="text-base font-extrabold text-white tracking-tight">{content.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {content.body}
        </div>
      </div>
    </div>
  )
}
