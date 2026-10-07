// check_runs.ts — list audit runs; remove zombie 'running' docs
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import path from "path";

const uri = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/)![1];
const db = new MongoClient(uri).db("playbeat");
const runs = await db.collection("seoAuditRuns").find({}).sort({ startedAt: -1 }).toArray();
for (const r of runs) {
  console.log(r._id.toString(), r.mode, r.status, r.startedAt.toISOString(), `crawled=${r.crawledUrls}/${r.totalUrls}`);
}
const zombie = runs.filter((r: any) => r.status === "running" && Date.now() - new Date(r.startedAt).getTime() > 10 * 60 * 1000);
for (const z of zombie) {
  await db.collection("seoAuditRuns").updateOne({ _id: z._id }, { $set: { status: "failed", error: "abandoned — audit process ended before completion", completedAt: new Date() } });
  console.log("marked failed (zombie):", z._id.toString());
}
process.exit(0);
