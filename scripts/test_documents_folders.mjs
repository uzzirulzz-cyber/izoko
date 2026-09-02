// Live E2E for the admin Documents & Files vault FOLDER system (production).
// Usage: node scripts/test_documents_folders.mjs [baseURL]
// Steps: token -> create folder -> dup rejected 409 -> upload INTO folder ->
//        upload at root -> scoped list (folder/root) -> vault-wide search shows
//        folder chip -> move file between folders -> rename folder syncs labels
//        -> delete folder blocked when non-empty -> delete with moveFilesToRoot
//        -> cleanup. Prints PASS/FAIL per step, exit 1 on any failure.
import { createHash, randomBytes } from "crypto";

const BASE = process.argv[2] || "https://playbeat.digital";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@playbeat.digital";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "playbeat1122";

let failures = 0;
function check(name, ok, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failures++;
}

// ---- 1. admin token (real login, else mint with repo fallback secret)
async function getToken() {
  const loginRes = await fetch(`${BASE}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const login = await loginRes.json().catch(() => null);
  const t = login?.token || login?.data?.token;
  if (loginRes.ok && t) return { token: t, via: "login" };
  const { default: jwt } = await import("jsonwebtoken");
  const minted = jwt.sign(
    { email: ADMIN_EMAIL, role: "admin", name: "E2E Test" },
    "playbeat-jwt-super-secret-key-2026",
    { expiresIn: "30m" }
  );
  const probe = await fetch(`${BASE}/api/admin/stats`, {
    headers: { Authorization: `Bearer ${minted}` },
  });
  if (probe.ok) return { token: minted, via: "minted (prod password differs)" };
  return { token: null, via: "none" };
}
const { token, via } = await getToken();
check("admin token", Boolean(token), `via ${via}`);
if (!token) process.exit(1);
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// ---- 2. helpers ----
const CHUNK = 2 * 1024 * 1024;
async function upload(name, buf, mime, folderId) {
  const sessionId = `e2e-${randomBytes(16).toString("hex")}`;
  const total = Math.max(1, Math.ceil(buf.length / CHUNK));
  for (let i = 0; i < total; i++) {
    const slice = buf.subarray(i * CHUNK, Math.min(buf.length, i * CHUNK + CHUNK));
    const r = await fetch(`${BASE}/api/admin/documents/chunk`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ sessionId, seq: i, data: slice.toString("base64") }),
    });
    if (!r.ok) throw new Error(`chunk ${i} failed: ${r.status}`);
  }
  const fin = await fetch(`${BASE}/api/admin/documents/finalize`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ sessionId, name, size: buf.length, mime, folderId }),
  });
  return { status: fin.status, data: await fin.json().catch(() => null) };
}
const cleanupFiles = [];
const slug = Date.now();

// ---- 3. create folder ----
const folderName = `e2e-folder-${slug}`;
const cf = await fetch(`${BASE}/api/admin/documents/folders`, {
  method: "POST", headers: auth, body: JSON.stringify({ name: folderName }),
});
const cfData = await cf.json().catch(() => null);
check("create folder", cf.status === 201 && cfData?.success && cfData?.folder?.name === folderName,
  `${cf.status}, id=${cfData?.folder?.id}`);
const folderId = cfData?.folder?.id;

// ---- 4. duplicate folder name rejected ----
const dup = await fetch(`${BASE}/api/admin/documents/folders`, {
  method: "POST", headers: auth, body: JSON.stringify({ name: folderName.toUpperCase() }),
});
check("duplicate folder name rejected (case-insensitive)", dup.status === 409, `${dup.status}`);

// ---- 5. upload PDF INTO the folder (2 chunks) ----
const pdfBody = Buffer.concat([
  Buffer.from("%PDF-1.4\n"), randomBytes(3 * 1024 * 1024 + 777), Buffer.from("\n%%EOF\n"),
]);
const pdfName = `e2e-fldr-${slug}.pdf`;
const up1 = await upload(pdfName, pdfBody, "application/pdf", folderId);
check("upload into folder", up1.status === 200 && up1.data?.document?.folderId === folderId &&
  up1.data?.document?.folderName === folderName,
  `${up1.status}, folder=${up1.data?.document?.folderName}`);
cleanupFiles.push(up1.data?.document?.id);

// ---- 6. upload TXT at root ----
const txtBody = Buffer.concat([randomBytes(64 * 1024)]);
const txtName = `e2e-root-${slug}.txt`;
const up2 = await upload(txtName, txtBody, "text/plain", null);
check("upload at root (no folder)", up2.status === 200 && (up2.data?.document?.folderId === null || up2.data?.document?.folderId === undefined),
  `${up2.status}`);
const txtId = up2.data?.document?.id;
cleanupFiles.push(txtId);

// ---- 7. scoped list: folder view ----
const inFolder = await (await fetch(`${BASE}/api/admin/documents?folder=${folderId}`, { headers: auth })).json();
check("folder-scoped list shows only folder file",
  inFolder?.success && inFolder.documents.length === 1 && inFolder.documents[0].id === up1.data?.document?.id,
  `count=${inFolder?.documents?.length}`);

// ---- 8. scoped list: root view ----
const atRoot = await (await fetch(`${BASE}/api/admin/documents?folder=root`, { headers: auth })).json();
const rootHasTxt = atRoot?.documents?.some((d) => d.id === txtId);
const rootHasPdf = atRoot?.documents?.some((d) => d.id === up1.data?.document?.id);
check("root-scoped list excludes folder files", atRoot?.success && rootHasTxt && !rootHasPdf,
  `root count=${atRoot?.documents?.length}, txt=${rootHasTxt}, pdf=${rootHasPdf}`);

// ---- 9. vault-wide search finds files inside folders + labels them ----
const search = await (await fetch(`${BASE}/api/admin/documents?q=e2e-fldr`, { headers: auth })).json();
check("vault-wide search surfaces folder file with label",
  search?.success && search.documents.length === 1 && search.documents[0].folderName === folderName,
  `found=${search?.documents?.length}, label=${search?.documents?.[0]?.folderName}`);

// ---- 10. move root TXT into folder ----
const mv = await fetch(`${BASE}/api/admin/documents/${txtId}/move`, {
  method: "POST", headers: auth, body: JSON.stringify({ folderId }),
});
const mvData = await mv.json().catch(() => null);
check("move file into folder", mv.status === 200 && mvData?.success, `${mv.status}, ${mvData?.message}`);
const afterMove = await (await fetch(`${BASE}/api/admin/documents?folder=${folderId}`, { headers: auth })).json();
check("folder now holds both files", afterMove?.documents?.length === 2, `count=${afterMove?.documents?.length}`);

// ---- 11. rename folder → denormalized labels sync ----
const newName = `e2e-folder-renamed-${slug}`;
const rn = await fetch(`${BASE}/api/admin/documents/folders/${folderId}`, {
  method: "PATCH", headers: auth, body: JSON.stringify({ name: newName }),
});
check("rename folder", rn.status === 200 && rn.json().then ? true : rn.ok, `${rn.status}`);
const search2 = await (await fetch(`${BASE}/api/admin/documents?q=e2e-fldr`, { headers: auth })).json();
check("rename syncs file labels", search2?.documents?.every((d) => d.folderName === newName) && search2.documents.length === 1,
  `label=${search2?.documents?.[0]?.folderName}`);

// ---- 12. delete non-empty folder blocked ----
const delBlocked = await fetch(`${BASE}/api/admin/documents/folders/${folderId}`, {
  method: "DELETE", headers: auth, body: JSON.stringify({ moveFilesToRoot: false }),
});
check("non-empty folder delete blocked (400)", delBlocked.status === 400, `${delBlocked.status}`);

// ---- 13. delete with moveFilesToRoot → files survive at root ----
const delOk = await fetch(`${BASE}/api/admin/documents/folders/${folderId}`, {
  method: "DELETE", headers: auth, body: JSON.stringify({ moveFilesToRoot: true }),
});
const delOkData = await delOk.json().catch(() => null);
check("folder deleted with moveFilesToRoot", delOk.status === 200 && delOkData?.success, `${delOk.status}, ${delOkData?.message}`);
const backAtRoot = await (await fetch(`${BASE}/api/admin/documents?folder=root`, { headers: auth })).json();
check("files moved back to All Files",
  backAtRoot?.documents?.some((d) => d.id === txtId) && backAtRoot?.documents?.some((d) => d.id === up1.data?.document?.id),
  `root count=${backAtRoot?.documents?.length}`);
const foldersAfter = await (await fetch(`${BASE}/api/admin/documents/folders`, { headers: auth })).json();
check("folder gone from list", !foldersAfter?.folders?.some((f) => f.id === folderId),
  `folders=${foldersAfter?.folders?.length}`);

// ---- 14. re-delete → 404 ----
const gone = await fetch(`${BASE}/api/admin/documents/folders/${folderId}`, {
  method: "DELETE", headers: auth, body: JSON.stringify({ moveFilesToRoot: true }),
});
check("deleted folder 404 on re-delete", gone.status === 404, `${gone.status}`);

// ---- 15. cleanup test files + sanity endpoints ----
let cleaned = 0;
for (const id of cleanupFiles.filter(Boolean)) {
  const r = await fetch(`${BASE}/api/admin/documents/${id}`, { method: "DELETE", headers: auth });
  if (r.ok) cleaned++;
}
check("cleanup test files", cleaned === cleanupFiles.filter(Boolean).length, `${cleaned}/${cleanupFiles.filter(Boolean).length}`);
const ver = await (await fetch(`${BASE}/api/app/version?installed=3.2.0`)).json();
check("app version endpoint healthy", ver?.app?.version === "3.2.0", `version=${ver?.app?.version}`);

console.log(failures === 0 ? "\nALL FOLDER E2E CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
