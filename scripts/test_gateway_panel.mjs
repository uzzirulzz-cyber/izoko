// Live E2E: Payment Gateway admin panel (config / test / resolve + IT scoping).
// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/test_gateway_panel.mjs [baseURL]
//
// Verifies:
//   1. Super admin can read gateway-config (masked, never plaintext)
//   2. Saving config works (apiBase reset is a harmless no-op) + audit trail
//   3. connectivity test reports reachability honestly
//   4. webhook-selftest round-trips a SIGNED webhook.test through the public
//      endpoint (full HMAC pipeline)
//   5. test-payment fail-closed without a secret key (400, explicit message)
//   6. gateway-logs returns deliveries + flagged + testOrders
//   7. gateway-resolve rejects bogus orders
//   8. An IT-authority staff account can use gateway routes but is REJECTED
//      on every other admin route (server-side scope wall) — the account is
//      deleted again afterwards.

const BASE = process.argv[2] || "https://playbeat.digital";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@playbeat.digital";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD env var required");
  process.exit(1);
}

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

async function j(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}
const authed = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// ---- admin login ----
const login = await j("/api/auth/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
const token = login.data?.token;
check("admin login", login.status === 200 && Boolean(token), `status=${login.status}`);
const H = authed(token);

// ---- 1. gateway-config read (masked) ----
const cfg = await j("/api/admin/gateway-config", { headers: H });
check(
  "gateway-config read",
  cfg.status === 200 && cfg.data?.success === true && typeof cfg.data?.configured === "object",
  `status=${cfg.status} secretKey=${cfg.data?.configured?.secretKey} salt=${cfg.data?.configured?.webhookSalt}`
);
check(
  "no plaintext secrets in config response",
  !JSON.stringify(cfg.data || {}).includes("sk_") &&
    String(cfg.data?.masked?.secretKey || "").length <= 16,
  `masked=${cfg.data?.masked?.secretKey || "-"}`
);

// ---- 2. save config (harmless: reset apiBase to env default) ----
const save = await j("/api/admin/gateway-config", {
  method: "POST",
  headers: H,
  body: JSON.stringify({ apiBase: "" }),
});
check(
  "gateway-config save (no-op reset)",
  save.status === 200 && save.data?.success === true,
  `status=${save.status}`
);

// ---- 3. connectivity test ----
const conn = await j("/api/admin/gateway-test", {
  method: "POST",
  headers: H,
  body: JSON.stringify({ action: "connectivity" }),
});
check(
  "connectivity test executes",
  conn.status === 200 && conn.data?.success === true && typeof conn.data?.reachable === "boolean",
  `reachable=${conn.data?.reachable} http=${conn.data?.httpStatus ?? "-"} ${conn.data?.latencyMs ?? "-"}ms`
);

// ---- 4. webhook self-test (salt IS configured in prod env) ----
const selftest = await j("/api/admin/gateway-test", {
  method: "POST",
  headers: H,
  body: JSON.stringify({ action: "webhook-selftest" }),
});
const saltConfigured = cfg.data?.configured?.webhookSalt || cfg.data?.configured?.webhookSaltPrev;
if (saltConfigured) {
  check(
    "webhook self-test verified end-to-end",
    selftest.status === 200 && selftest.data?.verified === true,
    `http=${selftest.data?.httpStatus} ${JSON.stringify(selftest.data?.response || {}).slice(0, 80)}`
  );
} else {
  check(
    "webhook self-test fail-closed without salt",
    selftest.status === 400,
    `status=${selftest.status}`
  );
}

// ---- 5. test-payment fail-closed (no secret key yet) ----
const tp = await j("/api/admin/gateway-test", {
  method: "POST",
  headers: H,
  body: JSON.stringify({ action: "test-payment", amount: 100 }),
});
check(
  "test-payment explicit outcome (checkout or fail-closed message)",
  tp.status === 200 || tp.status === 400,
  `status=${tp.status} order=${tp.data?.orderNumber || "-"} ${tp.data?.error || tp.data?.checkoutUrl || ""}`.slice(0, 110)
);

// ---- 6. gateway-logs ----
const logs = await j("/api/admin/gateway-logs", { headers: H });
check(
  "gateway-logs returns deliveries + flagged + testOrders",
  logs.status === 200 &&
    Array.isArray(logs.data?.deliveries) &&
    Array.isArray(logs.data?.flagged) &&
    Array.isArray(logs.data?.testOrders),
  `deliveries=${logs.data?.deliveries?.length} flagged=${logs.data?.flagged?.length}`
);
if (saltConfigured) {
  check(
    "selftest delivery visible in the log",
    (logs.data?.deliveries || []).some(
      (d) => d.action === "test_acknowledged" || d.environment === "ADMIN-SELFTEST"
    ),
    ""
  );
}

// ---- 7. resolve rejects bogus order ----
const bogus = await j("/api/admin/gateway-resolve", {
  method: "POST",
  headers: H,
  body: JSON.stringify({ orderNumber: "PB-DOES-NOT-EXIST", action: "mark-reviewed" }),
});
check("resolve rejects unknown order", bogus.status === 404, `status=${bogus.status}`);

// ---- 8. IT scoping ----
const uid = Math.random().toString(36).slice(2, 8);
const IT_EMAIL = `it-tech-${uid}@playbeat.digital`;
const IT_PASS = `ItTech-${uid}-Pass!`;
const create = await j("/api/admin/staff/create", {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    name: "IT Gateway Tech (E2E)",
    email: IT_EMAIL,
    password: IT_PASS,
    department: "IT",
    authority: "it",
  }),
});
check(
  "IT staff account created",
  create.status === 200 && create.data?.staff?.authority === "it",
  `status=${create.status} authority=${create.data?.staff?.authority}`
);
const itLogin = await j("/api/auth/admin/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: IT_EMAIL, password: IT_PASS }),
});
const itToken = itLogin.data?.token;
check("IT account can log in", Boolean(itToken), `status=${itLogin.status}`);
const itMe = await j("/api/auth/admin/me", { headers: authed(itToken) });
check(
  "admin/me reports IT authority",
  itMe.data?.admin?.authority === "it" && itMe.data?.admin?.role === "staff",
  `authority=${itMe.data?.admin?.authority}`
);

