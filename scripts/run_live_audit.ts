// run_live_audit.ts — REAL production SEO audit driven through the ACTUAL
// /api/admin handler code (same code paths the deployed API runs).
//
// - Mints a local admin JWT (SESSION_SECRET/ADMIN_* set below, production is
//   unaffected — these env vars exist only inside this process).
// - MONGODB_URI is injected from scripts/_mongo_uri.cjs so all run/finding/
//   performance documents are written to the SAME database the live admin
//   dashboard reads.
// - Crawls https://playbeat.digital, runs PageSpeed mobile+desktop for real,
//   attempts the official Search Console API (honestly reports "not
//   configured" when env credentials are absent).

import jwt from "jsonwebtoken";
import crypto from "crypto";
import { readFileSync } from "fs";
import path from "path";

// ---- env for this process only -------------------------------------------
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "local-audit-harness-secret";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "harness@playbeat.local";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "harness-local";
const uriMatch = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/);
if (!uriMatch) throw new Error("mongo uri helper missing");
process.env.MONGODB_URI = process.env.MONGODB_URI || uriMatch[1];
process.env.MONGODB_DB_NAME = "playbeat";

// ---- import the REAL handler after env is set ------------------------------
const { default: handler } = await import("../api/admin/index.ts");

const token = jwt.sign({ email: process.env.ADMIN_EMAIL, role: "admin" }, process.env.SESSION_SECRET!, { expiresIn: "2h" });

function makeRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; return this; },
    json(payload: any) { this.body = payload; return this; },
    end(payload?: any) { this.body = payload ?? this.body; return this; },
  };
  return res;
}
async function call(method: string, route: string, body?: any): Promise<{ status: number; body: any; headers: any }> {
  const req: any = {
    method,
    url: `https://playbeat.digital/api/admin/${route}`,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    query: {} as Record<string, string>,
    body: body || {},
  };
  const res = makeRes();
  await handler(req, res);
  if (typeof res.body === "string") {
    try { res.body = JSON.parse(res.body); } catch { /* raw (export) */ }
  }
  return { status: res.statusCode, body: res.body, headers: res.headers };
}

const log = (...a: any[]) => console.log(...a);

// ---------------------------------------------------------------------------
async function main() {
  const t0 = Date.now();
  log("=== LIVE SEO AUDIT (real crawl of playbeat.digital) ===\n");

  // 0) integrations status (booleans only)
  const integ = await call("POST", "seo/audit", { action: "integrations-status" });
  log("integrations:", integ.body?.integrations?.map((i: any) => `${i.id}=${i.status}`).join(" | "));
  log("merchant feed:", JSON.stringify(integ.body?.merchant));
  log("");

  // 1) PageSpeed — real Lighthouse runs FIRST so the health score includes CWV
  log("running PageSpeed mobile (real Lighthouse, ~30-50s)…");
  const psiMobile = await call("POST", "seo/audit", { action: "pagespeed", strategy: "mobile" });
  const pm = psiMobile.body?.pagespeed;
  log("mobile:", pm?.available ? `LCP=${pm.lab.lcpMs}ms CLS=${pm.lab.cls} TBT=${pm.lab.tbtMs}ms perf=${pm.lab.performanceScore} field INP=${pm.field?.inpMs ?? "n/a"}` : `UNAVAILABLE: ${pm?.reason}`);
  log("mobile diagnostics:", pm?.diagnostics?.length ? pm.diagnostics.slice(0, 6) : "none");
  log("running PageSpeed desktop…");
  const psiDesktop = await call("POST", "seo/audit", { action: "pagespeed", strategy: "desktop" });
  const pd = psiDesktop.body?.pagespeed;
  log("desktop:", pd?.available ? `LCP=${pd.lab.lcpMs}ms CLS=${pd.lab.cls} TBT=${pd.lab.tbtMs}ms perf=${pd.lab.performanceScore}` : `UNAVAILABLE: ${pd?.reason}`);
  log("");

  // 2) GSC (official API — honest result when not configured)
  const gsc = await call("POST", "seo/audit", { action: "gsc-refresh" });
  log("gsc:", gsc.body?.gsc?.available ? `OK clicks28=${gsc.body.gsc.ranges?.last28?.clicks}` : `not available — ${String(gsc.body?.gsc?.reason || "").slice(0, 80)}`);
  log("");

  // 3) start full audit
  log("starting full audit (discover URLs)…");
  const started = await call("POST", "seo/audit", { action: "start", mode: "full", trigger: "admin" });
  if (!started.body?.success) throw new Error("start failed: " + JSON.stringify(started.body));
  const { runId, totalUrls, batchSize } = started.body;
  log(`run ${runId}: ${totalUrls} URLs discovered, batch=${batchSize}`);
  log("discovered sources:", JSON.stringify(started.body.discovered?.sources));
  log("");

  // 4) crawl batches (client-driven loop — same as the admin UI)
  let crawled = 0;
  let done = false;
  while (!done) {
    const batch = await call("POST", "seo/audit", { action: "crawl-batch", runId, batchSize });
    if (!batch.body?.success) throw new Error("crawl-batch failed: " + JSON.stringify(batch.body));
    crawled = batch.body.crawled;
    log(`  crawled ${crawled}/${totalUrls}`);
    done = batch.body.done;
  }

  // 5) finalize
  log("\nfinalizing (duplicates, sitemap validation, score, findings)…");
  const fin = await call("POST", "seo/audit", { action: "finalize", runId });
  if (!fin.body?.success) throw new Error("finalize failed: " + JSON.stringify(fin.body));
  log("score:", JSON.stringify(fin.body.score?.total), fin.body.score?.partial ? "(partial)" : "(full)");
  for (const b of fin.body.score?.breakdown || []) log(`  ${b.component}: ${b.earned}/${b.weight} — ${b.basis}`);
  log("counts:", JSON.stringify(fin.body.summary?.counts, null, 1));
  log("severity:", JSON.stringify(fin.body.summary?.severityCounts));
  log("");

  // 6) status read-back + findings sample
  const status = await call("GET", "seo/audit");
  log("status read-back: run", status.body?.run?.status, "pages stored:", status.body?.run?.pages?.length);
  log("open findings:", status.body?.findings?.length);
  for (const f of (status.body?.findings || []).slice(0, 14)) log(`  [${f.severity.toUpperCase()}] ${f.title} (${(f.urls || []).length} urls)`);
  log("");

  // 7) single page audit sample
  const page = await call("POST", "seo/audit", { action: "page-audit", url: "/product/playstation-plus-deluxe-1-month-global" });
  log("page-audit sample:", page.body?.page?.url, "score", page.body?.page?.score, "indexable", page.body?.page?.indexable, "reason:", page.body?.page?.indexReason);
  log("");

  // 8) duplicate check endpoint sanity (real duplicate in catalog?)
  const dupCheck = await call("POST", "seo/audit", {});
  log("unknown action rejected:", dupCheck.status, String(dupCheck.body?.error || "").slice(0, 60));

  // 9) export CSV sanity
  const exp = await call("POST", "seo/audit", { action: "export", format: "csv" });
  const csv = typeof exp.body === "string" ? exp.body : exp.body?.error;
  log("export csv rows:", typeof csv === "string" ? csv.trim().split("\n").length : "FAILED");

  log(`\nDONE in ${((Date.now() - t0) / 1000).toFixed(0)}s — run ${runId} stored in production DB`);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
