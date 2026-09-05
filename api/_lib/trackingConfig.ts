// Google business tracking configuration (GA4 / GTM / AdSense / Google Ads).
//
// Resolution order mirrors gatewayConfig.ts: a document in the `tracking_config`
// Mongo collection overrides build-time environment variables. These IDs are
// PUBLIC by nature (they ship in page HTML by design) — no secrets live here.
// Real secrets (service-account keys for the GA4 Data API etc.) must stay in
// Vercel environment variables only and are NEVER handled by this module.
//
// A 30-second in-process cache keeps the hot public-config endpoint cheap.
import { getDb } from "./mongo.js";

export type TrackingConfig = {
  ga4MeasurementId: string; // G-XXXXXXXXXX
  gtmContainerId: string; // GTM-XXXXXXX
  adsenseClientId: string; // ca-pub-XXXXXXXXXX
  googleAdsConversionId: string; // AW-XXXXXXXXX
  googleAdsPurchaseLabel: string; // e.g. abcDEF123...
  adsEnabled: boolean; // master switch for on-site AdSense units
};

export type TrackingSource = {
  ga4MeasurementId: "db" | "env" | "none";
  gtmContainerId: "db" | "env" | "none";
  adsenseClientId: "db" | "env" | "none";
  googleAdsConversionId: "db" | "env" | "none";
  googleAdsPurchaseLabel: "db" | "env" | "none";
  adsEnabled: "db" | "env";
};

const CACHE_TTL_MS = 30_000;
let cache: { value: TrackingConfig; source: TrackingSource; at: number } | null = null;

function envConfig(): TrackingConfig {
  return {
    ga4MeasurementId: (process.env.GA4_MEASUREMENT_ID || "").trim(),
    gtmContainerId: (process.env.GTM_CONTAINER_ID || "").trim(),
    adsenseClientId: (process.env.ADSENSE_CLIENT_ID || "").trim(),
    googleAdsConversionId: (process.env.GOOGLE_ADS_CONVERSION_ID || "").trim(),
    googleAdsPurchaseLabel: (process.env.GOOGLE_ADS_PURCHASE_LABEL || "").trim(),
    adsEnabled: String(process.env.ADS_ENABLED || "true").toLowerCase() !== "false",
  };
}

const ID_PATTERNS: Record<string, RegExp> = {
  ga4MeasurementId: /^G-[A-Z0-9]{6,12}$/i,
  gtmContainerId: /^GTM-[A-Z0-9]{5,10}$/i,
  adsenseClientId: /^ca-pub-\d{10,16}$/i,
  googleAdsConversionId: /^AW-\d{9,12}$/i,
  googleAdsPurchaseLabel: /^[A-Za-z0-9_-]{3,64}$/,
};

/** Validate + normalize an admin-submitted config patch. Throws on bad IDs. */
export function sanitizeTrackingPatch(body: Record<string, any>): Partial<TrackingConfig> {
  const out: Partial<TrackingConfig> = {};
  for (const key of Object.keys(ID_PATTERNS)) {
    if (typeof body[key] !== "string") continue;
    const v = body[key].trim();
    if (v === "") {
      (out as any)[key] = ""; // explicit clear
      continue;
    }
    if (!ID_PATTERNS[key].test(v)) {
      throw new Error(`Invalid format for ${key}: "${v}"`);
    }
    (out as any)[key] = v;
  }
  if (typeof body.adsEnabled === "boolean") out.adsEnabled = body.adsEnabled;
  return out;
}

export async function getTrackingConfig(force = false): Promise<{
  config: TrackingConfig;
  source: TrackingSource;
}> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { config: cache.value, source: cache.source };
  }

  const env = envConfig();
  let dbDoc: any = null;
  try {
    const db = await getDb();
    dbDoc = await db.collection("tracking_config").findOne({ key: "active" });
  } catch {
    dbDoc = null; // DB unavailable — env-only fallback
  }

  const config: TrackingConfig = { ...env };
  const source: TrackingSource = {
    ga4MeasurementId: env.ga4MeasurementId ? "env" : "none",
    gtmContainerId: env.gtmContainerId ? "env" : "none",
    adsenseClientId: env.adsenseClientId ? "env" : "none",
    googleAdsConversionId: env.googleAdsConversionId ? "env" : "none",
    googleAdsPurchaseLabel: env.googleAdsPurchaseLabel ? "env" : "none",
    adsEnabled: "env",
  };

  if (dbDoc && typeof dbDoc === "object") {
    for (const key of Object.keys(ID_PATTERNS) as (keyof TrackingConfig)[]) {
      const v = dbDoc[key];
      if (typeof v === "string" && v.trim() !== "") {
        (config as any)[key] = v.trim();
        (source as any)[key] = "db";
      } else if (v === "") {
        // explicit admin clear beats a non-empty env fallback
        (config as any)[key] = "";
        (source as any)[key] = "db";
      }
    }
    if (typeof dbDoc.adsEnabled === "boolean") {
      config.adsEnabled = dbDoc.adsEnabled;
      source.adsEnabled = "db";
    }
  }

  cache = { value: config, source, at: Date.now() };
  return { config, source };
}

export async function saveTrackingConfig(patch: Partial<TrackingConfig>, actor: string) {
  const db = await getDb();
  const col = db.collection("tracking_config");
  await col.updateOne(
    { key: "active" },
    { $set: { ...patch, updatedAt: new Date(), updatedBy: actor } },
    { upsert: true }
  );
  await db.collection("tracking_config_audit").insertOne({
    at: new Date(),
    actor,
    keys: Object.keys(patch),
    patch,
  });
  cache = null; // invalidate
  return getTrackingConfig(true);
}

/** Lightweight "is tracking alive" heartbeat — updated by the public endpoint. */
export async function touchTrackingHeartbeat(meta: {
  ua: string;
  ga4: boolean;
  gtm: boolean;
  adsense: boolean;
}) {
  try {
    const db = await getDb();
    await db.collection("tracking_heartbeat").updateOne(
      { key: "storefront" },
      {
        $set: {
          lastAt: new Date(),
          userAgent: meta.ua.slice(0, 300),
          ga4Loaded: meta.ga4,
          gtmLoaded: meta.gtm,
          adsenseLoaded: meta.adsense,
        },
      },
      { upsert: true }
    );
  } catch {
    /* heartbeat is best-effort — never block the response */
  }
}
