// seoProviders.ts — external SEO data providers, env-configured only.
//
//   GOOGLE_SEARCH_CONSOLE_PROPERTY       e.g. sc-domain:playbeat.digital
//   GOOGLE_SERVICE_ACCOUNT_EMAIL         service account (GSC owner)
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   PEM private key
//   PAGESPEED_API_KEY                    optional (API works keyless at low quota)
//
// Secrets NEVER leave the server: responses carry booleans/metrics only.
// All values returned are live API results — failures are reported as
// { available: false, reason } and never substituted with placeholder data.

import crypto from "crypto";
import { getDb } from "./mongo.js";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const SITE = "https://playbeat.digital";

export function gscEnv() {
  const property = process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || "";
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const key = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return { property, email, key, configured: Boolean(property && email && key) };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function gscAccessToken(email: string, key: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/webmasters",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3300,
      iat: now,
    })
  );
  const signature = b64url(crypto.createSign("RSA-SHA256").update(`${header}.${claim}`).sign(key));
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${signature}` }),
  });
  const tokenData: any = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.access_token) {
    throw new Error(tokenData?.error_description || tokenData?.error || `Google token exchange failed (${tokenRes.status})`);
  }
  return String(tokenData.access_token);
}

async function gscQuery(
  token: string,
  property: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, status: res.status, data: null, error: data?.error?.message || `GSC API ${res.status}` };
  return { ok: true, status: res.status, data };
}

function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface GscSnapshot {
  available: boolean;
  reason?: string;
  property?: string;
  ranges?: Record<string, { clicks: number; impressions: number; ctr: number; position: number | null }>;
  topPages?: Array<{ url: string; clicks: number; impressions: number; ctr: number; position: number }>;
  syncedAt: string;
}

export async function gscSnapshot(): Promise<GscSnapshot> {
  const env = gscEnv();
  const syncedAt = new Date().toISOString();
  if (!env.configured) {
    return { available: false, reason: "Search Console is not configured — set GOOGLE_SEARCH_CONSOLE_PROPERTY, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.", syncedAt };
  }
  try {
    const token = await gscAccessToken(env.email, env.key);
    const ranges: GscSnapshot["ranges"] = {};
    for (const [label, days] of Object.entries({ last7: 7, last28: 28, last90: 90 })) {
      const q = await gscQuery(token, env.property, { startDate: daysAgoIso(days), endDate: daysAgoIso(1), dimensions: [] });
      if (!q.ok) return { available: false, reason: q.error, property: env.property, syncedAt };
      const row = q.data?.rows?.[0];
      ranges![label] = {
        clicks: Math.round(row?.clicks || 0),
        impressions: Math.round(row?.impressions || 0),
        ctr: typeof row?.ctr === "number" ? Math.round(row.ctr * 1000) / 10 : 0,
        position: typeof row?.position === "number" ? Math.round(row.position * 10) / 10 : null,
      };
    }
    const top = await gscQuery(token, env.property, {
      startDate: daysAgoIso(28),
      endDate: daysAgoIso(1),
      dimensions: ["page"],
      rowLimit: 20,
      orderby: [{ key: "clicks", descending: true }],
    });
    const topPages = top.ok
      ? (top.data?.rows || []).map((r: any) => ({
          url: r.keys?.[0] || "",
          clicks: Math.round(r.clicks || 0),
          impressions: Math.round(r.impressions || 0),
          ctr: Math.round((r.ctr || 0) * 1000) / 10,
          position: Math.round((r.position || 0) * 10) / 10,
        }))
      : [];
    return { available: true, property: env.property, ranges, topPages, syncedAt };
  } catch (err: any) {
    return { available: false, reason: err?.message || "Search Console request failed", property: env.property, syncedAt };
  }
}

export interface GscInspection {
  available: boolean;
  reason?: string;
  result?: {
    verdict: string;
    coverageState: string | null;
    robotsTxtState: string | null;
    indexingState: string | null;
    lastCrawlTime: string | null;
    googleCanonical: string | null;
    userCanonical: string | null;
    sitemap: string | null;
    crawlingAs: string | null;
  };
}

/** Official URL Inspection API — only works for properties the SA owns. */
export async function gscInspectUrl(url: string): Promise<GscInspection> {
  const env = gscEnv();
  if (!env.configured) return { available: false, reason: "Search Console is not configured." };
  try {
    const token = await gscAccessToken(env.email, env.key);
    const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: env.property, languageCode: "en-US" }),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) return { available: false, reason: data?.error?.message || `URL Inspection API ${res.status}` };
    const r = data?.inspectionResult?.indexStatusResult;
    if (!r) return { available: false, reason: "No indexStatusResult in response" };
    return {
      available: true,
      result: {
        verdict: r.verdict || "UNKNOWN",
        coverageState: r.coverageState || null,
        robotsTxtState: r.robotsTxtState || null,
        indexingState: r.indexingState || null,
        lastCrawlTime: r.lastCrawlTime || null,
        googleCanonical: r.googleCanonical || null,
        userCanonical: r.userCanonical || null,
        sitemap: r.sitemap || null,
        crawlingAs: r.crawlingAsGoogleUserAgent || null,
      },
    };
  } catch (err: any) {
    return { available: false, reason: err?.message || "URL Inspection failed" };
  }
}

// ---------------------------------------------------------------------------
// Google PageSpeed Insights (Lighthouse lab + CrUX field data)
// ---------------------------------------------------------------------------
export interface PsiMetric {
  available: boolean;
  reason?: string;
  strategy: "mobile" | "desktop";
  url: string;
  measuredAt: string;
  lab: {
    lcpMs: number | null;
    cls: number | null;
    tbtMs: number | null;
    fcpMs: number | null;
    speedIndexMs: number | null;
    ttfbMs: number | null;
    performanceScore: number | null;
  };
  field: {
    available: boolean;
    lcpMs: number | null;
    inpMs: number | null;
    cls: number | null;
    fcpMs: number | null;
    ttfbMs: number | null;
  };
  diagnostics: string[];
  detail?: {
    lcpPhases?: Array<{ id: string; label: string; ms: number }>;
    lcpElement?: {
      url: string | null;
      selector: string | null;
      nodeLabel: string | null;
      snippet: string | null;
      /* bytes of the LCP resource when the element is an image/background-image */
      resourceBytes?: number | null;
    } | null;
    unusedJs?: Array<{ url: string; totalBytes: number; wastedBytes: number }>;
    clsElements?: Array<{ nodeLabel: string | null; score: number | null; url: string | null; extra: string | null }>;
    renderBlocking?: Array<{ url: string; totalBytes: number; wastedMs: number }>;
    bootup?: Array<{ url: string; totalMs: number; scriptingMs: number }>;
    mainThread?: Array<{ group: string; ms: number }>;
    thirdParty?: Array<{ entity: string; blockingMs: number; mainThreadMs: number; transferBytes: number }>;
    heaviestResources?: Array<{ url: string; totalBytes: number }>;
    networkRequests?: number | null;
    totalByteWeight?: number | null;
  };
}

function ms(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function runPageSpeed(strategy: "mobile" | "desktop" = "mobile", target = SITE): Promise<PsiMetric> {
  const key = process.env.PAGESPEED_API_KEY || "";
  const url = `${PSI_ENDPOINT}?url=${encodeURIComponent(target)}&strategy=${strategy}&category=performance${key ? `&key=${key}` : ""}`;
  const out: PsiMetric = {
    available: false,
    strategy,
    url: target,
    measuredAt: new Date().toISOString(),
    lab: { lcpMs: null, cls: null, tbtMs: null, fcpMs: null, speedIndexMs: null, ttfbMs: null, performanceScore: null },
    field: { available: false, lcpMs: null, inpMs: null, cls: null, fcpMs: null, ttfbMs: null },
    diagnostics: [],
  };
  try {
    // Server-to-server PSI calls carry no browser Referer, and API keys saved
    // with an "HTTP referrers" application restriction reject referer-less
    // requests ("Requests from referer <empty> are blocked"). This key exists
    // for THIS site's server-side audits, so declare the site as the referer —
    // matching the restriction the owner configured for playbeat.digital.
    const res = await fetch(url, {
      signal: AbortSignal.timeout(55000),
      headers: { Referer: `${SITE}/` },
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      out.reason = data?.error?.message || `PageSpeed API ${res.status}`;
      return out;
    }
    const lr = data?.lighthouseResult;
    if (lr) {
      const a = lr.audits || {};
      out.lab = {
        lcpMs: ms(a["largest-contentful-paint"]?.numericValue),
        cls: a["cumulative-layout-shift"]?.numericValue != null ? Math.round(a["cumulative-layout-shift"].numericValue * 1000) / 1000 : null,
        tbtMs: ms(a["total-blocking-time"]?.numericValue),
        fcpMs: ms(a["first-contentful-paint"]?.numericValue),
        speedIndexMs: ms(a["speed-index"]?.numericValue),
        ttfbMs: ms(a["server-response-time"]?.numericValue),
        performanceScore: lr.categories?.performance?.score != null ? Math.round(lr.categories.performance.score * 100) : null,
      };
      for (const auditName of ["render-blocking-resources", "unused-javascript", "uses-responsive-images", "uses-optimized-images", "font-display", "largest-contentful-paint-element", "lcp-lazy-loaded", "prioritize-lcp-image", "mainthread-work-breakdown", "bootup-time", "third-party-summary", "layout-shifts", "layout-shift-elements"]) {
        const audit = a[auditName];
        if (audit && audit.score !== null && audit.score !== undefined && audit.score < 0.9 && (audit.numericValue || 0) > 0) {
          out.diagnostics.push(`${audit.title} — ${audit.displayValue || `${Math.round(audit.numericValue || 0)}`}`);
        }
      }
      // ---- deep per-audit artifacts (kept for before/after attribution) ------
      // Everything below is REAL measured Lighthouse output — no synthesis.
      try {
        const detail: PsiMetric["detail"] = {};
        const lcpPhasesAudit = a["lcp-phases"];
        if (lcpPhasesAudit?.details?.items) {
          detail.lcpPhases = lcpPhasesAudit.details.items.map((it: any) => ({
            id: it.phase || it.id || "phase",
            label: it.phaseTitle || it.title || it.phase || "phase",
            ms: Math.round(Number(it.numericValue) || 0),
          }));
        }
        const lcpElAudit = a["largest-contentful-paint-element"];
        const lcpItem = lcpElAudit?.details?.items?.[0]?.items?.[0] || lcpElAudit?.details?.items?.[0];
        if (lcpItem?.node) {
          detail.lcpElement = {
            url: lcpItem.node.url || lcpItem.url || null,
            selector: lcpItem.node.selector || null,
            nodeLabel: lcpItem.node.nodeLabel || null,
            snippet: (lcpItem.node.snippet || "").slice(0, 300),
            resourceBytes: Number(lcpItem.node.totalBytes ?? lcpItem.totalBytes) || null,
          };
        }
        const ujAudit = a["unused-javascript"];
        if (ujAudit?.details?.items) {
          detail.unusedJs = ujAudit.details.items
            .map((it: any) => ({ url: it.url, totalBytes: Number(it.totalBytes) || 0, wastedBytes: Number(it.wastedBytes) || 0 }))
            .sort((x: any, y: any) => y.wastedBytes - x.wastedBytes)
            .slice(0, 14);
        }
        const clsAudit = a["layout-shift-elements"];
        if (clsAudit?.details?.items) {
          detail.clsElements = clsAudit.details.items.slice(0, 8).map((it: any) => ({
            nodeLabel: it.node?.nodeLabel || null,
            score: Number(it.score) || null,
            url: it.node?.url || it.url || null,
            extra: it.extra?.rootCause ? String(it.extra.rootCause).slice(0, 200) : (it.subItems?.items?.[0]?.extra?.rootCause ? String(it.subItems.items[0].extra.rootCause).slice(0, 200) : null),
          }));
        }
        const rbAudit = a["render-blocking-resources"];
        if (rbAudit?.details?.items) {
          detail.renderBlocking = rbAudit.details.items.slice(0, 12).map((it: any) => ({
            url: it.url, totalBytes: Number(it.totalBytes) || 0, wastedMs: Math.round(Number(it.wastedMs) || 0),
          }));
        }
        const buAudit = a["bootup-time"];
        if (buAudit?.details?.items) {
          detail.bootup = buAudit.details.items.slice(0, 10).map((it: any) => ({
            url: it.url, totalMs: Math.round(Number(it.total) || 0), scriptingMs: Math.round(Number(it.scripting) || 0),
          }));
        }
        const mtAudit = a["mainthread-work-breakdown"];
        if (mtAudit?.details?.items) {
          detail.mainThread = mtAudit.details.items.map((it: any) => ({ group: it.groupLabel || it.group, ms: Math.round(Number(it.duration) || 0) }));
        }
        const tpAudit = a["third-party-summary"];
        if (tpAudit?.details?.items) {
          detail.thirdParty = tpAudit.details.items
            .map((it: any) => ({
              entity: it.entity?.text || it.entity || "unknown",
              blockingMs: Math.round(Number(it.blockingTime) || 0),
              mainThreadMs: Math.round(Number(it.mainThreadTime) || 0),
              transferBytes: Number(it.transferSize) || 0,
            }))
            .filter((t: any) => t.blockingMs > 0 || t.mainThreadMs > 0)
            .sort((x: any, y: any) => y.mainThreadMs - x.mainThreadMs)
            .slice(0, 10);
        }
        const tbwAudit = a["total-byte-weight"];
        if (tbwAudit?.details?.items) {
          detail.heaviestResources = tbwAudit.details.items.slice(0, 10).map((it: any) => ({ url: it.url, totalBytes: Number(it.totalBytes) || 0 }));
          detail.totalByteWeight = Math.round(Number(tbwAudit.numericValue) || 0) || null;
        }
        const nrAudit = a["network-requests"];
        if (nrAudit?.details?.items) detail.networkRequests = nrAudit.details.items.length;
        out.detail = detail;
      } catch { /* detail capture is best-effort; lab metrics already stored */ }
    }
    const le = data?.loadingExperience;
    if (le && le.overall_category && le.metrics) {
      out.field.available = true;
      const m = le.metrics;
      out.field = {
        available: true,
        lcpMs: m.LARGEST_CONTENTFUL_PAINT_MS ? ms(m.LARGEST_CONTENTFUL_PAINT_MS.percentile) : null,
        inpMs: m.INTERACTION_TO_NEXT_PAINT ? ms(m.INTERACTION_TO_NEXT_PAINT.percentile) : null,
        cls: m.CUMULATIVE_LAYOUT_SHIFT_SCORE ? Math.round(Number(m.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile)) / 100 : null,
        fcpMs: m.FIRST_CONTENTFUL_PAINT_MS ? ms(m.FIRST_CONTENTFUL_PAINT_MS.percentile) : null,
        ttfbMs: m.EXPERIMENTAL_TTFB_MS ? ms(m.EXPERIMENTAL_TTFB_MS.percentile) : null,
      };
    }
    out.available = true;
    return out;
  } catch (err: any) {
    out.reason = err?.name === "TimeoutError" || err?.name === "AbortError" ? "PageSpeed request timed out after 55s" : err?.message || "PageSpeed request failed";
    return out;
  }
}

export async function storePsiResult(result: PsiMetric): Promise<void> {
  const db = await getDb();
  await db.collection("seoPerformanceHistory").insertOne({
    source: "pagespeed",
    strategy: result.strategy,
    url: result.url,
    measuredAt: new Date(result.measuredAt),
    metrics: {
      lcp: result.lab.lcpMs,
      cls: result.lab.cls,
      inp: result.field.inpMs,
      fcp: result.lab.fcpMs,
      tbt: result.lab.tbtMs,
      speedIndex: result.lab.speedIndexMs,
      ttfb: result.lab.ttfbMs,
      performanceScore: result.lab.performanceScore,
    },
    fieldData: result.field.available
      ? { lcp: result.field.lcpMs, inp: result.field.inpMs, cls: result.field.cls, fcp: result.field.fcpMs, ttfb: result.field.ttfbMs }
      : null,
    diagnostics: result.diagnostics,
    detail: result.detail || null,
    available: result.available,
    reason: result.reason || null,
  } as any);
}

export async function storeGscSnapshot(snap: GscSnapshot): Promise<void> {
  if (!snap.available) return;
  const db = await getDb();
  await db.collection("seoPerformanceHistory").insertOne({
    source: "gsc",
    measuredAt: new Date(snap.syncedAt),
    property: snap.property,
    ranges: snap.ranges,
    topPages: snap.topPages,
  } as any);
  await db.collection("seoSettings").updateOne(
    { key: "gsc" },
    { $set: { key: "gsc", lastSyncAt: new Date(snap.syncedAt), lastSyncAvailable: true } },
    { upsert: true }
  );
}
