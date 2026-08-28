import React, { useState } from 'react'
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
} from 'lucide-react'
import { Product } from '../../types'

interface CampaignsPanelProps {
  products: Product[]
  triggerToast: (msg: string) => void
  onLaunchCampaign: () => void
}

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
  onLaunchCampaign,
}) => {
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS)
  const [showCreate, setShowCreate] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftChannel, setDraftChannel] = useState<'Email' | 'WhatsApp' | 'Email + WhatsApp' | 'Push + Email'>('Email + WhatsApp')
  const [draftHeadline, setDraftHeadline] = useState('')

  const handleCreate = () => {
    if (!draftName.trim()) {
      triggerToast('Campaign name is required')
      return
    }
    const newCamp = {
      id: `CAMP-${String(campaigns.length + 1).padStart(3, '0')}`,
      name: draftName.trim(),
      channel: draftChannel,
      status: 'Draft',
      sent: 0,
      opened: 0,
      clicked: 0,
      revenue: 0,
      startedAt: 'Just created',
    }
    setCampaigns([newCamp, ...campaigns])
    setDraftName('')
    setDraftHeadline('')
    setShowCreate(false)
    triggerToast(`Campaign "${newCamp.name}" created as draft`)
  }

  const handleDispatch = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: 'Active', sent: 248, startedAt: 'Just now' }
          : c
      )
    )
    triggerToast(`Campaign ${id} dispatched to 248 contacts`)
  }

  const handleDelete = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    triggerToast(`Campaign ${id} deleted`)
  }

  const totalSent = campaigns.reduce((a, c) => a + c.sent, 0)
  const totalOpened = campaigns.reduce((a, c) => a + c.opened, 0)
  const totalClicked = campaigns.reduce((a, c) => a + c.clicked, 0)
  const totalRevenue = campaigns.reduce((a, c) => a + c.revenue, 0)
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0
  const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Marketing Campaigns</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Broadcast SMS, WhatsApp & Email campaigns to customer segments. Track opens, clicks, and revenue.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3.5 py-2 rounded-xl bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <Send className="w-4 h-4 text-orange-400" />
            <span className="text-[9px] text-emerald-400 font-mono">▲ 12%</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">Total Sent</div>
          <div className="text-xl font-bold text-white">{totalSent.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-[9px] text-emerald-400 font-mono">{openRate}%</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">Open Rate</div>
          <div className="text-xl font-bold text-white">{totalOpened.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <MousePointerClick className="w-4 h-4 text-purple-400" />
            <span className="text-[9px] text-emerald-400 font-mono">{clickRate}%</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">Click Rate</div>
          <div className="text-xl font-bold text-white">{totalClicked.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] text-emerald-400 font-mono">▲ 18%</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono uppercase">Revenue Generated</div>
          <div className="text-xl font-bold text-white">PKR {totalRevenue.toLocaleString()}</div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">All Campaigns</h3>
          <span className="text-[10px] font-mono text-zinc-500">{campaigns.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#07090E]">
              <tr className="text-left text-zinc-400">
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Campaign</th>
                <th className="px-4 py-2.5 font-medium">Channel</th>
                <th className="px-4 py-2.5 font-medium">Sent</th>
                <th className="px-4 py-2.5 font-medium">Opens</th>
                <th className="px-4 py-2.5 font-medium">Clicks</th>
                <th className="px-4 py-2.5 font-medium">Revenue</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-zinc-400">{c.id}</td>
                  <td className="px-4 py-3 font-semibold text-white max-w-xs truncate">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.channel}</td>
                  <td className="px-4 py-3 font-mono text-zinc-300">{c.sent.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-blue-300">{c.opened.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-purple-300">{c.clicked.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                    {c.revenue > 0 ? `PKR ${c.revenue.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      c.status === 'Active' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' :
                      c.status === 'Completed' ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' :
                      c.status === 'Scheduled' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' :
                      'bg-zinc-400/10 text-zinc-400 border-zinc-400/20'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-[11px]">{c.startedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.status === 'Draft' && (
                        <button
                          onClick={() => handleDispatch(c.id)}
                          className="text-amber-400 hover:text-amber-300 text-[10px] font-semibold"
                        >
                          Dispatch →
                        </button>
                      )}
                      {c.status === 'Active' && (
                        <button
                          onClick={() => {
                            setCampaigns((prev) => prev.map((x) => x.id === c.id ? { ...x, status: 'Completed' } : x))
                            triggerToast(`Campaign ${c.id} marked as completed`)
                          }}
                          className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold"
                        >
                          End
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
              className="text-left p-4 rounded-2xl bg-[#0B0F19] border border-white/5 hover:border-amber-400/30 transition group"
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
                All registered customers (248 active contacts). Campaign will be saved as Draft — you can dispatch it from the table.
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
