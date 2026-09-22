// check_jsx_imports.mjs — find JSX components used but never imported/defined
// (catches DOM-lib name collisions like <Lock /> that tsc silently accepts)
import fs from 'fs';
import path from 'path';

const SRC = '/home/z/my-project/izoko/src';
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) files.push(p);
  }
})(SRC);

let issues = 0;
for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  // imported identifiers
  const imported = new Set();
  for (const m of code.matchAll(/import\s+(?:type\s+)?(?:\{([^}]*)\}|(\w+))(?:\s*,\s*\{([^}]*)\})?\s+from/g)) {
    const names = [...(m[1] || '').split(','), ...(m[3] || '').split(',')].map(s => s.trim().split(/\s+as\s+/).pop().trim());
    names.forEach(n => n && imported.add(n));
    if (m[2]) imported.add(m[2]);
  }
  // locally defined components
  const defined = new Set();
  for (const m of code.matchAll(/(?:function|const|class)\s+([A-Z]\w*)/g)) defined.add(m[1]);

  // JSX component usages
  for (const m of code.matchAll(/<([A-Z]\w*)[\s/>]/g)) {
    const name = m[1];
    if (imported.has(name) || defined.has(name)) continue;
    console.log(`${file.replace(SRC + '/', '')}: <${name} /> used but NOT imported/defined`);
    issues++;
  }
}
console.log(issues ? `\n${issues} issue(s) found` : 'ALL CLEAN');
