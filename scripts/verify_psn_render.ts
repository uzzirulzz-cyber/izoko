// verify_psn_render.ts — run the repo's sanitizer config on the PSN description
import DOMPurify from "isomorphic-dompurify";
import fs from "fs";

const html = fs.readFileSync("/home/z/my-project/scripts/psn_description.html", "utf8");

const ALLOWED_TAGS = ["h1","h2","h3","h4","h5","h6","p","br","hr","strong","b","em","i","u","s","span","div","ul","ol","li","a","blockquote","code","pre","table","thead","tbody","tfoot","caption","tr","th","td","img","figure","figcaption"];
const ALLOWED_ATTR = ["href","title","target","rel","src","srcset","alt","width","height","loading","colspan","rowspan","class","style"];
const out = DOMPurify.sanitize(html, {
  ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script","iframe","object","embed","form","input","button","select","textarea","style","link","meta","base","svg","math","video","audio","source","track","frame","frameset","applet","noscript","template"],
  FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onmouseout","onmousemove","onfocus","onblur","onchange","onsubmit","onkeydown","onkeyup","onkeypress","ontouchstart","formaction","srcdoc","xlink:href","nonce","autofocus","is"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
});

let pass = 0, fail = 0;
const check = (n: string, c: boolean) => { c ? pass++ : (fail++, console.log("FAIL: " + n)); };

check("no h1 (product title is the page H1)", !/<h1[\s>]/i.test(html));
for (const tag of ["h2", "h3", "p", "strong", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td"]) {
  check(`<${tag}> preserved`, new RegExp(`<${tag}[\\s>]`, "i").test(out));
}
const h2s = (out.match(/<h2>/g) || []).length;
const h3s = (out.match(/<h3>/g) || []).length;
console.log(`h2: ${h2s} | h3: ${h3s} | table: 1`);
check("h2 count = 7 (7 sections)", h2s === 7);
check("h3 count = 9 (FAQ questions)", h3s === 9);
check("table = 1 (denominations)", (out.match(/<table>/g) || []).length === 1);
check("all 6 SKUs listed in table", ["PSN-US-10USD","PSN-US-20USD","PSN-US-25USD","PSN-US-50USD","PSN-US-75USD","PSN-US-100USD"].every((s) => out.includes(s)));
check("US region messaging present", out.includes("United States") && out.includes("US-region") || out.includes("US region"));
check("no G2A mention", !/g2a/i.test(out));

const textOf = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
check("visible text identical", textOf(html) === textOf(out));
console.log(`text length in=${textOf(html).length} out=${textOf(out).length}`);
check("no XSS vectors", !/<(script|iframe)\b/i.test(out) && !/on\w+=/i.test(out));

console.log(`\nSANITIZER ROUND-TRIP: ${fail === 0 ? `ALL ${pass} CHECKS PASS ✓` : `${fail} FAILURES ✗`}`);
process.exit(fail === 0 ? 0 : 1);
