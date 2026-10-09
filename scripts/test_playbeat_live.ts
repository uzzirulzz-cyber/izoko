import assert from 'node:assert/strict'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { liveDays, livePropertyId, liveReportRequests, liveAnalytics, liveCatalog, liveCommerce, liveCommerceUrl, parseLiveCommerce, loadLiveProperty, saveLiveProperty } from '../api/_lib/playbeatLive.js'

const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const noFetch = (async () => { throw new Error('Unexpected network request') }) as typeof fetch
const keys = ['PLAYBEAT_LIVE_GA4_PROPERTY_ID', 'PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_EMAIL', 'PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'PLAYBEAT_LIVE_COMMERCE_ENDPOINT', 'PLAYBEAT_LIVE_REPORT_TOKEN']
for (const key of keys) delete process.env[key]

test('report ranges and property selection reject ambiguous inputs', () => {
  assert.equal(liveDays(null), 7)
  assert.equal(liveDays('1'), 1)
  for (const value of ['0', '-1', 'Infinity', '3', '7.5', '30x']) assert.throws(() => liveDays(value))
  assert.equal(livePropertyId('123456789'), '123456789')
  assert.equal(livePropertyId(''), '')
  for (const value of ['G-1234', 'https://playbeat.live', 123, null]) assert.throws(() => livePropertyId(value))
  for (const report of liveReportRequests(1)) {
    assert.deepEqual(report.dateRanges, [{ startDate: '0daysAgo', endDate: 'today' }])
    assert.deepEqual(report.dimensionFilter.filter.inListFilter.values, ['playbeat.live', 'www.playbeat.live'])
    assert.equal(report.dimensionFilter.filter.fieldName, 'hostName')
  }
})

test('a saved property overrides environment, and empty selection disconnects', async () => {
  process.env.PLAYBEAT_LIVE_GA4_PROPERTY_ID = '42'
  assert.equal(await loadLiveProperty(null), '42')
  const db: any = { collection: () => ({ findOne: async () => ({ ga4PropertyId: '' }) }) }
  assert.equal(await loadLiveProperty(db), '')
  let stored: any
  const saveDb: any = { collection: () => ({ updateOne: async (...args: any[]) => { stored = args } }) }
  await saveLiveProperty(saveDb, '7', 'test-admin')
  assert.equal(stored[1].$set.ga4PropertyId, '7')
  assert.equal(stored[1].$set.site, 'playbeat.live')
  await assert.rejects(() => saveLiveProperty(saveDb, 'G-INVALID', 'test-admin'))
  delete process.env.PLAYBEAT_LIVE_GA4_PROPERTY_ID
})

test('missing sources stay unavailable rather than reporting zero traffic or revenue', async () => {
  const analytics = await liveAnalytics('', 7, noFetch)
  const noCredentials = await liveAnalytics('123', 7, noFetch)
  const commerce = await liveCommerce(7, noFetch)
  for (const source of [analytics, noCredentials, commerce]) {
    assert.equal(source.available, false)
    assert.equal(source.data, undefined)
    assert.ok(source.reason)
  }
})

test('catalogue reporting exposes counts, never provider URLs or credentials', async () => {
  const fetcher = (async (url: any, init: any) => {
    assert.equal(url, 'https://playbeat.live/broadcast-player/api/channels')
    assert.equal(init.redirect, 'error')
    assert.ok(init.signal)
    return json({ channels: [{ name: 'one', group: 'News', url: 'secret-stream' }, { group: 'Sports' }, { group: 'News' }] })
  }) as typeof fetch
  const result = await liveCatalog(fetcher)
  assert.equal(result.available, true)
  assert.equal(result.data?.channelCount, 3)
  assert.deepEqual(result.data?.groups, [{ label: 'News', value: 2 }, { label: 'Sports', value: 1 }])
  assert.ok(!JSON.stringify(result).includes('secret-stream'))
  for (const result of [await liveCatalog(async () => json({ channels: null })), await liveCatalog(async () => json({}, 503))]) {
    assert.equal(result.available, false)
    assert.equal(result.data, undefined)
  }
})

test('GA4 uses read-only scope, both hostname filters, two valid batches and property currency', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  process.env.PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.invalid'
  process.env.PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  let batches = 0
  const fetcher = (async (url: any, init: any) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      const assertion = (init.body as URLSearchParams).get('assertion')!
      const claims = JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString())
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/analytics.readonly')
      return json({ access_token: 'test-token' })
    }
    assert.equal(url, 'https://analyticsdata.googleapis.com/v1beta/properties/123:batchRunReports')
    assert.equal(init.headers.Authorization, 'Bearer test-token')
    const { requests } = JSON.parse(init.body)
    assert.ok(requests.length > 0 && requests.length <= 5)
    batches++
    return json({ reports: requests.map((request: any) => {
      assert.deepEqual(request.dimensionFilter.filter.inListFilter.values, ['playbeat.live', 'www.playbeat.live'])
      const names = request.metrics.map((metric: any) => metric.name)
      const values: Record<string, string> = { activeUsers: '12', sessions: '18', screenPageViews: '25', engagementRate: '0.5', ecommercePurchases: '2', purchaseRevenue: '100', totalRevenue: '110', eventCount: '33' }
      return {
        metricHeaders: request.metrics,
        metadata: { currencyCode: 'USD', timeZone: 'Asia/Karachi' },
        rows: [{ dimensionValues: request.dimensions.map((dimension: any) => ({ value: dimension.name === 'date' ? '20261009' : 'example' })), metricValues: names.map((name: string) => ({ value: values[name] })) }],
      }
    }) })
  }) as typeof fetch
  try {
    const result = await liveAnalytics('123', 7, fetcher)
    assert.equal(result.available, true)
    assert.equal(batches, 2)
    assert.equal(result.data?.currency, 'USD')
    assert.equal(result.data?.activeUsers, 12)
    assert.equal(result.data?.totalRevenue, 110)
    assert.equal(result.data?.sources[0].value, 18)
    assert.equal(result.data?.series[0].date, '20261009')
    assert.ok(!JSON.stringify(result).includes('test-token'))
    const failure = await liveAnalytics('123', 7, async () => json({ error: 'secret-account-detail' }, 403))
    assert.equal(failure.available, false)
    assert.ok(!JSON.stringify(failure).includes('secret-account-detail'))
    const incomplete = await liveAnalytics('123', 7, async (url: any) => json(url.includes('oauth2') ? { access_token: 'test-token' } : { reports: [] }))
    assert.equal(incomplete.available, false)
    assert.equal(incomplete.data, undefined)
    const missingMetrics = await liveAnalytics('123', 7, async (url: any, init: any) => json(url.includes('oauth2') ? { access_token: 'test-token' } : { reports: JSON.parse(init.body).requests.map((request: any) => ({ metricHeaders: request.metrics, rows: [{ metricValues: [] }] })) }))
    assert.equal(missingMetrics.available, false)
    const empty = await liveAnalytics('123', 7, async (url: any, init: any) => json(url.includes('oauth2') ? { access_token: 'test-token' } : { reports: JSON.parse(init.body).requests.map((request: any) => ({ metricHeaders: request.metrics })) }))
    assert.equal(empty.available, true)
    assert.equal(empty.data?.activeUsers, 0)
    assert.deepEqual(empty.data?.sources, [])
  } finally {
    delete process.env.PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_EMAIL
    delete process.env.PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  }
})

