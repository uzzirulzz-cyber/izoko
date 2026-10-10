// Generates public/ads.txt from the ADSENSE_CLIENT_ID build-time env var.
// ads.txt is a Google publisher-policy requirement for authorized sellers.
//   With ID:  google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
//   Without:  comments-only file (valid ads.txt — no records declared)
// The admin Business Analytics panel can also set the ID at runtime (DB);
// ads.txt is refreshed from the build env on every deploy.
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/ads.txt')

// The central runtime config may live in MongoDB rather than a build variable.
// Preserve a validated committed publisher record when no build override exists.
const prior = existsSync(OUT) ? readFileSync(OUT, 'utf8').match(/^google\.com,\s*(pub-\d{16}),\s*DIRECT,\s*f08c47fec0942fa0\s*$/m)?.[1] || '' : ''
const raw = String(process.env.ADSENSE_CLIENT_ID || prior).trim()
const pub = raw.replace(/^ca-/, '') // ads.txt wants the bare pub- id

const HEADER = [
  '# ads.txt — Authorized Digital Sellers for playbeat.digital',
  '# Managed automatically at build time (scripts/generate-ads-txt.mjs).',
  '# Build override: ADSENSE_CLIENT_ID; otherwise preserves the committed record.',
  '# Keep this publisher consistent with the central Business Analytics settings.',
]

let lines = [...HEADER]
if (/^pub-\d{10,16}$/.test(pub)) {
  lines.push(`google.com, ${pub}, DIRECT, f08c47fec0942fa0`)
} else {
  lines.push('# (no AdSense publisher id configured yet — no records declared)')
}

writeFileSync(OUT, lines.join('\n') + '\n')
console.log(`generated ${OUT} ${existsSync(OUT) ? '(' + readFileSync(OUT, 'utf8').split('\n').length + ' lines)' : ''}`)
