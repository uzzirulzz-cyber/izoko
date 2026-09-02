// products.ts — AUTO-GENERATED from live consolidated catalog (CLSC file origin).
// 69 storefront products · 25 with variant dropdown selection covering 134 SKUs · 6 categories.
// Same product posted many times = posted ONCE with variants under the product dropdown.
// Real official web images in /assets/images/products/.
// Regenerate with: node scripts/export_products_ts.mjs
import { Product, CategoryMeta } from '../types'
import { ensureProductSlug } from '../lib/slug'

export const CATEGORIES_DATA: CategoryMeta[] = [
  {
    name: 'All Products',
    slug: 'all',
    iconName: 'LayoutGrid',
    description: 'The complete PlayBeat catalog — streaming, subscriptions, software, gift cards, gaming and smart projectors',
    accentColor: 'text-amber-400',
    glowColor: 'glow-amber',
    image: '/assets/images/products/netflix.webp',
  },
  {
    name: 'Streaming',
    slug: 'Streaming',
    iconName: 'PlaySquare',
    description: 'Netflix, YouTube Premium, Prime Video, Disney+, HBO Max & 15+ official streaming plans',
    accentColor: 'text-rose-400',
    glowColor: 'glow-red',
    badgeText: 'Hot',
    image: '/assets/images/products/netflix.webp',
  },
  {
    name: 'Subscriptions',
    slug: 'Subscriptions',
    iconName: 'Layers',
    description: 'ChatGPT, Perplexity, Office 365, Adobe CC, CapCut, VPNs & premium productivity tools',
    accentColor: 'text-emerald-400',
    glowColor: 'glow-emerald',
    badgeText: 'Trending',
    image: '/assets/images/products/chatgpt.webp',
  },
  {
    name: 'Gift Cards',
    slug: 'Gift Cards',
    iconName: 'Gift',
    description: 'Xbox, PlayStation, Steam, Razer Gold & Apple gift cards — instant official codes',
    accentColor: 'text-yellow-400',
    glowColor: 'glow-amber',
    badgeText: 'Instant',
    image: '/assets/images/products/playstation-giftcard.webp',
  },
  {
    name: 'Gaming',
    slug: 'Gaming',
    iconName: 'Gamepad2',
    description: 'Xbox Game Pass Ultimate & gaming wallet top-ups',
    accentColor: 'text-indigo-400',
    glowColor: 'glow-indigo',
    badgeText: 'Play',
    image: '/assets/images/products/xbox-game-pass.webp',
  },
  {
    name: 'Software',
    slug: 'Software',
    iconName: 'CreditCard',
    description: 'Windows 11, Office 2024/2021/2019, Adobe CC, antivirus & genuine retail keys',
    accentColor: 'text-purple-400',
    glowColor: 'glow-purple',
    badgeText: 'Genuine',
    image: '/assets/images/products/windows-11.webp',
  },
  {
    name: 'Smart Projectors',
    slug: 'Smart Projectors',
    iconName: 'Projector',
    description: 'Magcubic, HCS350, Hongtop & HY-series smart projectors — full home cinema lineup',
    accentColor: 'text-cyan-400',
    glowColor: 'glow-cyan',
    badgeText: '4K Cinema',
    image: '/assets/images/products/proj-hy320-ntv.webp',
  },
]

