// Seed the app_release doc with the v2.0.0 release metadata (idempotent).
// Usage: node scripts/seed_app_release.mjs
import { MongoClient } from "mongodb";

const MONGO_URI =
  "mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0";
const DB_NAME = "playbeat";

const release = {
  version: "2.0.0",
  versionCode: 2,
  apkUrl: "/downloads/playbeat-admin-v2.0.0.apk",
  aabUrl: "",
  sizeBytes: 140673,
  sha256: "c20f5f45ded2c641dc0e9db601f4459ab89c77fc4606d839fb931e8b5d1130cf",
  minSupportedVersion: "1.0.0",
  forceUpdate: false,
  buildDate: new Date("2026-09-02T00:00:00.000Z"),
  releaseNotes: [
    "Native enterprise login — same super admin / staff credentials as the web panel",
    "Biometric unlock (fingerprint / face) + AES-256-GCM Keystore-encrypted session storage",
    "Version gate: mandatory + optional update flow driven by the admin panel",
    "Native bottom navigation with live badge counts (Dashboard / Orders / Products / More)",
    "Screenshot protection (FLAG_SECURE), root detection warning, HTTPS-only enforcement",
    "File uploads from gallery (product images) + report downloads via DownloadManager",
    "Live ops heartbeat: pending orders, today's orders, unread messages, online devices",
    "Offline auto-retry, pull-to-refresh, revoked-device instant lockout",
  ],
  updatedAt: new Date(),
};

const mc = new MongoClient(MONGO_URI);
await mc.connect();
const col = mc.db(DB_NAME).collection("app_release");
const existing = await col.findOne({ _id: "current" });
if (existing) {
  console.log("app_release doc already exists — leaving untouched (panel is source of truth).");
  console.log(JSON.stringify(existing, null, 2).slice(0, 400));
} else {
  await col.insertOne({ _id: "current", ...release });
  console.log("app_release doc SEEDED with v2.0.0 metadata.");
}
await mc.close();
