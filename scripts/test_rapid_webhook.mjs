// Live E2E for the Rapid Gateway webhook receiver on production.
// Usage: RAPID_SALT=<webhook salt> node scripts/test_rapid_webhook.mjs [baseURL]
//
// The salt is NOT hardcoded (public repo) — pass it via the RAPID_SALT env var.
// It is the "salt" shown in the Rapid portal under Developers → Webhooks.
//
// Protocol reference: rapidgateway.pk → Resources → Payment Webhooks Guide
//   signature = UPPER(hex(HMAC-SHA256(salt, timestamp + "." + rawBody)))
//   headers   = X-RapidGateway-Signature / -Timestamp / -Event / -Delivery

import { createHmac } from "crypto";

const BASE = process.argv[2] || "https://playbeat.digital";
const SALT = process.env.RAPID_SALT || "";

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

function sign(timestamp, rawBody) {
  return createHmac("sha256", SALT).update(`${timestamp}.${rawBody}`).digest("hex").toUpperCase();
}

function buildEvent(payload, { timestamp = Math.floor(Date.now() / 1000), salt = SALT } = {}) {
  const rawBody = JSON.stringify(payload);
  const sig = salt ? sign(timestamp, rawBody) : "invalid".padEnd(64, "0");
  return {
    rawBody,
    headers: {
      "Content-Type": "application/json",
      "X-RapidGateway-Signature": sig,
      "X-RapidGateway-Timestamp": String(timestamp),
      "X-RapidGateway-Event": payload.eventType,
      "X-RapidGateway-Delivery": payload.eventId,
    },
  };
}

async function post(rawBody, headers) {
  const res = await fetch(`${BASE}/webhooks/rapid-gateway`, {
    method: "POST",
    headers,
    body: rawBody,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

if (!SALT) {
  console.error("RAPID_SALT env var required (webhook salt from the Rapid portal)");
  process.exit(1);
}

const uid = Date.now().toString().slice(-8);

// ---- 1. signed webhook.test from the portal → 200, acknowledged ----
{
  const { rawBody, headers } = buildEvent({
    eventId: `e2e-test-${uid}`,
    eventType: "webhook.test",
    source: "ORCHESTRATOR",
    merchantId: 375,
    gatewayTxnRef: `e2e-${uid}`,
    merchantTransactionId: "N/A",
    status: "SUCCESS",
    amount: 0.0,
    currency: "PKR",
    environment: "LIVE",
    occurredAt: new Date().toISOString(),
  });
  const t0 = Date.now();
  const { status, data } = await post(rawBody, headers);
  check(
    "signed webhook.test acknowledged (200)",
    status === 200 && data?.success === true,
    `status=${status} ${JSON.stringify(data)} ${Date.now() - t0}ms`
  );
}

// ---- 2. tampered signature → 403 ----
{
  const { rawBody, headers } = buildEvent({
    eventId: `e2e-tamper-${uid}`,
    eventType: "webhook.test",
    merchantTransactionId: "N/A",
  });
  const { status, data } = await post(rawBody, {
    ...headers,
    "X-RapidGateway-Signature": "F".repeat(64),
  });
  check("tampered signature rejected (403)", status === 403, `status=${status}`);
}

// ---- 3. stale timestamp (> 5 min window) → 403 ----
{
  const stale = Math.floor(Date.now() / 1000) - 3600;
  const { rawBody, headers } = buildEvent(
    { eventId: `e2e-stale-${uid}`, eventType: "webhook.test", merchantTransactionId: "N/A" },
    { timestamp: stale }
  );
  const { status } = await post(rawBody, headers);
  check("stale timestamp rejected (403)", status === 403, `status=${status}`);
}

// ---- 4. signed transaction.completed for an unknown order → 200 matched:false ----
{
  const { rawBody, headers } = buildEvent({
    eventId: `e2e-paid-unknown-${uid}`,
    eventType: "transaction.completed",
    source: "ORCHESTRATOR",
    merchantId: 375,
    gatewayTxnRef: `e2e-${uid}`,
    merchantTransactionId: `PB-WEBHOOK-TEST-${uid}`,
    status: "SUCCESS",
    amount: 100.0,
    currency: "PKR",
    environment: "LIVE",
    occurredAt: new Date().toISOString(),
  });
  const { status, data } = await post(rawBody, headers);
  check(
    "transaction.completed unknown order → 200 matched:false",
    status === 200 && data?.matched === false,
    `status=${status} ${JSON.stringify(data)}`
  );

  // ---- 5. redelivery of the same eventId → duplicate:true (idempotency) ----
  const again = await post(rawBody, headers);
  check(
    "duplicate eventId absorbed (duplicate:true)",
    again.status === 200 && again.data?.duplicate === true,
    `status=${again.status} ${JSON.stringify(again.data)}`
  );
}

// ---- 6. signed refund.failed → 200, logged, no transition ----
{
  const { rawBody, headers } = buildEvent({
    eventId: `e2e-reffail-${uid}`,
    eventType: "refund.failed",
    source: "ORCHESTRATOR",
    merchantId: 375,
    gatewayTxnRef: `e2e-${uid}`,
    merchantTransactionId: `PB-WEBHOOK-TEST-${uid}`,
    status: "FAILED",
    amount: 100.0,
    currency: "PKR",
    environment: "LIVE",
    occurredAt: new Date().toISOString(),
  });
  const { status, data } = await post(rawBody, headers);
  check(
    "refund.failed acknowledged without transition",
    status === 200 && data?.ignored === "no_transition_for_event_type",
    `status=${status} ${JSON.stringify(data)}`
  );
}

// ---- 7. GET (connectivity probe) → 405 ----
{
  const res = await fetch(`${BASE}/webhooks/rapid-gateway`, { method: "GET" });
  check("GET rejected (405 POST-only)", res.status === 405, `status=${res.status}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
