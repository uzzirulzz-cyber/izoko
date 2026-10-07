// Inspect the stored run — detail queries (read-only)
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import path from "path";

const uri = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/)![1];
const db = new MongoClient(uri).db("playbeat");

const run = await db.collection("seoAuditRuns").findOne({ status: "completed", mode: "full" }, { sort: { startedAt: -1 } });
console.log("run:", run._id.toString(), run.startedAt.toISOString(), "score", run.score?.total);

// 1) duplicate sitemap entry
console.log("\n=== duplicate sitemap entries ===");
console.log(run.discovered?.duplicateSitemapUrls);

// 2) which 6 URLs are indexable
console.log("\n=== indexable pages ===");
for (const p of run.pages.filter((x: any) => x.indexable)) console.log(` ${p.url} (h1=${p.h1Count} words=${p.wordCount} title="${p.title.slice(0, 50)}")`);

// 3) canonical targets distribution
const canonMap = new Map<string, number>();
for (const p of run.pages) if (p.canonical) canonMap.set(p.canonical, (canonMap.get(p.canonical) || 0) + 1);
console.log("\n=== canonical target distribution ===");
for (const [c, n] of [...canonMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(` ${c} <- ${n} pages`);

// 4) DB duplicate meta description products
console.log("\n=== DB duplicate description group ===");
const groups = run.duplicates?.database?.productDescriptions || [];
for (const g of groups) {
  console.log(` value: "${g.value.slice(0, 120)}"`);
  for (const u of g.urls) console.log(`  - ${u.label}`);
}

// 5) product pages with biggest HTML (are any product pages NOT shells?)
console.log("\n=== product pages: spaShell? ===");
const shells = run.pages.filter((p: any) => p.type === "product");
console.log(`products crawled: ${shells.length}, spaShell: ${shells.filter((p: any) => p.spaShell).length}`);

// 6) images detail — what are the images without alt
const imgSample = run.pages.find((p: any) => p.imagesMissingAlt > 0);
console.log("\n=== sample page with missing-alt images ===");
console.log(imgSample?.url, "imagesTotal", imgSample?.imagesTotal, "missingAlt", imgSample?.imagesMissingAlt);

process.exit(0);
