#!/usr/bin/env node
/**
 * region_e2e.cjs — Region field upgrade E2E verification against PRODUCTION.
 * Covers: custom-region create (New Zealand), MongoDB persistence, storefront
 * visibility, editor round-trip (draft → refresh → publish → reopen), alias
 * preservation (UK/UAE stored as-is), legacy value preservation, merchant
 * feed region, and validation guards. Self-cleaning (test product deleted).
 */
const https = require("https");
const { MongoClient, ObjectId } = require("mongodb");
const { readFileSync } = require("fs");
const path = require("path");

const uri = readFileSync(path.join(__dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/)[1];
const EMAIL = "admin@playbeat.digital";
const PASSWORD = "playbeat1122";
let PASS = 0, FAIL = 0;
const ok = (cond, label, extra = "") => {
  if (cond) { PASS++; console.log(`  PASS  ${label}`); }
  else { FAIL++; console.log(`  FAIL  ${label} ${extra}`); }
};

function req(url, { method = "GET", headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: data ? { ...headers, "content-type": "application/json", "content-length": Buffer.byteLength(data) } : headers,
      timeout: 60000,
    }, (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => resolve({ status: res.statusCode, body: b })); });
    r.on("error", reject); r.on("timeout", () => r.destroy(new Error("timeout")));
    if (data) r.write(data); r.end();
  });
}

