/**
 * verify_psn_regions.ts — SEO score + sanitizer round-trip for the 10 regional PSN drafts.
 * Run: bun scripts/verify_psn_regions.ts
 * Score formula mirrors the admin seoChecks panel + Yoast-style content criteria.
 * Image items are excluded from scoring (user adds images manually) and reported separately.
 */
import DOMPurify from "isomorphic-dompurify";
import { MongoClient } from "mongodb";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const MONGO = require("./_mongo_uri.cjs").MONGODB_URI;
const SLUGS = ["uk", "germany", "france", "canada", "australia", "japan", "singapore", "malaysia", "saudi-arabia", "uae"]
  .map((s) => `playstation-network-gift-card-${s}-psn-digital-code`);

const ALLOWED_TAGS = ["h1","h2","h3","h4","h5","h6","p","br","hr","strong","b","em","i","u","s","span","div","ul","ol","li","a","blockquote","code","pre","table","thead","tbody","tfoot","caption","tr","th","td","img","figure","figcaption"];
const ALLOWED_ATTR = ["href","title","target","rel","src","srcset","alt","width","height","loading","colspan","rowspan","class","style"];
const SANITIZE = (html) => DOMPurify.sanitize(html, {
  ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script","iframe","object","embed","form","input","button","select","textarea","style","link","meta","base","svg","math","video","audio","source","track","frame","frameset","applet","noscript","template"],
  FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onmouseout","onmousemove","onfocus","onblur","onchange","onsubmit","onkeydown","onkeyup","onkeypress","ontouchstart","formaction","srcdoc","xlink:href","nonce","autofocus","is"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
});

const strip = (h) => h.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const words = (t) => t.split(/\s+/).filter(Boolean);
const norm = (v) => v.trim().toLowerCase();


