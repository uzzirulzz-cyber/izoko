// Live E2E for the admin Documents & Files vault (production).
// Usage: node scripts/test_documents_vault.mjs [baseURL]
// Steps: admin login -> chunked upload (multi-chunk PDF) -> single-chunk APK
//        -> list -> byte-identical download -> unsupported type rejected
//        -> delete -> 404 after delete. Prints PASS/FAIL per step, exit 1 on any failure.
import { createHash, randomBytes } from "crypto";

const BASE = process.argv[2] || "https://playbeat.digital";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@playbeat.digital";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

// ---- 1. admin token (real login only — the old JWT-mint fallback died when
//         SESSION_SECRET was rotated out of the repo; pass ADMIN_PASSWORD env)
async function getToken() {
  const loginRes = await fetch(`${BASE}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const login = await loginRes.json().catch(() => null);
  const t = login?.token || login?.data?.token;
  if (loginRes.ok && t) return { token: t, via: "login" };
  return { token: null, via: `login failed (${loginRes.status}) — set ADMIN_EMAIL/ADMIN_PASSWORD env` };
}
const { token, via } = await getToken();
check("admin token", Boolean(token), `via ${via}`);
if (!token) process.exit(1);
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// ---- 2. build test files ----
// fake-but-valid PDF (header must be %PDF-)
const pdfBody = Buffer.concat([
  Buffer.from("%PDF-1.4\n"),
  randomBytes(3 * 1024 * 1024 + 12345), // ~3MB → forces 2 chunks at 2MB chunking
  Buffer.from("\n%%EOF\n"),
]);
const pdfName = `e2e-vault-test-${Date.now()}.pdf`;
// APK/zip: real zip magic PK\x03\x04
const apkBody = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), randomBytes(700 * 1024)]);
const apkName = `e2e-vault-test-${Date.now()}.apk`;
// forbidden type
const exeBody = Buffer.from([0x4d, 0x5a, 0x90, 0x00, ...randomBytes(4096)]);

const CHUNK = 2 * 1024 * 1024;
async function upload(name, size, mime, buf) {
  const sessionId = `e2e-${randomBytes(16).toString("hex")}`;
  const total = Math.max(1, Math.ceil(buf.length / CHUNK));
  for (let i = 0; i < total; i++) {
    const slice = buf.subarray(i * CHUNK, Math.min(buf.length, (i + 1) * CHUNK));
    const r = await fetch(`${BASE}/api/admin/documents/chunk`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ sessionId, seq: i, data: slice.toString("base64") }),
    });
    if (!r.ok) throw new Error(`chunk ${i} failed: ${r.status} ${await r.text()}`);
  }
  const fin = await fetch(`${BASE}/api/admin/documents/finalize`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ sessionId, name, size, mime }),
  });
  const data = await fin.json().catch(() => null);
  return { status: fin.status, data };
}

// ---- 3. multi-chunk PDF upload ----
const t0 = Date.now();
const up1 = await upload(pdfName, pdfBody.length, "application/pdf", pdfBody);
check(
  "multi-chunk PDF upload (3.1MB / 2 chunks)",
  up1.status === 200 && up1.data?.success && up1.data?.document?.size === pdfBody.length,
  `${up1.status} in ${Date.now() - t0}ms, id=${up1.data?.document?.id}`
);
const pdfId = up1.data?.document?.id;

// ---- 4. single-chunk APK upload ----
const up2 = await upload(apkName, apkBody.length, "application/vnd.android.package-archive", apkBody);
check(
  "APK upload (zip magic accepted)",
  up2.status === 200 && up2.data?.success,
  `${up2.status}, id=${up2.data?.document?.id}`
);
const apkId = up2.data?.document?.id;

// ---- 5. unsupported type rejected ----
const up3 = await upload("e2e-malware.exe", exeBody.length, "application/x-msdownload", exeBody);
check("EXE rejected by whitelist", up3.status === 400, `${up3.status} ${up3.data?.message || ""}`);

// ---- 6. list contains both + stats ----
const listRes = await fetch(`${BASE}/api/admin/documents`, { headers: auth });
const list = await listRes.json().catch(() => null);
const foundPdf = list?.documents?.find((d) => d.id === pdfId);
const foundApk = list?.documents?.find((d) => d.id === apkId);
check(
  "list shows both files + stats",
  Boolean(foundPdf && foundApk) && list?.stats?.count >= 2,
  `count=${list?.stats?.count}, totalBytes=${list?.stats?.totalBytes}`
);

// ---- 7. download byte-identical ----
const dlRes = await fetch(`${BASE}/api/admin/documents/${pdfId}/download`, { headers: { Authorization: `Bearer ${token}` } });
const dlBuf = Buffer.from(await dlRes.arrayBuffer());
const same = createHash("sha256").update(dlBuf).digest("hex") === createHash("sha256").update(pdfBody).digest("hex");
check(
  "PDF download byte-identical",
  dlRes.status === 200 && dlBuf.length === pdfBody.length && same,
  `${dlRes.status}, ${dlBuf.length} bytes, sha match=${same}, disposition=${dlRes.headers.get("content-disposition")?.slice(0, 60)}`
);

// ---- 8. unauthenticated download rejected ----
const anon = await fetch(`${BASE}/api/admin/documents/${pdfId}/download`);
check("anonymous download blocked", anon.status === 401, `status ${anon.status}`);

// ---- 9. delete both, expect 404 after ----
const del1 = await fetch(`${BASE}/api/admin/documents/${pdfId}`, { method: "DELETE", headers: auth });
const after1 = await fetch(`${BASE}/api/admin/documents/${pdfId}/download`, { headers: { Authorization: `Bearer ${token}` } });
const del2 = await fetch(`${BASE}/api/admin/documents/${apkId}`, { method: "DELETE", headers: auth });
check("delete + subsequent 404", del1.ok && del2.ok && after1.status === 404, `del=${del1.status}/${del2.status}, after=${after1.status}`);

// ---- 10. version gate + APK download still healthy ----
const ver = await (await fetch(`${BASE}/api/app/version?installed=3.2.0`)).json();
check(
  "app version 3.2.0 live, no update prompt",
  ver?.app?.version === "3.2.0" && ver?.app?.updateAvailable === false,
  `version=${ver?.app?.version}`
);
const apkRes = await fetch(`${BASE}/downloads/playbeat-admin.apk`);
const apkBuf = Buffer.from(await apkRes.arrayBuffer());
const apkSha = createHash("sha256").update(apkBuf).digest("hex");
check(
  "APK download hash matches v3.2.0 build",
  apkRes.status === 200 && apkSha === "7284e47a8458d5fc772ea2ea04b9123f54a1159f3a7e81c68217be96ced5baf9",
  `${apkRes.status}, ${apkBuf.length} bytes`
);

console.log(failures === 0 ? "\nALL E2E CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
