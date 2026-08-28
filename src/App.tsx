import React, { useState, useEffect, useMemo } from 'react'
import { Header } from './components/Header'
import { HeroBanner } from './components/HeroBanner'
import { CategoryNav } from './components/CategoryNav'
import { ProductCard } from './components/ProductCard'
import { ProjectorSpecMatrix } from './components/ProjectorSpecMatrix'
import { SmartProjectorShowcase } from './components/SmartProjectorShowcase'
import { TrustFeatures } from './components/TrustFeatures'
import { SocialSignUpSection } from './components/SocialSignUpSection'
import { QuickViewModal } from './components/QuickViewModal'
import { CartDrawer } from './components/CartDrawer'
import { WishlistDrawer } from './components/WishlistDrawer'
import { AuthModal } from './components/AuthModal'
import { AccountDrawer } from './components/AccountDrawer'
import { Footer } from './components/Footer'
import { AdminInsightsView } from './components/AdminInsightsView'
import { AdminLogin } from './components/AdminLogin'
import { PRODUCTS_CATALOG as INITIAL_PRODUCTS } from './data/products'
import { Product, CurrencyCode, CartItem, ProductVariant } from './types'
import { Search, ArrowUpDown, CheckCircle, ArrowRight, Sparkles } from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

type Route = 'storefront' | 'admin-login' | 'admin'

// Pathname-based router (works on Vercel via vercel.json SPA rewrites).
// Also falls back to legacy hash routing so old bookmarks still work.
function parseRoute(): Route {
  if (typeof window === 'undefined') return 'storefront'
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '').replace(/^\//, '')
  if (path === 'admin/login' || path.startsWith('admin/login/')) return 'admin-login'
  if (path === 'admin' || path.startsWith('admin/')) return 'admin'
  // Legacy hash support: #/admin/login, #/admin
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '').trim()
  if (hash.startsWith('admin/login')) return 'admin-login'
  if (hash.startsWith('admin')) return 'admin'
  return 'storefront'
}

function routeToPath(route: Route): string {
  if (route === 'admin') return '/admin'
  if (route === 'admin-login') return '/admin/login'
  return '/storefront'
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
    const saved = localStorage.getItem('playbeat_products_catalog_v3')
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
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [accountTab, setAccountTab] = useState<'profile' | 'orders' | 'subscriptions' | 'library' | 'wishlist' | 'settings'>('profile')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Persist Products Catalog
  useEffect(() => {
    localStorage.setItem('playbeat_products_catalog_v3', JSON.stringify(products))
  }, [products])

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

  // Top 5 Popular Products (Matching Screenshot 3)
  const popularProducts = useMemo(() => {
    return products.slice(0, 5)
  }, [products])

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
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
  }, [products, searchQuery, selectedCategory, priceFilter, sortBy])

  // Projectors for Spec Matrix
  const projectorProducts = useMemo(() => {
    return products.filter((p) => p.category === 'Smart Projectors')
  }, [products])

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

  const handleOpenAccountTab = (tab: 'profile' | 'orders' | 'subscriptions' | 'library' | 'wishlist' | 'settings') => {
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
          onQuickViewProduct={(p) => setQuickViewProduct(p)}
          onUpdateProductStock={handleUpdateProductStock}
          onImportProducts={handleImportProducts}
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

      {/* STOREFRONT — completely separate from admin */}
      {route === 'storefront' && (
        <>
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
            onSelectCategory={setSelectedCategory}
            selectedCategory={selectedCategory}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenAccountTab={handleOpenAccountTab}
            user={user}
            onSignOut={handleUserSignOut}
          />

          {/* Hero Section (Matching Screenshot 1) */}
          {selectedCategory === 'all' && !searchQuery && (
            <HeroBanner
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
              onSelectCategory={setSelectedCategory}
              onViewAll={() => setSelectedCategory('all')}
            />
          )}

          {/* Smart Projector Showcase Section (right under Browse Top Categories) */}
          {selectedCategory === 'all' && !searchQuery && (
            <SmartProjectorShowcase
              projectors={projectorProducts}
              currency={selectedCurrency}
              onAddToCart={handleAddToCart}
              onQuickView={(p) => setQuickViewProduct(p)}
              onExploreAll={() => setSelectedCategory('Smart Projectors')}
            />
          )}

          {/* Popular Products Row (Matching Screenshot 3 & 2) */}
          {selectedCategory === 'all' && !searchQuery && (
            <section id="popular-products-section" className="w-full py-8 bg-[#050814]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6">
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

                {/* 5 Popular Cards in Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {popularProducts.map((prod) => (
                    <ProductCard
                      key={`popular-${prod.id}`}
                      product={prod}
                      currency={selectedCurrency}
                      onAddToCart={handleAddToCart}
                      onQuickView={(p) => setQuickViewProduct(p)}
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
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
            {/* Catalog Header & Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-400/10">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-[#FFC107] inline-block"></span>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans">
                  {selectedCategory === 'all' ? 'All Digital Licenses & Cinema Gear' : selectedCategory}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={`catalog-${product.id}`}
                    product={product}
                    currency={selectedCurrency}
                    onAddToCart={handleAddToCart}
                    onQuickView={(p) => setQuickViewProduct(p)}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={isWishlisted(product.id)}
                    onInstantBuy={handleInstantBuy}
                  />
                ))}
              </div>
            )}

            {/* Social Sign Up Section (Google, Facebook, TikTok, Instagram) */}
            {!searchQuery && (
              <SocialSignUpSection
                user={user}
                onSocialAuth={(provider, newUser) => {
                  // Token persistence handled inside SocialSignUpSection
                  localStorage.setItem('playbeat_user', JSON.stringify(newUser))
                  setUser(newUser)
                  showToast(`Successfully signed up via ${provider}! Welcome to PlayBeat.`)
                }}
              />
            )}

            {/* Smart Projector Spec Matrix Section */}
            {(selectedCategory === 'all' || selectedCategory === 'Smart Projectors' || selectedCategory === 'IPTV & Services') && !searchQuery && (
              <ProjectorSpecMatrix
                projectors={projectorProducts}
                currency={selectedCurrency}
                onAddToCart={handleAddToCart}
                onQuickView={(p) => setQuickViewProduct(p)}
              />
            )}

            {/* Bottom Trust Features Bar (Matching Screenshot 3) */}
            <TrustFeatures />
          </main>

          {/* Footer */}
          <Footer />

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
        </>
      )}
    </div>
  )
}
export default App
