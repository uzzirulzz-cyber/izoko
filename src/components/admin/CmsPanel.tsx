import React, { useState } from 'react'
import {
  Globe,
  Megaphone,
  Sparkles,
  MapPin,
  Share2,
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  Mail,
  Phone,
} from 'lucide-react'

interface CmsPanelProps {
  settings: any
  loading: boolean
  isSuperAdmin: boolean
  onToast: (msg: string) => void
  onChanged: () => void
}

const inputCls =
  'w-full bg-[#121622] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50 transition'

export const CmsPanel: React.FC<CmsPanelProps> = ({
  settings: initial,
  loading,
  isSuperAdmin,
  onToast,
  onChanged,
}) => {
  const [draft, setDraft] = useState<any>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Re-sync draft when fresh settings arrive from the backend
  React.useEffect(() => {
    setDraft(initial)
  }, [initial])

  if (loading && !draft) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        <span className="ml-3 text-xs font-mono text-zinc-400">Loading website content…</span>
      </div>
    )
  }
  if (!draft) return null

  const setField = (section: string, key: string, value: any) => {
    setDraft((prev: any) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!isSuperAdmin) {
      onToast('Super administrator privileges required to publish.')
      return
    }
    setSaving(true)
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
      const token = localStorage.getItem('playbeat_admin_token')
      const res = await fetch(`${API_BASE}/api/admin/cms/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ settings: draft }),
      })
      const data = await res.json()
      if (data?.success) {
        setSaved(true)
        onToast('Website content published to the live storefront!')
        onChanged()
      } else {
        onToast(data?.error || 'Failed to publish content.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-cyan-400 inline-block" />
            Website Builder CMS
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Edit the storefront's announcement bar, hero copy, contact details, and social links — changes go
            live the moment you publish. Everything is stored in MongoDB, no code required.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/storefront"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 transition"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" /> Preview Storefront
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold transition disabled:opacity-60 shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Publishing…' : saved ? 'Published' : 'Publish Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Announcement bar */}
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            <Megaphone className="w-3.5 h-3.5 text-amber-400" /> Announcement Bar
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-zinc-300">Show announcement bar</span>
            <button
              type="button"
              onClick={() => setField('announcement', 'enabled', !draft.announcement?.enabled)}
              className={`relative w-10 h-5 rounded-full transition ${draft.announcement?.enabled ? 'bg-amber-400' : 'bg-zinc-700'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${draft.announcement?.enabled ? 'left-5' : 'left-0.5'}`}
              />
            </button>
          </label>
          <textarea
            rows={2}
            value={draft.announcement?.text || ''}
            onChange={(e) => setField('announcement', 'text', e.target.value)}
            placeholder="Announcement text…"
            className={`${inputCls} resize-none`}
          />
          <input
            type="text"
            value={draft.announcement?.link || ''}
            onChange={(e) => setField('announcement', 'link', e.target.value)}
            placeholder="Optional link (e.g. /contact)"
            className={inputCls}
          />
        </div>

        {/* Hero */}
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Hero Section
          </div>
          <input
            type="text"
            value={draft.hero?.badge || ''}
            onChange={(e) => setField('hero', 'badge', e.target.value)}
            placeholder="Badge line"
            className={inputCls}
          />
          <input
            type="text"
            value={draft.hero?.title || ''}
            onChange={(e) => setField('hero', 'title', e.target.value)}
            placeholder="Hero headline"
            className={inputCls}
          />
          <textarea
            rows={3}
            value={draft.hero?.subtitle || ''}
            onChange={(e) => setField('hero', 'subtitle', e.target.value)}
            placeholder="Hero sub-headline"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Contact details */}
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            <MapPin className="w-3.5 h-3.5 text-pink-400" /> Contact & Address (Footer + Contact Page)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Primary email</span>
              <input type="text" value={draft.contact?.email || ''} onChange={(e) => setField('contact', 'email', e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Support email</span>
              <input type="text" value={draft.contact?.supportEmail || ''} onChange={(e) => setField('contact', 'supportEmail', e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp number</span>
              <input type="text" value={draft.contact?.whatsapp || ''} onChange={(e) => setField('contact', 'whatsapp', e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</span>
              <input type="text" value={draft.contact?.phone || ''} onChange={(e) => setField('contact', 'phone', e.target.value)} className={inputCls} />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-[10px] text-zinc-500">Office address</span>
            <textarea
              rows={2}
              value={draft.contact?.address || ''}
              onChange={(e) => setField('contact', 'address', e.target.value)}
              placeholder="Street, city, country"
              className={`${inputCls} resize-none`}
            />
          </label>
          <input
            type="text"
            value={draft.contact?.hours || ''}
            onChange={(e) => setField('contact', 'hours', e.target.value)}
            placeholder="Support hours line"
            className={inputCls}
          />
        </div>

        {/* Social links */}
        <div className="rounded-2xl bg-[#0B0F19] border border-white/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
            <Share2 className="w-3.5 h-3.5 text-indigo-400" /> Social Links
          </div>
          {[
            ['instagram', 'Instagram URL'],
            ['facebook', 'Facebook URL'],
            ['tiktok', 'TikTok URL'],
            ['telegram', 'Telegram URL'],
          ].map(([key, label]) => (
            <label key={key} className="space-y-1 block">
              <span className="text-[10px] text-zinc-500">{label}</span>
              <input
                type="text"
                value={draft.social?.[key] || ''}
                onChange={(e) => setField('social', key, e.target.value)}
                placeholder={`https://${key}.com/…`}
                className={inputCls}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