(async () => {
  // ---- login ----
  const login = JSON.parse((await req("https://playbeat.digital/api/auth/admin/login", { method: "POST", body: { email: EMAIL, password: PASSWORD } })).body);
  const H = { authorization: `Bearer ${login.token}` };

  // ---- 1) create draft test product with CUSTOM region via the editor API ----
  console.log("\n== 1. Custom region create (New Zealand) — draft via editor API ==");
  const slug = "pb-region-nz-verification";
  const create = await req("https://playbeat.digital/api/admin/products", {
    method: "POST", headers: H,
    body: {
      name: "Region Verification NZ (temporary)", sku: "PB-REGION-NZ-TEST", slug,
      price: 9.99, category: "Gift Cards", digital: true, active: false, cmsStatus: "draft",
      region: "New Zealand",
      description: "<p>Temporary verification product for the region field upgrade.</p>",
      seo: { index: false },
    },
  });
  let cd = {};
  try { cd = JSON.parse(create.body); } catch {}
  const prodId = cd?.product?._id || cd?._id || cd?.id;
  ok(create.status === 200 || create.status === 201, `create draft product (status ${create.status})`, create.body.slice(0, 120));
  ok(Boolean(prodId), "create returns product id");

  // ---- 2) refresh (re-fetch via editor deep-link API) — value persists ----
  console.log("\n== 2. Draft refresh — region persists after reopen ==");
  const refetch = JSON.parse((await req(`https://playbeat.digital/api/products/${slug}`)).body);
  const p1 = refetch?.product || refetch;
  ok(p1?.region === "New Zealand", `region stored + served verbatim (${JSON.stringify(p1?.region)})`);

  // ---- 3) DB-level persistence (MongoDB is the source of truth) ----
  const mc = new MongoClient(uri); await mc.connect();
  const dbDoc = await mc.db("playbeat").collection("products").findOne({ _id: new ObjectId(prodId) });
  ok(dbDoc?.region === "New Zealand", "MongoDB doc region === 'New Zealand'");

  // ---- 4) whitespace/case normalization at save time (server-side guard) ----
  console.log("\n== 3. Server-side normalization guard ==");
  await req(`https://playbeat.digital/api/admin/products/${prodId}`, {
    method: "PUT", headers: H, body: { region: "  new   zealand  " },
  });
  const afterWs = await mc.db("playbeat").collection("products").findOne({ _id: new ObjectId(prodId) });
  ok(afterWs.region === "new zealand", `whitespace collapsed ("${afterWs.region}") — case preserved by design (client combobox case-folds on selection)`);
  // blank → Global default
  await req(`https://playbeat.digital/api/admin/products/${prodId}`, {
    method: "PUT", headers: H, body: { region: "   " },
  });
  const afterBlank = await mc.db("playbeat").collection("products").findOne({ _id: new ObjectId(prodId) });
  ok(afterBlank.region === "Global", `blank/whitespace rejected → Global ("${afterBlank.region}")`);

  // ---- 5) publish flow: draft → publish (active=true) — region rides along ----
  console.log("\n== 4. Publish — region rides along, storefront + feed ==");
  const pub = await req(`https://playbeat.digital/api/admin/products/${prodId}`, {
    method: "PUT", headers: H, body: { active: true, cmsStatus: "published", region: "New Zealand", price: 9.99 },
  });
  ok(pub.status === 200, `publish accepted (status ${pub.status})`, pub.body.slice(0, 120));
  await new Promise((r) => setTimeout(r, 1500));
  const list = JSON.parse((await req("https://playbeat.digital/api/products?limit=300")).body);
  const items = list?.products || list || [];
  const inStore = items.find((p) => p.slug === slug);
  ok(Boolean(inStore), "published product appears in storefront catalog API");
  ok(inStore?.region === "New Zealand", `storefront catalog carries region (${JSON.stringify(inStore?.region)})`);
  // noindex product must stay OUT of the merchant feed
  const feed = (await req("https://playbeat.digital/api/products?pbFeed=google")).body;
  ok(!feed.includes("PB-REGION-NZ-TEST"), "noindex test product excluded from merchant feed");
  // detail API + prerender serve it with the region
  const detail = JSON.parse((await req(`https://playbeat.digital/api/products/${slug}`)).body);
  const pd = detail?.product || detail;
  ok(pd?.region === "New Zealand", "detail API region verbatim (what QuickView renders)");

  // ---- 6) editor round-trip: reopen in editor → save unchanged → value kept ----
  // (the editor deep-links read via the PUBLIC /api/products/:ref endpoint and
  //  save through the admin PUT — replicate exactly that flow)
  console.log("\n== 5. Editor round-trip (reopen → save → reopen) ==");
  const rt1 = JSON.parse((await req(`https://playbeat.digital/api/products/${prodId}`)).body);
  const e1 = rt1?.product || rt1;
  ok(e1?.region === "New Zealand", `editor reopen shows stored region (${JSON.stringify(e1?.region)})`);
  const saveBack = await req(`https://playbeat.digital/api/admin/products/${prodId}`, {
    method: "PUT", headers: H,
    body: { name: e1.name, sku: e1.sku, slug: e1.slug, price: e1.price, category: e1.category, region: e1.region, active: true, cmsStatus: "published", description: e1.description },
  });
  ok(saveBack.status === 200, `editor save accepted (${saveBack.status})`);
  const rt2 = JSON.parse((await req(`https://playbeat.digital/api/products/${prodId}`)).body);
  const e2 = rt2?.product || rt2;
  ok(e2?.region === "New Zealand", `region kept after reopen (${JSON.stringify(e2?.region)})`);

  // ---- 7) legacy / alias values are never auto-migrated ----
  console.log("\n== 6. Legacy + alias preservation ==");
  const distBefore = await mc.db("playbeat").collection("products").aggregate([{ $group: { _id: "$region", n: { $sum: 1 } } }]).toArray();
  const map = Object.fromEntries(distBefore.map((d) => [d._id, d.n]));
  for (const [region, expected] of [["UK", 3], ["UAE", 1], ["USA", 4], ["Europe", 8], ["Asia", 1], ["Pakistan", 7], ["Global", 158]]) {
    ok(map[region] === expected, `legacy/alias value "${region}" count ${map[region]} === ${expected} (no auto-migration)`);
  }
  const uk = await mc.db("playbeat").collection("products").findOne({ sku: "PSN-UK-GC" });
  const uae = await mc.db("playbeat").collection("products").findOne({ sku: "PSN-AE-GC" });
  ok(uk.region === "UK", `PSN-UK-GC stored alias "UK" preserved`);
  ok(uae.region === "UAE", `PSN-AE-GC stored alias "UAE" preserved`);
  // alias round-trip through the editor API must NOT rename them
  for (const p of [uk, uae]) {
    await req(`https://playbeat.digital/api/admin/products/${p._id}`, {
      method: "PUT", headers: H,
      body: { name: p.name, sku: p.sku, slug: p.slug, price: p.price, category: p.category, region: p.region, active: p.active, cmsStatus: p.cmsStatus, description: p.description },
    });
    const back = await mc.db("playbeat").collection("products").findOne({ _id: new ObjectId(p._id) });
    ok(back.region === p.region, `editor save keeps "${p.region}" verbatim (${p.sku})`);
  }

  // ---- 8) merchant feed carries saved region for a real country product ----
  console.log("\n== 7. Merchant feed region ==");
  const feed2 = (await req("https://playbeat.digital/api/products?pbFeed=google")).body;
  const frBlock = feed2.split("<item>").find((i) => i.includes("playstation-network-gift-card-france"));
  ok(Boolean(frBlock), "France PSN product present in merchant feed");
  ok(Boolean(frBlock && frBlock.includes("<g:attribute_name>Region</g:attribute_name>")), "feed item has Region product_detail");
  ok(Boolean(frBlock && frBlock.includes("<g:attribute_value>France</g:attribute_value>")), `feed Region value = "France" (never Global)`);

  // ---- 9) 10-country persistence summary (values stored in MongoDB now) ----
  console.log("\n== 8. Ten-country values stored in MongoDB ==");
  const cc = { "PSN-UK-GC": "UK", "PSN-DE-GC": "Germany", "PSN-FR-GC": "France", "PSN-CA-GC": "Canada", "PSN-AU-GC": "Australia", "PSN-JP-GC": "Japan", "PSN-SG-GC": "Singapore", "PSN-MY-GC": "Malaysia", "PSN-SA-GC": "Saudi Arabia", "PSN-AE-GC": "UAE" };
  for (const [sku, expect] of Object.entries(cc)) {
    const d = await mc.db("playbeat").collection("products").findOne({ sku });
    ok(d?.region === expect, `${sku} region persisted as "${expect}" (actual ${JSON.stringify(d?.region)})`);
  }

  // ---- 10) cleanup: delete the test product ----
  console.log("\n== 9. Cleanup ==");
  const del = await req(`https://playbeat.digital/api/admin/products/${prodId}`, { method: "DELETE", headers: H });
  ok(del.status === 200 || del.status === 204, `test product deleted (${del.status})`);
  await new Promise((r) => setTimeout(r, 1500));
  const gone = await mc.db("playbeat").collection("products").findOne({ _id: new ObjectId(prodId) });
  ok(!gone, "MongoDB no longer contains the test product");
  const list2 = JSON.parse((await req("https://playbeat.digital/api/products?limit=300")).body);
  const items2 = list2?.products || list2 || [];
  ok(!items2.some((p) => p.slug === slug), "storefront catalog clean after delete");
  await mc.close();

  console.log(`\n=== REGION E2E RESULT: ${PASS} PASS / ${FAIL} FAIL ===`);
  process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
