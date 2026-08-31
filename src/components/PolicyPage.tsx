import React from 'react'
import { Lock, FileText, RefreshCw, Truck, Mail, ArrowRight } from 'lucide-react'

export type PolicyType = 'privacy' | 'terms' | 'refund-policy' | 'shipping-policy'

interface PolicyPageProps {
  type: PolicyType
  contact?: { email?: string; whatsapp?: string; phone?: string; address?: string }
}

const META: Record<PolicyType, { title: string; subtitle: string; icon: React.ReactNode; updated: string }> = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How PlayBeat Digital collects, uses, and protects your personal data.',
    icon: <Lock className="w-5 h-5 text-yellow-400" />,
    updated: 'August 2026',
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'The rules and agreements that govern your use of the PlayBeat marketplace.',
    icon: <FileText className="w-5 h-5 text-yellow-400" />,
    updated: 'August 2026',
  },
  'refund-policy': {
    title: 'Refund Policy',
    subtitle: 'When refunds and replacements are available, and how to request one.',
    icon: <RefreshCw className="w-5 h-5 text-yellow-400" />,
    updated: 'August 2026',
  },
  'shipping-policy': {
    title: 'Shipping & Delivery Policy',
    subtitle: 'Instant digital delivery and courier timelines for hardware orders.',
    icon: <Truck className="w-5 h-5 text-yellow-400" />,
    updated: 'August 2026',
  },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-white font-sans tracking-tight">{title}</h3>
      <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-2">{children}</div>
    </div>
  )
}

