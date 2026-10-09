export type LiveConnection<T> = {
  available: boolean
  reason?: string
  data?: T
}

export type LiveBreakdown = { label: string; value: number }

export interface LiveAnalytics {
  propertyId: string
  currency: string | null
  timezone: string | null
  activeUsers: number
  sessions: number
  pageViews: number
  engagementRate: number
  purchases: number
  purchaseRevenue: number
  totalRevenue: number
  series: { date: string; views: number; sessions: number; revenue: number }[]
  sources: LiveBreakdown[]
  countries: LiveBreakdown[]
  devices: LiveBreakdown[]
  pages: LiveBreakdown[]
  events: LiveBreakdown[]
}

export interface LiveCommerce {
  orderCount: number
  paidRevenueByCurrency: { currency: string; amount: number }[]
  recentOrders: { id: string; status: string; total: number; currency: string; createdAt: string }[]
}

export interface PlaybeatLiveSnapshot {
  site: 'playbeat.live'
  days: number
  syncedAt: string
  config: { propertyId: string; canConfigure: boolean; credentialsConfigured: boolean }
  catalog: LiveConnection<{ channelCount: number; groups: LiveBreakdown[]; latencyMs: number }>
  analytics: LiveConnection<LiveAnalytics>
  commerce: LiveConnection<LiveCommerce>
}
