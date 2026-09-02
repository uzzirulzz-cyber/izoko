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
