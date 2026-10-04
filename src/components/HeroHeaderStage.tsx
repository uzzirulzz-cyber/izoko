import React, { forwardRef, useState } from 'react'
import { Briefcase, Search } from 'lucide-react'

/**
 * HeroHeaderStage — "PlayBeat Digital — Hero Header (2)" design implementation.
 * The full header + hero is ONE pixel-perfect artwork (1926×817 design grid,
 * served as retina 3852×1634 webp) with invisible interactive hotspots laid
 * on top, exactly like the uploaded design artifact:
 *   - real search input + category select + submit overlays in the search pill
 *   - transparent hotspot buttons over every nav item / action / CTA
 *   - live cart & wishlist badges drawn over the baked "0" badges
 * Stage keeps a 1000px min-width with horizontal scroll on small screens
 * (per the design's .scroll/.stage spec).
 */

interface HeroHeaderStageProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  onNavigate: (path: string) => void
  onNavigateHome: () => void
  onSelectCategory: (category: string) => void
  onOpenCart: () => void
  onOpenWishlist: () => void
  onOpenAuth: () => void
  onOpenAccountTab: (tab: 'profile' | 'orders' | 'subscriptions' | 'library' | 'wishlist' | 'settings') => void
  user: { name: string; email: string } | null
  onOpenOffers: () => void
  onOpenTrending: () => void
  onOpenBestValue: () => void
  onSearchSubmit: () => void
  onExploreProducts: () => void
  onBrowseCategories: () => void
  cartCount: number
  wishlistCount: number
}

// Design hotspot grid (percentages of the 1926×817 stage) — ported 1:1 from
// "PlayBeat Digital — Hero Header (2).html"
type Hotspot = {
  label: string
  left: number
  top: number
  width: number
  height: number
  radius?: number
  go: () => void
}