test('commerce refuses other sites, credentials, insecure origins and mixed periods', async () => {
  for (const endpoint of ['http://playbeat.live/report', 'https://evil.invalid/report', 'https://127.0.0.1/report', 'https://playbeat.live.evil.invalid/report', 'https://user:password@playbeat.live/report', 'https://playbeat.live:444/report', 'https://playbeat.live/report#fragment']) assert.throws(() => liveCommerceUrl(endpoint, 7))
  assert.equal(liveCommerceUrl('https://playbeat.live/report?days=30', 7), 'https://playbeat.live/report?days=7')
  const report = { schemaVersion: 1, site: 'playbeat.live', days: 7, orderCount: 2, paidRevenueByCurrency: [{ currency: 'USD', amount: 10 }, { currency: 'PKR', amount: 1200 }], recentOrders: [{ id: 'example', status: 'paid', total: 10, currency: 'USD', createdAt: '2026-10-09T08:00:00Z', email: 'private@example.invalid' }] }
  const parsed = parseLiveCommerce(report, 7)
  assert.equal(parsed.paidRevenueByCurrency.length, 2)
  assert.ok(!JSON.stringify(parsed).includes('private@example.invalid'))
  assert.throws(() => parseLiveCommerce({ ...report, site: 'playbeat.digital' }, 7))
  assert.throws(() => parseLiveCommerce({ ...report, days: 30 }, 7))
  assert.throws(() => parseLiveCommerce({ ...report, paidRevenueByCurrency: [{ currency: 'USD', amount: 'invalid' }] }, 7))
  process.env.PLAYBEAT_LIVE_COMMERCE_ENDPOINT = 'https://playbeat.live/report'
  process.env.PLAYBEAT_LIVE_REPORT_TOKEN = 'test-report-token'
  try {
    const result = await liveCommerce(7, (async (url: any, init: any) => {
      assert.equal(url, 'https://playbeat.live/report?days=7')
      assert.equal(init.redirect, 'error')
      assert.equal(init.headers.Authorization, 'Bearer test-report-token')
      return json(report)
    }) as typeof fetch)
    assert.equal(result.available, true)
    assert.equal(result.data?.orderCount, 2)
    assert.equal((await liveCommerce(7, async () => json({}, 503))).available, false)
  } finally { delete process.env.PLAYBEAT_LIVE_COMMERCE_ENDPOINT; delete process.env.PLAYBEAT_LIVE_REPORT_TOKEN }
})

