// Payment-gateway runtime configuration — DB-backed, encrypted at rest.
//
// WHY: gateway credentials (Rapid secret key, webhook signing salt) used to
// live only in Vercel environment variables, which requires a redeploy to
// change and cannot be managed by IT staff. This module stores them in the
// `gateway_config` Mongo collection, AES-256-GCM encrypted with a key derived
// from SESSION_SECRET (never stored alongside the data). Values configured
// here OVERRIDE the env vars at runtime; env vars remain the bootstrap
// fallback so existing deployments keep working unchanged.
//
//   plaintext never leaves the server — reads return MASKED values only.
//   DB unavailable / SESSION_SECRET missing → env fallback, fail-closed.
//
// Collection shape (single doc per gateway):
//   { key: "rapid", secretKeyEnc, webhookSaltEnc, webhookSaltPrevEnc,
//     apiBase, methods, updatedBy, updatedAt, createdAt }

import crypto from "crypto";
import { getDb } from "./mongo.js";
import { SESSION_SECRET, PUBLIC_SITE_URL } from "./config.js";

const COLL = "gateway_config";
const AUDIT_COLL = "gateway_config_audit";
const DOC_KEY = "rapid";
const CACHE_MS = 30_000;

export interface RapidRuntimeConfig {
  secretKey: string;
  webhookSalt: string;
  webhookSaltPrev: string;
  apiBase: string;
  methods: string[];
  webhookUrl: string;
  sources: Record<string, "database" | "environment" | "none">;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface GatewayConfigPatch {
  secretKey?: string;
  webhookSalt?: string;
  webhookSaltPrev?: string;
  apiBase?: string;
  methods?: string;
  clear?: string[]; // field names to remove ("secretKey" | "webhookSalt" | "webhookSaltPrev")
}

// ---------------------------------------------------------------------------
// AES-256-GCM — key derived from SESSION_SECRET (server-side only).
// Payload format: v1.<iv b64>.<authTag b64>.<ciphertext b64>
// ---------------------------------------------------------------------------
function encryptionKey(): Buffer | null {
  if (!SESSION_SECRET) return null; // fail-closed: no key material
  return crypto.createHash("sha256").update(`playbeat:gateway:v1:${SESSION_SECRET}`).digest();
}

function encryptSecret(plain: string): string | null {
  const key = encryptionKey();
  if (!key || !plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function decryptSecret(payload: any): string {
  const key = encryptionKey();
  if (!key || !payload || typeof payload !== "string") return "";
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return "";
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(parts[1], "base64")
    );
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // wrong SESSION_SECRET (rotated?) or corrupted payload — treat as unset
    return "";
  }
}

/** "••••1234" style mask — safe to return to the admin UI. */
export function maskSecret(value: string): string {
  if (!value) return "";
  const tail = value.slice(-4);
  return `${"•".repeat(Math.min(12, Math.max(4, value.length - 4)))}${tail}`;
}

// ---------------------------------------------------------------------------
// Runtime resolution (DB override → env fallback), cached ~30s per instance.
// ---------------------------------------------------------------------------
let cache: { at: number; value: RapidRuntimeConfig } | null = null;

function envDefaults() {
  return {
    secretKey: process.env.RAPID_SECRET_KEY || "",
    webhookSalt: process.env.RAPID_WEBHOOK_SECRET || "",
    webhookSaltPrev: process.env.RAPID_WEBHOOK_SECRET_PREVIOUS || "",
    apiBase: (process.env.RAPID_API_BASE || "https://api.rapidgateway.pk").replace(/\/+$/, ""),
    methods: (process.env.RAPID_METHODS || "easypaisa,jazzcash,card")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
  };
}

export async function getRapidConfig(force = false): Promise<RapidRuntimeConfig> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const env = envDefaults();
  let dbDoc: any = null;
  try {
    const db = await getDb();
    dbDoc = await db.collection(COLL).findOne({ key: DOC_KEY });
  } catch {
    dbDoc = null; // DB unreachable → env fallback
  }

  const dbSecret = (field: string) => decryptSecret(dbDoc?.[field]);
  const pick = (dbValue: string, envValue: string): "database" | "environment" | "none" => {
    if (dbValue) return "database";
    if (envValue) return "environment";
    return "none";
  };

  const secretKey = dbSecret("secretKeyEnc") || env.secretKey;
  const webhookSalt = dbSecret("webhookSaltEnc") || env.webhookSalt;
  const webhookSaltPrev = dbSecret("webhookSaltPrevEnc") || env.webhookSaltPrev;
  const apiBase = String(dbDoc?.apiBase || env.apiBase).replace(/\/+$/, "");
  const methods = Array.isArray(dbDoc?.methods) && dbDoc.methods.length
    ? dbDoc.methods.map((m: any) => String(m))
    : env.methods;

