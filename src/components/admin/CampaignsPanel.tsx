import React, { useState, useEffect, useCallback } from 'react'
import {
  Megaphone,
  Plus,
  Mail,
  MessageSquare,
  Send,
  TrendingUp,
  Eye,
  MousePointerClick,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  RefreshCw,
  Inbox,
} from 'lucide-react'
import { Product } from '../../types'

interface CampaignsPanelProps {
  products: Product[]
  triggerToast: (msg: string) => void
  onLaunchCampaign?: () => void
}

interface Campaign {
  _id: string
  name: string
  channel: string
  headline: string
  status: 'Draft' | 'Active' | 'Completed'
  audience: number
  sent: number
  opened: number
  clicked: number
  revenue: number
  createdAt: string
  dispatchedAt?: string | null
  completedAt?: string | null
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

// NO MOCK DATA — campaigns are real documents in MongoDB marketing_campaigns.

const INITIAL_CAMPAIGNS = [
  {
    id: 'CAMP-001',
    name: 'Weekend Flash Sale: 20% OFF Magcubic 4K',
    channel: 'Email + WhatsApp',
    status: 'Active',
    sent: 248,
    opened: 184,
    clicked: 62,
    revenue: 184000,
    startedAt: '2 days ago',
  },
  {
    id: 'CAMP-002',
    name: 'Back-to-School AI Bundle Promo',
    channel: 'Email',
    status: 'Scheduled',
    sent: 0,
    opened: 0,
    clicked: 0,
    revenue: 0,
    startedAt: 'Starts in 3 days',
  },
  {
    id: 'CAMP-003',
    name: 'Netflix + Spotify Combo (Eid Special)',
    channel: 'WhatsApp',
    status: 'Completed',
    sent: 312,
    opened: 248,
    clicked: 94,
    revenue: 642000,
    startedAt: '8 days ago',
  },
  {
    id: 'CAMP-004',
    name: 'PSN Gift Card Restock Notification',
    channel: 'Push + Email',
    status: 'Draft',
    sent: 0,
    opened: 0,
    clicked: 0,
    revenue: 0,
    startedAt: 'Not scheduled',
  },
]

export const CampaignsPanel: React.FC<CampaignsPanelProps> = ({
  products,
  triggerToast,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftChannel, setDraftChannel] = useState<'Email' | 'WhatsApp' | 'Email + WhatsApp' | 'Push + Email'>('Email + WhatsApp')
  const [draftHeadline, setDraftHeadline] = useState('')
  const [customerCount, setCustomerCount] = useState(0)

  const getToken = () => localStorage.getItem('playbeat_admin_token')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/campaigns`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) setCampaigns(data.campaigns || [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleCreate = async () => {
    if (!draftName.trim()) {
      triggerToast('Campaign name is required')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
        body: JSON.stringify({ name: draftName, channel: draftChannel, headline: draftHeadline, audience: customerCount }),
      })
      const data = await res.json()
      if (data?.success) {
        setCampaigns((prev) => [data.campaign, ...prev])
        setDraftName('')
        setDraftHeadline('')
        setShowCreate(false)
        triggerToast('Campaign saved as draft in MongoDB')
      } else {
        triggerToast(data?.error || 'Create failed')
      }
    } catch {
      triggerToast('Network error while creating campaign')
    }
  }

  const setStatus = async (id: string, status: 'Draft' | 'Active' | 'Completed') => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data?.success) {
        setCampaigns((prev) => prev.map((c) => (c._id === id ? { ...c, status } : c)))
        triggerToast(
          status === 'Active'
            ? 'Campaign activated — deliveries begin once an email/SMS provider is connected'
            : `Campaign marked ${status}`
        )
      } else {
        triggerToast(data?.error || 'Update failed')
      }
    } catch {
      triggerToast('Network error while updating campaign')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setCampaigns((prev) => prev.filter((c) => c._id !== id))
        triggerToast('Campaign deleted')
      } else {
        triggerToast(data?.error || 'Delete failed')
      }
    } catch {
      triggerToast('Network error while deleting campaign')
    }
  }

  // Fetch the real registered-customer audience for targeting copy
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (data?.success) setCustomerCount((data.users || []).length)
      } catch {
        /* silent */
      }
    })()
  }, [])

  const totalSent = campaigns.reduce((a, c) => a + (c.sent || 0), 0)
  const totalOpened = campaigns.reduce((a, c) => a + (c.opened || 0), 0)
  const totalClicked = campaigns.reduce((a, c) => a + (c.clicked || 0), 0)
  const totalRevenue = campaigns.reduce((a, c) => a + (c.revenue || 0), 0)
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
  const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0
  const activeCount = campaigns.filter((c) => c.status === 'Active').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="pa-viewchip pa-chip--amber">
            <Megaphone className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight">Marketing Campaigns</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live campaigns saved in MongoDB — plan, activate and track customer broadcasts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchCampaigns} className="pa-iconbtn px-3 py-2 text-xs font-semibold flex items-center gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="pa-btn-gold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      {/* KPI Cards — real aggregates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#fb923c', ['--kpi-tint' as string]: 'rgba(251,146,60,0.1)', ['--kpi-edge' as string]: 'rgba(251,146,60,0.22)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Deliveries</span>
              <Send className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono leading-none">{totalSent.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">{activeCount} active campaign{activeCount === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#60a5fa', ['--kpi-tint' as string]: 'rgba(96,165,250,0.1)', ['--kpi-edge' as string]: 'rgba(96,165,250,0.22)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Opens</span>
              <Eye className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono leading-none">{totalOpened.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">{openRate}% open rate</div>
          </div>
        </div>
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#c084fc', ['--kpi-tint' as string]: 'rgba(192,132,252,0.1)', ['--kpi-edge' as string]: 'rgba(192,132,252,0.22)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Clicks</span>
              <MousePointerClick className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono leading-none">{totalClicked.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">{clickRate}% click rate</div>
          </div>
        </div>
        <div className="pa-kpi" style={{ ['--kpi-rail' as string]: '#34d399', ['--kpi-tint' as string]: 'rgba(52,211,153,0.1)', ['--kpi-edge' as string]: 'rgba(52,211,153,0.22)' } as React.CSSProperties}>
          <div className="pl-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Attributed Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono leading-none">Rs {totalRevenue.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5 font-mono">tracked conversions</div>
          </div>
        </div>
      </div>

      {/* Campaigns Table — live from MongoDB */}
      <div className="pa-tablewrap">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">All Campaigns</h3>
          <span className="text-[10px] font-mono text-zinc-500">{loading ? 'Loading…' : `${campaigns.length} total`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="pa-table w-full text-xs">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Audience</th>
                <th>Deliveries</th>
                <th>Opens</th>
                <th>Clicks</th>
                <th>Revenue</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-zinc-500">
                    <Inbox className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                    No campaigns yet — create your first campaign to start planning customer broadcasts.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c._id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white max-w-xs truncate">{c.name}</div>
                      {c.headline && <div className="text-[10px] text-zinc-500 truncate max-w-xs">{c.headline}</div>}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{c.channel}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{(c.audience || 0).toLocaleString()} customers</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{(c.sent || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-blue-300">{(c.opened || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-purple-300">{(c.clicked || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                      {c.revenue > 0 ? `Rs ${(c.revenue || 0).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        c.status === 'Active' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                        c.status === 'Completed' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                        'bg-zinc-400/10 text-zinc-400 border-zinc-400/20'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-[11px] font-mono">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en', { month: 'short', day: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {c.status === 'Draft' && (
                          <button
                            onClick={() => setStatus(c._id, 'Active')}
                            className="text-amber-400 hover:text-amber-300 text-[10px] font-semibold"
                          >
                            Activate →
                          </button>
                        )}
                        {c.status === 'Active' && (
                          <button
                            onClick={() => setStatus(c._id, 'Completed')}
                            className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold"
                          >
                            End
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c._id)}
                          className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Mail, color: 'text-blue-400', name: 'Email Newsletter', desc: 'Monthly catalog update + featured deals' },
          { icon: MessageSquare, color: 'text-emerald-400', name: 'WhatsApp Blast', desc: 'Flash sale alert (90% open rate)' },
          { icon: Sparkles, color: 'text-purple-400', name: 'AI Personalized', desc: 'ML-driven per-user recommendations' },
        ].map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.name}
              onClick={() => {
                setDraftName(t.name)
                setDraftChannel(t.name === 'WhatsApp Blast' ? 'WhatsApp' : 'Email')
                setShowCreate(true)
              }}
              className="text-left p-4 rounded-2xl pa-card pa-card--slate pa-card--hover transition group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${t.color}`} />
                <span className="text-xs font-bold text-white">{t.name}</span>
              </div>
              <p className="text-[11px] text-zinc-400">{t.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0F131D] border border-amber-500/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Create New Campaign</h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Weekend Flash Sale"
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Channel</label>
                <select
                  value={draftChannel}
                  onChange={(e) => setDraftChannel(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white"
                >
                  <option>Email</option>
                  <option>WhatsApp</option>
                  <option>Email + WhatsApp</option>
                  <option>Push + Email</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Headline / Subject</label>
                <textarea
                  value={draftHeadline}
                  onChange={(e) => setDraftHeadline(e.target.value)}
                  placeholder="🔥 Weekend Flash Sale: 20% OFF Magcubic 4K Cinema!"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#07090E] border border-white/5 text-[11px] text-zinc-400">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-zinc-300">Targeting:</span>
                </div>
                All registered customers{customerCount > 0 ? ` (${customerCount} active contacts` : ''}{customerCount > 0 ? ')' : ''}. The campaign is saved as a Draft in MongoDB — activate it from the table when your email/SMS provider is connected.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
