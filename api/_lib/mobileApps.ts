// Customer mobile app (Android + iOS) storefront configuration.
//
// Resolution order mirrors trackingConfig.ts / gatewayConfig.ts:
//   1. MongoDB `mobile_apps_config` (admin panel → Mobile Apps, no redeploy)
//   2. Environment variables (ANDROID_APP_URL / IOS_APP_URL + friends)
//   3. Safe defaults — empty URLs mean "pending deployment", which the
//      storefront renders as an honest, disabled "Coming soon" state.
//
// Nothing here is secret: store URLs, version strings and visibility flags
// ship to every visitor via GET /api/app/storefront. Real signing keys,
// service accounts and Google Play / App Store Connect credentials must
// NEVER be stored in this collection.
import { getDb } from "./mongo.js";

export type MobileAppPlatform = {
  url: string; // https:// store listing (or same-origin "/downloads/…" APK)
  version: string; // latest published version name
  buildNumber: number; // Android versionCode / iOS build number
  minOsVersion: string; // informational ("8.0 (API 26)" / "16.0")
  available: boolean; // master availability switch (false → Coming soon)
  packageName: string; // digital.playbeat.app (Android package / iOS bundle id)
};

export type MobileAppsConfig = {
  android: MobileAppPlatform;
  ios: MobileAppPlatform;
  downloadPageVisible: boolean; // /download landing page live
  footerVisible: boolean; // footer "Download App" column + CTA band
  homeSectionVisible: boolean; // homepage "Get the app" hero section
  qrDestination: "download" | "android" | "ios"; // what the storefront QR encodes
  promoBanner: string; // optional announcement text ("" = hidden)
  releaseNotes: string[]; // customer app changelog shown on /download
};

export type MobileAppsSource = Record<string, "db" | "env" | "default">;

const CACHE_TTL_MS = 30_000;
let cache: { value: MobileAppsConfig; source: MobileAppsSource; at: number } | null = null;

/** Deep link scheme the native apps register (playbeat://oauth/callback). */
export const MOBILE_APP_SCHEME = "playbeat";

function envConfig(): MobileAppsConfig {
  return {
    android: {
      url: (process.env.ANDROID_APP_URL || "").trim(),
      version: (process.env.ANDROID_APP_VERSION || "1.0.0").trim(),
      buildNumber: parseInt(process.env.ANDROID_APP_BUILD || "1", 10) || 1,
      minOsVersion: (process.env.ANDROID_MIN_OS || "8.0 (API 26)").trim(),
      available: String(process.env.ANDROID_APP_AVAILABLE ?? "false").toLowerCase() === "true",
      packageName: (process.env.ANDROID_PACKAGE_NAME || "digital.playbeat.app").trim(),
    },
    ios: {
      url: (process.env.IOS_APP_URL || "").trim(),
      version: (process.env.IOS_APP_VERSION || "1.0.0").trim(),
      buildNumber: parseInt(process.env.IOS_APP_BUILD || "1", 10) || 1,
      minOsVersion: (process.env.IOS_MIN_OS || "16.0").trim(),
      available: String(process.env.IOS_APP_AVAILABLE ?? "false").toLowerCase() === "true",
      packageName: (process.env.IOS_BUNDLE_ID || "digital.playbeat.app").trim(),
    },
    downloadPageVisible: String(process.env.APP_DOWNLOAD_PAGE_VISIBLE ?? "true").toLowerCase() !== "false",
    footerVisible: String(process.env.APP_FOOTER_VISIBLE ?? "true").toLowerCase() !== "false",
    homeSectionVisible: String(process.env.APP_HOME_SECTION_VISIBLE ?? "true").toLowerCase() !== "false",
    qrDestination: ((process.env.APP_QR_DESTINATION || "download").trim() || "download") as MobileAppsConfig["qrDestination"],
    promoBanner: (process.env.APP_PROMO_BANNER || "").trim(),
    releaseNotes: [],
  };
}

export const MOBILE_APPS_DEFAULTS: MobileAppsConfig = envConfig();

/**
 * Validate a URL for public display. Accepts:
 *   - https://… store listings / direct APK links (playbeat.digital only for
 *     same-site APK hosting is NOT enforced here — admins own the URL)
 *   - same-origin relative paths starting with "/" (e.g. /downloads/app.apk)
 * Rejects javascript:, data:, //protocol-relative and anything suspicious.
 */
