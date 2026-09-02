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
