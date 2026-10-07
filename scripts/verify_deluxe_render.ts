// verify_deluxe_render.ts — run the REPO's own storefront sanitizer on the
// stored Deluxe description to prove: semantic tags survive, XSS-free, no text loss.
import DOMPurify from "isomorphic-dompurify";
import fs from "fs";

const html = fs.readFileSync("/home/z/my-project/scripts/deluxe_description.html", "utf8");

const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6","p","br","hr",
  "strong","b","em","i","u","s","span","div",
  "ul","ol","li","a","blockquote","code","pre",
  "table","thead","tbody","tfoot","caption","tr","th","td",
  "img","figure","figcaption",
];
const ALLOWED_ATTR = ["href","title","target","rel","src","srcset","alt","width","height","loading","colspan","rowspan","class","style"];
const PURIFY_CONFIG = {
  ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script","iframe","object","embed","form","input","button","select","textarea","style","link","meta","base","svg","math","video","audio","source","track","frame","frameset","applet","noscript","template"],
  FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onmouseout","onmousemove","onfocus","onblur","onchange","onsubmit","onkeydown","onkeyup","onkeypress","ontouchstart","formaction","srcdoc","xlink:href","nonce","autofocus","is"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

const out = DOMPurify.sanitize(html, PURIFY_CONFIG);

let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => { cond ? pass++ : (fail++, console.log("FAIL: " + name)); };

// semantic tags preserved
for (const tag of ["h2", "h3", "p", "strong", "ul", "li", "table", "thead", "tbody", "tr", "th", "td"]) {
  check(`<${tag}> preserved`, new RegExp(`<${tag}[\\s>]`, "i").test(out));
}
// section wrapper dropped (not whitelisted)…
check("section removed", !/<section[\s>]/i.test(out));
// …but children survive (KEEP_CONTENT)
check("content survives section unwrap", out.includes("PlayStation Plus Deluxe Key Features") && out.includes("Frequently Asked Questions"));
// entities intact
check("&amp; entity intact", out.includes("Shared &amp; Private Account"));
// counts
const h2s = (out.match(/<h2>/g) || []).length;
const h3s = (out.match(/<h3>/g) || []).length;
const tables = (out.match(/<table>/g) || []).length;
console.log(`h2: ${h2s} (expect 21), h3: ${h3s} (expect 21), table: ${tables} (expect 1)`);

// no text loss: compare visible text of input vs output (tags stripped, entities decoded)
const textOf = (s: string) => s
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").trim();
const tIn = textOf(html), tOut = textOf(out);
check("visible text identical", tIn === tOut);
console.log(`text length in=${tIn.length} out=${tOut.length}`);

// no XSS vectors
check("no script/iframe/on*", !/<(script|iframe)\b/i.test(out) && !/on\w+=/i.test(out));

console.log(`\nSANITIZER ROUND-TRIP: ${fail === 0 ? `ALL ${pass} CHECKS PASS ✓` : `${fail} FAILURES ✗`}`);
process.exit(fail === 0 ? 0 : 1);
