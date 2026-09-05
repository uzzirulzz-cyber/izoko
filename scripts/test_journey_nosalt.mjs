// Live journey verification (no-salt variant) — covers everything that does
// not require the Rapid webhook signing salt. Webhook steps are verified
// separately by scripts/test_checkout_journey.mjs when RAPID_SALT is available.
// Usage: node scripts/test_journey_nosalt.mjs [baseURL]

import { randomBytes } from "crypto";

const BASE = process.argv[2] || "https://playbeat.digital";
let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

const uid = randomBytes(4).toString("hex");
const EMAIL = `e2e-journey-${uid}@playbeat.digital`;
const PASSWORD = `E2eTest-${uid}-Pass!`;

async function j(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data, res };
}

// 1. signup + duplicate rejection
const reg = await j("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Journey Test", email: EMAIL, password: PASSWORD }),
});
check("customer signup", (reg.status === 200 || reg.status === 201) && reg.data?.success === true, `status=${reg.status} ${reg.data?.error || ""}`);

const dup = await j("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Dup", email: EMAIL, password: PASSWORD }),
});
check("duplicate email rejected", dup.status >= 400, `status=${dup.status}`);

// weak password rejected server-side
const weak = await j("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Weak", email: `weak-${uid}@playbeat.digital`, password: "123" }),
});
check("weak password rejected", weak.status >= 400, `status=${weak.status} ${weak.data?.error || ""}`);

// 2. login + bad password
const badLogin = await j("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: "wrong-password-1!" }),
});
check("wrong password rejected", badLogin.status >= 400, `status=${badLogin.status}`);

const login = await j("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const token = login.data?.token;
check("customer login", login.status === 200 && Boolean(token), `status=${login.status}`);
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

// 3. PENDING Rapid order (server recomputes total)
const orderRes = await j("/api/orders", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    items: [{ product: { id: "e2e-item", sku: "E2E", name: "E2E Journey Product", price: 999, digital: true }, quantity: 2, unitPrice: 999 }],
    customerName: "E2E Journey Test",
    customerEmail: EMAIL,
    totalAmount: 1, // deliberately wrong — server must ignore it
    currency: "PKR",
    paymentMethod: "rapid-gateway",
  }),
});
const order = orderRes.data?.order || {};
check(
  "order created PENDING, no keys echoed",
  orderRes.status === 201 && order.status === "pending" && order.paymentStatus === "pending" && !JSON.stringify(order).includes("licenseKeysDelivered"),
  `status=${orderRes.status} state=${order.status}/${order.paymentStatus}`
);
check("server recomputed total (1998), client total ignored", Number(order.totalAmount) === 1998, `total=${order.totalAmount}`);

// 4. owner-scoped reads
const mine = await j(`/api/orders/mine/${order.orderNumber}`, { headers: auth });
check("owner read pending → paid:false", mine.status === 200 && mine.data?.paid === false, `paid=${mine.data?.paid}`);
const stranger = await j(`/api/orders/mine/${order.orderNumber}`, { headers: { "Content-Type": "application/json", Authorization: "Bearer invalid.token.here" } });
check("unauthenticated read rejected", stranger.status === 401 || stranger.data?.success === false, `status=${stranger.status}`);

// cross-user isolation: second account must NOT see the order
const otherReg = await j("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Stranger", email: `stranger-${uid}@playbeat.digital`, password: `Stranger-${uid}-Pass!` }),
});
const otherLogin = await j("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: `stranger-${uid}@playbeat.digital`, password: `Stranger-${uid}-Pass!` }),
});
const otherToken = otherLogin.data?.token;
if (otherToken) {
  const crossRead = await j(`/api/orders/mine/${order.orderNumber}`, { headers: { Authorization: `Bearer ${otherToken}` } });
  check("cross-user order read blocked", crossRead.status === 404 || crossRead.data?.success === false, `status=${crossRead.status}`);
  const otherHist = await j("/api/orders/me", { headers: { Authorization: `Bearer ${otherToken}` } });
  check("stranger history empty", (otherHist.data?.orders || []).length === 0, `count=${(otherHist.data?.orders || []).length}`);
} else {
  check("cross-user order read blocked", false, "stranger login failed");
}

// 5. rapid/create — reveals whether RAPID_SECRET_KEY is configured
const pay = await j("/api/payments/rapid/create", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ orderNumber: order.orderNumber }),
});
const notConfigured = /not configured/i.test(pay.data?.error || "");
const gatewayAttempted = pay.status === 200 || pay.status === 502 || pay.status === 500;
check(
  "rapid/create fail-closed or gateway attempted",
  gatewayAttempted,
  `status=${pay.status} error=${(pay.data?.error || "checkout URL returned").slice(0, 90)}`
);
console.log(`INFO  RAPID_SECRET_KEY configured: ${notConfigured ? "NO — real checkout will fail-closed until the secret key is added in Vercel" : "likely YES — gateway attempted"}`);

// 6. order history
const history = await j("/api/orders/me", { headers: auth });
check("order history shows the order", (history.data?.orders || []).some((o) => o.orderNumber === order.orderNumber), `count=${(history.data?.orders || []).length}`);

// 7. SPA routes
for (const path of ["/account", `/order/${order.orderNumber}`]) {
  const res = await fetch(`${BASE}${path}`);
  const html = await res.text();
  check(`SPA route ${path} renders`, res.status === 200 && html.includes("playbeat-logo"), `status=${res.status}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
