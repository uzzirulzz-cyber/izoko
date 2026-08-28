export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'CAD'

export interface ProductVariant {
  id: string
  name: string
  price: number // base price in PKR
  originalPrice?: number
  sku?: string
  badge?: string
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
  projectorSpec?: ProjectorSpec
  deliveryType?: 'Instant Auto-Email' | 'Courier Shipping (1-3 Days)' | 'Direct Activation' | string
  deliveryInfo?: string
  region?: 'Global' | 'USA' | 'Europe' | 'Asia' | 'Pakistan' | string
  features?: string[]
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface UserAccount {
  id: string
  name: string
  email: string
  role?: 'user' | 'admin'
  provider?: 'local' | 'Google' | 'Facebook' | 'TikTok' | 'Instagram'
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
