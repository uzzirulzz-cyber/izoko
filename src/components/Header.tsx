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
}

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
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const currencyDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-[#060B1E]/95 border-b border-slate-400/10 shadow-2xl transition-all">
      {/* Main Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* PlayBeat Logo (Official 3D Chrome & Gold Brand Asset) */}
        <div
          id="header-brand-logo"
          onClick={() => onSelectCategory('all')}
          className="flex items-center cursor-pointer group shrink-0"
        >
          <div className="relative">
            {/* Subtle Gold Aura Glow on hover */}
            <div className="absolute -inset-1 bg-yellow-400/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <img
              src="/playbeat-logo.png"
              alt="PlayBeat"
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,193,7,0.35)] group-hover:scale-105 group-hover:drop-shadow-[0_0_22px_rgba(255,193,7,0.7)] transition-all duration-300"
            />
          </div>
        </div>

        {/* Navigation Center Links (Matching Screenshot 1) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => onSelectCategory('all')}
            className={`transition hover:text-white ${selectedCategory === 'all' && !searchQuery ? 'text-yellow-400 font-semibold' : ''}`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectCategory('Digital Products')}
            className={`transition hover:text-white ${selectedCategory === 'Digital Products' ? 'text-yellow-400 font-semibold' : ''}`}
          >
            Products
          </button>
          <button
            onClick={() => onSelectCategory('Subscriptions')}
            className={`transition hover:text-white ${selectedCategory === 'Subscriptions' ? 'text-yellow-400 font-semibold' : ''}`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => onSelectCategory('all')}
            className="transition hover:text-white"
          >
            Categories
          </button>
          <button
            onClick={() => onSelectCategory('Gift Cards')}
            className="transition hover:text-white"
          >
            Offers
          </button>
          <button
            onClick={() => onOpenAccountTab('settings')}
            className="transition hover:text-white"
          >
            Support
          </button>
        </nav>

        {/* Live Search Input (Matching Search Bar with Hotkey) */}
        <div className="flex-1 max-w-xs sm:max-w-sm relative hidden sm:block">
          <div
            className={`relative flex items-center rounded-2xl bg-[#091330]/90 border transition-all duration-300 ${
              searchFocused
                ? 'border-yellow-400/70 ring-2 ring-yellow-400/20 shadow-[0_0_25px_-5px_rgba(250,204,21,0.25)]'
                : 'border-slate-400/15 hover:border-slate-400/30'
            }`}
          >
            <Search className="w-4 h-4 ml-3.5 text-slate-400 shrink-0" />
            <input
              id="header-search-input"
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search products..."
              className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery ? (
              <button
                id="header-clear-search-btn"
                onClick={() => onSearchChange('')}
                className="p-1.5 mr-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Right Actions: Currency, Cart, Sign Up, Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Currency Switcher */}
          <div className="relative" ref={currencyDropdownRef}>
            <button
              id="header-currency-btn"
              onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B1536] border border-slate-400/15 text-slate-200 text-xs font-mono transition"
            >
              <span>{CURRENCY_META[selectedCurrency]?.flag}</span>
              <span>{selectedCurrency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {currencyDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-[#091330] border border-slate-400/20 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {SUPPORTED_CURRENCIES.map((code) => (
                  <button
                    key={code}
                    onClick={() => {
                      onCurrencyChange(code)
                      setCurrencyDropdownOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-left ${
                      code === selectedCurrency
                        ? 'bg-yellow-400/15 text-yellow-300 font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{CURRENCY_META[code].flag} {code}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{CURRENCY_META[code].symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Trigger with Yellow Badge */}
          <button
            id="header-cart-btn"
            onClick={onOpenCart}
            className="relative p-2.5 rounded-xl bg-[#0B1536] border border-slate-400/15 hover:border-yellow-400/40 text-slate-300 hover:text-white transition"
            title="Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4 text-slate-200" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-[#FFC107] text-slate-950 font-mono font-black text-[10px] flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {/* Sign Up Button (With Water-Glow Hover State from Screenshot 2) */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-full blur-md opacity-0 group-hover:opacity-90 transition duration-300 pointer-events-none"></div>
            <button
              id="header-signup-btn"
              onClick={onOpenAuth}
              className="relative px-5 py-2 rounded-full btn-gold-gradient text-slate-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all duration-200 whitespace-nowrap"
            >
              Sign Up
            </button>
          </div>

          {/* Profile Button with Dropdown (Item 3 in Screenshot 2) */}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0B1536] border border-slate-400/20 hover:border-yellow-400/50 text-slate-200 text-xs font-semibold transition"
            >
              <div className="w-6 h-6 rounded-full bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-yellow-400 font-mono text-[11px] font-bold">
                {user ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="hidden sm:inline text-xs font-medium">
                {user ? 'Profile' : 'Sign In'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu (Exact 7 items from Screenshot 2) */}
            {profileDropdownOpen && user && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-[#091330] border border-slate-400/20 shadow-2xl backdrop-blur-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-400/10 mb-1">
                  <div className="text-xs font-bold text-white truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onOpenAccountTab('profile')
                    setProfileDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    onOpenAccountTab('orders')
                    setProfileDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-400" />
                  <span>Orders</span>
                </button>

                <button
                  onClick={() => {
                    onOpenAccountTab('subscriptions')
                    setProfileDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span>Subscriptions</span>
                </button>

                <button
                  onClick={() => {
                    onOpenAccountTab('library')
                    setProfileDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  <FolderLock className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold text-yellow-300">Digital Library</span>
                </button>

                <button
                  onClick={() => {
                    onOpenWishlist()
                    setProfileDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>Wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded">
                      {wishlistCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onOpenAccountTab('settings')
                    setProfileDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </button>

                {user && (
                  <button
                    onClick={() => {
                      onSignOut()
                      setProfileDropdownOpen(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition border-t border-slate-400/10 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
