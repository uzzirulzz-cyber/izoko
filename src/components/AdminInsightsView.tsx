import React, { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Globe,
  Smartphone,
  BarChart3,
  ShoppingBag,
  Package,
  Key,
  Repeat,
  Tag,
  Users,
  MessageSquare,
  MessagesSquare,
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
  ScrollText,
  DatabaseBackup,
  ImageIcon,
  UserCog,
  LogOut,
  KeyRound,
  History,
  Percent,
  Folder,
} from 'lucide-react'
import { Product, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'
import '../admin-theme.css'
import { NeonCart, NeonShield, NeonBolt, NeonBrain, ViewHeader, KpiTile } from './admin/enterprise'
import { CsvImporterModal } from './CsvImporterModal'
import { ProductEditorModal } from './admin/ProductEditorModal'
import { MediaLibraryPanel } from './admin/MediaLibraryPanel'
import { CampaignsPanel } from './admin/CampaignsPanel'
import { SupportPanel } from './admin/SupportPanel'
import { MessageBoxPanel } from './admin/MessageBoxPanel'
import { AndroidAppPanel } from './admin/AndroidAppPanel'
import { DocumentsPanel } from './admin/DocumentsPanel'
import AdminAvatar from './admin/AdminAvatar'
import { StaffAccountsPanel } from './admin/StaffAccountsPanel'
import { SystemHealthPanel } from './admin/SystemHealthPanel'
import { BackupPanel } from './admin/BackupPanel'
import { CmsPanel } from './admin/CmsPanel'
import { AnalyticsPanel } from './admin/AnalyticsPanel'
import { OrdersLogPanel } from './admin/OrdersLogPanel'
import { ProfileSettingsPanel } from './admin/ProfileSettingsPanel'

interface AdminInsightsViewProps {
  products: Product[]
  selectedCurrency: CurrencyCode
  onBackToStorefront: () => void
  onSignOut?: () => void
  onQuickViewProduct: (product: Product) => void
  onUpdateProductStock?: (productId: string, newStock: number) => void
  onUpdateProductPrice?: (productId: string, newPrice: number) => void
  onImportProducts?: (
    newProducts: Product[],
    mode: 'merge' | 'replace',
    syncToMongo?: boolean
  ) => void
  onSaveProduct?: (
    product: Product,
    isNew: boolean
  ) => Promise<{ ok: boolean; error?: string }> | void
  onDeleteProduct?: (productId: string) => Promise<{ ok: boolean; error?: string }> | void
}

// NO MOCK DATA — every dataset in this dashboard is fetched live from MongoDB.
// Empty states are rendered when collections have no real records yet.


// Color-coded category system (matches storefront palette)
const ADMIN_CATEGORY_COLORS: Record<string, string> = {
  Streaming: 'bg-rose-500/15 text-rose-300 border border-rose-400/30',
  Subscriptions: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
  'Gift Cards': 'bg-amber-500/15 text-amber-300 border border-amber-400/30',
  Gaming: 'bg-indigo-500/15 text-indigo-300 border border-indigo-400/30',
  Software: 'bg-purple-500/15 text-purple-300 border border-purple-400/30',
  'Smart Projectors': 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30',
}
const adminCategoryChip = (cat: string) =>
  ADMIN_CATEGORY_COLORS[cat] || 'bg-white/5 text-zinc-300 border border-white/10'

export const AdminInsightsView: React.FC<AdminInsightsViewProps> = ({
  products,
  selectedCurrency,
  onBackToStorefront,
  onSignOut,
  onQuickViewProduct,
  onUpdateProductStock,
  onUpdateProductPrice,
  onImportProducts,
  onSaveProduct,
  onDeleteProduct,
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
  const [activeNav, setActiveNav] = useState<string>(() => {
    // Deep-link support: /admin#orders, #products, #androidapp ... (used by the
    // native Android bottom navigation + push deep links)
    try {
      const h = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase()
      if (h && /^[a-z-]+$/.test(h)) return h
    } catch { /* noop */ }
    return 'dashboard'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [timeFilter, setTimeFilter] = useState<'Today' | 'This Week' | 'This Month'>('This Week')
  const [chartMetric, setChartMetric] = useState<'Revenue' | 'Orders' | 'Customers'>('Revenue')
  const [chartRange, setChartRange] = useState<'Last 14 Days' | 'Last 30 Days' | 'This Month'>('Last 14 Days')
  // Interactive revenue chart: hovered point index + selected range (days)
  const [revHoverIdx, setRevHoverIdx] = useState<number | null>(null)
  const [revRangeDays, setRevRangeDays] = useState<14 | 30>(14)
  const [revRangeOpen, setRevRangeOpen] = useState(false)

  // Data states — ALL LIVE from MongoDB (no mock entries)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  // Modals & Drawers
  const [editorProduct, setEditorProduct] = useState<Product | null>(null)
  const [showProductEditor, setShowProductEditor] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
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

  // ===== Deep-link sync (native Android app bottom navigation) =====
  // Keep the URL hash in sync with the active section and react to external
  // hash changes (e.g. the Android shell navigating to /admin#orders).
  useEffect(() => {
    const VALID = new Set([
      'dashboard', 'health', 'cms', 'analytics', 'orders', 'orders-log', 'products',
      'media', 'customers', 'subscriptions', 'iptv', 'coupons', 'campaigns', 'support',
      'messages', 'vault', 'backup', 'staff', 'androidapp', 'profile', 'documents',
    ])
    const applyHash = () => {
      const h = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase()
      if (h && VALID.has(h)) setActiveNav((prev) => (prev === h ? prev : h))
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  useEffect(() => {
    try {
      const want = `#${activeNav}`
      if (window.location.hash !== want) {
        history.replaceState(null, '', want)
      }
    } catch { /* noop */ }
  }, [activeNav])


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
  const [adminHealth, setAdminHealth] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [adminBackups, setAdminBackups] = useState<any[]>([])
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [cmsSettings, setCmsSettings] = useState<any>(null)
  const [cmsLoading, setCmsLoading] = useState(false)
  const [adminAnalytics, setAdminAnalytics] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [adminRole, setAdminRole] = useState<'admin' | 'staff'>('admin')
  const [adminAuthority, setAdminAuthority] = useState<
    'super_admin' | 'admin' | 'manager' | 'supervisor'
  >('super_admin')
  const [adminName, setAdminName] = useState('PlayBeat Admin')
  const [adminEmail, setAdminEmail] = useState('')
  // Live online device count for the Mobile App sidebar badge (polled every 60s)
  const appOnlineCountRef = useRef(0)
  const [appOnlineCount, setAppOnlineCount] = useState(0)
  // Live support inbox: unread ("new") customer messages for the sidebar badge
  const [supportNewCount, setSupportNewCount] = useState(0)
  // Message Box unread badge (live chats + staff DMs)
  const [msgUnreadCount, setMsgUnreadCount] = useState(0)

  // Admin profile dropdown (header avatar button)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [profileFocus, setProfileFocus] = useState<
    'identity' | 'security' | 'activity' | null
  >(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

  // Power Authority gates (UI mirror of the server-side requireAuthority rules)
  const canManageStaff = adminRole === 'admin' || adminAuthority === 'admin'
  const isSuperAdminUser = adminRole === 'admin'

  // Resolve the signed-in administrator's identity & role (super admin vs staff)
  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/admin/me`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (data?.success && data?.admin) {
          setAdminRole(data.admin.role === 'staff' ? 'staff' : 'admin')
          // Power Authority: super_admin (env) | admin | manager | supervisor
          const auth = data.admin.authority || (data.admin.role === 'admin' ? 'super_admin' : 'supervisor')
          setAdminAuthority(auth)
          setAdminName(data.admin.name || 'PlayBeat Admin')
          setAdminEmail(data.admin.email || '')
        }
      } catch {
        // keep defaults
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll Android app live device count for the sidebar badge
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/app/devices`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (!cancelled && data?.success) {
          appOnlineCountRef.current = data.stats?.onlineNow || 0
          setAppOnlineCount(data.stats?.onlineNow || 0)
        }
      } catch {
        /* silent */
      }
      try {
        const res2 = await fetch(`${API_BASE}/api/admin/support-messages`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const data2 = await res2.json()
        if (!cancelled && data2?.success?.counts) {
          setSupportNewCount(data2.counts.new || 0)
        } else if (!cancelled && data2?.counts) {
          setSupportNewCount(data2.counts.new || 0)
        }
      } catch {
        /* silent */
      }
      try {
        const res3 = await fetch(`${API_BASE}/api/messages/unread-count`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const data3 = await res3.json()
        if (!cancelled && data3?.success?.unread) {
          setMsgUnreadCount(data3.unread.total || 0)
        }
      } catch {
        /* silent */
      }
    }
    poll()
    const t = setInterval(poll, 60000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close the profile dropdown when clicking outside of it
  useEffect(() => {
    if (!showProfileMenu) return
    const onDown = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showProfileMenu])

  // Open the profile settings view, optionally deep-linking to a section
  const openProfile = (focus: 'identity' | 'security' | 'activity' = 'identity') => {
    setShowProfileMenu(false)
    setProfileFocus(focus)
    setActiveNav('profile')
  }

  // Terminate the admin session: server cookie clear + local cache clear + redirect
  const handleAdminSignOut = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
    } catch {
      // continue with local cleanup regardless
    }
    localStorage.removeItem('playbeat_admin_token')
    localStorage.removeItem('playbeat_admin_session')
    if (onSignOut) {
      onSignOut()
    } else {
      onBackToStorefront()
    }
  }

  const fetchAdminHealth = async () => {
    setHealthLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/system-health`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminHealth(data.health)
    } catch (e) {
      // silent
    } finally {
      setHealthLoading(false)
    }
  }

  const fetchAdminBackups = async () => {
    setBackupsLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/backup`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminBackups(data.backups || [])
    } catch (e) {
      // silent
    } finally {
      setBackupsLoading(false)
    }
  }

  const fetchCmsSettings = async () => {
    setCmsLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/cms/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setCmsSettings(data.settings)
    } catch (e) {
      // silent
    } finally {
      setCmsLoading(false)
    }
  }

  const fetchAdminAnalytics = async (days = 14) => {
    setAnalyticsLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/analytics/summary?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setAdminAnalytics(data.analytics)
    } catch (e) {
      // silent
    } finally {
      setAnalyticsLoading(false)
    }
  }

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

  const fetchAdminRevenueChart = async (days: number = 14) => {
    setChartLoading(true)
    try {
      const token = getAdminToken()
      const res = await fetch(`${API_BASE}/api/admin/revenue-chart?days=${days}`, {
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
      fetchAdminHealth(),
      fetchAdminBackups(),
      fetchAdminAnalytics(),
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
    setAdminHealth(null)
    setAdminBackups([])
    setAdminAnalytics(null)
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
      if (!adminAnalytics) fetchAdminAnalytics()
    } else if (activeNav === 'health') {
      if (!adminHealth) fetchAdminHealth()
    } else if (activeNav === 'backup') {
      if (!adminBackups.length) fetchAdminBackups()
    } else if (activeNav === 'cms') {
      if (!cmsSettings) fetchCmsSettings()
    } else if (activeNav === 'staff') {
      fetchAdminStaff()
      fetchAdminUsers()
    } else if (activeNav === 'dashboard') {
      // Dashboard needs all data: stats, orders, top products, chart, health, traffic
      if (!adminStats) fetchAdminStats()
      if (adminOrders.length === 0) fetchAdminOrders()
      if (adminTopProducts.length === 0) fetchAdminTopProducts()
      if (!adminRevenueChart) fetchAdminRevenueChart()
      if (!adminHealth) fetchAdminHealth()
      if (!adminAnalytics) fetchAdminAnalytics()
    }
  }, [activeNav])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Keyboard shortcuts — Ctrl/Cmd+K focus search, Alt+N new product, Esc closes menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        document.getElementById('admin-search-input')?.focus()
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setEditorProduct(null)
        setShowProductEditor(true)
      } else if (e.key === 'Escape') {
        setShowQuickAddMenu(false)
        setShowProfileMenu(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- PRODUCT CRUD (delegated to App state + MongoDB sync props) ----------
  const handleEditorSave = async (
    product: Product,
    isNew: boolean
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!onSaveProduct) return { ok: false, error: 'Save handler unavailable.' }
    const result = await onSaveProduct(product, isNew)
    if (!result || result.ok !== false) {
      setShowProductEditor(false)
      fetchAdminHealth()
    }
    return result || { ok: true }
  }

  const handleEditorDelete = async (productId: string) => {
    if (!onDeleteProduct) {
      triggerToast('Delete handler unavailable.')
      return
    }
    await onDeleteProduct(productId)
    fetchAdminHealth()
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
    <div className="pbadmin min-h-screen pa-ambient text-zinc-100 font-sans flex flex-col antialiased selection:bg-amber-500 selection:text-black">
      {/* Ambient enterprise grid canvas */}
      <div className="pa-grid-overlay" aria-hidden="true"></div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="pa-toast fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-amber-300 animate-in slide-in-from-bottom duration-300">
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
          className={`pa-sidebar ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          } flex flex-col justify-between shrink-0 transition-all duration-300 select-none z-30`}
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
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_currentColor]"></span>
                    Main
                  </div>
                )}
                <button
                  onClick={() => setActiveNav('dashboard')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 transition font-medium ${
                    activeNav === 'dashboard'
                      ? 'pa-nav-item--active-gold'
                      : 'pa-nav-item'
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
                <button
                  onClick={() => setActiveNav('health')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 mt-0.5 ${
                    activeNav === 'health' ? 'pa-nav-item--active' : 'pa-nav-item'
                  }`}
                  style={
                    activeNav === 'health'
                      ? ({ '--nav-a': '#6ee7b7', '--nav-bg': 'rgba(16,185,129,0.09)', '--nav-edge': 'rgba(16,185,129,0.28)' } as React.CSSProperties)
                      : undefined
                  }
                >
                  <Activity className="w-4 h-4 text-emerald-400" />
                  {!sidebarCollapsed && <span>System Health</span>}
                </button>
              </div>

              {/* WEBSITE & ANALYTICS */}
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-violet-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_currentColor]"></span>
                    Website & Analytics
                  </div>
                )}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveNav('cms')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                      activeNav === 'cms' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'cms'
                        ? ({ '--nav-a': '#67e8f9', '--nav-bg': 'rgba(34,211,238,0.09)', '--nav-edge': 'rgba(34,211,238,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Globe className="w-4 h-4 text-cyan-400" />
                    {!sidebarCollapsed && <span>Website Builder CMS</span>}
                  </button>

                  <button
                    onClick={() => setActiveNav('analytics')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                      activeNav === 'analytics' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'analytics'
                        ? ({ '--nav-a': '#c4b5fd', '--nav-bg': 'rgba(139,92,246,0.09)', '--nav-edge': 'rgba(139,92,246,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    {!sidebarCollapsed && <span>Analytics & Traffic</span>}
                  </button>
                </div>
              </div>

              {/* COMMERCE & INVENTORY */}
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-blue-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_currentColor]"></span>
                    Commerce & Inventory
                  </div>
                )}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveNav('orders-log')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'orders-log' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'orders-log'
                        ? ({ '--nav-a': '#93c5fd', '--nav-bg': 'rgba(59,130,246,0.09)', '--nav-edge': 'rgba(59,130,246,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4" />
                      {!sidebarCollapsed && <span>Orders & Fulfillment</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold">
                        {adminOrders.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveNav('orders-log')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'orders' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'orders'
                        ? ({ '--nav-a': '#7dd3fc', '--nav-bg': 'rgba(56,189,248,0.09)', '--nav-edge': 'rgba(56,189,248,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <ScrollText className="w-4 h-4 text-amber-400" />
                      {!sidebarCollapsed && <span>Customer Orders Log</span>}
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveNav('products')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'products' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'products'
                        ? ({ '--nav-a': '#fcd34d', '--nav-bg': 'rgba(245,184,0,0.09)', '--nav-edge': 'rgba(245,184,0,0.3)' } as React.CSSProperties)
                        : undefined
                    }
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
                    onClick={() => setActiveNav('media')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'media' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'media'
                        ? ({ '--nav-a': '#d8b4fe', '--nav-bg': 'rgba(168,85,247,0.09)', '--nav-edge': 'rgba(168,85,247,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      {!sidebarCollapsed && <span>Media & Image Manager</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                        {products.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setShowCsvImporterModal(true)}
                    className="w-full flex items-center justify-between px-3 py-2 pa-nav-item hover:!text-amber-300 hover:!bg-amber-400/10 group"
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

                  {isSuperAdminUser && (
                  <button
                    onClick={() => setActiveNav('backup')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                      activeNav === 'backup' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'backup'
                        ? ({ '--nav-a': '#7dd3fc', '--nav-bg': 'rgba(56,189,248,0.09)', '--nav-edge': 'rgba(56,189,248,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <DatabaseBackup className="w-4 h-4 text-sky-400" />
                    {!sidebarCollapsed && <span>Restore Points & Sync</span>}
                  </button>
                  )}

                  <button
                    onClick={() => setActiveNav('vault')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                      activeNav === 'vault' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'vault'
                        ? ({ '--nav-a': '#fcd34d', '--nav-bg': 'rgba(245,184,0,0.09)', '--nav-edge': 'rgba(245,184,0,0.3)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    {!sidebarCollapsed && <span>Digital License Vault</span>}
                  </button>

                  <button
                    onClick={() => setActiveNav('documents')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                      activeNav === 'documents' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'documents'
                        ? ({ '--nav-a': '#67e8f9', '--nav-bg': 'rgba(34,211,238,0.09)', '--nav-edge': 'rgba(34,211,238,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Folder className="w-4 h-4 text-cyan-400" />
                    {!sidebarCollapsed && <span>Documents &amp; Files</span>}
                  </button>

                  <button
                    onClick={() => setActiveNav('subscriptions')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                      activeNav === 'subscriptions' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'subscriptions'
                        ? ({ '--nav-a': '#f0abfc', '--nav-bg': 'rgba(217,70,239,0.09)', '--nav-edge': 'rgba(217,70,239,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Repeat className="w-4 h-4 text-purple-400" />
                    {!sidebarCollapsed && <span>Subscriptions</span>}
                  </button>

                  <button
                    onClick={() => setActiveNav('coupons')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                      activeNav === 'coupons' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'coupons'
                        ? ({ '--nav-a': '#fda4af', '--nav-bg': 'rgba(244,63,94,0.09)', '--nav-edge': 'rgba(244,63,94,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <Tag className="w-4 h-4 text-rose-400" />
                    {!sidebarCollapsed && <span>Discounts & Coupons</span>}
                  </button>
                </div>
              </div>

              {/* CUSTOMERS & SUPPORT */}
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-teal-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_currentColor]"></span>
                    Customers & Support
                  </div>
                )}
                <div className="space-y-0.5">
                  <button
                    onClick={() => setActiveNav('customers')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'customers' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'customers'
                        ? ({ '--nav-a': '#5eead4', '--nav-bg': 'rgba(20,184,166,0.09)', '--nav-edge': 'rgba(20,184,166,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-teal-400" />
                      {!sidebarCollapsed && <span>Customer Accounts</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                        {adminUsers.length}
                      </span>
                    )}
                  </button>

                  {canManageStaff && (
                  <button
                    onClick={() => setActiveNav('staff')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'staff' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'staff'
                        ? ({ '--nav-a': '#5eead4', '--nav-bg': 'rgba(20,184,166,0.09)', '--nav-edge': 'rgba(20,184,166,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Users2 className="w-4 h-4 text-teal-400" />
                      {!sidebarCollapsed && <span>Employee Staff Accounts</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px]">
                        {adminStaff.length}
                      </span>
                    )}
                  </button>
                  )}

                  <button
                    onClick={() => setActiveNav('support')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'support' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'support'
                        ? ({ '--nav-a': '#a5b4fc', '--nav-bg': 'rgba(99,102,241,0.09)', '--nav-edge': 'rgba(99,102,241,0.28)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      {!sidebarCollapsed && <span>Support Tickets</span>}
                    </div>
                    {!sidebarCollapsed && supportNewCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse"></span>
                        {supportNewCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveNav('messages')}
                    className={`w-full flex items-center justify-between px-3 py-2 ${
                      activeNav === 'messages' ? 'pa-nav-item--active' : 'pa-nav-item'
                    }`}
                    style={
                      activeNav === 'messages'
                        ? ({ '--nav-a': '#c4b5fd', '--nav-bg': 'rgba(139,92,246,0.10)', '--nav-edge': 'rgba(139,92,246,0.30)' } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <MessagesSquare className="w-4 h-4 text-violet-400" />
                      {!sidebarCollapsed && <span>Message Box & Live Chat</span>}
                    </div>
                    {!sidebarCollapsed && msgUnreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse"></span>
                        {msgUnreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* IPTV & SERVICES */}
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]"></span>
                    IPTV & Services
                  </div>
                )}
                <button
                  onClick={() => setActiveNav('iptv')}
                  className={`w-full flex items-center justify-between px-3 py-2 ${
                    activeNav === 'iptv' ? 'pa-nav-item--active' : 'pa-nav-item'
                  }`}
                  style={
                    activeNav === 'iptv'
                      ? ({ '--nav-a': '#6ee7b7', '--nav-bg': 'rgba(16,185,129,0.09)', '--nav-edge': 'rgba(16,185,129,0.28)' } as React.CSSProperties)
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Tv className="w-4 h-4 text-emerald-400" />
                    {!sidebarCollapsed && <span>IPTV & Streaming</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      {products.filter((p) => {
                        const hay = `${p.name} ${p.sku || ''}`.toLowerCase()
                        return hay.includes('iptv') || hay.includes('m3u')
                      }).length}
                    </span>
                  )}
                </button>
              </div>

              {/* MARKETING & INTEGRATIONS */}
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-orange-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_currentColor]"></span>
                    Marketing & Integrations
                  </div>
                )}
                <button
                  onClick={() => setActiveNav('campaigns')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                    activeNav === 'campaigns' ? 'pa-nav-item--active' : 'pa-nav-item'
                  }`}
                  style={
                    activeNav === 'campaigns'
                      ? ({ '--nav-a': '#fdba74', '--nav-bg': 'rgba(249,115,22,0.09)', '--nav-edge': 'rgba(249,115,22,0.28)' } as React.CSSProperties)
                      : undefined
                  }
                >
                  <Megaphone className="w-4 h-4 text-orange-400" />
                  {!sidebarCollapsed && <span>Marketing Campaigns</span>}
                </button>
              </div>

              {/* PLATFORM — Mobile App */}
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-fuchsia-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_currentColor]"></span>
                    Platform
                  </div>
                )}
                <button
                  onClick={() => setActiveNav('androidapp')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                    activeNav === 'androidapp' ? 'pa-nav-item--active' : 'pa-nav-item'
                  }`}
                  style={
                    activeNav === 'androidapp'
                      ? ({ '--nav-a': '#f0abfc', '--nav-bg': 'rgba(217,70,239,0.09)', '--nav-edge': 'rgba(217,70,239,0.28)' } as React.CSSProperties)
                      : undefined
                  }
                >
                  <Smartphone className="w-4 h-4 text-fuchsia-400" />
                  {!sidebarCollapsed && <span>Android App</span>}
                  {!sidebarCollapsed && appOnlineCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                      {appOnlineCount}
                    </span>
                  )}
                </button>
              </div>

              {/* ACCOUNT */}
              <div>
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-sky-300/90 px-3 mb-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_currentColor]"></span>
                    Account
                  </div>
                )}
                <button
                  onClick={() => openProfile('identity')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 ${
                    activeNav === 'profile' ? 'pa-nav-item--active' : 'pa-nav-item'
                  }`}
                  style={
                    activeNav === 'profile'
                      ? ({ '--nav-a': '#7dd3fc', '--nav-bg': 'rgba(56,189,248,0.09)', '--nav-edge': 'rgba(56,189,248,0.28)' } as React.CSSProperties)
                      : undefined
                  }
                  title="Profile Settings"
                >
                  <UserCog className="w-4 h-4 text-sky-400" />
                  {!sidebarCollapsed && <span>Profile Settings</span>}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Account Card + Reset Button */}
          <div className="p-3 border-t border-white/5 space-y-2">
            {/* Account Card — opens Profile Settings (enterprise style) */}
            <button
              onClick={() => openProfile('identity')}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl pa-well hover:border-amber-400/30 hover:shadow-[0_0_18px_-6px_rgba(245,184,0,0.35)] transition text-left ${
                activeNav === 'profile' ? 'border-amber-400/40' : ''
              }`}
              title="Open Profile Settings"
            >
              <AdminAvatar
                name={adminName}
                email={adminEmail}
                color={adminRole === 'staff' ? 'blue' : 'amber'}
                size={36}
                status="online"
                title="Open Profile Settings"
              />
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {adminName}
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_currentColor] pa-breath"></span>
                    <span className="truncate">
                      {adminRole === 'staff' ? 'Staff Plan · Online' : 'Pro Plan · Online'}
                    </span>
                  </div>
                </div>
              )}
              {!sidebarCollapsed && <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
            </button>

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
          <header className="pa-topbar sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between gap-4">
            {/* Search input (Ctrl+K) */}
            <div className="flex-1 max-w-md relative pa-search rounded-xl">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="admin-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, orders, customers..."
                className="w-full pl-9 pr-14 py-2 rounded-xl bg-[#0D1322]/90 border border-white/8 text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none transition font-sans"
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
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0D1322]/90 hover:bg-[#141b2e] border border-white/10 hover:border-sky-400/40 text-xs font-medium text-zinc-200 hover:text-white transition group hover:shadow-[0_0_18px_-6px_rgba(56,189,248,0.45)]"
              >
                <Store className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
                <span>Storefront</span>
              </button>

              {/* Quick Add Button */}
              <div className="relative">
                <button
                  id="admin-quick-add-btn"
                  onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
                  className="pa-btn-gold flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Quick Add</span>
                </button>

                {showQuickAddMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#121622] border border-white/10 p-1.5 shadow-2xl z-50 text-xs space-y-1 animate-in fade-in">
                    <button
                      onClick={() => {
                        setEditorProduct(null)
                        setShowProductEditor(true)
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
                className="pa-iconbtn p-2"
              >
                <Mail className="w-4 h-4" />
              </button>

              {/* Notification Bell — real pending order count */}
              <button
                onClick={() =>
                  triggerToast(
                    (adminHealth?.alerts?.pendingOrders || 0) > 0
                      ? `${adminHealth.alerts.pendingOrders} order(s) pending/processing — check the Customer Orders Log`
                      : 'No pending orders — all fulfillments are complete'
                  )
                }
                className="relative pa-iconbtn p-2"
              >
                <Bell className="w-4 h-4" />
                {(adminHealth?.alerts?.pendingOrders || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black font-bold text-[9px] flex items-center justify-center font-mono shadow-[0_0_10px_rgba(245,184,0,0.6)]">
                    {adminHealth.alerts.pendingOrders}
                  </span>
                )}
              </button>

              {/* Admin Profile Button + Dropdown (fully functional) */}
              <div className="relative flex items-center gap-2.5 pl-2 border-l border-white/5" ref={profileMenuRef}>
                <button
                  id="admin-profile-btn"
                  onClick={() => setShowProfileMenu((v) => !v)}
                  className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-white/5 transition focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  title="Admin profile menu"
                >
                  <AdminAvatar
                    name={adminName}
                    email={adminEmail}
                    color={adminRole === 'staff' ? 'blue' : 'amber'}
                    size={32}
                    still
                  />
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                      {adminName}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {adminRole === 'staff' ? 'Employee · Staff' : 'Administrator'}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                      showProfileMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#121622] border border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                    {/* Menu header — live identity */}
                    <div className="p-3.5 bg-[#0D1119] border-b border-white/5 flex items-center gap-3">
                      <AdminAvatar
                        name={adminName}
                        email={adminEmail}
                        color={adminRole === 'staff' ? 'blue' : 'amber'}
                        size={40}
                        status="online"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{adminName}</div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate">
                          {adminEmail || (adminRole === 'staff' ? 'Staff account' : 'Super administrator')}
                        </div>
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            adminRole === 'staff'
                              ? adminAuthority === 'admin'
                                ? 'bg-rose-500/20 text-rose-300'
                                : adminAuthority === 'manager'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                              : 'bg-amber-400/20 text-amber-300'
                          }`}
                        >
                          {adminRole === 'staff'
                            ? adminAuthority === 'admin'
                              ? 'ADMINISTRATOR AUTHORITY'
                              : adminAuthority === 'manager'
                              ? 'MANAGER AUTHORITY'
                              : 'SUPERVISOR AUTHORITY'
                            : 'SUPER ADMIN'}
                        </span>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5 text-xs">
                      <button
                        onClick={() => openProfile('identity')}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2.5 transition"
                      >
                        <UserCog className="w-4 h-4 text-amber-400" />
                        <span>Profile Settings</span>
                      </button>
                      <button
                        onClick={() => openProfile('security')}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2.5 transition"
                      >
                        <KeyRound className="w-4 h-4 text-emerald-400" />
                        <span>Change Password</span>
                      </button>
                      <button
                        onClick={() => openProfile('activity')}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2.5 transition"
                      >
                        <History className="w-4 h-4 text-cyan-400" />
                        <span>Recent Activity</span>
                      </button>

                      <div className="my-1 border-t border-white/5" />

                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          handleAdminSignOut()
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-500/10 text-zinc-300 hover:text-rose-300 flex items-center gap-2.5 transition"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
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
                  <div className="pa-card pa-card--blue pa-card--hover pa-rise p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 01 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--blue">01</span>
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
                        <span>Welcome back, {adminName}!</span>
                        <span>👋</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Here's what's happening with your business today.
                      </p>
                    </div>

                    {/* Total Revenue Box */}
                    <div className="p-3.5 rounded-xl pa-well pa-well-hi space-y-2">
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
                      <div className="p-2 rounded-lg pa-well border-l-2 border-l-blue-500/70">
                        <div className="text-[9px] text-zinc-400 font-mono">Total Orders</div>
                        <div className="text-sm font-black text-white font-mono">
                          {adminStats?.totalOrders ?? '—'}
                        </div>
                        <div className="text-[9px] text-emerald-400 font-mono flex items-center justify-center gap-0.5">
                          <ArrowUpRight className="w-2.5 h-2.5" /> {adminStats?.recentOrders || 0} (7d)
                        </div>
                      </div>

                      <div className="p-2 rounded-lg pa-well border-l-2 border-l-purple-500/70">
                        <div className="text-[9px] text-zinc-400 font-mono">Total Products</div>
                        <div className="text-sm font-black text-white font-mono">
                          {adminStats?.totalProducts ?? '—'}
                        </div>
                        <div className="text-[9px] text-purple-400 font-mono">↑ {adminStats?.activeProducts ?? 0} published</div>
                      </div>

                      <div className="p-2 rounded-lg pa-well border-l-2 border-l-amber-500/70">
                        <div className="text-[9px] text-zinc-400 font-mono">Low Stock Alerts</div>
                        <div className={`text-sm font-black font-mono ${(adminStats?.lowStock || 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
                          {adminStats?.lowStock ?? '—'}
                        </div>
                        <div className="text-[9px] text-amber-400 font-mono">Needs attention</div>
                      </div>
                    </div>

                    {/* Live 14-Day Performance Box */}
                    <div className="p-3.5 rounded-xl pa-well space-y-2">
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
                  <div className="pa-card pa-card--gold pa-card--hover pa-rise pa-rise-2 p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 02 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--gold">02</span>
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
                        <div className="relative">
                          <button
                            onClick={() => setRevRangeOpen(!revRangeOpen)}
                            className="text-[10px] font-mono text-zinc-300 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-amber-400/40 flex items-center gap-1 transition"
                          >
                            {chartLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                            {revRangeDays} Days ▾
                          </button>
                          {revRangeOpen && (
                            <div className="absolute right-0 mt-1 w-28 rounded-xl pa-well p-1 z-30 animate-in fade-in zoom-in-95">
                              {[14, 30].map((d) => (
                                <button
                                  key={d}
                                  onClick={() => {
                                    setRevRangeDays(d as 14 | 30)
                                    setRevRangeOpen(false)
                                    fetchAdminRevenueChart(d)
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition ${
                                    revRangeDays === d ? 'bg-amber-400/20 text-amber-300' : 'text-zinc-300 hover:bg-white/5'
                                  }`}
                                >
                                  Last {d} Days
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white font-mono">
                          {adminRevenueChart ? `Rs ${Number(adminRevenueChart.totalRevenue || 0).toLocaleString()}` : '—'}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" /> {adminRevenueChart?.totalOrders || 0} orders ({revRangeDays}d)
                        </span>
                      </div>
                    </div>

                    {/* Interactive Line Chart with hover tooltip — live from /api/admin/revenue-chart */}
                    <div className="p-3.5 rounded-xl pa-well space-y-2 relative">
                      <div className="h-32 w-full pt-5 relative">
                        {adminRevenueChart?.series?.length ? (
                          (() => {
                            const series = adminRevenueChart.series
                            const W = 240
                            const H = 90
                            const max = Math.max(...series.map((s: any) => s.revenue), 1)
                            const points = series.map((s: any, i: number) => {
                              const x = (i / (series.length - 1)) * W
                              const y = H - 14 - (s.revenue / max) * (H - 26)
                              return { cx: x, cy: y, revenue: s.revenue, date: s.date, orders: s.orders }
                            })
                            const linePath = points
                              .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`)
                              .join(' ')
                            const areaPath = linePath ? `${linePath} L${W},${H} L0,${H} Z` : ''
                            const bestIdx = points.reduce(
                              (best: number, p: any, i: number) => (p.revenue > points[best].revenue ? i : best),
                              0
                            )
                            const hovered = revHoverIdx != null ? points[revHoverIdx] : null
                            return (
                              <>
                                <svg
                                  className="w-full h-full overflow-visible"
                                  viewBox={`0 0 ${W} ${H}`}
                                  preserveAspectRatio="none"
                                  onMouseLeave={() => setRevHoverIdx(null)}
                                >
                                  <defs>
                                    <linearGradient id="goldGradient02" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.42" />
                                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                                    </linearGradient>
                                    <filter id="goldGlow02" x="-40%" y="-40%" width="180%" height="180%">
                                      <feGaussianBlur stdDeviation="2.2" result="b" />
                                      <feMerge>
                                        <feMergeNode in="b" />
                                        <feMergeNode in="SourceGraphic" />
                                      </feMerge>
                                    </filter>
                                  </defs>

                                  {/* Grid Lines */}
                                  <line x1="0" y1="20" x2={W} y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />
                                  <line x1="0" y1="48" x2={W} y2="48" stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />
                                  <line x1="0" y1={H - 14} x2={W} y2={H - 14} stroke="rgba(255,255,255,0.08)" />

                                  {/* Hover guide line */}
                                  {hovered && (
                                    <line
                                      x1={hovered.cx}
                                      y1="4"
                                      x2={hovered.cx}
                                      y2={H - 14}
                                      stroke="rgba(251,191,36,0.35)"
                                      strokeWidth="1"
                                      strokeDasharray="3 3"
                                    />
                                  )}

                                  {/* Area Fill */}
                                  {areaPath && <path d={areaPath} fill="url(#goldGradient02)" />}
                                  {/* Gold Trend Line with glow */}
                                  {linePath && (
                                    <path d={linePath} fill="none" stroke="#fbbf24" strokeWidth="2.4" filter="url(#goldGlow02)" className="pa-draw" />
                                  )}

                                  {/* Best day pulse ring */}
                                  {points[bestIdx]?.revenue > 0 && (
                                    <circle
                                      cx={points[bestIdx].cx}
                                      cy={points[bestIdx].cy}
                                      r="6.5"
                                      fill="none"
                                      stroke="#fbbf24"
                                      strokeWidth="1"
                                      opacity="0.5"
                                      className="pa-breath"
                                      style={{ color: '#fbbf24' }}
                                    />
                                  )}

                                  {/* Data points */}
                                  {points.map((p: any, i: number) => (
                                    <circle
                                      key={i}
                                      cx={p.cx}
                                      cy={p.cy}
                                      r={
                                        i === revHoverIdx ? 4.2 :
                                        i === bestIdx && p.revenue > 0 ? 3.6 :
                                        p.revenue > 0 ? 2.4 : 1.8
                                      }
                                      fill={
                                        i === revHoverIdx ? '#fde68a' :
                                        p.revenue > 0 ? '#fbbf24' : '#374151'
                                      }
                                      stroke={i === revHoverIdx || (i === bestIdx && p.revenue > 0) ? '#fffbeb' : 'none'}
                                      strokeWidth={i === revHoverIdx ? 1.2 : 0.8}
                                      style={{ cursor: 'pointer' }}
                                      onMouseEnter={() => setRevHoverIdx(i)}
                                    />
                                    ))}
                                  {/* Fat invisible hit areas for easy hovering */}
                                  {points.map((p: any, i: number) => (
                                    <rect
                                      key={`h-${i}`}
                                      x={p.cx - W / series.length / 2}
                                      y="0"
                                      width={W / series.length}
                                      height={H}
                                      fill="transparent"
                                      onMouseEnter={() => setRevHoverIdx(i)}
                                      style={{ cursor: 'crosshair' }}
                                    />
                                  ))}
                                </svg>

                                {/* Floating tooltip */}
                                {hovered && (
                                  <div
                                    className="absolute z-20 pointer-events-none -translate-x-1/2 px-2.5 py-1.5 rounded-lg pa-well border-amber-400/40 min-w-[92px]"
                                    style={{
                                      left: `${(hovered.cx / W) * 100}%`,
                                      top: `${Math.max(0, (hovered.cy / H) * 100 - 62)}%`,
                                      boxShadow: '0 10px 24px -8px rgba(0,0,0,0.9), 0 0 18px -6px rgba(245,184,0,0.4)',
                                    }}
                                  >
                                    <div className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
                                      {new Date(hovered.date).toLocaleDateString('en', { month: 'short', day: '2-digit' })}
                                    </div>
                                    <div className="text-[11px] font-mono font-black text-amber-300 whitespace-nowrap">
                                      Rs {Number(hovered.revenue).toLocaleString()}
                                    </div>
                                    <div className="text-[8px] font-mono text-zinc-500 whitespace-nowrap">
                                      {hovered.orders} order{hovered.orders === 1 ? '' : 's'}
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          })()
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] text-zinc-600">
                            {chartLoading ? 'Loading chart…' : 'No revenue data'}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                        {adminRevenueChart?.series ? (
                          adminRevenueChart.series
                            .filter((_: any, i: number) =>
                              i % Math.ceil(adminRevenueChart.series.length / (revRangeDays === 30 ? 6 : 8)) === 0 || i === adminRevenueChart.series.length - 1
                            )
                            .map((s: any) => {
                              const date = new Date(s.date)
                              const label = date.toLocaleDateString('en', { month: 'short', day: '2-digit' })
                              const isBest = adminRevenueChart.bestDay?.date === s.date
                              return (
                                <span key={s.date} className={isBest ? 'text-amber-400 font-bold' : ''}>
                                  {label}
                                </span>
                              )
                            })
                        ) : (
                          <span>Loading…</span>
                        )}
                      </div>

                      {/* 3 mini stats */}
                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-[9px] font-mono">
                        <div>
                          <div className="text-zinc-500">Average Daily Revenue</div>
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

                    {/* Revenue Insights Callout Footer */}
                    <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-400 text-black flex items-center justify-center shrink-0">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-300">Revenue Insights</div>
                        <p className="text-[10px] text-zinc-300 leading-snug">
                          {adminRevenueChart && adminRevenueChart.totalRevenue > 0 ? (
                            <>You earned <strong className="text-emerald-400">Rs {Number(adminRevenueChart.totalRevenue).toLocaleString()}</strong> in the last {revRangeDays} days from <strong className="text-amber-400">{adminRevenueChart.totalOrders}</strong> orders. Keep it up!</>
                          ) : (
                            <>No revenue recorded in the last {revRangeDays} days. Place a test order from the storefront to see live data here.</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 03: ORDER & TRAFFIC INSIGHTS */}
                  {/* ========================================================================= */}
                  <div className="pa-card pa-card--purple pa-card--hover pa-rise pa-rise-3 p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 03 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--purple">03</span>
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

                    {/* Order Breakdown Donut Chart — real data from /api/admin/stats + system-health */}
                    <div className="p-3 rounded-xl pa-well space-y-2">
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
                              strokeDashoffset={
                                (() => {
                                  const total = adminStats?.totalOrders || 0
                                  const pending = adminHealth?.alerts?.pendingOrders || 0
                                  const completed = Math.max(0, total - pending)
                                  return total > 0 ? 226.19 * (pending / total) : 226.19
                                })()
                              }
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-lg font-black text-white font-mono leading-none">
                              {adminStats?.totalOrders ?? '—'}
                            </span>
                            <span className="text-[8px] font-mono text-zinc-400 uppercase">TOTAL</span>
                          </div>
                        </div>

                        {/* Legend — real counts */}
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>
                              {Math.max(0, (adminStats?.totalOrders || 0) - (adminHealth?.alerts?.pendingOrders || 0))} Completed
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span>{adminHealth?.alerts?.pendingOrders || 0} Pending / Processing</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Traffic Sources Progress Bars — REAL data from /api/analytics/summary */}
                    <div className="p-3 rounded-xl pa-well space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Traffic Sources</span>
                        <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/5">
                          {analyticsLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin inline mr-1" />}
                          Last 14 Days
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[10px] font-mono">
                        {(adminAnalytics?.referrers || []).length === 0 ? (
                          <div className="py-3 text-center text-zinc-500">
                            No traffic recorded yet — visitors will appear here automatically.
                          </div>
                        ) : (
                          (() => {
                            const totalRefs = (adminAnalytics?.referrers || []).reduce((a: number, r: any) => a + r.count, 0) || 1
                            const palette = ['bg-blue-500', 'bg-purple-500', 'bg-cyan-400', 'bg-amber-400', 'bg-emerald-400', 'bg-rose-400']
                            return (adminAnalytics?.referrers || []).slice(0, 4).map((r: any, i: number) => {
                              const pct = Math.round((r.count / totalRefs) * 100)
                              return (
                                <div key={i}>
                                  <div className="flex justify-between text-zinc-300 mb-0.5">
                                    <span className="truncate max-w-[140px]">{r.source === '(direct)' ? 'Direct / URL' : r.source}</span>
                                    <strong className="text-white">{pct}% ({r.count})</strong>
                                  </div>
                                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <div className={`${palette[i % palette.length]} h-full rounded-full`} style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              )
                            })
                          })()
                        )}
                      </div>

                      <button
                        onClick={() => setActiveNav('analytics')}
                        className="w-full py-1.5 mt-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <span>View Full Analytics</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Footer Box — real order count */}
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        {adminStats?.totalOrders
                          ? `${adminStats.totalOrders} order${adminStats.totalOrders === 1 ? '' : 's'} in your history · ${adminHealth?.alerts?.pendingOrders || 0} awaiting action.`
                          : 'No orders yet — share your storefront to start selling!'}
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 04: TOP SELLING PRODUCTS */}
                  {/* ========================================================================= */}
                  <div className="pa-card pa-card--rose pa-card--hover pa-rise pa-rise-4 p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 04 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--rose">04</span>
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
                              className="p-2.5 rounded-xl pa-well flex items-center justify-between gap-2.5"
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
                  <div className="pa-card pa-card--emerald pa-card--hover pa-rise pa-rise-1 p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 05 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--emerald">05</span>
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
                              className="p-2.5 rounded-xl pa-well flex items-center justify-between"
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

                    {/* Footer Tip — neon cart band */}
                    <div className="pa-neon-stage p-3 flex items-center gap-2">
                      <NeonCart className="w-20 h-12 shrink-0 pa-neon-flicker" />
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        Monitor recent orders and ensure fast order processing.
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 06: SYSTEM HEALTH */}
                  {/* ========================================================================= */}
                  <div className="pa-card pa-card--teal pa-card--hover pa-rise pa-rise-2 p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 06 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--teal">06</span>
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

                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>System Status</span>
                      {healthLoading && <RefreshCw className="w-3 h-3 text-teal-400 animate-spin" />}
                    </div>

                    {/* Circular Gauge + real health from /api/admin/system-health */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl pa-well">
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
                            stroke={
                              adminHealth?.database?.latencyMs != null
                                ? adminHealth.database.latencyMs < 300
                                  ? '#10b981'
                                  : '#f59e0b'
                                : '#10b981'
                            }
                            strokeWidth="8"
                            strokeDasharray="226.19"
                            strokeDashoffset={
                              adminHealth?.database?.connected === false ? '90' : '0'
                            }
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-base font-black text-white font-mono leading-none">
                            {adminHealth?.database?.latencyMs != null
                              ? `${Math.min(999, adminHealth.database.latencyMs)}ms`
                              : '—'}
                          </span>
                          <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase mt-0.5">
                            DB Ping
                          </span>
                          {/* Heartbeat pulse */}
                          <div className="w-8 h-2 mt-1">
                            <svg className="w-full h-full" viewBox="0 0 40 10">
                              <path d="M0,5 L15,5 L18,1 L22,9 L25,5 L40,5" fill="none" stroke="#10b981" strokeWidth="1.5" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Status Checklist — real counts */}
                      <div className="space-y-1.5 text-[11px] font-mono flex-1">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Database
                          </span>
                          <span className="text-emerald-400 text-[10px]">
                            {adminHealth?.database?.connected === false ? 'Down' : 'Operational'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Products
                          </span>
                          <span className="text-emerald-400 text-[10px]">{adminHealth?.collections?.products ?? '—'}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Pending Orders
                          </span>
                          <span className={`text-[10px] ${(adminHealth?.alerts?.pendingOrders || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {adminHealth?.alerts?.pendingOrders ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Restore Points
                          </span>
                          <span className="text-emerald-400 text-[10px]">{adminHealth?.collections?.backups ?? '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Tip — neon shield band, real status */}
                    <div className="pa-neon-stage p-3 flex items-center gap-2">
                      <NeonShield className="w-20 h-12 shrink-0 pa-neon-flicker" />
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        {adminHealth?.database?.connected === false
                          ? 'Database unreachable — check the connection immediately.'
                          : `All systems operational. Last checked ${adminHealth?.checkedAt ? new Date(adminHealth.checkedAt).toLocaleTimeString() : '—'}.`}
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 07: QUICK ACTIONS & SHORTCUTS */}
                  {/* ========================================================================= */}
                  <div className="pa-card pa-card--amber pa-card--hover pa-rise pa-rise-3 p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 07 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--amber">07</span>
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
                        className="py-2 px-3 rounded-xl pa-well !bg-transparent hover:bg-white/5 border border-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <span>Quick Actions</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      <div className="relative p-2 rounded-xl pa-well text-zinc-300">
                        <Bell className="w-3.5 h-3.5" />
                        {(adminHealth?.alerts?.pendingOrders || 0) > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black font-mono font-black text-[9px] flex items-center justify-center">
                            {adminHealth.alerts.pendingOrders}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 6 Action Shortcut Buttons (2 Columns x 3 Rows) */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Add Product */}
                      <button
                        onClick={() => { setEditorProduct(null); setShowProductEditor(true) }}
                        className="p-2.5 rounded-xl pa-well !bg-transparent hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 flex items-center gap-2 transition text-left group"
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
                        onClick={() => { setActiveNav('orders-log'); triggerToast('Switched to Customer Orders Log — live data from MongoDB') }}
                        className="p-2.5 rounded-xl pa-well !bg-transparent hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">Orders Log</div>
                          <div className="text-[9px] text-zinc-400">Live order history</div>
                        </div>
                      </button>

                      {/* View Reports */}
                      <button
                        onClick={() => setActiveNav('analytics')}
                        className="p-2.5 rounded-xl pa-well !bg-transparent hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 flex items-center gap-2 transition text-left group"
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
                        onClick={() => setActiveNav('staff')}
                        className="p-2.5 rounded-xl pa-well !bg-transparent hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 flex items-center gap-2 transition text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                          <Users2 className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">Staff Accounts</div>
                          <div className="text-[9px] text-zinc-400">Create employee logins</div>
                        </div>
                      </button>

                      {/* Discounts */}
                      <button
                        onClick={() => setActiveNav('coupons')}
                        className="p-2.5 rounded-xl pa-well !bg-transparent hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/30 flex items-center gap-2 transition text-left group"
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
                        className="p-2.5 rounded-xl pa-well !bg-transparent hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 flex items-center gap-2 transition text-left group"
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

                    {/* Footer Tip — neon bolt band */}
                    <div className="pa-neon-stage p-3 flex items-center gap-2">
                      <NeonBolt className="w-20 h-12 shrink-0 pa-neon-flicker" />
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        Save time with quick access to your most used features.
                      </p>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* CARD 08: SMART ADMIN EXPERIENCE */}
                  {/* ========================================================================= */}
                  <div className="pa-card pa-card--sky pa-card--hover pa-rise pa-rise-4 p-5 space-y-4 flex flex-col justify-between">
                    {/* Header Bar with 08 Badge */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="pa-chip pa-chip--sky">08</span>
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

                    {/* Neon Cybernetic Illustration Stage — matches enterprise reference */}
                    <div className="pa-neon-stage flex items-center justify-center h-28">
                      <div className="absolute -top-10 -right-10 w-28 h-28 bg-sky-500/15 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="absolute -bottom-12 -left-8 w-24 h-24 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none"></div>
                      <NeonBrain className="w-40 h-24 pa-neon-flicker" />
                      <div className="absolute bottom-2 right-3 text-[8px] font-mono text-sky-300/60 tracking-widest uppercase">
                        Neural Engine · Online
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

                    {/* Footer Tip — neon brain band */}
                    <div className="pa-neon-stage p-3 flex items-center gap-2">
                      <NeonBrain className="w-20 h-12 shrink-0 pa-neon-flicker" />
                      <p className="text-[10px] text-zinc-300 leading-snug">
                        Designed for productivity, built for growth.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Full-Width Footer Banner matching Screenshot 1 */}
                <div className="pa-card pa-card--gold p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                      className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition hover:shadow-[0_0_18px_-6px_rgba(16,185,129,0.5)]"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV / DB Importer</span>
                    </button>

                    <button
                      onClick={() => triggerToast('PlayBeat Admin Console v5.0 Enterprise Active')}
                      className="pa-btn-gold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
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
                <ViewHeader
                  icon={<Package className="w-5 h-5" />}
                  tone="gold"
                  title="Catalog Products"
                  desc={`${products.length} products synced with live MongoDB — edit pricing, stock, images and variants.`}
                />
                <div className="p-4 rounded-2xl pa-card pa-card--slate flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      <option value="Streaming">Streaming</option>
                      <option value="Subscriptions">Subscriptions</option>
                      <option value="Gift Cards">Gift Cards</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Software">Software</option>
                      <option value="Smart Projectors">Smart Projectors</option>
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
                        onClick={() => { setEditorProduct(null); setShowProductEditor(true) }}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Product</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="pa-tablewrap">
                  <div className="overflow-x-auto">
                    <table className="pa-table w-full text-left text-xs">
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
                                    <div className="font-semibold text-white line-clamp-1 flex items-center gap-1.5">
                                      {p.name}
                                      {p.variants && p.variants.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                          {p.variants.length} {p.variantLabel || 'variant'}{p.variants.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                      {p.consolidatedParentId && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30 shrink-0">
                                          variant child
                                        </span>
                                      )}
                                      {p.active === false && !p.consolidatedParentId && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shrink-0">
                                          hidden
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono text-zinc-400">
                                      {p.sku}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${adminCategoryChip(p.category)}`}>
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
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => onQuickViewProduct(p)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                                    title="Quick View Preview"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditorProduct(p)
                                      setShowProductEditor(true)
                                    }}
                                    className="p-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/25"
                                    title="Edit product & images"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEditorDelete(p._id || p.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25"
                                    title="Delete product permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

            {/* ========================================================================= */}
            {/* PANEL: MEDIA & IMAGE MANAGER */}
            {/* ========================================================================= */}
            {activeNav === 'media' && (
              <MediaLibraryPanel
                products={products}
                onSaveProduct={handleEditorSave}
                triggerToast={triggerToast}
              />
            )}

            {/* VIEW 3: DIGITAL LICENSE VAULT */}
            {activeNav === 'vault' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left: Generator */}
                  <div className="lg:col-span-5 rounded-2xl pa-card pa-card--gold p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="pa-viewchip pa-chip--gold">
                        <Key className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-white">License Key Dispenser</h3>
                        <p className="text-xs text-zinc-400 font-mono">
                          Generate and inject verified digital licenses into the live order fulfillment engine.
                        </p>
                      </div>
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

                  {/* Right: Active Pools — REAL digital stock from the live catalog */}
                  <div className="lg:col-span-7 rounded-2xl pa-card pa-card--emerald p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="pa-viewchip pa-chip--emerald">
                          <ShieldCheck className="w-5 h-5" />
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-white">Live Cryptographic Key Pools</h3>
                          <p className="text-xs text-zinc-400 font-mono">
                            Real digital-inventory stock levels from the live MongoDB catalog
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono pa-breath" style={{ color: '#34d399' }}>
                        Vault: Active
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {(() => {
                        const digitalPools = products
                          .filter((p) => p.digital && p.active !== false)
                          .sort((a, b) => b.stock - a.stock)
                          .slice(0, 8)
                        const totalKeys = products
                          .filter((p) => p.digital)
                          .reduce((acc, p) => acc + (p.stock || 0), 0)
                        if (digitalPools.length === 0) {
                          return (
                            <div className="p-4 text-center text-[11px] text-zinc-500">
                              No digital products in the catalog yet.
                            </div>
                          )
                        }
                        return (
                          <>
                            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">Total ready-to-dispatch</span>
                              <span className="text-sm font-black text-white font-mono">{totalKeys.toLocaleString()} keys</span>
                            </div>
                            {digitalPools.map((p) => (
                              <div
                                key={p.id}
                                className="p-3 rounded-xl pa-well flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                                  <span className="font-medium text-white truncate">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-3 font-mono shrink-0">
                                  <span className="text-amber-400 font-bold">{p.stock} in pool</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] border ${
                                    p.stock > 5
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {p.stock > 5 ? 'Healthy' : 'Low Stock'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: ORDERS & FULFILLMENT */}
            {activeNav === 'orders-log' && <OrdersLogPanel onToast={triggerToast} />}

            {/* VIEW: ADMIN PROFILE SETTINGS (identity / security / preferences / activity) */}
            {activeNav === 'profile' && (
              <ProfileSettingsPanel
                onToast={triggerToast}
                adminRole={adminRole}
                adminName={adminName}
                adminEmail={adminEmail}
                onProfileUpdated={(newName) => setAdminName(newName)}
                onSignOut={onSignOut || onBackToStorefront}
                focusSection={profileFocus}
              />
            )}

            {/* LEGACY orders route — same live panel */}
            {activeNav === 'orders' && <OrdersLogPanel onToast={triggerToast} />}

            {/* ========================================================================= */}
            {/* PANEL: ANDROID APP — download, install guide, release + device control */}
            {/* ========================================================================= */}
            {activeNav === 'androidapp' && (
              <AndroidAppPanel isSuperAdmin={adminRole === 'admin'} onToast={triggerToast} />
            )}

            {/* ========================================================================= */}
            {/* PANEL: DOCUMENTS & FILES — secure vault for PDF/Word/Excel/APK/ZIP        */}
            {/* ========================================================================= */}
            {activeNav === 'documents' && <DocumentsPanel onToast={triggerToast} />}

            {/* ========================================================================= */}
            {/* PANEL: WEBSITE BUILDER CMS — real editor backed by site_settings */}
            {/* ========================================================================= */}
            {activeNav === 'cms' && (
              <div className="space-y-5">
                <CmsPanel
                  settings={cmsSettings}
                  loading={cmsLoading}
                  isSuperAdmin={adminRole === 'admin'}
                  onToast={triggerToast}
                  onChanged={() => {
                    fetchCmsSettings()
                    fetchAdminHealth()
                  }}
                />

                {/* Published page quick links */}
                <div className="rounded-2xl pa-card pa-card--emerald pa-card--hover p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Published Pages</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { name: 'Storefront', slug: '/storefront' },
                      { name: 'Privacy Policy', slug: '/privacy' },
                      { name: 'Terms of Service', slug: '/terms' },
                      { name: 'Refund Policy', slug: '/refund-policy' },
                      { name: 'Shipping Policy', slug: '/shipping-policy' },
                      { name: 'Contact Page', slug: '/contact' },
                    ].map((page) => (
                      <div key={page.slug} className="rounded-xl bg-[#07090E] border border-white/5 p-3.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{page.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500 truncate">{page.slug}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                            Live
                          </span>
                          <a
                            href={page.slug}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: ANALYTICS & TRAFFIC */}
            {/* ========================================================================= */}
            {activeNav === 'analytics' && (
              <div className="space-y-6">
                {/* Sales KPIs — live from /api/admin/stats */}
                {adminStats && (
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
                )}

                {/* Real traffic analytics — recorded by the storefront via /api/analytics */}
                <AnalyticsPanel
                  analytics={adminAnalytics}
                  loading={analyticsLoading}
                  onRefresh={() => fetchAdminAnalytics()}
                />
              </div>
            )}

            {/* ========================================================================= */}
            {/* PANEL: SYSTEM HEALTH */}
            {/* ========================================================================= */}
            {activeNav === 'health' && (
              <SystemHealthPanel
                health={adminHealth}
                loading={healthLoading}
                onRefresh={() => fetchAdminHealth()}
              />
            )}

            {/* ========================================================================= */}
            {/* PANEL: EMPLOYEE STAFF ACCOUNTS (super admin) */}
            {/* ========================================================================= */}
            {activeNav === 'staff' && (
              <StaffAccountsPanel
                staff={adminStaff}
                users={adminUsers}
                loading={staffLoading}
                isSuperAdmin={adminRole === 'admin' || adminAuthority === 'admin'}
                onToast={triggerToast}
                onChanged={() => {
                  fetchAdminStaff()
                  fetchAdminUsers()
                  fetchAdminHealth()
                }}
              />
            )}

            {/* ========================================================================= */}
            {/* PANEL: DATABASE RESTORE POINTS */}
            {/* ========================================================================= */}
            {activeNav === 'backup' && (
              <BackupPanel
                backups={adminBackups}
                loading={backupsLoading}
                isSuperAdmin={adminRole === 'admin'}
                onToast={triggerToast}
                onChanged={() => {
                  fetchAdminBackups()
                  fetchAdminHealth()
                }}
              />
            )}

            {/* ========================================================================= */}
            {/* PANEL: SUBSCRIPTIONS */}
            {/* ========================================================================= */}
            {activeNav === 'subscriptions' && (
              <div className="space-y-5">
                <ViewHeader
                  icon={<Repeat className="w-5 h-5" />}
                  tone="fuchsia"
                  title="Subscription Plans"
                  desc="Live subscription products from the catalog — plans, pricing and stock."
                  actions={
                    <button
                      onClick={() => { setEditorProduct(null); setShowProductEditor(true) }}
                      className="pa-btn-gold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> New Plan
                    </button>
                  }
                />

                {(() => {
                  const subs = products.filter((p) => p.category === 'Subscriptions' && p.active !== false)
                  const totalOptions = subs.reduce((a, p) => a + (p.variants?.length || 0), 0)
                  const totalKeys = subs.reduce((a, p) => a + (p.stock || 0), 0)
                  const avgPrice = subs.length ? Math.round(subs.reduce((a, p) => a + p.price, 0) / subs.length) : 0
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KpiTile label="Live Plans" value={subs.length || '—'} rail="#e879f9" tint="rgba(232,121,249,0.1)" edge="rgba(232,121,249,0.22)" glow="rgba(232,121,249,0.3)" icon={<Repeat className="w-4 h-4 text-fuchsia-400" />} sub={<span className="text-fuchsia-300">subscription products</span>} />
                      <KpiTile label="Plan Options" value={totalOptions || '—'} rail="#c084fc" tint="rgba(192,132,252,0.1)" edge="rgba(192,132,252,0.22)" glow="rgba(192,132,252,0.3)" icon={<Boxes className="w-4 h-4 text-purple-400" />} sub={<span className="text-zinc-400">variant dropdowns</span>} />
                      <KpiTile label="Ready Keys" value={totalKeys.toLocaleString()} rail="#34d399" tint="rgba(52,211,153,0.1)" edge="rgba(52,211,153,0.22)" glow="rgba(52,211,153,0.3)" icon={<Key className="w-4 h-4 text-emerald-400" />} sub={<span className="text-emerald-400">in stock now</span>} />
                      <KpiTile label="Avg Price" value={avgPrice ? `Rs ${avgPrice.toLocaleString()}` : '—'} rail="#fbbf24" tint="rgba(251,191,36,0.1)" edge="rgba(251,191,36,0.22)" glow="rgba(251,191,36,0.3)" icon={<DollarSign className="w-4 h-4 text-amber-400" />} sub={<span className="text-zinc-400">across all plans</span>} />
                    </div>
                  )
                })()}

                <div className="pa-tablewrap">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Live Subscription Catalog</h3>
                    <span className="text-[10px] font-mono text-zinc-500">Straight from MongoDB · sorted by price</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="pa-table w-full text-xs">
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Options</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const subs = products
                            .filter((p) => p.category === 'Subscriptions' && p.active !== false)
                            .sort((a, b) => b.price - a.price)
                          if (subs.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                                  No subscription products in the catalog yet.
                                </td>
                              </tr>
                            )
                          }
                          return subs.map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.02]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-zinc-900 shrink-0" />
                                  <span className="font-semibold text-white line-clamp-1">{p.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {p.variants && p.variants.length > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                                    {p.variants.length} {p.variantLabel || 'option'}{p.variants.length > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-zinc-500 text-[10px] font-mono">single</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-amber-400 font-bold">{formatPrice(p.price, selectedCurrency)}</td>
                              <td className="px-4 py-3 font-mono text-zinc-300">{p.stock} units</td>
                              <td className="px-4 py-3 text-[11px] font-mono">
                                {p.digital ? <span className="text-emerald-400">Digital</span> : <span className="text-cyan-400">Physical</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                  Live
                                </span>
                              </td>
                            </tr>
                          ))
                        })()}
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
                <ViewHeader
                  icon={<Tag className="w-5 h-5" />}
                  tone="rose"
                  title="Discounts & Deals"
                  desc="Real product discounts live on the storefront — managed per product in the catalog."
                  actions={
                    <button
                      onClick={() => setActiveNav('products')}
                      className="pa-btn-gold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Pricing
                    </button>
                  }
                />

                {(() => {
                  const deals = products.filter((p) => (p.discountPercent || 0) > 0 && p.active !== false)
                  const biggest = deals.reduce((m, p) => Math.max(m, p.discountPercent || 0), 0)
                  const avg = deals.length ? Math.round(deals.reduce((a, p) => a + (p.discountPercent || 0), 0) / deals.length) : 0
                  const savings = deals.reduce((a, p) => a + Math.max(0, (p.originalPrice || p.price) - p.price), 0)
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KpiTile label="Deals Live" value={deals.length || '—'} rail="#fb7185" tint="rgba(251,113,133,0.1)" edge="rgba(251,113,133,0.22)" glow="rgba(251,113,133,0.3)" icon={<Tag className="w-4 h-4 text-rose-400" />} sub={<span className="text-rose-300">discounted products</span>} />
                      <KpiTile label="Biggest Discount" value={biggest ? `${biggest}%` : '—'} rail="#f87171" tint="rgba(248,113,113,0.1)" edge="rgba(248,113,113,0.22)" glow="rgba(248,113,113,0.3)" icon={<TrendingUp className="w-4 h-4 text-red-400" />} sub={<span className="text-zinc-400">max saving offered</span>} />
                      <KpiTile label="Avg Discount" value={avg ? `${avg}%` : '—'} rail="#fbbf24" tint="rgba(251,191,36,0.1)" edge="rgba(251,191,36,0.22)" glow="rgba(251,191,36,0.3)" icon={<Percent className="w-4 h-4 text-amber-400" />} sub={<span className="text-zinc-400">across all deals</span>} />
                      <KpiTile label="Bundle Savings" value={savings ? `Rs ${savings.toLocaleString()}` : '—'} rail="#34d399" tint="rgba(52,211,153,0.1)" edge="rgba(52,211,153,0.22)" glow="rgba(52,211,153,0.3)" icon={<DollarSign className="w-4 h-4 text-emerald-400" />} sub={<span className="text-emerald-400">vs original prices</span>} />
                    </div>
                  )
                })()}

                <div className="pa-tablewrap">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Live Storefront Deals</h3>
                    <span className="text-[10px] font-mono text-zinc-500">Products with an active discount · sorted by discount</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="pa-table w-full text-xs">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Discount</th>
                          <th>Now</th>
                          <th>Was</th>
                          <th>You Save</th>
                          <th>Category</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const deals = products
                            .filter((p) => (p.discountPercent || 0) > 0 && p.active !== false)
                            .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
                          if (deals.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                                  No discounted products yet — set a discountPercent in the product editor to create a deal.
                                </td>
                              </tr>
                            )
                          }
                          return deals.slice(0, 25).map((p) => {
                            const was = p.originalPrice || Math.round(p.price * (100 + (p.discountPercent || 0)) / 100)
                            return (
                              <tr key={p.id} className="hover:bg-white/[0.02]">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-zinc-900 shrink-0" />
                                    <span className="font-semibold text-white line-clamp-1 max-w-[240px]">{p.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    -{p.discountPercent}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono text-amber-400 font-bold">{formatPrice(p.price, selectedCurrency)}</td>
                                <td className="px-4 py-3 font-mono text-zinc-500 line-through">{formatPrice(was, selectedCurrency)}</td>
                                <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">
                                  {formatPrice(was - p.price, selectedCurrency)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${adminCategoryChip(p.category)}`}>
                                    {p.category}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                    Live
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        })()}
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
                <ViewHeader
                  icon={<Users className="w-5 h-5" />}
                  tone="teal"
                  title="Customer Accounts"
                  desc="All registered users. Promote normal users to staff with a unique Staff ID."
                  actions={
                    <button
                      onClick={() => { fetchAdminUsers(); fetchAdminStaff() }}
                      className="pa-iconbtn px-3.5 py-2 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  }
                />

                {/* Staff Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl pa-card pa-card--slate p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Total Users</div>
                    <div className="text-2xl font-bold text-white">{adminUsers.length || '—'}</div>
                  </div>
                  <div className="rounded-2xl pa-card pa-card--slate p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Staff Members</div>
                    <div className="text-2xl font-bold text-amber-400">{adminStaff.length}</div>
                  </div>
                  <div className="rounded-2xl pa-card pa-card--slate p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Normal Users</div>
                    <div className="text-2xl font-bold text-white">{adminUsers.filter((u: any) => u.role === 'user').length}</div>
                  </div>
                  <div className="rounded-2xl bg-[#0B0F19] border border-amber-500/20 p-4">
                    <div className="text-[10px] text-zinc-400 font-mono uppercase">Super Admin</div>
                    <div className="text-sm font-bold text-amber-400 truncate">admin@playbeat.digital</div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="pa-tablewrap">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">All Registered Users</h3>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {usersLoading ? 'Loading…' : `${adminUsers.length} users`}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="pa-table w-full text-xs">
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
                <ViewHeader
                  icon={<Tv className="w-5 h-5" />}
                  tone="emerald"
                  title="IPTV & Streaming Services"
                  desc="Live IPTV playlist products from the catalog — plans, stock and pricing."
                  actions={
                    <button
                      onClick={() => setActiveNav('products')}
                      className="pa-btn-gold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Package className="w-3.5 h-3.5" /> Manage in Catalog
                    </button>
                  }
                />

                {(() => {
                  const iptv = products.filter((p) => {
                    const hay = `${p.name} ${p.sku || ''} ${(p as any).tags?.join(' ') || ''}`.toLowerCase()
                    return (hay.includes('iptv') || hay.includes('m3u')) && p.active !== false
                  })
                  const totalKeys = iptv.reduce((a, p) => a + (p.stock || 0), 0)
                  const avgPrice = iptv.length ? Math.round(iptv.reduce((a, p) => a + p.price, 0) / iptv.length) : 0
                  const digitalShare = iptv.length ? Math.round((iptv.filter((p) => p.digital).length / iptv.length) * 100) : 0
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KpiTile label="IPTV Products" value={iptv.length || '—'} rail="#34d399" tint="rgba(52,211,153,0.1)" edge="rgba(52,211,153,0.22)" glow="rgba(52,211,153,0.3)" icon={<Tv className="w-4 h-4 text-emerald-400" />} sub={<span className="text-emerald-300">live in catalog</span>} />
                      <KpiTile label="Ready Keys" value={totalKeys.toLocaleString()} rail="#2dd4bf" tint="rgba(45,212,191,0.1)" edge="rgba(45,212,191,0.22)" glow="rgba(45,212,191,0.3)" icon={<Key className="w-4 h-4 text-teal-400" />} sub={<span className="text-zinc-400">instant delivery</span>} />
                      <KpiTile label="Avg Price" value={avgPrice ? `Rs ${avgPrice.toLocaleString()}` : '—'} rail="#fbbf24" tint="rgba(251,191,36,0.1)" edge="rgba(251,191,36,0.22)" glow="rgba(251,191,36,0.3)" icon={<DollarSign className="w-4 h-4 text-amber-400" />} sub={<span className="text-zinc-400">per plan</span>} />
                      <KpiTile label="Digital Share" value={`${digitalShare}%`} rail="#38bdf8" tint="rgba(56,189,248,0.1)" edge="rgba(56,189,248,0.22)" glow="rgba(56,189,248,0.3)" icon={<Zap className="w-4 h-4 text-sky-400" />} sub={<span className="text-zinc-400">auto-delivered</span>} />
                    </div>
                  )
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(() => {
                    const iptv = products.filter((p) => {
                      const hay = `${p.name} ${p.sku || ''} ${(p as any).tags?.join(' ') || ''}`.toLowerCase()
                      return (hay.includes('iptv') || hay.includes('m3u')) && p.active !== false
                    })
                    if (iptv.length === 0) {
                      return (
                        <div className="col-span-full p-8 text-center rounded-2xl pa-card pa-card--slate text-[11px] text-zinc-500">
                          No IPTV products in the catalog yet. Add one via Catalog Products → New Product.
                        </div>
                      )
                    }
                    return iptv.map((p) => (
                      <div key={p.id} className="rounded-2xl pa-card pa-card--emerald pa-card--hover p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={p.image} alt="" className="w-10 h-10 rounded-xl object-cover bg-zinc-900 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-white truncate">{p.name}</div>
                              <div className="text-[10px] font-mono text-zinc-500">{p.sku}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border shrink-0 ${
                            p.stock > 0
                              ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                              : 'bg-rose-400/10 text-rose-400 border-rose-400/20'
                          }`}>
                            {p.stock > 0 ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded-lg pa-well">
                            <div className="text-[10px] text-zinc-500">Price</div>
                            <div className="font-bold text-amber-400 font-mono">{formatPrice(p.price, selectedCurrency)}</div>
                          </div>
                          <div className="p-2 rounded-lg pa-well">
                            <div className="text-[10px] text-zinc-500">Stock</div>
                            <div className="font-bold text-white font-mono">{p.stock} units</div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                            <span>Inventory level</span>
                            <span className="font-mono">{Math.min(100, (p.stock || 0))}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={`h-full ${(p.stock || 0) > 10 ? 'bg-emerald-500' : (p.stock || 0) > 0 ? 'bg-amber-400' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, (p.stock || 0))}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onQuickViewProduct(p)}
                            className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                          <button
                            onClick={() => { setEditorProduct(p); setShowProductEditor(true) }}
                            className="px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 text-amber-300 text-[10px] font-semibold flex items-center gap-1 transition"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      </div>
                    ))
                  })()}
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

            {/* ========================================================================= */}
            {/* PANEL: MESSAGE BOX & LIVE CHAT (storefront chats + staff DMs) */}
            {/* ========================================================================= */}
            {activeNav === 'messages' && (
              <MessageBoxPanel
                adminStaff={adminStaff}
                adminName={adminName}
                adminEmail={adminEmail}
                adminRole={adminRole}
                onToast={triggerToast}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="mt-auto border-t border-white/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-mono relative z-10">
            <div className="flex items-center gap-2.5">
              <img src="/playbeat-logo.png" alt="" className="h-5 w-auto object-contain opacity-80" />
              <span className="font-bold text-white">PlayBeat Digital Pvt Ltd</span>
              <span>© 2026 • All rights reserved.</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="hover:text-white cursor-pointer transition">Privacy</span>
              <span className="hover:text-white cursor-pointer transition">Terms</span>
              <span className="hover:text-white cursor-pointer transition">Support</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor] pa-breath"></span>
                {adminHealth?.database?.connected === false ? 'Degraded' : 'Operational'}
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {/* Product Editor Modal — real CRUD synced to MongoDB (create + edit) */}
      {/* ========================================================================= */}
      <ProductEditorModal
        product={editorProduct}
        isOpen={showProductEditor}
        onClose={() => setShowProductEditor(false)}
        onSave={handleEditorSave}
      />

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
              Broadcast targeted SMS / WhatsApp & Email offers to your ${adminUsers.length} registered customer profiles with 1-click discount links.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Campaign Headline</label>
                <input
                  id="campaign-headline-input"
                  type="text"
                  defaultValue="🔥 Weekend Flash Sale: 20% OFF Magcubic 4K Cinema!"
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Coupon Attached</label>
                <input
                  id="campaign-coupon-input"
                  type="text"
                  defaultValue="PLAYBEAT20"
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-amber-400 font-mono font-bold"
                />
              </div>
            </div>

            <button
              onClick={async () => {
                const form = document.getElementById('campaign-headline-input') as HTMLInputElement | null
                const coupon = document.getElementById('campaign-coupon-input') as HTMLInputElement | null
                const headline = form?.value?.trim() || ''
                try {
                  const res = await fetch(`${API_BASE}/api/admin/campaigns`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
                    credentials: 'include',
                    body: JSON.stringify({
                      name: headline || 'Quick Campaign',
                      channel: 'Email + WhatsApp',
                      headline: coupon?.value ? `${headline} — coupon ${coupon.value}` : headline,
                      audience: adminUsers.length,
                    }),
                  })
                  const data = await res.json()
                  if (data?.success) {
                    setShowCampaignModal(false)
                    triggerToast('Campaign saved to MongoDB as Draft — open Marketing Campaigns to activate')
                  } else {
                    triggerToast(data?.error || 'Could not save campaign')
                  }
                } catch {
                  triggerToast('Network error while saving campaign')
                }
              }}
              className="w-full py-2.5 rounded-xl pa-btn-gold text-xs transition"
            >
              Save Campaign Draft
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
