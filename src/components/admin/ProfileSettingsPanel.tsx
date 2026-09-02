import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  Check,
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
  Camera,
  Trash2,
  X,
  Image as ImageIcon,
  ShoppingBag,
  UserPlus,
  ShieldAlert,
  MonitorSmartphone,
  RotateCcw,
} from 'lucide-react'
import AdminAvatar, { bumpAvatarVersion } from './AdminAvatar'

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

const NOTIF_META: Record<string, { icon: any; color: string; border: string; priority: string }> = {
  order: { icon: ShoppingBag, color: 'text-amber-400', border: 'border-l-amber-400/60', priority: 'High' },
  security: { icon: ShieldAlert, color: 'text-rose-400', border: 'border-l-rose-400/70', priority: 'Critical' },
  admin: { icon: Settings2, color: 'text-blue-400', border: 'border-l-blue-400/50', priority: 'Normal' },
  user: { icon: UserPlus, color: 'text-emerald-400', border: 'border-l-emerald-400/50', priority: 'Normal' },
}

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

function parseUA(ua: string): { browser: string; os: string } {
  let browser = 'Unknown browser'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/opr\//i.test(ua)) browser = 'Opera'
  else if (/chrome\//i.test(ua)) browser = 'Chrome'
  else if (/firefox\//i.test(ua)) browser = 'Firefox'
  else if (/safari\//i.test(ua)) browser = 'Safari'
  let os = 'Unknown OS'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad/i.test(ua)) os = 'iOS'
  else if (/mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  return { browser, os }
}

const ACTIVITY_ICONS: Record<string, any> = {
  login: LogIn,
  profile_update: UserCog,
  password_change: KeyRound,
  avatar_update: ImageIcon,
  avatar_remove: Trash2,
}

const ACTIVITY_COLOR: Record<string, string> = {
  login: 'text-emerald-400',
  profile_update: 'text-amber-400',
  password_change: 'text-rose-400',
  avatar_update: 'text-cyan-400',
  avatar_remove: 'text-zinc-400',
}

// Lazily resolve Settings2 icon (imported below to keep icon table tidy)
import { Settings2 } from 'lucide-react'

interface NotifItem {
  id: string
  category: string
  title: string
  body: string
  deepLink?: string
  createdAt: string
}

const CROP_SIZE = 256

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
  const myEmail = (adminEmail || '').toLowerCase()

  const [loading, setLoading] = useState(true)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Profile data from API
  const [profile, setProfile] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [avatarVersion, setAvatarVersion] = useState(0)
  const [hasAvatar, setHasAvatar] = useState(false)

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
  const [initialForm, setInitialForm] = useState(form)
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm)

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

  // Avatar upload pipeline
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [avatarFlash, setAvatarFlash] = useState(false)

  // Crop modal
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const cropImgRef = useRef<HTMLImageElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  // Notifications
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [notifSummary, setNotifSummary] = useState<any>(null)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifsDismissed, setNotifsDismissed] = useState<string[]>([])
  const [notifSeenAt, setNotifSeenAt] = useState<string>(
    () => localStorage.getItem(`pb_notif_seen_${myEmail}`) || ''
  )

  // Live activity auto-refresh
  const [liveActivity, setLiveActivity] = useState(true)
  const [devices, setDevices] = useState<any[]>([])

  const identityRef = useRef<HTMLDivElement>(null)
  const securityRef = useRef<HTMLDivElement>(null)
  const activityRef = useRef<HTMLDivElement>(null)
  const [highlight, setHighlight] = useState<string | null>(null)

  const fetchProfile = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/admin/profile`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (data?.success) {
          const p = data.profile
          setProfile(p)
          setActivity(data.activity || [])
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
          setInitialForm(nextForm)
          if (p.notificationPrefs) {
            setPrefs((prev) => ({ ...prev, ...p.notificationPrefs }))
          }
          if (p.avatar) {
            setHasAvatar(Boolean(p.avatar.has))
            setAvatarVersion(p.avatar.version || 0)
            // Adopt a version uploaded from another device / earlier session
            try {
              const stored = parseInt(localStorage.getItem(`pb_avatar_v_${myEmail}`) || '0', 10) || 0
              if ((p.avatar.version || 0) > stored) {
                localStorage.setItem(`pb_avatar_v_${myEmail}`, String(p.avatar.version || 0))
              }
            } catch {
              /* storage unavailable */
            }
          }
        } else if (!silent) {
          onToast(data?.error || 'Failed to load profile')
        }
      } catch (e: any) {
        if (!silent) onToast(e.message || 'Network error while loading profile')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myEmail]
  )

  const fetchNotifs = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/app/notifications`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        setNotifs(data.notifications || [])
        setNotifSummary(data.summary || null)
      }
    } catch {
      /* notification feed is optional — silent */
    } finally {
      setNotifLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchNotifs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh activity + notifications every 30s when LIVE is on
  useEffect(() => {
    if (!liveActivity) return
    const t = setInterval(() => {
      fetchProfile(true)
      fetchNotifs()
    }, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveActivity])

  // Mini device list for the session panel (super admin only)
  useEffect(() => {
    if (adminRole !== 'admin') return
    fetch(`${API_BASE}/api/admin/app/devices`, {
      headers: { Authorization: `Bearer ${getAdminToken()}` },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setDevices(d.devices || [])
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminRole])

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

  // ============================ AVATAR PIPELINE ============================
  const onPickFile = () => {
    setAvatarError(null)
    fileRef.current?.click()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const okTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!okTypes.includes(file.type)) {
      setAvatarError('Unsupported format — use JPG, PNG or WebP.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError('Image is too large — pick one under 8 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(String(reader.result))
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    }
    reader.onerror = () => setAvatarError('Could not read the selected file.')
    reader.readAsDataURL(file)
  }

  // Draw the crop canvas whenever zoom/offset/image change
  useEffect(() => {
    if (!cropSrc || !canvasRef.current) return
    const img = cropImgRef.current
    if (!img) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const cover = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height)
    const dw = img.width * cover * zoom
    const dh = img.height * cover * zoom
    const maxX = Math.max(0, (dw - CROP_SIZE) / 2)
    const maxY = Math.max(0, (dh - CROP_SIZE) / 2)
    const ox = Math.min(maxX, Math.max(-maxX, offset.x))
    const oy = Math.min(maxY, Math.max(-maxY, offset.y))
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE)
    ctx.fillStyle = '#07090E'
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE)
    ctx.drawImage(img, (CROP_SIZE - dw) / 2 + ox, (CROP_SIZE - dh) / 2 + oy, dw, dh)
  }, [cropSrc, zoom, offset])

  const onCropPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onCropPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { x: e.clientX, y: e.clientY }
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }))
  }
  const onCropPointerUp = () => {
    dragRef.current = null
  }

  const uploadAvatar = (dataUrl: string) => {
    setUploading(true)
    setUploadProgress(0)
    setPendingPreview(dataUrl)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/admin/profile/avatar`)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${getAdminToken()}`)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
    }
    xhr.onload = () => {
      setUploading(false)
      setPendingPreview(null)
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data?.success) {
          const v = data.avatar?.version || Date.now()
          bumpAvatarVersion(myEmail, v)
          setHasAvatar(true)
          setAvatarVersion(v)
          setAvatarFlash(true)
          setTimeout(() => setAvatarFlash(false), 1800)
          onToast('Profile picture updated — visible everywhere instantly.')
          fetchProfile(true)
        } else {
          setAvatarError(data?.error || 'Upload failed — try a different image.')
        }
      } catch {
        setAvatarError('Unexpected server response.')
      }
    }
    xhr.onerror = () => {
      setUploading(false)
      setPendingPreview(null)
      setAvatarError('Network error during upload.')
    }
    xhr.send(JSON.stringify({ dataUrl }))
  }

  const confirmCrop = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
    setCropSrc(null)
    uploadAvatar(dataUrl)
  }

  const removeAvatar = async () => {
    setUploading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/profile/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        credentials: 'include',
      })
      const data = await res.json()
      if (data?.success) {
        bumpAvatarVersion(myEmail, 0)
        setHasAvatar(false)
        setAvatarVersion(0)
        onToast('Profile picture removed — initials avatar restored.')
        fetchProfile(true)
      } else {
        onToast(data?.error || 'Could not remove the picture.')
      }
    } catch (e: any) {
      onToast(e.message || 'Network error')
    } finally {
      setUploading(false)
    }
  }

  // ============================ FORM ACTIONS ============================
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
        setInitialForm({ ...form })
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2200)
        fetchProfile(true)
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
        fetchProfile(true)
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
        fetchProfile(true)
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

  // ============================ NOTIFICATION ACTIONS ============================
  const unreadCount = notifs.filter(
    (n) => !notifsDismissed.includes(n.id) && (!notifSeenAt || new Date(n.createdAt) > new Date(notifSeenAt))
  ).length

  const dismissNotif = (id: string) => {
    setNotifsDismissed((prev) => {
      const next = [...prev, id].slice(-200)
      try {
        localStorage.setItem(`pb_notif_dismissed_${myEmail}`, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const markAllRead = () => {
    const now = new Date().toISOString()
    setNotifSeenAt(now)
    try {
      localStorage.setItem(`pb_notif_seen_${myEmail}`, now)
    } catch {}
    onToast('All notifications marked as read.')
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`pb_notif_dismissed_${myEmail}`)
      if (raw) setNotifsDismissed(JSON.parse(raw))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const strength = passwordStrength(pwNew)
  const avatarColor = AVATAR_COLORS[form.avatarColor] || AVATAR_COLORS.amber
  const isSuper = adminRole === 'admin'
  const pwChangedAt = profile?.passwordChangedAt || null
  const ua = parseUA(profile?.session?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''))

  const cardHighlight = (section: string) =>
    highlight === section ? 'ring-2 ring-amber-400/60 border-amber-400/40' : ''

  const visibleNotifs = notifs.filter((n) => !notifsDismissed.includes(n.id)).slice(0, 8)

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
      <style>{`
        @keyframes pbFadeSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pbPop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pbGlowPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); } 50% { box-shadow: 0 0 0 6px rgba(52,211,153,0); } }
        .pb-anim-item { animation: pbFadeSlide 0.45s ease both; }
        .pb-anim-pop { animation: pbPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .pb-live-dot { animation: pbGlowPulse 2s ease-in-out infinite; }
      `}</style>

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
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="pb-anim-pop px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={() => { fetchProfile(); fetchNotifs() }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />

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

            {/* ===== Avatar editor: upload / preview / crop / remove ===== */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#07090E] border border-white/5">
              <div className="relative group shrink-0">
                <div className={`rounded-full transition ${avatarFlash ? 'pb-anim-pop' : ''}`}>
                  <AdminAvatar
                    name={form.name || adminName}
                    email={hasAvatar ? myEmail : ''}
                    color={form.avatarColor}
                    size={72}
                    still
                    className={avatarFlash ? 'ring-2 ring-emerald-400/70 rounded-full' : ''}
                  />
                </div>
                {pendingPreview && (
                  <img
                    src={pendingPreview}
                    alt="Uploading preview"
                    className="absolute inset-0 w-[72px] h-[72px] rounded-full object-cover opacity-70"
                  />
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin drop-shadow" />
                  </div>
                )}
                {/* Hover overlay */}
                {!uploading && (
                  <button
                    onClick={onPickFile}
                    title="Upload a new profile picture"
                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    <span className="text-[8px] font-mono font-bold text-white uppercase tracking-wider">
                      {hasAvatar ? 'Change' : 'Upload'}
                    </span>
                  </button>
                )}
                {/* Online / admin status ring dot */}
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#07090E] shadow-[0_0_10px_rgba(52,211,153,0.9)] pb-live-dot" title="Administrator online" />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="text-xs font-semibold text-white truncate">{form.name || 'Unnamed'}</div>
                <div className="text-[11px] text-zinc-400 font-mono truncate">{form.email}</div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={onPickFile}
                    disabled={uploading}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold font-mono hover:bg-amber-400/20 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3" /> {hasAvatar ? 'Replace' : 'Upload picture'}
                  </button>
                  {hasAvatar && (
                    <button
                      onClick={removeAvatar}
                      disabled={uploading}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-400/30 text-rose-300 text-[10px] font-bold font-mono hover:bg-rose-500/20 transition disabled:opacity-50 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-zinc-600 font-mono">JPG · PNG · WebP — cropped to a 256×256 square in your browser.</p>
              </div>

              {/* Fallback color picker (initials avatar) */}
              <div className="hidden sm:flex flex-col items-start gap-1.5 shrink-0">
                <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500">Fallback color</span>
                <div className="flex items-center gap-1.5">
                  {Object.entries(AVATAR_COLORS).map(([key, c]) => (
                    <button
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, avatarColor: key }))}
                      title={c.label}
                      className={`w-4.5 h-4.5 rounded-full ${c.bg} transition ${
                        form.avatarColor === key ? 'ring-2 ring-white/80 scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ width: 18, height: 18 }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {avatarError && (
              <div className="pb-anim-pop px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-400/30 text-[11px] text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> {avatarError}
              </div>
            )}
            {uploading && (
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-[9px] text-zinc-500 font-mono text-right">Uploading… {uploadProgress}%</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono flex items-center gap-1">
                  <UserCog className="w-3 h-3" /> Display Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 placeholder-zinc-600"
                  placeholder="Your full name"
                />
                {form.name.trim() && initialForm.name.trim() && form.name.trim().length < 2 && (
                  <p className="text-[10px] text-rose-400 mt-1 font-mono">Name looks too short.</p>
                )}
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
                    className={`w-full px-3 py-2 pr-9 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 disabled:opacity-60 ${
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
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 placeholder-zinc-600"
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
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 placeholder-zinc-600"
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
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 disabled:opacity-60"
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
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white font-mono transition focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15"
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
                className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white text-xs transition focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/15 placeholder-zinc-600 resize-none"
              />
              <div className="text-right text-[10px] text-zinc-500 font-mono">{form.bio.length}/400</div>
            </div>

            <button
              onClick={saveIdentity}
              disabled={savingIdentity}
              className={`w-full py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-60 active:scale-[0.99] ${
                justSaved
                  ? 'bg-emerald-500 text-black'
                  : 'bg-amber-400 hover:bg-amber-300 text-black'
              }`}
            >
              {savingIdentity ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : justSaved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{savingIdentity ? 'Saving…' : justSaved ? 'Saved!' : dirty ? 'Save Profile' : 'Save Profile'}</span>
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
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
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
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                  className="w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white transition focus:outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/15"
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
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
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
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 active:scale-[0.99]"
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
                  className="p-3 rounded-xl bg-[#07090E] border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white">{opt.label}</div>
                    <div className="text-[10px] text-zinc-500">{opt.hint}</div>
                  </div>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, [opt.id]: !p[opt.id] }))}
                    className={`relative w-10 rounded-full transition shrink-0 ${
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
              className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 active:scale-[0.99]"
            >
              {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savingPrefs ? 'Saving…' : 'Save Preferences'}</span>
            </button>
          </div>
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="lg:col-span-5 space-y-5">
          {/* ACCOUNT & SESSION INFO — enhanced live panel */}
          <div className="rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Account & Session
                <span className="pb-live-dot w-2 h-2 rounded-full bg-emerald-400" title="Live" />
              </h3>
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
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#07090E] border border-white/5 hover:border-white/15 transition"
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
              {/* This device — live details */}
              <div className="p-3 rounded-xl bg-[#07090E] border border-blue-400/20 space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-blue-300">
                  <MonitorSmartphone className="w-3.5 h-3.5" /> This device — current session
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-zinc-400">Browser</span>
                  <span className="text-zinc-200 font-mono">{ua.browser}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-zinc-400">Platform</span>
                  <span className="text-zinc-200 font-mono">{ua.os}</span>
                </div>
                {profile?.session?.ip && (
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-zinc-400">IP address</span>
                    <span className="text-zinc-200 font-mono">{profile.session.ip}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-zinc-400">Timezone</span>
                  <span className="text-zinc-200 font-mono">{form.timezone}</span>
                </div>
              </div>
              {/* Security status */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-400/25">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-emerald-300 font-semibold">
                  Security status: healthy
                </span>
                <span className="ml-auto text-[9px] text-zinc-500 font-mono">HTTPS · bcrypt · JWT</span>
              </div>
            </div>

            {/* Registered devices (super admin) */}
            {isSuper && devices.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">
                  Registered app devices — {devices.length}
                </div>
                {devices.slice(0, 3).map((d) => (
                  <div
                    key={d.deviceId}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-[#07090E] border border-white/5"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        d.revoked
                          ? 'bg-rose-500'
                          : d.status === 'online'
                          ? 'bg-emerald-400 shadow-[0_0_6px_currentColor]'
                          : d.status === 'idle'
                          ? 'bg-amber-400'
                          : 'bg-zinc-500'
                      }`}
                    />
                    <span className="text-[10px] text-zinc-300 truncate flex-1">
                      {d.deviceModel || 'Device'} · v{d.appVersion}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">{relTime(d.lastSeenAt)}</span>
                  </div>
                ))}
                <p className="text-[9px] text-zinc-600 font-mono">
                  Manage & revoke in the Android App section.
                </p>
              </div>
            )}

            {isSuper && (
              <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-200/80 leading-relaxed">
                Password changes made here are stored as a secure bcrypt hash in MongoDB and take
                effect immediately — the original platform credential stops working right away.
              </div>
            )}
          </div>

          {/* NOTIFICATION CENTER */}
          <div className="rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Notification Center
                  {unreadCount > 0 && (
                    <span className="pb-anim-pop px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">Store events from the last 72 hours.</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={fetchNotifs}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-300 hover:bg-white/5 transition"
                  title="Refresh notifications"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${notifLoading ? 'animate-spin' : ''}`} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[9px] font-mono font-bold hover:bg-amber-400/20 transition"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {notifSummary && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Pending orders', value: notifSummary.pendingOrders, color: 'text-amber-300' },
                  { label: 'New users', value: notifSummary.newUsers, color: 'text-emerald-300' },
                  { label: 'Devices online', value: notifSummary.devicesOnline, color: 'text-blue-300' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-2 rounded-xl bg-[#07090E] border border-white/5 text-center hover:border-white/15 transition"
                  >
                    <div className={`text-base font-extrabold font-mono ${s.color}`}>{s.value ?? 0}</div>
                    <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {visibleNotifs.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-zinc-500">
                No notifications right now — orders, security events and account activity will land here.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {visibleNotifs.map((n, i) => {
                  const meta = NOTIF_META[n.category] || NOTIF_META.admin
                  const Icon = meta.icon
                  const unread = !notifSeenAt || new Date(n.createdAt) > new Date(notifSeenAt)
                  return (
                    <div
                      key={n.id}
                      className={`pb-anim-item relative flex items-start gap-2.5 p-2.5 rounded-xl bg-[#07090E] border border-white/5 border-l-2 ${meta.border} hover:border-white/20 transition group`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {unread && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />}
                          <span className={`text-[11px] font-semibold truncate ${unread ? 'text-white' : 'text-zinc-300'}`}>
                            {n.title}
                          </span>
                          <span className={`text-[8px] font-mono uppercase px-1 py-0.5 rounded ${meta.color} bg-white/5`}>
                            {meta.priority}
                          </span>
                        </div>
                        {n.body && <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>}
                        <div className="text-[9px] text-zinc-600 font-mono mt-0.5">{relTime(n.createdAt)}</div>
                      </div>
                      <button
                        onClick={() => dismissNotif(n.id)}
                        title="Dismiss notification"
                        className="p-1 rounded-md text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-rose-300 hover:bg-white/5 transition shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RECENT ACTIVITY — live timeline */}
          <div
            ref={activityRef}
            className={`rounded-2xl bg-[#0F131D] border border-white/5 p-5 space-y-3 scroll-mt-24 transition ${cardHighlight('activity')}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Recent Activity
                  {liveActivity && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[8px] font-mono font-bold">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">Your last 15 account events.</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setLiveActivity((v) => !v)}
                  title={liveActivity ? 'Pause live updates' : 'Resume live updates (30s)'}
                  className={`relative w-9 rounded-full transition shrink-0 ${liveActivity ? 'bg-emerald-500/80' : 'bg-white/10'}`}
                  style={{ height: '20px' }}
                  aria-pressed={liveActivity}
                >
                  <span
                    className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow transition-all ${
                      liveActivity ? 'left-[18px]' : 'left-[2px]'
                    }`}
                  />
                </button>
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
                  const color = ACTIVITY_COLOR[a.type] || 'text-amber-400'
                  return (
                    <div
                      key={a.id || i}
                      className="pb-anim-item relative flex gap-3 pb-4 last:pb-0 group"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {i < activity.length - 1 && (
                        <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gradient-to-b from-white/10 to-white/5" />
                      )}
                      <div className="w-7 h-7 rounded-lg bg-[#07090E] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/25 group-hover:scale-110 transition">
                        <Icon className={`w-3.5 h-3.5 ${color} ${a.type === 'login' ? 'rotate-180' : ''}`} />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="text-xs font-medium text-white">{a.detail}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {relTime(a.createdAt)}
                          {a.meta?.method ? ` · ${a.meta.method}` : ''}
                          {a.meta?.mime ? ` · ${a.meta.mime.split('/')[1]}` : ''}
                        </div>
                      </div>
                      <span
                        className={`ml-auto mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${color.replace('text-', 'bg-')} opacity-60`}
                      />
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
              className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60 active:scale-[0.99]"
            >
              {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>{signingOut ? 'Signing out…' : 'Sign Out of Admin Dashboard'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================ CROP MODAL ============================ */}
      {cropSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCropSrc(null)} />
          <div className="pb-anim-pop relative w-full max-w-sm rounded-2xl bg-[#0F131D] border border-white/10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                Crop your picture
              </h3>
              <button
                onClick={() => setCropSrc(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center">
              <canvas
                ref={(el) => {
                  canvasRef.current = el
                  if (el && cropImgRef.current) {
                    // redraw once canvas mounts
                    setZoom((z) => z)
                  }
                }}
                width={CROP_SIZE}
                height={CROP_SIZE}
                onPointerDown={onCropPointerDown}
                onPointerMove={onCropPointerMove}
                onPointerUp={onCropPointerUp}
                onPointerLeave={onCropPointerUp}
                className="w-64 h-64 rounded-2xl cursor-grab active:cursor-grabbing touch-none border border-white/10 shadow-inner"
              />
            </div>
            {/* Hidden preloader drives the canvas draw */}
            <img
              src={cropSrc}
              alt="Crop source"
              className="hidden"
              ref={(el) => {
                if (el && cropImgRef.current !== el) {
                  cropImgRef.current = el
                  el.onload = () => setZoom((z) => z)
                }
              }}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="flex items-center gap-1">
                  <span
                    className="inline-flex cursor-pointer hover:text-white transition"
                    onClick={() => {
                      setZoom(1)
                      setOffset({ x: 0, y: 0 })
                    }}
                    title="Reset"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </span>
                  Zoom & drag to position
                </span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCropSrc(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-bold hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmCrop}
                className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <Check className="w-4 h-4" /> Crop & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
