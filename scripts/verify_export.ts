// verify_export.ts — re-verify export CSV/JSON through the handler with a
// complete response mock (send() included), plus one PSI retry.
import jwt from "jsonwebtoken";
import { readFileSync } from "fs";
import path from "path";

process.env.SESSION_SECRET = process.env.SESSION_SECRET || "local-audit-harness-secret";
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "harness@playbeat.local";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "harness-local";
const uriMatch = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/);
process.env.MONGODB_URI = process.env.MONGODB_URI || uriMatch![1];
process.env.MONGODB_DB_NAME = "playbeat";

const { default: handler } = await import("../api/admin/index.ts");
const token = jwt.sign({ email: process.env.ADMIN_EMAIL, role: "admin" }, process.env.SESSION_SECRET!, { expiresIn: "2h" });

function makeRes() {
  const res: any = {
    statusCode: 200, headers: {}, body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; return this; },
    json(p: any) { this.body = p; return this; },
    send(p?: any) { this.body = p; return this; },
    end(p?: any) { this.body = p ?? this.body; return this; },
  };
  return res;
}
async function call(method: string, route: string, body?: any) {
  const req: any = { method, url: `https://playbeat.digital/api/admin/${route}`, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, query: {}, body: body || {} };
  const res = makeRes();
  await handler(req, res);
  return { status: res.statusCode, body: res.body, headers: res.headers };
}

// CSV export (latest completed run)
const csv = await call("POST", "seo/audit", { action: "export", format: "csv" });
const csvText = typeof csv.body === "string" ? csv.body : "";
const lines = csvText.trim().split("\n");
console.log("CSV status:", csv.status, "content-type:", csv.headers["Content-Type"], "lines:", lines.length);
console.log("CSV header:", lines[0].slice(0, 120));
console.log("CSV row1:", lines[1]?.slice(0, 140));

const json = await call("POST", "seo/audit", { action: "export", format: "json" });
const parsed = typeof json.body === "string" ? JSON.parse(json.body) : null;
console.log("JSON status:", json.status, "pages:", parsed?.run?.pages?.length, "score:", parsed?.run?.score?.total);

// PSI retry (quota may reset at midnight PT)
const psi = await call("POST", "seo/audit", { action: "pagespeed", strategy: "mobile" });
console.log("PSI mobile retry:", psi.body?.pagespeed?.available ? `LCP=${psi.body.pagespeed.lab.lcpMs}ms` : `still unavailable — ${String(psi.body.pagespeed?.reason).slice(0, 80)}`);
process.exit(0);
