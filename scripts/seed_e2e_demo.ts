// Seed demo products into the ISOLATED test DB for browser E2E rendering checks
const BASE = "http://127.0.0.1:3010";

const login = await (await fetch(`${BASE}/api/auth/admin/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@playbeat.digital", password: "playbeat1122" }),
})).json();
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${login.token}`, Cookie: `adminToken=${login.token}` };

const HTML_DESC = `<h1>Main Heading</h1>
<h2>Section Heading</h2>
<p>PlayStation Plus Deluxe is available for <strong>1 month</strong>. Choose <b>Shared</b> or <em>Private</em> Account.</p>
<h3>FAQ Heading</h3>
<h4>Small Subheading</h4>
<p>Full details with <i>italics</i> and <u>underline</u> support.</p>
<ul><li>Bullet feature one</li><li>Bullet feature two</li></ul>
<ol><li>Step one — pay</li><li>Step two — receive key</li></ol>
<p>Visit <a href="https://playbeat.digital" target="_blank">PlayBeat Digital</a> for more deals.</p>
<blockquote>Best subscription marketplace — verified seller.</blockquote>
<table><thead><tr><th>Plan</th><th>Price</th><th>Delivery</th></tr></thead><tbody><tr><td>1 Month</td><td>PKR 950</td><td>Instant</td></tr><tr><td>3 Months</td><td>PKR 2,600</td><td>Instant</td></tr><tr><td>12 Months with a much longer plan name to test wrapping</td><td>PKR 9,500</td><td>Instant email delivery to your inbox</td></tr></tbody></table>
<p><img src="/assets/images/products/playstation-giftcard.webp" alt="PSN card" width="320"></p>
<p>Line one<br>Line two after br</p>`;

const PLAIN_DESC = "PlayStation Plus Deluxe is available for 1 month.\nChoose Shared or Private Account.\n\nInstant delivery to your email. Warranty included.";

const stamp = Date.now();
for (const p of [
  { name: "E2E HTML Render Demo", slug: "e2e-html-render-demo", sku: `E2EHR-${stamp}`, description: HTML_DESC },
  { name: "E2E Plain Render Demo", slug: "e2e-plain-render-demo", sku: `E2EPR-${stamp}`, description: PLAIN_DESC },
]) {
  const r = await fetch(`${BASE}/api/admin/products`, {
    method: "POST", headers: auth,
    body: JSON.stringify({ ...p, category: "Subscriptions", price: 950, currency: "PKR", cmsStatus: "published", active: true, stockMode: "unlimited", digital: true }),
  });
  const j = await r.json();
  console.log(r.ok ? "seeded:" : "FAILED:", p.slug, r.ok ? j.product?.id : JSON.stringify(j).slice(0, 150));
}
console.log("stamp:", stamp);