const RAW_PRODUCTS_CATALOG: any[] = [
  {
    "id": "pb-str-001",
    "sku": "PB-STR-001",
    "name": "YouTube Premium",
    "slug": "youtube-premium",
    "category": "Streaming",
    "description": "Official YouTube Premium plan activated directly on your own Google account — ad-free videos, background and offline playback, plus YouTube Music Premium included. Delivered by PlayBeat with a full-duration stability warranty.",
    "price": 400,
    "originalPrice": 500,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/youtube-premium.webp",
    "galleryImages": [
      "/assets/images/products/youtube-premium.webp"
    ],
    "tags": [
      "Instant",
      "YouTube Premium",
      "1 Month",
      "4 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": true,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Ad-free videos across YouTube and YouTube Music",
      "Background play and offline downloads",
      "Activation on your own email"
    ],
    "brand": "YouTube Premium",
    "imageKey": "youtube-premium",
    "variants": [
      {
        "id": "v-PB-STR-001",
        "name": "Your Own Email 1 Month",
        "price": 400,
        "originalPrice": 500,
        "sku": "PB-STR-001",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-003",
        "name": "International 1 Month",
        "price": 1150,
        "originalPrice": 1500,
        "sku": "PB-STR-003",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-002",
        "name": "Full Private 1 Year",
        "price": 5000,
        "originalPrice": 6000,
        "sku": "PB-STR-002",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-004",
        "name": "International 1 Year",
        "price": 12500,
        "originalPrice": 14500,
        "sku": "PB-STR-004",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-str-005",
    "sku": "PB-STR-005",
    "name": "Prime Video",
    "slug": "prime-video",
    "category": "Streaming",
    "description": "Amazon Prime Video subscription with thousands of movies, award-winning Originals and live sports. Stream on up to three devices at once in Full HD and 4K where available.",
    "price": 199,
    "originalPrice": 250,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/prime-video.webp",
    "galleryImages": [
      "/assets/images/products/prime-video.webp"
    ],
    "tags": [
      "Instant",
      "Amazon Prime Video",
      "1 Month",
      "3 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Hollywood movies, series and Amazon Originals",
      "Watch on TV, mobile, tablet or console",
      "Full-duration warranty handled by PlayBeat"
    ],
    "brand": "Amazon Prime Video",
    "imageKey": "prime-video",
    "variants": [
      {
        "id": "v-PB-STR-005",
        "name": "1 Month Shared",
        "price": 199,
        "originalPrice": 250,
        "sku": "PB-STR-005",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-006",
        "name": "6 Month",
        "price": 750,
        "originalPrice": 900,
        "sku": "PB-STR-006",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-007",
        "name": "Full Private 1 Month",
        "price": 799,
        "originalPrice": 950,
        "sku": "PB-STR-007",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-str-008",
    "sku": "PB-STR-008",
    "name": "Netflix 1 Month",
    "slug": "netflix-1-month",
    "category": "Streaming",
    "description": "Netflix subscription plan (Pakistan local catalog) with HD/4K streaming of series, films and mobile games. Private profile with watching history kept separate.",
    "price": 600,
    "originalPrice": 750,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/netflix.webp",
    "galleryImages": [
      "/assets/images/products/netflix.webp"
    ],
    "tags": [
      "Instant",
      "Netflix",
      "1 Month",
      "2 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": true,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Pakistan",
    "features": [
      "HD / 4K streaming where plan allows",
      "TV, mobile, tablet and web supported",
      "Replacement warranty for full plan duration"
    ],
    "brand": "Netflix",
    "imageKey": "netflix",
    "variants": [
      {
        "id": "v-PB-STR-008",
        "name": "Local Pakistan",
        "price": 600,
        "originalPrice": 750,
        "sku": "PB-STR-008",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-009",
        "name": "International",
        "price": 850,
        "originalPrice": 1050,
        "sku": "PB-STR-009",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Region"
  },
  {
    "id": "pb-str-010",
    "sku": "PB-STR-010",
    "name": "Netflix + Prime Video Combo",
    "slug": "netflix-prime-video-combo",
    "category": "Streaming",
    "description": "Bundle pairing a Netflix plan with Amazon Prime Video for one month — double the entertainment at a combo price. Both activations delivered together with warranty support.",
    "price": 699,
    "originalPrice": 850,
    "currency": "PKR",
    "discountPercent": 18,
    "image": "/assets/images/products/netflix-prime-combo.webp",
    "galleryImages": [
      "/assets/images/products/netflix-prime-combo.webp"
    ],
    "tags": [
      "Instant",
      "Netflix + Prime Video Combo",
      "1 Month",
      "2 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Two top streaming services in one order",
      "Delivered together within minutes",
      "Full-duration warranty on both plans"
    ],
    "brand": "Netflix + Prime Video Combo",
    "imageKey": "netflix-prime-combo",
    "variants": [
      {
        "id": "v-PB-STR-010",
        "name": "1 Month Local Combo",
        "price": 699,
        "originalPrice": 850,
        "sku": "PB-STR-010",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-011",
        "name": "1 Month International Combo",
        "price": 950,
        "originalPrice": 1150,
        "sku": "PB-STR-011",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Region"
  },
  {
    "id": "pb-str-012",
    "sku": "PB-STR-012",
    "name": "Apple TV+",
    "slug": "apple-tv",
    "category": "Streaming",
    "description": "Apple TV+ subscription featuring Apple Originals — Ted Lasso, Severance, Silo and more — in stunning 4K HDR with Dolby Atmos on supported devices.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/appletv-plus.webp",
    "galleryImages": [
      "/assets/images/products/appletv-plus.webp"
    ],
    "tags": [
      "Instant",
      "Apple TV+",
      "1 Month",
      "2 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "All Apple Originals in 4K HDR",
      "Up to six family profiles",
      "Warranty for the full subscription period"
    ],
    "brand": "Apple TV+",
    "imageKey": "appletv-plus",
    "variants": [
      {
        "id": "v-PB-STR-012",
        "name": "1 Month",
        "price": 499,
        "originalPrice": 600,
        "sku": "PB-STR-012",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STR-013",
        "name": "International",
        "price": 750,
        "originalPrice": 900,
        "sku": "PB-STR-013",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-str-014",
    "sku": "PB-STR-014",
    "name": "Spotify Individual Plan 1 Month",
    "slug": "spotify-individual-plan-1-month",
    "category": "Streaming",
    "description": "Spotify Premium Individual plan — ad-free music, offline downloads, unlimited skips and high-quality audio on your existing account.",
    "price": 299,
    "originalPrice": 400,
    "currency": "PKR",
    "discountPercent": 25,
    "image": "/assets/images/products/spotify.webp",
    "galleryImages": [
      "/assets/images/products/spotify.webp"
    ],
    "tags": [
      "Instant",
      "Spotify Premium",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Ad-free listening with offline mode",
      "Works on your own Spotify account",
      "Full-duration subscription warranty"
    ],
    "brand": "Spotify Premium",
    "imageKey": "spotify"
  },
  {
    "id": "pb-str-015",
    "sku": "PB-STR-015",
    "name": "Sony Liv 1 Month",
    "slug": "sony-liv-1-month",
    "category": "Streaming",
    "description": "SonyLIV premium subscription for Indian entertainment — live sports, Sony TV shows, Originals and movies in HD.",
    "price": 800,
    "originalPrice": 950,
    "currency": "PKR",
    "discountPercent": 16,
    "image": "/assets/images/products/sonyliv.webp",
    "galleryImages": [
      "/assets/images/products/sonyliv.webp"
    ],
    "tags": [
      "Instant",
      "SonyLIV",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Live cricket and sports events",
      "Latest Sony TV serials and Originals",
      "HD streaming on two devices"
    ],
    "brand": "SonyLIV",
    "imageKey": "sonyliv"
  },
  {
    "id": "pb-str-016",
    "sku": "PB-STR-016",
    "name": "Ullu 1 Month",
    "slug": "ullu-1-month",
    "category": "Streaming",
    "description": "ULLU app subscription unlocking the complete library of ULLU Originals, web series and films on Android, iOS and Smart TV.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/ullu.webp",
    "galleryImages": [
      "/assets/images/products/ullu.webp"
    ],
    "tags": [
      "Instant",
      "ULLU",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Complete ULLU Originals catalog",
      "Android, iOS and Smart TV apps",
      "Instant activation with warranty"
    ],
    "brand": "ULLU",
    "imageKey": "ullu"
  },
  {
    "id": "pb-str-017",
    "sku": "PB-STR-017",
    "name": "Crunchyroll Single Screen 1 Month",
    "slug": "crunchyroll-single-screen-1-month",
    "category": "Streaming",
    "description": "Crunchyroll single-screen premium plan — stream the world's largest anime library ad-free in HD, with new episodes straight from Japan.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/crunchyroll.webp",
    "galleryImages": [
      "/assets/images/products/crunchyroll.webp"
    ],
    "tags": [
      "Instant",
      "Crunchyroll",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Ad-free HD anime streaming",
      "New episodes hours after Japan broadcast",
      "Single-screen private plan"
    ],
    "brand": "Crunchyroll",
    "imageKey": "crunchyroll"
  },
  {
    "id": "pb-str-018",
    "sku": "PB-STR-018",
    "name": "Chaupal Single Screen 1 Month",
    "slug": "chaupal-single-screen-1-month",
    "category": "Streaming",
    "description": "Chaupal single-screen subscription for Punjabi, Haryanvi and Bhojpuri movies and Originals — regional entertainment in HD.",
    "price": 600,
    "originalPrice": 750,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/chaupal.webp",
    "galleryImages": [
      "/assets/images/products/chaupal.webp"
    ],
    "tags": [
      "Instant",
      "Chaupal",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Punjabi, Haryanvi and Bhojpuri content",
      "HD streaming on one screen",
      "Instant delivery and full warranty"
    ],
    "brand": "Chaupal",
    "imageKey": "chaupal"
  },
  {
    "id": "pb-str-019",
    "sku": "PB-STR-019",
    "name": "Disney+ with VPN 1 Month",
    "slug": "disney-with-vpn-1-month",
    "category": "Streaming",
    "description": "Disney+ subscription (with VPN access guide) unlocking Disney, Pixar, Marvel, Star Wars and National Geographic in 4K UHD.",
    "price": 1850,
    "originalPrice": 2000,
    "currency": "PKR",
    "discountPercent": 8,
    "image": "/assets/images/products/disney-plus.webp",
    "galleryImages": [
      "/assets/images/products/disney-plus.webp"
    ],
    "tags": [
      "Instant",
      "Disney+",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Marvel, Star Wars, Pixar and Disney classics",
      "4K UHD with Dolby Atmos",
      "VPN usage guide included for access"
    ],
    "brand": "Disney+",
    "imageKey": "disney-plus"
  },
  {
    "id": "pb-str-020",
    "sku": "PB-STR-020",
    "name": "HBO Max with VPN 1 Month",
    "slug": "hbo-max-with-vpn-1-month",
    "category": "Streaming",
    "description": "HBO Max subscription (with VPN guide) — HBO Originals, Warner Bros. movies same-day, and DC universe titles in 4K HDR.",
    "price": 650,
    "originalPrice": 800,
    "currency": "PKR",
    "discountPercent": 19,
    "image": "/assets/images/products/hbo-max.webp",
    "galleryImages": [
      "/assets/images/products/hbo-max.webp"
    ],
    "tags": [
      "Instant",
      "HBO Max",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "HBO Originals and Warner Bros. films",
      "4K HDR streaming",
      "VPN access guide included"
    ],
    "brand": "HBO Max",
    "imageKey": "hbo-max"
  },
  {
    "id": "pb-str-021",
    "sku": "PB-STR-021",
    "name": "Jio Hotstar with VPN 1 Month",
    "slug": "jio-hotstar-with-vpn-1-month",
    "category": "Streaming",
    "description": "JioHotstar premium subscription (with VPN) — live sports including IPL and cricket, Disney+ content and Indian Originals in up to 4K.",
    "price": 1250,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/jiohotstar.webp",
    "galleryImages": [
      "/assets/images/products/jiohotstar.webp"
    ],
    "tags": [
      "Instant",
      "JioHotstar",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Live IPL, cricket and global sports",
      "Hollywood, Bollywood and Originals",
      "VPN usage guide included"
    ],
    "brand": "JioHotstar",
    "imageKey": "jiohotstar"
  },
  {
    "id": "pb-str-022",
    "sku": "PB-STR-022",
    "name": "Hulu with VPN 1 Month",
    "slug": "hulu-with-vpn-1-month",
    "category": "Streaming",
    "description": "Hulu subscription (with VPN) — next-day US TV episodes, Hulu Originals and a massive on-demand library in HD.",
    "price": 650,
    "originalPrice": 800,
    "currency": "PKR",
    "discountPercent": 19,
    "image": "/assets/images/products/hulu.webp",
    "galleryImages": [
      "/assets/images/products/hulu.webp"
    ],
    "tags": [
      "Instant",
      "Hulu",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Next-day US network TV",
      "Hulu Originals and FX on Hulu",
      "VPN usage guide included"
    ],
    "brand": "Hulu",
    "imageKey": "hulu"
  },
  {
    "id": "pb-str-023",
    "sku": "PB-STR-023",
    "name": "Zee5 with VPN 1 Month",
    "slug": "zee5-with-vpn-1-month",
    "category": "Streaming",
    "description": "ZEE5 premium subscription (with VPN) — Zee serials, movies, Live TV and Originals across 12 languages in HD.",
    "price": 1250,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/zee5.webp",
    "galleryImages": [
      "/assets/images/products/zee5.webp"
    ],
    "tags": [
      "Instant",
      "ZEE5",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "12 Indian languages content",
      "Live TV channels included",
      "HD streaming with full warranty"
    ],
    "brand": "ZEE5",
    "imageKey": "zee5"
  },
  {
    "id": "pb-ait-001",
    "sku": "PB-AIT-001",
    "name": "ChatGPT 5",
    "slug": "chatgpt-5",
    "category": "Subscriptions",
    "description": "ChatGPT plan (Plus tier) on a fully private account — GPT-5 access, advanced reasoning, file analysis, image generation and custom GPTs.",
    "price": 2499,
    "originalPrice": 3000,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/chatgpt.webp",
    "galleryImages": [
      "/assets/images/products/chatgpt.webp"
    ],
    "tags": [
      "Instant",
      "ChatGPT",
      "1 Month",
      "2 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "GPT-5 with advanced reasoning",
      "File uploads, vision and data analysis",
      "Fully private account"
    ],
    "brand": "ChatGPT",
    "imageKey": "chatgpt",
    "variants": [
      {
        "id": "v-PB-AIT-001",
        "name": "1 Month Semi-Private",
        "price": 2499,
        "originalPrice": 3000,
        "sku": "PB-AIT-001",
        "badge": "Instant"
      },
      {
        "id": "v-PB-AIT-002",
        "name": "Full Private 1 Month",
        "price": 4000,
        "originalPrice": 4500,
        "sku": "PB-AIT-002",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-ait-003",
    "sku": "PB-AIT-003",
    "name": "ChatGPT Go Plan 1 Year Full-Private",
    "slug": "chatgpt-go-plan-1-year-full-private",
    "category": "Subscriptions",
    "description": "ChatGPT plan (Go tier) on a fully private account — GPT-5 access, advanced reasoning, file analysis, image generation and custom GPTs.",
    "price": 7599,
    "originalPrice": 8500,
    "currency": "PKR",
    "discountPercent": 11,
    "image": "/assets/images/products/chatgpt.webp",
    "galleryImages": [
      "/assets/images/products/chatgpt.webp"
    ],
    "tags": [
      "Instant",
      "ChatGPT",
      "1 Year"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "GPT-5 with advanced reasoning",
      "File uploads, vision and data analysis",
      "Fully private account"
    ],
    "brand": "ChatGPT",
    "imageKey": "chatgpt"
  },
  {
    "id": "pb-ait-004",
    "sku": "PB-AIT-004",
    "name": "Perplexity AI Private Yearly Plan",
    "slug": "perplexity-ai-private-yearly-plan",
    "category": "Subscriptions",
    "description": "Perplexity Pro subscription — unlimited Pro searches with GPT-5, Claude and Sonar models, file uploads and dedicated AI inference.",
    "price": 9500,
    "originalPrice": 11000,
    "currency": "PKR",
    "discountPercent": 14,
    "image": "/assets/images/products/perplexity.webp",
    "galleryImages": [
      "/assets/images/products/perplexity.webp"
    ],
    "tags": [
      "Instant",
      "Perplexity",
      "Digital"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Unlimited Pro-tier AI searches",
      "Choose GPT-5, Claude or Sonar models",
      "Private activation with warranty"
    ],
    "brand": "Perplexity",
    "imageKey": "perplexity"
  },
  {
    "id": "pb-ait-005",
    "sku": "PB-AIT-005",
    "name": "Google Veo 3 1 Month Normal",
    "slug": "google-veo-3-1-month-normal",
    "category": "Subscriptions",
    "description": "Google Veo 3 access for 1 month — Google's most advanced AI video generation with native audio, 4K-quality output via Gemini and Flow.",
    "price": 2000,
    "originalPrice": 2500,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/google-veo.webp",
    "galleryImages": [
      "/assets/images/products/google-veo.webp"
    ],
    "tags": [
      "Instant",
      "Google Veo 3",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Text-to-video with native audio",
      "Cinematic 1080p+ AI video generation",
      "Activated on provided Google account"
    ],
    "brand": "Google Veo 3",
    "imageKey": "google-veo"
  },
  {
    "id": "pb-ait-006",
    "sku": "PB-AIT-006",
    "name": "Eleven Labs 1 Month",
    "slug": "eleven-labs-1-month",
    "category": "Subscriptions",
    "description": "ElevenLabs 1-month plan — the most realistic AI voice generation with 3,000+ voices in 32 languages, voice cloning and dubbing studio.",
    "price": 5999,
    "originalPrice": 7000,
    "currency": "PKR",
    "discountPercent": 14,
    "image": "/assets/images/products/elevenlabs.webp",
    "galleryImages": [
      "/assets/images/products/elevenlabs.webp"
    ],
    "tags": [
      "Instant",
      "ElevenLabs",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Ultra-realistic AI text-to-speech",
      "Voice cloning and dubbing studio",
      "Commercial usage license"
    ],
    "brand": "ElevenLabs",
    "imageKey": "elevenlabs"
  },
  {
    "id": "pb-ait-007",
    "sku": "PB-AIT-007",
    "name": "Leonardo AI Unlimited Plan Official 1 Month",
    "slug": "leonardo-ai-unlimited-plan-official-1-month",
    "category": "Subscriptions",
    "description": "Leonardo AI Unlimited official plan for 1 month — unlimited AI image generations, Phoenix model, canvas editing and upscaling.",
    "price": 2499,
    "originalPrice": 3000,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/leonardo-ai.webp",
    "galleryImages": [
      "/assets/images/products/leonardo-ai.webp"
    ],
    "tags": [
      "Instant",
      "Leonardo AI",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Unlimited daily image generations",
      "Phoenix and Flux pro models",
      "Official plan activated on your email"
    ],
    "brand": "Leonardo AI",
    "imageKey": "leonardo-ai"
  },
  {
    "id": "pb-ait-008",
    "sku": "PB-AIT-008",
    "name": "Turnitin Instructor Account 1 Month",
    "slug": "turnitin-instructor-account-1-month",
    "category": "Subscriptions",
    "description": "Turnitin Instructor account for 1 month — full instructor dashboard with similarity reports, AI-writing detection and grading tools.",
    "price": 16999,
    "originalPrice": 19500,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/turnitin.webp",
    "galleryImages": [
      "/assets/images/products/turnitin.webp"
    ],
    "tags": [
      "Instant",
      "Turnitin",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Genuine instructor (teacher) account",
      "AI-writing detection included",
      "Similarity reports for student papers"
    ],
    "brand": "Turnitin",
    "imageKey": "turnitin"
  },
  {
    "id": "pb-ait-009",
    "sku": "PB-AIT-009",
    "name": "Hailio AI 1 Month",
    "slug": "hailio-ai-1-month",
    "category": "Subscriptions",
    "description": "Hailuo AI (MiniMax) 1-month subscription — state-of-the-art AI video generation with smooth motion, image-to-video and director-grade camera controls.",
    "price": 4999,
    "originalPrice": 5500,
    "currency": "PKR",
    "discountPercent": 9,
    "image": "/assets/images/products/hailio-ai.webp",
    "galleryImages": [
      "/assets/images/products/hailio-ai.webp"
    ],
    "tags": [
      "Instant",
      "Hailuo AI",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Text-to-video and image-to-video",
      "Cinematic camera movement controls",
      "Private activation with warranty"
    ],
    "brand": "Hailuo AI",
    "imageKey": "hailio-ai"
  },
  {
    "id": "pb-stu-001",
    "sku": "PB-STU-001",
    "name": "Helium 10 Platinum Plan 1 Month",
    "slug": "helium-10-platinum-plan-1-month",
    "category": "Subscriptions",
    "description": "Helium 10 Platinum plan for Amazon sellers — product research (Black Box), keyword research (Magnet, Cerebro) and listing optimization in one suite.",
    "price": 1200,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/helium10.webp",
    "galleryImages": [
      "/assets/images/products/helium10.webp"
    ],
    "tags": [
      "Instant",
      "Helium 10",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Full Platinum toolset for 1 month",
      "Keyword and product research suite",
      "Private credentials, instant setup"
    ],
    "brand": "Helium 10",
    "imageKey": "helium10"
  },
  {
    "id": "pb-stu-002",
    "sku": "PB-STU-002",
    "name": "Zoom Pro",
    "slug": "zoom-pro",
    "category": "Subscriptions",
    "description": "Zoom Pro license for meetings up to 100 participants — unlimited group meetings, cloud recording and advanced meeting controls.",
    "price": 2000,
    "originalPrice": 2500,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/zoom.webp",
    "galleryImages": [
      "/assets/images/products/zoom.webp"
    ],
    "tags": [
      "Instant",
      "Zoom Pro",
      "1 Month",
      "3 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Pro host license with cloud recording",
      "HD video meetings with breakout rooms",
      "Reliable activation with warranty"
    ],
    "brand": "Zoom Pro",
    "imageKey": "zoom",
    "variants": [
      {
        "id": "v-PB-STU-002",
        "name": "100 Participants 1 Month",
        "price": 2000,
        "originalPrice": 2500,
        "sku": "PB-STU-002",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STU-004",
        "name": "Officially Paid No Trial",
        "price": 3200,
        "originalPrice": 3500,
        "sku": "PB-STU-004",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STU-003",
        "name": "1 Year",
        "price": 23000,
        "originalPrice": 26500,
        "sku": "PB-STU-003",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-stu-007",
    "sku": "PB-STU-007",
    "name": "CapCut Pro",
    "slug": "capcut-pro",
    "category": "Subscriptions",
    "description": "CapCut Pro plan on up to 3 devices — pro video editing with 4K export, premium effects, templates and cloud space.",
    "price": 1499,
    "originalPrice": 2000,
    "currency": "PKR",
    "discountPercent": 25,
    "image": "/assets/images/products/capcut.webp",
    "galleryImages": [
      "/assets/images/products/capcut.webp"
    ],
    "tags": [
      "Instant",
      "CapCut Pro",
      "1 Month",
      "2 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": true,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "All Pro effects, filters and templates",
      "4K export with no watermark",
      "Works on 3 of your devices"
    ],
    "brand": "CapCut Pro",
    "imageKey": "capcut",
    "variants": [
      {
        "id": "v-PB-STU-007",
        "name": "1 Month 3 Devices",
        "price": 1499,
        "originalPrice": 2000,
        "sku": "PB-STU-007",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STU-008",
        "name": "Full Private 1 Year",
        "price": 13999,
        "originalPrice": 16000,
        "sku": "PB-STU-008",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-stu-009",
    "sku": "PB-STU-009",
    "name": "Freepik Premium 1 Month",
    "slug": "freepik-premium-1-month",
    "category": "Subscriptions",
    "description": "Freepik Premium 1-month plan — unlimited downloads of stock photos, vectors, PSDs, icons and AI-generated assets with full commercial license.",
    "price": 1599,
    "originalPrice": 2000,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/freepik.webp",
    "galleryImages": [
      "/assets/images/products/freepik.webp"
    ],
    "tags": [
      "Instant",
      "Freepik",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Unlimited premium downloads",
      "Commercial-use license included",
      "Instant activation on your email"
    ],
    "brand": "Freepik",
    "imageKey": "freepik"
  },
  {
    "id": "pb-stu-010",
    "sku": "PB-STU-010",
    "name": "QuillBot Premium 1 Month",
    "slug": "quillbot-premium-1-month",
    "category": "Subscriptions",
    "description": "QuillBot Premium 1-month plan — unlimited paraphrasing, grammar checking, plagiarism checker and summarizer for flawless writing.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/quillbot.webp",
    "galleryImages": [
      "/assets/images/products/quillbot.webp"
    ],
    "tags": [
      "Instant",
      "QuillBot",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Unlimited words in paraphraser",
      "Grammar, plagiarism and summarizer tools",
      "Activated on your own account"
    ],
    "brand": "QuillBot",
    "imageKey": "quillbot"
  },
  {
    "id": "pb-stu-011",
    "sku": "PB-STU-011",
    "name": "Grammarly Premium 1 Month",
    "slug": "grammarly-premium-1-month",
    "category": "Subscriptions",
    "description": "Grammarly Premium 1-month plan — advanced grammar, clarity and tone suggestions plus plagiarism detection, activated on your own account.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/grammarly.webp",
    "galleryImages": [
      "/assets/images/products/grammarly.webp"
    ],
    "tags": [
      "Instant",
      "Grammarly",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Premium writing suggestions everywhere",
      "Tone and clarity rewrites",
      "Plagiarism checker included"
    ],
    "brand": "Grammarly",
    "imageKey": "grammarly"
  },
  {
    "id": "pb-vpn-004",
    "sku": "PB-VPN-004",
    "name": "Surfshark VPN",
    "slug": "surfshark-vpn",
    "category": "Subscriptions",
    "description": "Surfshark VPN plan (shared) — CleanWeb ad blocking, NoBorders mode and 3,200+ servers in 100 countries.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/surfshark.webp",
    "galleryImages": [
      "/assets/images/products/surfshark.webp"
    ],
    "tags": [
      "Instant",
      "Surfshark",
      "1 Month",
      "3 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Unlimited simultaneous devices",
      "CleanWeb ads and tracker blocker",
      "24/7 protection with warranty"
    ],
    "brand": "Surfshark",
    "imageKey": "surfshark",
    "variants": [
      {
        "id": "v-PB-VPN-004",
        "name": "1 Month Shared",
        "price": 499,
        "originalPrice": 600,
        "sku": "PB-VPN-004",
        "badge": "Instant"
      },
      {
        "id": "v-PB-VPN-005",
        "name": "Full Private 1 Month",
        "price": 1999,
        "originalPrice": 2500,
        "sku": "PB-VPN-005",
        "badge": "Instant"
      },
      {
        "id": "v-PB-VPN-006",
        "name": "Full Private 1 Year",
        "price": 8500,
        "originalPrice": 10000,
        "sku": "PB-VPN-006",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-vpn-007",
    "sku": "PB-VPN-007",
    "name": "ExpressVPN 1 Month Single Device",
    "slug": "expressvpn-1-month-single-device",
    "category": "Subscriptions",
    "description": "ExpressVPN plan (single device) — Lightning-fast servers in 105 countries with TrustedServer technology and full privacy audit.",
    "price": 1600,
    "originalPrice": 2000,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/expressvpn.webp",
    "galleryImages": [
      "/assets/images/products/expressvpn.webp"
    ],
    "tags": [
      "Instant",
      "ExpressVPN",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Servers in 105 countries",
      "TrustedServer RAM-only technology",
      "Works on PC and mobile"
    ],
    "brand": "ExpressVPN",
    "imageKey": "expressvpn"
  },
  {
    "id": "pb-vpn-008",
    "sku": "PB-VPN-008",
    "name": "ExpressVPN For PC",
    "slug": "expressvpn-for-pc",
    "category": "Subscriptions",
    "description": "ExpressVPN plan for Windows PC — Lightning-fast servers in 105 countries with TrustedServer technology and full privacy audit.",
    "price": 900,
    "originalPrice": 1100,
    "currency": "PKR",
    "discountPercent": 18,
    "image": "/assets/images/products/expressvpn.webp",
    "galleryImages": [
      "/assets/images/products/expressvpn.webp"
    ],
    "tags": [
      "Instant",
      "ExpressVPN",
      "Digital"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Servers in 105 countries",
      "TrustedServer RAM-only technology",
      "Works on PC and mobile"
    ],
    "brand": "ExpressVPN",
    "imageKey": "expressvpn"
  },
  {
    "id": "pb-vpn-009",
    "sku": "PB-VPN-009",
    "name": "Proton VPN 1 Month",
    "slug": "proton-vpn-1-month",
    "category": "Subscriptions",
    "description": "Proton VPN 1-month premium — Secure Core servers, NetShield ad-blocker and strict Swiss no-logs privacy policy.",
    "price": 650,
    "originalPrice": 800,
    "currency": "PKR",
    "discountPercent": 19,
    "image": "/assets/images/products/protonvpn.webp",
    "galleryImages": [
      "/assets/images/products/protonvpn.webp"
    ],
    "tags": [
      "Instant",
      "Proton VPN",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Swiss privacy, no-logs policy",
      "NetShield ad and malware blocking",
      "Secure Core double-hop routing"
    ],
    "brand": "Proton VPN",
    "imageKey": "protonvpn"
  },
  {
    "id": "pb-vpn-010",
    "sku": "PB-VPN-010",
    "name": "IPVanish VPN 1 Month",
    "slug": "ipvanish-vpn-1-month",
    "category": "Subscriptions",
    "description": "IPVanish VPN 1-month plan — unlimited device connections, 2,400+ servers and zero-traffic-logs policy.",
    "price": 650,
    "originalPrice": 800,
    "currency": "PKR",
    "discountPercent": 19,
    "image": "/assets/images/products/ipvanish.webp",
    "galleryImages": [
      "/assets/images/products/ipvanish.webp"
    ],
    "tags": [
      "Instant",
      "IPVanish",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Unlimited simultaneous devices",
      "2,400+ servers in 90+ locations",
      "Strict no-logs policy"
    ],
    "brand": "IPVanish",
    "imageKey": "ipvanish"
  },
  {
    "id": "pb-vpn-011",
    "sku": "PB-VPN-011",
    "name": "Hotspot Shield VPN 1 Month",
    "slug": "hotspot-shield-vpn-1-month",
    "category": "Subscriptions",
    "description": "Hotspot Shield Premium 1-month — Catapult Hydra protocol for blazing speeds on 115+ virtual locations with military-grade encryption.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/hotspot-shield.webp",
    "galleryImages": [
      "/assets/images/products/hotspot-shield.webp"
    ],
    "tags": [
      "Instant",
      "Hotspot Shield",
      "1 Month"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Catapult Hydra speed protocol",
      "115+ virtual locations",
      "Automatic kill switch"
    ],
    "brand": "Hotspot Shield",
    "imageKey": "hotspot-shield"
  },
  {
    "id": "pb-gft-001",
    "sku": "PB-GFT-001",
    "name": "Xbox Live Gift Card",
    "slug": "xbox-live-gift-card",
    "category": "Gift Cards",
    "description": "Xbox Live gift card ($1 USD) — official Microsoft digital code to top up any Xbox or Microsoft account for games, DLC, Game Pass and add-ons.",
    "price": 440,
    "originalPrice": 550,
    "currency": "PKR",
    "discountPercent": 20,
    "image": "/assets/images/products/xbox-giftcard.webp",
    "galleryImages": [
      "/assets/images/products/xbox-giftcard.webp"
    ],
    "tags": [
      "Instant",
      "Gift Card",
      "Global",
      "9 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Official Microsoft code — never expires",
      "Redeem on Xbox console or Microsoft Store",
      "Region-locked to USA accounts"
    ],
    "brand": "Xbox Live",
    "imageKey": "xbox-giftcard",
    "variants": [
      {
        "id": "v-PB-GFT-001",
        "name": "1 USD",
        "price": 440,
        "originalPrice": 550,
        "sku": "PB-GFT-001"
      },
      {
        "id": "v-PB-GFT-002",
        "name": "5 USD",
        "price": 1451,
        "originalPrice": 1500,
        "sku": "PB-GFT-002"
      },
      {
        "id": "v-PB-GFT-003",
        "name": "10 USD",
        "price": 2698,
        "originalPrice": 3000,
        "sku": "PB-GFT-003"
      },
      {
        "id": "v-PB-GFT-004",
        "name": "15 USD",
        "price": 3850,
        "originalPrice": 4500,
        "sku": "PB-GFT-004"
      },
      {
        "id": "v-PB-GFT-005",
        "name": "25 USD",
        "price": 6324,
        "originalPrice": 7500,
        "sku": "PB-GFT-005"
      },
      {
        "id": "v-PB-GFT-006",
        "name": "50 USD",
        "price": 13548,
        "originalPrice": 15500,
        "sku": "PB-GFT-006"
      },
      {
        "id": "v-PB-GFT-007",
        "name": "100 USD",
        "price": 28415,
        "originalPrice": 32500,
        "sku": "PB-GFT-007"
      },
      {
        "id": "v-PB-GFT-008",
        "name": "160 USD",
        "price": 40719,
        "originalPrice": 47000,
        "sku": "PB-GFT-008"
      },
      {
        "id": "v-PB-GFT-009",
        "name": "225 USD",
        "price": 57339,
        "originalPrice": 66000,
        "sku": "PB-GFT-009"
      }
    ],
    "variantLabel": "Denomination"
  },
  {
    "id": "pb-gft-010",
    "sku": "PB-GFT-010",
    "name": "PlayStation Network Gift Card",
    "slug": "playstation-network-gift-card",
    "category": "Gift Cards",
    "description": "PlayStation Network gift card ($10 USD) — official Sony digital code for PS5 and PS4 wallet top-up: games, add-ons, PS Plus and media.",
    "price": 2820,
    "originalPrice": 3000,
    "currency": "PKR",
    "discountPercent": 6,
    "image": "/assets/images/products/playstation-giftcard.webp",
    "galleryImages": [
      "/assets/images/products/playstation-giftcard.webp"
    ],
    "tags": [
      "Instant",
      "Gift Card",
      "Global",
      "6 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": true,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Official Sony USA code",
      "Redeem on PS5 / PS4 store",
      "Funds never expire once redeemed"
    ],
    "brand": "PlayStation Network",
    "imageKey": "playstation-giftcard",
    "variants": [
      {
        "id": "v-PB-GFT-010",
        "name": "10 USD",
        "price": 2820,
        "originalPrice": 3000,
        "sku": "PB-GFT-010"
      },
      {
        "id": "v-PB-GFT-011",
        "name": "20 USD",
        "price": 5451,
        "originalPrice": 6500,
        "sku": "PB-GFT-011"
      },
      {
        "id": "v-PB-GFT-012",
        "name": "25 USD",
        "price": 6739,
        "originalPrice": 8000,
        "sku": "PB-GFT-012"
      },
      {
        "id": "v-PB-GFT-013",
        "name": "50 USD",
        "price": 13304,
        "originalPrice": 15500,
        "sku": "PB-GFT-013"
      },
      {
        "id": "v-PB-GFT-014",
        "name": "100 USD",
        "price": 29163,
        "originalPrice": 33500,
        "sku": "PB-GFT-014"
      },
      {
        "id": "v-PB-GFT-015",
        "name": "180 USD",
        "price": 45705,
        "originalPrice": 52500,
        "sku": "PB-GFT-015"
      }
    ],
    "variantLabel": "Denomination"
  },
  {
    "id": "pb-gft-016",
    "sku": "PB-GFT-016",
    "name": "Steam Gift Card",
    "slug": "steam-gift-card",
    "category": "Gift Cards",
    "description": "Steam wallet gift card ($4 USD) — Pakistan region digital code redeemable on Steam for games, DLC, in-game items and Market purchases.",
    "price": 1255,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 16,
    "image": "/assets/images/products/steam-giftcard.webp",
    "galleryImages": [
      "/assets/images/products/steam-giftcard.webp"
    ],
    "tags": [
      "Instant",
      "Gift Card",
      "Pakistan",
      "11 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Pakistan",
    "features": [
      "Works with Pakistan-region Steam wallets",
      "Instant code delivery by email",
      "Funds never expire on Steam wallet"
    ],
    "brand": "Steam",
    "imageKey": "steam-giftcard",
    "variants": [
      {
        "id": "v-PB-GFT-016",
        "name": "4 USD Pakistan Region",
        "price": 1255,
        "originalPrice": 1500,
        "sku": "PB-GFT-016"
      },
      {
        "id": "v-PB-GFT-017",
        "name": "5 USD Global",
        "price": 1385,
        "originalPrice": 1500,
        "sku": "PB-GFT-017"
      },
      {
        "id": "v-PB-GFT-018",
        "name": "6 USD Pakistan Region",
        "price": 1554,
        "originalPrice": 2000,
        "sku": "PB-GFT-018"
      },
      {
        "id": "v-PB-GFT-019",
        "name": "8 USD Pakistan Region",
        "price": 2200,
        "originalPrice": 2500,
        "sku": "PB-GFT-019"
      },
      {
        "id": "v-PB-GFT-020",
        "name": "10 USD Global",
        "price": 2892,
        "originalPrice": 3500,
        "sku": "PB-GFT-020"
      },
      {
        "id": "v-PB-GFT-021",
        "name": "10 USD Pakistan Region",
        "price": 3800,
        "originalPrice": 4500,
        "sku": "PB-GFT-021"
      },
      {
        "id": "v-PB-GFT-022",
        "name": "15 USD Pakistan Region",
        "price": 4100,
        "originalPrice": 4500,
        "sku": "PB-GFT-022"
      },
      {
        "id": "v-PB-GFT-023",
        "name": "20 USD Global",
        "price": 5781,
        "originalPrice": 6500,
        "sku": "PB-GFT-023"
      },
      {
        "id": "v-PB-GFT-024",
        "name": "20 USD Pakistan Region",
        "price": 7000,
        "originalPrice": 8000,
        "sku": "PB-GFT-024"
      },
      {
        "id": "v-PB-GFT-025",
        "name": "50 USD Global",
        "price": 13850,
        "originalPrice": 16000,
        "sku": "PB-GFT-025"
      },
      {
        "id": "v-PB-GFT-026",
        "name": "100 USD Global",
        "price": 27348,
        "originalPrice": 31500,
        "sku": "PB-GFT-026"
      }
    ],
    "variantLabel": "Denomination"
  },
  {
    "id": "pb-gft-027",
    "sku": "PB-GFT-027",
    "name": "Razer Gold Gift Card",
    "slug": "razer-gold-gift-card",
    "category": "Gift Cards",
    "description": "Razer Gold gift card ($5 USD) — unified virtual credit for 42,000+ games and entertainment content, with Razer Silver rewards on every spend.",
    "price": 1471,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 2,
    "image": "/assets/images/products/razer-gold.webp",
    "galleryImages": [
      "/assets/images/products/razer-gold.webp"
    ],
    "tags": [
      "Instant",
      "Gift Card",
      "Global",
      "6 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "42,000+ supported games and apps",
      "Earn Razer Silver loyalty points",
      "Instant code delivery"
    ],
    "brand": "Razer Gold",
    "imageKey": "razer-gold",
    "variants": [
      {
        "id": "v-PB-GFT-027",
        "name": "5 USD",
        "price": 1471,
        "originalPrice": 1500,
        "sku": "PB-GFT-027"
      },
      {
        "id": "v-PB-GFT-028",
        "name": "10 USD",
        "price": 2875,
        "originalPrice": 3500,
        "sku": "PB-GFT-028"
      },
      {
        "id": "v-PB-GFT-029",
        "name": "20 USD",
        "price": 5997,
        "originalPrice": 7000,
        "sku": "PB-GFT-029"
      },
      {
        "id": "v-PB-GFT-030",
        "name": "30 USD",
        "price": 9127,
        "originalPrice": 10500,
        "sku": "PB-GFT-030"
      },
      {
        "id": "v-PB-GFT-031",
        "name": "50 USD",
        "price": 14681,
        "originalPrice": 17000,
        "sku": "PB-GFT-031"
      },
      {
        "id": "v-PB-GFT-032",
        "name": "100 USD",
        "price": 27700,
        "originalPrice": 32000,
        "sku": "PB-GFT-032"
      }
    ],
    "variantLabel": "Denomination"
  },
  {
    "id": "pb-gft-033",
    "sku": "PB-GFT-033",
    "name": "Apple Gift Card",
    "slug": "apple-gift-card",
    "category": "Gift Cards",
    "description": "Apple Gift Card ($5 USD) — official Apple digital code for App Store, iCloud+, Apple Music, accessories and everything Apple (USA store).",
    "price": 1471,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 2,
    "image": "/assets/images/products/apple-giftcard.webp",
    "galleryImages": [
      "/assets/images/products/apple-giftcard.webp"
    ],
    "tags": [
      "Instant",
      "Gift Card",
      "Global",
      "9 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Official Apple USA code",
      "App Store, iCloud+, Music and more",
      "Never expires"
    ],
    "brand": "Apple",
    "imageKey": "apple-giftcard",
    "variants": [
      {
        "id": "v-PB-GFT-033",
        "name": "5 USD",
        "price": 1471,
        "originalPrice": 1500,
        "sku": "PB-GFT-033"
      },
      {
        "id": "v-PB-GFT-034",
        "name": "10 USD",
        "price": 2903,
        "originalPrice": 3500,
        "sku": "PB-GFT-034"
      },
      {
        "id": "v-PB-GFT-035",
        "name": "15 USD",
        "price": 3642,
        "originalPrice": 4000,
        "sku": "PB-GFT-035"
      },
      {
        "id": "v-PB-GFT-036",
        "name": "20 USD",
        "price": 5817,
        "originalPrice": 6500,
        "sku": "PB-GFT-036"
      },
      {
        "id": "v-PB-GFT-037",
        "name": "25 USD",
        "price": 7064,
        "originalPrice": 8000,
        "sku": "PB-GFT-037"
      },
      {
        "id": "v-PB-GFT-038",
        "name": "40 USD",
        "price": 11634,
        "originalPrice": 13500,
        "sku": "PB-GFT-038"
      },
      {
        "id": "v-PB-GFT-039",
        "name": "50 USD",
        "price": 14803,
        "originalPrice": 17000,
        "sku": "PB-GFT-039"
      },
      {
        "id": "v-PB-GFT-040",
        "name": "100 USD",
        "price": 29085,
        "originalPrice": 33500,
        "sku": "PB-GFT-040"
      },
      {
        "id": "v-PB-GFT-041",
        "name": "220 USD",
        "price": 60940,
        "originalPrice": 70000,
        "sku": "PB-GFT-041"
      }
    ],
    "variantLabel": "Denomination"
  },
  {
    "id": "pb-gam-001",
    "sku": "PB-GAM-001",
    "name": "Xbox Game Pass Ultimate",
    "slug": "xbox-game-pass-ultimate",
    "category": "Gaming",
    "description": "Xbox Game Pass Ultimate shared slot for one device — 500+ high-quality games on console, PC and cloud including day-one releases.",
    "price": 2999,
    "originalPrice": 3500,
    "currency": "PKR",
    "discountPercent": 14,
    "image": "/assets/images/products/xbox-game-pass.webp",
    "galleryImages": [
      "/assets/images/products/xbox-game-pass.webp"
    ],
    "tags": [
      "Instant",
      "Xbox Game Pass Ultimate",
      "Digital",
      "2 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Day-one Xbox and Bethesda releases",
      "EA Play and cloud gaming included",
      "Shared slot on one device"
    ],
    "brand": "Xbox Game Pass Ultimate",
    "imageKey": "xbox-game-pass",
    "variants": [
      {
        "id": "v-PB-GAM-001",
        "name": "1 Device Shared",
        "price": 2999,
        "originalPrice": 3500,
        "sku": "PB-GAM-001",
        "badge": "Instant"
      },
      {
        "id": "v-PB-GAM-002",
        "name": "Full Private 1 Month",
        "price": 7500,
        "originalPrice": 8500,
        "sku": "PB-GAM-002",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-stu-006",
    "sku": "PB-STU-006",
    "name": "Adobe Creative Cloud",
    "slug": "adobe-creative-cloud",
    "category": "Software",
    "description": "Adobe Creative Cloud Pro plan with all apps — Photoshop, Illustrator, Premiere Pro, After Effects and more. For Windows PC.",
    "price": 1498,
    "originalPrice": 3500,
    "currency": "PKR",
    "discountPercent": 14,
    "image": "/assets/images/products/adobe-cc.webp",
    "galleryImages": [
      "/assets/images/products/adobe-cc.webp"
    ],
    "tags": [
      "Instant",
      "Adobe Creative Cloud",
      "1 Month",
      "11 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Genuine Adobe activation",
      "Windows PC supported",
      "Full-duration warranty with replacement"
    ],
    "brand": "Adobe Creative Cloud",
    "imageKey": "adobe-cc",
    "variants": [
      {
        "id": "v-PB-SWF-023",
        "name": "Photography Plan 1 Month 20GB Global",
        "price": 1498,
        "originalPrice": 2000,
        "sku": "PB-SWF-023",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-015",
        "name": "Pro PC 1 Month Global",
        "price": 2715,
        "originalPrice": 3000,
        "sku": "PB-SWF-015",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STU-006",
        "name": "1 Month",
        "price": 2999,
        "originalPrice": 3500,
        "sku": "PB-STU-006",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-017",
        "name": "Pro PC 1 Year ROW Region",
        "price": 5557,
        "originalPrice": 6500,
        "sku": "PB-SWF-017",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-016",
        "name": "Pro PC 3 Months Global",
        "price": 20300,
        "originalPrice": 23500,
        "sku": "PB-SWF-016",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-020",
        "name": "Pro Student & Teacher PC 1 Year",
        "price": 36860,
        "originalPrice": 42500,
        "sku": "PB-SWF-020",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-022",
        "name": "Pro Student & Teacher PC Mac 1 Year US",
        "price": 40392,
        "originalPrice": 46500,
        "sku": "PB-SWF-022",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-024",
        "name": "Photography Plan 1 Year 20GB Global",
        "price": 50541,
        "originalPrice": 58000,
        "sku": "PB-SWF-024",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-021",
        "name": "Pro Student & Teacher PC Mac 1 Year Global",
        "price": 51408,
        "originalPrice": 59000,
        "sku": "PB-SWF-021",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-018",
        "name": "Pro PC Mac 1 Year Europe",
        "price": 58261,
        "originalPrice": 67000,
        "sku": "PB-SWF-018",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-019",
        "name": "Pro PC 1 Year Japan",
        "price": 61688,
        "originalPrice": 71000,
        "sku": "PB-SWF-019",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-swf-007",
    "sku": "PB-SWF-007",
    "name": "Microsoft Office",
    "slug": "microsoft-office",
    "category": "Software",
    "description": "Genuine Microsoft Office retail license (2019 edition) for Windows PC — lifetime activation with Word, Excel, PowerPoint, Outlook and more.",
    "price": 2945,
    "originalPrice": 3500,
    "currency": "PKR",
    "discountPercent": 16,
    "image": "/assets/images/products/office.webp",
    "galleryImages": [
      "/assets/images/products/office.webp"
    ],
    "tags": [
      "Instant",
      "Microsoft Office",
      "Digital",
      "10 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Lifetime retail key — one-time purchase",
      "Instant digital delivery by email",
      "Official Microsoft activation with updates"
    ],
    "brand": "Microsoft Office",
    "imageKey": "office",
    "variants": [
      {
        "id": "v-PB-SWF-007",
        "name": "Professional 2019 PC 1 Device Global",
        "price": 2945,
        "originalPrice": 3500,
        "sku": "PB-SWF-007",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-002",
        "name": "2024 LTSC Standard PC Global",
        "price": 3989,
        "originalPrice": 4500,
        "sku": "PB-SWF-002",
        "badge": "Instant"
      },
      {
        "id": "v-PB-STU-005",
        "name": "365 Pro Plus 1 Year 5 Devices",
        "price": 3999,
        "originalPrice": 4500,
        "sku": "PB-STU-005",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-001",
        "name": "2024 LTSC Professional Plus PC Global",
        "price": 4853,
        "originalPrice": 5500,
        "sku": "PB-SWF-001",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-006",
        "name": "Professional Plus 2021 PC Global",
        "price": 4853,
        "originalPrice": 5500,
        "sku": "PB-SWF-006",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-003",
        "name": "2024 Home & Business PC Global",
        "price": 4956,
        "originalPrice": 5500,
        "sku": "PB-SWF-003",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-008",
        "name": "Home & Business 2019 PC Global",
        "price": 5659,
        "originalPrice": 6500,
        "sku": "PB-SWF-008",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-009",
        "name": "Pro 2021 + Windows 11 Pro Bundle",
        "price": 9692,
        "originalPrice": 11000,
        "sku": "PB-SWF-009",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-004",
        "name": "2024 Home & Business PC Mac Global",
        "price": 34262,
        "originalPrice": 39500,
        "sku": "PB-SWF-004",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-005",
        "name": "2024 Home PC Mac Global",
        "price": 34265,
        "originalPrice": 39500,
        "sku": "PB-SWF-005",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Edition"
  },
  {
    "id": "pb-swf-010",
    "sku": "PB-SWF-010",
    "name": "Microsoft Windows 11",
    "slug": "microsoft-windows-11",
    "category": "Software",
    "description": "Genuine Microsoft Windows 11 Home retail license (retail) for one PC, with lifetime activation and official updates.",
    "price": 5429,
    "originalPrice": 6000,
    "currency": "PKR",
    "discountPercent": 10,
    "image": "/assets/images/products/windows-11.webp",
    "galleryImages": [
      "/assets/images/products/windows-11.webp"
    ],
    "tags": [
      "Instant",
      "Windows 11",
      "Digital",
      "5 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Lifetime activation key",
      "All official Windows Update features",
      "Instant email delivery"
    ],
    "brand": "Windows 11",
    "imageKey": "windows-11",
    "variants": [
      {
        "id": "v-PB-SWF-010",
        "name": "Home PC Global Retail",
        "price": 5429,
        "originalPrice": 6000,
        "sku": "PB-SWF-010",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-012",
        "name": "Pro PC Global Retail",
        "price": 5551,
        "originalPrice": 6500,
        "sku": "PB-SWF-012",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-011",
        "name": "Home N PC Global",
        "price": 6197,
        "originalPrice": 7000,
        "sku": "PB-SWF-011",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-013",
        "name": "Pro OEM PC Global",
        "price": 6252,
        "originalPrice": 7000,
        "sku": "PB-SWF-013",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-014",
        "name": "Pro x4 Bundle Global",
        "price": 10953,
        "originalPrice": 12500,
        "sku": "PB-SWF-014",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Edition"
  },
  {
    "id": "pb-swf-033",
    "sku": "PB-SWF-033",
    "name": "CyberGhost VPN",
    "slug": "cyberghost-vpn",
    "category": "Software",
    "description": "CyberGhost VPN plan for 5 devices — 11,000+ servers worldwide, NoSpy servers and strict no-logs policy, audited by Deloitte.",
    "price": 10592,
    "originalPrice": 12000,
    "currency": "PKR",
    "discountPercent": 12,
    "image": "/assets/images/products/cyberghost.webp",
    "galleryImages": [
      "/assets/images/products/cyberghost.webp"
    ],
    "tags": [
      "Instant",
      "CyberGhost VPN",
      "2 Years",
      "3 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "11,000+ servers in 100 countries",
      "Up to 7 devices per subscription",
      "Deloitte-audited no-logs policy"
    ],
    "brand": "CyberGhost VPN",
    "imageKey": "cyberghost",
    "variants": [
      {
        "id": "v-PB-SWF-033",
        "name": "5 Devices 2 Years Global",
        "price": 10592,
        "originalPrice": 12000,
        "sku": "PB-SWF-033",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-032",
        "name": "7 Devices 1 Year Global",
        "price": 10673,
        "originalPrice": 12500,
        "sku": "PB-SWF-032",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-034",
        "name": "5 Devices 5 Years Global",
        "price": 12329,
        "originalPrice": 14000,
        "sku": "PB-SWF-034",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-swf-035",
    "sku": "PB-SWF-035",
    "name": "Perplexity Pro",
    "slug": "perplexity-pro",
    "category": "Software",
    "description": "Perplexity Pro subscription — unlimited Pro searches with GPT-5, Claude and Sonar models, file uploads and dedicated AI inference.",
    "price": 3834,
    "originalPrice": 4500,
    "currency": "PKR",
    "discountPercent": 15,
    "image": "/assets/images/products/perplexity.webp",
    "galleryImages": [
      "/assets/images/products/perplexity.webp"
    ],
    "tags": [
      "Instant",
      "Perplexity",
      "1 Month",
      "9 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Unlimited Pro-tier AI searches",
      "Choose GPT-5, Claude or Sonar models",
      "Private activation with warranty"
    ],
    "brand": "Perplexity",
    "imageKey": "perplexity",
    "variants": [
      {
        "id": "v-PB-SWF-035",
        "name": "1 Month Global",
        "price": 3834,
        "originalPrice": 4500,
        "sku": "PB-SWF-035",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-042",
        "name": "1 Year Netherlands",
        "price": 14296,
        "originalPrice": 16500,
        "sku": "PB-SWF-042",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-038",
        "name": "1 Year UK",
        "price": 14329,
        "originalPrice": 16500,
        "sku": "PB-SWF-038",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-041",
        "name": "1 Year France",
        "price": 14329,
        "originalPrice": 16500,
        "sku": "PB-SWF-041",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-043",
        "name": "1 Year Australia",
        "price": 14329,
        "originalPrice": 16500,
        "sku": "PB-SWF-043",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-036",
        "name": "3 Months Global",
        "price": 14509,
        "originalPrice": 16500,
        "sku": "PB-SWF-036",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-037",
        "name": "1 Year Europe",
        "price": 17708,
        "originalPrice": 20500,
        "sku": "PB-SWF-037",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-039",
        "name": "1 Year Global Key",
        "price": 55087,
        "originalPrice": 63500,
        "sku": "PB-SWF-039",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-040",
        "name": "1 Year Global Account",
        "price": 62422,
        "originalPrice": 72000,
        "sku": "PB-SWF-040",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-swf-048",
    "sku": "PB-SWF-048",
    "name": "Bitdefender Total Security",
    "slug": "bitdefender-total-security",
    "category": "Software",
    "description": "Bitdefender Total Security license — multi-layer ransomware protection, web attack prevention and anti-fraud for the full term.",
    "price": 1753,
    "originalPrice": 2000,
    "currency": "PKR",
    "discountPercent": 12,
    "image": "/assets/images/products/bitdefender.webp",
    "galleryImages": [
      "/assets/images/products/bitdefender.webp"
    ],
    "tags": [
      "Instant",
      "Bitdefender",
      "3 Months",
      "10 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Multi-layer ransomware protection",
      "Anti-phishing and anti-fraud guard",
      "Covers all major platforms"
    ],
    "brand": "Bitdefender",
    "imageKey": "bitdefender",
    "variants": [
      {
        "id": "v-PB-SWF-048",
        "name": "3 Months Global",
        "price": 1753,
        "originalPrice": 2000,
        "sku": "PB-SWF-048",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-044",
        "name": "1 Year Global",
        "price": 3942,
        "originalPrice": 4500,
        "sku": "PB-SWF-044",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-045",
        "name": "1 Year US",
        "price": 3942,
        "originalPrice": 4500,
        "sku": "PB-SWF-045",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-046",
        "name": "1 Year Europe",
        "price": 6836,
        "originalPrice": 8000,
        "sku": "PB-SWF-046",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-047",
        "name": "1 Year UK",
        "price": 8257,
        "originalPrice": 9500,
        "sku": "PB-SWF-047",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-053",
        "name": "3 Years India",
        "price": 11753,
        "originalPrice": 13500,
        "sku": "PB-SWF-053",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-050",
        "name": "2 Years US",
        "price": 14642,
        "originalPrice": 17000,
        "sku": "PB-SWF-050",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-049",
        "name": "2 Years Global",
        "price": 17332,
        "originalPrice": 20000,
        "sku": "PB-SWF-049",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-051",
        "name": "3 Years Global PC",
        "price": 23806,
        "originalPrice": 27500,
        "sku": "PB-SWF-051",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-052",
        "name": "3 Years Global All Devices",
        "price": 47722,
        "originalPrice": 55000,
        "sku": "PB-SWF-052",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-swf-054",
    "sku": "PB-SWF-054",
    "name": "Bitdefender Internet Security",
    "slug": "bitdefender-internet-security",
    "category": "Software",
    "description": "Bitdefender Internet Security license for 1 device(s) — multi-layer ransomware protection, web attack prevention and anti-fraud for the full term.",
    "price": 604,
    "originalPrice": 750,
    "currency": "PKR",
    "discountPercent": 19,
    "image": "/assets/images/products/bitdefender.webp",
    "galleryImages": [
      "/assets/images/products/bitdefender.webp"
    ],
    "tags": [
      "Instant",
      "Bitdefender",
      "1 Year",
      "3 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Multi-layer ransomware protection",
      "Anti-phishing and anti-fraud guard",
      "Covers 1 device(s)"
    ],
    "brand": "Bitdefender",
    "imageKey": "bitdefender",
    "variants": [
      {
        "id": "v-PB-SWF-054",
        "name": "1 Device 1 Year",
        "price": 604,
        "originalPrice": 750,
        "sku": "PB-SWF-054",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-055",
        "name": "10 Devices 1 Year",
        "price": 5263,
        "originalPrice": 6000,
        "sku": "PB-SWF-055",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-056",
        "name": "3 Devices 2026 2 Years",
        "price": 24911,
        "originalPrice": 28500,
        "sku": "PB-SWF-056",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-swf-058",
    "sku": "PB-SWF-058",
    "name": "Bitdefender Antivirus Plus",
    "slug": "bitdefender-antivirus-plus",
    "category": "Software",
    "description": "Bitdefender Antivirus Plus license for 1 device(s) — multi-layer ransomware protection, web attack prevention and anti-fraud for the full term.",
    "price": 2523,
    "originalPrice": 3000,
    "currency": "PKR",
    "discountPercent": 16,
    "image": "/assets/images/products/bitdefender.webp",
    "galleryImages": [
      "/assets/images/products/bitdefender.webp"
    ],
    "tags": [
      "Instant",
      "Bitdefender",
      "2 Years",
      "2 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Multi-layer ransomware protection",
      "Anti-phishing and anti-fraud guard",
      "Covers 1 device(s)"
    ],
    "brand": "Bitdefender",
    "imageKey": "bitdefender",
    "variants": [
      {
        "id": "v-PB-SWF-058",
        "name": "1 Device 2 Years",
        "price": 2523,
        "originalPrice": 3000,
        "sku": "PB-SWF-058",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-057",
        "name": "5 Devices 3 Years 2025",
        "price": 5360,
        "originalPrice": 6000,
        "sku": "PB-SWF-057",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-swf-059",
    "sku": "PB-SWF-059",
    "name": "McAfee Total Protection",
    "slug": "mcafee-total-protection",
    "category": "Software",
    "description": "McAfee Total Protection license for 1 device(s) — antivirus, identity monitoring, safe web browsing and a password manager included.",
    "price": 1313,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 12,
    "image": "/assets/images/products/mcafee.webp",
    "galleryImages": [
      "/assets/images/products/mcafee.webp"
    ],
    "tags": [
      "Instant",
      "McAfee",
      "1 Year",
      "5 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Real-time antivirus protection",
      "Identity and privacy monitoring",
      "Secure VPN on unlimited devices"
    ],
    "brand": "McAfee",
    "imageKey": "mcafee",
    "variants": [
      {
        "id": "v-PB-SWF-059",
        "name": "1 Device 1 Year",
        "price": 1313,
        "originalPrice": 1500,
        "sku": "PB-SWF-059",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-061",
        "name": "3 Devices 1 Year",
        "price": 2210,
        "originalPrice": 2500,
        "sku": "PB-SWF-061",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-060",
        "name": "1 Device 3 Years",
        "price": 4155,
        "originalPrice": 5000,
        "sku": "PB-SWF-060",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-062",
        "name": "5 Devices 2 Years",
        "price": 5537,
        "originalPrice": 6500,
        "sku": "PB-SWF-062",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-063",
        "name": "10 Devices 1 Year",
        "price": 5537,
        "originalPrice": 6500,
        "sku": "PB-SWF-063",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-swf-064",
    "sku": "PB-SWF-064",
    "name": "Kaspersky Standard 5 Devices 2 Years Europe",
    "slug": "kaspersky-standard-5-devices-2-years-europe",
    "category": "Software",
    "description": "Kaspersky Standard license for 5 devices — award-winning malware engine, safe banking tools and performance optimization.",
    "price": 6925,
    "originalPrice": 8000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/kaspersky.webp",
    "galleryImages": [
      "/assets/images/products/kaspersky.webp"
    ],
    "tags": [
      "Instant",
      "Kaspersky",
      "2 Years"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Europe",
    "features": [
      "Top-rated antivirus engine",
      "Safe online banking mode",
      "Essential protection suite"
    ],
    "brand": "Kaspersky",
    "imageKey": "kaspersky"
  },
  {
    "id": "pb-swf-065",
    "sku": "PB-SWF-065",
    "name": "Kaspersky Premium 5 Devices 1 Year",
    "slug": "kaspersky-premium-5-devices-1-year",
    "category": "Software",
    "description": "Kaspersky Premium license for 5 devices — award-winning malware engine, safe banking tools and performance optimization.",
    "price": 9695,
    "originalPrice": 11000,
    "currency": "PKR",
    "discountPercent": 12,
    "image": "/assets/images/products/kaspersky.webp",
    "galleryImages": [
      "/assets/images/products/kaspersky.webp"
    ],
    "tags": [
      "Instant",
      "Kaspersky",
      "1 Year"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "Top-rated antivirus engine",
      "Safe online banking mode",
      "Premium VPN and identity tools"
    ],
    "brand": "Kaspersky",
    "imageKey": "kaspersky"
  },
  {
    "id": "pb-vpn-001",
    "sku": "PB-VPN-001",
    "name": "NordVPN",
    "slug": "nordvpn",
    "category": "Software",
    "description": "NordVPN plan (shared line) — 6,000+ servers in 111 countries with Threat Protection and Meshnet.",
    "price": 499,
    "originalPrice": 600,
    "currency": "PKR",
    "discountPercent": 17,
    "image": "/assets/images/products/nordvpn.webp",
    "galleryImages": [
      "/assets/images/products/nordvpn.webp"
    ],
    "tags": [
      "Instant",
      "NordVPN",
      "1 Month",
      "10 Options"
    ],
    "digital": true,
    "productType": "digital",
    "stock": 999,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Instant Auto-Email",
    "deliveryInfo": "Delivered to your email and PlayBeat account within minutes of payment confirmation, with full-duration warranty support.",
    "region": "Global",
    "features": [
      "6,000+ RAM-only servers worldwide",
      "Threat Protection malware blocker",
      "Managed shared access"
    ],
    "brand": "NordVPN",
    "imageKey": "nordvpn",
    "variants": [
      {
        "id": "v-PB-VPN-001",
        "name": "1 Month Shared",
        "price": 499,
        "originalPrice": 600,
        "sku": "PB-VPN-001",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-025",
        "name": "Basic 1 Month Global",
        "price": 1518,
        "originalPrice": 2000,
        "sku": "PB-SWF-025",
        "badge": "Instant"
      },
      {
        "id": "v-PB-VPN-002",
        "name": "Full Private 1 Month",
        "price": 1999,
        "originalPrice": 2500,
        "sku": "PB-VPN-002",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-026",
        "name": "Basic 3 Months Global",
        "price": 2413,
        "originalPrice": 3000,
        "sku": "PB-SWF-026",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-028",
        "name": "Basic 1 Year Europe",
        "price": 3964,
        "originalPrice": 4500,
        "sku": "PB-SWF-028",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-027",
        "name": "Basic 1 Year Global",
        "price": 4629,
        "originalPrice": 5500,
        "sku": "PB-SWF-027",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-031",
        "name": "Complete 1 Year with NordPass Global",
        "price": 4811,
        "originalPrice": 5500,
        "sku": "PB-SWF-031",
        "badge": "Instant"
      },
      {
        "id": "v-PB-VPN-003",
        "name": "Full Private 1 Year",
        "price": 8500,
        "originalPrice": 10000,
        "sku": "PB-VPN-003",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-029",
        "name": "Basic 2 Years Global",
        "price": 10592,
        "originalPrice": 12000,
        "sku": "PB-SWF-029",
        "badge": "Instant"
      },
      {
        "id": "v-PB-SWF-030",
        "name": "Basic 2 Years Europe",
        "price": 29415,
        "originalPrice": 34000,
        "sku": "PB-SWF-030",
        "badge": "Instant"
      }
    ],
    "variantLabel": "Plan"
  },
  {
    "id": "pb-zbp-001",
    "sku": "PB-ZBP-001",
    "name": "190cm Stand for Projector",
    "slug": "190cm-stand-for-projector",
    "category": "Smart Projectors",
    "description": "Universal 190 cm floor stand for projectors — heavy-duty height-adjustable aluminum tripod with 360° rotating mount plate, anti-slip feet and cable management.",
    "price": 1121,
    "originalPrice": 1500,
    "currency": "PKR",
    "discountPercent": 25,
    "image": "/assets/images/products/projector-stand.webp",
    "galleryImages": [
      "/assets/images/products/projector-stand.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "Smart LED projection",
      "Screen mirroring",
      "HDMI + USB",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Accessories",
    "imageKey": "projector-stand"
  },
  {
    "id": "pb-zbp-002",
    "sku": "PB-ZBP-002",
    "name": "A10",
    "slug": "a10",
    "category": "Smart Projectors",
    "description": "A10 smart projector — A10 · 1280x720P Native · 300 ANSI Lumens · Android 11 · WiFi · 4K decoding ·  35dB cooling ·  160° adjustable projection. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 31270,
    "originalPrice": 36000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-a10.webp",
    "galleryImages": [
      "/assets/images/products/proj-a10.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1280x720P Native",
      "300 ANSI lumens",
      "Android 11",
      "WiFi wireless",
      "4K Decoding",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-a10",
    "projectorSpec": {
      "nativeResolution": "1280x720P Native",
      "brightnessAnsi": 300,
      "os": "Android 11",
      "wifi": "WiFi",
      "specialFeatures": [
        "4K Decoding"
      ]
    }
  },
  {
    "id": "pb-zbp-003",
    "sku": "PB-ZBP-003",
    "name": "F18",
    "slug": "f18",
    "category": "Smart Projectors",
    "description": "F18 smart projector — F18 · 1920x1080P Native  · Android 10 · WiFi · 4K support ·  8000:1 Contrast ·  MEMC. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 88500,
    "originalPrice": 102000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-f18.webp",
    "galleryImages": [
      "/assets/images/products/proj-f18.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "Android 10",
      "WiFi wireless",
      "4K Decoding",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-f18",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "os": "Android 10",
      "wifi": "WiFi",
      "specialFeatures": [
        "4K Decoding"
      ]
    }
  },
  {
    "id": "pb-zbp-004",
    "sku": "PB-ZBP-004",
    "name": "HCS350MAX",
    "slug": "hcs350max",
    "category": "Smart Projectors",
    "description": "HCS350MAX smart projector — HCS350 HCS350MAX · 1280x720P Native  · Android 11 · WiFi 6 · 36 · 000+ game support ·  2 controllers. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 43070,
    "originalPrice": 49500,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hcs350max.webp",
    "galleryImages": [
      "/assets/images/products/proj-hcs350max.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1280x720P Native",
      "Android 11",
      "WiFi 6 wireless",
      "4K Decoding",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hcs350max",
    "projectorSpec": {
      "nativeResolution": "1280x720P Native",
      "os": "Android 11",
      "wifi": "WiFi 6",
      "specialFeatures": [
        "4K Decoding"
      ]
    }
  },
  {
    "id": "pb-zbp-005",
    "sku": "PB-ZBP-005",
    "name": "HCS350PRO",
    "slug": "hcs350pro",
    "category": "Smart Projectors",
    "description": "HCS350PRO smart projector — HCS350 HCS350PRO · 1280x720P Native  · Android 11 · WiFi 6 · 36 · 000+ game support ·  2 controllers. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 40710,
    "originalPrice": 47000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hcs350pro.webp",
    "galleryImages": [
      "/assets/images/products/proj-hcs350pro.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1280x720P Native",
      "Android 11",
      "WiFi 6 wireless",
      "4K Decoding",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hcs350pro",
    "projectorSpec": {
      "nativeResolution": "1280x720P Native",
      "os": "Android 11",
      "wifi": "WiFi 6",
      "specialFeatures": [
        "4K Decoding"
      ]
    }
  },
  {
    "id": "pb-zbp-006",
    "sku": "PB-ZBP-006",
    "name": "Hongtop P10",
    "slug": "hongtop-p10",
    "category": "Smart Projectors",
    "description": "Hongtop P10 smart projector — Hongtop P10 · 1280x720P Native · 300 ANSI Lumens · Android 10 · WiFi · Portable mini design ·  Electric adjustment of focusing distance. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 41890,
    "originalPrice": 48000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hongtop-p10.webp",
    "galleryImages": [
      "/assets/images/products/proj-hongtop-p10.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1280x720P Native",
      "300 ANSI lumens",
      "Android 10",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hongtop-p10",
    "projectorSpec": {
      "nativeResolution": "1280x720P Native",
      "brightnessAnsi": 300,
      "os": "Android 10",
      "wifi": "WiFi"
    }
  },
  {
    "id": "pb-zbp-007",
    "sku": "PB-ZBP-007",
    "name": "HY300 Plus",
    "slug": "hy300-plus",
    "category": "Smart Projectors",
    "description": "HY300 Plus smart projector — DI TONG HY300 Plus · 1280x720P Native · 300 ANSI Lumens · Android 11 · WiFi 6 · Compact portable ·  Support Lifting ·  Electronic Focus. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 26550,
    "originalPrice": 30500,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy300-plus.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy300-plus.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1280x720P Native",
      "300 ANSI lumens",
      "Android 11",
      "WiFi 6 wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy300-plus",
    "projectorSpec": {
      "nativeResolution": "1280x720P Native",
      "brightnessAnsi": 300,
      "os": "Android 11",
      "wifi": "WiFi 6"
    }
  },
  {
    "id": "pb-zbp-008",
    "sku": "PB-ZBP-008",
    "name": "HY320 NTV (Netflix Licensed)",
    "slug": "hy320-ntv-netflix-licensed",
    "category": "Smart Projectors",
    "description": "HY320 NTV (Netflix Licensed) smart projector — Magcubic HY320 NTV · - Native  · - · WiFi · Netflix Licensed ·  Available in White/Black/Grey. Official Netflix-licensed model with built-in apps. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 40710,
    "originalPrice": 47000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy320-ntv.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy320-ntv.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": true,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "WiFi wireless",
      "Netflix Licensed",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy320-ntv",
    "projectorSpec": {
      "wifi": "WiFi",
      "specialFeatures": [
        "Netflix Licensed"
      ]
    }
  },
  {
    "id": "pb-zbp-009",
    "sku": "PB-ZBP-009",
    "name": "HY7 Built-in Battery Projector",
    "slug": "hy7-built-in-battery-projector",
    "category": "Smart Projectors",
    "description": "PlayBeat HY7 Built-in Battery Projector smart projector — genuine 720P HD-ready LED projection with smart TV experience, screen mirroring and HDMI/USB connectivity. Backed by PlayBeat hardware warranty and local support.",
    "price": 52510,
    "originalPrice": 60500,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy7.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy7.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "Smart LED projection",
      "Screen mirroring",
      "HDMI + USB",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy7"
  },
  {
    "id": "pb-zbp-010",
    "sku": "PB-ZBP-010",
    "name": "Magcubic HY300 PRO",
    "slug": "magcubic-hy300-pro",
    "category": "Smart Projectors",
    "description": "HY300 PRO smart projector — Magcubic HY450GT · 1920x1080P Native · 1100 ANSI Lumens · Google TV · WiFi · Obstacle Avoidance ·  Screen Recognition. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 21122,
    "originalPrice": 24500,
    "currency": "PKR",
    "discountPercent": 14,
    "image": "/assets/images/products/proj-hy300-pro.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy300-pro.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": true,
    "isHot": true,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "1100 ANSI lumens",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy300-pro",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "brightnessAnsi": 1100,
      "wifi": "WiFi"
    }
  },
  {
    "id": "pb-zbp-011",
    "sku": "PB-ZBP-011",
    "name": "Magcubic HY300Pro Plus",
    "slug": "magcubic-hy300pro-plus",
    "category": "Smart Projectors",
    "description": "HY300Pro Plus smart projector — Magcubic HY450GT · 1920x1080P Native · 1100 ANSI Lumens · Google TV · WiFi · Obstacle Avoidance ·  Screen Recognition. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 22538,
    "originalPrice": 26000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy300pro-plus.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy300pro-plus.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "1100 ANSI lumens",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy300pro-plus",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "brightnessAnsi": 1100,
      "wifi": "WiFi"
    }
  },
  {
    "id": "pb-zbp-012",
    "sku": "PB-ZBP-012",
    "name": "Magcubic HY300X",
    "slug": "magcubic-hy300x",
    "category": "Smart Projectors",
    "description": "HY300X smart projector — Magcubic HY450GT · 1920x1080P Native · 1100 ANSI Lumens · Google TV · WiFi · Obstacle Avoidance ·  Screen Recognition. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 23010,
    "originalPrice": 26500,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy300x.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy300x.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "1100 ANSI lumens",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy300x",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "brightnessAnsi": 1100,
      "wifi": "WiFi"
    }
  },
  {
    "id": "pb-zbp-013",
    "sku": "PB-ZBP-013",
    "name": "Magcubic HY310",
    "slug": "magcubic-hy310",
    "category": "Smart Projectors",
    "description": "HY310 smart projector — Magcubic HY450GT · 1920x1080P Native · 1100 ANSI Lumens · Google TV · WiFi · Obstacle Avoidance ·  Screen Recognition. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 34220,
    "originalPrice": 39500,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy310.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy310.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "1100 ANSI lumens",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy310",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "brightnessAnsi": 1100,
      "wifi": "WiFi"
    }
  },
  {
    "id": "pb-zbp-014",
    "sku": "PB-ZBP-014",
    "name": "Magcubic HY320MINI",
    "slug": "magcubic-hy320mini",
    "category": "Smart Projectors",
    "description": "HY320MINI smart projector — Magcubic HY450GT · 1920x1080P Native · 1100 ANSI Lumens · Google TV · WiFi · Obstacle Avoidance ·  Screen Recognition. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 25370,
    "originalPrice": 29000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy320mini.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy320mini.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "1100 ANSI lumens",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy320mini",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "brightnessAnsi": 1100,
      "wifi": "WiFi"
    }
  },
  {
    "id": "pb-zbp-015",
    "sku": "PB-ZBP-015",
    "name": "Magcubic HY320PRO",
    "slug": "magcubic-hy320pro",
    "category": "Smart Projectors",
    "description": "HY320PRO smart projector — Magcubic HY450GT · 1920x1080P Native · 1100 ANSI Lumens · Google TV · WiFi · Obstacle Avoidance ·  Screen Recognition. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 35990,
    "originalPrice": 41500,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy320pro.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy320pro.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "1100 ANSI lumens",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy320pro",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "brightnessAnsi": 1100,
      "wifi": "WiFi"
    }
  },
  {
    "id": "pb-zbp-016",
    "sku": "PB-ZBP-016",
    "name": "Magcubic HY350 Upgraded+",
    "slug": "magcubic-hy350-upgraded",
    "category": "Smart Projectors",
    "description": "HY350 Upgraded+ smart projector — Magcubic HY450GT · 1920x1080P Native · 1100 ANSI Lumens · Google TV · WiFi · Obstacle Avoidance ·  Screen Recognition. Includes remote, power adapter and full PlayBeat warranty with local after-sales support.",
    "price": 42480,
    "originalPrice": 49000,
    "currency": "PKR",
    "discountPercent": 13,
    "image": "/assets/images/products/proj-hy350.webp",
    "galleryImages": [
      "/assets/images/products/proj-hy350.webp"
    ],
    "tags": [
      "Projector",
      "Home Cinema",
      "PlayBeat Warranty"
    ],
    "digital": false,
    "productType": "physical",
    "stock": 10,
    "status": "in_stock",
    "active": true,
    "rating": 0,
    "reviewCount": 0,
    "isFeatured": false,
    "isHot": false,
    "isFlashDeal": false,
    "deliveryType": "Courier Shipping (1-3 Days)",
    "deliveryInfo": "Quality-checked hardware dispatched via insured express courier with real-time tracking (1-3 working days).",
    "region": "Global",
    "features": [
      "1920x1080P Native",
      "1100 ANSI lumens",
      "WiFi wireless",
      "1-year PlayBeat hardware warranty"
    ],
    "brand": "PlayBeat Projectors",
    "imageKey": "proj-hy350",
    "projectorSpec": {
      "nativeResolution": "1920x1080P Native",
      "brightnessAnsi": 1100,
      "wifi": "WiFi"
    }
  }
]

export const PRODUCTS_CATALOG: Product[] = RAW_PRODUCTS_CATALOG.map((item) => ({
  ...item,
  slug: item.slug || ensureProductSlug(item),
  shortDescription: item.shortDescription || item.description?.slice(0, 120) + (item.description?.length > 120 ? '...' : ''),
  status: item.stock > 0 ? 'in_stock' : 'out_of_stock',
  featured: item.featured !== undefined ? item.featured : Boolean(item.isFeatured),
  deliveryInfo: item.deliveryInfo || (item.digital !== false ? 'Instant automated digital delivery with full warranty support.' : 'Inspected & dispatched via insured express courier (1-3 days).'),
  gallery: item.gallery || item.galleryImages || (item.image ? [item.image] : []),
  additionalImages: item.additionalImages || item.galleryImages || [],
}))
