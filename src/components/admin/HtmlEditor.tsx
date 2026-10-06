import { useState, useRef, useCallback, useEffect } from "react";
import {
  sanitizeDescriptionHtml,
  hasHtmlTags,
  descriptionHasH1,
} from "../../lib/description";

/**
 * WooCommerce-style editor for product descriptions.
 *
 * - Visual mode (contentEditable): write normal text or use the toolbar for
 *   headings, bold/italic, lists, links, blockquotes and tables. Paste rich
 *   content directly. Plain text typed here keeps its line breaks.
 * - HTML mode (textarea): paste/edit full raw HTML (h1-h4, p, ul/ol, tables,
 *   images, links …). Nothing is converted or stripped while editing.
 * - Switching modes preserves the content EXACTLY — no rewriting.
 * - Saved to MongoDB exactly as entered; sanitization happens on render.
 * - Non-blocking SEO hint when an <h1> is written inside the description
 *   (the product title is the page's main H1).
 */

export { sanitizeDescriptionHtml as sanitizeDescription };

type Mode = "visual" | "code";

export function HtmlEditor({ value, onChange, placeholder = "Write product description…", minHeight = 280 }:{
  value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number;
}) {
  const [mode, setMode] = useState<Mode>("visual");
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>(value);
  const suppress = useRef(false);
  const prevMode = useRef<Mode>(mode);

  const paintVisual = useCallback((html: string) => {
    if (!editorRef.current) return;
    suppress.current = true;
    const isPlain = !hasHtmlTags(html || "");
    editorRef.current.classList.toggle("whitespace-pre-wrap", isPlain);
    if (isPlain) {
      // Plain text — render with textContent so line breaks stay visible,
      // and emit it back verbatim (never converted to HTML behind the admin's back).
      editorRef.current.textContent = html || "";
    } else {
      editorRef.current.innerHTML = sanitizeDescriptionHtml(html || "");
    }
    lastEmitted.current = html || "";
    suppress.current = false;
  }, []);

  // Repaint the visual surface ONLY when it would lose data:
  //  - the FIRST time the surface mounts (editing an existing description),
  //  - switching back to Visual mode (code-mode edits must show up), or
  //  - the value changed from OUTSIDE the editor (product loaded async).
  // Typing must never repaint, otherwise the caret would reset every keystroke.
  const paintedOnce = useRef(false);
  useEffect(() => {
    const switchedToVisual = mode === "visual" && prevMode.current !== "visual";
    prevMode.current = mode;
    if (mode !== "visual" || !editorRef.current) return;
    if (paintedOnce.current && !switchedToVisual && value === lastEmitted.current) return;
    paintedOnce.current = true;
    paintVisual(value || "");
  }, [value, mode, paintVisual]);

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
    if (mode === "visual") emit(); // flush visual edits before showing code
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
          placeholder={"<h1>Product title</h1>\n<p>Introduction…</p>\n\n<h2>Key Features</h2>\n<ul>\n  <li>Feature one</li>\n</ul>"}
          className="w-full resize-y border-0 bg-white dark:bg-zinc-900 px-4 py-3 font-mono text-xs leading-relaxed outline-none"
          style={{ minHeight }} spellCheck={false} />
      )}

      {/* Non-blocking SEO hint — description-level H1 vs the product title */}
      {descriptionHasH1(value) && (
        <div className="flex items-start gap-2 border-t border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
          <span aria-hidden>⚠</span>
          <span>Product title already uses H1. Prefer H2 for sections and H3/H4 for subsections.</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1 text-[10px] text-zinc-500">
        <span>{mode === "visual" ? "Visual mode — plain text & rich content, line breaks kept" : "HTML mode — edit raw HTML. Saved as-is to MongoDB."}</span>
        <span>{value ? `${value.length} chars` : "0 chars"}</span>
      </div>
    </div>
  );
}
