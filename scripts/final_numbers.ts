// final_numbers.ts — extract the final audit numbers for the report
import { MongoClient, ObjectId } from "mongodb";
import { readFileSync } from "fs";
import path from "path";

const uri = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/)![1];
const db = new MongoClient(uri).db("playbeat");
const r = await db.collection("seoAuditRuns").findOne({ _id: new ObjectId("6ac5931a7bb24b28edeba402") });
console.log("startedAt:", r.startedAt.toISOString());
console.log("completedAt:", r.completedAt.toISOString());
console.log("durationMs:", r.summary.durationMs);
console.log("urls:", `${r.crawledUrls}/${r.totalUrls}`);
console.log("findings:", r.summary.findingsCount, JSON.stringify(r.summary.severityCounts));
const c = r.summary.counts;
console.log("brokenUrls:", c.brokenUrls, "| http404:", c.http404, "| soft404:", c.soft404, "| serverErrors:", c.serverErrors, "| redirects:", c.redirects, "| unreachable:", c.unreachable);
console.log("dupTitleGroups(live):", c.duplicateTitleGroups, "| dupDescGroups(live):", c.duplicateDescriptionGroups, "| dupCanonicalGroups:", c.duplicateCanonicalGroups);
console.log("dbDupTitleGroups:", c.dbDuplicateProductTitleGroups, "| dbDupDescGroups:", c.dbDuplicateProductDescriptionGroups);
console.log("schemaErrors:", c.schemaErrors, "| imagesMissingAlt:", `${c.imagesMissingAlt}/${c.imagesTotal}`);
console.log("score:", r.score.total, "| partial:", r.score.partial);
console.log("previousRun:", r.summary.previousRun ? r.summary.previousRun.runId : "none");
process.exit(0);
