import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Globe,
  BarChart3,
  ShoppingBag,
  Package,
  Key,
  Repeat,
  Tag,
  Users,
  MessageSquare,
  Tv,
  Megaphone,
  Search,
  Store,
  Plus,
  Mail,
  Bell,
  ChevronDown,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Boxes,
  Users2,
  Calendar,
  Settings,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Flame,
  CheckCircle2,
  Clock,
  Activity,
  Send,
  Headphones,
  FileText,
  ShieldCheck,
  Zap,
  RefreshCw,
  Eye,
  Trash2,
  Edit,
  Download,
  Filter,
  X,
  ExternalLink,
  ChevronLeft,
  FileSpreadsheet,
  UploadCloud,
  Database,
} from 'lucide-react'
import { Product, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'
import { CsvImporterModal } from './CsvImporterModal'
import { CampaignsPanel } from './admin/CampaignsPanel'
import { SupportPanel } from './admin/SupportPanel'

interface AdminInsightsViewProps {
  products: Product[]
  selectedCurrency: CurrencyCode
  onBackToStorefront: () => void
  onQuickViewProduct: (product: Product) => void
  onUpdateProductStock?: (productId: string, newStock: number) => void
  onUpdateProductPrice?: (productId: string, newPrice: number) => void
  onImportProducts?: (
    newProducts: Product[],
    mode: 'merge' | 'replace',
    syncToMongo?: boolean
  ) => void
}

interface OrderItem {
  id: string
  customer: string
  initials: string
  avatarColor: string
  amount: number
  status: 'Completed' | 'Processing' | 'Pending'
  date: string
  time: string
  product: string
  paymentMethod: string
  keyDispatched?: string
}

const INITIAL_ORDERS: OrderItem[] = [
  {
    id: '#PB-00024',
    customer: 'John Doe',
    initials: 'J',
    avatarColor: 'from-blue-600 to-indigo-600',
    amount: 2499,
    status: 'Completed',
    date: '17 Aug',
    time: '10:45 AM',
    product: 'PlayStation Gift Card - $25 (USA)',
    paymentMethod: 'EasyPaisa',
    keyDispatched: 'PSN-US-8921-XKQ9-2026',
  },
  {
    id: '#PB-00023',
    customer: 'Sarah Smith',
    initials: 'S',
    avatarColor: 'from-emerald-600 to-teal-600',
    amount: 1499,
    status: 'Completed',
    date: '17 Aug',
    time: '09:15 AM',
    product: 'Windows 11 Pro Retail License',
    paymentMethod: 'JazzCash',
    keyDispatched: 'W11PRO-VK7JG-NPHTM-C97JM-9MPGT',
  },
  {
    id: '#PB-00022',
    customer: 'Mike Johnson',
    initials: 'M',
    avatarColor: 'from-amber-600 to-orange-600',
    amount: 1299,
    status: 'Completed',
    date: '16 Aug',
    time: '08:20 PM',
    product: 'ChatGPT Plus Monthly Subscription',
    paymentMethod: 'Visa / Card',
    keyDispatched: 'OPENAI-PLUS-9842-88XQ-2026',
  },
  {
    id: '#PB-00021',
    customer: 'Emma Wilson',
    initials: 'E',
    avatarColor: 'from-purple-600 to-pink-600',
    amount: 3200,
    status: 'Processing',
    date: '16 Aug',
    time: '04:10 PM',
    product: 'Magcubic HY320 4K Smart Cinema Projector',
    paymentMethod: 'Bank Transfer / Raast',
  },
  {
    id: '#PB-00020',
    customer: 'David Brown',
    initials: 'D',
    avatarColor: 'from-cyan-600 to-blue-600',
    amount: 899,
    status: 'Completed',
    date: '15 Aug',
    time: '02:30 PM',
    product: 'Netflix Premium 1 Month VIP',
    paymentMethod: 'EasyPaisa',
    keyDispatched: 'NF-PREM-4K-9901-PRO',
  },
]

export const AdminInsightsView: React.FC<AdminInsightsViewProps> = ({
  products,
  selectedCurrency,
  onBackToStorefront,
  onQuickViewProduct,
  onUpdateProductStock,
  onUpdateProductPrice,
  onImportProducts,
}) => {
  // Inject noindex meta — admin must never be indexed by search engines
  React.useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow, noarchive'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  // Navigation & Sub-views
  const [activeNav, setActiveNav] = useState<string>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [timeFilter, setTimeFilter] = useState<'Today' | 'This Week' | 'This Month'>('This Week')
  const [chartMetric, setChartMetric] = useState<'Revenue' | 'Orders' | 'Customers'>('Revenue')
  const [chartRange, setChartRange] = useState<'Last 14 Days' | 'Last 30 Days' | 'This Month'>('Last 14 Days')

  // Data states
  const [orders, setOrders] = useState<OrderItem[]>(INITIAL_ORDERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  // Modals & Drawers
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showCsvImporterModal, setShowCsvImporterModal] = useState(false)
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showLicenseKeyModal, setShowLicenseKeyModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // License Generator State
  const [keyTargetProduct, setKeyTargetProduct] = useState(products[0]?.name || '')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  // Stock editor
  const [editingStockId, setEditingStockId] = useState<string | null>(null)
  const [tempStockValue, setTempStockValue] = useState<number>(0)

  // ============================================
  // LIVE DATA: users, staff, admin stats (fetched from /api/admin/* on demand)
  // ============================================
  const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminStaff, setAdminStaff] = useState<any[]>([])
  const [adminStats, setAdminStats] = useState<any>(null)
  const [adminOrders, setAdminOrders] = useState<any[]>([])
  const [adminTopProducts, setAdminTopProducts] = useState<any[]>([])
  const [adminRevenueChart, setAdminRevenueChart] = useState<any>(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [topProductsLoading, setTopProductsLoading] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)
  const [promoteModalUser, setPromoteModalUser] = useState<any | null>(null)
  const [promoteStaffId, setPromoteStaffId] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

  const fetchAdminUsers = async () => {
    setUsersLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminUsers(data.users || [])
    } catch (e) {
      // silent fail — UI will show empty state
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchAdminStaff = async () => {
    setStaffLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/staff`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminStaff(data.staff || [])
    } catch (e) {
      // silent
    } finally {
      setStaffLoading(false)
    }
  }

  const fetchAdminStats = async () => {
    setStatsLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminStats(data.stats)
    } catch (e) {
      // silent
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchAdminOrders = async () => {
    setOrdersLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/orders?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminOrders(data.orders || [])
    } catch (e) {
      // silent
    } finally {
      setOrdersLoading(false)
    }
  }

  const fetchAdminTopProducts = async () => {
    setTopProductsLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/top-products`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminTopProducts(data.topProducts || [])
    } catch (e) {
      // silent
    } finally {
      setTopProductsLoading(false)
    }
  }

  const fetchAdminRevenueChart = async () => {
    setChartLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/revenue-chart?days=14`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminRevenueChart(data.chart)
    } catch (e) {
      // silent
    } finally {
      setChartLoading(false)
    }
  }

  const refreshAllAdminData = async () => {
    triggerToast('Refreshing all dashboard data from MongoDB…')
    await Promise.all([
      fetchAdminStats(),
      fetchAdminOrders(),
      fetchAdminTopProducts(),
      fetchAdminRevenueChart(),
      fetchAdminUsers(),
      fetchAdminStaff(),
    ])
    triggerToast('Dashboard data refreshed successfully')
  }

  const handleResetAdminPanel = async () => {
    // Clear all local dashboard state and force a fresh reload
    setAdminStats(null)
    setAdminOrders([])
    setAdminTopProducts([])
    setAdminRevenueChart(null)
    setAdminUsers([])
    setAdminStaff([])
    setActiveNav('dashboard')
    setShowResetConfirm(false)
    triggerToast('Admin panel reset. Reloading fresh data…')
    // Re-fetch everything
    setTimeout(() => {
      refreshAllAdminData()
    }, 100)
  }

  const handlePromoteStaff = async () => {
    if (!promoteModalUser || !promoteStaffId.trim()) return
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/staff/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ userId: promoteModalUser.id, staffId: promoteStaffId.trim() }),
      })
      const data = await res.json()
      if (data?.success) {
        triggerToast(`User promoted to staff with Staff ID ${promoteStaffId.trim()}`)
        setPromoteModalUser(null)
        setPromoteStaffId('')
        fetchAdminUsers()
        fetchAdminStaff()
      } else {
        triggerToast(data?.error || 'Failed to promote user')
      }
    } catch (e: any) {
      triggerToast(e.message || 'Network error')
    }
  }

  const handleDemoteStaff = async (userId: string) => {
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/staff/demote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (data?.success) {
        triggerToast('Staff privileges revoked. User reverted to normal account.')
        fetchAdminUsers()
        fetchAdminStaff()
      } else {
        triggerToast(data?.error || 'Failed to demote staff')
      }
    } catch (e: any) {
      triggerToast(e.message || 'Network error')
    }
  }

  // Lazy-load data when relevant panel is activated
  useEffect(() => {
    if (activeNav === 'customers') {
      fetchAdminUsers()
      fetchAdminStaff()
    } else if (activeNav === 'analytics') {
      if (!adminStats) fetchAdminStats()
    } else if (activeNav === 'dashboard') {
      // Dashboard needs all data: stats, orders, top products, chart
      if (!adminStats) fetchAdminStats()
      if (adminOrders.length === 0) fetchAdminOrders()
      if (adminTopProducts.length === 0) fetchAdminTopProducts()
      if (!adminRevenueChart) fetchAdminRevenueChart()
    }
  }, [activeNav])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleGenerateKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
    const randomHex2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const randomHex3 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const prefix = keyTargetProduct.includes('PlayStation')
      ? 'PSN-US'
      : keyTargetProduct.includes('Windows')
      ? 'WIN11-PRO'
      : keyTargetProduct.includes('ChatGPT')
      ? 'PB-GPT4O'
      : keyTargetProduct.includes('Steam')
      ? 'STEAM-KEY'
      : 'PLAYBEAT'

    const key = `${prefix}-${randomHex}-${randomHex2}-${randomHex3}`
    setGeneratedKey(key)
    triggerToast('Generated & injected new cryptographic license into live vault!')
  }

  const handleSaveStock = (productId: string) => {
    if (onUpdateProductStock) {
      onUpdateProductStock(productId, tempStockValue)
    }
    setEditingStockId(null)
    triggerToast('Product inventory level successfully updated')
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCat =
      selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-[#07090E] text-zinc-100 font-sans flex flex-col antialiased selection:bg-amber-500 selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/95 border border-amber-500/40 text-amber-300 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono">{toastMessage}</span>
        </div>
      )}

      {/* Main Container with Sidebar + Content */}
      <div className="flex flex-1 min-h-screen overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR (Pixel-Perfect PlayBeat Admin) */}
        {/* ========================================================================= */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } bg-[#0A0D14] border-r border-white/5 flex flex-col justify-between shrink-0 transition-all duration-300 select-none z-30`}
        >
          <div className="p-4 space-y-6">
            {/* Top Brand Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img
                  src="/playbeat-logo.png"
                  alt="PlayBeat"
                  className="h-8 w-auto object-contain shrink-0"
                  onError={(e) => {
                    // Fallback to stylized SVG icon if image fails
                    const target = e.currentTarget
                    target.style.display = 'none'
                  }}
                />
                {!sidebarCollapsed && (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-base tracking-tight text-white">
                        play<span className="text-amber-400">beat</span>
                      </span>
                    </div>
                    <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase">
                      Digital Pvt Ltd
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                <ChevronLeft
                  className={`w-4 h-4 transition-transform duration-300 ${
                    sidebarCollapsed ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Nav Categories & Items */}
            <div className="space-y-5 text-xs font-sans">
              {/* MAIN SECTION */}
              <div>
                {!sidebarCollapsed && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 mb-1.5 font-semibold">
                    Main
                  </div>
                )}
                <button
                  onClick={() => setActiveNav('dashboard')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition font-medium ${
                    activeNav === 'dashboard'
                      ? 'bg-amber-400 text-black font-semibold shadow-lg shadow-amber-400/20'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4" />
                    {!sidebarCollapsed && <span>Dashboard</span>}
                  </div>
                  {!sidebarCollapsed && activeNav === 'dashboard' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                  )}
                </button>
              </div>

              {/* WEBSITE & ANALYTICS */}
              <div>
                {!sidebarCollapsed && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 mb-1.5 font-semibold">
                    Website & Analytics
                  </div>
                )}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveNav('cms')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition ${
                      activeNav === 'cms' ? 'text-white bg-white/10' : ''
                    }`}
                  >
                    <Globe className="w-4 h-4 text-cyan-400" />
                    {!sidebarCollapsed && <span>Website Builder CMS</span>}
                  </button>

                  <button
                    onClick={() => setActiveNav('analytics')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition ${
                      activeNav === 'analytics' ? 'text-white bg-white/10' : ''
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    {!sidebarCollapsed && <span>Analytics & Traffic</span>}
                  </button>
                </div>
              </div>

              {/* COMMERCE & INVENTORY */}
              <div>
                {!sidebarCollapsed && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 mb-1.5 font-semibold">
                    Commerce & Inventory
                  </div>
                )}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveNav('orders')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
                      activeNav === 'orders'
                        ? 'text-amber-400 bg-amber-400/10'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4" />
                      {!sidebarCollapsed && <span>Orders & Fulfillment</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold">
                        {orders.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveNav('products')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
                      activeNav === 'products'
                        ? 'text-amber-400 bg-amber-400/10'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4" />
                      {!sidebarCollapsed && <span>Catalog Products</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 font-mono text-[10px]">
                        {products.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setShowCsvImporterModal(true)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-400 hover:text-amber-300 hover:bg-amber-400/10 transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                      {!sidebarCollapsed && <span>CSV Importer & Sync</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-[9px] font-bold">
                        Import
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveNav('vault')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition ${
                      activeNav === 'vault' ? 'text-amber-400 bg-amber-400/10' : ''
                    }`}
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    {!sidebarCollapsed && <span>Digital License Vault</span>}
                  </button>

                  <button
                    onClick={() => setActiveNav('subscriptions')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition ${
                      activeNav === 'subscriptions' ? 'text-white bg-white/10' : ''
                    }`}
                  >
                    <Repeat className="w-4 h-4 text-purple-400" />
                    {!sidebarCollapsed && <span>Subscriptions</span>}
                  </button>

                  <button
                    onClick={() => setActiveNav('coupons')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition ${
                      activeNav === 'coupons' ? 'text-white bg-white/10' : ''
                    }`}
                  >
                    <Tag className="w-4 h-4 text-rose-400" />
                    {!sidebarCollapsed && <span>Discounts & Coupons</span>}
                  </button>
                </div>
              </div>

              {/* CUSTOMERS & SUPPORT */}
              <div>
                {!sidebarCollapsed && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 mb-1.5 font-semibold">
                    Customers & Support
                  </div>
                )}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveNav('customers')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
                      activeNav === 'customers'
                        ? 'text-white bg-white/10'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-teal-400" />
                      {!sidebarCollapsed && <span>Customer Accounts</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                        {adminUsers.length || 248}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveNav('support')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
                      activeNav === 'support'
                        ? 'text-white bg-white/10'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      {!sidebarCollapsed && <span>Support Tickets</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                        6
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* IPTV & SERVICES */}
              <div>
                {!sidebarCollapsed && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 mb-1.5 font-semibold">
                    IPTV & Services
                  </div>
                )}
                <button
                  onClick={() => setActiveNav('iptv')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
                    activeNav === 'iptv'
                      ? 'text-white bg-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-emerald-400" />
                    {!sidebarCollapsed && <span>IPTV M3U Servers</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      3
                    </span>
                  )}
                </button>
              </div>

              {/* MARKETING & INTEGRATIONS */}
              <div>
                {!sidebarCollapsed && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-3 mb-1.5 font-semibold">
                    Marketing & Integrations
                  </div>
                )}
                <button
                  onClick={() => setActiveNav('campaigns')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition ${
                    activeNav === 'campaigns'
                      ? 'text-white bg-white/10'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Megaphone className="w-4 h-4 text-orange-400" />
                  {!sidebarCollapsed && <span>Marketing Campaigns</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Account Card + Reset Button */}
          <div className="p-3 border-t border-white/5 space-y-2">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center text-xs font-mono shrink-0 shadow-md">
                N
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    PlayBeat Digital
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Pro Plan • Online</span>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Admin Panel Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 transition text-[11px] font-semibold ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Reset admin panel cache & reload data"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              {!sidebarCollapsed && <span>Reset Panel</span>}
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* MAIN BODY & TOP NAVIGATION */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
          {/* Top Bar Header */}
          <header className="sticky top-0 z-20 bg-[#0A0D14]/90 backdrop-blur-xl border-b border-white/5 px-6 py-3.5 flex items-center justify-between gap-4">
            {/* Search input (Ctrl+K) */}
            <div className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, orders, customers..."
                className="w-full pl-9 pr-14 py-2 rounded-xl bg-[#121622] border border-white/5 text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-400/50 transition font-sans"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                Ctrl+K
              </span>
            </div>

            {/* Right Action Icons & Controls */}
            <div className="flex items-center gap-3">
              {/* Back to Live Storefront */}
              <button
                id="admin-storefront-btn"
                onClick={onBackToStorefront}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-medium text-zinc-200 hover:text-white transition group"
              >
                <Store className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
                <span>Storefront</span>
              </button>

              {/* Quick Add Button */}
              <div className="relative">
                <button
                  id="admin-quick-add-btn"
                  onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition shadow-md shadow-amber-400/10"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Quick Add</span>
                </button>

                {showQuickAddMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#121622] border border-white/10 p-1.5 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in">
                    <button
                      onClick={() => {
                        setShowAddProductModal(true)
                        setShowQuickAddMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2"
                    >
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      <span>Add New Product</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCsvImporterModal(true)
                        setShowQuickAddMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Import Products (CSV/DB)</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowLicenseKeyModal(true)
                        setShowQuickAddMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2"
                    >
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Issue License Key</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowCampaignModal(true)
                        setShowQuickAddMenu(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2"
                    >
                      <Megaphone className="w-3.5 h-3.5 text-purple-400" />
                      <span>Launch Campaign</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Mail Icon */}
              <button
                onClick={() => triggerToast('No unread customer support emails')}
                className="p-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/5 text-zinc-400 hover:text-white transition"
              >
                <Mail className="w-4 h-4" />
              </button>

              {/* Notification Bell */}
              <button
                onClick={() => triggerToast('3 orders pending delivery verification')}
                className="relative p-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/5 text-zinc-400 hover:text-white transition"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black font-bold text-[9px] flex items-center justify-center font-mono">
                  3
                </span>
              </button>

              {/* Admin Profile Dropdown */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-white/5">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-xs font-mono">
                  P
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">
                    PlayBeat Admin
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">Administrator</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>
          </header>

          {/* ========================================================================= */}
          {/* CONTENT ROUTER */}
          {/* ========================================================================= */}
          <main className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
            {/* VIEW 1: DASHBOARD OVERVIEW (8-CARD BENTO MATRIX MATCHING SCREENSHOT 1) */}
            {activeNav === 'dashboard' && (
              <div className="space-y-6">
                {/* Top Row: Cards 01 to 04 */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* ========================================================================= */}
                  {/* CARD 01: DASHBOARD OVERVIEW */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-blue-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 01 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          01
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            DASHBOARD OVERVIEW
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            Get a complete snapshot of your business at a glance.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Search className="w-3.5 h-3.5" />
                        <div className="relative">
                          <Bell className="w-3.5 h-3.5" />
                          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        </div>
                        <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] font-mono font-bold flex items-center justify-center">
                          P
                        </div>
                      </div>
                    </div>

                    {/* Welcome Greeting */}
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Welcome back, PlayBeat Admin!</span>
                        <span>👋</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Here's what's happening with your business today.
                      </p>
                    </div>

                    {/* Total Revenue Box */}
                    <div className="p-3.5 rounded-xl bg-[#070A12] border border-blue-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <DollarSign className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[11px] text-zinc-300 font-medium">Total Revenue</span>
                        </div>
                        {statsLoading && <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />}
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-white font-mono">
                          {adminStats ? `Rs ${Number(adminStats.totalRevenue || 0).toLocaleString()}` : '—'}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" /> {adminStats?.recentOrders || 0} <span className="text-[9px] text-zinc-400 font-normal">orders (7d)</span>
                        </span>
                      </div>
                      {/* Blue Sparkline */}
                      <div className="h-5 w-full pt-1">
                        <svg className="w-full h-full" viewBox="0 0 100 20">
                          <path
                            d="M0,15 Q25,18 40,8 T70,12 T100,2"
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* 3 Metric Pills */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-2 rounded-lg bg-[#070A12] border border-white/5">
                        <div className="text-[9px] text-zinc-400 font-mono">Total Orders</div>
                        <div className="text-sm font-black text-white font-mono">
                          {adminStats?.totalOrders ?? '—'}
                        </div>
                        <div className="text-[9px] text-emerald-400 font-mono flex items-center justify-center gap-0.5">
                          <ArrowUpRight className="w-2.5 h-2.5" /> {adminStats?.recentOrders || 0} (7d)
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-[#070A12] border border-white/5">
                        <div className="text-[9px] text-zinc-400 font-mono">Total Products</div>
                        <div className="text-sm font-black text-white font-mono">
                          {adminStats?.totalProducts ?? '—'}
                        </div>
                        <div className="text-[9px] text-purple-400 font-mono">↑ {adminStats?.activeProducts ?? 0} published</div>
                      </div>

                      <div className="p-2 rounded-lg bg-[#070A12] border border-white/5">
                        <div className="text-[9px] text-zinc-400 font-mono">Low Stock Alerts</div>
                        <div className={`text-sm font-black font-mono ${(adminStats?.lowStock || 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
                          {adminStats?.lowStock ?? '—'}
                        </div>
                        <div className="text-[9px] text-amber-400 font-mono">Needs attention</div>
                      </div>
                    </div>

                    {/* Live 14-Day Performance Box */}
                    <div className="p-3.5 rounded-xl bg-[#070A12] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-white">Live 14-Day Performance</span>
                        <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 flex items-center gap-1">
                          {chartLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                          14 Days ▾
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-white font-mono">
                          {adminRevenueChart ? `Rs ${Number(adminRevenueChart.totalRevenue || 0).toLocaleString()}` : '—'}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center">
                          <ArrowUpRight className="w-3 h-3" /> {adminRevenueChart?.totalOrders || 0} orders (14d)
                        </span>
                      </div>

                      {/* Dynamic sparkline chart from real revenue data */}
                      <div className="h-10 w-full">
                        {adminRevenueChart?.series?.length ? (
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40" preserveAspectRatio="none">
                            {(() => {
                              const series = adminRevenueChart.series
                              const max = Math.max(...series.map((s: any) => s.revenue), 1)
                              const points = series.map((s: any, i: number) => {
                                const x = (i / (series.length - 1)) * 200
                                const y = 35 - (s.revenue / max) * 30
                                return { cx: x, cy: y, revenue: s.revenue }
                              })
                              const pathD = points.length > 0
                                ? points.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ')
                                : ''
                              return (
                                <>
                                  <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" />
                                  {points.map((p: any, i: number) => (
                                    <circle key={i} cx={p.cx} cy={p.cy} r="2.5" fill={p.revenue > 0 ? '#f59e0b' : '#374151'} />
                                  ))}
                                </>
                              )
                            })()}
                          </svg>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] text-zinc-600">
                            {chartLoading ? 'Loading chart…' : 'No data'}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                        {adminRevenueChart?.series ? (
                          adminRevenueChart.series
                            .filter((_: any, i: number) => i % 2 === 0 || i === adminRevenueChart.series.length - 1)
                            .map((s: any, i: number) => {
                              const date = new Date(s.date)
                              const label = date.toLocaleDateString('en', { month: 'short', day: '2-digit' })
                              const isLast = i === Math.floor((adminRevenueChart.series.length - 1) / 2)
                              return (
                                <span key={s.date} className={isLast ? 'text-amber-400 font-bold' : ''}>
                                  {label}
                                </span>
                              )
                            })
                        ) : (
                          <span>Loading…</span>
                        )}
                      </div>

                      {/* 3 mini stats below chart */}
                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-white/5 text-[9px] font-mono">
                        <div>
                          <div className="text-zinc-500">Avg Daily Revenue</div>
                          <div className="text-white font-bold">
                            {adminRevenueChart ? `Rs ${Number(adminRevenueChart.avgDailyRevenue || 0).toLocaleString()}` : '—'}
                          </div>
                          <div className="text-emerald-400">↗ 14d avg</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Best Day</div>
                          <div className="text-white font-bold">
                            {adminRevenueChart?.bestDay
                              ? new Date(adminRevenueChart.bestDay.date).toLocaleDateString('en', { month: 'short', day: '2-digit' })
                              : '—'}
                          </div>
                          <div className="text-amber-400">
                            {adminRevenueChart?.bestDay ? `Rs ${Number(adminRevenueChart.bestDay.revenue).toLocaleString()}` : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Total Transactions</div>
                          <div className="text-white font-bold">{adminRevenueChart?.totalOrders ?? '—'}</div>
                          <div className="text-emerald-400">↗ last 14 days</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 02: REVENUE ANALYTICS */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-amber-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 02 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-amber-500 text-black font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          02
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            REVENUE ANALYTICS
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            Track revenue performance and identify your best performing days.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Overview Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Revenue Overview</span>
                        <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                          14 Days ▾
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white font-mono">Rs 44,800</span>
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" /> 18.4% vs previous 14 days
                        </span>
                      </div>
                    </div>

                    {/* Line Chart with Highlight Marker */}
                    <div className="p-3.5 rounded-xl bg-[#070A12] border border-white/5 space-y-2 relative">
                      <div className="absolute top-2 right-3 px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-[9px] font-mono font-bold text-amber-300">
                        Aug 17 Rs 44,800
                      </div>

                      <div className="h-28 w-full pt-4">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 240 80">
                          <defs>
                            <linearGradient id="goldGradient02" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="0" y1="20" x2="240" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
                          <line x1="0" y1="50" x2="240" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />

                          {/* Area Fill */}
                          <path
                            d="M0,70 Q30,65 60,50 T120,40 T180,30 T240,10 L240,80 L0,80 Z"
                            fill="url(#goldGradient02)"
                          />

                          {/* Gold Trend Line */}
                          <path
                            d="M0,70 Q30,65 60,50 T120,40 T180,30 T240,10"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="2.5"
                          />

                          {/* Data points */}
                          {[
                            { cx: 0, cy: 70 },
                            { cx: 35, cy: 65 },
                            { cx: 70, cy: 50 },
                            { cx: 105, cy: 45 },
                            { cx: 140, cy: 40 },
                            { cx: 175, cy: 30 },
                            { cx: 210, cy: 22 },
                            { cx: 240, cy: 10 },
                          ].map((pt, i) => (
                            <circle key={i} cx={pt.cx} cy={pt.cy} r={i === 7 ? 4 : 2.5} fill="#fbbf24" />
                          ))}
                        </svg>
                      </div>

                      <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                        <span>Aug 03</span>
                        <span>Aug 05</span>
                        <span>Aug 07</span>
                        <span>Aug 09</span>
                        <span>Aug 11</span>
                        <span>Aug 13</span>
                        <span>Aug 15</span>
                        <span className="text-amber-400 font-bold">Aug 17</span>
                      </div>

                      {/* 3 mini stats */}
                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-[9px] font-mono">
                        <div>
                          <div className="text-zinc-500">Average Daily Revenue</div>
                          <div className="text-white font-bold">Rs 3,200</div>
                          <div className="text-emerald-400">↗ 12.6%</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Best Day</div>
                          <div className="text-white font-bold">Aug 17</div>
                          <div className="text-amber-400">Rs 6,700</div>
                        </div>
                        <div>
                          <div className="text-zinc-500">Total Transactions</div>
                          <div className="text-white font-bold">32</div>
                          <div className="text-emerald-400">↗ 14.3%</div>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Insights Callout Footer */}
                    <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-300">Revenue Insights</div>
                        <p className="text-[10px] text-zinc-300 leading-snug">
                          Your revenue is up <strong className="text-emerald-400">18.4%</strong> compared to the previous 14 days. Keep up the great work!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 03: ORDER & TRAFFIC INSIGHTS */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-purple-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 03 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          03
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            ORDER & TRAFFIC INSIGHTS
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            Understand your orders and where your traffic comes from.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order Breakdown Donut Chart */}
                    <div className="p-3 rounded-xl bg-[#070A12] border border-white/5 space-y-2">
                      <div className="text-xs font-bold text-white">Order Breakdown</div>
                      <div className="flex items-center justify-between">
                        {/* Circular Donut */}
                        <div className="relative flex items-center justify-center w-24 h-24">
                          <svg className="w-24 h-24 -rotate-90">
                            <circle
                              cx="48"
                              cy="48"
                              r="36"
                              stroke="rgba(255,255,255,0.05)"
                              strokeWidth="9"
                              fill="transparent"
                            />
                            <circle
                              cx="48"
                              cy="48"
                              r="36"
                              stroke="#3b82f6"
                              strokeWidth="9"
                              strokeDasharray="226.19"
                              strokeDashoffset="0"
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-lg font-black text-white font-mono leading-none">2</span>
                            <span className="text-[8px] font-mono text-zinc-400 uppercase">TOTAL</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>2 Completed</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span>0 Pending</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Traffic Sources Progress Bars */}
                    <div className="p-3 rounded-xl bg-[#070A12] border border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Traffic Sources</span>
                        <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/5">
                          This Week ▾
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[10px] font-mono">
                        {/* Direct */}
                        <div>
                          <div className="flex justify-between text-zinc-300 mb-0.5">
                            <span>Direct / URL</span>
                            <strong className="text-white">52% (1,492)</strong>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full w-[52%] rounded-full"></div>
                          </div>
                        </div>

                        {/* TikTok */}
                        <div>
                          <div className="flex justify-between text-zinc-300 mb-0.5">
                            <span>TikTok Leads & Pixel</span>
                            <strong className="text-white">28% (832)</strong>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full w-[28%] rounded-full"></div>
                          </div>
                        </div>

                        {/* Google */}
                        <div>
                          <div className="flex justify-between text-zinc-300 mb-0.5">
                            <span>Organic Google Search</span>
                            <strong className="text-white">14% (481)</strong>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-cyan-400 h-full w-[14%] rounded-full"></div>
                          </div>
                        </div>

                        {/* Referrals */}
                        <div>
                          <div className="flex justify-between text-zinc-300 mb-0.5">
                            <span>Affiliate Referrals</span>
                            <strong className="text-white">6% (172)</strong>
                          </div>
                          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-400 h-full w-[6%] rounded-full"></div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveNav('analytics')}
                        className="w-full py-1.5 mt-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <span>View Full Analytics</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Footer Box */}
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        2 orders completed this week. Keep driving traffic from top sources!
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 04: TOP SELLING PRODUCTS */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-orange-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 04 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-orange-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          04
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            TOP SELLING PRODUCTS
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            See which products are driving the most sales.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Product List Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Top Selling Products</span>
                      <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/5 border border-white/5 flex items-center gap-1">
                        {topProductsLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                        All Time ▾
                      </span>
                    </div>

                    {/* Dynamic Top Selling Items from /api/admin/top-products */}
                    <div className="space-y-2.5">
                      {topProductsLoading ? (
                        <div className="p-4 text-center text-[11px] text-zinc-500">
                          <RefreshCw className="w-4 h-4 animate-spin inline mr-1.5" />
                          Loading top products…
                        </div>
                      ) : adminTopProducts.length === 0 ? (
                        <div className="p-4 text-center text-[11px] text-zinc-500">
                          No sales data yet. Top products will appear here after the first orders.
                        </div>
                      ) : (
                        adminTopProducts.slice(0, 3).map((p: any, idx: number) => {
                          const colors = ['bg-[#003791]', 'bg-[#0070d1]', 'bg-[#E50914]']
                          return (
                            <div
                              key={p.name}
                              className="p-2.5 rounded-xl bg-[#070A12] border border-white/5 flex items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-9 h-9 rounded-lg ${colors[idx] || 'bg-zinc-700'} flex items-center justify-center p-1.5 shrink-0 shadow-md`}>
                                  <Package className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white leading-tight line-clamp-1">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] font-mono text-zinc-400">
                                    Sales: {p.totalSold} • {p.orderCount} orders
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-mono font-black text-white">
                                  Rs {Number(p.totalRevenue || 0).toLocaleString()}
                                </div>
                                <div className="text-[9px] text-amber-400 font-mono">#{p.rank}</div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Footer Tip */}
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        These products are your top performers. Consider promoting more!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Cards 05 to 08 */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* ========================================================================= */}
                  {/* CARD 05: RECENT ORDERS */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-emerald-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 05 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          05
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            RECENT ORDERS
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            Stay updated with your latest customer orders.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Recent Orders
                        {ordersLoading && <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />}
                      </span>
                      <button
                        onClick={() => setActiveNav('orders')}
                        className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Dynamic Recent Orders from /api/admin/orders */}
                    <div className="space-y-2">
                      {ordersLoading ? (
                        <div className="p-4 text-center text-[11px] text-zinc-500">
                          <RefreshCw className="w-4 h-4 animate-spin inline mr-1.5" />
                          Loading recent orders…
                        </div>
                      ) : adminOrders.length === 0 ? (
                        <div className="p-4 text-center text-[11px] text-zinc-500">
                          No orders yet. New customer orders will appear here in real time.
                        </div>
                      ) : (
                        adminOrders.slice(0, 5).map((o: any) => {
                          const d = o.createdAt ? new Date(o.createdAt) : null
                          const dateStr = d
                            ? `${d.toLocaleDateString('en', { month: 'short', day: '2-digit' })}, ${d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`
                            : '—'
                          return (
                            <div
                              key={o.id}
                              className="p-2.5 rounded-xl bg-[#070A12] border border-white/5 flex items-center justify-between"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-white">{o.orderNumber}</span>
                                  <span className="text-xs text-zinc-300 truncate">{o.customerName}</span>
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono">{dateStr}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-mono font-black text-white">
                                  Rs {Number(o.totalAmount || 0).toLocaleString()}
                                </div>
                                <span className={`text-[10px] font-mono font-bold ${
                                  o.status === 'completed' ? 'text-emerald-400' :
                                  o.status === 'processing' ? 'text-amber-400' :
                                  o.status === 'pending' ? 'text-blue-400' :
                                  'text-rose-400'
                                }`}>
                                  {o.status?.charAt(0).toUpperCase() + o.status?.slice(1) || '—'}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Footer Tip */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        Monitor recent orders and ensure fast order processing.
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 06: SYSTEM HEALTH */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-teal-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 06 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          06
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            SYSTEM HEALTH
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            Monitor your system performance in real-time.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-white">System Health</div>

                    {/* Circular Gauge + 100% Healthy */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#070A12] border border-white/5">
                      <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
                        <svg className="w-24 h-24 -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="36"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="36"
                            stroke="#10b981"
                            strokeWidth="8"
                            strokeDasharray="226.19"
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-base font-black text-white font-mono leading-none">100%</span>
                          <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase mt-0.5">Healthy</span>
                          {/* Heartbeat pulse */}
                          <div className="w-8 h-2 mt-1">
                            <svg className="w-full h-full" viewBox="0 0 40 10">
                              <path d="M0,5 L15,5 L18,1 L22,9 L25,5 L40,5" fill="none" stroke="#10b981" strokeWidth="1.5" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Status Checklist */}
                      <div className="space-y-1.5 text-[11px] font-mono flex-1">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Web Server
                          </span>
                          <span className="text-emerald-400 text-[10px]">Operational</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Database
                          </span>
                          <span className="text-emerald-400 text-[10px]">Operational</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Payment Gateway
                          </span>
                          <span className="text-emerald-400 text-[10px]">Operational</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Email Service
                          </span>
                          <span className="text-emerald-400 text-[10px]">Operational</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Tip */}
                    <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        All systems are running smoothly. Great job!
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 07: QUICK ACTIONS & SHORTCUTS */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-yellow-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 07 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-yellow-500 text-black font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          07
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            QUICK ACTIONS & SHORTCUTS
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            Access important actions and tools in one click.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Top Action Bar: Storefront, Quick Actions, Bell 8 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onBackToStorefront}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#FFC107] hover:bg-[#ffcd38] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Storefront</span>
                      </button>

                      <button
                        onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
                        className="py-2 px-3 rounded-xl bg-[#070A12] hover:bg-white/5 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <span>Quick Actions</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      <div className="relative p-2 rounded-xl bg-[#070A12] border border-white/10 text-zinc-300">
                        <Bell className="w-3.5 h-3.5" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black font-mono font-black text-[9px] flex items-center justify-center">
                          8
                        </span>
                      </div>
                    </div>

                    {/* 6 Action Shortcut Buttons (2 Columns x 3 Rows) */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Add Product */}
                      <button
                        onClick={() => setShowAddProductModal(true)}
                        className="p-2.5 rounded-xl bg-[#070A12] hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">Add Product</div>
                          <div className="text-[9px] text-zinc-400">Create new product</div>
                        </div>
                      </button>

                      {/* Create Order */}
                      <button
                        onClick={() => { setActiveNav('orders'); triggerToast('Switched to Orders & Fulfillment — click an order to manage it') }}
                        className="p-2.5 rounded-xl bg-[#070A12] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">Create Order</div>
                          <div className="text-[9px] text-zinc-400">Add new order</div>
                        </div>
                      </button>

                      {/* View Reports */}
                      <button
                        onClick={() => setActiveNav('analytics')}
                        className="p-2.5 rounded-xl bg-[#070A12] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">View Reports</div>
                          <div className="text-[9px] text-zinc-400">Business insights</div>
                        </div>
                      </button>

                      {/* Manage Users */}
                      <button
                        onClick={() => setActiveNav('customers')}
                        className="p-2.5 rounded-xl bg-[#070A12] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <Users2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">Manage Users</div>
                          <div className="text-[9px] text-zinc-400">Team management</div>
                        </div>
                      </button>

                      {/* Discounts */}
                      <button
                        onClick={() => setActiveNav('coupons')}
                        className="p-2.5 rounded-xl bg-[#070A12] hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">Discounts</div>
                          <div className="text-[9px] text-zinc-400">Create offers</div>
                        </div>
                      </button>

                      {/* Settings — opens reset/refresh menu */}
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="p-2.5 rounded-xl bg-[#070A12] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <Settings className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">Reset Panel</div>
                          <div className="text-[9px] text-zinc-400">Clear cache & reload</div>
                        </div>
                      </button>
                    </div>

                    {/* Footer Tip */}
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        Save time with quick access to your most used features.
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 08: SMART ADMIN EXPERIENCE */}
                  {/* ========================================================================= */}
                  <div className="rounded-2xl bg-[#0B0F19] border border-sky-500/30 p-5 space-y-4 shadow-xl flex flex-col justify-between">
                    {/* Header Bar with 08 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-sky-600 text-white font-mono font-extrabold text-xs flex items-center justify-center shadow-md">
                          08
                        </span>
                        <div>
                          <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                            SMART ADMIN EXPERIENCE
                          </h2>
                          <p className="text-[10px] text-zinc-400">
                            Everything you need for a smarter admin experience.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cybernetic Illustration Card */}
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/40 via-[#070A12] to-cyan-950/30 border border-sky-500/20 relative overflow-hidden flex items-center justify-center h-24">
                      {/* Glow FX */}
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-sky-500/20 rounded-full blur-xl pointer-events-none"></div>
                      <div className="flex items-center gap-4 z-10">
                        <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-400/40 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse">
                          <LayoutDashboard className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>PlayBeat AI Engine</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">Real-time Analytics v4.2</div>
                        </div>
                      </div>
                    </div>

                    {/* 4 Feature Points matching Screenshot 1 */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                          <LayoutDashboard className="w-3 h-3" />
                        </div>
                        <div>
                          <span className="font-bold text-white">Modern & Clean UI:</span> Easy to navigate and visually appealing
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-zinc-300">
                        <div className="w-5 h-5 rounded-md bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-3 h-3" />
                        </div>
                        <div>
                          <span className="font-bold text-white">Real-time Analytics:</span> Live data to make better decisions
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-zinc-300">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-3 h-3" />
                        </div>
                        <div>
                          <span className="font-bold text-white">Secure & Reliable:</span> Enterprise-grade security you can trust
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-zinc-300">
                        <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                          <Zap className="w-3 h-3" />
                        </div>
                        <div>
                          <span className="font-bold text-white">Performance Focused:</span> Optimized for speed and efficiency
                        </div>
                      </div>
                    </div>

                    {/* Footer Tip */}
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        Designed for productivity, built for growth.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Full-Width Footer Banner matching Screenshot 1 */}
                <div className="rounded-2xl bg-gradient-to-r from-[#0B0F19] via-[#111728] to-[#0B0F19] border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <img
                      src="/playbeat-logo.png"
                      alt="PlayBeat Arena"
                      className="h-7 w-auto object-contain drop-shadow-[0_0_10px_rgba(255,193,7,0.4)]"
                    />
                    <div className="text-xs sm:text-sm font-semibold text-zinc-300">
                      Everything you need to manage your digital business – all in one powerful dashboard.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCsvImporterModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV / DB Importer</span>
                    </button>

                    <button
                      onClick={() => triggerToast('PlayBeat Admin Console v4.2 Active')}
                      className="px-4 py-2 rounded-xl bg-[#FFC107] hover:bg-[#ffcd38] text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-400/20 transition"
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-[8px]">
                        ▶
                      </div>
                      <span>PlayBeat Admin Dashboard</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: CATALOG PRODUCTS */}
            {activeNav === 'products' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#0F131D] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search catalog by name, SKU or brand..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07090E] border border-white/5 text-xs text-white placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#07090E] border border-white/5 text-xs text-zinc-300 focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="Smart Projectors">Smart Projectors</option>
                      <option value="AI & Productivity">AI & Productivity</option>
                      <option value="Games">Games</option>
                      <option value="Software">Software</option>
                      <option value="Subscriptions">Subscriptions</option>
                      <option value="Gift Cards">Gift Cards</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCsvImporterModal(true)}
                        className="px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-amber-400/30 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                        <span>Import Products (CSV / DB)</span>
                      </button>

                      <button
                        onClick={() => setShowAddProductModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Product</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl bg-[#0F131D] border border-white/5 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Product & SKU</th>
                          <th className="p-3.5">Category</th>
                          <th className="p-3.5">Price</th>
                          <th className="p-3.5">Stock Level</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredProducts.map((p) => {
                          const isEditing = editingStockId === p.id
                          return (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-10 h-10 rounded-lg object-cover bg-zinc-900 shrink-0"
                                  />
                                  <div>
                                    <div className="font-semibold text-white line-clamp-1">
                                      {p.name}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400">
                                      {p.sku}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-zinc-300">
                                  {p.category}
                                </span>
                              </td>

                              <td className="p-3.5 font-mono text-amber-400 font-bold">
                                {formatPrice(p.price, selectedCurrency)}
                              </td>

                              <td className="p-3.5">
                                {isEditing ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      value={tempStockValue}
                                      onChange={(e) => setTempStockValue(Number(e.target.value))}
                                      className="w-16 px-1.5 py-0.5 rounded bg-black border border-amber-400 text-xs font-mono text-white"
                                    />
                                    <button
                                      onClick={() => handleSaveStock(p.id)}
                                      className="px-2 py-0.5 rounded bg-amber-400 text-black font-bold text-[10px]"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      setEditingStockId(p.id)
                                      setTempStockValue(p.stock)
                                    }}
                                    className="cursor-pointer group flex items-center gap-1 text-[11px] font-mono text-zinc-300 hover:text-amber-400"
                                    title="Click to adjust stock"
                                  >
                                    <span>{p.stock} units</span>
                                    <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                  </div>
                                )}
                              </td>

                              <td className="p-3.5 font-mono text-[11px]">
                                {p.digital ? (
                                  <span className="text-emerald-400">⚡ Digital Key</span>
                                ) : (
                                  <span className="text-cyan-400">📦 Physical Hardware</span>
                                )}
                              </td>

                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => onQuickViewProduct(p)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                                  title="Quick View Preview"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: DIGITAL LICENSE VAULT */}
            {activeNav === 'vault' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Generator */}
                  <div className="lg:col-span-5 rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-sm text-white">License Key Dispenser</h3>
                      <p className="text-xs text-zinc-400 font-mono">
                        Generate and inject verified digital licenses into the live order fulfillment engine.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-zinc-400 mb-1 font-mono">Select Target SKU</label>
                        <select
                          value={keyTargetProduct}
                          onChange={(e) => setKeyTargetProduct(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white font-mono"
                        >
                          {products
                            .filter((p) => p.digital)
                            .map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <button
                        onClick={handleGenerateKey}
                        className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Generate & Inject License</span>
                      </button>

                      {generatedKey && (
                        <div className="p-3 rounded-xl bg-[#07090E] border border-amber-400/30 space-y-1">
                          <span className="text-[10px] text-zinc-400 font-mono block">
                            Last Generated Serial:
                          </span>
                          <div className="font-mono text-xs font-bold text-amber-400 select-all">
                            {generatedKey}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Active Pools */}
                  <div className="lg:col-span-7 rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-white">Live Cryptographic Key Pools</h3>
                        <p className="text-xs text-zinc-400 font-mono">
                          9,480 Ready-to-dispatch digital keys across all software categories
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
                        Vault: Active
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { name: 'PlayStation Network $50 US Card', ready: 142, status: 'Healthy' },
                        { name: 'ChatGPT Plus (GPT-4o / Canvas)', ready: 89, status: 'Healthy' },
                        { name: 'Windows 11 Pro Retail License', ready: 64, status: 'Healthy' },
                        { name: 'Grand Theft Auto VI Steam Key', ready: 310, status: 'High Demand' },
                        { name: 'IPTV Ultra 4K 1-Year VIP', ready: 520, status: 'Healthy' },
                      ].map((pool, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-[#07090E] border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <Key className="w-4 h-4 text-amber-400" />
                            <span className="font-medium text-white">{pool.name}</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-amber-400 font-bold">{pool.ready} in pool</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {pool.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: ORDERS & FULFILLMENT */}
            {activeNav === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Customer Orders Log</h2>
                    <p className="text-xs text-zinc-400 font-mono">
                      Real-time stream with automated instant license dispatch
                    </p>
                  </div>
                  <button
                    onClick={() => triggerToast('Exported order history CSV')}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-200 border border-white/10 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="rounded-2xl bg-[#0F131D] border border-white/5 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#07090E] border-b border-white/5 text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Order ID & Date</th>
                          <th className="p-3.5">Customer</th>
                          <th className="p-3.5">Product</th>
                          <th className="p-3.5">Amount</th>
                          <th className="p-3.5">Payment</th>
                          <th className="p-3.5">Dispatch Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {orders.map((o) => (
                          <tr key={o.id} className="hover:bg-white/[0.02] transition">
                            <td className="p-3.5 font-mono">
                              <div className="text-white font-bold">{o.id}</div>
                              <div className="text-[10px] text-zinc-400">
                                {o.date}, {o.time}
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="font-semibold text-white">{o.customer}</div>
                            </td>

                            <td className="p-3.5 text-zinc-300">{o.product}</td>

                            <td className="p-3.5 font-mono text-amber-400 font-bold">
                              Rs {o.amount.toLocaleString()}
                            </td>

                            <td className="p-3.5 font-mono text-xs text-zinc-400">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                {o.paymentMethod}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ✓ {o.status}
                              </span>
                              {o.keyDispatched && (
                                <div className="text-[10px] font-mono text-zinc-400 mt-1 select-all">
                                  Key: {o.keyDispatched}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: WEBSITE BUILDER CMS */}
            {/* ========================================================================= */}
            {activeNav === 'cms' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Website Builder CMS</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Manage storefront pages, hero banners, and published content.</p>
                  </div>
                  <button
                    onClick={() => triggerToast('New page draft created')}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> New Page
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Homepage Hero', slug: '/storefront', status: 'Published', updated: '2h ago' },
                    { name: 'Privacy Policy', slug: '/privacy', status: 'Published', updated: '3d ago' },
                    { name: 'Terms of Service', slug: '/terms', status: 'Published', updated: '3d ago' },
                    { name: 'Refund Policy', slug: '/refund-policy', status: 'Published', updated: '3d ago' },
                    { name: 'Shipping Policy', slug: '/shipping-policy', status: 'Published', updated: '3d ago' },
                    { name: 'Contact Page', slug: '/contact', status: 'Published', updated: '5d ago' },
                  ].map((page) => (
                    <div key={page.slug} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                          {page.status}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-white">{page.name}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{page.slug}</div>
                      <div className="text-[10px] text-zinc-500">Updated {page.updated}</div>
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => triggerToast(`Editing ${page.name}…`)}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold flex items-center justify-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => window.open(page.slug, '_blank')}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-[#0B0F19] border border-amber-500/20 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">CMS Sync Status</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                      <div className="text-zinc-500 text-[10px]">Pages</div>
                      <div className="text-white font-bold text-lg">6</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                      <div className="text-zinc-500 text-[10px]">Products Linked</div>
                      <div className="text-white font-bold text-lg">{products.length}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                      <div className="text-zinc-500 text-[10px]">Categories</div>
                      <div className="text-white font-bold text-lg">10</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                      <div className="text-zinc-500 text-[10px]">Last Deploy</div>
                      <div className="text-emerald-400 font-bold text-lg">Live</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: ANALYTICS & TRAFFIC */}
            {/* ========================================================================= */}
            {activeNav === 'analytics' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Analytics & Traffic</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Real-time store performance metrics from MongoDB.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['Today', 'This Week', 'This Month'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeFilter(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          timeFilter === t ? 'bg-amber-400 text-black' : 'bg-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {statsLoading ? (
                  <div className="py-20 text-center text-zinc-500 text-xs">Loading live stats from MongoDB…</div>
                ) : adminStats ? (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <DollarSign className="w-4 h-4 text-amber-400" />
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono uppercase">Total Revenue</div>
                        <div className="text-xl font-bold text-white">PKR {Number(adminStats.totalRevenue || 0).toLocaleString()}</div>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <ShoppingCart className="w-4 h-4 text-emerald-400" />
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono uppercase">Total Orders</div>
                        <div className="text-xl font-bold text-white">{adminStats.totalOrders || 0}</div>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Package className="w-4 h-4 text-blue-400" />
                          <Activity className="w-3 h-3 text-emerald-400" />
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono uppercase">Active Products</div>
                        <div className="text-xl font-bold text-white">{adminStats.activeProducts || 0}</div>
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Boxes className="w-4 h-4 text-purple-400" />
                          <Activity className="w-3 h-3 text-emerald-400" />
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono uppercase">Catalog Total</div>
                        <div className="text-xl font-bold text-white">{adminStats.totalProducts || 0}</div>
                      </div>
                    </div>

                    {/* Traffic Sources */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-emerald-400" /> Traffic Sources
                        </h3>
                        <div className="space-y-3">
                          {[
                            { source: 'Direct', visits: 4280, pct: 38 },
                            { source: 'Google Search', visits: 3120, pct: 28 },
                            { source: 'WhatsApp', visits: 1980, pct: 17 },
                            { source: 'Instagram', visits: 1240, pct: 11 },
                            { source: 'Facebook', visits: 690, pct: 6 },
                          ].map((s) => (
                            <div key={s.source}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-300">{s.source}</span>
                                <span className="font-mono text-zinc-400">{s.visits.toLocaleString()} ({s.pct}%)</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${s.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyan-400" /> Top Regions
                        </h3>
                        <div className="space-y-3">
                          {[
                            { region: 'Pakistan 🇵🇰', visits: 5840, pct: 52 },
                            { region: 'UAE 🇦🇪', visits: 2120, pct: 19 },
                            { region: 'Saudi Arabia 🇸🇦', visits: 1480, pct: 13 },
                            { region: 'UK 🇬🇧', visits: 980, pct: 9 },
                            { region: 'USA 🇺🇸', visits: 870, pct: 7 },
                          ].map((r) => (
                            <div key={r.region}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-300">{r.region}</span>
                                <span className="font-mono text-zinc-400">{r.visits.toLocaleString()}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400" style={{ width: `${r.pct}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-400" /> Live System Status
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                          <div className="text-zinc-500 text-[10px]">Database</div>
                          <div className="text-emerald-400 font-bold">{adminStats.database || 'playbeat'}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                          <div className="text-zinc-500 text-[10px]">System Health</div>
                          <div className="text-emerald-400 font-bold">{adminStats.systemHealth || '100% Operational'}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                          <div className="text-zinc-500 text-[10px]">API Status</div>
                          <div className="text-emerald-400 font-bold">Online</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#07090E] border border-white/5">
                          <div className="text-zinc-500 text-[10px]">Region</div>
                          <div className="text-white font-bold">iad1 / hkg1</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-20 text-center text-zinc-500 text-xs">Failed to load stats. Check admin token.</div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: SUBSCRIPTIONS */}
            {/* ========================================================================= */}
            {activeNav === 'subscriptions' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Active Subscriptions</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Recurring digital subscription plans and renewals.</p>
                  </div>
                  <button
                    onClick={() => triggerToast('Subscription plan editor opened')}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> New Plan
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Active Subs</div>
                    <div className="text-2xl font-bold text-white">142</div>
                    <div className="text-[10px] text-emerald-400">+12 this week</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Monthly MRR</div>
                    <div className="text-2xl font-bold text-white">PKR 486K</div>
                    <div className="text-[10px] text-emerald-400">+8.2% MoM</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Renewals (30d)</div>
                    <div className="text-2xl font-bold text-white">38</div>
                    <div className="text-[10px] text-amber-400">PKR 142K pending</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Churn Rate</div>
                    <div className="text-2xl font-bold text-white">2.1%</div>
                    <div className="text-[10px] text-emerald-400">Below industry avg</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Top Subscription Plans</h3>
                    <span className="text-[10px] font-mono text-zinc-500">Sorted by active subscribers</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#07090E]">
                        <tr className="text-left text-zinc-400">
                          <th className="px-4 py-2.5 font-medium">Plan Name</th>
                          <th className="px-4 py-2.5 font-medium">Subscribers</th>
                          <th className="px-4 py-2.5 font-medium">Price</th>
                          <th className="px-4 py-2.5 font-medium">Cycle</th>
                          <th className="px-4 py-2.5 font-medium">MRR</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          { name: 'ChatGPT Plus Premium', subs: 48, price: 7800, cycle: 'Monthly', status: 'Active' },
                          { name: 'Netflix Premium 4K', subs: 36, price: 6800, cycle: 'Monthly', status: 'Active' },
                          { name: 'Spotify Premium Individual', subs: 28, price: 2499, cycle: '3 Months', status: 'Active' },
                          { name: 'YouTube Premium Family', subs: 18, price: 4200, cycle: 'Monthly', status: 'Active' },
                          { name: 'Disney+ Premium', subs: 12, price: 2549, cycle: '3 Months', status: 'Active' },
                        ].map((s) => (
                          <tr key={s.name} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                            <td className="px-4 py-3 text-zinc-300 font-mono">{s.subs}</td>
                            <td className="px-4 py-3 text-zinc-300 font-mono">PKR {s.price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-zinc-400">{s.cycle}</td>
                            <td className="px-4 py-3 text-emerald-400 font-mono font-bold">PKR {(s.subs * s.price).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: DISCOUNTS & COUPONS */}
            {/* ========================================================================= */}
            {activeNav === 'coupons' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Discounts & Coupons</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Promo codes, flash deals, and VIP discount management.</p>
                  </div>
                  <button
                    onClick={() => triggerToast('Coupon creator opened')}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> New Coupon
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Active Coupons</div>
                    <div className="text-2xl font-bold text-white">4</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Redemptions (30d)</div>
                    <div className="text-2xl font-bold text-white">186</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Discount Given</div>
                    <div className="text-2xl font-bold text-white">PKR 84K</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Conversion Lift</div>
                    <div className="text-2xl font-bold text-emerald-400">+24%</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5">
                    <h3 className="text-sm font-bold text-white">Active Coupon Codes</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#07090E]">
                        <tr className="text-left text-zinc-400">
                          <th className="px-4 py-2.5 font-medium">Code</th>
                          <th className="px-4 py-2.5 font-medium">Discount</th>
                          <th className="px-4 py-2.5 font-medium">Used</th>
                          <th className="px-4 py-2.5 font-medium">Limit</th>
                          <th className="px-4 py-2.5 font-medium">Expires</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                          <th className="px-4 py-2.5 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {[
                          { code: 'PLAYBEAT10', discount: '10% OFF', used: 84, limit: 200, expires: 'Never', status: 'Active' },
                          { code: 'CINEMA2026', discount: '15% OFF', used: 62, limit: 100, expires: '31 Dec 2026', status: 'Active' },
                          { code: 'FLASH50', discount: '50% OFF', used: 28, limit: 50, expires: '5 Sep 2026', status: 'Active' },
                          { code: 'VIPWELCOME', discount: 'PKR 500', used: 12, limit: 1000, expires: 'Never', status: 'Active' },
                        ].map((c) => (
                          <tr key={c.code} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <code className="font-mono text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded">{c.code}</code>
                            </td>
                            <td className="px-4 py-3 text-white font-semibold">{c.discount}</td>
                            <td className="px-4 py-3 text-zinc-300 font-mono">{c.used}</td>
                            <td className="px-4 py-3 text-zinc-400 font-mono">{c.limit}</td>
                            <td className="px-4 py-3 text-zinc-400">{c.expires}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(c.code)
                                  triggerToast(`Copied ${c.code}`)
                                }}
                                className="text-zinc-400 hover:text-amber-400 text-[10px] font-semibold"
                              >
                                Copy
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: CUSTOMER ACCOUNTS (real data from /api/admin/users) */}
            {/* ========================================================================= */}
            {activeNav === 'customers' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">Customer Accounts</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">All registered users. Promote normal users to staff with a unique Staff ID.</p>
                  </div>
                  <button
                    onClick={() => { fetchAdminUsers(); fetchAdminStaff() }}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>

                {/* Staff Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Total Users</div>
                    <div className="text-2xl font-bold text-white">{adminUsers.length || '—'}</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Staff Members</div>
                    <div className="text-2xl font-bold text-amber-400">{adminStaff.length}</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Normal Users</div>
                    <div className="text-2xl font-bold text-white">{adminUsers.filter((u: any) => u.role === 'user').length}</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-amber-500/20 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Super Admin</div>
                    <div className="text-sm font-bold text-amber-400 truncate">admin@playbeat.digital</div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">All Registered Users</h3>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {usersLoading ? 'Loading…' : `${adminUsers.length} users`}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#07090E]">
                        <tr className="text-left text-zinc-400">
                          <th className="px-4 py-2.5 font-medium">Name</th>
                          <th className="px-4 py-2.5 font-medium">Email</th>
                          <th className="px-4 py-2.5 font-medium">Role</th>
                          <th className="px-4 py-2.5 font-medium">Staff ID</th>
                          <th className="px-4 py-2.5 font-medium">Provider</th>
                          <th className="px-4 py-2.5 font-medium">Joined</th>
                          <th className="px-4 py-2.5 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {usersLoading ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                              <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                              Fetching users from MongoDB…
                            </td>
                          </tr>
                        ) : adminUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                              No users found. New customer registrations will appear here.
                            </td>
                          </tr>
                        ) : (
                          adminUsers.map((u: any) => (
                            <tr key={u.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3 font-semibold text-white">{u.name}</td>
                              <td className="px-4 py-3 text-zinc-300 font-mono">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                                  u.role === 'staff' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                                  u.role === 'admin' ? 'bg-rose-400/10 text-rose-400 border-rose-400/20' :
                                  'bg-zinc-400/10 text-zinc-400 border-zinc-400/20'
                                }`}>
                                  {u.role || 'user'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono text-zinc-400">{u.staffId || '—'}</td>
                              <td className="px-4 py-3 text-zinc-400">{u.provider || 'local'}</td>
                              <td className="px-4 py-3 text-zinc-400 font-mono">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {u.role === 'user' ? (
                                  <button
                                    onClick={() => {
                                      setPromoteModalUser(u)
                                      setPromoteStaffId(`PB-STAFF-${Math.floor(100 + Math.random() * 900)}`)
                                    }}
                                    className="text-amber-400 hover:text-amber-300 text-[10px] font-semibold"
                                  >
                                    Promote →
                                  </button>
                                ) : u.role === 'staff' ? (
                                  <button
                                    onClick={() => handleDemoteStaff(u.id)}
                                    className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold"
                                  >
                                    Demote
                                  </button>
                                ) : (
                                  <span className="text-zinc-600 text-[10px]">Protected</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: IPTV M3U SERVERS */}
            {/* ========================================================================= */}
            {activeNav === 'iptv' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">IPTV M3U Servers</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Manage M3U playlist sources, server health, and channel lineups.</p>
                  </div>
                  <button
                    onClick={() => triggerToast('Add server form opened')}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Server
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Active Servers</div>
                    <div className="text-2xl font-bold text-white">3</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Total Channels</div>
                    <div className="text-2xl font-bold text-white">15,247</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Avg Uptime</div>
                    <div className="text-2xl font-bold text-emerald-400">99.98%</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Active Viewers</div>
                    <div className="text-2xl font-bold text-white">1,284</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: 'EU-Premium-01', region: 'Frankfurt 🇩🇪', channels: 8420, uptime: 99.99, status: 'Online', load: 42 },
                    { name: 'US-Stream-02', region: 'New York 🇺🇸', channels: 4830, uptime: 99.95, status: 'Online', load: 68 },
                    { name: 'PK-Local-03', region: 'Karachi 🇵🇰', channels: 1997, uptime: 99.97, status: 'Online', load: 31 },
                  ].map((srv) => (
                    <div key={srv.name} className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                            <Tv className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{srv.name}</div>
                            <div className="text-[10px] text-zinc-500">{srv.region}</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                          {srv.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-[#07090E] border border-white/5">
                          <div className="text-[10px] text-zinc-500">Channels</div>
                          <div className="font-bold text-white">{srv.channels.toLocaleString()}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#07090E] border border-white/5">
                          <div className="text-[10px] text-zinc-500">Uptime</div>
                          <div className="font-bold text-emerald-400">{srv.uptime}%</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                          <span>Server Load</span>
                          <span className="font-mono">{srv.load}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full ${srv.load > 80 ? 'bg-rose-500' : srv.load > 60 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${srv.load}%` }} />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => triggerToast(`M3U playlist URL for ${srv.name} copied to clipboard`)}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold"
                        >
                          Copy M3U URL
                        </button>
                        <button
                          onClick={() => triggerToast(`Restarting ${srv.name}…`)}
                          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold"
                        >
                          Restart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: MARKETING CAMPAIGNS */}
            {/* ========================================================================= */}
            {activeNav === 'campaigns' && (
              <CampaignsPanel
                products={products}
                triggerToast={triggerToast}
                onLaunchCampaign={() => setShowCampaignModal(true)}
              />
            )}

            {/* ========================================================================= */}
            {/* PANEL: SUPPORT TICKETS */}
            {/* ========================================================================= */}
            {activeNav === 'support' && (
              <SupportPanel
                triggerToast={triggerToast}
                onQuickReply={() => setShowSupportModal(true)}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">PlayBeat Digital Pvt Ltd</span>
              <span>© 2026 • All rights reserved.</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="hover:text-white cursor-pointer">Privacy</span>
              <span className="hover:text-white cursor-pointer">Terms</span>
              <span className="hover:text-white cursor-pointer">Support</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Operational
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0F131D] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">Add New Catalog Product</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Steam Wallet Card $50 Global"
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Category</label>
                  <select className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white">
                    <option>Smart Projectors</option>
                    <option>AI & Productivity</option>
                    <option>Games</option>
                    <option>Gift Cards</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Price (PKR)</label>
                  <input
                    type="number"
                    placeholder="14500"
                    className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-zinc-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAddProductModal(false)
                  triggerToast('New product added to PlayBeat catalog!')
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs"
              >
                Create Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Launch Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0F131D] border border-amber-500/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Launch AI Campaign</h3>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Broadcast targeted SMS / WhatsApp & Email offers to all 248 customer profiles with 1-click discount links.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Campaign Headline</label>
                <input
                  type="text"
                  defaultValue="🔥 Weekend Flash Sale: 20% OFF Magcubic 4K Cinema!"
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Coupon Attached</label>
                <input
                  type="text"
                  defaultValue="PLAYBEAT20"
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-amber-400 font-mono font-bold"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowCampaignModal(false)
                triggerToast('Campaign dispatched to 248 active customer contacts!')
              }}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition"
            >
              Dispatch Campaign Now
            </button>
          </div>
        </div>
      )}

      {/* Support Tickets Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0F131D] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Customer Support Queue (6)</h3>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Ali Raza', issue: 'PSN $50 Key delivery query', time: '10m ago', priority: 'High' },
                { name: 'Zohaib Hassan', issue: 'Magcubic HY450 delivery tracking', time: '25m ago', priority: 'Normal' },
                { name: 'Noman Siddiqui', issue: 'IPTV M3U playlist activation link', time: '1h ago', priority: 'High' },
              ].map((t, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#07090E] border border-white/5 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-[11px] text-zinc-400">{t.issue}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/10 text-amber-400">
                      {t.priority}
                    </span>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">{t.time}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2 rounded-xl bg-white/10 text-white font-medium text-xs"
            >
              Close Queue
            </button>
          </div>
        </div>
      )}

      {/* Promote to Staff Modal */}
      {promoteModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0F131D] border border-amber-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Promote to Staff</h3>
              </div>
              <button
                onClick={() => { setPromoteModalUser(null); setPromoteStaffId('') }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#07090E] border border-white/5 text-xs space-y-1">
              <div className="text-zinc-500 text-[10px] uppercase font-mono">User</div>
              <div className="font-bold text-white">{promoteModalUser.name}</div>
              <div className="font-mono text-zinc-400">{promoteModalUser.email}</div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5 text-xs">Assign Staff ID</label>
              <input
                type="text"
                value={promoteStaffId}
                onChange={(e) => setPromoteStaffId(e.target.value)}
                placeholder="PB-STAFF-001"
                className="w-full px-3 py-2.5 rounded-xl bg-[#07090E] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-zinc-500 mt-1.5">
                This ID must be unique. The user will gain staff privileges and appear in the staff list.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setPromoteModalUser(null); setPromoteStaffId('') }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteStaff}
                disabled={!promoteStaffId.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs disabled:opacity-50"
              >
                Promote User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Admin Panel Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0F131D] border border-rose-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="font-bold text-base text-white">Reset Admin Panel</h3>
              </div>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-zinc-300 leading-relaxed">
                This will clear all locally-cached admin data (stats, orders, top products, revenue chart, users, staff) and reload everything fresh from MongoDB.
              </p>

              <div className="p-3 rounded-xl bg-[#07090E] border border-white/5 space-y-1.5">
                <div className="text-[10px] text-zinc-500 uppercase font-mono mb-1">What gets reset:</div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Dashboard stats (revenue, orders, products)
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Recent orders list
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Top selling products
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  14-day revenue chart
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Users & staff lists
                </div>
                <div className="flex items-center gap-2 text-emerald-300 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Admin session & JWT token: PRESERVED (you stay logged in)
                </div>
              </div>

              <p className="text-[10px] text-zinc-500">
                Useful when data looks stale or after placing test orders from the storefront.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAdminPanel}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset & Reload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV & MongoDB Cloud Importer Modal */}
      <CsvImporterModal
        isOpen={showCsvImporterModal}
        onClose={() => setShowCsvImporterModal(false)}
        existingProducts={products}
        onPublishProducts={(newProducts, mode, syncToMongo) => {
          if (onImportProducts) {
            onImportProducts(newProducts, mode, syncToMongo)
          }
          triggerToast(`Published ${newProducts.length} products to store catalog!`)
        }}
      />
    </div>
  )
}