export const PolicyPage: React.FC<PolicyPageProps> = ({ type, contact }) => {
  const meta = META[type]
  const supportEmail = contact?.email || 'support@playbeat.digital'
  const whatsapp = contact?.whatsapp || '923000000000'
  const address = contact?.address || 'PlayBeat Digital Pvt Ltd, Gulberg III, Lahore, Pakistan'

  const body: Record<PolicyType, React.ReactNode> = {
    privacy: (
      <>
        <Section title="1. Who We Are">
          <p>
            PlayBeat Digital Pvt Ltd ("PlayBeat", "we", "us") operates an online marketplace for digital
            licenses, subscriptions, and smart hardware at playbeat.digital. This Privacy Policy explains what
            personal data we collect when you browse, register, purchase, or contact us, the legal basis on
            which we process it, and the rights you can exercise over it. By using the storefront you accept
            the practices described here, so please read it carefully alongside our Terms of Service.
          </p>
        </Section>
        <Section title="2. Data We Collect">
          <p>
            When you create an account or complete a purchase we collect your full name, email address,
            optional contact number, and payment method metadata (such as the gateway used and transaction
            reference). We never store full credit or debit card numbers — all card processing is handled by
            PCI-DSS compliant gateways including Visa, Mastercard, EasyPaisa, JazzCash, Binance Pay, and
            Apple Pay. If you sign up using a social provider (Google, Facebook, TikTok, or Instagram) we
            receive your name, email, and provider account identifier from that platform, nothing more.
          </p>
          <p>
            We also collect technical data automatically: device type, browser, approximate region, referring
            page, and on-site activity such as pages viewed and products opened. This analytics data is
            aggregate and is used to improve page performance and product placement.
          </p>
        </Section>
        <Section title="3. How We Use Your Data">
          <p>
            Your data is used to fulfil orders (including instant automated delivery of digital license keys
            to your email), provide warranty and replacement tracking, prevent fraudulent transactions, offer
            customer support through your preferred channel, and display your order history inside your
            account dashboard. Marketing emails are only sent when you explicitly opt in, and every campaign
            carries a one-click unsubscribe link.
          </p>
        </Section>
        <Section title="4. Data Sharing">
          <p>
            We do not sell or rent personal data to anyone. We share the minimum data necessary with payment
            processors to approve transactions, with courier partners (name, address, phone) for physical
            hardware shipments, and with social providers when you choose to authenticate through them. We
            may disclose data where required by Pakistani law enforcement under valid legal process.
          </p>
        </Section>
        <Section title="5. Storage & Retention">
          <p>
            Account and order records are retained for as long as your account is active plus five years, to
            satisfy tax and audit requirements in Pakistan. Analytics events are retained in aggregate for 24
            months. Passwords are stored only as bcrypt hashes, and administrative sessions use signed,
            expiring tokens — we never store your password in plain text anywhere.
          </p>
        </Section>
        <Section title="6. Your Rights">
          <p>
            You may request access to, correction of, or deletion of your personal data at any time by
            emailing <span className="text-yellow-300">{supportEmail}</span> with the subject "Privacy
            Request". We verify all requests and respond within 72 hours. You may also request a portable
            copy of your data, or object to marketing processing entirely, without affecting your ability to
            shop with us.
          </p>
        </Section>
        <Section title="7. Contact & Governing Law">
          <p>
            Questions about this policy can be sent to {supportEmail} or via WhatsApp at +
            {whatsapp.replace(/^\+/, '')}. Our registered office is {address}. This policy is governed by the
            laws of the Islamic Republic of Pakistan, and is reviewed at least once every twelve months.
          </p>
          <p className="text-slate-500 text-[10px] pt-1">Last updated: {meta.updated}.</p>
        </Section>
      </>
    ),
    terms: (
      <>
        <Section title="1. Acceptance of Terms">
          <p>
            By accessing, browsing, or purchasing from the PlayBeat Digital marketplace you agree to be bound
            by these Terms of Service, our Privacy Policy, and our Refund Policy. If you do not agree with
            any part of these terms, you must discontinue use of the platform immediately. We may update
            these terms from time to time; the version published on this page is the version that applies to
            your orders.
          </p>
        </Section>
        <Section title="2. Accounts & Eligibility">
          <p>
            You must be at least 18 years old, or have the consent and supervision of a parent or legal
            guardian, to create an account and transact. You are responsible for maintaining the
            confidentiality of your credentials and for all activity that occurs under your account. Signing
            up through Google, Facebook, TikTok, or Instagram binds that social identity to your PlayBeat
            account. Notify us immediately of any unauthorized access.
          </p>
        </Section>
        <Section title="3. Digital License Usage">
          <p>
            All digital license keys, subscription accounts, and access credentials delivered by PlayBeat are
            licensed for the buyer's personal use only unless a product is explicitly marked as a
            "Commercial License". Reselling, sharing, redistributing, or publicly posting keys is strictly
            prohibited and will result in immediate account termination without refund. License warranties
            are void if activation instructions included with your delivery email are not followed.
          </p>
        </Section>
        <Section title="4. Hardware Orders">
          <p>
            Smart projectors and other hardware are sold brand-new with a manufacturer warranty of one year
            unless stated otherwise on the product page. Hardware prices include standard courier dispatch
            within Pakistan. Risk of loss passes to you on courier hand-over; warranty claims are processed
            through our support channels described on the Contact page.
          </p>
        </Section>
        <Section title="5. Pricing, Payment & Availability">
          <p>
            Prices are listed in Pakistani Rupees (PKR) by default and can be viewed in other currencies
            using indicative conversion rates; your bank may apply its own rate. We accept Visa, Mastercard,
            EasyPaisa, JazzCash, Binance Pay, and Apple Pay. Products may be withdrawn or restocked at any
            time; if an item becomes unavailable after payment we issue a full refund or an equivalent
            replacement of your choice.
          </p>
        </Section>
        <Section title="6. Acceptable Use">
          <p>
            You agree not to scrape, reverse engineer, or disrupt the storefront, attempt unauthorised
            access to administrative systems, upload malicious content, or use purchased products for any
            unlawful purpose. We reserve the right to refuse service, cancel orders, and freeze accounts
            where abuse, chargeback fraud, or reseller activity is detected.
          </p>
        </Section>
        <Section title="7. Liability & Disputes">
          <p>
            PlayBeat's maximum liability for any single transaction is limited to the amount you paid for the
            affected product. We are not liable for indirect or consequential losses arising from misuse of
            digital products or from platform downtime. Disputes will first be addressed through our support
            team and, if unresolved, settled through binding arbitration in Karachi, Pakistan.
          </p>
          <p className="text-slate-500 text-[10px] pt-1">Last updated: {meta.updated}.</p>
        </Section>
      </>
    ),
    'refund-policy': (
      <>
        <Section title="1. Our Guarantee">
          <p>
            PlayBeat offers a 24-hour satisfaction guarantee on every digital license purchase. If a key fails
            to activate, is already redeemed, or proves invalid, we will issue a replacement key or a full
            refund within 24 hours of verifying your complaint. Hardware purchases are covered separately by
            the one-year warranty described below.
          </p>
        </Section>
        <Section title="2. Eligible for Refund or Replacement">
          <p>
            You are entitled to a refund or free replacement when: the license key is invalid or already
            activated by someone else; delivery of a digital product does not arrive within 15 minutes of a
            successful payment; you were charged twice for the same product; or you cancel an order before
            the digital key has been generated and dispatched. Video proof or screenshots of the activation
            failure speed up verification considerably.
          </p>
        </Section>
        <Section title="3. Not Eligible for Refund">
          <p>
            Refunds cannot be issued where: the key has been successfully activated by you; the warranty
            window on a subscription account has expired; the product was marked "Final Sale"; your account
            was banned by the upstream provider for activity unrelated to product validity; or delivery
            failed because you supplied an incorrect email address. Hardware that has been physically
            damaged, opened, or used beyond testing is not refundable but may be repairable under warranty.
          </p>
        </Section>
        <Section title="4. Hardware Warranty Claims">
          <p>
            Smart projectors carry a one-year manufacturer warranty. For claims, contact support with your
            order number and a short video of the fault. Approved hardware claims receive courier pickup
            instructions; repaired or replaced units are dispatched within 7-14 working days of receiving
            the faulty unit at our service centre.
          </p>
        </Section>
        <Section title="5. How to Request a Refund">
          <p>
            Email <span className="text-yellow-300">{supportEmail}</span> (or message us on WhatsApp at +
            {whatsapp.replace(/^\+/, '')}) with your order number, a description of the issue, and any
            screenshots. Approved refunds are credited back to the original payment method within 5-7
            business days. Wallet and cryptocurrency refunds are returned to the source wallet within 48
            hours. If a refund is refused you will always receive a written explanation and the option to
            escalate.
          </p>
          <p className="text-slate-500 text-[10px] pt-1">Last updated: {meta.updated}.</p>
        </Section>
      </>
    ),
    'shipping-policy': (
      <>
        <Section title="1. Digital Products — Instant Delivery">
          <p>
            Digital licenses, subscriptions, and game keys are delivered automatically to the email address
            on your order, typically within 15 seconds of payment confirmation and never later than 15
            minutes during gateway incidents. The delivery email includes your license key, activation
            instructions, and warranty terms. If the email does not arrive, check spam first, then contact
            support — we can re-issue any delivery instantly from the order log.
          </p>
        </Section>
        <Section title="2. Hardware — Courier Dispatch">
          <p>
            Smart projectors and bundled hardware ship free of charge anywhere in Pakistan via tracked
            courier. Orders confirmed before 2:00 PM PKT are dispatched the same working day; later orders
            dispatch the next business day. Typical transit times are 1-3 working days for major cities
            (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan) and 2-4 working days for remote
            districts. Every hardware order ships with a tracking number sent by SMS and email.
          </p>
        </Section>
        <Section title="3. International Orders">
          <p>
            Digital products are delivered worldwide instantly at no shipping cost. Hardware shipped outside
            Pakistan is quoted individually — contact us with your delivery city for a freight quote that
            includes customs handling. Import duties, if any, are payable by the recipient.
          </p>
        </Section>
        <Section title="4. Failed or Delayed Deliveries">
          <p>
            If a courier parcel is delayed beyond the estimated window, contact us and we will open a trace
            with the courier immediately. Parcels lost in transit are replaced or refunded in full at our
            cost. Incorrect delivery details supplied by the customer are re-dispatched at the customer's
            expense once corrected.
          </p>
          <p className="text-slate-500 text-[10px] pt-1">Last updated: {meta.updated}.</p>
        </Section>
      </>
    ),
  }

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans">
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-12">
        <button
          onClick={() => (window.location.href = '/storefront')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-yellow-300 transition mb-8"
        >
          <span className="rotate-180 inline-flex"><ArrowRight className="w-3.5 h-3.5" /></span>
          Back to Storefront
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-[#0A122E] border border-yellow-400/30 flex items-center justify-center shrink-0">
            {meta.icon}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{meta.title}</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">{meta.subtitle}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#081028] border border-slate-400/20 text-[10px] font-mono text-slate-400 mt-3 mb-8">
          PlayBeat Digital Pvt Ltd · Version {meta.updated}
        </div>

        <div className="rounded-3xl bg-[#0A122E]/70 border border-slate-400/15 p-6 sm:p-9 space-y-6 shadow-xl">
          {body[type]}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-slate-500 mr-1">Related:</span>
          <a href="/privacy" className="px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 hover:text-yellow-300 transition">Privacy Policy</a>
          <a href="/terms" className="px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 hover:text-yellow-300 transition">Terms of Service</a>
          <a href="/refund-policy" className="px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 hover:text-yellow-300 transition">Refund Policy</a>
          <a href="/shipping-policy" className="px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 hover:text-yellow-300 transition">Shipping Policy</a>
          <a href="/contact" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 hover:text-yellow-300 transition">
            <Mail className="w-3 h-3" /> Contact
          </a>
        </div>
      </div>
    </div>
  )
}
