// Shared release metadata for the Playbeat Admin Android app.
// Stored in the `app_release` collection (single doc _id "current") so the
// super admin can manage releases (min supported version, force update,
// release notes) from the admin panel WITHOUT a redeploy.
// Falls back to the compile-time constant below when the DB doc is absent.
import { getDb } from "./mongo.js";

export const APP_RELEASE_FALLBACK = {
  version: "2.0.0",
  versionCode: 2,
  apkUrl: "/downloads/playbeat-admin.apk",
  aabUrl: "",
  sizeBytes: 140673,
  sha256: "85165dd14b079582ddd09c9dfc01617bb55228487cbd010fffbbda365ae88449",
  minSupportedVersion: "1.0.0",
  forceUpdate: false,
  buildDate: "2026-09-02T17:51:00.000Z",
  minAndroid: "7.0 (API 24)",
  targetAndroid: "Android 14 (API 34)",
  releaseNotes: [
    "Native enterprise login — same super admin / staff credentials as the web panel",
    "Biometric unlock (fingerprint / face) + AES-256-GCM Keystore-encrypted session storage",
    "Version gate: mandatory + optional update flow driven by the admin panel",
    "Native bottom navigation with live badge counts (Dashboard / Orders / Products / More)",
    "Screenshot protection (FLAG_SECURE), root detection warning, HTTPS-only enforcement",
    "File uploads from gallery/camera (product images) + report downloads via DownloadManager",
    "Live ops heartbeat: pending orders, today's orders, unread messages, online devices",
    "Offline auto-retry, pull-to-refresh, revoked-device instant lockout",
  ],
  changelog: [
    "Native enterprise login — same super admin / staff credentials as the web panel",
    "Biometric unlock (fingerprint / face) + AES-256-GCM Keystore-encrypted session storage",
    "Version gate: mandatory + optional update flow driven by the admin panel",
    "Native bottom navigation with live badge counts (Dashboard / Orders / Products / More)",
    "Screenshot protection (FLAG_SECURE), root detection warning, HTTPS-only enforcement",
    "File uploads from gallery/camera (product images) + report downloads via DownloadManager",
    "Live ops heartbeat: pending orders, today's orders, unread messages, online devices",
    "Offline auto-retry, pull-to-refresh, revoked-device instant lockout",
  ],
};

export type AppRelease = typeof APP_RELEASE_FALLBACK;

/** Read the live release doc from MongoDB, merged over the fallback. */
export async function getAppRelease(): Promise<AppRelease> {
  try {
    const db = await getDb();
    const doc: any = await db
      .collection("app_release")
      .findOne({ _id: "current" as any });
    if (!doc) return { ...APP_RELEASE_FALLBACK };
    return {
      ...APP_RELEASE_FALLBACK,
      ...Object.fromEntries(
        Object.entries(APP_RELEASE_FALLBACK).map(([k, v]) => [
          k,
          doc[k] !== undefined && doc[k] !== null ? doc[k] : v,
        ])
      ),
    } as AppRelease;
  } catch {
    return { ...APP_RELEASE_FALLBACK };
  }
}

/** Upsert the release doc (super-admin action from the admin panel). */
export async function setAppRelease(patch: Record<string, any>): Promise<AppRelease> {
  const db = await getDb();
  const allowed = [
    "version",
    "versionCode",
    "apkUrl",
    "aabUrl",
    "sizeBytes",
    "sha256",
    "minSupportedVersion",
    "forceUpdate",
    "buildDate",
    "releaseNotes",
  ];
  const clean: Record<string, any> = {};
  for (const k of allowed) {
    if (patch[k] !== undefined) clean[k] = patch[k];
  }
  clean.updatedAt = new Date();
  await db
    .collection("app_release")
    .updateOne({ _id: "current" as any }, { $set: clean, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  return getAppRelease();
}

/** Semantic-version comparison: returns true when a >= b. */
export function semverGte(a: string, b: string): boolean {
  const pa = String(a || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return true;
}
