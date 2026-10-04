/**
 * Vendor the owner-uploaded admin CSS libraries (Bootstrap 4.3.1 stack)
 * SCOPED under the admin root class `.pbadmin` — storefront untouched.
 *
 * Uploads (from /home/z/my-project/upload):
 *   bootstrap.min.css (v4.3.1), animate.css, aos.css, magnific-popup.css,
 *   nice-select.css, owl.carousel.min.css, slick.css, flaticon.css,
 *   font-awesome.min.css (v4.5.0), themify-icons.css
 *
 * Order of concatenation (must load BEFORE sb2-scoped.css so the scoped
 * Bootstrap 4.6 + SB2 theme in sb2-scoped.css keeps winning collisions,
 * and before admin-theme.css which stays the final word):
 *   1. bootstrap 4.3.1      (reboot/grid/utilities — complements SB2's 4.6)
 *   2. font-awesome 4.5.0   (icons, local fonts)
 *   3. themify-icons        (icons, local fonts)
 *   4. flaticon             (2 template icons; @font-face stripped — font not provided)
 *   5. animate.css          (class-scoped entrance animations)
 *   6. aos.css              (scroll-reveal; runtime = src/admin/adminMotion.ts)
 *   7. magnific-popup.css   (lightbox styles)
 *   8. nice-select.css      (custom select styles)
 *   9. owl.carousel.min.css (carousel styles)
 *  10. slick.css            (carousel core styles)
 *
 * Output: src/admin/vendor-scoped.css + src/admin/fonts/*
 * Run: node scripts/vendor_admin_libs.mjs
 */
import postcss from 'postcss'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const UPLOAD = '/home/z/my-project/upload'
const OUT = resolve(ROOT, 'src/admin/vendor-scoped.css')
const FONTS_DIR = resolve(ROOT, 'src/admin/fonts')

const LIBS = [
  'bootstrap.min.css',
  'font-awesome.min.css',
  'themify-icons.css',
  'flaticon.css',
  'animate.css',
  'aos.css',
  'magnific-popup.css',
  'nice-select.css',
  'owl.carousel.min.css',
  'slick.css',
]

const NO_FONTFACE = ['flaticon.css'] // font binary not provided — strip @font-face to avoid 404s

/** Prefix every selector with `.pbadmin ` (html/body/:root map to the shell itself). */
function scopeCss(css, from) {
  const root = postcss.parse(css, { from })
  root.walkRules((rule) => {
    const parent = rule.parent
    if (parent && parent.type === 'atrule' && /keyframes$/i.test(parent.name || '')) return // 0%/from/to
    rule.selectors = rule.selectors.map((sel) => {
      const s = sel.trim()
      if (s.startsWith('.pbadmin')) return s
      if (/^(html|body|:root|\*)($|[\s,:[])/.test(s) && /^((html|body|:root)(\s|$|,)|html\s+body\s*$)/.test(s)) {
        // html / body / :root / html body → the shell itself
        return '.pbadmin'
      }
      return `.pbadmin ${s}`
    })
  })
  return root.toString()
}

/** Fetch a font binary; returns Buffer or null. */
async function fetchFont(url) {
  try {
    const r = await fetch(url, { redirect: 'follow' })
    if (!r.ok) return null
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length < 10_000) return null // fonts are ≥ 20KB; smaller = error page
    return buf
  } catch {
    return null
  }
}

const FONTS = [
  {
    file: 'fontawesome-webfont.woff2',
    urls: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/fonts/fontawesome-webfont.woff2'],
  },
  {
    file: 'fontawesome-webfont.woff',
    urls: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/fonts/fontawesome-webfont.woff'],
  },
  {
    file: 'fontawesome-webfont.ttf',
    urls: ['https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.5.0/fonts/fontawesome-webfont.ttf'],
  },
  {
    file: 'themify.woff',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/themify-icons/0.1.2/fonts/themify.woff',
      'https://raw.githubusercontent.com/lykmapipo/themify-icons/master/fonts/themify.woff',
    ],
  },
  {
    file: 'themify.ttf',
    urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/themify-icons/0.1.2/fonts/themify.ttf',
      'https://raw.githubusercontent.com/lykmapipo/themify-icons/master/fonts/themify.ttf',
    ],
  },
]

// 1x1 transparent PNG (owl video play icon placeholder — feature unused in admin)
const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function main() {
  mkdirSync(FONTS_DIR, { recursive: true })
  const parts = []
  const fontReport = []

  for (const lib of LIBS) {
    const src = resolve(UPLOAD, lib)
    if (!existsSync(src)) {
      console.warn(`SKIP ${lib} — not found in upload dir`)
      continue
    }
    let css = readFileSync(src, 'utf8')

    // External font refs → local vendored path (FA + themify); strip flaticon @font-face
    if (NO_FONTFACE.includes(lib)) {
      css = css.replace(/@font-face\s*\{[^}]*\}/g, '/* @font-face stripped — binary not provided */')
    } else {
      css = css.replaceAll('../fonts/', './fonts/')
    }

    // owl video placeholder png → inline data URI
    css = css.replaceAll('url(owl.video.play.png)', `url(${PIXEL_PNG})`)

    const scoped = scopeCss(css, src)
    parts.push(`\n/* ===== ${lib} — scoped under .pbadmin ===== */\n${scoped}`)
    const kb = (Buffer.byteLength(scoped) / 1024).toFixed(1)
    console.log(`scoped ${lib} (${kb} KB)`)
  }

  // 2. fonts
  for (const f of FONTS) {
    const dest = resolve(FONTS_DIR, f.file)
    if (existsSync(dest) && statSync(dest).size > 10_000) {
      fontReport.push(`${f.file}: cached`)
      continue
    }
    let got = null
    for (const u of f.urls) {
      got = await fetchFont(u)
      if (got) {
        writeFileSync(dest, got)
        fontReport.push(`${f.file}: vendored from ${u.split('/')[2]} (${(got.length / 1024).toFixed(0)} KB)`)
        break
      }
    }
    if (!got) fontReport.push(`${f.file}: UNAVAILABLE — icon font falls back (classes defined, no glyph)`)
  }
  console.log('fonts:\n  ' + fontReport.join('\n  '))

  // 3. concatenate + write
  const header = `/* ============================================================
   ADMIN VENDOR LIBS — scoped under .pbadmin (storefront untouched)
   Generated by scripts/vendor_admin_libs.mjs — DO NOT EDIT BY HAND.
   Stack: Bootstrap 4.3.1 + Font Awesome 4.5 + Themify + Flaticon +
   Animate.css + AOS + Magnific Popup + Nice Select + Owl + Slick.
   Import order: BEFORE sb2-scoped.css (BS4.6 + SB2 theme wins) and
   before admin-theme.css (final word). Fonts in ./fonts/.
   ============================================================ */`

  const out = header + parts.join('\n') + '\n'
  writeFileSync(OUT, out)
  console.log(`wrote ${OUT} (${(Buffer.byteLength(out) / 1024).toFixed(1)} KB)`)

  // 4. sanity: no unprefixed html/body rules, keyframes intact
  const bad = out.match(/(^|[\n}])(html|body)\s*[,{]/)
  if (bad) console.warn('WARN: possible unprefixed html/body rule near', JSON.stringify(out.slice(out.indexOf(bad[0]) - 40, out.indexOf(bad[0]) + 60)))
  const kf = out.match(/@keyframes[^{]+\{[^}]*\{/)
  console.log('keyframes present:', Boolean(kf))
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
