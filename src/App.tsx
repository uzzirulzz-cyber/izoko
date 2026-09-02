import React, { useState, useEffect, useMemo } from 'react'
import { Header } from './components/Header'
import { HeroBanner } from './components/HeroBanner'
import { CategoryNav } from './components/CategoryNav'
import { ProductCard } from './components/ProductCard'
import { ProjectorSpecMatrix } from './components/ProjectorSpecMatrix'
import { LayoutGrid } from 'lucide-react'
import { SmartProjectorShowcase } from './components/SmartProjectorShowcase'
import { TrustFeatures } from './components/TrustFeatures'
import { FAQSection } from './components/FAQSection'
import { QuickViewModal } from './components/QuickViewModal'
import { CartDrawer } from './components/CartDrawer'
import { WishlistDrawer } from './components/WishlistDrawer'
import { AuthModal } from './components/AuthModal'
import { AccountDrawer } from './components/AccountDrawer'
import { Footer } from './components/Footer'
import { AdminInsightsView } from './components/AdminInsightsView'
import { AdminLogin } from './components/AdminLogin'
import { PolicyPage } from './components/PolicyPage'
import { ContactPage } from './components/ContactPage'
import { NotFound } from './components/NotFound'
import { LiveSupportWidget } from './components/LiveSupportWidget'
import { PRODUCTS_CATALOG as INITIAL_PRODUCTS } from './data/products'
import { Product, CurrencyCode, CartItem, ProductVariant } from './types'
import { applyRouteSeo } from './lib/seo'
import { applyProductJsonLd } from './lib/seo'
import { SEO_PRESETS } from './lib/seo'

// Route → SEO preset lookup (admin routes noindex themselves)
const SEO_PRESET_BY_ROUTE: Record<string, (typeof SEO_PRESETS)[string]> = {
  storefront: SEO_PRESETS.storefront,
  streaming: SEO_PRESETS.streaming,
  subscriptions: SEO_PRESETS.subscriptions,
  giftcards: SEO_PRESETS.giftcards,
  gaming: SEO_PRESETS.gaming,
  software: SEO_PRESETS.software,
  'smart-projectors': SEO_PRESETS['smart-projectors'],
  'smart-4k-projectors': SEO_PRESETS['smart-4k-projectors'],
  'ai-subscriptions': SEO_PRESETS['ai-subscriptions'],
  'steam-game-keys': SEO_PRESETS['steam-game-keys'],
  'windows-office': SEO_PRESETS['windows-office'],
  'creative-software': SEO_PRESETS['creative-software'],
  compare: SEO_PRESETS.compare,
  warranty: SEO_PRESETS.warranty,
  privacy: SEO_PRESETS.privacy,
  terms: SEO_PRESETS.terms,
  'refund-policy': SEO_PRESETS['refund-policy'],
  'shipping-policy': SEO_PRESETS['shipping-policy'],
  contact: SEO_PRESETS.contact,
  admin: SEO_PRESETS.admin,
  'admin-login': SEO_PRESETS['admin-login'],
  notfound: SEO_PRESETS.notfound,
}
import { Search, ArrowUpDown, CheckCircle, ArrowRight, Sparkles } from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

// Admin token helper — used for product CRUD sync to MongoDB
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

