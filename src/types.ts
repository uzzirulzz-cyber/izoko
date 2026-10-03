export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'CAD'

export interface ProductVariant {
  id: string
  name: string
  price: number // base price in PKR
  originalPrice?: number
  sku?: string
  badge?: string
}

// Reusable subscription-plan sub-document (Section 4.3) — generalizes the
// ai-subscriptions duration model (1/3/6/12 months) for ANY product.
export interface ProductPlan {
  id: string
  label: string // "1 Month", "Annual" …
  months?: number // normalized duration when applicable
  price: number
  originalPrice?: number
  sku?: string
  badge?: string
}

// Customer review (verified purchasers only — server-enforced)
export interface ProductReview {
  id: string
  productId: string
  userName: string
  rating: number
  title?: string
  body: string
  status?: 'pending' | 'approved' | 'hidden'
  featured?: boolean
  verifiedPurchase?: boolean
  createdAt?: string | Date
}

export interface ProjectorSpec {
  nativeResolution: string
  brightnessAnsi: number | string
  os?: string
  cpu?: string
  ramRom?: string
  wifi?: string
  bluetooth?: string
  focus?: string
  keystone?: string
  speaker?: string
  power?: string
  specialFeatures?: string[]
}

export type ProductCategory =
  | 'Digital Products'
  | 'Gift Cards'
  | 'Streaming'
  | 'Subscriptions'
  | 'Gaming'
  | 'Software'
  | 'IPTV & Services'
  | 'Smart Projectors'
  | 'AI & Productivity'
  | 'Games'
  | 'IPTV & Streaming'
  | 'Bundles'
  | string

// Admin-managed per-product SEO overrides (audit §25) — all optional; when a
// field is empty the storefront generates a sensible default automatically.
export interface ProductSeo {
  title?: string // custom <title> (brand suffix added automatically)
  description?: string // custom meta description
  canonicalUrl?: string // absolute https://playbeat.digital/... override — advanced
  index?: boolean // false = noindex, nofollow (default: index when active)
  follow?: boolean // false = nofollow links (default: follow)
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  twitterTitle?: string // X/Twitter card override (falls back to ogTitle/title)
  twitterDescription?: string
  twitterImage?: string
  focusKeyword?: string // content-quality aid — validated against title/desc/slug
  secondaryKeywords?: string[]
}

export interface Product {
  _id?: string
  id: string
  sku: string
  name: string
  slug: string
  category: ProductCategory
  productType?: 'digital' | 'physical'
  description: string
  shortDescription?: string
  detailedDescription?: string
  price: number // base price in PKR
  originalPrice?: number
  compareAtPrice?: number
  currency?: string
  discountPercent?: number
  image: string
  galleryImages?: string[]
  gallery?: string[]
  additionalImages?: string[]
  tags: string[]
  digital: boolean
  stock: number
  stockMode?: 'finite' | 'unlimited'
  lowStockThreshold?: number
  downloadUrl?: string
  activationNotes?: string
  plans?: ProductPlan[]
  status?: 'in_stock' | 'out_of_stock' | 'preorder'
  rating: number
  reviewCount: number
  isHot?: boolean
  isFeatured?: boolean
  featured?: boolean
  active?: boolean
  isFlashDeal?: boolean
  flashDealEnds?: string
  variants?: ProductVariant[]
  variantLabel?: string // dropdown label for variants: 'Denomination' | 'Plan' | 'Edition' | 'Region' ...
  consolidatedParentId?: string // set on child products hidden after variant consolidation
  projectorSpec?: ProjectorSpec
  deliveryType?: 'Instant Auto-Email' | 'Courier Shipping (1-3 Days)' | 'Direct Activation' | string
  deliveryInfo?: string
  region?: 'Global' | 'USA' | 'Europe' | 'Asia' | 'Pakistan' | string
  features?: string[]
  seo?: ProductSeo
  slugHistory?: string[] // previous slugs — old URLs 301 to the current one
  // ---- Product CMS (WooCommerce/Shopify-style editor) additive fields ----
  // All optional & additive: the storefront keeps reading the existing fields,
  // these only enrich the admin editor, JSON-LD and the merchant feed.
  cmsStatus?: 'draft' | 'published' | 'archived'
  costPrice?: number // internal — margin display only, never shown to customers
  saleStartsAt?: string // ISO date — informational + JSON-LD priceValidUntil
  saleEndsAt?: string
  brand?: string // falls back to "PlayBeat Digital" in JSON-LD / merchant feed
  subcategory?: string
  productKind?: string // Digital Product | Subscription | Gift Card | Streaming Account | Software Key | IPTV | Smart Projector | Physical Product
  backorder?: 'allow' | 'deny'
  deliveryEstimate?: string // human-readable, e.g. "within 2 minutes" / "2-4 days"
  galleryMeta?: { url: string; alt?: string; title?: string }[] // per-image alt/title (URLs only — never base64)
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface UserAccount {
  id: string
  name: string
  email: string
  role?: 'user' | 'admin'
  provider?: 'local' | 'Google' | 'Facebook'
  createdAt?: string
}

export interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  variantName?: string
  licenseKeys?: string[]
  deliveryType?: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  items: OrderItem[]
  totalAmount: number
  currency: string
  status: 'completed' | 'processing' | 'cancelled' | 'pending'
  paymentMethod: string
  createdAt: string
  licenseKeysDelivered?: string[]
}

export interface CartItem {
  product: Product
  selectedVariant?: ProductVariant
  quantity: number
  unitPrice: number
}

export interface CategoryMeta {
  name: string
  slug: string
  iconName: string
  description: string
  accentColor: string
  glowColor: string
  badgeText?: string
  image: string
  productCount?: number
}
