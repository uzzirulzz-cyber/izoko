import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./mongo.js";
import { MODULE_PERMISSIONS } from "./auth.js";
import { SESSION_SECRET } from "./config.js";
import { clientIp } from "./rateLimit.js";
import { writeAudit } from "./audit.js";
import type { OrganizationAccount } from "./organizationPolicy.js";
import {
  WORKSPACES,
  workspaceScopes,
  canReadSection,
  validDeviceId,
} from "./organizationPolicy.js";
let indexesReady = false;
const ORIGIN = "https://playbeat.digital";
const HOURS = 8 * 60 * 60 * 1000,
  IDLE = 30 * 60 * 1000;
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
function seal(text: string) {
  const iv = randomBytes(12),
    key = createHash("sha256")
      .update(SESSION_SECRET + "|organization")
      .digest(),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([
    iv,
    cipher.update(text, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
function unseal(text: string) {
  const value = Buffer.from(text, "base64"),
    key = createHash("sha256")
      .update(SESSION_SECRET + "|organization")
      .digest(),
    d = createDecipheriv("aes-256-gcm", key, value.subarray(0, 12));
  d.setAuthTag(value.subarray(-16));
  return Buffer.concat([d.update(value.subarray(12, -16)), d.final()]).toString(
    "utf8",
  );
}
async function strictLimit(
  db: any,
  key: string,
  max: number,
  windowSec: number,
) {
  const now = Date.now(),
    bucket = Math.floor(now / (windowSec * 1000));
  const hit = await db.collection("organization_rate_limits").findOneAndUpdate(
    { _id: key + ":" + bucket },
    {
      $inc: { count: 1 },
      $set: { expiresAt: new Date(now + windowSec * 2000) },
    },
    { upsert: true, returnDocument: "after" },
  );
  return { allowed: Number(hit?.count || 0) > 0 && Number(hit.count) <= max };
}
async function upstream(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
) {
  const r = await fetch(ORIGIN + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "X-Playbeat-Client": "organization-android",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "error",
    signal: AbortSignal.timeout(45000),
  });
  return {
    status: r.status,
    body: await r
      .json()
      .catch(() => ({ error: "Source response unavailable." })),
  };
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!SESSION_SECRET)
    return res
      .status(503)
      .json({ error: "Organization authentication is not configured." });
  const section = String(req.query.section || "profile");
  const deviceId = String(req.headers["x-playbeat-device"] || "");
  if (!validDeviceId(deviceId))
    return res
      .status(400)
      .json({ error: "A valid organization device identifier is required." });
  try {
    const db = await getDb();
    const sessions = db.collection("organization_mobile_sessions"),
      devices = db.collection("admin_app_devices");
    if (!indexesReady) {
      await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await sessions.createIndex({ tokenHash: 1 }, { unique: true });
      await db
        .collection("organization_rate_limits")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      indexesReady = true;
    }
    let body = req.body || {};
    try {
      if (typeof body === "string") body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid request." });
    }
    if (section === "login" && req.method === "POST") {
      if (JSON.stringify(body).length > 3000)
        return res.status(413).json({ error: "Request too large." });
      const limit = await strictLimit(
        db,
        "org-login:" + clientIp(req as any),
        5,
        900,
      );
      if (!limit.allowed)
        return res
          .status(429)
          .json({ error: "Please wait before trying again." });
      const device = await devices.findOne({ deviceId });
      if (device?.revoked)
        return res.status(403).json({
          error: "This device is revoked. Contact the organization owner.",
        });
      const ownerPin = body.mode === "owner-pin";
      if (
        !ownerPin &&
        String(body.email || "")
          .trim()
          .toLowerCase() ===
          (process.env.ADMIN_EMAIL || "admin@playbeat.digital").toLowerCase() &&
        !process.env.ADMIN_PASSWORD
      ) {
        const profile = await db
          .collection("admin_profiles")
          .findOne({ email: String(body.email).trim().toLowerCase() });
        if (!profile?.passwordOverride)
          return res.status(503).json({
            error:
              "Named owner sign-in requires a configured owner password. Use owner PIN access.",
          });
      }
      const auth = await fetch(
        ORIGIN +
          (ownerPin ? "/api/auth/admin/shared-pin" : "/api/auth/admin/login"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: ORIGIN },
          body: JSON.stringify(
            ownerPin
              ? { pin: String(body.pin || "") }
              : {
                  email: String(body.email || ""),
                  password: String(body.password || ""),
                },
          ),
          redirect: "error",
          signal: AbortSignal.timeout(20000),
        },
      );
      const login = await auth.json().catch(() => null);
      if (!auth.ok || !login?.token || !login?.admin)
        return res
          .status(auth.status >= 400 ? auth.status : 401)
          .json({ error: login?.error || "Sign-in failed." });
      const admin = login.admin;
      if (!["admin", "staff"].includes(admin.role))
        return res.status(403).json({ error: "Organization accounts only." });
      const user = admin.id
        ? await db.collection("users").findOne({
            _id: new ObjectId(admin.id),
            active: { $ne: false },
            role: admin.role,
          })
        : admin;
      if (!user)
        return res.status(403).json({ error: "Staff account is inactive." });
      const now = new Date(),
        opaque = "pborg_" + randomBytes(32).toString("base64url");
      await sessions.deleteMany({ deviceId });
      await sessions.insertOne({
        tokenHash: digest(opaque),
        deviceId,
        userId: admin.id || null,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        backingToken: seal(login.token),
        issuedAt: now,
        lastSeen: now,
        expiresAt: new Date(now.getTime() + HOURS),
        revoked: false,
      });
      await devices.updateOne(
        { deviceId },
        {
          $set: {
            adminEmail: admin.email,
            adminName: admin.name,
            adminRole: admin.role,
            appVersion: "Playbeat One 0.1",
            deviceModel: String(body.deviceModel || "Android").slice(0, 80),
            androidVersion: String(body.androidVersion || "").slice(0, 20),
            lastSeenAt: now,
          },
          $setOnInsert: { firstSeenAt: now, revoked: false },
        },
        { upsert: true },
      );
      await writeAudit(db, {
        actor: admin,
        action: "organization.session.login",
        targetType: "device",
        targetId: deviceId,
        meta: { method: ownerPin ? "owner-pin" : "individual-account" },
      });
      return res.json({
        success: true,
        token: opaque,
        admin: {
          email: admin.email,
          name: admin.name,
          role: admin.role,
          permissions: user.permissions || [],
          workspaces: workspaceScopes(user),
        },
        features: { gatefit: !!process.env.ORGANIZATION_GATEFIT_KEY },
        expiresAt: new Date(now.getTime() + HOURS).toISOString(),
      });
    }
    const authorization = String(req.headers.authorization || ""),
      token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!/^pborg_[A-Za-z0-9_-]{40,60}$/.test(token))
      return res.status(401).json({ error: "Organization session required." });
    const now = Date.now(),
      s = await sessions.findOne({
        tokenHash: digest(token),
        deviceId,
        revoked: false,
        expiresAt: { $gt: new Date(now) },
      });
    if (!s || now - new Date(s.lastSeen).getTime() > IDLE)
      return res.status(401).json({ error: "Session expired. Sign in again." });
    const device = await devices.findOne({ deviceId });
    if (!device || device.revoked)
      return res.status(403).json({ error: "Device access revoked." });
    const user = s.userId
      ? await db.collection<OrganizationAccount>("users").findOne({
          _id: new ObjectId(String(s.userId)),
          active: { $ne: false },
          role: s.role,
        })
      : { role: "admin", permissions: ["all"], email: s.email, name: s.name };
    if (!user) {
      await sessions.updateOne({ _id: s._id }, { $set: { revoked: true } });
      return res.status(403).json({ error: "Account access revoked." });
    }
    if (section === "logout" && req.method === "POST") {
      await sessions.updateOne({ _id: s._id }, { $set: { revoked: true } });
      await writeAudit(db, {
        actor: user,
        action: "organization.session.logout",
        targetType: "device",
        targetId: deviceId,
      });
      return res.json({ ok: true });
    }
    if (!canReadSection(user, section))
      return res
        .status(403)
        .json({ error: "Your assigned role does not permit this action." });
    if (section !== "heartbeat")
      await sessions.updateOne(
        { _id: s._id },
        { $set: { lastSeen: new Date(now) } },
      );
    await devices.updateOne(
      { deviceId },
      { $set: { lastSeenAt: new Date(now) } },
    );
    if (
      (section === "profile" || section === "heartbeat") &&
      req.method === "GET"
    )
      return res.json({
        success: true,
        admin: {
          name: user.name || s.name,
          email: user.email || s.email,
          role: user.role,
          permissions: user.permissions || [],
          workspaces: workspaceScopes(user),
        },
        features: { gatefit: !!process.env.ORGANIZATION_GATEFIT_KEY },
        serverTime: new Date(now).toISOString(),
      });
    if (section === "people" && req.method === "GET") {
      const people = await db
        .collection("users")
        .find({ role: { $in: ["admin", "staff"] } })
        .project({
          name: 1,
          email: 1,
          role: 1,
          active: 1,
          permissions: 1,
          organizationScopes: 1,
          department: 1,
        })
        .limit(200)
        .toArray();
      return res.json({
        success: true,
        people: people.map((p) => ({
          ...p,
          id: String(p._id),
          workspaces: workspaceScopes(p),
        })),
      });
    }
    if (section === "staff-scopes" && req.method === "POST") {
      if (
        !ObjectId.isValid(body.userId) ||
        !Array.isArray(body.workspaces) ||
        body.workspaces.some(
          (v: unknown) =>
            typeof v !== "string" ||
            !(WORKSPACES as readonly string[]).includes(v),
        )
      )
        return res.status(400).json({ error: "Invalid staff scopes." });
      const target = await db
        .collection("users")
        .findOne({ _id: new ObjectId(body.userId), role: "staff" });
      if (!target)
        return res.status(404).json({ error: "Staff account not found." });
      await db.collection("users").updateOne(
        { _id: target._id },
        {
          $set: {
            organizationScopes: [...new Set(body.workspaces)],
            updatedAt: new Date(),
          },
        },
      );
      await writeAudit(db, {
        actor: user,
        action: "organization.staff.scopes",
        targetType: "staff",
        targetId: body.userId,
        meta: { workspaces: body.workspaces },
      });
      return res.json({ ok: true });
    }
    if (section === "revoke-device" && req.method === "POST") {
      if (!validDeviceId(body.deviceId) || typeof body.revoked !== "boolean")
        return res.status(400).json({ error: "Invalid device action." });
      const changed = await devices.updateOne(
        { deviceId: body.deviceId },
        { $set: { revoked: body.revoked } },
      );
      if (!changed.matchedCount)
        return res.status(404).json({ error: "Device not found." });
      if (body.revoked)
        await sessions.updateMany(
          { deviceId: body.deviceId },
          { $set: { revoked: true } },
        );
      await writeAudit(db, {
        actor: user,
        action: "organization.device." + (body.revoked ? "revoke" : "restore"),
        targetType: "device",
        targetId: body.deviceId,
      });
      return res.json({ ok: true });
    }
    if (
      (section === "chat" || section === "gateway-chat") &&
      req.method === "POST"
    ) {
      const limit = await strictLimit(db, "org-ai:" + s.email, 12, 60);
      if (!limit.allowed)
        return res
          .status(429)
          .json({ error: "AI request limit reached. Please wait." });
      if (
        !Array.isArray(body.messages) ||
        !body.messages.length ||
        body.messages.length > 30 ||
        JSON.stringify(body.messages).length > 40000
      )
        return res.status(400).json({ error: "Invalid conversation." });
      const gatefit = section === "chat";
      if (gatefit && !process.env.ORGANIZATION_GATEFIT_KEY)
        return res
          .status(503)
          .json({ error: "Organization AI service is not provisioned." });
      const upstreamUrl = gatefit
        ? "https://gatefit.playbeat.digital/v1/chat/completions"
        : "https://gateway.playbeat.live/api/v1/chat/completions";
      const response = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(gatefit
            ? {
                Authorization: "Bearer " + process.env.ORGANIZATION_GATEFIT_KEY,
              }
            : {}),
        },
        body: JSON.stringify({
          model: String(body.model || "gpt-4.1-mini"),
          messages: body.messages,
          stream: false,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(45000),
        redirect: "error",
      });
      await writeAudit(db, {
        actor: user,
        action: "organization.ai.request",
        targetType: gatefit ? "gatefit" : "gateway",
        meta: { model: String(body.model), status: response.status },
      });
      return res.status(response.status).json(
        await response.json().catch(() => ({
          error: "AI service returned an invalid response.",
        })),
      );
    }
    if (
      (section === "staff-create" || section === "staff-update") &&
      req.method === "POST"
    ) {
      const create = section === "staff-create";
      if (
        JSON.stringify(body).length > 5000 ||
        (create && (!body.name || !body.email || !body.password))
      )
        return res
          .status(400)
          .json({ error: "Name, email and password are required." });
      if (
        body.password &&
        (typeof body.password !== "string" ||
          body.password.length < 12 ||
          body.password.length > 128)
      )
        return res
          .status(400)
          .json({ error: "Use a password between 12 and 128 characters." });
      if (
        body.permissions &&
        (!Array.isArray(body.permissions) ||
          body.permissions.some(
            (v: unknown) =>
              !(MODULE_PERMISSIONS as readonly unknown[]).includes(v),
          ))
      )
        return res.status(400).json({ error: "Invalid data permissions." });
      if (
        !create &&
        (!ObjectId.isValid(body.userId) ||
          !(await db
            .collection("users")
            .findOne({ _id: new ObjectId(body.userId), role: "staff" })))
      )
        return res.status(404).json({ error: "Staff account not found." });
      const input = create
        ? {
            name: String(body.name).slice(0, 100),
            email: String(body.email).slice(0, 254),
            password: body.password,
            authority: "supervisor",
            permissions: body.permissions?.length
              ? body.permissions
              : ["orders"],
          }
        : {
            userId: body.userId,
            ...(typeof body.active === "boolean"
              ? { active: body.active }
              : {}),
            ...(body.password ? { password: body.password } : {}),
            ...(body.permissions ? { permissions: body.permissions } : {}),
          };
      const result = await upstream(
        "/api/admin/staff/" + (create ? "create" : "update"),
        unseal(s.backingToken),
        "POST",
        input,
      );
      if (result.status >= 200 && result.status < 300) {
        if (!create && (body.active === false || body.password))
          await sessions.updateMany(
            { userId: body.userId },
            { $set: { revoked: true } },
          );
        await writeAudit(db, {
          actor: user,
          action: create
            ? "organization.staff.create"
            : "organization.staff.update",
          targetType: "staff",
          targetId: create ? String(body.email) : body.userId,
          meta: {
            ...(body.permissions ? { permissions: body.permissions } : {}),
            ...(typeof body.active === "boolean"
              ? { active: body.active }
              : {}),
            passwordChanged: !!body.password,
          },
        });
      }
      return res.status(result.status).json(result.body);
    }
    const routes: Record<string, string> = {
      stats: "/api/admin/stats",
      orders: "/api/admin/orders?limit=30",
      products: "/api/products?limit=30",
      live: "/api/admin/playbeat-live",
      devices: "/api/admin/app/devices",
      audit: "/api/admin/audit-logs?limit=50",
    };
    if (req.method === "GET" && routes[section]) {
      const result = await upstream(routes[section], unseal(s.backingToken));
      return res.status(result.status).json(result.body);
    }
    return res.status(405).json({ error: "Unsupported organization action." });
  } catch {
    return res
      .status(503)
      .json({ error: "Organization service unavailable. Please retry." });
  }
}
