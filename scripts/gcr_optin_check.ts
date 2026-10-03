/**
 * Google Customer Reviews opt-in — integration verification harness.
 * (No DB, no network, no browser: window/document are mocked.)
 *
 * Run: npx tsx scripts/gcr_optin_check.ts   (or: npm run test:gcr)
 * Exit 0 = all checks PASS, exit 1 = any failure.
 *
 * Covers the integration contract:
 *  1. delivery country derivation (explicit > +92 phone > store default)
 *  2. estimated delivery date derivation (digital +1 / courier +7, YYYY-MM-DD)
 *  3. host guard (localhost / http / other hosts never fire)
 *  4. script injection contract (?onload=renderOptIn, injected once)
 *  5. render params exactness (merchant_id 5847422419 + real order data)
 *  6. duplicate-render prevention (same order twice → one render)
 *  7. graceful failure (script onerror → warn, guards released for retry)
 *  8. input validation (garbage email/country/date → silent no-op)
 *  9. already-loaded gapi → direct render without re-injection
 */

const MERCHANT_ID = 5847422419

// --------------------------------------------------------------- harness --
let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  const tag = cond ? 'PASS' : 'FAIL'
  if (!cond) failures++
  console.log(`${tag}  ${name}${detail ? ` — ${detail}` : ''}`)
}

type Env = {
  warns: string[]
  scripts: any[]
  rendered: any[]
  g: any
}

function makeEnv(protocol: string, hostname: string): Env {
  const env: Env = { warns: [], scripts: [], rendered: [], g: globalThis as any }
  env.g.window = {
    location: { protocol, hostname },
    gapi: undefined,
    renderOptIn: undefined,
  }
  env.g.document = {
    createElement: (tag: string) => ({
      tag,
      id: '',
      src: '',
      async: false,
      defer: false,
      onerror: null,
      remove() {
        const i = env.scripts.findIndex((s) => s === this)
        if (i >= 0) env.scripts.splice(i, 1)
      },
    }),
    getElementById: (id: string) => env.scripts.find((s) => s.id === id) || null,
    head: { appendChild: (el: any) => void env.scripts.push(el) },
  }
  const origWarn = console.warn
  console.warn = (...args: any[]) => {
    env.warns.push(args.map(String).join(' '))
    origWarn(...args)
  }
  return env
}

/** Simulate platform.js having loaded: defines gapi and fires the onload cb. */
function simulatePlatformLoad(env: Env) {
  env.g.window.gapi = {
    load: (_module: string, cb: () => void) => cb(),
    surveyoptin: { render: (params: any) => void env.rendered.push(params) },
  }
  env.g.window.renderOptIn()
}

function freshLib() {
  // The lib keeps ALL mutable state on window.__pbCustomerReviews — each
  // makeEnv() replaces globalThis.window, so state resets per case even
  // though the module itself is a cached import.
  return import('../src/lib/googleCustomerReviews.ts')
}