test('admin route enforces authentication, IT scope, analytics and super-admin configuration', async () => {
  // Generate isolated credentials; never use or contact production authentication.
  const secret = randomBytes(32).toString('hex')
  process.env.SESSION_SECRET = secret
  process.env.MONGODB_URI = ''
  const { default: handler } = await import('../api/admin/index.js')
  const call = async (role?: string, authority?: string, permissions?: string[], method = 'GET', path = '/api/admin/playbeat-live?days=7', body?: any) => {
    const token = role ? jwt.sign({ role, authority, permissions, email: 'test@example.invalid' }, secret) : ''
    const result: any = { code: 200, headers: {} }
    const response: any = { status: (code: number) => { result.code = code; return response }, json: (value: any) => { result.body = value; return response }, setHeader: (key: string, value: string) => { result.headers[key] = value } }
    await handler({ method, url: path, body, headers: token ? { authorization: `Bearer ${token}` } : {} } as any, response)
    return result
  }
  assert.equal((await call()).code, 401)
  assert.equal((await call('user')).code, 401)
  assert.equal((await call('staff', 'it', ['analytics'])).code, 403)
  assert.equal((await call('staff', 'manager', ['orders'])).code, 403)
  assert.equal((await call('staff', 'finance', ['analytics'], 'PUT', '/api/admin/playbeat-live/config', { propertyId: '123' })).code, 403)
  assert.equal((await call('admin', undefined, undefined, 'PUT', '/api/admin/playbeat-live/config', { propertyId: 'G-INVALID' })).code, 400)
  assert.equal((await call('admin', undefined, undefined, 'GET', '/api/admin/playbeat-live?days=-1')).code, 400)
  assert.equal((await call('admin', undefined, undefined, 'POST')).code, 405)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => json({ channels: [{ group: 'News', url: 'secret-stream' }] })
  try {
    const success = await call('admin')
    assert.equal(success.code, 200)
    assert.equal(success.headers['Cache-Control'], 'private, no-store')
    assert.equal(success.body.site, 'playbeat.live')
    assert.equal(success.body.catalog.data.channelCount, 1)
    assert.equal(success.body.config.canConfigure, true)
    assert.equal(success.body.analytics.available, false)
    const restricted = await call('staff', 'finance', ['analytics'])
    assert.equal(restricted.code, 200)
    assert.equal(restricted.body.config.canConfigure, false)
    assert.equal(restricted.body.commerce.available, false)
    assert.match(restricted.body.commerce.reason, /permission/)
  } finally { globalThis.fetch = originalFetch }
})
