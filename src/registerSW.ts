// PlayBeat PWA — service worker registration (production only).
//
// Loaded from index.html BEFORE the React bundle so the worker starts
// controlling pages as early as possible. Dev server (`npm run dev`) and
// non-https previews skip registration to avoid cache confusion.
//
// The registration is intentionally tiny: sw.js is hand-rolled and
// conservative (network-first HTML, cache-first immutable assets,
// network-only APIs) — see public/sw.js for the strategy contract.
(() => {
  try {
    const isProd = Boolean((import.meta as any).env?.PROD);
    const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const secure = window.isSecureContext;
    if (!isProd || !supported || !secure) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Check for an updated worker every 60m; let the browser handle it.
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        })
        .catch(() => {
          /* registration is best-effort — the site works fully without it */
        });
    });
  } catch {
    /* never block the app */
  }
})();