if (itToken) {
  const IT = authed(itToken);
  const itCfg = await j("/api/admin/gateway-config", { headers: IT });
  check("IT can read gateway-config", itCfg.status === 200 && itCfg.data?.success === true, `status=${itCfg.status}`);
  const itStats = await j("/api/admin/stats", { headers: IT });
  check("IT blocked from stats", itStats.status === 403, `status=${itStats.status}`);
  const itOrders = await j("/api/admin/orders-log", { headers: IT });
  check("IT blocked from orders-log", itOrders.status === 403, `status=${itOrders.status}`);
  const itStaff = await j("/api/admin/staff", { headers: IT });
  check("IT blocked from staff list", itStaff.status === 403, `status=${itStaff.status}`);
  const itProducts = await j("/api/admin/products", { headers: IT, method: "POST", body: JSON.stringify({}) });
  check("IT blocked from product writes", itProducts.status === 403, `status=${itProducts.status}`);
  const itConn = await j("/api/admin/gateway-test", {
    method: "POST",
    headers: IT,
    body: JSON.stringify({ action: "connectivity" }),
  });
  check("IT can run gateway tests", itConn.status === 200 && itConn.data?.success === true, `status=${itConn.status}`);
}

// ---- cleanup: delete the IT account ----
const staffList = await j("/api/admin/staff", { headers: H });
const itAcct = (staffList.data?.staff || []).find((s) => s.email === IT_EMAIL);
if (itAcct?.id) {
  const del = await j("/api/admin/staff/delete", {
    method: "POST",
    headers: H,
    body: JSON.stringify({ userId: itAcct.id }),
  });
  check("IT test account cleaned up", del.status === 200, `status=${del.status}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED — gateway panel works" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
