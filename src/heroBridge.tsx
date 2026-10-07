// heroBridge.tsx — perf task §5 (LCP): static hero adoption layer.
//
// WHY THIS EXISTS (measured, Lighthouse 13 diag run 2026-10-07):
// The homepage raw HTML ships a static replica of the announcement bar +
// hero stage (generated at build time by scripts/generate-hero-replica.tsx
// and injected by scripts/generate-seo-shell.mjs). That replica paints at
// FCP (~250ms observed). But React mounts with createRoot(), which CLEARS
// #root — destroying the replica — and re-creates the identical hero.
// A brand-new element painting = a NEW LCP candidate, so LCP resets to the
// React commit time (695ms observed; 9.8-13.2s under PSI mobile throttling).
//
// FIX: the replica lives in a SEPARATE container (#hero-root) that React
// hydrates with the SAME component tree that generated it (byte-identical
// markup, guaranteed by using HeroHeaderStage itself in both paths). The
// hero DOM node is ADOPTED — never destroyed/re-created — so no second
// hero-sized paint happens and LCP stays at the early replica paint.
//
// If the replica is absent (or hydration is skipped), everything falls back
// to the previous in-app render path — zero functional change.

import React, { useEffect, useRef, useSyncExternalStore } from 'react'
import { HeroHeaderStage } from './components/HeroHeaderStage'

export interface PbHeroAnnouncement {
  enabled?: boolean
  text?: string
  link?: string
}

export interface PbHeroHandlers {
  onSearchChange: (q: string) => void
  onNavigate: (path: string) => void
  onNavigateHome: () => void
  onSelectCategory: (category: string) => void
  onOpenCart: () => void
  onOpenWishlist: () => void
  onOpenAuth: () => void
  onOpenAccountTab: (tab: 'profile' | 'orders' | 'subscriptions' | 'library' | 'wishlist' | 'settings') => void
  onOpenOffers: () => void
  onOpenTrending: () => void
  onOpenBestValue: () => void
  onSearchSubmit: () => void
  onExploreProducts: () => void
  onBrowseCategories: () => void
}

export interface PbHeroState {
  /** hero (and its announcement bar) is the active top-of-page on home */
  visible: boolean
  announcement: PbHeroAnnouncement | null
  user: { name: string; email: string } | null
  cartCount: number
  wishlistCount: number
  searchQuery: string
  /** true once this surface has mounted and published the stage element */
  hydrated: boolean
}

// ---- build-time announcement snapshot (injected by generate-seo-shell.mjs
// from the same constant the replica was rendered with — hydration match). --
declare global {
  interface Window {
    __PB_ANNOUNCEMENT__?: PbHeroAnnouncement | null
  }
}

const isHomePath = (): boolean => {
  if (typeof window === 'undefined') return false
  const p = window.location.pathname.toLowerCase().replace(/\/+$/, '').replace(/^\//, '')
  return p === '' || p === 'storefront'
}

const noop = () => {}
const noopTab = noop as unknown as PbHeroHandlers['onOpenAccountTab']

let state: PbHeroState = {
  visible: isHomePath(),
  announcement: (typeof window !== 'undefined' && window.__PB_ANNOUNCEMENT__) || null,
  user: null,
  cartCount: 0,
  wishlistCount: 0,
  searchQuery: '',
  hydrated: false,
}

// Handlers live in a silent slot: they never change what the hero RENDERS,
// so updating them must not re-render the surface (App refreshes them on
// every render — notifying each time would churn the hero for nothing).
let handlers: PbHeroHandlers = {
  onSearchChange: noop,
  onNavigate: noop,
  onNavigateHome: noop,
  onSelectCategory: noop,
  onOpenCart: noop,
  onOpenWishlist: noop,
  onOpenAuth: noop,
  onOpenAccountTab: noopTab,
  onOpenOffers: noop,
  onOpenTrending: noop,
  onOpenBestValue: noop,
  onSearchSubmit: noop,
  onExploreProducts: noop,
  onBrowseCategories: noop,
}

// The adopted <main class="pbhs-stage"> node, for App's scroll logic.
let stageEl: HTMLElement | null = null

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export function setHeroHandlers(next: PbHeroHandlers) {
  handlers = next
}

export function setHeroState(patch: Partial<Omit<PbHeroState, 'hydrated'>>) {
  let changed = false
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    if (patch[k] !== state[k]) {
      changed = true
      break
    }
  }
  if (!changed) return
  state = { ...state, ...patch }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The adopted <main class="pbhs-stage"> DOM node (or null). */
export function getHeroStageEl(): HTMLElement | null {
  return stageEl
}

/** True when the served document shipped the static hero replica. */
export function heroReplicaPresent(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.getElementById('hero-root')
  return !!el && el.children.length > 0
}

/** The hydrated hero surface. Rendered by main.tsx into #hero-root. */
export const HeroSurfaceBridge: React.FC = () => {
  // third arg = getServerSnapshot: the static replica render (build time)
  // reads the same pre-seeded module state the client's first render uses.
  const s = useSyncExternalStore(subscribe, () => state, () => state)
  const stageRef = useRef<HTMLElement | null>(null)

  // Publish the stage element + hydrated flag once mounted (and re-publish
  // after each hide/show cycle driven by SPA navigation).
  useEffect(() => {
    if (!s.visible) return
    stageEl = stageRef.current
    if (!state.hydrated) {
      state = { ...state, hydrated: true }
      emit()
    }
    return () => {
      stageEl = null
    }
  }, [s.visible])

  if (!s.visible) return null

  const a = s.announcement
  return (
    <>
      {a?.enabled && a.text && (
        <div
          className="w-full bg-gradient-to-r from-amber-400/15 via-[#0A122E] to-amber-400/15 border-b border-amber-400/25 text-center py-2 px-4 cursor-pointer group"
          onClick={() => {
            if (a.link) window.location.href = a.link
          }}
        >
          <span className="text-[11px] sm:text-xs font-semibold text-amber-300 group-hover:text-amber-200 transition font-mono">
            {a.text}
          </span>
        </div>
      )}
      <HeroHeaderStage
        ref={(el: HTMLDivElement | null) => {
          stageRef.current = el
        }}
        searchQuery={s.searchQuery}
        /* indirection keeps call-time freshness of silently-updated handlers */
        onSearchChange={(q) => handlers.onSearchChange(q)}
        onNavigate={(p) => handlers.onNavigate(p)}
        onNavigateHome={() => handlers.onNavigateHome()}
        onSelectCategory={(c) => handlers.onSelectCategory(c)}
        onOpenCart={() => handlers.onOpenCart()}
        onOpenWishlist={() => handlers.onOpenWishlist()}
        onOpenAuth={() => handlers.onOpenAuth()}
        onOpenAccountTab={(t) => handlers.onOpenAccountTab(t)}
        user={s.user}
        onOpenOffers={() => handlers.onOpenOffers()}
        onOpenTrending={() => handlers.onOpenTrending()}
        onOpenBestValue={() => handlers.onOpenBestValue()}
        onSearchSubmit={() => handlers.onSearchSubmit()}
        onExploreProducts={() => handlers.onExploreProducts()}
        onBrowseCategories={() => handlers.onBrowseCategories()}
        cartCount={s.cartCount}
        wishlistCount={s.wishlistCount}
        deferSrH1
      />
    </>
  )
}
