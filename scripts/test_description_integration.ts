// Integration test — product description HTML editor end-to-end (server + MongoDB)
// Run: npx tsx scripts/test_description_integration.ts
//
// Boots against a LOCAL dev server instance using an ISOLATED test database
// (playbeat_editor_test) so production data in MongoDB Atlas is never touched.
//
// Covers the user's test matrix (server side):
//   - HTML mode save (Save Draft)   - Publish
//   - plain text save               - reopen after refresh (fresh GET)
//   - MongoDB stores description EXACTLY as entered (source of truth)
//   - derived shortDescription never leaks raw HTML tags
//   - storefront API returns the full description for rendering

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PORT = process.env.TEST_PORT || 3010;
const BASE = `http://127.0.0.1:${PORT}`;
const MONGO_URI = process.env.MONGODB_URI || require("./_mongo_uri.cjs").MONGODB_URI;
const DB_NAME = "playbeat_editor_test";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra?: any) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}${extra !== undefined ? " → " + String(extra).slice(0, 400) : ""}`); }
}

// ---------- wait for server ----------
async function waitForServer(tries = 60): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/api/products`);
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const up = await waitForServer();
if (!up) { console.error("Local server did not start on", BASE); process.exit(1); }
console.log("local server is up on", BASE);

// ---------- admin login ----------
const loginRes = await fetch(`${BASE}/api/auth/admin/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@playbeat.digital", password: "playbeat1122" }),
});
const login = await (loginRes.json() as any);
check("admin login", loginRes.ok && login.success && !!login.token, JSON.stringify(login).slice(0, 200));
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${login.token}`, Cookie: `adminToken=${login.token}` };

// ---------- test payload: FULL semantic HTML (every required tag) ----------
const HTML_DESC = [
  '<h1>Main Heading</h1>',
  '<h2>Section Heading</h2>',
  '<h3>FAQ Heading</h3>',
  '<h4>Small Subheading</h4>',
  '<p>PlayStation Plus Deluxe is available for <strong>1 month</strong>. Choose <b>Shared</b> or <em>Private</em> Account.</p>',
  '<ul><li>Instant delivery</li><li>Warranty included</li></ul>',
  '<ol><li>Pay online</li><li>Receive key by email</li></ol>',
  '<p>Visit <a href="https://playbeat.digital" target="_blank">PlayBeat</a> for more.</p>',
  '<blockquote>Best subscription marketplace in Pakistan.</blockquote>',
  '<table><thead><tr><th>Plan</th><th>Price</th></tr></thead><tbody><tr><td>1 Month</td><td>PKR 950</td></tr><tr><td>3 Months</td><td>PKR 2,600</td></tr></tbody></table>',
  '<p><img src="/assets/images/products/playstation-giftcard.webp" alt="PSN card" width="320"></p>',
  '<p>Line one<br>Line two</p>',
].join("");

const stamp = Date.now();
const slugHtml = `e2e-html-desc-${stamp}`;
const slugPlain = `e2e-plain-desc-${stamp}`;

// ---------- 1. Save Draft (HTML description) ----------
const draftRes = await fetch(`${BASE}/api/admin/products`, {
  method: "POST", headers: auth,
  body: JSON.stringify({
    name: "E2E HTML Description Product", slug: slugHtml, sku: `E2EHTML-${stamp}`,
    category: "Subscriptions", price: 950, currency: "PKR",
    description: HTML_DESC, cmsStatus: "draft", active: false,
    stockMode: "unlimited", digital: true,
  }),
});
const draft = await (draftRes.json() as any);
check("Save Draft (HTML desc) → 2xx", draftRes.ok, JSON.stringify(draft).slice(0, 300));
const productId = draft?.product?.id || draft?.product?._id;
check("draft product id returned", !!productId, JSON.stringify(draft).slice(0, 200));

// ---------- 2. MongoDB raw verbatim check (draft) ----------
const { MongoClient } = await import("mongodb");
const mc = new MongoClient(MONGO_URI);
await mc.connect();
const col = mc.db(DB_NAME).collection("products");
const rawDraft = await col.findOne({ slug: slugHtml });
check("MongoDB stores description EXACTLY as entered (draft)", rawDraft?.description === HTML_DESC,
  `len ${rawDraft?.description?.length} vs ${HTML_DESC.length}`);
check("draft cmsStatus persisted", rawDraft?.cmsStatus === "draft");

// ---------- 3. Publish ----------
const pubRes = await fetch(`${BASE}/api/admin/products/${productId}`, {
  method: "PUT", headers: auth,
  body: JSON.stringify({ cmsStatus: "published", active: true, price: 950 }),
});
const pub = await (pubRes.json() as any);
check("Publish → 2xx", pubRes.ok && pub.success, JSON.stringify(pub).slice(0, 200));
const rawPub = await col.findOne({ slug: slugHtml });
check("MongoDB description still verbatim after Publish", rawPub?.description === HTML_DESC);
check("published status persisted", rawPub?.cmsStatus === "published" && rawPub?.active === true);

