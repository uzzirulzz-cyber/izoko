import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { Query, Aggregator } from "mingo";
import {
  canReadSection,
  workspaceScopes,
  validDeviceId,
  WORKSPACES,
} from "../api/_lib/organizationPolicy.js";
process.env.SESSION_SECRET = "organization-local-test-only";
process.env.MONGODB_URI = "mongodb://localhost/test";
process.env.ADMIN_PASSWORD = "test-only";
const norm = (v: any): any =>
  v instanceof ObjectId
    ? v.toHexString()
    : v instanceof Date
      ? v
      : Array.isArray(v)
        ? v.map(norm)
        : v && typeof v === "object"
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, norm(x)]))
          : v;
class Collection {
  docs: any[] = [];
  fail = false;
  async createIndex() {}
  match(q: any) {
    return this.docs.filter((d) => new Query(norm(q)).test(d));
  }
  async findOne(q: any) {
    return this.match(q)[0] || null;
  }
  async insertOne(d: any) {
    this.docs.push({ _id: randomUUID(), ...norm(d) });
  }
  async deleteMany(q: any) {
    const found = this.match(q);
    this.docs = this.docs.filter((d) => !found.includes(d));
  }
  async updateOne(q: any, u: any, o: any = {}) {
    let d = this.match(q)[0],
      exists = !!d;
    if (!d && o.upsert) {
      d = { ...norm(q), ...norm(u.$setOnInsert || {}) };
      this.docs.push(d);
    }
    if (d) {
      Object.assign(d, norm(u.$set || {}));
      for (const k of Object.keys(u.$inc || {})) d[k] = (d[k] || 0) + u.$inc[k];
    }
    return { matchedCount: exists ? 1 : 0 };
  }
  async updateMany(q: any, u: any) {
    for (const d of this.match(q)) Object.assign(d, norm(u.$set || {}));
  }
  async findOneAndUpdate(q: any, u: any, o: any) {
    if (this.fail) throw Error("database unavailable");
    await this.updateOne(q, u, o);
    return this.match(q)[0];
  }
  find(q: any) {
    let d = this.match(q);
    const c: any = {
      project: (p: any) => {
        d = new Aggregator([{ $project: p }]).run(d);
        return c;
      },
      limit: (n: number) => {
        d = d.slice(0, n);
        return c;
      },
      toArray: async () => d,
    };
    return c;
  }
}
const cols = new Map<string, Collection>(),
  db = {
    collection: (n: string) => {
      if (!cols.has(n)) cols.set(n, new Collection());
      return cols.get(n)!;
    },
  };
(globalThis as any).__mongoClientP = Promise.resolve({ db: () => db });
const staffId = new ObjectId().toHexString(),
  device = randomUUID(),
  otherDevice = randomUUID();
const staff = {
  _id: staffId,
  role: "staff",
  email: "staff@example.test",
  name: "Staff",
  active: true,
  permissions: ["orders"],
  organizationScopes: ["digital"],
  password: "never-return-this",
};
db.collection("users").docs.push(staff);
let reads = 0;
globalThis.fetch = (async (url: any, options: any) => {
  if (new URL(url).pathname.startsWith("/api/auth/")) {
    const c = JSON.parse(options.body);
    return Response.json({
      token: "legacy-token-must-stay-on-server",
      admin:
        c.email === staff.email
          ? { id: staffId, ...staff }
          : { email: "owner@example.test", name: "Owner", role: "admin" },
    });
  }
  reads++;
  return Response.json({
    success: true,
    orders: [],
    stats: { totalOrders: 0 },
  });
}) as any;
const { default: handler } = await import("../api/organization/index.js");
async function request(section: string, token = "", body?: any, id = device) {
  let status = 200,
    data: any;
  const res: any = {
    setHeader() {},
    status(n: number) {
      status = n;
      return this;
    },
    json(d: any) {
      data = d;
      return this;
    },
  };
  await handler(
    {
      method: body ? "POST" : "GET",
      query: { section },
      body,
      headers: {
        "x-playbeat-device": id,
        authorization: "Bearer " + token,
        "x-real-ip": randomUUID(),
      },
    } as any,
    res,
  );
  return { status, data };
}
assert.deepEqual(workspaceScopes({ role: "admin" }), [...WORKSPACES]);
assert.deepEqual(
  workspaceScopes({ role: "customer", organizationScopes: ["digital"] }),
  [],
);
for (const section of [
  "people",
  "devices",
  "audit",
  "staff-create",
  "staff-update",
  "staff-scopes",
  "revoke-device",
])
  assert.equal(canReadSection(staff, section), false, section);
