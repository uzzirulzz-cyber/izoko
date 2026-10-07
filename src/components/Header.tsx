import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  ShoppingCart,
  Heart,
  ChevronDown,
  X,
  User,
  ShoppingBag,
  CreditCard,
  FolderLock,
  Settings,
  LogOut,
  Zap,
  ShieldCheck,
  PlaySquare,
  Repeat,
  Gift,
  Gamepad2,
  FolderOpen,
  Sparkles,
  GitCompareArrows,
  Menu,
  Home,
  BadgePercent,
  Mail,
  Globe,
  Headphones,
  Clock,
  Phone,
  Bot,
  Film,
  Tv,
  LayoutGrid,
  Flame,
  Tag,
  Star,
  Projector,
  ArrowRight,
  Briefcase,
  AppWindow,
  Code2,
  Users,
  LayoutDashboard,
  Workflow,
  Archive,
  PenTool,
  Palette,
  FileText,
  Smartphone,
} from 'lucide-react'
import { CurrencyCode } from '../types'
import { CURRENCY_META, SUPPORTED_CURRENCIES, formatPrice } from '../lib/currency'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedCurrency: CurrencyCode
  onCurrencyChange: (c: CurrencyCode) => void
  cartCount: number
  cartTotal: number
  onOpenCart: () => void
  wishlistCount: number
  onOpenWishlist: () => void
  onSelectCategory: (category: string) => void
  selectedCategory: string
  onOpenAuth: () => void
  onOpenAccountTab: (tab: 'profile' | 'orders' | 'subscriptions' | 'library' | 'wishlist' | 'settings') => void
  user: { name: string; email: string } | null
  onSignOut: () => void
  onNavigateHome: () => void
  onOpenBrowseCategories: () => void
  onOpenOffers: () => void
  onNavigate: (path: string) => void
  /** Blue search-button submit → scroll to the catalog (App wires the target) */
  onSearchSubmit?: () => void
  /** "Trending" pill → scroll to popular products without re-sorting */
  onOpenTrending?: () => void
  /** "Best Value" nav pill → sort by rating (App wires setSortBy + scroll) */
  onOpenBestValue?: () => void
  /** Home hero mode: header is fixed and slides in only when the image stage
      has scrolled away (HeroHeaderStage owns the top of the page) */
  floating?: boolean
  floatedVisible?: boolean
}