// ----------------------------------------------------------------- cases --
async function main() {
  const {
    deriveDeliveryCountry,
    computeEstimatedDeliveryDate,
    isCustomerReviewsHostAllowed,
  } = await freshLib()

  // ---- 1. delivery country derivation ----
  check('country: explicit stored country wins', deriveDeliveryCountry('+923001234567', 'AE') === 'AE')
  check('country: lowercase explicit normalized', deriveDeliveryCountry('', 'us') === 'US')
  check('country: +92 phone → PK', deriveDeliveryCountry('+92 300 1234567') === 'PK')
  check('country: 0092 phone → PK', deriveDeliveryCountry('00923001234567') === 'PK')
  check('country: non-PK phone → store default PK', deriveDeliveryCountry('+447911123456') === 'PK')
  check('country: no data → store default PK', deriveDeliveryCountry('') === 'PK')

  // ---- 2. estimated delivery date ----
  const digital = computeEstimatedDeliveryDate('2026-10-04T10:00:00.000Z', [
    { deliveryType: 'Instant Auto-Email' },
  ])
  check('date: YYYY-MM-DD format', /^\d{4}-\d{2}-\d{2}$/.test(digital), digital)
  const courier = computeEstimatedDeliveryDate('2026-10-04T10:00:00.000Z', [
    { deliveryType: 'Courier Shipping' },
  ])
  const dC = new Date(courier)
  const dD = new Date(digital)
  const diffDays = Math.round((dC.getTime() - dD.getTime()) / 86400000)
  check('date: courier is 6 days after digital (+7 vs +1)', diffDays === 6, `digital=${digital} courier=${courier}`)
  const noDate = computeEstimatedDeliveryDate(undefined, [])
  check('date: missing createdAt falls back to today+1', /^\d{4}-\d{2}-\d{2}$/.test(noDate))
  const garbage = computeEstimatedDeliveryDate('not-a-date', [{ deliveryType: 'Courier Shipping' }])
  check('date: garbage createdAt falls back gracefully', /^\d{4}-\d{2}-\d{2}$/.test(garbage))
  const digitalFlag = computeEstimatedDeliveryDate('2026-10-04T10:00:00.000Z', [
    { digital: false } as any,
  ])
  check('date: digital:false treated as courier (+7)', digitalFlag === courier, digitalFlag)

  // ---- 3. host guard ----
  const dev = makeEnv('http:', 'localhost')
  const lib1 = await freshLib()
  lib1.renderCustomerReviewsOptIn({
    orderId: 'PB-TEST-001',
    email: 'customer@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-05',
  })
  check('guard: localhost never injects the script', dev.scripts.length === 0)
  check('guard: localhost never defines renderOptIn', !dev.g.window.renderOptIn)

  const http = makeEnv('http:', 'playbeat.digital')
  const lib2 = await freshLib()
  lib2.renderCustomerReviewsOptIn({
    orderId: 'PB-TEST-002',
    email: 'customer@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-05',
  })
  check('guard: plain http is rejected', http.scripts.length === 0)

  const preview = makeEnv('https:', 'izoko-xyz.vercel.app')
  const lib3 = await freshLib()
  lib3.renderCustomerReviewsOptIn({
    orderId: 'PB-TEST-003',
    email: 'customer@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-05',
  })
  check('guard: preview deployments never fire', preview.scripts.length === 0)

  check('host helper: production allowed', ((): boolean => {
    makeEnv('https:', 'playbeat.digital')
    return isCustomerReviewsHostAllowed()
  })())
  check('host helper: www allowed', ((): boolean => {
    makeEnv('https:', 'www.playbeat.digital')
    return isCustomerReviewsHostAllowed()
  })())

  // ---- 4. script injection contract (production host) ----
  const prod = makeEnv('https:', 'playbeat.digital')
  const lib4 = await freshLib()
  lib4.renderCustomerReviewsOptIn({
    orderId: 'PB-100001-111',
    email: 'buyer@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-05',
  })
  check('inject: exactly one script element', prod.scripts.length === 1)
  check('inject: platform.js URL with onload=renderOptIn', /https:\/\/apis\.google\.com\/js\/platform\.js\?onload=renderOptIn$/.test(prod.scripts[0]?.src || ''), prod.scripts[0]?.src)
  check('inject: async+defer', prod.scripts[0]?.async === true && prod.scripts[0]?.defer === true)
  check('inject: window.renderOptIn defined BEFORE script fires', typeof prod.g.window.renderOptIn === 'function')

  // ---- 5. render params exactness ----
  simulatePlatformLoad(prod)
  check('render: survey rendered once after platform.js onload', prod.rendered.length === 1)
  const p = prod.rendered[0] || {}
  check('render: merchant_id exact', p.merchant_id === MERCHANT_ID, String(p.merchant_id))
  check('render: real order id passed', p.order_id === 'PB-100001-111', String(p.order_id))
  check('render: real email passed', p.email === 'buyer@example.com', String(p.email))
  check('render: alpha-2 country', p.delivery_country === 'PK', String(p.delivery_country))
  check('render: YYYY-MM-DD delivery date', p.estimated_delivery_date === '2026-10-05', String(p.estimated_delivery_date))

  // ---- 6. duplicate-render prevention ----
  lib4.renderCustomerReviewsOptIn({
    orderId: 'PB-100001-111',
    email: 'buyer@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-05',
  })
  prod.g.window.renderOptIn() // React re-render firing the onload chain again
  check('dedupe: same order renders only once', prod.rendered.length === 1)

  lib4.renderCustomerReviewsOptIn({
    orderId: 'PB-100001-112', // a genuinely different order in the same session
    email: 'buyer@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-06',
  })
  check('dedupe: different order still renders', prod.rendered.length === 2 && prod.rendered[1].order_id === 'PB-100001-112')
  check('inject: platform.js still loaded exactly once', prod.scripts.length === 1)

  // ---- 7. graceful failure ----
  const fail = makeEnv('https:', 'playbeat.digital')
  const lib5 = await freshLib()
  lib5.renderCustomerReviewsOptIn({
    orderId: 'PB-200001-222',
    email: 'buyer2@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-07',
  })
  fail.scripts[0].onerror() // Google script blocked / network failure
  check('failure: warns but does not throw', fail.warns.some((w) => /platform\.js failed to load/.test(w)))
  check('failure: no survey rendered', fail.rendered.length === 0)
  check('failure: dead script element removed from DOM', fail.scripts.length === 0)
  // retry after failure is possible (guards released) — a fresh visit calls again
  lib5.renderCustomerReviewsOptIn({
    orderId: 'PB-200001-222',
    email: 'buyer2@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-07',
  })
  check('failure: retry re-injects fresh script (guard released)', fail.scripts.length === 1)
  // and the retried script, once loaded, renders exactly once
  simulatePlatformLoad(fail)
  check('failure: retried chain renders the survey once', fail.rendered.length === 1 && fail.rendered[0].order_id === 'PB-200001-222')

  // ---- 8. input validation ----
  const bad = makeEnv('https:', 'playbeat.digital')
  const lib6 = await freshLib()
  const validData = {
    email: 'buyer@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-05',
  }
  lib6.renderCustomerReviewsOptIn({ ...validData, orderId: '' } as any)
  lib6.renderCustomerReviewsOptIn({ ...validData, orderId: 'PB-X-1', email: 'not-an-email' })
  lib6.renderCustomerReviewsOptIn({ ...validData, orderId: 'PB-X-1', deliveryCountry: 'PAKISTAN' })
  lib6.renderCustomerReviewsOptIn({ ...validData, orderId: 'PB-X-1', estimatedDeliveryDate: '10/05/2026' })
  check('validation: garbage inputs never inject anything', bad.scripts.length === 0 && bad.rendered.length === 0)

  // ---- 9. gapi already loaded (second order, same SPA session) ----
  const warm = makeEnv('https:', 'playbeat.digital')
  const lib7 = await freshLib()
  warm.g.window.gapi = {
    load: (_m: string, cb: () => void) => cb(),
    surveyoptin: { render: (params: any) => void warm.rendered.push(params) },
  }
  lib7.renderCustomerReviewsOptIn({
    orderId: 'PB-300001-333',
    email: 'buyer3@example.com',
    deliveryCountry: 'PK',
    estimatedDeliveryDate: '2026-10-08',
  })
  check('warm gapi: direct render without new script', warm.rendered.length === 1 && warm.scripts.length === 0)

  console.log(failures === 0 ? '\nALL CHECKS PASS' : `\n${failures} CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err)
  process.exit(1)
})
