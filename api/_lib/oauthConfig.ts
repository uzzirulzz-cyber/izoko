// OAuth provider credential overrides (Google / Facebook / Instagram).
//
// Resolution order mirrors metaCapi.ts and gatewayConfig.ts: a document in the
// `oauth_config` Mongo collection (key:"active") overrides build-time Vercel
// environment variables. This lets the owner paste provider keys from the
// admin panel (or a DB write) and activate real social sign-in WITHOUT a
// redeploy. Secrets here are NEVER returned by any public endpoint — the
// public /api/auth/oauth-config only reports booleans; the admin endpoint
// returns masked values only.
//
// Doc shape (key:"active"):
// {
//   google:    { clientId, clientSecret, apiKey },   // apiKey optional (server-side Google APIs)
//   facebook:  { clientId, clientSecret },
//   instagram: { clientId, clientSecret },
//   updatedAt, updatedBy
// }
import { getDb } from "./mongo.js";

export type ProviderSecrets = {
  clientId: string;
  clientSecret: string;
  apiKey?: string; // Google only — usable for server-side Google API calls
};

export type OAuthOverrides = {
  google?: Partial<ProviderSecrets>;
  facebook?: Partial<ProviderSecrets>;
  instagram?: Partial<ProviderSecrets>;
};

const CACHE_TTL_MS = 30_000;
let cache: { value: OAuthOverrides; at: number } | null = null;

export function maskSecret(value: string): string {
  const v = String(value || "");
  if (!v) return "";
  return `${v.slice(0, 8)}…${v.slice(-4)} (${v.length} chars)`;
}

export async function getOAuthOverrides(force = false): Promise<OAuthOverrides> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  let value: OAuthOverrides = {};
  try {
    const db = await getDb();
    const doc: any = await db.collection("oauth_config").findOne({ key: "active" });
    if (doc && typeof doc === "object") {
      value = {
        google: pickSecrets(doc.google),
        facebook: pickSecrets(doc.facebook),
        instagram: pickSecrets(doc.instagram),
      };
    }
  } catch {
    /* DB unavailable — env-only fallback */
  }
  cache = { value, at: Date.now() };
  return value;
}

function pickSecrets(raw: any): Partial<ProviderSecrets> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Partial<ProviderSecrets> = {};
  for (const key of ["clientId", "clientSecret", "apiKey"] as const) {
    const v = raw[key];
    if (typeof v === "string" && v.trim() !== "") out[key] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

/** Validate + normalize an admin-submitted patch. Throws on bad shapes. */
export function sanitizeOAuthPatch(body: Record<string, any>): OAuthOverrides {
  const out: OAuthOverrides = {};
  for (const provider of ["google", "facebook", "instagram"] as const) {
    const raw = body?.[provider];
    if (raw === undefined) continue;
    if (raw === null || raw === "") {
      out[provider] = {}; // explicit clear
      continue;
    }
    if (typeof raw !== "object") throw new Error(`Invalid ${provider} payload`);
    const entry: Partial<ProviderSecrets> = {};
    for (const key of ["clientId", "clientSecret", "apiKey"] as const) {
      if (typeof raw[key] !== "string") continue;
      const v = raw[key].trim();
      if (v !== "") entry[key] = v;
    }
    if (provider !== "google" && "apiKey" in entry) delete (entry as any).apiKey;
    out[provider] = entry;
  }
  if (!Object.keys(out).length) throw new Error("No provider fields supplied");
  return out;
}

export async function saveOAuthOverrides(patch: OAuthOverrides, actor: string) {
  const db = await getDb();
  const col = db.collection("oauth_config");
  const existing: any = await col.findOne({ key: "active" });
  const merged: Record<string, any> = {
    google: { ...(existing?.google || {}), ...(patch.google || {}) },
    facebook: { ...(existing?.facebook || {}), ...(patch.facebook || {}) },
    instagram: { ...(existing?.instagram || {}), ...(patch.instagram || {}) },
  };
  // Explicit clears: provider key present but empty object → remove the block
  for (const p of ["google", "facebook", "instagram"] as const) {
    if (patch[p] && Object.keys(patch[p]).length === 0) delete merged[p];
  }
  await col.updateOne(
    { key: "active" },
    { $set: { ...merged, updatedAt: new Date(), updatedBy: actor } },
    { upsert: true }
  );
  await db.collection("oauth_config_audit").insertOne({
    at: new Date(),
    actor,
    providers: Object.keys(patch),
    masked: Object.fromEntries(
      Object.entries(patch).map(([p, v]: [string, any]) => [
        p,
        Object.fromEntries(Object.entries(v || {}).map(([k, val]: [string, any]) => [k, maskSecret(val)])),
      ])
    ),
  });
  cache = null; // invalidate
  return getOAuthOverrides(true);
}

/** Admin-safe masked status (never returns real secrets). */
export async function getOAuthStatus() {
  const overrides = await getOAuthOverrides(true);
  const view = (provider: "google" | "facebook" | "instagram") => {
    const envId =
      provider === "google"
        ? process.env.GOOGLE_CLIENT_ID
        : provider === "facebook"
          ? process.env.FACEBOOK_CLIENT_ID
          : process.env.INSTAGRAM_CLIENT_ID;
    const envSecret =
      provider === "google"
        ? process.env.GOOGLE_CLIENT_SECRET
        : provider === "facebook"
          ? process.env.FACEBOOK_CLIENT_SECRET
          : process.env.INSTAGRAM_CLIENT_SECRET;
    const o = overrides[provider] || {};
    const has = (a?: string, b?: string) => Boolean(a || b);
    return {
      configured: has(o.clientId, envId) && has(o.clientSecret, envSecret),
      clientIdMasked: o.clientId ? maskSecret(o.clientId) : envId ? `${maskSecret(envId)} (env)` : "",
      clientSecretMasked: o.clientSecret ? maskSecret(o.clientSecret) : envSecret ? `${maskSecret(envSecret)} (env)` : "",
      apiKeyMasked: provider === "google" ? (o.apiKey ? maskSecret(o.apiKey) : "") : undefined,
      source: o.clientId || o.clientSecret ? "db" : envId ? "env" : "none",
    };
  };
  return {
    google: view("google"),
    facebook: view("facebook"),
    instagram: view("instagram"),
  };
}
