/**
 * Product description — shared rendering/sanitizing helpers (client-side).
 *
 * Admins may author the product description as EITHER plain text (with normal
 * line breaks) OR full semantic HTML (h1-h6, p, lists, links, tables, images,
 * blockquotes …). MongoDB stores the string exactly as entered — this module
 * only decides how it is DISPLAYED safely on the storefront.
 *
 * Rules:
 *  - Content that already contains HTML tags is sanitized with DOMPurify and
 *    rendered as-is (semantic headings/lists/tables/images are preserved).
 *  - Content without any HTML tags is treated as plain text: it is escaped
 *    and its line breaks are converted to real <br> / <p> structure so the
 *    readable spacing the admin typed is preserved on the storefront.
 *  - Unsafe markup (script/iframe/object/embed/event handlers/javascript:
 *    URLs …) is always stripped — valid content is never mangled.
 */

import DOMPurify from "isomorphic-dompurify";

/** Matches an actual HTML tag from the allowed markup vocabulary. Plain text
 *  like "a < b" or "<3" does NOT match, so it stays plain text. */
const HTML_TAG_RE =
  /<(\/?)(h[1-6]|p|div|span|br|hr|strong|b|em|i|u|s|small|sub|sup|ul|ol|li|a|blockquote|code|pre|table|thead|tbody|tfoot|caption|tr|th|td|img|figure|figcaption)(\s[^>]*)?>/i;

const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6","p","br","hr",
  "strong","b","em","i","u","s","span","div",
  "ul","ol","li","a","blockquote","code","pre",
  "table","thead","tbody","tfoot","caption","tr","th","td",
  "img","figure","figcaption",
];

const ALLOWED_ATTR = [
  "href","title","target","rel","src","srcset","alt","width","height","loading",
  "colspan","rowspan","class","style",
];

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: [
    "script","iframe","object","embed","form","input","button","select","textarea",
    "style","link","meta","base","svg","math","video","audio","source","track",
    "frame","frameset","applet","noscript","template",
  ],
  FORBID_ATTR: [
    "onerror","onload","onclick","onmouseover","onmouseout","onmousemove","onfocus",
    "onblur","onchange","onsubmit","onkeydown","onkeyup","onkeypress","ontouchstart",
    "formaction","srcdoc","xlink:href","nonce","autofocus","is",
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

// Ensure target=_blank links always get a safe rel (runs for every sanitize).
// isomorphic-dompurify provides a DOM in Node too (jsdom), so this is safe
// to register unconditionally — browser and SSR behave identically.
DOMPurify.addHook("afterSanitizeAttributes", (node: any) => {
  if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/** Sanitize admin-authored HTML: keeps semantic content, strips XSS vectors. */
export function sanitizeDescriptionHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

/** Does the string contain real HTML markup? */
export function hasHtmlTags(text: string): boolean {
  return !!text && HTML_TAG_RE.test(text);
}

/** Escape a plain-text chunk for safe injection into innerHTML. */
export function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Convert plain text (line breaks, blank lines) into clean, safe HTML:
 *   - blank line separated blocks become <p>…</p>
 *   - single line breaks inside a block become <br>
 * The result reads exactly like the text the admin typed.
 */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  const blocks = escapeHtml(text.replace(/\r\n?/g, "\n"))
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => `<p>${b.replace(/\n/g, "<br>")}</p>`);
  return blocks.join("");
}

/**
 * Prepare ANY stored description (plain text or HTML) for innerHTML rendering:
 *  - plain text  → escaped + line-break aware markup (req: readable spacing)
 *  - HTML        → DOMPurify-sanitized, semantic tags fully preserved
 */
export function renderDescription(raw: string): string {
  const value = (raw || "").toString();
  if (!value.trim()) return "";
  if (hasHtmlTags(value)) return sanitizeDescriptionHtml(value);
  return plainTextToHtml(value);
}

/** True when the admin wrote an <h1> inside the description (SEO hint). */
export function descriptionHasH1(html: string): boolean {
  return !!html && /<h1[\s>]/i.test(html);
}

/**
 * Convert HTML (or plain text) into a single-line plain string — used ONLY for
 * derived fallbacks (storefront card snippet, meta description) so raw tags
 * never leak into SEO fields. Never mutates the stored description itself.
 */
export function stripHtmlToText(html: string): string {
  const value = (html || "").toString();
  if (!value) return "";
  if (!hasHtmlTags(value)) return value.replace(/\s+/g, " ").trim();
  return value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