async function main() {
  const c = new MongoClient(MONGO);
  await c.connect();
  const col = c.db("playbeat").collection("products");
  const all = await col.find({}, { projection: { slug: 1, sku: 1, name: 1, "seo.title": 1, "seo.description": 1, shortDescription: 1 } }).toArray();
  const rows = [];

  for (const slug of SLUGS) {
    const p = await col.findOne({ slug });
    if (!p) { rows.push({ region: slug, score: 0, max: 100, notes: ["MISSING"], sanitizer: false, siteChecks: [] }); continue; }
    const region = (p.region) || slug;
    const seo = p.seo || {};
    const kw = norm(seo.focusKeyword || "");
    const title = seo.title || p.name || "";
    const meta = seo.description || p.shortDescription || "";
    const desc = p.detailedDescription || p.description || "";
    const plain = strip(desc);
    const w = words(plain);
    const plainLow = " " + plain.toLowerCase() + " ";
    const notes = [];
    let score = 0; const max = 100;

    // 1. Keyword in SEO title (10) + near the beginning (5)
    const tl = norm(title);
    if (tl.includes(kw)) { score += 10; if (tl.indexOf(kw) <= 10) score += 5; else notes.push("kw not at title start"); }
    else notes.push("kw MISSING from title");

    // 2. Keyword in meta description (10)
    if (norm(meta).includes(kw)) score += 10; else notes.push("kw MISSING from meta");

    // 3. Keyword in slug (10)
    if (p.slug.includes(kw.replace(/\s+/g, "-"))) score += 10; else notes.push("kw MISSING from slug");

    // 4. Keyword in first paragraph (10)
    const firstP = strip((desc.match(/<p[^>]*>[\s\S]*?<\/p>/i) || [""])[0]);
    if (norm(firstP).includes(kw)) score += 10; else notes.push("kw MISSING from first paragraph");

    // 5. Keyword in a subheading (10)
    const heads = [...desc.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)].map((m) => strip(m[1]).toLowerCase());
    if (heads.some((h) => h.includes(kw))) score += 10; else notes.push("kw MISSING from subheadings");

    // 6. Keyword density 0.3–3% (10)
    const occurrences = (plainLow.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    const density = (occurrences * kw.split(" ").length * 100) / w.length;
    if (density >= 0.3 && density <= 3) score += 10;
    else notes.push(`kw density ${density.toFixed(2)}% (${occurrences}x) outside 0.3-3%`);

    // 7. Content length ≥600 words (10)
    if (w.length >= 600) score += 10; else notes.push(`content ${w.length} words < 600`);

    // 8. Meta length (5): 120–155 ideal, 70–119 partial
    if (meta.length >= 120 && meta.length <= 155) score += 5;
    else if (meta.length >= 70 && meta.length < 120) { score += 3; notes.push(`meta ${meta.length}c — aim 120+`); }
    else notes.push(`meta length ${meta.length} OUT OF RANGE`);

    // 9. Title length (5): 40–60
    if (title.length >= 40 && title.length <= 60) score += 5;
    else notes.push(`title ${title.length}c OUT OF RANGE (40-60)`);

    // 10. Section structure ≥5 h2 (5)
    const h2n = (desc.match(/<h2[\s>]/gi) || []).length;
    if (h2n >= 5) score += 5; else notes.push(`only ${h2n} h2 sections`);

    // 11. Short description present <300 (5)
    if (p.shortDescription && p.shortDescription.length < 300) score += 5; else notes.push("shortDescription missing/long");

    // 12. Secondary keywords ≥10 (5)
    if ((seo.secondaryKeywords || []).length >= 10) score += 5; else notes.push("secondaryKeywords < 10");

    // ---- Site admin seoChecks simulation (errors/warnings that WOULD show) ----
    const siteChecks = [];
    if (!seo.title) siteChecks.push("info: no custom title");
    else if (seo.title.length > 60) siteChecks.push("warning: title >60c");
    if (!meta.trim()) siteChecks.push("error: meta missing");
    else if (meta.length < 70) siteChecks.push("warning: meta short");
    else if (meta.length > 160) siteChecks.push("warning: meta long");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) siteChecks.push("warning: slug chars");
    const titleDup = all.some((o) => (o.slug !== slug) && norm(o.seo?.title || "") === norm(title));
    if (titleDup) siteChecks.push("warning: duplicate SEO title");
    const metaDup = all.some((o) => (o.slug !== slug) && norm((o.seo?.description || o.shortDescription || "")).slice(0, 155) === norm(meta).slice(0, 155));
    if (metaDup) siteChecks.push("warning: duplicate meta opening");
    if (!kw) siteChecks.push("warning: no focus keyword");
    else {
      const inTitle = tl.includes(kw), inDesc = norm(meta).includes(kw), inSlug = p.slug.includes(kw.replace(/\s+/g, "-"));
      if (!inTitle) siteChecks.push("warning: kw not in title");
      if (!inDesc) siteChecks.push("info: kw not in meta");
      if (!inTitle && !inDesc && !inSlug) siteChecks.push("warning: kw nowhere");
    }
    if (!p.brand) siteChecks.push("info: brand empty");
    if (!p.sku) siteChecks.push("error: SKU empty");
    if (!p.image) siteChecks.push("warning: no main image (USER ADDS MANUALLY)");
    siteChecks.push("info: OG image pending (USER ADDS MANUALLY)");

    // ---- Sanitizer round-trip (repo whitelist) ----
    const out = SANITIZE(desc);
    const tagOk = ["h2", "h3", "p", "strong", "ul", "ol", "li", "table", "tr", "td"].every((t) => new RegExp(`<${t}[\\s>]`, "i").test(out));
    const textSame = strip(out) === plain;
    const noH1 = !/<h1[\s>]/i.test(desc);
    const sanitizer = tagOk && textSame && noH1;

    rows.push({ region, score, max, notes, sanitizer, siteChecks });
    console.log(`\n=== ${region} — score ${score}/${max} (${Math.round((score / max) * 100)}%) | sanitizer ${sanitizer ? "PASS" : "FAIL"} ===`);
    console.log(`   title(${title.length}c) meta(${meta.length}c) words=${w.length} h2=${h2n} kwDensity=${density.toFixed(2)}% (${occurrences}x)`);
    if (notes.length) console.log("   notes:", notes.join(" | "));
    if (siteChecks.length) console.log("   admin panel would show:", siteChecks.join(" | "));
  }

  await c.close();
  console.log("\n========== SUMMARY ==========");
  let allPass = true;
  for (const r of rows) {
    const pct = Math.round((r.score / r.max) * 100);
    const ok = pct > 90 && r.sanitizer && !r.notes.some((n) => n.includes("MISSING") || n.includes("OUT OF RANGE"));
    if (!ok) allPass = false;
    console.log(`${r.region.padEnd(13)} SEO ${String(pct).padStart(3)}% ${r.sanitizer ? "sanitizer✓" : "sanitizer✗"} ${ok ? "PASS" : "FAIL"}`);
  }
  console.log(allPass ? "\nALL REGIONS PASS (>90%)" : "\nSOME REGIONS BELOW THRESHOLD");
  if (!allPass) process.exit(1);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
