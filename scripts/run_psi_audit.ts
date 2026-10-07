// run_psi_audit.ts — fresh live PageSpeed/Lighthouse measurement through the
// REAL deployed provider code path (api/_lib/seoProviders.runPageSpeed).
// No cached values: every call is a fresh Google PSI/Lighthouse run.
// Uses the keyless PSI quota (the PAGESPEED_API_KEY stays server-side in
// Vercel; the same code path consumes it inside the deployed admin panel).

import { runPageSpeed } from "../api/_lib/seoProviders.ts";

const log = (...a: any[]) => console.log(...a);

function threshold(name: string, v: number | null, good: string, ni: string, unit = "ms", invert = false): string {
  if (v === null || v === undefined) return "Not available";
  const s = invert ? (v >= Number(good) ? "Good" : v >= Number(ni) ? "Needs Improvement" : "Poor")
                   : (v <= Number(good) ? "Good" : v <= Number(ni) ? "Needs Improvement" : "Poor");
  return `${v}${unit === "score" ? "/100" : unit} (${s})`;
}

async function report(target: string) {
  log(`\n==============================================================`);
  log(`TARGET: ${target}`);
  log(`==============================================================`);

  for (const strategy of ["mobile", "desktop"] as const) {
    log(`\n--- ${strategy.toUpperCase()} (fresh Lighthouse run, ~30-60s) ---`);
    const t0 = Date.now();
    const r = await runPageSpeed(strategy, target);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    if (!r.available) {
      log(`UNAVAILABLE: ${r.reason || "unknown error"}`);
      continue;
    }
    log(`measured in ${dt}s at ${r.measuredAt}`);
    log(``);
    log(`LAB (Lighthouse ${strategy}):`);
    log(`  Performance Score : ${r.lab.performanceScore ?? "Not available"}/100`);
    log(`  LCP               : ${threshold("LCP", r.lab.lcpMs, 2500, 4000)}`);
    log(`  CLS               : ${r.lab.cls !== null ? threshold("CLS", r.lab.cls, 0.1, 0.25, "") : "Not available"}`);
    log(`  FCP               : ${threshold("FCP", r.lab.fcpMs, 1800, 3000)}`);
    log(`  TBT               : ${threshold("TBT", r.lab.tbtMs, 200, 600)}`);
    log(`  Speed Index       : ${threshold("SI", r.lab.speedIndexMs, 3400, 5800)}`);
    log(`  TTFB              : ${threshold("TTFB", r.lab.ttfbMs, 800, 1800)}`);
    log(``);
    if (r.field.available) {
      log(`FIELD (Chrome UX Report / CrUX, real user data):`);
      log(`  LCP (p75)         : ${threshold("LCP", r.field.lcpMs, 2500, 4000)}`);
      log(`  INP (p75)         : ${r.field.inpMs !== null ? `${r.field.inpMs}ms (${r.field.inpMs <= 200 ? "Good" : r.field.inpMs <= 500 ? "Needs Improvement" : "Poor"})` : "Not available"}`);
      log(`  CLS (p75)         : ${r.field.cls !== null ? `${r.field.cls} (${r.field.cls <= 0.1 ? "Good" : r.field.cls <= 0.25 ? "Needs Improvement" : "Poor"})` : "Not available"}`);
      log(`  FCP (p75)         : ${threshold("FCP", r.field.fcpMs, 1800, 3000)}`);
      log(`  TTFB (p75)        : ${threshold("TTFB", r.field.ttfbMs, 800, 1800)}`);
    } else {
      log(`FIELD (CrUX): Not available (insufficient real-user traffic for this URL)`);
    }
    if (r.diagnostics.length) {
      log(``);
      log(`TOP DIAGNOSTICS (measured opportunities):`);
      for (const d of r.diagnostics.slice(0, 8)) log(`  • ${d}`);
    }
  }
}

async function main() {
  log("=== FRESH LIVE PAGESPEED / CORE WEB VITALS AUDIT — playbeat.digital ===");
  log(`started: ${new Date().toISOString()}`);
  await report("https://playbeat.digital/");
  await report("https://playbeat.digital/product/playstation-plus-deluxe-1-month-global");
  log(`\nfinished: ${new Date().toISOString()}`);
}

main().catch((e) => {
  console.error("PSI harness error:", e?.message || e);
  process.exit(1);
});