// Persist a product to MongoDB (create or update). Returns the canonical product
// from the server so the local catalog can adopt the database _id.
async function syncProductToMongo(
  product: Product,
  isNew: boolean
): Promise<{ ok: boolean; error?: string; saved?: Product }> {
  try {
    const token = getAdminToken()
    if (!token) return { ok: true }
    const url = isNew
      ? `${API_BASE}/api/admin/products`
      : `${API_BASE}/api/admin/products/${encodeURIComponent(product._id || product.id || product.sku)}`
    const res = await fetch(url, {
      method: isNew ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify(product),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.success) return { ok: true, saved: data.product }
    return { ok: false, error: data?.error || `Sync failed (${res.status})` }
  } catch {
    return { ok: false, error: 'Backend unreachable — change saved locally only' }
  }
}

// Delete a product from MongoDB
async function deleteProductFromMongo(productId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = getAdminToken()
    if (!token) return { ok: true }
    const res = await fetch(
      `${API_BASE}/api/admin/products/${encodeURIComponent(productId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      }
    )
    const data = await res.json().catch(() => null)
    if (res.ok && data?.success) return { ok: true }
    return { ok: false, error: data?.error || `Delete failed (${res.status})` }
  } catch {
    return { ok: false, error: 'Backend unreachable — product removed locally only' }
  }
}

type Route =
  | 'storefront'
  | 'admin-login'
  | 'admin'
  | 'privacy'
  | 'terms'
  | 'refund-policy'
  | 'shipping-policy'
  | 'warranty'
  | 'contact'
  | 'streaming'
  | 'subscriptions'
  | 'giftcards'
  | 'gaming'
  | 'software'
  | 'smart-projectors'
  | 'smart-4k-projectors'
  | 'ai-subscriptions'
  | 'steam-game-keys'
  | 'windows-office'
  | 'creative-software'
  | 'compare'
  | 'notfound'

const POLICY_ROUTES: Route[] = ['privacy', 'terms', 'refund-policy', 'shipping-policy', 'warranty', 'contact', 'compare']

// Category routes — each maps a URL slug to a product category name
const CATEGORY_ROUTES: Record<string, string> = {
  'streaming': 'Streaming',
  'subscriptions': 'Subscriptions',
  'giftcards': 'Gift Cards',
  'gaming': 'Gaming',
  'software': 'Software',
  'smart-projectors': 'Smart Projectors',
}
const CATEGORY_ROUTE_KEYS = Object.keys(CATEGORY_ROUTES) as Route[]

// Reverse mapping: category name → URL slug
const CATEGORY_TO_SLUG: Record<string, string> = Object.entries(CATEGORY_ROUTES).reduce(
  (acc, [slug, name]) => { acc[name] = slug; return acc },
  {} as Record<string, string>
)

// ---------------------------------------------------------------------------
// Curated subcategory collections — real, indexable URLs that filter the
// catalog across categories (e.g. "AI Subscriptions" spans Subscriptions +
// AI & Productivity; "Steam & Game Keys" spans Gaming + Gift Cards).
// ---------------------------------------------------------------------------
const SUBCATEGORY_ROUTES: Record<
  string,
  { label: string; match: (p: Product) => boolean }
> = {
  'smart-4k-projectors': {
    label: 'Smart 4K Projectors',
    match: (p) =>
      p.category === 'Smart Projectors' &&
      (/4k/i.test(p.name) ||
        /4k/i.test(p.projectorSpec?.nativeResolution || '') ||
        (p.tags || []).some((t) => /4k/i.test(t)) ||
        /4k/i.test(p.description || '')),
  },
  'ai-subscriptions': {
    label: 'AI Subscriptions',
    match: (p) =>
      /chatgpt|gpt-?5|perplexity|leonardo|elevenlabs|eleven ?labs|google ?veo|hailio|grammarly|quillbot|turnitin|helium ?10|copilot|midjourney|claude|gemini|\bai\b/i.test(
        `${p.name} ${(p.tags || []).join(' ')} ${p.category}`
      ),
  },
  'steam-game-keys': {
    label: 'Steam & Game Keys',
    match: (p) =>
      /steam|game ?pass|game ?key|xbox|playstation|psn|razer gold|nintendo|gta|valorant/i.test(
        `${p.name} ${(p.tags || []).join(' ')} ${p.category}`
      ),
  },
  'windows-office': {
    label: 'Windows & Office',
    match: (p) =>
      /windows|office|microsoft 365|microsoft365/i.test(`${p.name} ${(p.tags || []).join(' ')}`),
  },
  'creative-software': {
    label: 'Creative Software',
    match: (p) =>
      /adobe|creative cloud|photoshop|illustrator|premiere|capcut|freepik|canva|envato/i.test(
        `${p.name} ${(p.tags || []).join(' ')} ${p.description || ''}`
      ),
  },
}
const SUBCATEGORY_ROUTE_KEYS = Object.keys(SUBCATEGORY_ROUTES) as Route[]

// Pathname-based router (works on Vercel via vercel.json SPA rewrites).
// Also falls back to legacy hash routing so old bookmarks still work.
function parseRoute(): Route {
  if (typeof window === 'undefined') return 'storefront'
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '').replace(/^\//, '')
  // Root path (/) is the homepage — same as storefront
  if (path === '') return 'storefront'
  if (path === 'storefront') return 'storefront' // legacy /storefront still works
  if (path === 'admin/login' || path.startsWith('admin/login/')) return 'admin-login'
  if (path === 'admin' || path.startsWith('admin/')) return 'admin'
  if (POLICY_ROUTES.includes(path as Route)) return path as Route
  if (CATEGORY_ROUTE_KEYS.includes(path as Route)) return path as Route
  if (SUBCATEGORY_ROUTE_KEYS.includes(path as Route)) return path as Route
  // Legacy deep-link rewrites kept from vercel.json (product/category pages are
  // rendered by the storefront catalog + quick-view modal)
  if (path.startsWith('product/') || path.startsWith('category/')) return 'storefront'
  // Legacy hash support: #/admin/login, #/admin
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').trim()
  if (hash.startsWith('admin/login')) return 'admin-login'
  if (hash.startsWith('admin')) return 'admin'
  // Unknown URL → dedicated 404 page (previously fell back to the homepage,
  // which is exactly the SPA-fallback issue the audit flagged)
  return 'notfound'
}

function routeToPath(route: Route): string {
  if (route === 'admin') return '/admin'
  if (route === 'admin-login') return '/admin/login'
  if (route === 'storefront') return '/'
  // 404 keeps the original (unknown) URL in the address bar — never rewrite it
  if (route === 'notfound') return window.location.pathname || '/404'
  if (POLICY_ROUTES.includes(route)) return `/${route}`
  if (CATEGORY_ROUTE_KEYS.includes(route)) return `/${route}`
  if (SUBCATEGORY_ROUTE_KEYS.includes(route)) return `/${route}`
  return '/'
}

function navigate(route: Route, replace = false) {
  const path = routeToPath(route)
  if (window.location.pathname !== path) {
    if (replace) {
      window.history.replaceState({}, '', path)
    } else {
      window.history.pushState({}, '', path)
    }
    // Dispatch a popstate so the route listener picks it up
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

// Navigate to a raw storefront path (e.g. "/smart-4k-projectors", "/contact")
// used by BrowseNow / Header / Footer links that map 1:1 to SPA routes.
function navigatePath(path: string) {
  const target = path && path !== '/' ? path.replace(/\/+$/, '') : '/'
  if (window.location.pathname !== target) {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Verify persisted admin token against backend
async function verifyAdminSession(): Promise<boolean> {
  const token = localStorage.getItem('playbeat_admin_token')
  if (!token) return false
  try {
    const res = await fetch(`${API_BASE}/api/auth/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

function clearAdminSession() {
  localStorage.removeItem('playbeat_admin_token')
  localStorage.removeItem('playbeat_admin_session')
}

export function App() {
  // ============================================
  // ROUTING: pathname-based (with hash fallback for legacy bookmarks)
  // ============================================
  const [route, setRoute] = useState<Route>(() => parseRoute())

  // Admin auth state — only true after explicit login. NEVER auto-login.
  const [adminAuthed, setAdminAuthed] = useState<boolean>(false)
  const [adminChecking, setAdminChecking] = useState<boolean>(false)

  useEffect(() => {
    const onPop = () => {
      setRoute(parseRoute())
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [])

  // Keep URL in sync with route state (replace, not push, to avoid double history entries)
  useEffect(() => {
    const expectedPath = routeToPath(route)
    if (window.location.pathname !== expectedPath) {
      window.history.replaceState({}, '', expectedPath)
    }
  }, [route])

  // Sync selectedCategory with the route — category pages like /streaming
  // automatically filter to that category. Homepage shows all products.
  useEffect(() => {
    if (CATEGORY_ROUTE_KEYS.includes(route)) {
      setSelectedCategory(CATEGORY_ROUTES[route as string] || 'all')
    } else if (route === 'storefront') {
      // Only reset to 'all' when navigating to the homepage explicitly,
      // not on initial load (which might be a deep link to a category)
    }
  }, [route])

  // Per-route SEO — every indexed URL gets its own title/description/canonical.
  useEffect(() => {
    const preset = SEO_PRESET_BY_ROUTE[route]
    if (preset) applyRouteSeo(preset)
  }, [route])

  // Check if the current route should render the storefront (homepage, a
  // category page, or a curated subcategory collection page)
  const isStorefrontRoute =
    route === 'storefront' ||
    CATEGORY_ROUTE_KEYS.includes(route) ||
    SUBCATEGORY_ROUTE_KEYS.includes(route)

  // When navigating to admin, check if a stored admin session is still valid.
  // If valid, let them in. If not, redirect to admin-login. NO auto-login of users.
  useEffect(() => {
    let cancelled = false
    if (route === 'admin' && !adminAuthed) {
      setAdminChecking(true)
      verifyAdminSession()
        .then((ok) => {
          if (cancelled) return
          if (ok) {
            setAdminAuthed(true)
          } else {
            clearAdminSession()
            navigate('admin-login', true)
          }
        })
        .finally(() => {
          if (!cancelled) setAdminChecking(false)
        })
    }
    return () => {
      cancelled = true
    }
  }, [route, adminAuthed])

  // User State — NO auto-login. User must explicitly sign in.
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  // Website Builder CMS settings — live from MongoDB via /api/cms
  const [cmsSettings, setCmsSettings] = useState<any>(null)
  useEffect(() => {
    fetch(`${API_BASE}/api/cms`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.settings) setCmsSettings(d.settings)
      })
      .catch(() => setCmsSettings(null))
  }, [])

  // Analytics — real page_view tracking (one event per route change per session)
  useEffect(() => {
    const sessionKey = 'playbeat_analytics_session'
    let sessionId = sessionStorage.getItem(sessionKey)
    if (!sessionId) {
      sessionId = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem(sessionKey, sessionId)
    }
    const lastPath = sessionStorage.getItem('playbeat_last_view') || ''
    if (route === lastPath) return
    sessionStorage.setItem('playbeat_last_view', route)
    try {
      fetch(`${API_BASE}/api/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'page_view',
          path: routeToPath(route),
          sessionId,
          referrer: document.referrer || '',
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* analytics must never break the app */
    }
  }, [route])

  // Track product_view events when a customer opens a product's quick view
  const handleQuickViewWithTracking = (p: Product) => {
    try {
      const sessionId = sessionStorage.getItem('playbeat_analytics_session') || 'anon'
      fetch(`${API_BASE}/api/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_view',
          path: window.location.pathname,
          productId: p._id || p.id,
          productName: p.name,
          sessionId,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* ignore */
    }
    setQuickViewProduct(p)
  }

  // Social OAuth callback results (?social_success= / ?social_error=)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ok = params.get('social_success')
    const err = params.get('social_error')
    if (ok) {
      // The OAuth callback already set the session cookie — fetch the profile
      fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d?.user) {
            const u = { name: d.user.name, email: d.user.email }
            localStorage.setItem('playbeat_user_token', d.token || '')
            localStorage.setItem('playbeat_user', JSON.stringify(u))
            setUser(u)
            showToast(`Welcome to PlayBeat, ${d.user.name}! Signed up via ${ok}.`)
          } else {
            showToast(`Signed up via ${ok} — session activation may require a refresh.`)
          }
        })
        .catch(() => showToast(`Signed up via ${ok}.`))
      window.history.replaceState({}, '', '/storefront')
    } else if (err) {
      showToast(`Social sign-in notice: ${err}`)
      window.history.replaceState({}, '', '/storefront')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // On mount, verify a stored user token against backend. If invalid, drop it.
  useEffect(() => {
    const savedToken = localStorage.getItem('playbeat_user_token')
    const savedUser = localStorage.getItem('playbeat_user')
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        // Quick backend verify
        fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          credentials: 'include',
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.success && data?.user) {
              setUser({ name: data.user.name, email: data.user.email })
            } else {
              localStorage.removeItem('playbeat_user_token')
              localStorage.removeItem('playbeat_user')
            }
          })
          .catch(() => {
            // network error — keep local copy but don't trust it implicitly
            setUser(parsed)
          })
      } catch {
        localStorage.removeItem('playbeat_user_token')
        localStorage.removeItem('playbeat_user')
      }
    }
    // If no token, user stays null — must explicitly sign in.
  }, [])

  // Core Product Catalog State
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('playbeat_products_catalog_v7')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const seen = new Set<string>()
        const unique = parsed.filter((item: Product) => {
          if (!item || !item.id || seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })
        return unique.length > 0 ? unique : INITIAL_PRODUCTS
      } catch {
        return INITIAL_PRODUCTS
      }
    }
    return INITIAL_PRODUCTS
  })

  // Selected Currency (Default PKR as shown in screenshot)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('playbeat_currency')
    return (saved as CurrencyCode) || 'PKR'
  })

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'under1000' | '1000to5000' | 'above5000'>('all')
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating' | 'discount'>('featured')

  // Shopping Cart & Wishlist
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('playbeat_cart')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
    return []
  })

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const saved = localStorage.getItem('playbeat_wishlist')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
    return []
  })

  // Modals & Drawers
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)

  // Product structured data — inject/remove JSON-LD as the quick-view modal
  // opens and closes so crawlers see accurate product + offer info (audit §11)
  useEffect(() => {
    if (quickViewProduct) {
      applyProductJsonLd({
        name: quickViewProduct.name,
        description: quickViewProduct.description,
        image: quickViewProduct.image,
        price: quickViewProduct.price,
        currency: (quickViewProduct as any).currency,
        inStock: (quickViewProduct as any).stock !== 0,
        sku: quickViewProduct.sku,
      })
    } else {
      applyProductJsonLd(null)
    }
  }, [quickViewProduct])

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [accountTab, setAccountTab] = useState<
    'profile' | 'orders' | 'subscriptions' | 'library' | 'messages' | 'wishlist' | 'settings'
  >('profile')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Persist Products Catalog
  useEffect(() => {
    localStorage.removeItem('playbeat_products_catalog_v4')
    localStorage.removeItem('playbeat_products_catalog_v5')
    localStorage.removeItem('playbeat_products_catalog_v6')
    localStorage.setItem('playbeat_products_catalog_v7', JSON.stringify(products))
  }, [products])

  // Hydrate the catalog from MongoDB (server is source of truth when reachable).
  // If the database is empty, auto-seed it with the bundled official-image catalog.
  // Falls back silently to the bundled catalog when offline.
  useEffect(() => {
    let cancelled = false
    const hydrateFromApi = async () => {
      try {
        // Fetch only ACTIVE products — consolidated children (active=false)
        // are hidden from the public storefront but remain in the DB.
        const res = await fetch(`${API_BASE}/api/products?limit=200`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (cancelled) return

        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          // Extra safety: filter out any inactive products that slip through
          const activeProducts = data.products.filter((p: Product) => p.active !== false)
          setProducts(activeProducts)
          return
        }

        // Empty database — auto-seed with the official bundled catalog (safe: only seeds when empty)
        const seedRes = await fetch(`${API_BASE}/api/admin/products/seed-if-empty`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ products: INITIAL_PRODUCTS }),
        }).catch(() => null)

        if (!seedRes || !seedRes.ok || cancelled) return
        const seedData = await seedRes.json().catch(() => null)
        if (seedData?.success && !cancelled) {
          const refetch = await fetch(`${API_BASE}/api/products?limit=200`, {
            credentials: 'include',
          }).catch(() => null)
          const refetchData = refetch ? await refetch.json().catch(() => null) : null
          if (!cancelled && refetchData?.success && Array.isArray(refetchData.products) && refetchData.products.length > 0) {
            // Filter out inactive (consolidated children) for the storefront
            const activeProducts = refetchData.products.filter((p: Product) => p.active !== false)
            setProducts(activeProducts)
          }
        }
      } catch {
        // backend unreachable — bundled catalog already loaded
      }
    }
    hydrateFromApi()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist Currency
  useEffect(() => {
    localStorage.setItem('playbeat_currency', selectedCurrency)
  }, [selectedCurrency])

  // Persist Cart
  useEffect(() => {
    localStorage.setItem('playbeat_cart', JSON.stringify(cart))
  }, [cart])

  // Persist Wishlist
  useEffect(() => {
    localStorage.setItem('playbeat_wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  // Persist User
  useEffect(() => {
    if (user) {
      localStorage.setItem('playbeat_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('playbeat_user')
    }
  }, [user])

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 2800)
  }

  // Save (create/update) a product from the Admin Console
  const handleSaveProduct = async (
    product: Product,
    isNew: boolean
  ): Promise<{ ok: boolean; error?: string }> => {
    const sync = await syncProductToMongo(product, isNew)
    const canonical = sync.saved || product

    // Local-first: upsert into the catalog state (adopt DB _id when MongoDB responds)
    setProducts((prev) => {
      if (isNew) {
        const withoutDup = prev.filter((p) => p.id !== product.id && p._id !== canonical._id)
        return [canonical, ...withoutDup]
      }
      return prev.map((p) => (p.id === product.id || p._id === product._id ? { ...p, ...canonical } : p))
    })

    if (sync.ok) {
      showToast(
        isNew
          ? `Product "${product.name}" created & synced to MongoDB`
          : `Product "${product.name}" updated & synced`
      )
    } else {
      showToast(`Saved locally — MongoDB sync failed: ${sync.error}`)
    }
    return { ok: true }
  }

  // Delete a product from the Admin Console
  const handleDeleteProduct = async (
    productId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const target = products.find((p) => p.id === productId || p._id === productId)
    setProducts((prev) => prev.filter((p) => p.id !== productId && p._id !== productId))
    // Also remove from wishlist/cart references
    setWishlist((prev) => prev.filter((p) => p.id !== productId && p._id !== productId))

    // Prefer the MongoDB _id when available; the API also matches local ids/skus
    const sync = await deleteProductFromMongo(target?._id || productId)
    if (sync.ok) {
      showToast(
        target
          ? `Product "${target.name}" permanently deleted`
          : 'Product permanently deleted'
      )
    } else {
      showToast(`Removed locally — MongoDB delete failed: ${sync.error}`)
    }
    return { ok: true }
  }

  // Stock update from Admin Console
  const handleUpdateProductStock = (id: string, newStock: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
    )
    showToast(`Inventory updated for SKU #${id}`)
  }

  // Import products from CSV / MongoDB Cloud
  const handleImportProducts = (
    newProducts: Product[],
    mode: 'merge' | 'replace'
  ) => {
    if (mode === 'replace') {
      setProducts(newProducts)
    } else {
      setProducts((prev) => {
        const map = new Map<string, Product>()
        prev.forEach((p) => map.set(p.sku || p.id, p))
        newProducts.forEach((p) => map.set(p.sku || p.id, p))
        return Array.from(map.values())
      })
    }
    showToast(`Catalog updated with ${newProducts.length} imported products`)
  }

  // Add to Cart Handler
  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    setCart((prev) => {
      const variantKey = variant ? variant.id : 'default'
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          (item.selectedVariant?.id || 'default') === variantKey
      )

      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex].quantity += 1
        return updated
      } else {
        const unitPrice = variant ? variant.price : product.price
        return [...prev, { product, selectedVariant: variant, quantity: 1, unitPrice }]
      }
    })

    const title = variant ? `${product.name} (${variant.name})` : product.name
    showToast(`Added to cart successfully! ${title}`)
  }

  // Instant Direct Checkout (buy now)
  const handleInstantBuy = (product: Product, variant?: ProductVariant) => {
    handleAddToCart(product, variant)
    setIsCartOpen(true)
  }

  // Update Cart Item Quantity
  const handleUpdateQty = (productId: string, variantId: string | undefined, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId, variantId)
      return
    }

    setCart((prev) =>
      prev.map((item) => {
        if (
          item.product.id === productId &&
          (item.selectedVariant?.id || undefined) === variantId
        ) {
          return { ...item, quantity: newQty }
        }
        return item
      })
    )
  }

  // Remove Item from Cart
  const handleRemoveFromCart = (productId: string, variantId: string | undefined) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            (item.selectedVariant?.id || undefined) === variantId
          )
      )
    )
    showToast('Item removed from cart')
  }

  // Clear Cart
  const handleClearCart = () => {
    setCart([])
  }

  // Wishlist Toggle
  const handleToggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id)
      if (exists) {
        showToast(`Removed "${product.name}" from wishlist`)
        return prev.filter((p) => p.id !== product.id)
      } else {
        showToast(`Saved "${product.name}" to wishlist`)
        return [...prev, product]
      }
    })
  }

  const isWishlisted = (productId: string) => {
    return wishlist.some((p) => p.id === productId)
  }

  // Storefront-visible products (consolidated variant children stay hidden here,
  // while the admin catalog view still receives the full document set)
  const visibleProducts = useMemo(() => products.filter((p) => p.active !== false), [products])

  // Top 8 Popular Products (tiled across stretched storefront)
  const popularProducts = useMemo(() => {
    // Curated mix: hot items first, then featured, then a round-robin spread across categories
    const hot = visibleProducts.filter((p) => p.isHot)
    const featured = visibleProducts.filter((p) => p.isFeatured && !p.isHot)
    const rest = visibleProducts.filter((p) => !p.isHot && !p.isFeatured)
    const byCat: Record<string, Product[]> = {}
    rest.forEach((p) => {
      ;(byCat[p.category] = byCat[p.category] || []).push(p)
    })
    const spread: Product[] = []
    let added = true
    while (added) {
      added = false
      for (const cat of Object.keys(byCat)) {
        const next = byCat[cat].shift()
        if (next) {
          spread.push(next)
          added = true
        }
      }
    }
    return [...hot, ...featured, ...spread].slice(0, 8)
  }, [visibleProducts])

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    // Curated subcategory collections (e.g. /ai-subscriptions) overlay an
    // additional catalog-wide filter on top of search/category/price filters.
    const subMatcher = SUBCATEGORY_ROUTE_KEYS.includes(route)
      ? SUBCATEGORY_ROUTES[route as string]?.match
      : null
    return visibleProducts
      .filter((p) => {
        // Curated subcategory filter
        if (subMatcher && !subMatcher(p)) return false

        // Search Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchesName = p.name.toLowerCase().includes(q)
          const matchesCat = p.category.toLowerCase().includes(q)
          const matchesSku = p.sku.toLowerCase().includes(q)
          const matchesDesc = p.description.toLowerCase().includes(q)
          if (!matchesName && !matchesCat && !matchesSku && !matchesDesc) {
            return false
          }
        }

        // Category Filter
        if (selectedCategory !== 'all') {
          if (p.category !== selectedCategory) {
            return false
          }
        }

        // Price Filter
        if (priceFilter === 'under1000' && p.price >= 1000) return false
        if (priceFilter === '1000to5000' && (p.price < 1000 || p.price > 5000)) return false
        if (priceFilter === 'above5000' && p.price <= 5000) return false

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price
        if (sortBy === 'price-high') return b.price - a.price
        if (sortBy === 'rating') return b.rating - a.rating
        if (sortBy === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0)
        // Default Featured
        if (a.isHot && !b.isHot) return -1
        if (!a.isHot && b.isHot) return 1
        return 0
      })
  }, [visibleProducts, searchQuery, selectedCategory, priceFilter, sortBy, route])

  // Projectors for Spec Matrix
  const projectorProducts = useMemo(() => {
    const list = visibleProducts.filter((p) => p.category === 'Smart Projectors')
    const isStand = (p: Product) => /stand/i.test(p.name)
    return [...list.filter((p) => !isStand(p)), ...list.filter(isStand)]
  }, [visibleProducts])

  // Cart Subtotal & Total Count
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  }, [cart])

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0)
  }, [cart])

  // Sign out helper — clears user token + state
  const handleUserSignOut = () => {
    localStorage.removeItem('playbeat_user_token')
    localStorage.removeItem('playbeat_user')
    setUser(null)
    setIsAccountOpen(false)
    showToast('Signed out of PlayBeat')
  }

  const handleOpenAccountTab = (
    tab: 'profile' | 'orders' | 'subscriptions' | 'library' | 'messages' | 'wishlist' | 'settings'
  ) => {
    if (!user) {
      setIsAuthOpen(true)
      return
    }
    if (tab === 'wishlist') {
      setIsWishlistOpen(true)
    } else {
      setAccountTab(tab)
      setIsAccountOpen(true)
    }
  }

  // Category selection — sets the filter AND navigates to the category page URL
  // (e.g., clicking "Streaming" goes to /streaming)
  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat)
    if (cat === 'all') {
      navigate('storefront')
    } else if (CATEGORY_TO_SLUG[cat]) {
      navigate(CATEGORY_TO_SLUG[cat] as Route)
    }
  }

  // Cart open must require auth (no guest checkout)
  const handleOpenCart = () => {
    if (!user) {
      setIsAuthOpen(true)
      showToast('Please sign in to access your cart and checkout')
      return
    }
    setIsCartOpen(true)
  }

  // Proceed-to-checkout requires auth — CartDrawer will also enforce
  const handleAddToCartAuth = (product: Product, variant?: ProductVariant) => {
    handleAddToCart(product, variant)
    if (!user) {
      showToast('Added to cart — sign in to checkout')
    }
  }

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans selection:bg-yellow-400 selection:text-slate-950 flex flex-col relative overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#091330] border border-yellow-400/50 shadow-2xl text-xs font-semibold text-white animate-in slide-in-from-bottom-5">
          <div className="w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================
          ROUTING — separate /admin and /storefront
          ============================================ */}
      {route === 'admin' && adminAuthed && (
        <AdminInsightsView
          products={products}
          selectedCurrency={selectedCurrency}
          onBackToStorefront={() => {
            setAdminAuthed(false) // require re-auth next visit (no auto-login)
            clearAdminSession()
            navigate('storefront')
          }}
          onSignOut={() => {
            // Full admin sign-out: terminate session and return to the admin login screen
            setAdminAuthed(false)
            clearAdminSession()
            navigate('admin-login')
          }}
          onQuickViewProduct={(p) => setQuickViewProduct(p)}
          onUpdateProductStock={handleUpdateProductStock}
          onImportProducts={handleImportProducts}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      )}

      {route === 'admin' && !adminAuthed && (
        // Verifying or being redirected to admin-login — show a small loader
        <div className="min-h-screen flex items-center justify-center bg-[#07090E] text-zinc-300">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Verifying administrative session…</span>
          </div>
        </div>
      )}

      {route === 'admin-login' && (
        <AdminLogin
          onSuccess={() => {
            setAdminAuthed(true)
            navigate('admin')
          }}
          onCancel={() => navigate('storefront')}
        />
      )}

      {/* POLICY & CONTACT PAGES — full standalone routes (incl. /warranty) */}
      {(route === 'privacy' ||
        route === 'terms' ||
        route === 'refund-policy' ||
        route === 'shipping-policy' ||
        route === 'warranty') && (
        <PolicyPage
          type={route as 'privacy' | 'terms' | 'refund-policy' | 'shipping-policy' | 'warranty'}
          contact={cmsSettings?.contact}
        />
      )}

      {route === 'contact' && (
        <ContactPage contact={cmsSettings?.contact} social={cmsSettings?.social} />
      )}

      {/* DEDICATED 404 — any URL that doesn't match a known route */}
      {route === 'notfound' && (
        <NotFound
          onNavigate={(path) => {
            if (path === '/') {
              navigate('storefront')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
              const slug = path.replace(/^\//, '')
              if (
                POLICY_ROUTES.includes(slug as Route) ||
                CATEGORY_ROUTE_KEYS.includes(slug as Route) ||
                SUBCATEGORY_ROUTE_KEYS.includes(slug as Route)
              ) {
                navigate(slug as Route)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else {
                navigatePath(path)
              }
            }
          }}
          onShopProducts={() => {
            navigate('storefront', true)
            setSelectedCategory('all')
            setSearchQuery('')
            setTimeout(() => {
              document.getElementById('popular-products-section')?.scrollIntoView({ behavior: 'smooth' })
            }, 80)
          }}
        />
      )}

      {/* COMPARE PAGE — dedicated projector comparison (not on main storefront) */}
      {route === 'compare' && (
        <div className="min-h-screen bg-[#050814] text-slate-100 font-sans">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0A122E] border border-cyan-400/30 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Hardware Specification Matrix
                  </h1>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Side-by-side comparison of every PlayBeat smart projector.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('storefront')}
                className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A122E] border border-slate-400/20 text-xs font-semibold text-slate-200 hover:text-yellow-300 hover:border-yellow-400/40 transition"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                Back to Storefront
              </button>
            </div>
            <div className="rounded-[26px] overflow-hidden border border-slate-400/10">
              <ProjectorSpecMatrix
                projectors={projectorProducts}
                currency={selectedCurrency}
                onAddToCart={(p) => {
                  navigate('storefront')
                  setTimeout(() => handleAddToCart(p), 120)
                }}
                onQuickView={(p) => {
                  navigate('storefront')
                  setTimeout(() => handleQuickViewWithTracking(p), 120)
                }}
              />
            </div>
          </div>
        </div>
      )}
      {/* STOREFRONT (homepage + category pages) — completely separate from admin */}
      {isStorefrontRoute && (
        <>
          {/* CMS Announcement Bar — editable via Website Builder CMS */}
          {cmsSettings?.announcement?.enabled && cmsSettings.announcement.text && (
            <div
              className="w-full bg-gradient-to-r from-amber-400/15 via-[#0A122E] to-amber-400/15 border-b border-amber-400/25 text-center py-2 px-4 cursor-pointer group"
              onClick={() => {
                if (cmsSettings.announcement.link) {
                  window.location.href = cmsSettings.announcement.link
                }
              }}
            >
              <span className="text-[11px] sm:text-xs font-semibold text-amber-300 group-hover:text-amber-200 transition font-mono">
                {cmsSettings.announcement.text}
              </span>
            </div>
          )}

          {/* Main App Header — NO admin link exposed to public users */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            cartCount={cartCount}
            cartTotal={cartTotal}
            onOpenCart={handleOpenCart}
            wishlistCount={wishlist.length}
            onOpenWishlist={() => {
              if (!user) {
                setIsAuthOpen(true)
                showToast('Please sign in to view your wishlist')
                return
              }
              setIsWishlistOpen(true)
            }}
            onSelectCategory={handleSelectCategory}
            selectedCategory={selectedCategory}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenAccountTab={handleOpenAccountTab}
            user={user}
            onSignOut={handleUserSignOut}
            onNavigateHome={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setPriceFilter('all')
              navigate('storefront')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onOpenBrowseCategories={() => {
              document.getElementById('browse-categories')?.scrollIntoView({ behavior: 'smooth' })
            }}
            onOpenOffers={() => {
              setSortBy('discount')
              setSelectedCategory('all')
              setSearchQuery('')
              document.getElementById('popular-products-section')?.scrollIntoView({ behavior: 'smooth' })
              showToast('Showing the biggest discounts first — Offers')
            }}
            onNavigate={(path) => {
              // Header links use real indexable URLs; map them to SPA routes
              if (path === '/') {
                setSearchQuery('')
                setSelectedCategory('all')
                navigate('storefront')
                return
              }
              const slug = path.replace(/^\//, '')
              if (
                POLICY_ROUTES.includes(slug as Route) ||
                CATEGORY_ROUTE_KEYS.includes(slug as Route) ||
                SUBCATEGORY_ROUTE_KEYS.includes(slug as Route)
              ) {
                navigate(slug as Route)
              } else {
                navigatePath(path)
              }
            }}
          />

          {/* Hero Section (Matching Screenshot 1) */}
          {selectedCategory === 'all' && !searchQuery && (
            <HeroBanner
              productsCount={visibleProducts.length}
              categoriesCount={6}
              onExploreProducts={() => {
                const el = document.getElementById('popular-products-section')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              onExploreSubscriptions={() => setSelectedCategory('Subscriptions')}
            />
          )}

          {/* Browse Top Categories (Matching Screenshot 1) */}
          {selectedCategory === 'all' && !searchQuery && (
            <CategoryNav
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              onViewAll={() => setSelectedCategory('all')}
              products={visibleProducts}
            />
          )}

          {/* Smart Projector Showcase Section (right under Browse Top Categories) */}
          {selectedCategory === 'all' && !searchQuery && (
            <SmartProjectorShowcase
              projectors={projectorProducts}
              currency={selectedCurrency}
              onAddToCart={handleAddToCart}
              onQuickView={handleQuickViewWithTracking}
              onExploreAll={() => setSelectedCategory('Smart Projectors')}
            />
          )}

          {/* Popular Products Row (Matching Screenshot 3 & 2) */}
          {selectedCategory === 'all' && !searchQuery && (
            <section id="popular-products-section" className="w-full py-8 bg-[#050814]">
              <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-[#FFC107] inline-block"></span>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                      Popular Products
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedCategory('all')}
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-yellow-400 transition group"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* 8 Popular Cards in Row — tiled denser for stretched layout */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
                  {popularProducts.map((prod) => (
                    <ProductCard
                      key={`popular-${prod.id}`}
                      product={prod}
                      currency={selectedCurrency}
                      onAddToCart={handleAddToCart}
                      onQuickView={handleQuickViewWithTracking}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={isWishlisted(prod.id)}
                      onInstantBuy={handleInstantBuy}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Main Full Catalog View */}
          <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
            {/* Catalog Header & Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-400/10">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-[#FFC107] inline-block"></span>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                  {SUBCATEGORY_ROUTE_KEYS.includes(route)
                    ? SUBCATEGORY_ROUTES[route as string]?.label || 'Curated Collection'
                    : selectedCategory === 'all'
                    ? 'Complete Catalog — Every Product'
                    : selectedCategory}
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold text-yellow-300 bg-[#0A122E] border border-yellow-400/25">
                  {filteredProducts.length} items
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                {/* Price Filter */}
                <div className="flex items-center bg-[#0A122E] p-1 rounded-xl border border-slate-400/15">
                  <button
                    onClick={() => setPriceFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition font-mono ${
                      priceFilter === 'all'
                        ? 'btn-gold-gradient text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setPriceFilter('under1000')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition font-mono ${
                      priceFilter === 'under1000'
                        ? 'btn-gold-gradient text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    &lt; 1k
                  </button>
                  <button
                    onClick={() => setPriceFilter('1000to5000')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition font-mono ${
                      priceFilter === '1000to5000'
                        ? 'btn-gold-gradient text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1k - 5k
                  </button>
                  <button
                    onClick={() => setPriceFilter('above5000')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition font-mono ${
                      priceFilter === 'above5000'
                        ? 'btn-gold-gradient text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hardware (5k+)
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-[#0A122E] px-3 py-1.5 rounded-xl border border-slate-400/15 text-slate-300">
                  <ArrowUpDown className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-slate-400 text-[11px] font-mono">Sort:</span>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="featured" className="bg-[#0A122E] text-white">Featured</option>
                    <option value="price-low" className="bg-[#0A122E] text-white">Price: Low to High</option>
                    <option value="price-high" className="bg-[#0A122E] text-white">Price: High to Low</option>
                    <option value="rating" className="bg-[#0A122E] text-white">Top Rated</option>
                    <option value="discount" className="bg-[#0A122E] text-white">Biggest Discount</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center rounded-[22px] bg-[#0A122E] border border-slate-400/15 p-8">
                <Search className="w-10 h-10 text-slate-500 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No matching items found</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4 font-sans">
                  Try adjusting your search keywords, exploring other category filters, or resetting price thresholds.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                    setPriceFilter('all')
                  }}
                  className="px-4 py-2 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs transition font-mono"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={`catalog-${product.id}`}
                    product={product}
                    currency={selectedCurrency}
                    onAddToCart={handleAddToCart}
                    onQuickView={handleQuickViewWithTracking}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={isWishlisted(product.id)}
                    onInstantBuy={handleInstantBuy}
                  />
                ))}
              </div>
            )}

            {/* FAQ — grounded in the live policies, with FAQPage JSON-LD */}
            {selectedCategory === 'all' && !searchQuery && (
              <FAQSection onNavigate={(path) => {
                const slug = path.replace(/^\//, '')
                if (
                  POLICY_ROUTES.includes(slug as Route) ||
                  CATEGORY_ROUTE_KEYS.includes(slug as Route) ||
                  SUBCATEGORY_ROUTE_KEYS.includes(slug as Route)
                ) {
                  navigate(slug as Route)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                  navigatePath(path)
                }
              }} />
            )}

            {/* Bottom Trust Features Bar (Matching Screenshot 3) */}
            <TrustFeatures />
          </main>

          {/* Footer */}
          <Footer cms={cmsSettings} />

          {/* Quick View Modal — storefront only */}
          <QuickViewModal
            product={quickViewProduct}
            currency={selectedCurrency}
            isOpen={!!quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onAddToCart={handleAddToCart}
            onInstantBuy={handleInstantBuy}
            isWishlisted={quickViewProduct ? isWishlisted(quickViewProduct.id) : false}
            onToggleWishlist={handleToggleWishlist}
          />

          {/* Cart Drawer — requires signed-in user (no guest checkout) */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cart={cart}
            currency={selectedCurrency}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveFromCart}
            onClearCart={handleClearCart}
            user={user}
            onRequireAuth={() => {
              setIsCartOpen(false)
              setIsAuthOpen(true)
              showToast('Please sign in to complete checkout')
            }}
          />

          {/* Wishlist Drawer */}
          <WishlistDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            wishlist={wishlist}
            currency={selectedCurrency}
            onAddToCart={handleAddToCart}
            onRemoveWishlist={handleToggleWishlist}
          />

          {/* Sign Up / Sign In Modal — wired to backend /api/auth/* */}
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onSuccess={(u, token) => {
              if (token) localStorage.setItem('playbeat_user_token', token)
              localStorage.setItem('playbeat_user', JSON.stringify(u))
              setUser(u)
              showToast(`Welcome to PlayBeat, ${u.name}!`)
            }}
          />

          {/* Account Profile Drawer — only when signed in */}
          {user && (
            <AccountDrawer
              isOpen={isAccountOpen}
              onClose={() => setIsAccountOpen(false)}
              activeTab={accountTab}
              onSelectTab={setAccountTab}
              user={user}
              currency={selectedCurrency}
              onSignOut={handleUserSignOut}
              onOpenWishlist={() => {
                setIsAccountOpen(false)
                setIsWishlistOpen(true)
              }}
            />
          )}

          {/* Live Support bubble — storefront customers chat with the admin team */}
          <LiveSupportWidget user={user} />
        </>
      )}
    </div>
  )
}
export default App
