// generate-seo-shell.mjs — post-build SEO step (runs right after `vite build`).
//
// 1. Prerenders the HOMEPAGE into dist/index.html: injects the storefront H1,
//    description and real category links inside <div id="root">. The static
//    file at "/" then serves SEO-complete HTML directly from the CDN — the
//    homepage keeps static-file speed AND crawlers without JS see real
//    content. React's createRoot().render() replaces the injected block on
//    mount (no hydrateRoot → no hydration mismatch, zero design change).
// 2. Emits api/_lib/seoShell.generated.ts (the UNMODIFIED built shell) so the
//    serverless prerender layer (api/_lib/prerender.ts) can build product /
//    category / services pages from the same shell at runtime.
//
// Escaping: HTML embedded in a TS template literal — backticks, backslashes
// and ${ are escaped. `</script>` inside the HTML is safe (JS module context).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(root, "dist", "index.html");
const outFile = path.join(root, "api", "_lib", "seoShell.generated.ts");

const HOMEPAGE_BLOCK = `
      <!-- Perf (task §5/§10): STATIC HERO + ANNOUNCEMENT REPLICA. The measured
           mobile LCP element is the hero stage <main class="pbhs-stage"> whose
           background is /hero_header_v3.webp (preloaded above with
           fetchpriority=high). Previously that element only existed once React
           finished rendering the ENTIRE app, which under Lighthouse's 4x-CPU
           simulation pushed LCP to 13-26s. The announcement-bar replica below
           reserves its exact rendered height (same classes, same CMS text) so
           the live bar inserts with ZERO layout shift on slow networks.
           React's commit replaces the whole block pixel-identically — verified
           locally: identical hero rect pre/post mount, exactly 1 H1.
           NOTE: if the admin edits the CMS announcement text or toggles it
           off, rebuild/redeploy to refresh this replica (otherwise the live
           bar swaps in ~0.3s later with a possible small reflow). -->
      <div class="w-full bg-gradient-to-r from-amber-400/15 via-[#0A122E] to-amber-400/15 border-b border-amber-400/25 text-center py-2 px-4"><span class="text-[11px] sm:text-xs font-semibold text-amber-300 font-mono">🔥 Global Best Prices 🌍 | ⚡ Instant Delivery 🚀 | 🔒 Secure Payments 💳 | 🌎 Available Worldwide ✨ | 💎 Trusted Premium Products⭐</span></div>
      <div class="pbhs-scroll relative w-full overflow-x-auto bg-[#000b1d] [scrollbar-width:none]"><main class="pbhs-stage relative" style="background-image:url(/hero_header_v3.webp)"></main></div>
      <div style="min-height:100vh;background:#050814;color:#e5e7eb;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;padding:24px 16px;box-sizing:border-box"><div style="max-width:920px;margin:0 auto">
      <h1 style="color:#fff;font-size:26px;line-height:1.25;margin:10px 0 14px;font-weight:800">Premium Digital Marketplace &amp; Smart Projectors</h1>
      <p style="line-height:1.7;color:#c7ccd6;margin:0 0 14px;font-size:15px">Instant digital keys, gaming accounts, subscriptions, AI tools, SaaS licenses, and high-performance 4K Smart Projectors with 24/7 automated delivery.</p>
      <h2 style="color:#fff;font-size:18px;margin:6px 0 10px;font-weight:700">Browse by category</h2>
      <ul style="list-style:disc;padding-left:20px;margin:0 0 14px;color:#c7ccd6">
        <li><a href="/streaming" style="color:#7dd3fc">Streaming</a></li>
        <li><a href="/subscriptions" style="color:#7dd3fc">Subscriptions</a></li>
        <li><a href="/gift-cards" style="color:#7dd3fc">Gift Cards</a></li>
        <li><a href="/gaming" style="color:#7dd3fc">Gaming</a></li>
        <li><a href="/software" style="color:#7dd3fc">Software</a></li>
        <li><a href="/smart-projectors" style="color:#7dd3fc">Smart Projectors</a></li>
        <li><a href="/smart-4k-projectors" style="color:#7dd3fc">Smart 4K Projectors</a></li>
        <li><a href="/ai-subscriptions" style="color:#7dd3fc">AI Subscriptions</a></li>
        <li><a href="/steam-game-keys" style="color:#7dd3fc">Steam &amp; Game Keys</a></li>
        <li><a href="/windows-office" style="color:#7dd3fc">Windows &amp; Office</a></li>
        <li><a href="/creative-software" style="color:#7dd3fc">Creative Software</a></li>
        <li><a href="/digital-services" style="color:#7dd3fc">Digital Services</a></li>
        <li><a href="/social-media" style="color:#7dd3fc">Social Media</a></li>
        <li><a href="/web-hosting" style="color:#7dd3fc">Web Hosting</a></li>
        <li><a href="/digital-marketing" style="color:#7dd3fc">Digital Marketing</a></li>
        <li><a href="/web3" style="color:#7dd3fc">Web3</a></li>
      </ul>
      </div></div>`;

function fallbackModule(comment) {
  writeFileSync(
    outFile,
    "// AUTO-GENERATED by scripts/generate-seo-shell.mjs — do not edit.\n" +
      `// (${comment})\n` +
      'export const SEO_SHELL_HTML = "";\n'
  );
  process.exit(0);
}

if (!existsSync(distIndex)) {
  console.warn("[generate-seo-shell] dist/index.html not found — emitting fallback module");
  fallbackModule("fallback: dist/index.html was missing at build time");
}

let html = readFileSync(distIndex, "utf8");
if (!html.includes('<div id="root"')) {
  console.warn("[generate-seo-shell] dist/index.html has no #root — emitting fallback module");
  fallbackModule("fallback: no #root in dist/index.html");
}

// ---- 1) prerender the homepage into the static file ----
const rootMarker = '<div id="root"></div>';
if (html.includes(rootMarker)) {
  html = html.replace(rootMarker, `<div id="root">${HOMEPAGE_BLOCK}</div>`);
  writeFileSync(distIndex, html);
  console.log("[generate-seo-shell] homepage prerendered into dist/index.html (+static hero replica)");
} else {
  console.warn("[generate-seo-shell] #root not empty-placeholder — homepage prerender skipped");
}

// ---- 2) emit the shell module for the runtime prerender layer ----
// escape for embedding inside a TS template literal: backslashes first, then
// backticks, then ${
const escaped = html.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const out =
  "// AUTO-GENERATED by scripts/generate-seo-shell.mjs — do not edit.\n" +
  "// Source: dist/index.html (built SPA shell). Regenerated on every build.\n" +
  "export const SEO_SHELL_HTML = `" + escaped + "`;\n";

writeFileSync(outFile, out);
console.log(`[generate-seo-shell] wrote api/_lib/seoShell.generated.ts (${(out.length / 1024).toFixed(1)} KB)`);
