// Unit tests — product description HTML editor pipeline
// Run: npx tsx scripts/test_description_html.ts
//
// Covers:
//  1. plain text → readable HTML (line breaks preserved, XSS-escaped)
//  2. HTML tag detection (incl. false positives like "a < b", "<3")
//  3. every required semantic tag survives sanitization (h1-h4, p, strong, b,
//     em, i, ul, ol, li, a, blockquote, table, thead, tbody, tr, th, td, img, br)
//  4. unsafe HTML is stripped (script, iframe, object, embed, on* handlers,
//     javascript: URLs, form, style, svg, srcdoc)
//  5. H1-in-description SEO detection
//  6. stripHtmlToText (meta/short-description fallbacks never leak tags)

import {
  plainTextToHtml,
  hasHtmlTags,
  renderDescription,
  sanitizeDescriptionHtml,
  descriptionHasH1,
  stripHtmlToText,
} from "../src/lib/description";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra?: any) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}${extra !== undefined ? " → " + String(extra).slice(0, 300) : ""}`); }
}

console.log("\n[1] plain text handling");
{
  const txt = "PlayStation Plus Deluxe is available for 1 month.\nChoose Shared or Private Account.";
  const out = renderDescription(txt);
  check("line break becomes <br>", /<br\s*\/?>/.test(out) || /<p>/.test(out), out);
  check("no raw user text lost", out.includes("PlayStation Plus Deluxe is available for 1 month."));
  check("second line present", out.includes("Choose Shared or Private Account."));
  check("no unexpected tags introduced", !/<(script|div|img|table)/i.test(out), out);

  const multi = "Para one line A\nPara one line B\n\nPara two";
  const pout = plainTextToHtml(multi);
  check("blank line splits paragraphs", pout === "<p>Para one line A<br>Para one line B</p><p>Para two</p>", pout);

  const xss = "Text with <script>alert(1)</script> inside & 5 < 6";
  const xout = plainTextToHtml(xss);
  check("plain text is entity-escaped", xout.includes("&lt;script&gt;") && xout.includes("&amp;"), xout);
  check("escaped text does not execute", !/<script>/i.test(xout));

  const angle = "I love <3 this, 5 < 6 but 7 > 2";
  check("false-positive <3 stays text", !hasHtmlTags(angle) && renderDescription(angle).includes("&lt;3"), renderDescription(angle));
}

console.log("\n[2] HTML tag detection");
{
  check("<h1> detected", hasHtmlTags("<h1>Hi</h1>"));
  check("<p > detected", hasHtmlTags("<p >Hi</p>"));
  check("</p> detected", hasHtmlTags("text </p>"));
  check("<table…> detected", hasHtmlTags('<table class="x">'));
  check("plain text not detected", !hasHtmlTags("PlayStation Plus Deluxe is available for 1 month.\nChoose Shared or Private Account."));
  check("'a < b' not detected", !hasHtmlTags("if a < b then"));
  check("'<3' not detected", !hasHtmlTags("love <3"));
  check("empty not detected", !hasHtmlTags(""));
}

console.log("\n[3] required semantic tags survive sanitization");
{
  const doc = [
    '<h1>Main Heading</h1>',
    '<h2>Section Heading</h2>',
    '<h3>FAQ Heading</h3>',
    '<h4>Small Subheading</h4>',
    '<p>Paragraph with <strong>bold</strong>, <b>b tag</b>, <em>italic</em>, <i>i tag</i>.</p>',
    '<ul><li>Bullet one</li><li>Bullet two</li></ul>',
    '<ol><li>Step one</li><li>Step two</li></ol>',
    '<p>Check <a href="https://playbeat.digital" target="_blank" rel="noopener noreferrer">our site</a>.</p>',
    '<blockquote>Quoted wisdom</blockquote>',
    '<table><thead><tr><th>Plan</th><th>Price</th></tr></thead><tbody><tr><td>1 Month</td><td>PKR 950</td></tr></tbody></table>',
    '<p><img src="https://playbeat.digital/assets/images/products/netflix.webp" alt="Netflix" width="300"></p>',
    '<p>Line one<br>Line two</p>',
  ].join("");
  const out = sanitizeDescriptionHtml(doc);
  for (const tag of ["h1","h2","h3","h4","p","strong","b","em","i","ul","ol","li","a","blockquote","table","thead","tbody","tr","th","td","img","br"]) {
    check(`<${tag}> preserved`, new RegExp(`<${tag}[\\s>]`, "i").test(out), out);
  }
  check("href kept", out.includes('href="https://playbeat.digital"'), out);
  check("img src kept", out.includes("netflix.webp"), out);
  check("img alt kept", out.includes('alt="Netflix"'), out);
  check("img width kept", out.includes('width="300"'), out);
  check("target=_blank kept", out.includes('target="_blank"'), out);
  check("rel=noopener added to _blank", out.includes("noopener"), out);
  check("clean HTML round-trips unchanged", out === doc, `\nGOT: ${out}\n`);
}

console.log("\n[4] unsafe HTML is stripped (XSS)");
{
  const out1 = sanitizeDescriptionHtml('<p>ok</p><script>alert("x")</script>');
  check("<script> removed (with content)", out1.includes("<p>ok</p>") && !/<script/i.test(out1), out1);

  const out2 = sanitizeDescriptionHtml('<img src="x" onerror="alert(1)">');
  check("onerror removed", !/onerror/i.test(out2), out2);
  check("img itself kept", /<img/.test(out2), out2);

  const out3 = sanitizeDescriptionHtml('<p onclick="alert(1)">hi</p>');
  check("onclick removed", !/onclick/i.test(out3), out3);

  const out4 = sanitizeDescriptionHtml('<a href="javascript:alert(1)">click</a>');
  check("javascript: URL removed", !/javascript:/i.test(out4), out4);

  const out5 = sanitizeDescriptionHtml('<iframe src="https://evil.example"></iframe><p>keep</p>');
  check("<iframe> removed", !/<iframe/i.test(out5) && out5.includes("<p>keep</p>"), out5);

  const out6 = sanitizeDescriptionHtml('<object data="evil"></object><embed src="evil"><p>keep</p>');
  check("<object>/<embed> removed", !/<(object|embed)/i.test(out6), out6);

  const out7 = sanitizeDescriptionHtml('<form action="/steal"><input name="cc"><button>go</button></form><p>keep</p>');
  check("<form>/<input>/<button> removed", !/<(form|input|button)/i.test(out7), out7);

  const out8 = sanitizeDescriptionHtml('<style>body{background:url(javascript:alert(1))}</style><p>keep</p>');
  check("<style> removed", !/<style/i.test(out8), out8);

  const out9 = sanitizeDescriptionHtml('<svg onload="alert(1)"><circle/></svg><p>keep</p>');
  check("<svg> removed", !/<svg/i.test(out9), out9);

  const out10 = sanitizeDescriptionHtml('<a href="https://ok.example" srcdoc="<script>alert(1)</script>">x</a>');
  check("srcdoc removed", !/srcdoc/i.test(out10), out10);

  const out11 = sanitizeDescriptionHtml('<h2 data-x="payload">ok</h2>');
  check("data-* attributes removed", !/data-x/i.test(out11), out11);

  const out12 = renderDescription('<h1>Title</h1><script>alert(1)</script><p>Body</p>');
  check("renderDescription sanitizes HTML input", !/<script/i.test(out12) && /<h1>Title<\/h1>/.test(out12), out12);
}

console.log("\n[5] H1 SEO detection");
{
  check("<h1> detected", descriptionHasH1("<h1>Main</h1><p>x</p>"));
  check("<h1 class> detected", descriptionHasH1('<h1 class="big">Main</h1>'));
  check("<H1> uppercase detected", descriptionHasH1("<H1>Main</H1>"));
  check("<h2> NOT flagged", !descriptionHasH1("<h2>Section</h2>"));
  check("plain text NOT flagged", !descriptionHasH1("just text h1"));
  check("head/hdr not falsely matched", !descriptionHasH1("<header>nav</header>"));
}

console.log("\n[6] stripHtmlToText");
{
  check("tags stripped", stripHtmlToText("<h2>Fe</h2><p>Features <strong>here</strong></p>") === "Fe Features here", stripHtmlToText("<h2>Fe</h2><p>Features <strong>here</strong></p>"));
  check("br becomes space", stripHtmlToText("a<br>b") === "a b");
  check("entities decoded", stripHtmlToText("<p>A &amp; B</p>") === "A & B");
  check("script content dropped", !stripHtmlToText("<script>bad()</script><p>ok</p>").includes("bad()"));
  check("plain text passthrough", stripHtmlToText("Just text") === "Just text");
  check("newlines collapsed for meta", stripHtmlToText("line1\nline2") === "line1 line2");
}

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
if (fail > 0) process.exit(1);
