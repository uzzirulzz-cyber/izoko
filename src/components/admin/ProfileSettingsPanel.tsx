import React, { useState, useEffect, useRef } from 'react'
import {
  UserCog,
  Loader2,
  ShieldCheck,
  KeyRound,
  Bell,
  Activity,
  LogOut,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Clock,
  Mail,
  Phone,
  Building2,
  IdCard,
  Globe2,
  Info,
  LogIn,
  RefreshCw,
} from 'lucide-react'

interface ProfileSettingsPanelProps {
  onToast: (msg: string) => void
  adminRole: 'admin' | 'staff'
  adminName: string
  adminEmail: string
  onProfileUpdated: (name: string) => void
  onSignOut: () => void
  focusSection?: 'identity' | 'security' | 'activity' | null
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

const AVATAR_COLORS: Record<string, { bg: string; ring: string; label: string }> = {
  amber: { bg: 'bg-amber-400', ring: 'ring-amber-400/60', label: 'Amber' },
  blue: { bg: 'bg-blue-500', ring: 'ring-blue-500/60', label: 'Blue' },
  emerald: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/60', label: 'Emerald' },
  purple: { bg: 'bg-purple-500', ring: 'ring-purple-500/60', label: 'Purple' },
  rose: { bg: 'bg-rose-500', ring: 'ring-rose-500/60', label: 'Rose' },
  cyan: { bg: 'bg-cyan-500', ring: 'ring-cyan-500/60', label: 'Cyan' },
}

const TIMEZONES = [
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Riyadh',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'UTC',
]

const NOTIFICATION_OPTIONS = [
  { id: 'orderAlerts', label: 'New order alerts', hint: 'Notify when a customer places an order' },
  { id: 'lowStockAlerts', label: 'Low stock alerts', hint: 'Warn when products drop to 5 units or fewer' },
  { id: 'weeklyDigest', label: 'Weekly revenue digest', hint: 'Summary of revenue, orders & traffic every Monday' },
  { id: 'securityAlerts', label: 'Security alerts', hint: 'Sign-ins, password changes and staff account events' },
]

function relTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const then = new Date(dateStr).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (!pw) return { score: 0, label: 'Enter a password', color: 'bg-white/10' }
  const map = [
    { label: 'Very weak', color: 'bg-rose-500' },
    { label: 'Weak', color: 'bg-rose-400' },
    { label: 'Fair', color: 'bg-amber-400' },
    { label: 'Good', color: 'bg-yellow-400' },
    { label: 'Strong', color: 'bg-emerald-400' },
    { label: 'Excellent', color: 'bg-emerald-400' },
  ]
  return { score, ...map[score] }
}

const ACTIVITY_ICONS: Record<string, any> = {
  login: LogIn,
  profile_update: UserCog,
  password_change: KeyRound,
}

