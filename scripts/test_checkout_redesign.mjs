// E2E verification for the cart + checkout redesign backend (local shim).
// Exercises the REAL api/ handlers: methods catalog, server-side coupons,
// server-authoritative totals, idempotency, stock guard, Rapid fail-closed.
import crypto from 'crypto'

const BASE = process.env.TEST_BASE || 'http://localhost:8787'
const EMAIL = `checkout-redesign-${crypto.randomBytes(3).toString('hex')}@playbeat.digital`
const PASSWORD = 'Pb!Test' + crypto.randomBytes(4).toString('hex')

let passed = 0
let failed = 0
function ok(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    console.log(`  FAIL  ${name} ${extra}`)
  }
}

async function jreq(path, opts = {}, token) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}

// ---------------------------------------------------------------- methods
console.log('\n== 1. Payment methods catalog (backend-driven UI) ==')
{
  const { status, data } = await jreq('/api/payments/methods')
  ok('GET /api/payments/methods 200', status === 200 && data?.success)
  const ids = (data?.methods || []).map((m) => m.id)
  ok(
    'all 6 methods present',
    ['rapid', 'card', 'jazzcash', 'easypaisa', 'crypto', 'bank'].every((i) => ids.includes(i)),
    JSON.stringify(ids)
  )
  const rapid = data.methods.find((m) => m.id === 'rapid')
  ok('rapid available (test key set)', rapid?.available === true)
  ok('rapid recommended', rapid?.recommended === true)
  ok(
    'rapid brands include visa/mastercard/raast/jazzcash/easypaisa',
    ['visa', 'mastercard', 'raast', 'jazzcash', 'easypaisa'].every((b) => rapid.brands.includes(b))
  )
  const card = data.methods.find((m) => m.id === 'card')
  ok('card brands include amex', card?.brands?.includes('amex'))
}

// ---------------------------------------------------------------- auth
console.log('\n== 2. Auth (signup + login) ==')
let token = ''
{
  const reg = await jreq('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Checkout Redesign Test', email: EMAIL, password: PASSWORD }),
  })
  ok('register 201', reg.status === 201 || reg.status === 200, `got ${reg.status} ${JSON.stringify(reg.data).slice(0, 120)}`)
  token = reg.data?.token || ''
  if (!token) {
    const login = await jreq('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    })
    token = login.data?.token || ''
  }
  ok('token obtained', !!token)
  const bad = await jreq('/api/payments/coupon', {
    method: 'POST',
    body: JSON.stringify({ code: 'PLAYBEAT10', subtotal: 1000 }),
  })
  ok('coupon without auth → 401', bad.status === 401, `got ${bad.status}`)
}

// ---------------------------------------------------------------- coupon
console.log('\n== 3. Server-side coupon validation ==')
{
  const good = await jreq(
    '/api/payments/coupon',
    { method: 'POST', body: JSON.stringify({ code: 'playbeat10', subtotal: 52510 }) },
    token
  )
  ok('PLAYBEAT10 (case-insensitive) 200', good.status === 200 && good.data?.success)
  ok('10% discount computed server-side', good.data?.coupon?.discount === 5251, `got ${good.data?.coupon?.discount}`)
  ok('coupon type percent', good.data?.coupon?.type === 'percent')

  const bad = await jreq(
    '/api/payments/coupon',
    { method: 'POST', body: JSON.stringify({ code: 'NOPE123', subtotal: 52510 }) },
    token
  )
  ok('invalid coupon rejected', bad.status === 400 && !bad.data?.success)

  const empty = await jreq(
    '/api/payments/coupon',
    { method: 'POST', body: JSON.stringify({ code: 'PLAYBEAT10', subtotal: 0 }) },
    token
  )
  ok('empty cart subtotal rejected', empty.status === 400)

  const cinemaLow = await jreq(
    '/api/payments/coupon',
    { method: 'POST', body: JSON.stringify({ code: 'CINEMA2026', subtotal: 1000 }) },
    token
  )
  ok('CINEMA2026 min-spend enforced', cinemaLow.status === 400, `got ${cinemaLow.status}`)
  const cinemaOk = await jreq(
    '/api/payments/coupon',
    { method: 'POST', body: JSON.stringify({ code: 'CINEMA2026', subtotal: 20000 }) },
    token
  )
  ok('CINEMA2026 valid above min-spend (15%)', cinemaOk.status === 200 && cinemaOk.data?.coupon?.discount === 3000)
}

// ---------------------------------------------------------------- order + coupon discount
console.log('\n== 4. Order creation — server-authoritative pricing + coupon ==')
let product = null
let orderIdempotent = ''
{
  const pres = await fetch(`${BASE}/api/products`).catch(() => null)
  const pdata = pres ? await pres.json().catch(() => null) : null
  const list = pdata?.products || pdata?.data || (Array.isArray(pdata) ? pdata : [])
  product = list.find((p) => typeof p.price === 'number' && p.price > 0)
  ok('catalog product available for order test', !!product, JSON.stringify(pdata).slice(0, 150))
}