assert.equal(canReadSection(staff, "orders"), true);
assert.equal(canReadSection(staff, "stats"), false);
assert.equal(
  canReadSection({ ...staff, organizationScopes: [] }, "orders"),
  false,
);
assert.equal(validDeviceId("------------------------------------"), false);
assert.equal(validDeviceId(device), true);
assert.equal((await request("profile")).status, 401);
const login = await request("login", "", {
  email: staff.email,
  password: "test-only",
});
assert.equal(login.status, 200);
const token = login.data.token;
assert.match(token, /^pborg_/);
assert.equal(JSON.stringify(login.data).includes("legacy-token"), false);
const session = db.collection("organization_mobile_sessions").docs[0];
assert.notEqual(session.tokenHash, token);
assert.equal(session.backingToken.includes("legacy-token"), false);
assert.equal(
  (await request("profile", token, undefined, otherDevice)).status,
  401,
);
assert.equal((await request("orders", token)).status, 200);
const before = reads;
assert.equal((await request("stats", token)).status, 403);
assert.equal(reads, before);
staff.permissions = [];
assert.equal((await request("orders", token)).status, 403);
staff.permissions = ["orders"];
staff.organizationScopes = [];
assert.equal((await request("orders", token)).status, 403);
staff.organizationScopes = ["digital"];
staff.active = false;
assert.equal((await request("profile", token)).status, 403);
staff.active = true;
assert.equal((await request("profile", token)).status, 401);
const token2 = (
  await request("login", "", { email: staff.email, password: "test-only" })
).data.token;
db.collection("admin_app_devices").docs[0].revoked = true;
assert.equal((await request("orders", token2)).status, 403);
assert.equal(
  (await request("login", "", { email: staff.email, password: "test-only" }))
    .status,
  403,
);
db.collection("admin_app_devices").docs[0].revoked = false;
const fresh = db.collection("organization_mobile_sessions").docs[0];
fresh.lastSeen = new Date(Date.now() - 31 * 60000);
assert.equal((await request("orders", token2)).status, 401);
fresh.lastSeen = new Date();
fresh.expiresAt = new Date(Date.now() - 1);
assert.equal((await request("profile", token2)).status, 401);
const owner = await request("login", "", {
  mode: "owner-pin",
  pin: "test-only",
});
assert.equal(owner.status, 200);
const ot = owner.data.token,
  people = await request("people", ot);
assert.equal(people.status, 200);
assert.equal(JSON.stringify(people.data).includes("never-return-this"), false);
assert.equal(
  (
    await request("staff-scopes", ot, {
      userId: staffId,
      workspaces: ["invalid"],
    })
  ).status,
  400,
);
assert.equal(
  (
    await request("staff-scopes", ot, {
      userId: staffId,
      workspaces: ["gatefit"],
    })
  ).status,
  200,
);
assert.deepEqual(staff.organizationScopes, ["gatefit"]);
assert.equal(
  (await request("revoke-device", ot, { deviceId: device, revoked: true }))
    .status,
  200,
);
assert.equal((await request("profile", ot)).status, 401);
db.collection("organization_rate_limits").fail = true;
assert.equal(
  (
    await request(
      "login",
      "",
      { email: staff.email, password: "test-only" },
      randomUUID(),
    )
  ).status,
  503,
);
console.log(
  "Organization checks passed: role and workspace isolation, fresh permissions, device binding/revocation, deactivation, expiry, encrypted/opaque sessions, directory sanitization, fail-closed rate limiting.",
);