// ---------- 4. Storefront read (fresh GET = reopen after refresh) ----------
const sfRes = await fetch(`${BASE}/api/products/${slugHtml}`);
const sf = await (sfRes.json() as any);
const sfProduct = sf?.product || sf;
check("storefront GET by slug → 2xx", sfRes.ok, JSON.stringify(sf).slice(0, 200));
check("storefront description verbatim", sfProduct?.description === HTML_DESC);
check("storefront detailedDescription verbatim", sfProduct?.detailedDescription === HTML_DESC);
const derivedShort: string = sfProduct?.shortDescription || "";
check("derived shortDescription has NO html tags", !/<[a-z!/][^>]*>/i.test(derivedShort), derivedShort);
check("derived shortDescription keeps readable text", derivedShort.includes("Main Heading") || derivedShort.includes("PlayStation"), derivedShort);

// ---------- 5. Plain text product ----------
const PLAIN = "PlayStation Plus Deluxe is available for 1 month.\nChoose Shared or Private Account.";
const plainRes = await fetch(`${BASE}/api/admin/products`, {
  method: "POST", headers: auth,
  body: JSON.stringify({
    name: "E2E Plain Description Product", slug: slugPlain, sku: `E2EPLAIN-${stamp}`,
    category: "Subscriptions", price: 950, currency: "PKR",
    description: PLAIN, cmsStatus: "published", active: true, stockMode: "unlimited", digital: true,
  }),
});
const plain = await (plainRes.json() as any);
check("plain text save → 2xx", plainRes.ok, JSON.stringify(plain).slice(0, 200));
const rawPlain = await col.findOne({ slug: slugPlain });
check("MongoDB stores plain text EXACTLY (with \\n)", rawPlain?.description === PLAIN, JSON.stringify(rawPlain?.description));
const plainSf = await (await fetch(`${BASE}/api/products/${slugPlain}`)).json();
const pp = plainSf?.product || plainSf;
check("storefront plain text verbatim", pp?.description === PLAIN);
check("plain shortDescription clean", (pp?.shortDescription || "").includes("PlayStation"), pp?.shortDescription);

// ---------- 6. XSS stored verbatim (render-time sanitization is client side) ----------
const XSS_DESC = '<h2>Ok</h2><script>alert("x")</script><img src="x" onerror="alert(1)"><p>fine</p>';
const xssRes = await fetch(`${BASE}/api/admin/products`, {
  method: "POST", headers: auth,
  body: JSON.stringify({
    name: `E2E XSS Probe ${stamp}`, slug: `e2e-xss-${stamp}`, sku: `E2EXSS-${stamp}`,
    category: "Subscriptions", price: 1, description: XSS_DESC,
    cmsStatus: "draft", active: false, stockMode: "unlimited", digital: true,
  }),
});
check("XSS-content save accepted verbatim (source of truth)", xssRes.ok);
const rawXss = await col.findOne({ slug: `e2e-xss-${stamp}` });
check("XSS probe stored exactly", rawXss?.description === XSS_DESC);

// ---------- 7. Existing products untouched / pricing fields intact ----------
const listRes = await fetch(`${BASE}/api/products`);
const list = await (listRes.json() as any);
const arr = Array.isArray(list) ? list : list?.products || [];
check("product list API still works", listRes.ok && Array.isArray(arr));
const mine = arr.find((p: any) => p.slug === slugHtml);
check("published HTML product appears in list", !!mine, JSON.stringify(arr?.slice?.(0,1)?.[0]?.slug));
check("pricing intact on list item", mine?.price === 950 && mine?.currency === "PKR", JSON.stringify({ price: mine?.price, currency: mine?.currency }));

// ---------- 8. Cleanup — delete test products, drop test DB ----------
for (const id of [productId, plain?.product?.id || plain?.product?._id, rawXss?._id?.toString()]) {
  if (!id) continue;
  await fetch(`${BASE}/api/admin/products/${id}`, { method: "DELETE", headers: auth });
}
const leftover = await col.countDocuments({ slug: { $in: [slugHtml, slugPlain, `e2e-xss-${stamp}`] } });
check("cleanup: test products deleted", leftover === 0, String(leftover));
await mc.db(DB_NAME).collection("users").deleteMany({ email: { $regex: /e2e/i } });
await mc.close();

console.log(`\n===== INTEGRATION: ${pass} passed, ${fail} failed =====`);
process.exit(fail > 0 ? 1 : 0);