// Business Solutions mega menu — internal routes only (brief rule: strict
// external link policy). Grouped per the navigation spec.
const BS_MENU: { group: string; items: { label: string; path: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
  {
    group: 'Development',
    items: [
      { label: 'Websites', path: '/services/web-development', icon: Globe },
      { label: 'Web Applications', path: '/services/web-applications', icon: AppWindow },
      { label: 'E-Commerce', path: '/services/ecommerce', icon: ShoppingCart },
      { label: 'Custom Software', path: '/services/custom-software', icon: Code2 },
    ],
  },
  {
    group: 'Business Systems',
    items: [
      { label: 'CRM', path: '/services/crm', icon: Users },
      { label: 'Admin Panels', path: '/services/admin-panels', icon: LayoutDashboard },
      { label: 'Automation', path: '/services/automation', icon: Workflow },
      { label: 'Digital Archive', path: '/services/digital-archive', icon: Archive },
    ],
  },
  {
    group: 'Creative',
    items: [
      { label: 'UI/UX', path: '/services/ui-ux', icon: PenTool },
      { label: 'Graphic Design', path: '/services/design', icon: Palette },
      { label: 'Business Documents', path: '/services/document-design', icon: FileText },
    ],
  },
  {
    group: 'Advanced Solutions',
    items: [
      { label: 'AI-Assisted Solutions', path: '/services/ai-solutions', icon: Sparkles },
      { label: 'Mobile Business Apps', path: '/services/business-apps', icon: Smartphone },
    ],
  },
]

// Main category links (SEO-friendly URL slugs)
const NAV_CATEGORIES = [
  { name: 'Streaming', path: '/streaming', icon: PlaySquare },
  { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
  { name: 'Gift Cards', path: '/gift-cards', icon: Gift },
  { name: 'Gaming', path: '/gaming', icon: Gamepad2 },
  { name: 'Software', path: '/software', icon: CreditCard },
  { name: 'Smart Projectors', path: '/smart-projectors', icon: FolderOpen },
]

// Curated subcategory collections
const NAV_SUBCATEGORIES = [
  { name: 'Smart 4K Projectors', path: '/smart-4k-projectors', icon: Sparkles },
  { name: 'AI Subscriptions', path: '/ai-subscriptions', icon: Sparkles },
  { name: 'Steam & Game Keys', path: '/steam-game-keys', icon: Sparkles },
  { name: 'Windows & Office', path: '/windows-office', icon: Sparkles },
  { name: 'Creative Software', path: '/creative-software', icon: Sparkles },
]

// Design category pill-nav (PlayBeat Digital — Hero Header) mapped to real
// storefront routes / catalog actions
const HERO_NAV = [
  { label: 'Home', icon: Home, action: 'home' },
  { label: 'AI & Productivity', icon: Bot, path: '/ai-subscriptions', tint: '#8fb8ff' },
  { label: 'Video Editing', icon: Film, path: '/creative-software', tint: '#5fe0c0' },
  { label: 'Gift Cards', icon: Gift, path: '/gift-cards', tint: '#ff6a8a' },
  { label: 'Streaming Accounts', icon: PlaySquare, path: '/streaming', tint: '#4aa8ff' },
  { label: 'IPTV', icon: Tv, path: '/subscriptions', tint: '#4aa8ff' },
  { label: 'Smart Projectors', icon: Projector, path: '/smart-projectors', tint: '#cfe0ff' },
  { label: 'All Products', icon: LayoutGrid, action: 'all', tint: '#4aa8ff' },
] as const

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCurrency,
  onCurrencyChange,
  cartCount,
  cartTotal,
  onOpenCart,
  wishlistCount,
  onOpenWishlist,
  onSelectCategory,
  selectedCategory,
  onOpenAuth,
  onOpenAccountTab,
  user,
  onSignOut,
  onNavigateHome,
  onOpenBrowseCategories,
  onOpenOffers,
  onNavigate,
  onSearchSubmit,
  onOpenTrending,
  onOpenBestValue,
  floating = false,
  floatedVisible = true,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false)
  const [bsMenuOpen, setBsMenuOpen] = useState(false)
  // Fixed-viewport coordinates for the Business Solutions mega menu. The nav
  // row is an overflow-x-auto scroll container, which CLIPS absolutely
  // positioned dropdown panels — position:fixed is the only way to escape.
  const [bsMenuPos, setBsMenuPos] = useState({ left: 0, top: 0 })
  const [bsMobileOpen, setBsMobileOpen] = useState(false)
  const bsMenuRef = useRef<HTMLDivElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const currencyDropdownRef = useRef<HTMLDivElement>(null)
  const categoriesDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Collapse the utility top bar once the page scrolls (keeps the sticky
  // header compact without losing the trust signals at the very top)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setProfileDropdownOpen(false)
      }
      if (
        currencyDropdownRef.current &&
        !currencyDropdownRef.current.contains(e.target as Node)
      ) {
        setCurrencyDropdownOpen(false)
      }
      if (
        categoriesDropdownRef.current &&
        !categoriesDropdownRef.current.contains(e.target as Node)
      ) {
        setCategoriesDropdownOpen(false)
      }
      if (
        bsMenuRef.current &&
        !bsMenuRef.current.contains(e.target as Node)
      ) {
        setBsMenuOpen(false)
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close the mobile menu when the category selection or search changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [selectedCategory, searchQuery])

  // Mega menu is viewport-fixed (nav overflow clipping) — close it on any
  // scroll (window OR the pill nav's inner horizontal scroll, via capture)
  // /resize so it never visually detaches from its trigger
  useEffect(() => {
    if (!bsMenuOpen) return
    const close = () => setBsMenuOpen(false)
    document.addEventListener('scroll', close, { capture: true, passive: true })
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('scroll', close, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', close)
    }
  }, [bsMenuOpen])

  const homeActive = selectedCategory === 'all' && !searchQuery

  return (
    <header
      className={`pb-mont z-40 w-full bg-[#040a1c]/97 backdrop-blur-2xl border-b border-[#172a57] shadow-2xl transition-all ${
        floating
          ? `fixed inset-x-0 top-0 transition-transform duration-300 ${
              floatedVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
            }`
          : 'sticky top-0'
      }`}
    >
      {/* ============ Row 0 — Utility top bar (collapses on scroll) ============ */}
      <div
        className={`overflow-hidden transition-all duration-300 bg-[#030816] border-b border-[#172a57] ${
          scrolled ? 'max-h-0 border-b-0' : 'max-h-16'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex items-center justify-between gap-3 text-[12.5px] font-semibold text-[#9db0dc]">
          {/* Trust signals */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0 overflow-hidden">
            <span className="hidden md:flex items-center gap-1.5 text-[#27d17f] whitespace-nowrap">
              <ShieldCheck className="w-4 h-4" /> Genuine Products
            </span>
            <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="w-4 h-4 text-[#ffc21a]" />
              <span className="text-[#eef2ff]">Instant Delivery</span>
            </span>
            <span className="hidden lg:flex items-center gap-1.5 whitespace-nowrap">
              <Globe className="w-4 h-4 text-[#8fb8ff]" /> Worldwide Access
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Headphones className="w-4 h-4 text-[#ffb43a]" /> 24/7 Support
            </span>
          </div>

          {/* Utility links */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <button
              onClick={() => onNavigate('/contact')}
              className="hidden lg:flex items-center gap-1.5 hover:text-white transition"
            >
              <Headphones className="w-3.5 h-3.5" /> Help Center
            </button>
            <button
              onClick={() => onOpenAccountTab('orders')}
              className="hidden lg:flex items-center gap-1.5 hover:text-white transition"
            >
              <Clock className="w-3.5 h-3.5" /> Track Order
            </button>
            <button
              onClick={() => onNavigate('/contact')}
              className="hidden sm:flex items-center gap-1.5 hover:text-white transition"
            >
              <Phone className="w-3.5 h-3.5" /> Contact
            </button>
            <button
              onClick={() => onNavigate('/crm')}
              className="hidden xl:flex items-center gap-1.5 text-[#ffc21a] hover:text-amber-300 transition font-bold"
              title="PlayBeat CRM"
            >
              CRM
            </button>

            {/* Currency switcher (functional) */}
            <div className="relative" ref={currencyDropdownRef}>
              <button
                id="header-currency-btn"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1 hover:text-white transition font-mono"
              >
                {selectedCurrency}
                <ChevronDown className={`w-3 h-3 transition-transform ${currencyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {currencyDropdownOpen && (
                <div className="absolute right-0 mt-3 w-44 rounded-2xl bg-[#0a1534] border border-[#1b2f63] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {SUPPORTED_CURRENCIES.map((code) => (
                    <button
                      key={code}
                      onClick={() => {
                        onCurrencyChange(code)
                        setCurrencyDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left ${
                        code === selectedCurrency
                          ? 'bg-[#1f86ff]/15 text-[#5db3ff] font-semibold'
                          : 'text-[#9db0dc] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>
                        {CURRENCY_META[code].flag} {code}
                      </span>
                      <span className="text-[#9db0dc] font-mono text-[10px]">{CURRENCY_META[code].symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="hidden sm:flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> English
              <ChevronDown className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* ============ Row 1 — Logo · Big Search · Actions ============ */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-3 sm:gap-5">
        {/* PlayBeat 3D logo (design asset) */}
        <div
          id="header-brand-logo"
          onClick={onNavigateHome}
          className="flex items-center cursor-pointer group shrink-0"
          title="PlayBeat Home"
        >
          <div className="relative">
            <div className="absolute -inset-1.5 bg-[#1f86ff]/25 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <img
              src="/playbeat-logo-3d-200.webp"
              alt="PlayBeat Digital"
              className={`w-auto object-contain transition-all duration-300 group-hover:scale-105 ${
                scrolled ? 'h-11 sm:h-12' : 'h-13 sm:h-16'
              }`}
              style={{ filter: 'drop-shadow(0 0 14px rgba(31,134,255,0.35))' }}
            />
          </div>
        </div>

        {/* Big glowing search pill — input + category select + blue button */}
        <form
          className="flex-1 min-w-0 hidden md:flex items-center h-[52px] rounded-full bg-gradient-to-b from-[#0c2257] to-[#08173e] border-2 border-[#1d6fe0] shadow-[0_0_24px_rgba(31,134,255,0.25),inset_0_0_18px_rgba(31,134,255,0.1)] overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault()
            if (onSearchSubmit) onSearchSubmit()
          }}
        >
          <Search className="w-5 h-5 ml-5 text-[#e6efff] shrink-0" />
          <input
            id="header-search-input"
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search for Netflix, ChatGPT, YouTube, Games, Software..."
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[#eef2ff] placeholder-[#8ea3d6] text-sm font-medium px-3.5"
          />
          {searchQuery ? (
            <button
              id="header-clear-search-btn"
              type="button"
              onClick={() => onSearchChange('')}
              className="p-1.5 mr-1 text-[#8ea3d6] hover:text-white rounded-full hover:bg-white/5 transition"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <div className="relative shrink-0" ref={categoriesDropdownRef}>
            <button
              type="button"
              onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
              className="flex items-center gap-1.5 h-9 mr-2 px-3.5 rounded-xl bg-[#0b1b46] border border-[#1b2f63] text-[13.5px] font-semibold text-[#eef2ff] hover:border-[#2a4a9e] transition whitespace-nowrap"
            >
              {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${categoriesDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {categoriesDropdownOpen && (
              <div className="absolute right-0 top-full mt-3 w-56 rounded-2xl bg-[#0a1534] border border-[#1b2f63] shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {[
                  { label: 'All Categories', go: () => onSelectCategory('all') },
                  ...NAV_CATEGORIES.map((c) => ({ label: c.name, go: () => onNavigate(c.path) })),
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setCategoriesDropdownOpen(false)
                      opt.go()
                    }}
                    className={`w-full text-left px-4 py-2 text-xs transition ${
                      (opt.label === 'All Categories' && selectedCategory === 'all') || opt.label === selectedCategory
                        ? 'bg-[#1f86ff]/15 text-[#5db3ff] font-semibold'
                        : 'text-[#9db0dc] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            aria-label="Search"
            className="h-full w-[64px] shrink-0 grid place-items-center bg-gradient-to-b from-[#2a98ff] to-[#0f74f0] hover:from-[#3ba6ff] hover:to-[#1a82ff] text-white transition"
          >
            <Search className="w-[22px] h-[22px]" />
          </button>
        </form>

        {/* Actions — Wishlist · Account · Sign Up · Cart */}
        <div className="flex items-center gap-2 sm:gap-5 shrink-0 ml-auto">
          {/* Mobile menu toggle (below lg) */}
          <button
            id="header-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-[#0a1534] border border-[#1b2f63] hover:border-[#ffc21a]/50 text-[#9db0dc] hover:text-white transition"
            title="Menu"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Wishlist */}
          <button
            id="header-wishlist-btn"
            onClick={onOpenWishlist}
            className="relative hidden sm:flex flex-col items-center gap-0.5 text-[13px] font-semibold text-[#eef2ff] hover:text-white transition group"
            title="Wishlist"
          >
            <span className="relative">
              <Heart
                className={`w-[22px] h-[22px] transition group-hover:scale-110 ${
                  wishlistCount > 0 ? 'text-rose-400' : 'text-[#eef2ff]'
                }`}
              />
              {wishlistCount > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff2d2d] text-white text-[10.5px] font-extrabold flex items-center justify-center shadow-[0_0_10px_rgba(255,45,45,0.55)]">
                  {wishlistCount}
                </span>
              )}
            </span>
            <span className="text-[11px] text-[#9db0dc] group-hover:text-white transition">Wishlist</span>
          </button>

          {/* Sign In / My Account (dropdown when signed in) */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              id="header-profile-btn"
              onClick={() => {
                if (!user) {
                  onOpenAuth()
                  return
                }
                setProfileDropdownOpen(!profileDropdownOpen)
              }}
              className="hidden md:flex items-center gap-2 text-left group"
            >
              <span className="relative">
                <User className="w-[22px] h-[22px] text-[#eef2ff] group-hover:text-white transition" />
                {user && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#27d17f] border-2 border-[#040a1c]"></span>
                )}
              </span>
              <span className="leading-tight hidden lg:block">
                <span className="block text-[13px] font-bold text-[#eef2ff] group-hover:text-white transition">
                  {user ? user.name.split(' ')[0] : 'Sign In'}
                </span>
                <span className="block text-[11px] text-[#9db0dc]">{user ? 'My Account' : 'My Account'}</span>
              </span>
            </button>

            {profileDropdownOpen && user && (
              <div className="absolute right-0 mt-4 w-56 rounded-2xl bg-[#0a1534] border border-[#1b2f63] shadow-2xl backdrop-blur-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-[#172a57] mb-1">
                  <div className="text-xs font-bold text-white truncate">{user.name}</div>
                  <div className="text-[10px] text-[#9db0dc] font-mono truncate">{user.email}</div>
                </div>
                {[
                  { label: 'My Profile', icon: <User className="w-4 h-4 text-[#9db0dc]" />, go: () => onOpenAccountTab('profile') },
                  { label: 'Orders', icon: <ShoppingBag className="w-4 h-4 text-[#9db0dc]" />, go: () => onOpenAccountTab('orders') },
                  { label: 'Subscriptions', icon: <CreditCard className="w-4 h-4 text-[#9db0dc]" />, go: () => onOpenAccountTab('subscriptions') },
                  {
                    label: 'Digital Library',
                    icon: <FolderLock className="w-4 h-4 text-[#ffc21a]" />,
                    go: () => onOpenAccountTab('library'),
                    highlight: true,
                  },
                  { label: 'Wishlist', icon: <Heart className="w-4 h-4 text-rose-400" />, go: onOpenWishlist },
                  { label: 'Account Settings', icon: <Settings className="w-4 h-4 text-[#9db0dc]" />, go: () => onOpenAccountTab('settings') },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      item.go()
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#c9d5fa] hover:bg-white/5 hover:text-white transition"
                  >
                    {item.icon}
                    <span className={item.highlight ? 'font-semibold text-[#ffc21a]' : ''}>{item.label}</span>
                    {item.label === 'Wishlist' && wishlistCount > 0 && (
                      <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded">
                        {wishlistCount}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => {
                    onSignOut()
                    setProfileDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition border-t border-[#172a57] mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Sign Up — Get Rewards (gold gradient) */}
          <div className="relative group hidden sm:block">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ffd43d] to-[#f6a700] rounded-[15px] blur-md opacity-0 group-hover:opacity-70 transition duration-300 pointer-events-none"></div>
            <button
              id="header-signup-btn"
              onClick={onOpenAuth}
              className="relative flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-[15px] bg-gradient-to-b from-[#ffd43d] to-[#f6a700] text-[#1b1300] font-extrabold text-xs sm:text-sm shadow-[0_6px_24px_rgba(255,179,0,0.25)] active:scale-95 transition-all duration-200 whitespace-nowrap"
            >
              <Gift className="w-4 h-4" />
              <span className="leading-tight text-left">
                Sign Up
                <small className="block text-[10px] font-bold text-[#6a4d00] -mt-0.5">Get Rewards</small>
              </span>
            </button>
          </div>

          {/* Cart */}
          <button
            id="header-cart-btn"
            onClick={onOpenCart}
            className="relative hidden sm:flex flex-col items-center gap-0.5 text-[13px] font-semibold text-[#eef2ff] hover:text-white transition group"
            title={`Shopping Cart — ${formatPrice(cartTotal, selectedCurrency)}`}
          >
            <span className="relative">
              <ShoppingCart className="w-[22px] h-[22px] group-hover:scale-110 transition" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff2d2d] text-white text-[10.5px] font-extrabold flex items-center justify-center shadow-[0_0_10px_rgba(255,45,45,0.55)]">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="text-[11px] text-[#9db0dc] group-hover:text-white transition">Cart</span>
          </button>
        </div>
      </div>

      {/* Mobile search row (below md) */}
      <div className="md:hidden px-4 pb-3">
        <div
          className={`flex items-center h-11 rounded-full bg-gradient-to-b from-[#0c2257] to-[#08173e] border transition-all duration-300 ${
            searchFocused
              ? 'border-[#1d6fe0] ring-2 ring-[#1f86ff]/20'
              : 'border-[#1b2f63]'
          }`}
        >
          <Search className="w-4 h-4 ml-4 text-[#8ea3d6] shrink-0" />
          <input
            id="header-search-input-mobile"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search Netflix, ChatGPT, Games…"
            className="w-full bg-transparent px-3 text-sm text-[#eef2ff] placeholder-[#8ea3d6] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1.5 mr-2 text-[#8ea3d6] hover:text-white rounded-full hover:bg-white/5 transition"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============ Row 2 — Category pill nav ============ */}
      <nav className="mx-4 sm:mx-6 lg:mx-10 mb-2 hidden lg:flex flex-wrap gap-1.5 items-center p-2 border border-[#172a57] rounded-3xl bg-gradient-to-b from-[#0b183a] to-[#08122d]">
        {HERO_NAV.map((item) => {
          const Icon = item.icon
          // Active state: Home pill on the untouched storefront, All Products
          // while searching the full catalog, slug pills per selected category
          const active =
            ('action' in item && item.action === 'home' && homeActive) ||
            ('action' in item && item.action === 'all' && selectedCategory === 'all' && !!searchQuery) ||
            ('path' in item && selectedCategory !== 'all' && pillActiveForPath(item.path, selectedCategory))
          return (
            <button
              key={item.label}
              onClick={() => handleHeroNav(item)}
              className={`flex items-center justify-center gap-1.5 min-w-[92px] px-3.5 py-2.5 rounded-full border border-transparent text-[13.5px] font-semibold transition whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-b from-[#3592ff] to-[#1568e6] text-white shadow-[0_4px_18px_rgba(31,134,255,0.4)]'
                  : 'text-[#c9d5fa] hover:bg-[#13275a] hover:text-white'
              }`}
            >
              <Icon
                className="w-4 h-4"
                style={{ color: active ? '#fff' : 'tint' in item ? item.tint : undefined }}
              />
              {item.label}
            </button>
          )
        })}
        {/* Right actions group — wraps as ONE unit so Trending/Deals/Best
            Value/Business Solutions never split across nav rows */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5 min-w-fit">
        <button
          onClick={() => (onOpenTrending ? onOpenTrending() : onOpenBrowseCategories())}
          className="flex items-center justify-center gap-2 min-w-[92px] px-3.5 py-2.5 rounded-full border border-[#2a3c6e] bg-[#0a1634] text-[13.5px] font-semibold text-[#ff6a2b] hover:bg-[#13275a] transition whitespace-nowrap"
        >
          <Flame className="w-4 h-4" /> Trending
        </button>
        <button
          onClick={onOpenOffers}
          className="flex items-center justify-center gap-2 min-w-[92px] px-3.5 py-2.5 rounded-full border border-[#2a3c6e] bg-[#0a1634] text-[13.5px] font-semibold text-[#ff6ad5] hover:bg-[#13275a] transition whitespace-nowrap"
        >
          <Tag className="w-4 h-4" /> Deals
        </button>
        <button
          onClick={() => (onOpenBestValue ? onOpenBestValue() : onOpenOffers())}
          className="flex items-center justify-center gap-2 min-w-[92px] px-3.5 py-2.5 rounded-full border border-[#2a3c6e] bg-[#0a1634] text-[13.5px] font-semibold text-[#c46bff] hover:bg-[#13275a] transition whitespace-nowrap"
        >
          <Star className="w-4 h-4" /> Best Value
        </button>

        {/* Business Solutions mega menu — grouped internal service routes.
            Panel renders position:fixed (see bsMenuPos) so no ancestor
            overflow container can ever clip the dropdown. */}
        <div className="relative" ref={bsMenuRef}>
          <button
            onClick={() => {
              if (!bsMenuOpen && bsMenuRef.current) {
                const r = bsMenuRef.current.getBoundingClientRect()
                setBsMenuPos({
                  left: Math.max(12, Math.min(r.left, window.innerWidth - 740)),
                  top: r.bottom + 8,
                })
              }
              setBsMenuOpen(!bsMenuOpen)
            }}
            className={`flex items-center justify-center gap-2 min-w-[92px] px-3.5 py-2.5 rounded-full border text-[13.5px] font-semibold transition whitespace-nowrap ${
              bsMenuOpen
                ? 'border-[#3d8bff]/60 bg-[#13275a] text-[#7db4ff]'
                : 'border-[#2a3c6e] bg-[#0a1634] text-[#5db3ff] hover:bg-[#13275a]'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Business Solutions
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${bsMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {bsMenuOpen && (
            <div
              className="fixed w-[min(720px,88vw)] rounded-2xl bg-[#091330] border border-[#1b2f63] shadow-2xl backdrop-blur-2xl p-5 z-[80] animate-in fade-in zoom-in-95 duration-150"
              style={{ left: bsMenuPos.left, top: bsMenuPos.top }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {BS_MENU.map((col) => (
                  <div key={col.group}>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5db3ff] font-semibold mb-2">
                      {col.group}
                    </div>
                    <div className="space-y-1">
                      {col.items.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => {
                            setBsMenuOpen(false)
                            onNavigate(item.path)
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#c9d5fa] hover:bg-white/5 hover:text-white transition text-left"
                        >
                          <item.icon className="w-3.5 h-3.5 text-[#5db3ff] shrink-0" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-[#1b2f63] flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setBsMenuOpen(false)
                    onNavigate('/services')
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#5db3ff] hover:bg-white/5 hover:text-white transition"
                >
                  View All Services
                </button>
                <button
                  onClick={() => {
                    setBsMenuOpen(false)
                    onNavigate('/services/request')
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#2563eb] to-[#3d8bff] text-white hover:shadow-[0_6px_20px_rgba(61,139,255,.35)] transition"
                >
                  Request a Project <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          id="header-mobile-menu"
          className="lg:hidden absolute top-full left-0 right-0 max-h-[calc(100vh-64px)] overflow-y-auto bg-[#040a1c]/98 backdrop-blur-2xl border-b border-[#172a57] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="px-4 py-4 space-y-1">
            {[
              { label: 'Home', icon: <Home className="w-4 h-4" />, action: onNavigateHome, active: homeActive },
              { label: 'All Products', icon: <ShoppingBag className="w-4 h-4" />, action: () => onSelectCategory('all'), active: selectedCategory === 'all' && !!searchQuery },
              { label: 'Subscriptions / IPTV', icon: <Repeat className="w-4 h-4" />, action: () => onSelectCategory('Subscriptions'), active: selectedCategory === 'Subscriptions' },
              { label: 'Offers / Deals', icon: <BadgePercent className="w-4 h-4" />, action: onOpenOffers, active: false },
              { label: 'Services / Business', icon: <Briefcase className="w-4 h-4" />, action: () => onNavigate('/services'), active: false },
              { label: 'Support / Contact', icon: <Mail className="w-4 h-4" />, action: () => onNavigate('/contact'), active: false },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMobileMenuOpen(false)
                  item.action()
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                  item.active
                    ? 'bg-[#1f86ff]/15 text-[#5db3ff] border border-[#1f86ff]/30'
                    : 'text-[#c9d5fa] hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            {/* Business Solutions — collapsible grouped menu (brief §29: do not
                dump 12+ links into the first navigation level on mobile) */}
            <div className="pt-3 pb-1">
              <button
                onClick={() => setBsMobileOpen(!bsMobileOpen)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                  bsMobileOpen
                    ? 'bg-sky-400/10 text-sky-300 border border-sky-400/25'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4" /> Business Solutions
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${bsMobileOpen ? 'rotate-180' : ''}`} />
              </button>
              {bsMobileOpen && (
                <div className="mt-1.5 space-y-2">
                  {BS_MENU.map((col) => (
                    <div key={col.group} className="rounded-xl bg-[#0A122E] border border-slate-400/10 p-2">
                      <div className="px-2 pt-1 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-sky-300/90 font-semibold">
                        {col.group}
                      </div>
                      {col.items.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => {
                            setMobileMenuOpen(false)
                            onNavigate(item.path)
                          }}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white transition text-left"
                        >
                          <item.icon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        onNavigate('/services')
                      }}
                      className="px-3 py-2.5 rounded-xl bg-[#0A122E] border border-slate-400/10 text-xs font-semibold text-sky-300 hover:border-sky-400/40 transition"
                    >
                      View All Services
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        onNavigate('/services/request')
                      }}
                      className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#3d8bff] text-xs font-semibold text-white transition"
                    >
                      Request a Project
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 pb-1 px-1 text-[10px] font-mono uppercase tracking-wider text-[#ffc21a]/90 font-semibold">
              Categories
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {NAV_CATEGORIES.map((cat) => (
                <button
                  key={cat.path}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onNavigate(cat.path)
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0a1534] border border-[#1b2f63] text-xs text-[#c9d5fa] hover:text-white hover:border-[#ffc21a]/40 transition text-left"
                >
                  <cat.icon className="w-3.5 h-3.5 text-[#ffc21a] shrink-0" />
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="pt-3 pb-1 px-1 text-[10px] font-mono uppercase tracking-wider text-[#5db3ff]/90 font-semibold">
              Collections
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {NAV_SUBCATEGORIES.map((sub) => (
                <button
                  key={sub.path}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onNavigate(sub.path)
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0a1534] border border-[#1b2f63] text-xs text-[#c9d5fa] hover:text-white hover:border-[#1f86ff]/40 transition text-left"
                >
                  <sub.icon className="w-3.5 h-3.5 text-[#5db3ff] shrink-0" />
                  {sub.name}
                </button>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onNavigate('/compare')
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#0a1534] border border-[#1b2f63] text-xs text-[#5db3ff] hover:text-[#8ecbff] hover:border-[#1f86ff]/40 transition text-left"
              >
                <GitCompareArrows className="w-3.5 h-3.5 text-[#5db3ff]" />
                Projector Comparison
              </button>
            </div>

            {!user && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenAuth()
                }}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-b from-[#ffd43d] to-[#f6a700] text-[#1b1300] font-extrabold text-sm shadow-lg transition"
              >
                Sign Up / Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )

  // --- pill nav action router (declared after return for readability) ---
  function handleHeroNav(item: (typeof HERO_NAV)[number]) {
    if ('action' in item && item.action === 'home') {
      onNavigateHome()
      return
    }
    if ('action' in item && item.action === 'all') {
      onSelectCategory('all')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if ('path' in item) {
      onNavigate(item.path)
    }
  }
}

// Active-state helper for slug pills: mark the pill whose category route
// matches the current selectedCategory (e.g. /streaming → Streaming).
function pillActiveForPath(path: string, selectedCategory: string): boolean {
  const slug = path.replace(/^\//, '')
  const map: Record<string, string> = {
    'ai-subscriptions': 'AI Subscriptions',
    'creative-software': 'Creative Software',
    'gift-cards': 'Gift Cards',
    streaming: 'Streaming',
    subscriptions: 'Subscriptions',
    'smart-projectors': 'Smart Projectors',
  }
  return map[slug] === selectedCategory
}
