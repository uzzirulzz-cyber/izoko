import {organizationOperation} from "./organizationOperations.js";
import {studioAI} from "./organizationStudioAI.js";
import {RECORDS,RecordError,organizationRecords} from "./organizationRecords.js";
import {organizationCatalog,type CatalogWorkspace} from "./organizationCatalog.js";
import {
  organizationAIRoute,
  organizationAIFeatures,
} from "./organizationAI.js";
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
      await db.collection("organization_workspace_records").createIndex({workspace:1,createdBy:1,updatedAt:-1});
      await db.collection("organization_ai_runs").createIndex({projectId:1,startedAt:-1});
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
        features: organizationAIFeatures(process.env),
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
    const activePlayback = section === "heartbeat" && req.query.playing === "1" && ["stream","live","magxtv"].includes(String(req.query.workspace)) && workspaceScopes(user).includes(String(req.query.workspace));
    if (section !== "heartbeat" || activePlayback)
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
        features: organizationAIFeatures(process.env),
        serverTime: new Date(now).toISOString(),
      });
    if (["catalog-stream","catalog-live","catalog-magxtv"].includes(section) && req.method === "GET") {
      try {return res.json(await organizationCatalog(section.slice(8) as CatalogWorkspace,req.query));}
      catch {return res.status(503).json({error:"This service's channel catalog is unavailable. Its source has not returned a valid playable catalog.",workspace:section.slice(8)});}
    }
    if(req.method==="POST"&&["chat","gateway-chat","mystic-run","visual-assist"].includes(section)){
      const day=await strictLimit(db,"org-ai-day:"+s.email,200,86400);
      const organizationDay=await strictLimit(db,"org-ai-day:organization",1000,86400);
      if(!day.allowed||!organizationDay.allowed)return res.status(429).json({error:"The daily organization AI request allowance has been reached."});
    }
    if(req.method==="POST"&&section!=="heartbeat"&&!(await strictLimit(db,"org-write:"+s.email,60,60)).allowed)return res.status(429).json({error:"Too many changes. Please wait."});
    if(["inventory-adjust","order-status"].includes(section)&&req.method==="POST"){
      try{return res.json(await organizationOperation(db,section,user,body));}
      catch(error){if(error instanceof RecordError)return res.status(error.status).json({error:error.message});throw error;}
    }
    if(section==="mystic-runs"&&req.method==="GET"){
      const project=await db.collection<any>("organization_workspace_records").findOne({_id:String(req.query.projectId||""),workspace:"mystic",...(user.role==="admin"?{}:{createdBy:String(user.email||"").toLowerCase()})});
      if(!project)return res.status(404).json({error:"Project unavailable."});
      const runs=await db.collection<any>("organization_ai_runs").find({projectId:project._id}).sort({startedAt:-1}).limit(30).project({_id:0,prompt:0}).toArray();
      return res.json({items:runs.map(r=>({...r,status:r.status==="running"&&Date.now()-new Date(r.startedAt).getTime()>120000?"interrupted":r.status}))});
    }
    if(["mystic-run","visual-assist"].includes(section)&&req.method==="POST"){
      if(!(await strictLimit(db,"org-ai:"+s.email,12,60)).allowed)return res.status(429).json({error:"AI request limit reached. Please wait."});
      try{return res.json(await studioAI(db,section,user,body));}
      catch(error){if(error instanceof RecordError)return res.status(error.status).json({error:error.message});throw error;}
    }
    if(Object.prototype.hasOwnProperty.call(RECORDS,section)){
      try{return res.json(await organizationRecords(db,section as keyof typeof RECORDS,user,req.method||"GET",req.query,body));}
      catch(error){if(error instanceof RecordError)return res.status(error.status).json({error:error.message});throw error;}
    }
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
      const requestedModel = String(
        body.model || (gatefit ? "gpt-4.1-mini" : "gpt-4o-mini"),
      );
      let route: ReturnType<typeof organizationAIRoute>;
      try {
        route = organizationAIRoute(section, requestedModel, process.env);
      } catch (error) {
        return res
          .status(
            error instanceof Error && error.message === "MODEL_NOT_ALLOWED"
              ? 400
              : 503,
          )
          .json({
            error: "The requested model or AI provider is unavailable.",
          });
      }
      if (
        body.messages.some(
          (m: unknown) =>
            !m ||
            typeof m !== "object" ||
            !["user", "assistant", "system"].includes((m as any).role) ||
            typeof (m as any).content !== "string",
        )
      )
        return res
          .status(400)
          .json({ error: "Invalid conversation messages." });
      const response = await fetch(route.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...route.headers },
        body: JSON.stringify({
          model: route.model,
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
        meta: {
          model: route.model,
          provider: route.provider,
          status: response.status,
        },
      });
      const payload = await response
        .json()
        .catch(() => ({ error: "AI service returned an invalid response." }));
      return res
        .status(response.status)
        .json({
          ...payload,
          playbeat: { provider: route.provider, model: route.model },
        });
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
      inventory: "/api/admin/inventory",
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