if (product) {
  const qty = 2
  const clientLieTotal = 1 // browser lies about total — must be ignored
  const expectedSubtotal = product.price * qty
  const expectedTotal = Math.round(expectedSubtotal * 0.9) // PLAYBEAT10

  const mkBody = (clientRequestId) => ({
    items: [
      {
        product: { id: product.id, _id: product._id, sku: product.sku, name: product.name, price: product.price, digital: true },
        quantity: qty,
        unitPrice: product.price,
      },
    ],
    customerName: 'Checkout Test',
    customerEmail: EMAIL,
    totalAmount: clientLieTotal,
    currency: 'PKR',
    paymentMethod: 'JazzCash',
    couponCode: 'PLAYBEAT10',
    clientRequestId,
  })

  const idem = `test-${crypto.randomBytes(6).toString('hex')}`
  const o1 = await jreq('/api/orders', { method: 'POST', body: JSON.stringify(mkBody(idem)) }, token)
  ok('order created (direct method, keys released)', o1.status === 201 && o1.data?.success, JSON.stringify(o1.data).slice(0, 200))
  ok('client total IGNORED (server recomputed subtotal)', o1.data?.order?.subtotalAmount === expectedSubtotal, `got ${o1.data?.order?.subtotalAmount}, want ${expectedSubtotal}`)
  ok('coupon discount applied server-side', o1.data?.order?.discountAmount === Math.round(expectedSubtotal * 0.1), `got ${o1.data?.order?.discountAmount}`)
  ok('final total = subtotal - discount', o1.data?.order?.totalAmount === expectedTotal, `got ${o1.data?.order?.totalAmount}, want ${expectedTotal}`)
  ok('coupon recorded on order', o1.data?.order?.coupon?.code === 'PLAYBEAT10')
  const keys = (o1.data?.order?.items || []).flatMap((i) => i.licenseKeys || [])
  ok('license keys released for direct order', keys.length === qty)
  orderIdempotent = o1.data?.order?.orderNumber || ''

  const o2 = await jreq('/api/orders', { method: 'POST', body: JSON.stringify(mkBody(idem)) }, token)
  ok('duplicate submit idempotent (same order)', o2.data?.order?.orderNumber === orderIdempotent && o2.data?.duplicate === true, `got ${o2.data?.order?.orderNumber} vs ${orderIdempotent}`)

  // no coupon → full price
  const bodyNoCoupon = mkBody(`test-${crypto.randomBytes(6).toString('hex')}`)
  delete bodyNoCoupon.couponCode
  bodyNoCoupon.paymentMethod = 'Easypaisa'
  const o3 = await jreq('/api/orders', { method: 'POST', body: JSON.stringify(bodyNoCoupon) }, token)
  ok('no-coupon order full price', o3.data?.order?.totalAmount === expectedSubtotal, `got ${o3.data?.order?.totalAmount}`)

  // stock guard: absurd quantity on a DB-tracked product
  const bodyStock = mkBody(`test-${crypto.randomBytes(6).toString('hex')}`)
  bodyStock.items[0].quantity = 1000000
  const o4 = await jreq('/api/orders', { method: 'POST', body: JSON.stringify(bodyStock) }, token)
  ok('stock guard rejects absurd qty (409)', o4.status === 409, `got ${o4.status} ${JSON.stringify(o4.data).slice(0, 120)}`)

  // Rapid order → pending + fail-closed create with dummy key
  const bodyRapid = mkBody(`test-${crypto.randomBytes(6).toString('hex')}`)
  bodyRapid.paymentMethod = 'rapid'
  const o5 = await jreq('/api/orders', { method: 'POST', body: JSON.stringify(bodyRapid) }, token)
  ok('rapid order created PENDING', o5.status === 201 && o5.data?.order?.paymentStatus === 'pending')
  ok('rapid pending order hides keys', !JSON.stringify(o5.data?.order).includes('licenseKeys') || !(o5.data?.order?.items || []).some((i) => (i.licenseKeys || []).length))
  const rc = await jreq(
    '/api/payments/rapid/create',
    { method: 'POST', body: JSON.stringify({ orderNumber: o5.data?.order?.orderNumber }) },
    token
  )
  ok('rapid/create fail-closed with dummy key (502)', rc.status === 502, `got ${rc.status}`)
}

// unauth order
{
  const un = await jreq('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ items: [{ product: { id: 'x' }, quantity: 1 }] }),
  })
  ok('unauthenticated order → 401', un.status === 401, `got ${un.status}`)
}

console.log(`\n========================================`)
console.log(`RESULT: ${passed} PASS / ${failed} FAIL`)
console.log(`========================================`)
process.exit(failed ? 1 : 0)
