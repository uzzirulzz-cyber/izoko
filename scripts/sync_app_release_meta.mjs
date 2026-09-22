// Sync the existing app_release doc's fields to the ACTUAL shipped APK binary
// (public/downloads/playbeat-admin.apk). Updates ONLY apkUrl + version +
// versionCode + sha256 + sizeBytes + buildDate (+ updatedAt) — mirrors the
// super-admin PUT release but with the real built values.
// Idempotent. Usage: node scripts/sync_app_release_meta.mjs
import { MongoClient } from "mongodb";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0";
const DB_NAME = process.env.MONGODB_DB_NAME || "playbeat";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APK = join(__dirname, "..", "public", "downloads", "playbeat-admin.apk");
const MANIFEST = join(__dirname, "..", "android", "AndroidManifest.xml");

const buf = readFileSync(APK);
const sha256 = createHash("sha256").update(buf).digest("hex");
const sizeBytes = buf.length;
const buildDate = new Date();
const manifest = readFileSync(MANIFEST, "utf8");
const version = manifest.match(/android:versionName="([^"]+)"/)?.[1];
const versionCode = parseInt(manifest.match(/android:versionCode="([^"]+)"/)?.[1] || "0", 10);
if (!version || !versionCode) {
  console.error("Could not parse version/versionCode from AndroidManifest.xml");
  process.exit(1);
}

const mc = new MongoClient(MONGO_URI);
await mc.connect();
const col = mc.db(DB_NAME).collection("app_release");
const doc = await col.findOne({ _id: "current" });
if (!doc) {
  console.log("No app_release doc found — nothing to sync (code fallback governs).");
} else {
  const res = await col.updateOne(
    { _id: "current" },
    {
      $set: {
        apkUrl: "/downloads/playbeat-admin.apk",
        version,
        versionCode,
        sha256,
        sizeBytes,
        buildDate,
        updatedAt: buildDate,
      },
    }
  );
  console.log(`Updated app_release/_id=current (matched=${res.matchedCount}, modified=${res.modifiedCount})`);
  console.log(`  version:    ${doc.version} -> ${version} (code ${doc.versionCode} -> ${versionCode})`);
  console.log(`  apkUrl:     ${doc.apkUrl} -> /downloads/playbeat-admin.apk`);
  console.log(`  sha256:     ${doc.sha256?.slice(0, 16)}… -> ${sha256.slice(0, 16)}…`);
  console.log(`  sizeBytes:  ${doc.sizeBytes} -> ${sizeBytes}`);
}
await mc.close();
