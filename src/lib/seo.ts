// seo.ts — per-route search-engine metadata for the SPA.
// Google indexes playbeat.digital URLs individually; a client-side app must
// therefore update <title>, description, canonical and Open Graph tags every
// time the route changes, otherwise every URL appears as the homepage.
// Admin routes are forced to noindex.

const SITE = 'https://playbeat.digital'
const DEFAULT_TITLE = 'PlayBeat Digital — Premium Digital Marketplace & Smart Projectors'
const DEFAULT_DESC =
  'Instant digital keys, gaming accounts, subscriptions, AI tools, SaaS licenses, and high-performance 4K Smart Projectors with 24/7 automated delivery.'
const DEFAULT_IMAGE = `${SITE}/assets/images/playbeat/hero-marketplace.png`

export interface RouteSeo {
  title: string
  description: string
  path: string
  image?: string
  noindex?: boolean
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(path: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = `${SITE}${path}`
}

function upsertJsonLd(path: string, name: string, description: string) {
  const id = 'route-jsonld'
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE}${path}`,
    isPartOf: { '@id': `${SITE}/#website` },
    publisher: { '@id': `${SITE}/#organization` },
  }
  el.textContent = JSON.stringify(data)
}

/** Apply per-route metadata. Call inside a useEffect keyed on the route. */
export function applyRouteSeo(seo: RouteSeo) {
  const title = seo.noindex ? `Admin — PlayBeat Digital` : `${seo.title} | PlayBeat Digital`
  const desc = seo.description || DEFAULT_DESC
  const image = seo.image ? `${SITE}${seo.image}` : DEFAULT_IMAGE

  document.title = title

  upsertMeta('name', 'description', desc)
  upsertMeta(
    'name',
    'robots',
    seo.noindex
      ? 'noindex, nofollow, noarchive'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  )

  upsertCanonical(seo.noindex ? '/admin' : seo.path)

  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', desc)
  upsertMeta('property', 'og:url', `${SITE}${seo.path}`)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:image', image)

  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', title)
  upsertMeta('name', 'twitter:description', desc)
  upsertMeta('name', 'twitter:image', image)

  if (!seo.noindex) upsertJsonLd(seo.path, seo.title, desc)
}

// ---- Catalog-wide SEO presets -------------------------------------------
// Keep titles/descriptions aligned with sitemap.xml so every indexed URL
// presents unique, accurate metadata to crawlers.

export const SEO_PRESETS: Record<string, RouteSeo> = {
  storefront: {
    title: 'Premium Digital Marketplace & Smart Projectors',
    description: DEFAULT_DESC,
    path: '/',
  },
  streaming: {
    title: 'Streaming Subscriptions — Netflix, Prime Video, Disney+, HBO Max',
    description:
      'Official Netflix, YouTube Premium, Prime Video, Disney+, HBO Max, SonyLIV, ZEE5, Crunchyroll, Hulu and more streaming plans at PlayBeat Digital prices in Pakistan.',
    path: '/streaming',
  },
  subscriptions: {
    title: 'Subscriptions & AI Tools — ChatGPT, Perplexity, Office 365, VPNs',
    description:
      'Genuine ChatGPT Plus, Perplexity Pro, Office 365, Adobe Creative Cloud, CapCut Pro, Grammarly, Turnitin and top VPN subscriptions with instant email delivery.',
    path: '/subscriptions',
  },
  giftcards: {
    title: 'Gift Cards — Xbox, PlayStation, Steam, Razer Gold, Apple',
    description:
      'Instant official gift card codes: Xbox, PlayStation Network, Steam Wallet, Razer Gold, Apple, Google Play and more — delivered to your inbox in minutes.',
    path: '/giftcards',
  },
  gaming: {
    title: 'Gaming — Xbox Game Pass, Game Keys & Wallet Top-Ups',
    description:
      'Xbox Game Pass Ultimate, Steam & game keys and gaming wallet top-ups with full-duration warranty from PlayBeat Digital.',
    path: '/gaming',
  },
  software: {
    title: 'Software Licenses — Windows 11, Office 2024, Antivirus',
    description:
      'Genuine Windows 11/10, Office 2024/2021/2019 retail keys, Adobe CC, antivirus and productivity software with instant activation support.',
    path: '/software',
  },
  'smart-projectors': {
    title: 'Smart 4K Projectors — Magcubic, HY300, HY320, HCS350 & More',
    description:
      'Shop official Magcubic, Hongtop and HY-series smart 4K projectors with full home cinema lineup, warranty and courier delivery across Pakistan.',
    path: '/smart-projectors',
  },
  'smart-4k-projectors': {
    title: 'Smart 4K Projectors — Native 1080p/4K Home Cinema',
    description:
      'Compare and buy native 4K & 1080p smart projectors with Android TV, WiFi 6 and licensed streaming — curated 4K home cinema collection.',
    path: '/smart-4k-projectors',
  },
  'ai-subscriptions': {
    title: 'AI Subscriptions — ChatGPT Plus, Perplexity Pro, Leonardo AI',
    description:
      'Premium AI tool subscriptions: ChatGPT Plus, Perplexity Pro, Leonardo AI, ElevenLabs, Google Veo, Grammarly, QuillBot and more — activated on your own account.',
    path: '/ai-subscriptions',
  },
  'steam-game-keys': {
    title: 'Steam & Game Keys — Wallet Codes, Game Pass, PSN',
    description:
      'Steam wallet codes, game keys, Xbox Game Pass and PlayStation Network cards — instant delivery with PlayBeat warranty.',
    path: '/steam-game-keys',
  },
  'windows-office': {
    title: 'Windows & Office — Genuine Retail License Keys',
    description:
      'Genuine Windows 11/10 and Microsoft Office 2024/2021/2019 license keys with instant email delivery and activation guarantee.',
    path: '/windows-office',
  },
  'creative-software': {
    title: 'Creative Software — Adobe CC, CapCut Pro, Freepik',
    description:
      'Adobe Creative Cloud, CapCut Pro, Freepik, Canva Pro and other creative software subscriptions with instant activation.',
    path: '/creative-software',
  },
  compare: {
    title: 'Projector Comparison — Hardware Specification Matrix',
    description:
      'Side-by-side hardware comparison of every PlayBeat smart projector: resolution, brightness, OS, RAM, WiFi and more.',
    path: '/compare',
  },
  warranty: {
    title: 'Warranty & Replacement Policy',
    description:
      'PlayBeat Digital warranty & replacement policy for digital keys, subscriptions and smart projectors — coverage, timelines and how to claim.',
    path: '/warranty',
  },
  privacy: {
    title: 'Privacy Policy',
    description:
      'How PlayBeat Digital collects, uses, and protects your personal data.',
    path: '/privacy',
  },
  terms: {
    title: 'Terms of Service',
    description:
      'The rules and agreements that govern your use of the PlayBeat marketplace.',
    path: '/terms',
  },
  'refund-policy': {
    title: 'Refund Policy',
    description:
      'When refunds and replacements are available, and how to request one.',
    path: '/refund-policy',
  },
  'shipping-policy': {
    title: 'Shipping & Delivery Policy',
    description:
      'Instant digital delivery and courier timelines for hardware orders.',
    path: '/shipping-policy',
  },
  contact: {
    title: 'Contact & 24/7 Support',
    description:
      'Reach the PlayBeat team: live chat, email, WhatsApp, phone and office address — support within 2-4 hours.',
    path: '/contact',
  },
  admin: { title: 'Admin', description: '', path: '/admin', noindex: true },
  'admin-login': { title: 'Admin', description: '', path: '/admin/login', noindex: true },
}
