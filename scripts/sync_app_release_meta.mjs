// Sync the existing app_release doc's verification fields to the ACTUAL
// shipped APK binary (public/downloads/playbeat-admin-v2.0.0.apk).
// Updates ONLY sha256 + buildDate (+ updatedAt) — mirrors the super-admin
// release editor (PUT /api/admin/app/release) but with the real built values.
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
const APK = join(__dirname, "..", "public", "downloads", "playbeat-admin-v2.0.0.apk");

const buf = readFileSync(APK);
const sha256 = createHash("sha256").update(buf).digest("hex");
const sizeBytes = buf.length;
const buildDate = new Date();

const mc = new MongoClient(MONGO_URI);
await mc.connect();
const col = mc.db(DB_NAME).collection("app_release");
const doc = await col.findOne({ _id: "current" });
if (!doc) {
  console.log("No app_release doc found — nothing to sync (code fallback governs).");
} else {
  const res = await col.updateOne(
    { _id: "current" },
    { $set: { sha256, sizeBytes, buildDate, updatedAt: buildDate } }
  );
  console.log(`Updated app_release/_id=current (matched=${res.matchedCount}, modified=${res.modifiedCount})`);
  console.log(`  sha256:    ${doc.sha256?.slice(0, 16)}… -> ${sha256.slice(0, 16)}…`);
  console.log(`  sizeBytes: ${doc.sizeBytes} -> ${sizeBytes}`);
}
await mc.close();
