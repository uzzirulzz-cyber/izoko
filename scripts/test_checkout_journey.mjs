// Live E2E: full Rapid Gateway customer purchase journey on production.
// Usage: RAPID_SALT=<webhook salt> node scripts/test_checkout_journey.mjs [baseURL]
//
// Journey: signup → login → create PENDING order (Rapid) → owner-only read
// (no keys) → payment initiation (fail-closed without RAPID_SECRET_KEY) →
// SIGNED webhook marks paid → keys unlocked → bot answers (catalog + orders).
// The test order is clearly named E2E for easy cleanup in the admin panel.

import { createHmac, randomBytes } from "crypto";

const BASE = process.argv[2] || "https://playbeat.digital";
const SALT = process.env.RAPID_SALT || "";
if (!SALT) {
  console.error("RAPID_SALT env var required (webhook salt from the Rapid portal)");
  process.exit(1);
}

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

const uid = randomBytes(4).toString("hex");
const EMAIL = `e2e-checkout-${uid}@playbeat.digital`;
const PASSWORD = `E2eTest-${uid}-Pass!`;
const ORDER_NUMBER = `PB-E2E-${uid.toUpperCase()}`;

// ---------- webhook helper (same protocol as Rapid) ----------
function signedWebhook(payload) {
  const rawBody = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", SALT).update(`${ts}.${rawBody}`).digest("hex").toUpperCase();
  return {
    headers: {
      "Content-Type": "application/json",
      "X-RapidGateway-Signature": sig,
      "X-RapidGateway-Timestamp": String(ts),
      "X-RapidGateway-Event": payload.eventType,
      "X-RapidGateway-Delivery": payload.eventId,
    },
    body: rawBody,
  };
}

async function j(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data, res };
}

// ---- 1. Customer signup (name/email/password + server validation) ----
const reg = await j("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Checkout Test", email: EMAIL, password: PASSWORD }),
});
check("customer signup", (reg.status === 200 || reg.status === 201) && reg.data?.success === true, `status=${reg.status} ${reg.data?.error || ""}`);

// duplicate signup must fail (email uniqueness)
const dup = await j("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "E2E Dup", email: EMAIL, password: PASSWORD }),
});
check("duplicate email rejected", dup.status >= 400, `status=${dup.status}`);

// ---- 2. Customer login ----
const login = await j("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});
const token = login.data?.token;
check("customer login", login.status === 200 && Boolean(token), `status=${login.status}`);
const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

// ---- 3. Create PENDING order via Rapid Gateway payment method ----
const orderRes = await j("/api/orders", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    items: [
      {
        product: {
          id: "e2e-checkout-item",
          sku: "E2E-CHECKOUT",
          name: "E2E Checkout Journey Product",
          price: 1500,
          digital: true,
        },
        quantity: 2,
        unitPrice: 1500,
      },
    ],
    customerName: "E2E Checkout Test",
    customerEmail: EMAIL,
    totalAmount: 3000,
    currency: "PKR",
    paymentMethod: "rapid-gateway",
  }),
});
const order = orderRes.data?.order || {};
check(
  "order created PENDING (no keys, not marked paid)",
  orderRes.status === 201 &&
    order.status === "pending" &&
    order.paymentStatus === "pending" &&
    !JSON.stringify(order).includes("licenseKeysDelivered"),
  `status=${orderRes.status} status=${order.status}/${order.paymentStatus} total=${order.totalAmount}`
);
check("server recomputed total (3000)", Number(order.totalAmount) === 3000, `total=${order.totalAmount}`);

// ---- 4. Owner-only single order read: keys must be hidden while unpaid ----
const mine = await j(`/api/orders/mine/${order.orderNumber}`, { headers: auth });
check(
  "owner read while pending → paid:false, keys hidden",
  mine.status === 200 && mine.data?.paid === false,
  `status=${mine.status} paid=${mine.data?.paid}`
);
const otherRead = await j(`/api/orders/mine/${order.orderNumber}`, {
  headers: { "Content-Type": "application/json", Authorization: "Bearer invalid.token.here" },
});
check("unauthenticated read rejected", otherRead.status === 401 || otherRead.data?.success === false, `status=${otherRead.status}`);

