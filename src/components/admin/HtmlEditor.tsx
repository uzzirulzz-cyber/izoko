import { useState, useRef, useCallback, useEffect } from "react";
import DOMPurify from "isomorphic-dompurify";

/**
 * WooCommerce-style HTML editor for product descriptions.
 * Visual mode (contentEditable) + HTML code mode (textarea).
 * Preserves semantic HTML (h1-h4, p, ul, ol, li, a, blockquote, table) on round-trip.
 * XSS-safe: isomorphic-dompurify strips scripts, iframes, on* handlers, javascript: URLs.
 */

const ALLOWED_TAGS = [
  "h1","h2","h3","h4","h5","h6","p","br","hr",
  "strong","b","em","i","u","s","span","div",
  "ul","ol","li","a","blockquote","code","pre",
  "table","thead","tbody","tfoot","tr","th","td","img",
];
const ALLOWED_ATTR = ["href","title","target","rel","src","alt","width","height","colspan","rowspan","class","style"];

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ["script","iframe","object","embed","form","input","button","style","link","meta","base"],
  FORBID_ATTR: ["onerror","onload","onclick","onmouseover","onmouseout","onfocus","onblur","onchange","onsubmit","formaction"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

export function sanitizeDescription(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node: any) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

type Mode = "visual" | "code";

export function HtmlEditor({ value, onChange, placeholder = "Write product description…", minHeight = 280 }:{
  value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number;
}) {
  const [mode, setMode] = useState<Mode>("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>(value);
  const suppress = useRef(false);

  useEffect(() => {
    if (mode !== "visual" || !editorRef.current) return;
    if (value === lastEmitted.current) return;
    suppress.current = true;
    editorRef.current.innerHTML = sanitizeDescription(value);
    lastEmitted.current = value;
    suppress.current = false;
  }, [value, mode]);

  const syncVisual = useCallback(() => {
    if (!editorRef.current) return;
    suppress.current = true;
    editorRef.current.innerHTML = sanitizeDescription(value || "");
    lastEmitted.current = value || "";
    suppress.current = false;
  }, [value]);

  useEffect(() => { if (mode === "visual") syncVisual(); }, [mode, syncVisual]);

  const emit = useCallback(() => {
    if (suppress.current || !editorRef.current) return;
    const html = editorRef.current.innerHTML;
    if (html !== lastEmitted.current) { lastEmitted.current = html; onChange(html); }
  }, [onChange]);

  const exec = (cmd: string, val?: string) => {
    if (mode !== "visual") return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const applyHeading = (tag: string) => {
    if (mode !== "visual") return;
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    emit();
  };

  const applyLink = () => {
    if (mode !== "visual") return;
    const sel = window.getSelection();
    const txt = sel?.toString() || "";
    const url = window.prompt("Enter URL (https://…)", "https://");
    if (!url) return;
    editorRef.current?.focus();
    if (txt) document.execCommand("createLink", false, url);
    else { const s = url.replace(/"/g, "&quot;"); document.execCommand("insertHTML", false, `<a href="${s}" target="_blank" rel="noopener noreferrer">${s}</a>`); }
    emit();
  };

  const insertTable = () => {
    if (mode !== "visual") return;
    const rs = window.prompt("Number of rows", "3"); if (!rs) return;
    const cs = window.prompt("Number of columns", "3"); if (!cs) return;
    const r = Math.min(20, Math.max(1, parseInt(rs) || 3)), c = Math.min(10, Math.max(1, parseInt(cs) || 3));
    let h = '<table><thead><tr>';
    for (let i = 0; i < c; i++) h += `<th>Header ${i+1}</th>`;
    h += "</tr></thead><tbody>";
    for (let i = 0; i < r; i++) { h += "<tr>"; for (let j = 0; j < c; j++) h += "<td>—</td>"; h += "</tr>"; }
    h += "</tbody></table><p></p>";
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, h);
    emit();
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (mode === "visual") emit();
    setMode(next);
  };

  const btn = "inline-flex items-center justify-center h-8 w-8 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40";

  return (
    <div className="rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden bg-white dark:bg-zinc-900">
      {/* Mode toggle */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1.5">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Product Description · HTML Editor</span>
        <div className="flex gap-0.5">
          <button type="button" onClick={() => switchMode("visual")}
            className={`px-2.5 py-1 text-xs rounded font-medium ${mode === "visual" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>
            Visual
          </button>
          <button type="button" onClick={() => switchMode("code")}
            className={`px-2.5 py-1 text-xs rounded font-medium ${mode === "code" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>
            HTML
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {mode === "visual" && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5">
          <select onChange={(e) => { if (e.target.value) { applyHeading(e.target.value); e.target.value = ""; } }}
            className="h-8 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 mr-1 px-1">
            <option value="">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
          </select>
          <button type="button" className={btn} onClick={() => exec("bold")} title="Bold (Ctrl+B)"><b>B</b></button>
          <button type="button" className={btn} onClick={() => exec("italic")} title="Italic (Ctrl+I)"><i>I</i></button>
          <button type="button" className={btn} onClick={() => exec("insertUnorderedList")} title="Bullet list">• List</button>
          <button type="button" className={btn} onClick={() => exec("insertOrderedList")} title="Numbered list">1. List</button>
          <button type="button" className={btn} onClick={applyLink} title="Insert link">🔗</button>
          <button type="button" className={btn} onClick={() => exec("formatBlock", "blockquote")} title="Blockquote">❝</button>
          <button type="button" className={btn} onClick={insertTable} title="Insert table">▦</button>
          <button type="button" className={btn} onClick={() => exec("undo")} title="Undo (Ctrl+Z)">↶</button>
          <button type="button" className={btn} onClick={() => exec("redo")} title="Redo (Ctrl+Y)">↷</button>
        </div>
      )}

      {/* Editor surface */}
      {mode === "visual" ? (
        <div ref={editorRef} contentEditable suppressContentEditableWarning
          onInput={emit} onBlur={emit} data-ph={placeholder}
          className="pb-html-editor outline-none px-4 py-3 text-sm"
          style={{ minHeight }} />
      ) : (
        <textarea value={value || ""} onChange={(e) => { lastEmitted.current = e.target.value; onChange(e.target.value); }}
          placeholder="<h1>Product title</h1>\n<p>Introduction…</p>\n\n<h2>Key Features</h2>\n<ul>\n  <li>Feature one</li>\n</ul>"
          className="w-full resize-y border-0 bg-white dark:bg-zinc-900 px-4 py-3 font-mono text-xs leading-relaxed outline-none"
          style={{ minHeight }} spellCheck={false} />
      )}

      <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1 text-[10px] text-zinc-500">
        <span>{mode === "visual" ? "Visual mode — use toolbar or paste rich content" : "HTML mode — edit raw HTML. Saved as-is to MongoDB."}</span>
        <span>{value ? `${value.length} chars` : "0 chars"}</span>
      </div>
    </div>
  );
}
