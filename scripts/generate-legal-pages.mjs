// generate-legal-pages.mjs
// Generates fully static, crawlable HTML documents for every legal/policy URL
// so search engines and non-JS crawlers see real content with unique titles —
// instead of the SPA homepage shell. Output: public/<slug>.html
// Run automatically before every build (see package.json / vercel.json).
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = join(ROOT, 'public')
const SITE = 'https://playbeat.digital'
const UPDATED = 'August 2026'

const CONTACT = {
  email: 'support@playbeat.digital',
  whatsapp: '+92 332 1049333',
  address: 'House 334, Street 6, Jinnahabad, Abbottabad, Khyber Pakhtunkhwa, Pakistan',
}

const PAGES = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    description:
      'PlayBeat Digital Privacy Policy — what personal data we collect, how we use and protect it, retention periods, and your privacy rights.',
    heading: 'Privacy Policy',
    subtitle: 'How PlayBeat Digital collects, uses, and protects your personal data.',
    sections: [
      ['1. Who We Are', [
        'PlayBeat Digital Pvt Ltd ("PlayBeat", "we", "us") operates an online marketplace for digital licenses, subscriptions, and smart hardware at playbeat.digital. This Privacy Policy explains what personal data we collect when you browse, register, purchase, or contact us, the legal basis on which we process it, and the rights you can exercise over it. By using the storefront you accept the practices described here, so please read it carefully alongside our Terms of Service.',
      ]],
      ['2. Data We Collect', [
        'When you create an account or complete a purchase we collect your full name, email address, optional contact number, and payment method metadata (such as the gateway used and transaction reference). We never store full credit or debit card numbers — all card processing is handled by PCI-DSS compliant gateways including Visa, Mastercard, EasyPaisa, JazzCash, Binance Pay, and Apple Pay. If you sign up using a social provider (Google, Facebook, TikTok, or Instagram) we receive your name, email, and provider account identifier from that platform, nothing more.',
        'We also collect technical data automatically: device type, browser, approximate region, referring page, and on-site activity such as pages viewed and products opened. This analytics data is aggregate and is used to improve page performance and product placement.',
      ]],
      ['3. How We Use Your Data', [
        'Your data is used to fulfil orders (including instant automated delivery of digital license keys to your email), provide warranty and replacement tracking, prevent fraudulent transactions, offer customer support through your preferred channel, and display your order history inside your account dashboard. Marketing emails are only sent when you explicitly opt in, and every campaign carries a one-click unsubscribe link.',
      ]],
      ['4. Data Sharing', [
        'We do not sell or rent personal data to anyone. We share the minimum data necessary with payment processors to approve transactions, with courier partners (name, address, phone) for physical hardware shipments, and with social providers when you choose to authenticate through them. We may disclose data where required by Pakistani law enforcement under valid legal process.',
      ]],
      ['5. Storage & Retention', [
        'Account and order records are retained for as long as your account is active plus five years, to satisfy tax and audit requirements in Pakistan. Analytics events are retained in aggregate for 24 months. Passwords are stored only as bcrypt hashes, and administrative sessions use signed, expiring tokens — we never store your password in plain text anywhere.',
      ]],
      ['6. Your Rights', [
        'You may request access to, correction of, or deletion of your personal data at any time by emailing ' + CONTACT.email + ' with the subject "Privacy Request". We verify all requests and respond within 72 hours. You may also request a portable copy of your data, or object to marketing processing entirely, without affecting your ability to shop with us.',
      ]],
      ['7. Contact & Governing Law', [
        'Questions about this policy can be sent to ' + CONTACT.email + ' or via WhatsApp at ' + CONTACT.whatsapp + '. Our registered office is ' + CONTACT.address + '. This policy is governed by the laws of the Islamic Republic of Pakistan, and is reviewed at least once every twelve months.',
      ]],
    ],
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    description:
      'PlayBeat Digital Terms & Conditions — accounts, payments, digital delivery, acceptable use, liability, refunds and dispute resolution rules.',
    heading: 'Terms & Conditions',
    subtitle: 'The rules and agreements that govern your use of the PlayBeat marketplace.',
    sections: [
      ['1. Acceptance of Terms', [
        'By accessing, browsing, or purchasing from the PlayBeat Digital marketplace you agree to be bound by these Terms of Service, our Privacy Policy, and our Refund Policy. If you do not agree with any part of these terms, you must discontinue use of the platform immediately. We may update these terms from time to time; the version published on this page is the version that applies to your orders.',
      ]],
      ['2. Accounts & Eligibility', [
        'You must be at least 18 years old, or have the consent and supervision of a parent or legal guardian, to create an account and transact. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. Signing up through Google, Facebook, TikTok, or Instagram binds that social identity to your PlayBeat account. Notify us immediately of any unauthorized access.',
      ]],
      ['3. Digital License Usage', [
        'All digital license keys, subscription accounts, and access credentials delivered by PlayBeat are licensed for the buyer\'s personal use only unless a product is explicitly marked as a "Commercial License". Reselling, sharing, redistributing, or publicly posting keys is strictly prohibited and will result in immediate account termination without refund. License warranties are void if activation instructions included with your delivery email are not followed.',
      ]],
      ['4. Hardware Orders', [
        'Smart projectors and other hardware are sold brand-new with a manufacturer warranty of one year unless stated otherwise on the product page. Hardware prices include standard courier dispatch within Pakistan. Risk of loss passes to you on courier hand-over; warranty claims are processed through our support channels described on the Contact page.',
      ]],
      ['5. Pricing, Payment & Availability', [
        'Prices are listed in Pakistani Rupees (PKR) by default and can be viewed in other currencies using indicative conversion rates; your bank may apply its own rate. We accept Visa, Mastercard, EasyPaisa, JazzCash, Binance Pay, and Apple Pay. Products may be withdrawn or restocked at any time; if an item becomes unavailable after payment we issue a full refund or an equivalent replacement of your choice.',
      ]],
      ['6. Acceptable Use', [
        'You agree not to scrape, reverse engineer, or disrupt the storefront, attempt unauthorised access to administrative systems, upload malicious content, or use purchased products for any unlawful purpose. We reserve the right to refuse service, cancel orders, and freeze accounts where abuse, chargeback fraud, or reseller activity is detected.',
      ]],
      ['7. Liability & Disputes', [
        'PlayBeat\'s maximum liability for any single transaction is limited to the amount you paid for the affected product. We are not liable for indirect or consequential losses arising from misuse of digital products or from platform downtime. Disputes will first be addressed through our support team and, if unresolved, settled through binding arbitration in Karachi, Pakistan.',
      ]],
    ],
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    description:
      'PlayBeat Digital Refund Policy — eligibility, exclusions, request process, refund timeframes for digital keys, subscriptions, and hardware.',
    heading: 'Refund Policy',
    subtitle: 'When refunds and replacements are available, and how to request one.',
    sections: [
      ['1. Our Guarantee', [
        'PlayBeat offers a 24-hour satisfaction guarantee on every digital license purchase. If a key fails to activate, is already redeemed, or proves invalid, we will issue a replacement key or a full refund within 24 hours of verifying your complaint. Hardware purchases are covered separately by the one-year warranty described in our Warranty Policy.',
      ]],
      ['2. Eligible for Refund or Replacement', [
        'You are entitled to a refund or free replacement when: the license key is invalid or already activated by someone else; delivery of a digital product does not arrive within 15 minutes of a successful payment; you were charged twice for the same product; or you cancel an order before the digital key has been generated and dispatched. Video proof or screenshots of the activation failure speed up verification considerably.',
      ]],
      ['3. Not Eligible for Refund', [
        'Refunds cannot be issued where: the key has been successfully activated by you; the warranty window on a subscription account has expired; the product was marked "Final Sale"; your account was banned by the upstream provider for activity unrelated to product validity; or delivery failed because you supplied an incorrect email address. Hardware that has been physically damaged, opened, or used beyond testing is not refundable but may be repairable under warranty.',
      ]],
      ['4. Hardware Warranty Claims', [
        'Smart projectors carry a one-year manufacturer warranty. For claims, contact support with your order number and a short video of the fault. Approved hardware claims receive courier pickup instructions; repaired or replaced units are dispatched within 7-14 working days of receiving the faulty unit at our service centre.',
      ]],
      ['5. How to Request a Refund', [
        'Email ' + CONTACT.email + ' (or message us on WhatsApp at ' + CONTACT.whatsapp + ') with your order number, a description of the issue, and any screenshots. Refund requests should be submitted within 7 days of the delivery date. Approved refunds are credited back to the original payment method within 5-7 business days of approval. Wallet and cryptocurrency refunds are returned to the source wallet within 48 hours. If a refund is refused you will always receive a written explanation and the option to escalate.',
      ]],
    ],
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping & Digital Delivery Policy',
    description:
      'PlayBeat Digital Shipping & Delivery Policy — instant email delivery for digital keys, courier timelines for smart projectors, tracking and lost parcels.',
    heading: 'Shipping & Digital Delivery Policy',
    subtitle: 'Instant digital delivery and courier timelines for hardware orders.',
    sections: [
      ['1. Digital Products — Instant Delivery', [
        'Digital licenses, subscriptions, and game keys are delivered automatically to the email address on your order, typically within 15 seconds of payment confirmation and never later than 15 minutes during gateway incidents. The delivery email includes your license key, activation instructions, and warranty terms. If the email does not arrive, check spam first, then contact support — we can re-issue any delivery instantly from the order log.',
      ]],
      ['2. Hardware — Courier Dispatch', [
        'Smart projectors and bundled hardware ship free of charge anywhere in Pakistan via tracked courier. Orders confirmed before 2:00 PM PKT are dispatched the same working day; later orders dispatch the next business day. Typical transit times are 1-3 working days for major cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan) and 2-4 working days for remote districts. Every hardware order ships with a tracking number sent by SMS and email.',
      ]],
      ['3. International Orders', [
        'Digital products are delivered worldwide instantly at no shipping cost. Hardware shipped outside Pakistan is quoted individually — contact us with your delivery city for a freight quote that includes customs handling. Import duties, if any, are payable by the recipient.',
      ]],
      ['4. Failed or Delayed Deliveries', [
        'If a courier parcel is delayed beyond the estimated window, contact us and we will open a trace with the courier immediately. Parcels lost in transit are replaced or refunded in full at our cost. Incorrect delivery details supplied by the customer are re-dispatched at the customer\'s expense once corrected. Deliveries sent to a valid address submitted by the customer are considered fulfilled; please double-check your contact details at checkout.',
      ]],
    ],
  },
  {
    slug: 'warranty',
    title: 'Warranty & Replacement Policy',
    description:
      'PlayBeat Digital Warranty & Replacement Policy — full-duration digital warranties, one-year hardware coverage, claim process and timelines.',
    heading: 'Warranty & Replacement Policy',
    subtitle: 'Coverage, warranty periods, and how to claim a replacement or repair.',
    sections: [
      ['1. Warranty Coverage Overview', [
        'Every product sold on PlayBeat Digital is covered by a written warranty. Digital license keys, subscriptions, and accounts carry a full-duration stability warranty — meaning your purchase is protected from the moment of activation until the exact end date of the plan you paid for. Smart projectors and other hardware carry a one-year manufacturer warranty from the date of delivery, covering manufacturing defects, component failures, and dead-pixel issues beyond the threshold stated on the product page.',
      ]],
      ['2. Digital Products — What Is Covered', [
        'If a license key fails to activate, is flagged as already redeemed, is disabled by the upstream provider without cause, or an account loses access before the paid period ends, PlayBeat will repair, replace, or re-issue the product at no cost. Claims are verified against our fulfilment logs and your order number, so always keep your delivery email. Warranty on digital products is void only when activation instructions were not followed, the key was used on a device or region explicitly marked as unsupported, or the account was suspended for terms violations unrelated to product validity.',
      ]],
      ['3. Smart Projectors — What Is Covered', [
        'Hardware warranty covers optical engine faults, mainboard and power failures, speaker defects, remote control malfunction, and WiFi/Bluetooth module failures that occur under normal household use. It does not cover accidental drops, liquid damage, unauthorized opening of the chassis, firmware modification, or electrical damage from non-standard power sources. Accessories such as stands, cables, and lens caps are covered for 90 days against manufacturing defects only.',
      ]],
      ['4. How to Claim', [
        'Start a claim within your warranty period by contacting support with your order number and a short description (photos or video help enormously). For digital items we verify and re-issue within 24 hours in most cases. For hardware, approved claims receive courier pickup instructions; our technicians test the unit and either repair it on site or dispatch a replacement within 7-14 working days of receiving the faulty item at our service centre. Return shipping for approved warranty claims is paid by PlayBeat.',
      ]],
      ['5. Replacement vs Refund', [
        'Within the first 24 hours after purchase you may choose between a replacement or a full refund. After that window, warranty claims are fulfilled as replacements or repairs first; a pro-rata refund is offered only when no equivalent replacement is available in stock. Refund processing timelines and exclusions are described in detail in our Refund Policy, which works together with this document.',
      ]],
      ['6. Warranty Extensions', [
        'Selected projector bundles include an extended 24-month warranty, shown on the product page and printed on your invoice. Extended warranty claims follow the same process described above. If you are unsure what coverage applies to your order, message our team through the live chat widget, email ' + CONTACT.email + ', or WhatsApp ' + CONTACT.whatsapp + ' — include your order number and we will confirm your coverage instantly.',
      ]],
    ],
  },
]