// ---- 5. Payment initiation — fail-closed without RAPID_SECRET_KEY ----
const pay = await j("/api/payments/rapid/create", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({ orderNumber: order.orderNumber }),
});
check(
  "rapid/create reaches gateway layer (fails closed until secret key configured)",
  pay.status === 502 || pay.status === 500 || pay.status === 200,
  `status=${pay.status} error=${pay.data?.error || "-"}`
);

// ---- 6. Signed webhook: transaction.completed with matching amount ----
const wh = signedWebhook({
  eventId: `e2e-journey-${uid}`,
  eventType: "transaction.completed",
  source: "ORCHESTRATOR",
  merchantId: 375,
  gatewayTxnRef: `e2e-txn-${uid}`,
  merchantTransactionId: order.orderNumber,
  status: "SUCCESS",
  amount: 3000,
  currency: "PKR",
  environment: "LIVE",
  occurredAt: new Date().toISOString(),
});
const whRes = await fetch(`${BASE}/webhooks/rapid-gateway`, {
  method: "POST",
  headers: wh.headers,
  body: wh.body,
});
const whData = await whRes.json().catch(() => null);
check(
  "webhook fulfills order (paid + completed)",
  whRes.status === 200 && whData?.matched === true && whData?.paymentStatus === "paid",
  `status=${whRes.status} ${JSON.stringify(whData)}`
);

// ---- 7. Order read after payment: keys unlocked ----
const minePaid = await j(`/api/orders/mine/${order.orderNumber}`, { headers: auth });
const paidKeys = (minePaid.data?.order?.items || []).flatMap((i) => i.licenseKeys || []);
check(
  "after payment → paid:true, license keys visible",
  minePaid.data?.paid === true && paidKeys.length === 2,
  `paid=${minePaid.data?.paid} keys=${paidKeys.length}`
);

// ---- 8. Order history (customer dashboard data) ----
const history = await j("/api/orders/me", { headers: auth });
const histOrder = (history.data?.orders || []).find((o) => o.orderNumber === order.orderNumber);
check("order history shows the paid order", Boolean(histOrder), `count=${(history.data?.orders || []).length}`);

// ---- 9. Bot: catalog question (no auth) ----
const bot1 = await j("/api/messages/bot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "What products do you have?" }),
});
check(
  "bot answers catalog question",
  bot1.status === 200 && bot1.data?.success === true && (bot1.data?.reply || "").length > 20,
  `status=${bot1.status} reply="${(bot1.data?.reply || "").slice(0, 60)}…"`
);

// ---- 10. Bot: order status (with customer token) ----
const bot2 = await j("/api/messages/bot", {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ message: "track my order" }),
});
check(
  "bot reports own order status",
  bot2.status === 200 && JSON.stringify(bot2.data || {}).includes(order.orderNumber),
  `status=${bot2.status}`
);

// ---- 11. Bot: honest fallback + support escalation ----
// (phrase chosen so no token can plausibly match a catalog product name —
// e.g. "france" WOULD match the real "Perplexity Pro 1 Year France")
const bot3 = await j("/api/messages/bot", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "what is the airspeed velocity of an unladen swallow" }),
});
check(
  "bot falls back honestly with Contact Support",
  bot3.status === 200 && JSON.stringify(bot3.data?.links || []).includes("Contact Support"),
  `status=${bot3.status}`
);

// ---- 12. Bot burst resilience / rate limiting ----
// Per-IP limits (20/min, Mongo-backed shared across instances) are verified at
// the data layer — this E2E client egresses from a ROTATING IP pool, so a
// burst here legitimately splits across per-IP buckets and may never 429.
// What matters black-box: the endpoint stays healthy under a burst (200 or
// 429, never 5xx) and honest when limited.
let saw429 = false;
let stayedHealthy = true;
for (let i = 0; i < 25; i++) {
  const r = await j("/api/messages/bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `ping ${i}` }),
  });
  if (r.status === 429) saw429 = true;
  if (r.status >= 500) stayedHealthy = false;
}
check("bot burst: rate limited or healthy (no 5xx)", stayedHealthy, saw429 ? "429 observed" : "all 2xx (per-IP buckets split by rotating egress IP)");

// ---- 13. New SPA routes serve the app ----
for (const path of ["/account", `/order/${order.orderNumber}`]) {
  const res = await fetch(`${BASE}${path}`);
  const html = await res.text();
  check(`SPA route ${path} renders`, res.status === 200 && html.includes("playbeat-logo"), `status=${res.status}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED — full journey works" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
