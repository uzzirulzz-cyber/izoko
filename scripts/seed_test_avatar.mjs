// Seed a temporary test avatar into admin_avatars (production DB) so the
// public GET /api/admin/avatar response headers can be verified live.
// Prints the email to use; run cleanup with --cleanup.
import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://new:KgSqbhLKjBK3R8lN@cluster0.mfghk5u.mongodb.net/?appName=Cluster0";
const DB_NAME = process.env.MONGODB_DB_NAME || "playbeat";
const TEST_EMAIL = "avatar-header-test@playbeat.digital";

// 1x1 transparent PNG (67 bytes)
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const mc = new MongoClient(MONGO_URI);
await mc.connect();
const col = mc.db(DB_NAME).collection("admin_avatars");

if (process.argv.includes("--cleanup")) {
  const r = await col.deleteOne({ _id: TEST_EMAIL });
  console.log(`cleanup: deleted=${r.deletedCount}`);
} else {
  const bytes = Buffer.from(PNG_B64, "base64");
  await col.updateOne(
    { _id: TEST_EMAIL },
    { $set: { email: TEST_EMAIL, mime: "image/png", bytes, size: bytes.length, updatedAt: new Date() } },
    { upsert: true }
  );
  console.log(`seeded: ${TEST_EMAIL} (${bytes.length} bytes)`);
}
await mc.close();
