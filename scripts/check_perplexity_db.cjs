// check_perplexity_db.cjs — verify the Perplexity duplicate meta descriptions
// state in production MongoDB (read-only check, no writes).
const { readFileSync } = require("fs");
const path = require("path");
const uriMatch = readFileSync(path.join(__dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/);
const { MongoClient } = require("mongodb");

(async () => {
  const client = new MongoClient(uriMatch[1], { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db("playbeat");
  const docs = await db.collection("products")
    .find({ slug: { $in: ["perplexity-ai-private-yearly-plan", "perplexity-pro"] } })
    .project({ slug: 1, name: 1, "seo.description": 1, active: 1 })
    .toArray();
  for (const d of docs) {
    console.log(`--- ${d.slug} (active=${d.active})`);
    console.log(`    ${(d.seo?.description || "").slice(0, 200)}`);
  }
  const [a, b] = docs;
  if (a && b) {
    console.log("\nIDENTICAL:", (a.seo?.description || "") === (b.seo?.description || "") ? "YES — still duplicate" : "NO — differentiated (merchant fixed)");
  } else {
    console.log("\nfound:", docs.length, "docs");
  }
  await client.close();
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
