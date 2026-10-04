import React, { forwardRef, useState } from 'react'
import { Search } from 'lucide-react'

/**
 * HeroHeaderStage — "PlayBeat Digital — Hero Header" EXACT design implementation.
 * The full header + hero is ONE pixel-perfect artwork (1672×941 design grid,
 * served as hero_header_v3.webp) with invisible interactive hotspots laid on
 * top, coordinates ported 1:1 from the owner's "playb11eat-screenshot-exact"
 * artifact (28 hotspots):
 *   - utility bar: Help Center / Track Order / Contact (Language & Currency
 *     are informational in the design — baked text, no feature)
 *   - real search input + category select + submit overlays in the search pill
 *     (baked placeholder/"All Categories" text is masked by the live controls)
 *   - 12-equal-height nav pill hotspots incl. baked "Services" (gear) pill
 *   - live cart & wishlist badges drawn over the baked gold cart "0" badge
 * Stage matches the artifact's .page: max-width 1672px, centered, dark
 * #000b1d gutters blend into the artwork edges; 1000px min-width keeps
 * horizontal scroll on small screens (per the design's .scroll/.stage spec).
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

// Design hotspot grid (percentages of the 1672×941 stage) — ported 1:1 from
// "playb11eat-screenshot-exact.html" (28 <a.hs> anchors)
type Hotspot = {
  label: string
  left: number
  top: number
  width: number
  height: number
  radius?: number
  go: () => void
}

// Nav pill row: every cell shares the SAME top (18.916%) and height (8.714%)
const PILL_TOP = 18.916
const PILL_H = 8.714

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
      // ===== 12-pill nav row (equal height 8.714% — Services is baked in) =====
      { label: 'Home', left: 1.675, top: PILL_TOP, width: 7.596, height: PILL_H, go: onNavigateHome },
      { label: 'AI & Productivity', left: 9.27, top: PILL_TOP, width: 9.39, height: PILL_H, go: () => onNavigate('/ai-subscriptions') },
      { label: 'Video Editing', left: 18.66, top: PILL_TOP, width: 8.612, height: PILL_H, go: () => onNavigate('/creative-software') },
      { label: 'Gift Cards', left: 27.273, top: PILL_TOP, width: 7.715, height: PILL_H, go: () => onNavigate('/gift-cards') },
      { label: 'Streaming Accounts', left: 34.988, top: PILL_TOP, width: 10.167, height: PILL_H, go: () => onNavigate('/streaming') },
      { label: 'IPTV', left: 45.156, top: PILL_TOP, width: 6.4, height: PILL_H, go: () => onNavigate('/subscriptions') },
      { label: 'Smart Projectors', left: 51.555, top: PILL_TOP, width: 9.749, height: PILL_H, go: () => onNavigate('/smart-projectors') },
      { label: 'All Products', left: 61.304, top: PILL_TOP, width: 7.775, height: PILL_H, go: () => onSelectCategory('all') },
      { label: 'Services', left: 69.079, top: PILL_TOP, width: 7.237, height: PILL_H, go: () => onNavigate('/services') },
      { label: 'Trending', left: 76.316, top: PILL_TOP, width: 7.536, height: PILL_H, go: onOpenTrending },
      { label: 'Deals', left: 83.852, top: PILL_TOP, width: 7.237, height: PILL_H, go: onOpenOffers },
      { label: 'Best Value', left: 91.089, top: PILL_TOP, width: 7.177, height: PILL_H, go: onOpenBestValue },
      // ===== Utility bar =====
      { label: 'Help Center', left: 66.388, top: 0.85, width: 6.1, height: 3.826, go: () => onNavigate('/contact') },
      { label: 'Track Order', left: 73.206, top: 0.85, width: 5.861, height: 3.826, go: () => onOpenAccountTab('orders') },
      { label: 'Contact', left: 79.665, top: 0.85, width: 4.545, height: 3.826, go: () => onNavigate('/contact') },
      // ===== Header main row =====
      { label: 'PlayBeat Digital home', left: 1.794, top: 7.439, width: 16.268, height: 8.714, go: onNavigateHome },
      { label: 'Wishlist', left: 69.079, top: 9.564, width: 3.768, height: 5.951, go: onOpenWishlist },
      {
        label: 'Sign In',
        left: 74.88,
        top: 9.777,
        width: 5.981,
        height: 5.101,
        go: () => (user ? onOpenAccountTab('profile') : onOpenAuth()),
      },
      {
        label: 'Sign Up',
        left: 82.536,
        top: 9.352,
        width: 9.569,
        height: 6.376,
        radius: 999,
        go: () => (user ? onOpenAccountTab('profile') : onOpenAuth()),
      },
      { label: 'Cart', left: 93.66, top: 9.352, width: 4.426, height: 5.313, go: onOpenCart },
      // ===== Hero CTAs =====
      { label: 'Shop Now', left: 2.153, top: 77.258, width: 14.474, height: 5.845, radius: 50, go: onExploreProducts },
      { label: 'Explore Categories', left: 18.301, top: 77.258, width: 16.388, height: 5.845, radius: 50, go: onBrowseCategories },
      // ===== Support (floating gold button, bottom-right of artwork) =====
      { label: 'Support', left: 95.096, top: 90.648, width: 3.589, height: 6.376, radius: 999, go: () => onNavigate('/contact') },
    ]

    const submitSearch = (e?: React.FormEvent) => {
      e?.preventDefault()
      onSearchSubmit()
    }

    const selectedCategory = CATEGORY_OPTIONS.find((o) => o.value === category)

    return (
      <div className="pbhs-scroll relative w-full overflow-x-auto bg-[#000b1d] [scrollbar-width:none]">
        <main
          ref={stageRef}
          className="pbhs-stage relative"
          style={{ backgroundImage: 'url(/hero_header_v3.webp)' }}
        >
          <h1 className="sr-only">PlayBeat Digital — Your World of Digital Possibilities</h1>

          {/* ===== Search pill overlays (real inputs, design coordinates).
               The artwork bakes the placeholder + "All Categories" labels, so
               the live input/select mask that zone while idle-transparent
               states let the baked art show. ===== */}
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
                placeholder=" "
                aria-label="Search products"
                autoComplete="off"
              />
            </div>
            <label className="pbhs-c">
              {category !== '' && <span>{selectedCategory?.label}</span>}
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

          {/* ===== Live badges (gold, matching the baked cart "0") =====
               Cart: covers the baked gold "0" badge (center 97.488%/10.68%).
               Wishlist: no baked badge — appears top-right of the heart. */}
          {wishlistCount > 0 && (
            <span
              className="pbhs-badge"
              style={{ left: '72.3%', top: '10.3%' }}
              aria-label={`${wishlistCount} items in wishlist`}
            >
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          )}
          {cartCount > 0 && (
            <span
              className="pbhs-badge"
              style={{ left: '97.488%', top: '10.68%' }}
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
