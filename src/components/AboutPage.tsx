// AboutPage — Business Model, Operations, Complete Customer Journey and
// Payment Gateway use-case disclosure. Standalone compliance page:
// everything a payment-gateway reviewer (or customer) needs to understand
// exactly how PlayBeat Digital trades, charges, and delivers.
import React from 'react'
import {
  ArrowRight,
  Building2,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  CreditCard,
  Package,
  Search,
  ShoppingCart,
  Tag,
  UserPlus,
  KeyRound,
  Headphones,
  FileText,
  RefreshCw,
  Truck,
  Lock,
  Receipt,
  Banknote,
  Smartphone,
  CheckCircle2,
  Boxes,
  Landmark,
  Timer,
} from 'lucide-react'
import { CurrencyCode } from '../types'

interface AboutPageProps {
  currency?: CurrencyCode
}

const REGISTERED_COMPANY = 'Playbeat Digital Private Limited'
const REGISTERED_ADDRESS =
  'HOUSE 334, Street 6, Jinnahabad, Abbottabad, Pakistan'
const CONTACT_EMAIL = 'support@playbeat.digital'
const CONTACT_PHONE = '+92 332 1049333'

function Section({
  icon,
  kicker,
  title,
  children,
}: {
  icon: React.ReactNode
  kicker: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-[#0A122E]/70 border border-slate-400/15 p-6 sm:p-8 shadow-xl space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-2xl bg-[#081028] border border-yellow-400/30 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-yellow-400/90">
            {kicker}
          </p>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="text-xs sm:text-[13px] text-slate-300 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  )
}

export const AboutPage: React.FC<AboutPageProps> = ({ currency = 'PKR' }) => {
  const journeySteps = [
    {
      icon: <Search className="w-4 h-4" />,
      title: 'Browse the catalogue',
      text: 'Customers land on playbeat.digital and browse the storefront, category pages (Streaming, Software, Gaming, Gift Cards, AI Subscriptions, Smart Projectors and more) or use search and filters. Every product has its own shareable page with full description, images and price.',
    },
    {
      icon: <Tag className="w-4 h-4" />,
      title: 'Choose a product & plan',
      text: 'On the product page the customer picks a plan or variant (for example 1 / 3 / 6 / 12-month subscription durations), reviews exactly what is included, and sees the price in their chosen display currency — Pakistani Rupee (PKR) by default.',
    },
    {
      icon: <ShoppingCart className="w-4 h-4" />,
      title: 'Add to cart',
      text: 'The item is added to the shopping cart. Signed-in customers get a server-side cart that follows their account across devices. Quantities can be adjusted and digital items are delivered without shipping charges.',
    },
    {
      icon: <Tag className="w-4 h-4" />,
      title: 'Apply a coupon (optional)',
      text: 'A discount coupon code — when one is available — is entered at checkout. Coupons are validated server-side against minimum order value, expiry date, usage limits and product scope before any discount is applied to the total.',
    },
    {
      icon: <UserPlus className="w-4 h-4" />,
      title: 'Sign in & check out',
      text: 'Checkout requires an account (email or Google/Facebook sign-in) so the order, invoice and delivered keys are tied to a customer profile. The order summary shows the itemised total in PKR before any payment is requested.',
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      title: 'Pay through the payment gateway',
      text: 'The customer picks a payment method — EasyPaisa, JazzCash, debit/credit card via our payment gateway, or Binance Pay for crypto — and completes the payment on the provider\'s secure, hosted checkout. Full card and wallet credentials are entered on the gateway\'s page, never on ours.',
    },
    {
      icon: <CheckCircle2 className="w-4 h-4" />,
      title: 'Order confirmation',
      text: 'Once the gateway confirms the payment (via signed webhook verification), the order is marked as paid, a branded invoice with a unique invoice number is generated automatically, and a confirmation is shown on screen with the order number.',
    },
    {
      icon: <KeyRound className="w-4 h-4" />,
      title: 'Instant digital delivery',
      text: 'License keys, activation codes and download links are released automatically to the customer\'s Account → Orders and Alerts area immediately after payment confirmation, along with activation instructions. Hardware items are dispatched by tracked courier with a tracking number.',
    },
    {
      icon: <Headphones className="w-4 h-4" />,
      title: 'After-sales support & warranty',
      text: 'Every purchase is covered by our warranty and refund policies. Customers can reach support 24/7 via live chat, WhatsApp, email or phone; issues are tracked as tickets until resolved, and refunds (where eligible) are returned to the original payment method.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-12 space-y-8">
        <button
          onClick={() => (window.location.href = '/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-yellow-300 transition mb-2"
        >
          <span className="rotate-180 inline-flex">
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
          Back to Storefront
        </button>

        {/* ============ HERO ============ */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0A122E] via-[#0C1430] to-[#0A122E] border border-yellow-400/25 p-7 sm:p-10 relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full bg-yellow-500/[0.07] blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-[10px] font-mono uppercase tracking-[0.18em] text-yellow-300">
              <Store className="w-3.5 h-3.5" /> About &amp; Business Model
            </span>
            <h1 className="mt-4 text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              How PlayBeat Digital works — our business model,
              <br className="hidden sm:block" /> your customer journey, and how payments are processed
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              This page explains exactly what {REGISTERED_COMPANY} sells, how the business operates,
              the complete journey a customer follows from browsing to receiving their order, and how
              our payment gateway is used during checkout. It exists so customers, banks and payment
              partners can understand our operations with full transparency.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#060B1E]/80 border border-slate-400/15">
                <div className="flex items-center gap-2 mb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Registered entity
                  </span>
                </div>
                <p className="text-xs font-bold text-white leading-snug">{REGISTERED_COMPANY}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Private limited company registered in Pakistan
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#060B1E]/80 border border-slate-400/15">
                <div className="flex items-center gap-2 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Registered office
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed">{REGISTERED_ADDRESS}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#060B1E]/80 border border-slate-400/15">
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    What we trade
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed">
                  Digital products (subscriptions, license keys, gift cards) + smart projector
                  hardware, sold online at playbeat.digital
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============ BUSINESS MODEL ============ */}
        <Section
          icon={<Store className="w-5 h-5 text-yellow-400" />}
          kicker="Section 1"
          title="Our business model — what we sell and how we operate"
        >
          <p>
            {REGISTERED_COMPANY} ("PlayBeat", "we", "us") operates{' '}
            <span className="text-yellow-300 font-semibold">playbeat.digital</span>, an online
            e-commerce storefront registered and operating in Pakistan. We retail two product lines
            to consumers and small businesses:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-white">1. Digital products (main line)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Streaming subscriptions (Netflix, Spotify, Prime Video and similar), software
                licenses (Windows, Office, antivirus, creative software), AI tool subscriptions
                (ChatGPT and comparable services), gaming keys, and gift cards for platforms such as
                PlayStation, Steam, Xbox and Apple. After a verified payment we deliver these
                electronically — license keys, activation codes or access credentials — through the
                customer's account and email.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-white">2. Hardware (secondary line)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Smart 4K projectors and accessories (stands, batteries, remotes) which we stock and
                dispatch by tracked courier across Pakistan, free of shipping charges. Hardware is
                sold brand-new with a one-year manufacturer warranty.
              </p>
            </div>
          </div>
          <p>
            <span className="text-white font-semibold">How we make money:</span> we buy genuine
            licenses, subscriptions and hardware at wholesale from authorised distributors and
            regional partners, then resell them to customers at a retail margin. The price displayed
            on each product page is the full price the customer pays — we do not charge any separate
            handling, membership or hidden fees, and digital delivery is always free. Revenue is
            therefore the difference between our wholesale cost and the retail price, minus payment
            gateway processing fees.
          </p>
          <p>
            <span className="text-white font-semibold">Who we serve:</span> end consumers in
            Pakistan (our primary market, billed in PKR through local payment rails such as
            EasyPaisa and JazzCash) and international customers, who can view indicative prices in
            their own currency using the site's built-in currency converter. Customers must be 18+
            or transact with guardian consent, as set out in our Terms &amp; Conditions.
          </p>
        </Section>

        {/* ============ CUSTOMER JOURNEY ============ */}
        <Section
          icon={<Timer className="w-5 h-5 text-yellow-400" />}
          kicker="Section 2"
          title="The complete customer journey — from browsing to delivery"
        >
          <p>
            The following is the exact sequence a customer follows when buying on PlayBeat Digital.
            Digital orders normally complete end-to-end in under fifteen minutes; hardware delivery
            adds a 1-4 working day courier transit depending on city.
          </p>
          <ol className="space-y-3 mt-1">
            {journeySteps.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-3.5 p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15"
              >
                <span className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center shrink-0 text-yellow-300 font-mono font-bold text-xs">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-xs font-bold text-white">
                    <span className="text-yellow-400">{s.icon}</span>
                    {s.title}
                  </span>
                  <span className="block text-[11px] text-slate-300 leading-relaxed mt-1">
                    {s.text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* ============ PAYMENT GATEWAY USE CASE ============ */}
        <Section
          icon={<CreditCard className="w-5 h-5 text-yellow-400" />}
          kicker="Section 3"
          title="How we use the payment gateway — intended use case"
        >
          <p>
            Our payment gateway is used for <span className="text-white font-semibold">
            one purpose only</span>: collecting customer payments for products ordered on
            playbeat.digital at checkout. We are a retail merchant — we do not use the gateway to
            accept donations, transfer funds between individuals, process payments on behalf of
            third parties, or collect money for any product or service that is not listed and priced
            on this website.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2.5">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Payment methods offered</span>
              </div>
              <ul className="text-[11px] text-slate-300 leading-relaxed space-y-1.5 list-none">
                <li>• EasyPaisa — Pakistani mobile wallet</li>
                <li>• JazzCash — Pakistani mobile wallet</li>
                <li>• Debit &amp; credit cards — Visa / Mastercard, processed on the gateway's hosted page</li>
                <li>• Binance Pay — cryptocurrency settlement for international customers</li>
              </ul>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Charges are presented in Pakistani Rupees (PKR). Card-equivalent international
                transactions are converted by the issuing bank at the bank's own rate.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">How the payment flow works</span>
              </div>
              <ul className="text-[11px] text-slate-300 leading-relaxed space-y-1.5 list-none">
                <li>• At checkout the customer is redirected to the gateway's secure, hosted payment page — card and wallet credentials are entered there, never on our servers.</li>
                <li>• The gateway processes the charge and notifies our server through a cryptographically signed webhook; only verified webhooks can mark an order as paid.</li>
                <li>• On verified payment the order is confirmed, an invoice is issued, and digital keys are released automatically.</li>
                <li>• We never see or store full card numbers — sensitive payment data stays with the PCI-DSS compliant processor.</li>
              </ul>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-400/25 flex gap-3">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-200 leading-relaxed">
              <span className="font-semibold text-white">Refunds:</span> where a refund is approved
              under our Refund Policy, it is returned through the same gateway to the original
              payment method used at checkout — cards and wallets are refunded via the gateway
              within 5-7 business days, and crypto payments are returned to the source wallet within
              48 hours. We never ask customers to pay through personal accounts, agent numbers, or
              any channel outside this website's checkout.
            </p>
          </div>
        </Section>

        {/* ============ PRICING & CURRENCY ============ */}
        <Section
          icon={<Banknote className="w-5 h-5 text-yellow-400" />}
          kicker="Section 4"
          title="Pricing & currency — billed in PKR, viewable worldwide"
        >
          <p>
            All products are priced and billed in{' '}
            <span className="text-yellow-300 font-semibold">Pakistani Rupees (PKR)</span>, which is
            the currency shown by default across the storefront and on every invoice. For
            international customers the site includes a built-in currency converter — the globe/flag
            selector in the header switches every displayed price between PKR, USD, EUR, GBP, AED,
            SAR and CAD using indicative conversion rates, so international buyers always see an
            approximate local price before checkout.
          </p>
          <p>
            The currency actually charged at checkout is PKR (our gateway settles in rupees). Where
            a customer's card or wallet is denominated in another currency, the conversion to that
            currency is performed by the issuing bank at the bank's own rate, which may differ
            slightly from the indicative rate shown on our site. No surcharge of any kind is added
            for using the converter or for paying with any supported method.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['PKR — default billing currency', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD — indicative display only'].map(
              (c) => (
                <span
                  key={c}
                  className="px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-slate-300"
                >
                  {c}
                </span>
              )
            )}
          </div>
        </Section>

        {/* ============ OPERATIONS & COMPLIANCE ============ */}
        <Section
          icon={<Landmark className="w-5 h-5 text-yellow-400" />}
          kicker="Section 5"
          title="Operations, fulfilment & compliance"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-white">Invoicing &amp; records</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Every paid order automatically receives a branded invoice with a unique invoice
                number, itemised line items and the payment status, available to the buyer in their
                account and printable as PDF. Order, inventory and administrative records are
                retained for audit and tax purposes in line with our Privacy Policy.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">Delivery</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Digital products are delivered electronically to the buyer's account and email —
                typically within seconds of payment confirmation. Hardware ships free within
                Pakistan by tracked courier (1-4 working days by city) with SMS and email tracking.
                Full details are in our Shipping &amp; Delivery Policy.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold text-white">Data protection</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                We collect only the data needed to fulfil orders and support customers, never sell
                personal data, and store credentials as bcrypt hashes. Payment credentials are
                handled exclusively by the PCI-DSS compliant gateway. Details are in our Privacy
                Policy.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 space-y-2">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Support &amp; disputes</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Support is available 24/7 through live chat, WhatsApp, email and phone, with tickets
                tracked until resolution. Refund eligibility and the disputes process are defined in
                our Refund Policy and Terms &amp; Conditions.
              </p>
            </div>
          </div>
        </Section>

        {/* ============ POLICY LINKS ============ */}
        <section className="rounded-3xl bg-[#0A122E]/70 border border-slate-400/15 p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <FileText className="w-5 h-5 text-yellow-400" />
            Our policies — all readable in full on this site
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed mt-3">
            Every document below is published on this website and applies to all orders placed
            through playbeat.digital. By completing a purchase the customer confirms they have had
            the opportunity to read them.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            {[
              { href: '/refund-policy', icon: <RefreshCw className="w-4 h-4" />, t: 'Refund Policy', s: 'Eligibility, timelines & how to request' },
              { href: '/privacy', icon: <Lock className="w-4 h-4" />, t: 'Privacy Policy', s: 'Data we collect & your rights' },
              { href: '/terms', icon: <FileText className="w-4 h-4" />, t: 'Terms & Conditions', s: 'The rules governing every order' },
              { href: '/shipping-policy', icon: <Truck className="w-4 h-4" />, t: 'Shipping & Delivery Policy', s: 'Digital + hardware delivery times' },
              { href: '/warranty', icon: <ShieldCheck className="w-4 h-4" />, t: 'Warranty & Replacement', s: 'Coverage & how to claim' },
              { href: '/contact', icon: <Headphones className="w-4 h-4" />, t: 'Contact & Support', s: '24/7 channels & office address' },
            ].map((b) => (
              <a
                key={b.href}
                href={b.href}
                className="group flex items-start gap-3 p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 hover:border-yellow-400/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <span className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center shrink-0 text-yellow-400 group-hover:scale-110 transition-transform">
                  {b.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white truncate">{b.t}</span>
                  <span className="block text-[10px] text-slate-400 leading-snug mt-0.5">{b.s}</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* ============ CONTACT ============ */}
        <section className="rounded-3xl bg-gradient-to-r from-[#0A122E]/95 via-[#0D1531] to-[#0A122E]/95 border border-yellow-400/25 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Headphones className="w-5 h-5 text-yellow-400" />
            Contact PlayBeat
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Real humans, real channels — pick whichever suits you best.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="group flex items-center gap-3 p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 hover:border-yellow-400/50 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-yellow-500/15 border border-yellow-400/30 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-yellow-400" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-white">Email Us</span>
                <span className="block text-[10px] text-slate-400 truncate group-hover:text-yellow-300 transition">
                  {CONTACT_EMAIL}
                </span>
              </span>
            </a>
            <a
              href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
              className="group flex items-center gap-3 p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 hover:border-sky-400/50 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-sky-400" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-white">Call / WhatsApp 24/7</span>
                <span className="block text-[10px] text-slate-400 font-mono group-hover:text-sky-300 transition">
                  {CONTACT_PHONE}
                </span>
              </span>
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(REGISTERED_ADDRESS)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-4 rounded-2xl bg-[#060B1E] border border-slate-400/15 hover:border-pink-400/50 transition"
            >
              <span className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-400/30 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-pink-400" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-white">Registered Office</span>
                <span className="block text-[10px] text-slate-400 leading-snug group-hover:text-pink-300 transition">
                  {REGISTERED_ADDRESS}
                </span>
              </span>
            </a>
          </div>
        </section>

        <p className="text-[10px] text-slate-500 font-mono text-center pb-4">
          PlayBeat Digital Pvt Ltd · playbeat.digital · This page is reviewed together with our
          policies at least once every twelve months.
        </p>
      </div>
    </div>
  )
}
