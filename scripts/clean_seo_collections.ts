// clean_seo_collections.ts — remove harness test docs before the final audit run
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import path from "path";

const uri = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/)![1];
const db = new MongoClient(uri).db("playbeat");
const r1 = await db.collection("seoAuditRuns").deleteMany({});
const r2 = await db.collection("seoAuditFindings").deleteMany({});
const r3 = await db.collection("seoPerformanceHistory").deleteMany({});
console.log("cleaned docs:", r1.deletedCount, r2.deletedCount, r3.deletedCount);
process.exit(0);
