// test_prerender_local.ts — runs the REAL prerender renderer against the REAL
// production MongoDB to verify raw-HTML output before deploy. No mocks of the
// renderer itself — only the Vercel req/res objects are stubbed.

import { readFileSync } from "fs";
import path from "path";

process.env.MONGODB_DB_NAME = "playbeat";
const uriMatch = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/);
if (!uriMatch) throw new Error("mongo uri helper missing");
process.env.MONGODB_URI = process.env.MONGODB_URI || uriMatch[1];

const { handlePbRender } = await import("../api/_lib/prerender.ts");

function makeReq(pbPath: string) {
  const u = `https://playbeat.digital/api/products?pbRender=1&pbPath=${encodeURIComponent(pbPath)}`;
  const url = new URL(u);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (query[k] = v));
  return { method: "GET", url: u, query, headers: {} } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; return this; },
    send(payload: any) { this.body = payload; return this; },
    end(payload?: any) { this.body = payload ?? this.body ?? ""; return this; },
  };
  return res;
}

async function render(pbPath: string) {
  const res = makeRes();
  await handlePbRender(makeReq(pbPath), res);
  return { status: res.statusCode, headers: res.headers, html: typeof res.body === "string" ? res.body : String(res.body ?? "") };
}

function extract(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1] || m[0] : null;
}

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? "  | " + detail : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? "  | " + detail : ""}`); }
}

async function main() {
  // ---------- 1) Variant product (PS Plus Deluxe: Shared 4289 / Private 4979) ----------
  console.log("\n== /product/playstation-plus-deluxe-1-month-global ==");
  const p1 = await render("/product/playstation-plus-deluxe-1-month-global");
  const t1 = extract(p1.html, /<title>([^<]*)<\/title>/);
  const c1 = extract(p1.html, /rel="canonical" href="([^"]*)"/);
  const d1 = extract(p1.html, /<meta name="description" content="([^"]*)"/);
  check("status 200", p1.status === 200, `status=${p1.status}`);
  check("unique title (not homepage)", !!t1 && !t1.includes("Premium Digital Marketplace &amp; Smart Projectors</title>") && t1.includes("Deluxe"), t1 || "none");
  check("canonical = own product URL", c1 === "https://playbeat.digital/product/playstation-plus-deluxe-1-month-global", c1 || "none");
  check("meta description present+unique", !!d1 && (d1.length > 50), `${d1?.length} chars`);
  check("H1 exists in raw HTML", /<h1[^>]*>\s*PlayStation Plus Deluxe/i.test(p1.html), extract(p1.html, /<h1[^>]*>([^<]*)</) || "none");
  check("Product JSON-LD present", p1.html.includes('"@type":"Product"'));
  check("BreadcrumbList JSON-LD", p1.html.includes('"@type":"BreadcrumbList"'));
  check("AggregateOffer with variant prices", /"@type":"AggregateOffer"/.test(p1.html) && p1.html.includes('"lowPrice":4289') && p1.html.includes('"highPrice":4979') && p1.html.includes('"offerCount":2') && p1.html.includes('"priceCurrency":"PKR"'));
  check("og:title unique", /property="og:title" content="[^"]*Deluxe/.test(p1.html));
  check("og:type product", /property="og:type" content="product"/.test(p1.html));
  check("twitter:card present", /name="twitter:card" content="summary_large_image"/.test(p1.html));
  check("robots index,follow", /name="robots" content="index, follow/.test(p1.html));
  check("content inside #root", /<div id="root"><div [^>]*>/i.test(p1.html));

  // ---------- 2) Category page ----------
  console.log("\n== /gift-cards ==");
  const p2 = await render("/gift-cards");
  const t2 = extract(p2.html, /<title>([^<]*)<\/title>/);
  check("status 200", p2.status === 200);
  check("unique category title", !!t2 && t2.startsWith("Gift Cards — Xbox, PlayStation, Steam, Razer Gold, Apple | PlayBeat Digital"), t2 || "none");
  check("canonical self", extract(p2.html, /rel="canonical" href="([^"]*)"/) === "https://playbeat.digital/gift-cards");
  check("H1 = Gift Cards", /<h1[^>]*>\s*Gift Cards\s*<\/h1>/i.test(p2.html));
  check("real product links in raw HTML", (p2.html.match(/href="\/product\//g) || []).length >= 5, `${(p2.html.match(/href="\/product\//g) || []).length} links`);
  check("CollectionPage JSON-LD", p2.html.includes('"@type":"CollectionPage"'));

  // ---------- 3) Static page ----------
  console.log("\n== /about ==");
  const p3 = await render("/about");
  check("unique about title", (extract(p3.html, /<title>([^<]*)<\/title>/) || "").startsWith("About PlayBeat Digital"));
  check("canonical self", extract(p3.html, /rel="canonical" href="([^"]*)"/) === "https://playbeat.digital/about");
  check("H1 about", /<h1[^>]*>\s*About PlayBeat Digital/i.test(p3.html));

  // ---------- 4) Services hub ----------
  console.log("\n== /services ==");
  const p4 = await render("/services");
  check("services title", (extract(p4.html, /<title>([^<]*)<\/title>/) || "").includes("Websites, apps and SaaS"));
  check("canonical self", extract(p4.html, /rel="canonical" href="([^"]*)"/) === "https://playbeat.digital/services");
  check("H1 business solutions", /<h1[^>]*>\s*Business Solutions/i.test(p4.html));

  // ---------- 5) 404 ----------
  console.log("\n== /product/this-product-does-not-exist-xyz ==");
  const p5 = await render("/product/this-product-does-not-exist-xyz");
  check("status 404", p5.status === 404, `status=${p5.status}`);
  check("noindex", /name="robots" content="noindex, nofollow, noarchive"/.test(p5.html));

  // ---------- 6) Draft product noindex + no fake price ----------
  console.log("\n== draft product (PSN UK — active:false) ==");
  const p6 = await render("/product/playstation-network-gift-card-uk-psn-digital-code");
  check("status 200 (SPA unchanged behavior)", p6.status === 200);
  check("robots noindex for draft", /name="robots" content="noindex, nofollow, noarchive"/.test(p6.html), extract(p6.html, /name="robots" content="([^"]*)"/) || "none");
  check("NO offers node (no fake price)", !/"offers"/.test(p6.html.replace(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/g, (m) => m)) || !/"@type":"(Offer|AggregateOffer)"/.test(p6.html));

  console.log(`\n===== RESULT: ${pass} PASS / ${fail} FAIL =====`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("HARNESS ERROR:", e);
  process.exit(1);
});
