// check_psn_state.ts — verify the 10 regional drafts after image attach
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import path from "path";

const uri = readFileSync(path.join(import.meta.dirname, "_mongo_uri.cjs"), "utf8").match(/"(mongodb\+srv:[^"]+)"/)![1];
const db = new MongoClient(uri).db("playbeat");
const slugs = ["uk", "canada", "australia", "japan", "singapore", "malaysia", "germany", "france", "saudi-arabia", "uae"];
for (const s of slugs) {
  const d = await db.collection("products").findOne({ slug: `playstation-network-gift-card-${s}-psn-digital-code` }, { projection: { active: 1, cmsStatus: 1, image: 1, price: 1 } });
  if (!d) { console.log(s, "NOT FOUND"); continue; }
  console.log(s.padEnd(14), `active=${d.active}`, d.cmsStatus, `image=${d.image ? "SET" : "empty"}`, `price=${d.price}`);
}
process.exit(0);
