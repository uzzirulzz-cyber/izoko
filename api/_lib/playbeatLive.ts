// PlayBeat.live reporting stays server-side and separate from PlayBeat Digital.
import crypto from 'node:crypto'
import type { Db } from 'mongodb'
import type { LiveAnalytics, LiveCommerce, LiveConnection, PlaybeatLiveSnapshot } from '../../src/types/playbeatLive.js'

const SITE = 'playbeat.live' as const
const CONFIG_ID = 'playbeat-live'
const READ_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const TIMEOUT_MS = 12000
type Fetcher = typeof fetch

export function liveDays(value: string | null): number {
  const days = Number(value || 7)
  if (!Number.isInteger(days) || ![1, 7, 14, 30, 90].includes(days)) {
    throw new Error('Choose 1, 7, 14, 30 or 90 days.')
  }
  return days
}

export function livePropertyId(value: unknown): string {
  if (typeof value !== 'string' || (value !== '' && !/^\d{1,20}$/.test(value))) {
    throw new Error('Use the numeric GA4 property ID, not a G- measurement ID.')
  }
  return value
}

export async function loadLiveProperty(db: Db | null): Promise<string> {
  const stored = db ? await db.collection('site_integrations').findOne({ _id: CONFIG_ID as any }) : null
  return livePropertyId(stored?.ga4PropertyId ?? process.env.PLAYBEAT_LIVE_GA4_PROPERTY_ID ?? '')
}

export async function saveLiveProperty(db: Db, propertyId: string, actor: string): Promise<void> {
  await db.collection('site_integrations').updateOne(
    { _id: CONFIG_ID as any },
    { $set: { ga4PropertyId: livePropertyId(propertyId), site: SITE, updatedAt: new Date(), updatedBy: actor } },
    { upsert: true },
  )
  snapshotCache.clear()
}

export function liveCredentials() {
  return {
    email: process.env.PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    key: (process.env.PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }
}

async function fetchJson(url: string, init: RequestInit, fetcher: Fetcher): Promise<any> {
  const response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function accessToken(fetcher: Fetcher): Promise<string> {
  const { email, key } = liveCredentials()
  const now = Math.floor(Date.now() / 1000)
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: email, scope: READ_SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3300 })}`
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key).toString('base64url')
  const token = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  }, fetcher)
  if (typeof token?.access_token !== 'string' || !token.access_token) throw new Error('Invalid token response')
  return token.access_token
}

export function liveReportRequests(days: number) {
  const metrics = ['activeUsers', 'sessions', 'screenPageViews', 'engagementRate', 'ecommercePurchases', 'purchaseRevenue', 'totalRevenue']
  const report = (dimensions: string[], names: string[], limit = 20) => ({
    dateRanges: [{ startDate: `${days - 1}daysAgo`, endDate: 'today' }],
    dimensionFilter: { filter: { fieldName: 'hostName', inListFilter: { values: [SITE, `www.${SITE}`], caseSensitive: false } } },
    dimensions: dimensions.map(name => ({ name })), metrics: names.map(name => ({ name })),
    limit: String(limit),
    orderBys: dimensions[0] === 'date'
      ? [{ dimension: { dimensionName: 'date' } }]
      : [{ metric: { metricName: names[0] }, desc: true }],
  })
  return [
    report([], metrics, 1),
    report(['date'], ['screenPageViews', 'sessions', 'totalRevenue'], days),
    report(['sessionSourceMedium'], ['sessions']),
    report(['country'], ['activeUsers']),
    report(['deviceCategory'], ['activeUsers']),
    report(['pagePath'], ['screenPageViews']),
    report(['eventName'], ['eventCount']),
  ]
}

function number(value: unknown): number {
  const result = Number(value ?? 0)
  if (!Number.isFinite(result)) throw new Error('Invalid numeric report value')
  return result
}

export async function liveAnalytics(propertyId: string, days: number, fetcher: Fetcher = fetch): Promise<LiveConnection<LiveAnalytics>> {
  if (!propertyId) return { available: false, reason: 'Connect the PlayBeat.live GA4 property to see traffic, sources and recorded revenue.' }
  const credentials = liveCredentials()
  if (!credentials.email || !credentials.key) return { available: false, reason: 'GA4 property selected. A server-side Google reporting connection is still required.' }
  try {
    const token = await accessToken(fetcher)
    const requests = liveReportRequests(days)
    const batches = await Promise.all([requests.slice(0, 5), requests.slice(5)].map(async batch => {
      const result = await fetchJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: batch }),
      }, fetcher)
      if (!Array.isArray(result?.reports) || result.reports.length !== batch.length) throw new Error('Incomplete report')
      for (let i = 0; i < result.reports.length; i++) {
        const report = result.reports[i]
        if (report?.metricHeaders?.length !== batch[i].metrics.length || report.metricHeaders.some((header: any, index: number) => header.name !== batch[i].metrics[index].name) || (report.rows !== undefined && !Array.isArray(report.rows))) throw new Error('Invalid report')
        for (const row of report.rows || []) {
          if (!Array.isArray(row.metricValues) || row.metricValues.length !== batch[i].metrics.length || (row.dimensionValues || []).length !== batch[i].dimensions.length) throw new Error('Incomplete report row')
          for (const metric of row.metricValues) {
            if (typeof metric?.value !== 'string' || metric.value === '' || !Number.isFinite(Number(metric.value))) throw new Error('Invalid report metric')
          }
        }
      }
      return result.reports
    }))
    const [overview, daily, sources, countries, devices, pages, events] = batches.flat()
    const values = overview.rows?.[0]?.metricValues || []
    const breakdown = (report: any) => (report.rows || []).map((row: any) => ({ label: String(row.dimensionValues?.[0]?.value || '(not set)').slice(0, 250), value: number(row.metricValues?.[0]?.value) }))
    return { available: true, data: {
      propertyId, currency: overview.metadata?.currencyCode || null, timezone: overview.metadata?.timeZone || null,
      activeUsers: number(values[0]?.value), sessions: number(values[1]?.value), pageViews: number(values[2]?.value),
      engagementRate: number(values[3]?.value), purchases: number(values[4]?.value), purchaseRevenue: number(values[5]?.value), totalRevenue: number(values[6]?.value),
      series: (daily.rows || []).map((row: any) => ({ date: String(row.dimensionValues?.[0]?.value || ''), views: number(row.metricValues?.[0]?.value), sessions: number(row.metricValues?.[1]?.value), revenue: number(row.metricValues?.[2]?.value) })),
      sources: breakdown(sources), countries: breakdown(countries), devices: breakdown(devices), pages: breakdown(pages), events: breakdown(events),
    } }
  } catch {
    // Never leak token responses, account keys, URLs or arbitrary upstream errors.
    return { available: false, reason: 'Google Analytics could not be read. Check property Viewer access, Data API enablement and server credentials, then retry.' }
  }
}

export async function liveCatalog(fetcher: Fetcher = fetch): Promise<PlaybeatLiveSnapshot['catalog']> {
  const start = Date.now()
  try {
    const result = await fetchJson(`https://${SITE}/broadcast-player/api/channels`, {}, fetcher)
    if (!Array.isArray(result?.channels) || result.channels.some((channel: any) => !channel || typeof channel !== 'object')) throw new Error('Invalid catalogue')
    const groups = new Map<string, number>()
    for (const channel of result.channels) {
      const group = String(channel.group || channel.groupTitle || 'Other').slice(0, 150)
      groups.set(group, (groups.get(group) || 0) + 1)
    }
    return { available: true, data: {
      channelCount: result.channels.length, latencyMs: Date.now() - start,
      groups: [...groups].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 12),
    } }
  } catch {
    return { available: false, reason: 'The PlayBeat.live channel catalogue could not be reached. Retry to check its current status.' }
  }
}