  const value: RapidRuntimeConfig = {
    secretKey,
    webhookSalt,
    webhookSaltPrev,
    apiBase,
    methods,
    webhookUrl: `${PUBLIC_SITE_URL.replace(/\/+$/, "")}/webhooks/rapid-gateway`,
    sources: {
      secretKey: pick(dbSecret("secretKeyEnc"), env.secretKey),
      webhookSalt: pick(dbSecret("webhookSaltEnc"), env.webhookSalt),
      webhookSaltPrev: pick(dbSecret("webhookSaltPrevEnc"), env.webhookSaltPrev),
      apiBase: dbDoc?.apiBase ? "database" : "environment",
      methods: Array.isArray(dbDoc?.methods) && dbDoc.methods.length ? "database" : "environment",
    },
    updatedBy: dbDoc?.updatedBy || null,
    updatedAt: dbDoc?.updatedAt || null,
  };

  cache = { at: Date.now(), value };
  return value;
}

/** Masked, UI-safe status snapshot (no plaintext secrets ever). */
export async function describeGatewayStatus() {
  const cfg = await getRapidConfig();
  return {
    gateway: "rapid",
    configured: {
      secretKey: Boolean(cfg.secretKey),
      webhookSalt: Boolean(cfg.webhookSalt),
      webhookSaltPrev: Boolean(cfg.webhookSaltPrev),
    },
    masked: {
      secretKey: maskSecret(cfg.secretKey),
      webhookSalt: maskSecret(cfg.webhookSalt),
      webhookSaltPrev: maskSecret(cfg.webhookSaltPrev),
    },
    apiBase: cfg.apiBase,
    methods: cfg.methods,
    webhookUrl: cfg.webhookUrl,
    sources: cfg.sources,
    updatedBy: cfg.updatedBy,
    updatedAt: cfg.updatedAt,
  };
}

/**
 * Persist a configuration patch. Secrets are encrypted before storage;
 * empty/undefined secret fields keep their current value, `clear` removes them.
 * Every change is appended to gateway_config_audit (who/when/what — never values).
 */
export async function saveRapidConfig(
  patch: GatewayConfigPatch,
  updatedBy: string
): Promise<void> {
  const db = await getDb();
  const col = db.collection(COLL);

  const set: Record<string, any> = {};
  const unset: Record<string, any> = {};
  const changed: string[] = [];

  const enc = (field: string, value?: string) => {
    if (!(field in (patch as any))) return;
    const trimmed = String(value ?? "").trim();
    const encVal = trimmed ? encryptSecret(trimmed) : null;
    if (trimmed && encVal) {
      set[field] = encVal;
      changed.push(field);
    }
  };
  enc("secretKeyEnc", patch.secretKey);
  enc("webhookSaltEnc", patch.webhookSalt);
  enc("webhookSaltPrevEnc", patch.webhookSaltPrev);

  for (const field of patch.clear || []) {
    if (field === "secretKey") { unset.secretKeyEnc = ""; changed.push("secretKey (cleared)"); }
    if (field === "webhookSalt") { unset.webhookSaltEnc = ""; changed.push("webhookSalt (cleared)"); }
    if (field === "webhookSaltPrev") { unset.webhookSaltPrevEnc = ""; changed.push("webhookSaltPrev (cleared)"); }
  }

  if (typeof patch.apiBase === "string") {
    const cleaned = patch.apiBase.trim().replace(/\/+$/, "");
    if (cleaned && /^https:\/\/.+/i.test(cleaned)) {
      set.apiBase = cleaned;
      changed.push("apiBase");
    } else if (!cleaned) {
      unset.apiBase = ""; // reset to env default
      changed.push("apiBase (reset to default)");
    }
  }
  if (typeof patch.methods === "string") {
    const list = patch.methods.split(",").map((m) => m.trim()).filter(Boolean);
    if (list.length) {
      set.methods = list;
      changed.push("methods");
    }
  }

  if (Object.keys(set).length) {
    set.updatedBy = updatedBy;
    set.updatedAt = new Date();
  }
  const update: any = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;

  if (Object.keys(update).length) {
    await col.updateOne({ key: DOC_KEY }, { ...update, $setOnInsert: { key: DOC_KEY, createdAt: new Date() } }, { upsert: true });
  }

  // Audit trail — metadata only, never secret values.
  try {
    await db.collection(AUDIT_COLL).insertOne({
      gateway: DOC_KEY,
      action: "update",
      changed,
      updatedBy,
      at: new Date(),
    });
  } catch {
    /* audit must never block the save */
  }

  cache = null; // invalidate — next read picks up the new values
}
