/*
 * PlayBeat Digital — storefront service worker (PWA)
 *
 * Strategy (conservative by design — must never break checkout/auth):
 *   - HTML navigations : network-first, offline.html fallback when offline
 *   - hashed /assets/* : cache-first (immutable, versioned filenames)
 *   - /pwa/*, icons    : cache-first (rarely change)
 *   - /api/*           : network-only — NEVER cached (auth, orders, payments)
 *   - everything else  : network-first with cache fallback
 *
 * Bumping CACHE_VERSION clears every old cache on activate, so stale assets
 * from a previous deploy are never served after an update.
 */
const CACHE_VERSION = 'playbeat-pwa-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/pwa/pwa-192.png',
  '/pwa/pwa-512.png',
  '/pwa/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await cache.addAll(PRECACHE_URLS).catch(() => {}); // best-effort precache
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin
  if (url.pathname.startsWith('/api/')) return; // network-only (no caching)

  // HTML navigations → network-first, offline fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_VERSION);
          return (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // Immutable build assets → cache-first
  const isImmutableAsset = url.pathname.startsWith('/assets/');
  const isStaticPwa = url.pathname.startsWith('/pwa/') || url.pathname === '/manifest.webmanifest';

  if (isImmutableAsset || isStaticPwa) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return hit || Response.error();
        }
      })()
    );
    return;
  }

  // Everything else (logo, legal html, images) → network-first w/ cache fallback
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const fresh = await fetch(req);
        if (fresh.ok && fresh.type === 'basic') cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const hit = await cache.match(req);
        if (hit) return hit;
        throw new Error('offline and not cached');
      }
    })()
  );
});