export const ProfileSettingsPanel: React.FC<ProfileSettingsPanelProps> = ({
  onToast,
  adminRole,
  adminName,
  adminEmail,
  onProfileUpdated,
  onSignOut,
  focusSection,
}) => {
  const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

  const [loading, setLoading] = useState(true)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Profile data from API
  const [profile, setProfile] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])

  // Identity form
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    jobTitle: '',
    department: '',
    timezone: 'Asia/Karachi',
    bio: '',
    avatarColor: 'amber',
  })

  // Preferences
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    orderAlerts: true,
    lowStockAlerts: true,
    weeklyDigest: false,
    securityAlerts: true,
  })

  // Password form
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const identityRef = useRef<HTMLDivElement>(null)
  const securityRef = useRef<HTMLDivElement>(null)
  const activityRef = useRef<HTMLDivElement>(null)
  const [highlight, setHighlight] = useState<string | null>(null)

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/profile`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setProfile(data.profile)
        setActivity(data.activity || [])
        const p = data.profile
        const nextForm = {
          name: p.name || '',
          email: p.email || '',
          phone: p.phone || '',
          jobTitle: p.jobTitle || '',
          department: p.department || '',
          timezone: p.timezone || 'Asia/Karachi',
          bio: p.bio || '',
          avatarColor: p.avatarColor || 'amber',
        }
        setForm(nextForm)
        if (p.notificationPrefs) {
          setPrefs((prev) => ({ ...prev, ...p.notificationPrefs }))
        }
      } else {
        onToast(data?.error || 'Failed to load profile')
      }
    } catch (e: any) {
      onToast(e.message || 'Network error while loading profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Deep-link highlighting from the header dropdown
  useEffect(() => {
    if (!focusSection || loading) return
    const target =
      focusSection === 'identity'
        ? identityRef.current
        : focusSection === 'security'
        ? securityRef.current
        : activityRef.current
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setHighlight(focusSection)
      const t = setTimeout(() => setHighlight(null), 2400)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSection, loading])

  const saveIdentity = async () => {
    if (!form.name.trim()) {
      onToast('Display name cannot be empty.')
      return
    }
    setSavingIdentity(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          email: adminRole === 'staff' ? form.email : undefined,
          phone: form.phone,
          jobTitle: form.jobTitle,
          timezone: form.timezone,
          bio: form.bio,
          avatarColor: form.avatarColor,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast('Profile updated successfully.')
        onProfileUpdated(data.name || form.name)
        fetchProfile()
      } else {
        onToast(data?.error || 'Failed to update profile')
      }
    } catch (e: any) {
      onToast(e.message || 'Network error')
    } finally {
      setSavingIdentity(false)
    }
  }

  const savePrefs = async () => {
    setSavingPrefs(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
        body: JSON.stringify({ notificationPrefs: prefs }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast('Notification preferences saved.')
        fetchProfile()
      } else {
        onToast(data?.error || 'Failed to save preferences')
      }
    } catch (e: any) {
      onToast(e.message || 'Network error')
    } finally {
      setSavingPrefs(false)
    }
  }

  const changePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      onToast('All password fields are required.')
      return
    }
    if (pwNew !== pwConfirm) {
      onToast('New password and confirmation do not match.')
      return
    }
    if (pwNew.length < 8) {
      onToast('New password must be at least 8 characters long.')
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/profile/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast('Password changed successfully. Use it on your next sign-in.')
        setPwCurrent('')
        setPwNew('')
        setPwConfirm('')
        fetchProfile()
      } else {
        onToast(data?.error || 'Failed to change password')
      }
    } catch (e: any) {
      onToast(e.message || 'Network error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await fetch(`${API_BASE}/api/auth/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
    } catch {
      // Clear locally regardless
    }
    localStorage.removeItem('playbeat_admin_token')
    localStorage.removeItem('playbeat_admin_session')
    onSignOut()
  }

  const strength = passwordStrength(pwNew)
  const avatarColor = AVATAR_COLORS[form.avatarColor] || AVATAR_COLORS.amber
  const isSuper = adminRole === 'admin'
  const pwChangedAt = profile?.passwordChangedAt || null

  const cardHighlight = (section: string) =>
    highlight === section ? 'ring-2 ring-amber-400/60 border-amber-400/40' : ''

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#0F131D] border border-white/5 p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        <span className="text-xs text-zinc-400 font-mono">Loading your profile from MongoDB…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-amber-400" />
            Profile Settings
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Manage your administrator identity, security and dashboard preferences.
          </p>
        </div>
        <button
          onClick={fetchProfile}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ============ LEFT COLUMN ============ */}
        <div className="lg:col-span-7 space-y-5">
          {/* IDENTITY CARD */}
          <div
            ref={identityRef}
            className={`rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-4 scroll-mt-24 transition ${cardHighlight('identity')}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Administrator Identity</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  How your account appears across the admin dashboard and activity logs.
                </p>
              </div>
              <span className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
                <UserCog className="w-4 h-4 text-amber-400" />
              </span>
            </div>

            {/* Avatar preview + color picker */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#07090E] border border-white/5">
              <div
                className={`w-14 h-14 rounded-full ${avatarColor.bg} text-black font-extrabold text-lg flex items-center justify-center font-mono ring-4 ${avatarColor.ring} shrink-0`}
              >
                {(form.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="text-xs font-semibold text-white truncate">{form.name || 'Unnamed'}</div>
                <div className="text-[11px] text-zinc-400 font-mono truncate">{form.email}</div>
                <div className="flex items-center gap-1.5 pt-1">
                  {Object.entries(AVATAR_COLORS).map(([key, c]) => (
                    <button
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, avatarColor: key }))}
                      title={c.label}
                      className={`w-5 h-5 rounded-full ${c.bg} transition ${
                        form.avatarColor === key
                          ? 'ring-2 ring-white/80 scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono">Display Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-amber-400/60"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-mono flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Login Email
                  {!isSuper && <span className="text-[9px] text-emerald-400">(editable)</span>}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={form.email}
                    disabled={isSuper}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={`w-full px-3 py-2 pr-9 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-amber-400/60 disabled:opacity-60 ${
                      isSuper ? 'cursor-not-allowed' : ''
                    }`}
                  />
                  {isSuper && (
                    <Lock className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {isSuper && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Tied to platform credentials — locked for the super administrator.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-mono flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  placeholder="+92 3XX XXXXXXX"
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-amber-400/60 placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-mono flex items-center gap-1">
                  <IdCard className="w-3 h-3" /> Job Title
                </label>
                <input
                  type="text"
                  value={form.jobTitle}
                  placeholder="Store Manager"
                  onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-amber-400/60 placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-mono flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Department
                </label>
                <input
                  type="text"
                  value={form.department}
                  disabled={adminRole === 'staff'}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-amber-400/60 disabled:opacity-60"
                />
                {adminRole === 'staff' && (
                  <p className="text-[10px] text-zinc-500 mt-1">Managed by the super administrator.</p>
                )}
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-mono flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> Timezone
                </label>
                <select
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white font-mono focus:outline-none focus:border-amber-400/60"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-mono text-xs">Bio</label>
              <textarea
                value={form.bio}
                rows={2}
                maxLength={400}
                placeholder="A short note about your role in the company…"
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400/60 placeholder-zinc-600 resize-none"
              />
              <div className="text-right text-[10px] text-zinc-500 font-mono">{form.bio.length}/400</div>
            </div>

            <button
              onClick={saveIdentity}
              disabled={savingIdentity}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {savingIdentity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savingIdentity ? 'Saving…' : 'Save Profile'}</span>
            </button>
          </div>

          {/* SECURITY CARD */}
          <div
            ref={securityRef}
            className={`rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-4 scroll-mt-24 transition ${cardHighlight('security')}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  Account Security
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Change your own password — verification of the current password is required.
                </p>
              </div>
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </span>
            </div>

            {pwChangedAt && (
              <div className="p-2.5 rounded-xl bg-[#07090E] border border-white/5 text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Last password change: {fmtDate(pwChangedAt)}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1 font-mono">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    autoComplete="off"
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-mono">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-emerald-400/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-mono">Confirm New Password</label>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white focus:outline-none focus:border-emerald-400/60"
                />
                {pwConfirm && (
                  <div
                    className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-mono ${
                      pwNew === pwConfirm ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pwNew === pwConfirm ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      <>✕ Passwords do not match</>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Strength meter */}
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-full flex-1 rounded-full transition ${
                      i <= strength.score ? strength.color : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                Strength: <span className="text-zinc-300">{pwNew ? strength.label : '—'}</span> · minimum
                8 characters
              </div>
            </div>

            <button
              onClick={changePassword}
              disabled={changingPassword}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>{changingPassword ? 'Updating…' : 'Change Password'}</span>
            </button>
          </div>

          {/* PREFERENCES CARD */}
          <div className="rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  Notification Preferences
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Choose which dashboard events you want to be alerted about.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {NOTIFICATION_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3 rounded-xl bg-[#07090E] border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{opt.label}</div>
                    <div className="text-[10px] text-zinc-500">{opt.hint}</div>
                  </div>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, [opt.id]: !p[opt.id] }))}
                    className={`relative w-10 h-5.5 rounded-full transition shrink-0 ${
                      prefs[opt.id] ? 'bg-amber-400' : 'bg-white/10'
                    }`}
                    style={{ height: '22px' }}
                    aria-pressed={!!prefs[opt.id]}
                  >
                    <span
                      className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${
                        prefs[opt.id] ? 'left-[22px]' : 'left-[3px]'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={savePrefs}
              disabled={savingPrefs}
              className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savingPrefs ? 'Saving…' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="lg:col-span-5 space-y-5">
          {/* ACCOUNT & SESSION INFO */}
          <div className="rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Account & Session</h3>
              <span className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
                <Info className="w-4 h-4 text-blue-400" />
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {[
                {
                  label: 'Role',
                  value: isSuper ? 'Super Administrator' : 'Employee · Staff',
                  mono: false,
                },
                { label: 'Auth method', value: profile?.provider || 'local', mono: true },
                ...(profile?.staffId ? [{ label: 'Staff ID', value: profile.staffId, mono: true }] : []),
                {
                  label: 'Account created',
                  value: profile?.createdAt ? fmtDate(profile.createdAt) : 'Platform origin',
                  mono: false,
                },
                {
                  label: 'Last sign-in',
                  value: profile?.lastLoginAt ? relTime(profile.lastLoginAt) : 'This session',
                  mono: false,
                },
                { label: 'Session length', value: '7 days (auto sign-out)', mono: false },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#07090E] border border-white/5"
                >
                  <span className="text-zinc-400">{row.label}</span>
                  <span
                    className={`text-right text-zinc-200 truncate ${
                      row.mono ? 'font-mono text-[11px]' : 'font-semibold'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {isSuper && (
              <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-200/80 leading-relaxed">
                Password changes made here are stored as a secure bcrypt hash in MongoDB and take
                effect immediately — the original platform credential stops working right away.
              </div>
            )}
          </div>

          {/* RECENT ACTIVITY */}
          <div
            ref={activityRef}
            className={`rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-3 scroll-mt-24 transition ${cardHighlight('activity')}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Recent Activity
                </h3>
                <p className="text-xs text-zinc-400 font-mono">Your last 15 account events.</p>
              </div>
            </div>

            {activity.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-zinc-500">
                No recorded activity yet — sign-ins and profile changes will appear here.
              </div>
            ) : (
              <div className="relative space-y-0">
                {activity.map((a, i) => {
                  const Icon = ACTIVITY_ICONS[a.type] || Activity
                  return (
                    <div key={a.id || i} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < activity.length - 1 && (
                        <div className="absolute left-[13px] top-8 bottom-0 w-px bg-white/5" />
                      )}
                      <div className="w-7 h-7 rounded-lg bg-[#07090E] border border-white/10 flex items-center justify-center shrink-0">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            a.type === 'login'
                              ? 'text-emerald-400'
                              : a.type === 'password_change'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          } ${a.type === 'login' ? 'rotate-180' : ''}`}
                        />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="text-xs font-medium text-white">{a.detail}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {relTime(a.createdAt)}
                          {a.meta?.method ? ` · ${a.meta.method}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SIGN OUT */}
          <div className="rounded-2xl bg-[#0F131D] border border-rose-500/20 p-5 space-y-3">
            <h3 className="font-bold text-sm text-white">Session</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Signing out terminates this admin session on all devices for this browser cookie and
              returns you to the admin login screen. Your dashboard data caches stay on this device
              until the next sign-in.
            </p>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>{signingOut ? 'Signing out…' : 'Sign Out of Admin Dashboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
