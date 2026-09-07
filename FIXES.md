# PlayBeat Digital — Fix & Feature Changelog

This is the **same existing playbeat.digital codebase** (React + Vite storefront,
Vercel serverless API + MongoDB, Java Android admin shell) with the following
fixes and activations applied. Nothing was rebuilt from scratch.

---

## 1. URL Indexing — created & fixed

| File | Change |
|------|--------|
| `index.html` | Full SEO head added: canonical URL, robots directives, keywords, Open Graph (site name/title/description/image/locale), Twitter Card, theme-color and JSON-LD structured data (`Organization` + `WebSite` with SearchAction). |
| `src/lib/seo.ts` | **NEW** — per-route SEO engine. Every SPA route now updates `<title>`, meta description, canonical, OG/Twitter tags and a route-level `CollectionPage` JSON-LD block. Admin routes force `noindex, nofollow`. |
| `App.tsx` | Route change now applies the matching SEO preset (`SEO_PRESETS`). |
| `public/robots.txt` | Fixed invalid syntax (removed illegal `/api/*` wildcard duplication), added all new indexable routes (subcategories, `/compare`, `/warranty`), sitemap pointer kept. |
| `public/sitemap.xml` | Added missing URLs: `/compare`, `/warranty`, and the 5 curated subcategory collections. Added `<lastmod>` to every entry. |
| `vercel.json` | Added SPA rewrites for `/warranty` + 5 subcategory slugs + `/api/messages/*`. Added `X-Robots-Tag: noindex` for `/admin/*`, `Cache-Control: no-store` for admin, and security headers (`nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) site-wide. |

## 2. Browse Now section — enabled on the storefront

| File | Change |
|------|--------|
| `src/components/BrowseNow.tsx` | **NEW** — the "Browse Now" discovery hub on the homepage: quick-nav tiles (PlayBeat Home / Products / Subscriptions / Categories / Offers / Support), a big product-search trigger (focuses the header search, `/` hotkey), Sign Up / Sign In buttons, all 6 category cards (Streaming, Subscriptions, Gift Cards, Gaming, Software, Smart Projectors), the 5 curated subcategory collections, Projector Comparison link, and the full support/legal link row (Warranty & Replacement Policy, Privacy, Terms, Refund, Contact). |
| `App.tsx` | Browse Now rendered on the homepage; "Offers" action sorts by biggest discount and scrolls to the deals; search trigger focuses the header search bar. |
| `src/components/Header.tsx` | Nav repaired to the real structure: **Home** → `/` (resets filters), **Products** → full catalog, **Subscriptions**, **Categories** → mega-dropdown with all 6 categories + 5 collections + Projector Comparison, **Offers** → biggest-discount view, **Support** → `/contact`. Logo links home. |
| `src/components/Footer.tsx` | Catalog column links now point to real indexable URLs (`/smart-4k-projectors`, `/ai-subscriptions`, `/steam-game-keys`, `/windows-office`, `/creative-software`, `/compare`); Warranty links to the new `/warranty` page; policy button grid expanded to 5 entries. |

## 3. Storefront URL structure — new routes

| Route | Content |
|-------|---------|
| `/streaming` … `/smart-projectors` | Existing category pages (unchanged behaviour). |
| `/smart-4k-projectors` | NEW curated collection — native 4K/1080p projectors. |
| `/ai-subscriptions` | NEW curated collection — ChatGPT, Perplexity, Leonardo, ElevenLabs, etc. |
| `/steam-game-keys` | NEW curated collection — Steam wallet, game keys, Xbox/PSN. |
| `/windows-office` | NEW curated collection — Windows & Office licenses. |
| `/creative-software` | NEW curated collection — Adobe CC, CapCut, Freepik, etc. |
| `/warranty` | NEW full Warranty & Replacement Policy page (previously only a footer modal). |
| `/compare` | Existing Projector Comparison page — now in sitemap + linked everywhere. |

All new routes have unique titles/descriptions/canonicals via the SEO engine,
are listed in `sitemap.xml`/`robots.txt`, and work on Vercel via SPA rewrites.

## 4. Message Box & Live Support — activated end-to-end

| File | Change |
|------|--------|
| `api/messages/index.ts` | **NEW** consolidated router. `POST /start` (customer opens chat), `GET/POST /mine` (customer polls/sends; ownership via user token, visitorId or email), `GET /conversations` (admin inbox + counts), `GET/PUT /conversations/:id` + `POST /conversations/:id/reply` (staff view/read/reply/status), `GET/POST /staff-dm` (employee↔employee direct messages), `GET /unread-count` (badge). Stores threads in MongoDB `chat_conversations` / `chat_messages` with unread counters and read receipts. |
| `src/components/LiveSupportWidget.tsx` | **NEW** storefront floating chat bubble (bottom-right, online pulse). Visitors and signed-in customers chat with the team; identity prefilled from the account; 5-second polling; thread persisted per device. |
| `src/components/AccountDrawer.tsx` | **NEW "Messages" tab** — the customer's support conversation inside the account drawer (same thread as the widget, 6-second polling). |
| `src/components/admin/MessageBoxPanel.tsx` | **NEW admin Message Box** — two tabs: **Live Support** (every storefront chat with status open/pending/closed, unread badges, search, 8-second live thread polling, reply box, status controls) and **Staff Messages** (staff-to-staff DMs with a New DM composer that picks any employee account). KPI tiles for unread/open/threads. |
| `src/components/AdminInsightsView.tsx` | Sidebar entry "Message Box & Live Chat" with live unread badge (polled every 60s via `/api/messages/unread-count`), panel rendering, deep-link `#messages` support. |

## 5. Power Authorities — Admin / Manager / Supervisor with authority control

| File | Change |
|------|--------|
| `api/_lib/auth.ts` | **NEW authority system**: `AUTHORITY_RANK`, `hasAuthority`, `normalizeAuthority`, `requireAuthority(req,res,level)` (server-enforced hierarchy) and `requireStaffAuthority` (super admin **or** Administrator authority manages staff). `signUserToken` now embeds `authority` + `permissions` claims. Ranks: super admin = 4, Administrator = 3, Manager = 2, Supervisor = 1. |
| `api/auth/index.ts` | Staff login returns + signs `authority`/`permissions`; `/api/auth/admin/me` reports `authority` (`super_admin` for env credentials) and permission list. |
| `api/admin/index.ts` | Staff create/update accepts and stores `authority`; staff list returns authority/permissions/department/active; product create/update/delete now require **Manager+** authority (server-enforced 403 below that); staff management open to super admin or Administrator authority. |
| `src/components/admin/StaffAccountsPanel.tsx` | Create form gains a **Power Authority selector** (Administrator / Manager / Supervisor cards with descriptions); roster shows authority chips; per-row dropdown changes an employee's authority instantly; hierarchy explainer card; permission matrix expanded (adds Messages, CMS, Campaigns). |
| `src/components/AdminInsightsView.tsx` | Authority-aware UI: profile menu shows the signed-in authority badge; "Employee Staff Accounts" hidden from Manager/Supervisor; "Restore Points & Sync" visible to the super admin only (mirrors server rules). |

## 6. Supporting fixes

- `src/components/CsvImporterModal.tsx` — fixed a **pre-existing type error** (missing `slug` on imported products) that broke `tsc`.
- `package-lock.json`/lockfile state refreshed; `npm run lint` (tsc) and `npm run build` (vite) both pass.

---

## Deploy notes

1. Deploy to Vercel as usual (`vercel.json` already wires the new routes).
2. No new environment variables are required. New MongoDB collections
   (`chat_conversations`, `chat_messages`) are created automatically on first use.
3. Existing staff accounts keep working — accounts without an `authority` field
   default to **Supervisor**; raise levels from *Employee Staff Accounts → Power Authority*.
4. After deploy, resubmit `https://playbeat.digital/sitemap.xml` in Google
   Search Console — the new URLs (`/compare`, `/warranty`, subcategory pages)
   will start indexing with their own titles and descriptions.

---

# Audit Response — 2026-09-02 Full Site Audit Fixes

## 1. Legal page routing — FIXED (Critical)

| Issue | Fix |
|-------|-----|
| `/privacy` & `/terms` resolved with homepage title; `/legal/privacy`, `/legal/terms`, `/legal/shipping` returned 404 | **Static, fully crawlable legal pages** generated at build time (`scripts/generate-legal-pages.mjs` → `public/*.html`): `/privacy`, `/terms`, `/refund-policy`, `/shipping-policy`, `/warranty`. Each is a complete standalone document with unique `<title>`, meta description, canonical, Open Graph, Twitter Card and JSON-LD (`WebPage` + `BreadcrumbList`) — no SPA fallback, indexable without JavaScript. |
| `/legal/*` broken routes | 308 permanent redirects to canonical URLs: `/legal/privacy→/privacy`, `/legal/terms→/terms`, `/legal/refund→/refund-policy`, `/legal/shipping + /legal/delivery→/shipping-policy`, `/legal/warranty→/warranty`, `/legal/contact→/contact` (vercel.json `redirects` + dev parity in `server.ts`). |
| Refund policy gaps | Added refund request window (7 days) and processing timeframes to both refund policy renderers. |

## 2. Checkout — now real end-to-end (Critical)

- `CartDrawer` no longer fakes keys with `Math.random()`. Checkout now calls **`POST /api/orders`** with the signed-in user's token; the server creates the order, verifies prices and returns the real order number + license keys.
- **Legal consent checkboxes** added at checkout: "I agree to the Terms & Conditions" + "I acknowledge the Refund Policy", both required, both linking to the canonical policy pages.
- **Failure states handled**: API/network errors show an inline error banner, the cart is preserved, and no success screen or confetti is shown unless the server confirms the order (audit §4: failed payments must not create completed orders).
- Fixed a blocking bug where the pay button was permanently disabled (shared `isCheckingOut` flag used for both "form open" and "submitting").

## 3. Payments — server-side verification + webhook (Critical)

- **`api/payments/index.ts` (NEW)** — `POST /api/payments/webhook` with:
  - HMAC-SHA256 signature verification (`x-playbeat-signature`, secret `PAYMENT_WEBHOOK_SECRET`), timing-safe compare, fail-closed (403 without a valid signature).
  - **Idempotency**: `payment_events` collection with a unique `eventId` index — duplicate webhook deliveries return `{duplicate:true}` and never double-process.
  - Amount cross-check: paid amount vs stored order total; mismatch flags the order (`paymentFlag: amount_mismatch`) and returns 409 instead of marking it paid.
  - Status transitions: paid → completed, failed → payment_failed, refunded → refunded.
- **Server-side price verification in `api/orders`**: each line item's price is recomputed from the `products` collection (including variant prices); the client-sent total is stored only as reference (`clientTotalAmount`). Verified: a forged PKR 0.02 order for a PKR 26,550 product is stored at PKR 53,100.
- Browser never marks an order paid; only verified webhook / server logic does.

## 4. 404 & error pages (audit §15)

- **SPA 404** (`NotFound.tsx`): unknown URLs no longer silently render the homepage. Dedicated 404 view with "Back to Home / Shop Products / Contact Support", `noindex` robots meta and title "Page Not Found (404)". `/product/*` and `/category/*` deep links still resolve to the catalog.
- **Static `public/404.html`** fallback with the same three recovery actions.

## 5. Mobile & navigation (audit §2, §12 — screenshots)

- **Mobile hamburger menu** (`lg:hidden`): full nav tree — Home / Products / Subscriptions / Offers / Support, all 6 categories, all 5 curated collections, Projector Comparison, Sign Up / Sign In. Previously the nav simply disappeared below 1024px with no menu at all.
- **Mobile search row** (`sm:hidden`): always-visible search below the header on phones; Browse Now's search trigger now focuses it.
- **Header overflow fixed** at ≤1024px and on phones: mobile menu toggle added, currency switcher collapses to flag-only, gold Sign Up button hidden on phones (profile button opens the same auth flow) — the right action cluster no longer clips off-screen (was right:1088 @1024, right:420 @390).
- Verified at 1440/1366/1280/1150/1024/820/768/640/414/390: no horizontal page scroll anywhere.

## 6. SEO additions (audit §11)

- **BreadcrumbList JSON-LD** on every indexed route (Home → Page).
- **Product JSON-LD** injected while the quick-view modal is open (name, image, price, currency, availability, brand, SKU), removed on close.
- Canonical now always reflects the route's own path; noindex routes (admin, 404) strip route JSON-LD.

## 7. Performance (audit §13)

- Vendor chunk splitting via `manualChunks` (react / motion / lucide / misc): main bundle 916 KB → 822 KB + long-lived cacheable vendor chunks.

## 8. Dev/production parity

- `server.ts` now mounts the shared serverless handlers for `/api/orders` (bare path) and `/api/payments`, serves the static legal pages and mirrors the `/legal/*` redirects — local dev behaves identically to Vercel.
- `PORT` now respects `process.env.PORT`.

## Verified end-to-end

- Forged lowball order → server recomputed total (PKR 0.02 → PKR 53,100) ✔
- Signed webhook → order marked paid ✔; replay → `{duplicate:true}` ✔; bad signature → 403 ✔; amount mismatch → 409 + order flagged ✔
- Real UI checkout (sign in → cart → consent checkboxes → order) → Order Confirmed with server order number ✔
- `/legal/shipping` → 308 → `/shipping-policy` ✔; `/privacy` serves static document with unique title ✔
- Unknown URL → 404 page with noindex, URL preserved ✔

---

# Enhancement Round — FAQ, Order Tracking, Image Optimization

## 1. FAQ (homepage + SEO)

- **NEW `FAQSection`** on the homepage (above Trust Features): 8 accordion Q&As grounded in the live shipping/refund/warranty/terms policies — delivery times, key activation, refunds, region compatibility, projector shipping, warranty, payment methods, support channels. Links to every policy page + Contact Support CTA.
- **FAQPage JSON-LD** injected while the section is mounted — the storefront is now eligible for FAQ rich results in Google.

## 2. Order tracking (account drawer)

- The "Orders" tab previously fell through to the generic profile view — **no order history existed**. NEW `OrdersTab` component:
  - Fetches `/api/orders/me` (Bearer auth) with loading skeleton, error + retry state, and an empty state with a Browse Products CTA.
  - Every order shows: order number, date, payment method, status badge (Completed / Payment Failed / Refunded), **status timeline** (Order Placed → Payment Verified → Keys Delivered / Dispatch & Delivery) and server-verified total.
  - Line items include variant, quantity, price, **re-copyable license keys** and courier tracking notes for physical orders (SMS + email tracking).
  - Manual Refresh button; currency-aware totals.

## 3. Image optimization

- Converted **69 product images** JPG/PNG → WebP (max width 900px, quality 78): **9.4 MB → 2.3 MB (75% smaller)**.
- Updated all 146 references in the static catalog (`products.ts`) **and migrated all 178 MongoDB product docs** (`image`, `galleryImages`, `additionalImages`, variant images) via idempotent migration script `scripts/migrate-product-images-webp.mjs`.
- Below-fold images: `loading="lazy"` + `decoding="async"` (92/92 product images lazy); flagship showcase image gets `fetchPriority="high"` for LCP.
- `og:image` intentionally kept as PNG for social-platform compatibility.

---

# Enhancement Build — Catalog Alignment, Monetization & Operations (2026-09-07)

Implements the enhancement brief on top of the existing architecture: **zero
framework changes, zero new serverless functions (still exactly 12), zero
payment-verification weakening**. All new endpoints live inside the existing
consolidated routers; shared logic goes in `api/_lib/*`.

## 1. Category alignment — 8 target categories (Section 3 "core decision")

| File | Change |
|------|--------|
| `api/categories.ts` | **Rewritten as a DB-driven category registry.** The `categories` Mongo collection holds the 8 target categories — Gaming, Software, Gift Cards, Social Media, Web Hosting, Digital Marketing, Web3, Services — plus the established Streaming + Smart Projectors storefront categories (kept, never deleted). Each entry maps to the EXISTING product model via `productCategories` + optional `tagRegex`; old routes survive as `aliases` (`/steam-game-keys` → Gaming, `/windows-office` + `/creative-software` → Software, `/ai-subscriptions` + `/subscriptions` → Services, `/giftcards` → Gift Cards). Counts are computed live from the products collection. Lazy-seeded, idempotent. |
| `api/products/index.ts` | New `?cat=<slug|alias>` filter resolves through the registry — the frontend only ever sends a slug; which product categories / tag matcher apply is decided server-side from the DB. Legacy `?category=` and `?categories=` keep working. |
| `src/App.tsx` | New routes `/gift-cards`, `/services`, `/social-media`, `/web-hosting`, `/digital-marketing`, `/web3` (registry-matched catalog overlays, same UI as existing category pages); `/category/:slug` deep links overlay the same matchers. |
| `src/lib/seo.ts` | Unique title/description/canonical presets for every new route. |
| `src/components/CategoryNav.tsx` | Category tiles are now DB-driven (`GET /api/categories` → counts, copy, ordering) with the static catalog as fallback. New categories get real indexable links. |
| `vercel.json` | SPA rewrites for the 6 new routes. Old routes untouched — aliases, never deletions. `/compare`, `/warranty` and legal pages unaffected. |

## 2. Server-side cart (Section 4.1)

- **`api/orders/index.ts`** — `GET/PUT/DELETE /api/orders/cart`: the cart lives
  in the `carts` collection per signed-in user. `PUT` accepts ONLY product
  refs + quantity + variant — every price is recomputed from the products
  collection on every read, finite-stock quantities are clamped (with problem
  flags), and the client never dictates a total.
- **`src/App.tsx`** — signed-in cart sync: local cart pushes to the server
  (debounced); an empty local cart adopts the server cart (cross-device).
  Offline behaviour unchanged.

## 3. Coupons — scoping + admin CRUD (Section 4.2)

- **`api/_lib/coupons.ts`** — new `appliesTo: { categories, productIds }`
  scoping validated against SERVER-verified cart lines (DB category/sku —
  the browser cannot forge a match); `parseCouponPayload` hand-written schema
  (code charset, percent ≤ 100, expiry, usage caps); admin projection.
- **`api/admin/index.ts`** — `GET/POST /api/admin/coupons`, `POST
  /api/admin/coupons/delete` (permission `coupons`), all audited.
- **Frontend** — `CouponInput`/`paymentApi` send cart line refs so scoped
  coupons preview correctly; new **Coupon Codes** admin panel
  (`src/components/admin/OpsPanels.tsx`).

## 4. Subscription plans (Section 4.3)

- **`api/_lib/product.ts`** — `ProductPlan` sub-document (`plans: [{id, label,
  months, price, …}]`) passes through `formatProduct`; Plan-labelled variants
  are exposed through the same shape so the ai-subscriptions model generalizes
  to any product. Plan prices are re-verified server-side at order time.
- **`src/types.ts`** + **`QuickViewModal.tsx`** — plan selector renders for
  plan-bearing products; the chosen plan rides as a variant.

## 5. Digital delivery fulfillment (Section 4.4)

- **`api/_lib/fulfillment.ts` (NEW)** — runs ONCE per paid order (idempotent
  via the `fulfillments` ledger), triggered ONLY by a verified webhook (generic
  + Rapid paths both call it): guarantees license keys, attaches product
  `downloadUrl`/`activationNotes`, writes `delivery_events`, decrements FINITE
  stock (+ `stock_movements`), generates the invoice, writes the in-app
  notification, and attempts the confirmation email ONLY if `RESEND_API_KEY`
  is configured — otherwise `emailStatus` records the honest fallback.
- **`api/_lib/email.ts` (NEW)** — Resend via plain fetch (zero deps); never
  fakes a send. Branded order-paid template.
- **Customer surface** — Account → Alerts tab (`AccountDrawer`) lists
  notifications from `GET /api/orders/notifications` (+ mark-read).

## 6. Invoices (Section 4.5)

- **`api/_lib/invoice.ts` (NEW)** — auto-issued on verified payment:
  `INV-YYYY-#####` (atomic counter), branded header, line items, discount,
  status; unique indexes make double-issue impossible. Owner fetch:
  `GET /api/orders/invoice/:orderNumber` (owner-scoped, idempotent).
- **`src/components/InvoicePage.tsx` (NEW)** — `/invoice/:orderNumber`
  (noindex): branded printable invoice with **Download PDF / Print** (browser
  print → PDF, no dependency) and honest sign-in/404 states.

## 7. Reviews (Section 4.6)

- **`api/products/index.ts`** — `GET /api/products/reviews` (approved only +
  summary), `POST /api/products/reviews` (signed-in; **verified purchasers
  only**, server-checked against paid orders containing the product; one per
  user; stored `pending`).
- **`api/admin/index.ts`** — moderation (`reviews` permission):
  approve/hide/feature/unfeature/delete + product rating recompute from
  approved reviews, all audited.
- **Frontend** — QuickView reviews tab now shows REAL data + a write form
  (honest 403 message for non-purchasers); new **Reviews Moderation** admin
  panel. The fake hardcoded testimonial is gone.

## 8. Support tickets (Section 4.7)

- **`api/messages/index.ts`** — the live-support conversations gain the
  5-state machine `open → pending → in_progress → resolved → closed` with
  explicit allowed transitions (409 on violations), `low/normal/high/urgent`
  priority, `ticketEvents` trail, auto-advance on staff reply
  (closed→pending, resolved→in_progress) and audit logging. Counts extended.

## 9. Inventory (Section 4.8)

- **Products** — `stockMode: "finite" | "unlimited"` (digital defaults to
  unlimited) + `lowStockThreshold`. Stock guards and fulfillment decrements
  respect the mode; unlimited products never block checkout.
- **`api/admin/index.ts`** — `GET /api/admin/inventory` (stock list, low/out
  flags, movement history) + `POST /api/admin/inventory/adjust` (add/set with
  reason → `stock_movements` + audit). New **Inventory & Stock** admin panel.

## 10. CMS homepage builder (Section 4.9)

- **`api/cms/index.ts`** — public `GET /api/cms/homepage` (enabled sections,
  ordered, sanitized).
- **`api/admin/index.ts`** — sections CRUD (`cms` permission): create, update,
  enable/disable, delete, reorder (`homepage_sections` collection; types:
  hero/banner/featured/faq/testimonial).
- **Frontend** — `CmsHomepageSections.tsx` renders DB sections on the
  storefront (nothing renders until configured); new **Homepage Builder**
  admin panel with composer + reordering.

## 11. Audit log (Section 4.10)

- **`api/_lib/audit.ts` (NEW)** — append-only `audit_logs` with actor, action,
  target, detail, source. Wired into: order fulfillment + status changes,
  product create/update/delete, staff create, coupon CRUD, reviews moderation,
  inventory adjustments, CMS sections, category registry, ticket transitions.
- **`api/admin/index.ts`** — `GET /api/admin/audit-logs` (action filter) +
  **Audit Log** admin panel.

## 12. RBAC — module permissions (Section 5)

- **`api/_lib/auth.ts`** — `MODULE_PERMISSIONS` + `DEFAULT_PERMISSIONS` per
  authority: super_admin `*`; admin → products/inventory/orders/customers/
  support/coupons/cms/reviews/analytics/audit; manager → products/inventory/
  orders/coupons; supervisor → customers/support/reviews; **finance (NEW
  authority tier)** → payments/invoices/refunds/analytics/audit; IT unchanged
  (gateway-only). New `hasPermission`/`effectivePermissions`/
  `requirePermission(req,res,perm)`; explicit per-account `permissions` arrays
  override the default kit. `staff/create` accepts `finance` + permission
  lists; staff JWTs embed them (server-enforced — UI hiding is not security).
- New endpoints use `requirePermission`; cross-role access returns 403.

## 13. Security notes

- No secrets added to the client; `RESEND_API_KEY`/`EMAIL_FROM` documented in
  `.env.example` (server-only).
- All new inputs validated + length-capped; Mongo queries parameterized;
  admin endpoints behind JWT + permission checks; regex inputs escaped.
- Admin order-status changes can NEVER set `paymentStatus` or `completed` —
  payment truth stays gateway-webhook-only.
- Function count verified: **exactly 12 Vercel functions** (unchanged).

## 14. Verification (local, real Atlas catalog)

- `tsc --noEmit` clean; `vite build` clean.
- **`scripts/test_enhancements.mjs`: 91/91 PASS** — registry (8 core
  categories + aliases + live counts), registry-driven filtering, server cart
  (client prices ignored), scoped coupons (preview + order creation), signed
  webhook → paid → keys + invoice + notification, webhook replay idempotency,
  reviews (403 non-purchaser → pending → approve → public), RBAC 403 matrix
  (supervisor/finance), ticket state machine (409s), inventory (finite/unlimited
  + movements), CMS builder CRUD → public feed, audit feed.
- Regression: `test_journey_nosalt.mjs` **16/16 PASS**;
  `test_checkout_redesign.mjs` **29/30** (the single documented env-diff:
  local shim-only Rapid-availability expectation).
- Browser-verified (desktop, 1440×900): 11 DB-driven category tiles;
  `/services` (21 items), `/social-media` (honest empty state), `/gift-cards`
  alias; QuickView real-reviews tab; `/invoice/*` auth gate; Admin → Coupon
  Codes / Inventory & Stock (tiles + movements) / Reviews Moderation /
  Homepage Builder / Audit Log — all rendering live data, zero console errors.

## 15. Environment & rollout

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | No | Order confirmation emails; empty = in-app notifications only (honest) |
| `EMAIL_FROM` | No | Verified sender identity for Resend |
| `RAPID_SECRET_KEY` / `RAPID_WEBHOOK_SECRET` | For real payments | Already documented — unchanged |

- New Mongo collections (created lazily, no migration needed): `categories`
  (lazy-seeded registry), `carts`, `invoices`, `fulfillments`,
  `delivery_events`, `customer_notifications`, `stock_movements`, `reviews`,
  `audit_logs`, `homepage_sections`, `counters`.
- Deploy: push to `main` → Vercel auto-deploy. Visit Admin → Coupon Codes /
  Inventory / Reviews Moderation / Homepage Builder / Audit Log to configure.
  Resubmit `sitemap.xml` in Search Console after adding products to the new
  categories.

---

# Payment-Gateway Compliance Update — policies, business transparency, PKR pricing

Compliance round for the payment gateway merchant review: all required policy
pages verified live and linked, complete business-model disclosure added, and
footer/legal surfaces aligned with the reviewer checklist.

## 16. About & Business Model page (`/about`) — NEW

| File | Change |
|------|--------|
| `src/components/AboutPage.tsx` | **NEW** — full compliance page: (1) registered entity (Playbeat Digital Private Limited) + exact registered office address; (2) business model — digital products (subscriptions, license keys, gift cards) + hardware, sourcing at wholesale / retail margin, no hidden fees; (3) 9-step complete customer journey (browse → product/plan → cart → coupon → account → gateway payment → confirmation+invoice → instant digital delivery → after-sales); (4) payment gateway intended-use section — gateway used **only** to collect payment for orders on playbeat.digital, hosted-checkout flow, signed-webhook verification, no card storage, refund routing; (5) pricing & currency — billed in PKR, built-in converter (PKR/USD/EUR/GBP/AED/SAR/CAD, indicative rates); (6) operations & compliance grid (invoicing, delivery, data protection, support); (7) all-policy links; (8) contact block. |
| `src/App.tsx` | `about` route added (`Route` union, `POLICY_ROUTES`, SEO map, render block after `/contact`). |
| `src/lib/seo.ts` | `about` SEO preset ("About PlayBeat Digital — Business Model, Payments & Customer Journey"). |
| `vercel.json` | SPA rewrite `/about` → `/index.html`. |
| `public/sitemap.xml` | Added `/about` + the six new category routes (`/gift-cards`, `/services`, `/social-media`, `/web-hosting`, `/digital-marketing`, `/web3`). |

## 17. Footer — reviewer checklist alignment

| Change |
|--------|
| Policy button grid 5 → **7** entries: Warranty, Privacy, **Terms & Conditions** (renamed from "Terms of Service"), Refund, **Shipping Policy (new link)**, **About & Business Model (new)**, Contact. |
| Quick Links: "About" now points to `/about` ("About & Business Model"); Support stays `/contact`. |
| Bottom bar: © line now names **Playbeat Digital Private Limited** with the registered office address underneath. |
| Contact PlayBeat block (email `support@playbeat.digital`, phone `+92 332 1049333`, WhatsApp lines, registered office) already present — verified unchanged. |

## 18. Checkout — gateway use-case disclosure

| File | Change |
|------|--------|
| `src/components/CheckoutPage.tsx` | Disclosure added inside the "Payment Gateway" section: gateway used solely for products ordered on playbeat.digital, hosted-page redirect, credentials never stored by PlayBeat, verified payment → confirmation → invoice → automatic key delivery, link to `/about`. |

## 19. Policy pages — verified & cross-linked

- Static crawlable policy pages (served at `/privacy`, `/terms`,
  `/refund-policy`, `/shipping-policy`, `/warranty` via `vercel.json`
  rewrites) confirmed **updated (August 2026)**, HTTP 200, with the exact
  registered address ("House 334, Street 6, Jinnahabad, Abbottabad, Khyber
  Pakhtunkhwa, Pakistan") in every page footer.
- `scripts/generate-legal-pages.mjs`: RELATED chips now include
  "About & Business Model"; "Terms of Service" chip renamed
  "Terms & Conditions". Pages regenerated and committed.
- SPA `PolicyPage.tsx`: same title rename + About chip added so both render
  paths stay in sync.

## 20. PKR pricing & currency converter — verified

- All prices are set and billed in **PKR**; header currency selector
  (`PKR` default, `USD/EUR/GBP/AED/SAR/CAD` indicative) verified live —
  switching to USD converts every displayed price and persists the choice;
  restoring PKR confirmed. Disclaimer text on `/about` covers indicative
  rates vs. the bank rate at charge time.

## 21. Verification

- `npx tsc --noEmit` clean; `npm run build` clean (bundle `index-DLzYvGw2.js`).
- Local preview 1440×900 (agent-browser): `/about` hero/business-model/
  journey/gateway/PKR sections render with zero console errors; footer shows
  11 policy/about links incl. Shipping Policy + About & Business Model;
  static `/terms` serves "Terms & Conditions" title; all 8 compliance URLs
  return 200; currency switch PKR→USD→PKR verified with on-page prices.
- Screenshots: `download/compliance/01-06`.