export const HeroHeaderStage = forwardRef<HTMLDivElement, HeroHeaderStageProps>(
  (
    {
      searchQuery,
      onSearchChange,
      onNavigate,
      onNavigateHome,
      onSelectCategory,
      onOpenCart,
      onOpenWishlist,
      onOpenAuth,
      onOpenAccountTab,
      user,
      onOpenOffers,
      onOpenTrending,
      onOpenBestValue,
      onSearchSubmit,
      onExploreProducts,
      onBrowseCategories,
      cartCount,
      wishlistCount,
    },
    stageRef
  ) => {
    // Category select overlay — design options mapped to real storefront routes
    const [category, setCategory] = useState('')
    const CATEGORY_OPTIONS: { value: string; label: string; path?: string }[] = [
      { value: '', label: 'All Categories' },
      { value: 'ai-productivity', label: 'AI & Productivity', path: '/ai-subscriptions' },
      { value: 'video-editing', label: 'Video Editing', path: '/creative-software' },
      { value: 'gift-cards', label: 'Gift Cards', path: '/gift-cards' },
      { value: 'streaming-accounts', label: 'Streaming Accounts', path: '/streaming' },
      { value: 'iptv', label: 'IPTV', path: '/subscriptions' },
      { value: 'smart-projectors', label: 'Smart Projectors', path: '/smart-projectors' },
      { value: 'business-services', label: 'Business Services', path: '/services' },
    ]

    const hotspots: Hotspot[] = [
      // Category pill nav
      { label: 'Home', left: 2.96, top: 22.032, width: 6.438, height: 6.242, go: onNavigateHome },
      { label: 'AI & Productivity', left: 10.696, top: 22.032, width: 8.152, height: 6.242, go: () => onNavigate('/ai-subscriptions') },
      { label: 'Video Editing', left: 21.132, top: 22.032, width: 6.802, height: 6.242, go: () => onNavigate('/creative-software') },
      { label: 'Gift Cards', left: 30.27, top: 22.032, width: 5.504, height: 6.242, go: () => onNavigate('/gift-cards') },
      { label: 'Streaming Accounts', left: 37.954, top: 22.032, width: 9.346, height: 6.242, go: () => onNavigate('/streaming') },
      { label: 'IPTV', left: 49.533, top: 22.032, width: 3.479, height: 6.242, go: () => onNavigate('/subscriptions') },
      { label: 'Smart Projectors', left: 55.296, top: 22.032, width: 8.1, height: 6.242, go: () => onNavigate('/smart-projectors') },
      { label: 'All Products', left: 65.628, top: 22.032, width: 6.334, height: 6.242, go: () => onSelectCategory('all') },
      { label: 'Trending', left: 76.064, top: 22.399, width: 6.906, height: 5.63, go: onOpenTrending },
      { label: 'Deals', left: 83.541, top: 22.399, width: 5.607, height: 5.63, go: onOpenOffers },
      { label: 'Best Value', left: 89.72, top: 22.399, width: 7.477, height: 5.63, go: onOpenBestValue },
      // Utility bar
      { label: 'Help Center', left: 68.12, top: 0.979, width: 5.659, height: 2.938, go: () => onNavigate('/contact') },
      { label: 'Track Order', left: 75.286, top: 0.979, width: 5.607, height: 2.938, go: () => onOpenAccountTab('orders') },
      { label: 'Contact', left: 82.243, top: 0.979, width: 4.05, height: 2.938, go: () => onNavigate('/contact') },
      // Header actions
      { label: 'PlayBeat Digital home', left: 3.427, top: 6.854, width: 15.265, height: 10.282, go: onNavigateHome },
      { label: 'Wishlist', left: 70.197, top: 10.037, width: 3.842, height: 6.854, go: onOpenWishlist },
      {
        label: 'Sign In',
        left: 75.597,
        top: 10.037,
        width: 6.542,
        height: 6.12,
        go: () => (user ? onOpenAccountTab('profile') : onOpenAuth()),
      },
      {
        label: 'Sign Up',
        left: 83.489,
        top: 8.69,
        width: 7.892,
        height: 8.201,
        radius: 16,
        go: () => (user ? onOpenAccountTab('profile') : onOpenAuth()),
      },
      { label: 'Cart', left: 92.939, top: 10.037, width: 4.777, height: 5.141, go: onOpenCart },
      // Hero CTAs
      { label: 'Shop Now', left: 4.258, top: 88.005, width: 14.278, height: 7.589, radius: 50, go: onExploreProducts },
      { label: 'Explore Categories', left: 20.042, top: 88.005, width: 15.421, height: 7.589, radius: 50, go: onBrowseCategories },
    ]

    const submitSearch = (e?: React.FormEvent) => {
      e?.preventDefault()
      onSearchSubmit()
    }

    return (
      <div className="pbhs-scroll relative w-full overflow-x-auto [scrollbar-width:none]">
        <main
          ref={stageRef}
          className="pbhs-stage relative"
          style={{ backgroundImage: 'url(/hero_header_v2.webp)' }}
        >
          <h1 className="sr-only">PlayBeat Digital — Your World of Digital Possibilities</h1>

          {/* ===== Search pill overlays (real inputs, design coordinates) ===== */}
          <form
            role="search"
            onSubmit={submitSearch}
            className="contents"
          >
            <div className="pbhs-s">
              <input
                id="header-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search for Netflix, ChatGPT, YouTube, Games, Software..."
                aria-label="Search products"
                autoComplete="off"
              />
            </div>
            <label className="pbhs-c">
              <span>{CATEGORY_OPTIONS.find((o) => o.value === category)?.label || 'All Categories'}</span>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => {
                  const v = e.target.value
                  setCategory(v)
                  const opt = CATEGORY_OPTIONS.find((o) => o.value === v)
                  if (opt?.path) onNavigate(opt.path)
                  else if (v === '') onSelectCategory('all')
                }}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="pbhs-sb" type="submit" aria-label="Search">
              <Search className="w-[55%] h-[55%] text-white" strokeWidth={2.4} />
            </button>
          </form>

          {/* ===== "Services" pill in the baked nav-row gap (72.0%→76.05%) =====
               Real button styled 1:1 with the Trending/Deals/Best Value pill
               group — Business Solutions on the storefront nav bar. */}
          <button
            type="button"
            className="pbhs-svc"
            onClick={() => onNavigate('/services')}
            aria-label="Business Services"
            title="Business Services — websites, CRM, automation, design & more"
          >
            <Briefcase strokeWidth={2.4} />
            <span>Services</span>
          </button>

          {/* ===== Live badges over the baked "0" badges ===== */}
          {wishlistCount > 0 && (
            <span
              className="pbhs-badge"
              style={{ left: '73.46%', top: '10.41%' }}
              aria-label={`${wishlistCount} items in wishlist`}
            >
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          )}
          {cartCount > 0 && (
            <span
              className="pbhs-badge"
              style={{ left: '97.06%', top: '10.41%' }}
              aria-label={`${cartCount} items in cart`}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}

          {/* ===== Invisible hotspots (design grid, hover glow via .pbhs-h) ===== */}
          {hotspots.map((h) => (
            <button
              key={h.label}
              type="button"
              className="pbhs-h"
              style={{
                left: `${h.left}%`,
                top: `${h.top}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
                borderRadius: h.radius ? `${h.radius}px` : '14px',
              }}
              onClick={h.go}
              aria-label={h.label}
              title={h.label}
            />
          ))}
        </main>
      </div>
    )
  }
)

HeroHeaderStage.displayName = 'HeroHeaderStage'