export function sanitizePublicUrl(input: unknown): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  if (raw.length > 600) return "";
  if (/[\s"'<>\\]/.test(raw)) return "";
  if (raw.startsWith("/")) {
    // relative same-origin path — must look like a path, not a scheme trick
    return /^\/[A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=%]*$/.test(raw) ? raw : "";
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return "";
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return "";
    return u.toString();
  } catch {
    return "";
  }
}

function sanitizeVersion(v: unknown, fallback: string): string {
  const s = String(v ?? "").trim();
  return /^[\w.+\-~ ]{1,32}$/.test(s) ? s : fallback;
}

function sanitizeInt(v: unknown, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n >= 0 && n <= 2_100_000_000 ? n : fallback;
}

const QR_DESTINATIONS: MobileAppsConfig["qrDestination"][] = ["download", "android", "ios"];

/** Validate + normalize an admin-submitted patch. Never throws — bad values are dropped. */
export function sanitizeMobileAppsPatch(body: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};

  for (const platform of ["android", "ios"] as const) {
    const p = body?.[platform];
    if (!p || typeof p !== "object") continue;
    const cur: Record<string, any> = {};
    if ("url" in p) cur.url = sanitizePublicUrl(p.url);
    if ("version" in p) cur.version = sanitizeVersion(p.version, MOBILE_APPS_DEFAULTS[platform].version);
    if ("buildNumber" in p) cur.buildNumber = sanitizeInt(p.buildNumber, MOBILE_APPS_DEFAULTS[platform].buildNumber);
    if ("minOsVersion" in p) cur.minOsVersion = sanitizeVersion(p.minOsVersion, MOBILE_APPS_DEFAULTS[platform].minOsVersion);
    if ("available" in p) cur.available = Boolean(p.available);
    if ("packageName" in p) {
      const pkg = String(p.packageName ?? "").trim();
      cur.packageName = /^[\w.]{3,60}$/.test(pkg) ? pkg : MOBILE_APPS_DEFAULTS[platform].packageName;
    }
    out[platform] = cur;
  }

  for (const key of ["downloadPageVisible", "footerVisible", "homeSectionVisible"] as const) {
    if (body?.[key] !== undefined) out[key] = Boolean(body[key]);
  }
  if (body?.qrDestination !== undefined) {
    const q = String(body.qrDestination ?? "").trim();
    out.qrDestination = QR_DESTINATIONS.includes(q as any) ? q : "download";
  }
  if (body?.promoBanner !== undefined) {
    out.promoBanner = String(body.promoBanner ?? "").trim().slice(0, 240);
  }
  if (body?.releaseNotes !== undefined) {
    out.releaseNotes = Array.isArray(body.releaseNotes)
      ? body.releaseNotes.map((n: unknown) => String(n ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 20)
      : [];
  }
  return out;
}

export async function getMobileAppsConfig(force = false): Promise<{
  config: MobileAppsConfig;
  source: MobileAppsSource;
}> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { config: cache.value, source: cache.source };
  }

  const config: MobileAppsConfig = envConfig();
  const source: MobileAppsSource = {
    androidUrl: config.android.url ? "env" : "default",
    iosUrl: config.ios.url ? "env" : "default",
    flags: "env",
  };

  try {
    const db = await getDb();
    const doc: any = await db.collection("mobile_apps_config").findOne({ _id: "customer" as any });
    if (doc && typeof doc === "object") {
      for (const platform of ["android", "ios"] as const) {
        const p = doc[platform];
        if (p && typeof p === "object") {
          if (typeof p.url === "string") {
            config[platform].url = sanitizePublicUrl(p.url) || "";
            source[`${platform}Url`] = "db";
          }
          if (typeof p.version === "string" && p.version.trim()) {
            config[platform].version = sanitizeVersion(p.version, config[platform].version);
            source[`${platform}Version`] = "db";
          }
          if (p.buildNumber !== undefined) {
            config[platform].buildNumber = sanitizeInt(p.buildNumber, config[platform].buildNumber);
          }
          if (typeof p.minOsVersion === "string" && p.minOsVersion.trim()) {
            config[platform].minOsVersion = sanitizeVersion(p.minOsVersion, config[platform].minOsVersion);
          }
          if (typeof p.available === "boolean") {
            config[platform].available = p.available;
            source[`${platform}Available`] = "db";
          }
          if (typeof p.packageName === "string" && /^[\w.]{3,60}$/.test(p.packageName.trim())) {
            config[platform].packageName = p.packageName.trim();
          }
        }
      }
      for (const key of ["downloadPageVisible", "footerVisible", "homeSectionVisible"] as const) {
        if (typeof doc[key] === "boolean") config[key] = doc[key];
      }
      if (doc.qrDestination && QR_DESTINATIONS.includes(doc.qrDestination)) {
        config.qrDestination = doc.qrDestination;
      }
      if (typeof doc.promoBanner === "string") config.promoBanner = doc.promoBanner.slice(0, 240);
      if (Array.isArray(doc.releaseNotes)) {
        config.releaseNotes = doc.releaseNotes
          .map((n: unknown) => String(n ?? "").trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 20);
      }
      source.flags = "db";
    }
  } catch {
    /* DB unavailable — env/default fallback */
  }

  cache = { value: config, source, at: Date.now() };
  return { config, source };
}

export async function saveMobileAppsConfig(patch: Record<string, any>, actor: string) {
  const db = await getDb();
  await db.collection("mobile_apps_config").updateOne(
    { _id: "customer" as any },
    { $set: { ...patch, updatedAt: new Date(), updatedBy: actor } },
    { upsert: true }
  );
  await db.collection("mobile_apps_config_audit").insertOne({
    at: new Date(),
    actor,
    keys: Object.keys(patch),
    patch,
  });
  cache = null;
  return getMobileAppsConfig(true);
}

/** Resolve what the storefront QR code should encode. */
export function resolveQrValue(cfg: MobileAppsConfig, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  if (cfg.qrDestination === "android" && cfg.android.available && cfg.android.url) {
    return cfg.android.url.startsWith("/") ? `${base}${cfg.android.url}` : cfg.android.url;
  }
  if (cfg.qrDestination === "ios" && cfg.ios.available && cfg.ios.url) {
    return cfg.ios.url.startsWith("/") ? `${base}${cfg.ios.url}` : cfg.ios.url;
  }
  return `${base}/download`;
}

/** Register/refresh an Expo push token for a signed-in customer. */
export async function upsertPushToken(opts: {
  userId: string;
  token: string;
  platform: "android" | "ios" | "web";
  appVersion?: string;
  deviceName?: string;
}) {
  const db = await getDb();
  const col = db.collection("push_tokens");
  const now = new Date();
  await col.updateOne(
    { token: opts.token },
    {
      $set: {
        userId: opts.userId,
        platform: opts.platform,
        appVersion: String(opts.appVersion || "").slice(0, 32),
        deviceName: String(opts.deviceName || "").slice(0, 120),
        lastSeenAt: now,
        revoked: false,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
  return true;
}