export function liveCommerceUrl(value: string, days: number): string {
  const url = new URL(value)
  // Credentials only go to the explicitly allowed PlayBeat.live HTTPS host.
  if (url.protocol !== 'https:' || ![SITE, `www.${SITE}`].includes(url.hostname) || url.port || url.username || url.password || url.hash) throw new Error('Invalid commerce endpoint')
  url.searchParams.set('days', String(days))
  return url.toString()
}

export function parseLiveCommerce(result: any, days: number): LiveCommerce {
  if (result?.schemaVersion !== 1 || result.site !== SITE || result.days !== days || !Number.isSafeInteger(result.orderCount) || result.orderCount < 0 || !Array.isArray(result.paidRevenueByCurrency) || !Array.isArray(result.recentOrders)) throw new Error('Invalid commerce report')
  const currency = (value: any) => {
    if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) throw new Error('Invalid currency')
    return value
  }
  const amount = (value: any) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('Invalid amount')
    return value
  }
  return {
    orderCount: result.orderCount,
    paidRevenueByCurrency: result.paidRevenueByCurrency.map((row: any) => ({ currency: currency(row.currency), amount: amount(row.amount) })),
    recentOrders: result.recentOrders.slice(0, 20).map((row: any) => {
      if (!row || typeof row.id !== 'string' || !row.id || typeof row.status !== 'string' || !row.status || typeof row.createdAt !== 'string' || !Number.isFinite(Date.parse(row.createdAt))) throw new Error('Invalid order')
      return { id: row.id.slice(0, 100), status: row.status.slice(0, 50), createdAt: row.createdAt, total: amount(row.total), currency: currency(row.currency) }
    }),
  }
}

export async function liveCommerce(days: number, fetcher: Fetcher = fetch): Promise<LiveConnection<LiveCommerce>> {
  const endpoint = process.env.PLAYBEAT_LIVE_COMMERCE_ENDPOINT || ''
  const token = process.env.PLAYBEAT_LIVE_REPORT_TOKEN || ''
  if (!endpoint || !token) return { available: false, reason: 'PlayBeat.live orders and paid revenue are not connected. Its free broadcasts do not create store orders.' }
  try {
    const result = await fetchJson(liveCommerceUrl(endpoint, days), { headers: { Authorization: `Bearer ${token}` } }, fetcher)
    return { available: true, data: parseLiveCommerce(result, days) }
  } catch {
    return { available: false, reason: 'The PlayBeat.live order service could not be read. Check the reporting connection and retry.' }
  }
}

const snapshotCache = new Map<string, { expiresAt: number; value: Promise<Omit<PlaybeatLiveSnapshot, 'config'>> }>()

export async function liveSnapshot(propertyId: string, days: number): Promise<Omit<PlaybeatLiveSnapshot, 'config'>> {
  const credentials = liveCredentials()
  // Credential/config changes cannot reuse data from a previous connection.
  const key = crypto.createHash('sha256').update(JSON.stringify([propertyId, days, credentials, process.env.PLAYBEAT_LIVE_COMMERCE_ENDPOINT, process.env.PLAYBEAT_LIVE_REPORT_TOKEN])).digest('hex')
  const cached = snapshotCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  for (const [id, item] of snapshotCache) if (item.expiresAt <= Date.now()) snapshotCache.delete(id)
  const value = Promise.all([liveCatalog(), liveAnalytics(propertyId, days), liveCommerce(days)]).then(([catalog, analytics, commerce]) => ({ site: SITE, days, syncedAt: new Date().toISOString(), catalog, analytics, commerce }))
  snapshotCache.set(key, { expiresAt: Date.now() + 60000, value })
  return value
}