const RELATED = [
  ['/privacy', 'Privacy Policy'],
  ['/terms', 'Terms of Service'],
  ['/refund-policy', 'Refund Policy'],
  ['/shipping-policy', 'Shipping & Delivery'],
  ['/warranty', 'Warranty'],
]

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function render(page) {
  const url = `${SITE}/${page.slug}`
  const sections = page.sections
    .map(
      ([h, ps]) =>
        `      <section class="doc-section"><h2>${esc(h)}</h2>${ps
          .map((p) => `      <p>${esc(p)}</p>`)
          .join('\n      ')}</section>`
    )
    .join('\n')
  const related = RELATED.filter(([p]) => `/${page.slug}` !== p)
    .map(([p, l]) => `      <a class="chip" href="${p}">${l}</a>`)
    .join('\n')
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: `${page.title} — PlayBeat Digital`,
        description: page.description,
        url,
        isPartOf: { '@id': `${SITE}/#website` },
        publisher: { '@id': `${SITE}/#organization` },
        dateModified: UPDATED,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: page.title, item: url },
        ],
      },
    ],
  })

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${page.title} | PlayBeat Digital</title>
  <meta name="description" content="${page.description}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${url}" />
  <meta property="og:site_name" content="PlayBeat Digital" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${page.title} | PlayBeat Digital" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:url" content="${url}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${page.title} | PlayBeat Digital" />
  <meta name="twitter:description" content="${page.description}" />
  <link rel="icon" type="image/png" href="/playbeat-logo.png" />
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #050814; color: #cbd5e1; line-height: 1.7; font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }
    .topbar {
      position: sticky; top: 0; z-index: 10; display: flex; align-items: center;
      justify-content: space-between; gap: 12px; padding: 14px 22px;
      background: rgba(6, 11, 30, .95); border-bottom: 1px solid rgba(148,163,184,.12);
      backdrop-filter: blur(14px);
    }
    .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
    .brand img { height: 34px; width: auto; }
    .brand span { color: #fff; font-weight: 800; font-size: 15px; letter-spacing: .2px; }
    .back {
      color: #fbbf24; text-decoration: none; font-size: 13px; font-weight: 700;
      padding: 8px 14px; border: 1px solid rgba(251,191,36,.35); border-radius: 999px;
      white-space: nowrap;
    }
    .back:hover { background: rgba(251,191,36,.1); }
    main { max-width: 860px; margin: 0 auto; padding: 44px 20px 64px; }
    .kicker {
      display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: #fbbf24; background: rgba(251,191,36,.08);
      border: 1px solid rgba(251,191,36,.3); border-radius: 999px; padding: 5px 12px; margin-bottom: 18px;
    }
    h1 { color: #fff; font-size: clamp(26px, 4.5vw, 36px); font-weight: 800; letter-spacing: -.02em; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-top: 8px; }
    .meta {
      display: inline-flex; gap: 8px; align-items: center; margin: 18px 0 30px;
      font-size: 12px; color: #94a3b8; background: #081028; border: 1px solid rgba(148,163,184,.16);
      border-radius: 999px; padding: 6px 14px;
    }
    .card {
      background: rgba(10, 18, 46, .7); border: 1px solid rgba(148,163,184,.15);
      border-radius: 22px; padding: clamp(20px, 4vw, 38px);
    }
    .doc-section { margin-bottom: 26px; }
    .doc-section:last-child { margin-bottom: 0; }
    h2 { color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 10px; letter-spacing: -.01em; }
    p { margin-bottom: 10px; }
    p:last-child { margin-bottom: 0; }
    .contact {
      margin-top: 28px; background: rgba(10,18,46,.7); border: 1px solid rgba(251,191,36,.25);
      border-radius: 22px; padding: 22px clamp(18px, 3.5vw, 30px);
    }
    .contact h2 { font-size: 14px; }
    .contact a { color: #fbbf24; text-decoration: none; font-weight: 600; }
    .contact a:hover { text-decoration: underline; }
    .related { margin-top: 30px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .related .label { font-size: 12px; color: #64748b; margin-right: 4px; }
    .chip {
      font-size: 12px; font-weight: 600; color: #cbd5e1; text-decoration: none;
      background: #0a122e; border: 1px solid rgba(148,163,184,.16);
      padding: 8px 14px; border-radius: 12px;
    }
    .chip:hover { color: #fbbf24; border-color: rgba(251,191,36,.45); }
    footer {
      border-top: 1px solid rgba(148,163,184,.12); margin-top: 48px; padding: 24px 20px 34px;
      text-align: center; color: #64748b; font-size: 12px;
    }
    footer a { color: #94a3b8; text-decoration: none; }
    footer a:hover { color: #fbbf24; }
  </style>
</head>
<body>
  <div class="topbar">
    <a class="brand" href="/">
      <img src="/playbeat-logo.png" alt="PlayBeat Digital logo" />
      <span>PlayBeat Digital</span>
    </a>
    <a class="back" href="/">&larr; Back to Store</a>
  </div>
  <main>
    <span class="kicker">Legal</span>
    <h1>${esc(page.heading)}</h1>
    <p class="subtitle">${esc(page.subtitle)}</p>
    <div class="meta">PlayBeat Digital Pvt Ltd &middot; Version ${UPDATED} &middot; Last updated: ${UPDATED}</div>
    <div class="card">
${sections}
    </div>
    <div class="contact">
      <h2>Contact Us</h2>
      <p>Email: <a href="mailto:${CONTACT.email}">${CONTACT.email}</a> &middot; WhatsApp: ${CONTACT.whatsapp}</p>
      <p>Registered office: ${esc(CONTACT.address)}</p>
    </div>
    <div class="related">
      <span class="label">Related:</span>
${related}
      <a class="chip" href="/contact">Contact</a>
    </div>
  </main>
  <footer>
    &copy; ${new Date().getFullYear()} <a href="/">PlayBeat Digital</a> &mdash; Premium Digital Marketplace &amp; Smart Projectors
  </footer>
</body>
</html>
`
}

mkdirSync(PUBLIC, { recursive: true })
for (const page of PAGES) {
  const file = join(PUBLIC, `${page.slug}.html`)
  writeFileSync(file, render(page), 'utf8')
  console.log(`generated ${file}`)
}
console.log('Legal pages generated successfully.')
