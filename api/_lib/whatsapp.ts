// WhatsApp Cloud API configuration + send helper (mirrors trackingConfig.ts).
//
// Resolution order: a document in the `whatsapp_config` Mongo collection
// (set from the admin WhatsApp panel) overrides WHATSAPP_* build-time env
// vars. The access token is a SECRET — it is never returned unmasked by any
// API route; only a masked preview (first 6 + last 4) reaches the admin UI.
// A 30-second in-process cache keeps hot config reads cheap.
import { getDb } from "./mongo.js";

export type WhatsAppConfig = {
  phoneNumberId: string; // WhatsApp Business phone number id
  wabaId: string; // WhatsApp Business Account id
  accessToken: string; // Cloud API bearer token (SECRET)
  graphVersion: string; // Graph API version, e.g. "v25.0"
};

export type WhatsAppSource = {
  phoneNumberId: "db" | "env" | "none";
  wabaId: "db" | "env" | "none";
  accessToken: "db" | "env" | "none";
  graphVersion: "db" | "env" | "none";
};

const CACHE_TTL_MS = 30_000;
let cache: { value: WhatsAppConfig; source: WhatsAppSource; at: number } | null = null;

const ID_PATTERN = /^\d{6,25}$/; // phone-number-id / waba-id are numeric strings
const VERSION_PATTERN = /^v\d{2}\.\d{2}$/;

function envConfig(): WhatsAppConfig {
  return {
    phoneNumberId: (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim(),
    wabaId: (process.env.WHATSAPP_WABA_ID || "").trim(),
    accessToken: (process.env.WHATSAPP_ACCESS_TOKEN || "").trim(),
    graphVersion: (process.env.WHATSAPP_GRAPH_VERSION || "v25.0").trim(),
  };
}

/** Validate + normalize an admin-submitted config patch. Throws on bad IDs. */
export function sanitizeWhatsAppPatch(body: Record<string, any>): Partial<WhatsAppConfig> {
  const out: Partial<WhatsAppConfig> = {};
  for (const key of ["phoneNumberId", "wabaId"] as const) {
    if (typeof body[key] !== "string") continue;
    const v = body[key].trim();
    if (v === "") {
      out[key] = ""; // explicit clear
      continue;
    }
    if (!ID_PATTERN.test(v)) throw new Error(`Invalid format for ${key}: "${v}" — expected a numeric ID.`);
    out[key] = v;
  }
  if (typeof body.accessToken === "string") {
    const v = body.accessToken.trim();
    // tokens are opaque — only length sanity
    if (v === "") out.accessToken = "";
    else if (v.length < 40 || v.length > 1024) throw new Error("Invalid access token length — paste the full token from the Meta console.");
    else out.accessToken = v;
  }
  if (typeof body.graphVersion === "string") {
    const v = body.graphVersion.trim();
    if (v === "") out.graphVersion = "";
    else if (!VERSION_PATTERN.test(v)) throw new Error(`Invalid graphVersion: "${v}" — expected e.g. v25.0`);
    else out.graphVersion = v;
  }
  return out;
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 12) return token.slice(0, 2) + "…";
  return `${token.slice(0, 6)}…${token.slice(-4)} (${token.length} chars)`;
}

export async function getWhatsAppConfig(force = false): Promise<{
  config: WhatsAppConfig;
  source: WhatsAppSource;
}> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { config: cache.value, source: cache.source };
  }

  const env = envConfig();
  let dbDoc: any = null;
  try {
    const db = await getDb();
    dbDoc = await db.collection("whatsapp_config").findOne({ key: "active" });
  } catch {
    dbDoc = null; // DB unavailable — env-only fallback
  }

  const config: WhatsAppConfig = { ...env };
  const source: WhatsAppSource = {
    phoneNumberId: env.phoneNumberId ? "env" : "none",
    wabaId: env.wabaId ? "env" : "none",
    accessToken: env.accessToken ? "env" : "none",
    graphVersion: "env",
  };

  if (dbDoc && typeof dbDoc === "object") {
    for (const key of ["phoneNumberId", "wabaId", "accessToken", "graphVersion"] as const) {
      const v = dbDoc[key];
      if (typeof v === "string" && v.trim() !== "") {
        (config as any)[key] = v.trim();
        (source as any)[key] = "db";
      } else if (v === "") {
        (config as any)[key] = "";
        (source as any)[key] = "db";
      }
    }
  }

  cache = { value: config, source, at: Date.now() };
  return { config, source };
}

export async function saveWhatsAppConfig(patch: Partial<WhatsAppConfig>, actor: string) {
  const db = await getDb();
  const col = db.collection("whatsapp_config");
  await col.updateOne(
    { key: "active" },
    { $set: { ...patch, updatedAt: new Date(), updatedBy: actor } },
    { upsert: true }
  );
  await db.collection("whatsapp_config_audit").insertOne({
    at: new Date(),
    actor,
    keys: Object.keys(patch),
    patch: { ...patch, accessToken: patch.accessToken ? "***stored***" : undefined },
  });
  cache = null; // invalidate
  return getWhatsAppConfig(true);
}

/** Send a Cloud API message. Returns the Graph API response JSON. */
export async function sendWhatsAppMessage(
  cfg: WhatsAppConfig,
  payload: Record<string, any>
): Promise<{ ok: boolean; status: number; body: any }> {
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { ok: false, status: 400, body: { error: "WhatsApp is not configured — set Phone Number ID and access token first." } };
  }
  const url = `https://graph.facebook.com/${cfg.graphVersion || "v25.0"}/${cfg.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = { raw: "non-JSON response" };
  }
  return { ok: res.ok, status: res.status, body };
}

/** Normalize a recipient to the digits-only form Cloud API expects. */
export function normalizeRecipient(raw: string): string {
  return String(raw || "").replace(/[^\d]/g, "");
}
