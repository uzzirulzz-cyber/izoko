import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, LockKeyhole } from 'lucide-react'

interface AdminLoginProps {
  onSuccess: (admin: { email: string; name: string }) => void
  onCancel: () => void
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  // Inject noindex meta tag while on admin login (prevent search indexing)
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow, noarchive'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  // Lockout after 5 failed attempts (60s cooldown)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  useEffect(() => {
    if (!lockedUntil) return
    const t = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(null)
        setAttempts(0)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [lockedUntil])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
      setError(`Too many failed attempts. Try again in ${secs}s.`)
      return
    }

    if (!email.trim() || !password) {
      setError('Both admin email and password are required.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= 5) {
          const until = Date.now() + 60_000
          setLockedUntil(until)
          setError('Maximum login attempts exceeded. Account locked for 60 seconds.')
        } else {
          setError(data.error || 'Invalid administrative credentials.')
        }
        setLoading(false)
        return
      }

      // Persist admin token in localStorage (NOT auto-login for normal users)
      if (data.token) {
        localStorage.setItem('playbeat_admin_token', data.token)
      }
      localStorage.setItem('playbeat_admin_session', JSON.stringify({ email: data.admin?.email || email, name: data.admin?.name || 'Super Administrator', ts: Date.now() }))

      onSuccess({
        email: data.admin?.email || email.trim(),
        name: data.admin?.name || 'PlayBeat Super Administrator',
      })
    } catch (err: any) {
      setError(err.message || 'Network error during admin authentication.')
    } finally {
      setLoading(false)
    }
  }

  const isLocked = !!lockedUntil && Date.now() < lockedUntil

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#040714]/95 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-[24px] bg-[#0B1220] border border-amber-400/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(255,193,7,0.15)] overflow-hidden">
        {/* Top security banner */}
        <div className="px-6 py-3 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-b border-amber-400/30 flex items-center justify-center gap-2">
          <LockKeyhole className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-200 font-bold">
            Restricted Administrative Zone
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
            title="Return to storefront"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#060B1E] border border-amber-400/40 shadow-lg mb-3">
              <img
                src="/playbeat-logo.png"
                alt="PlayBeat"
                className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
              />
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              Admin Console Access
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Authorized super-administrator credentials required. All access attempts are logged.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@playbeat.digital"
                  className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || isLocked}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isLocked ? 'Locked' : 'Authenticate & Enter Console'}</span>
                    {!isLocked && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-400/10 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>JWT Secured • Rate Limited • Audit Logged</span>
          </div>

          <button
            onClick={onCancel}
            className="mt-3 w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition"
          >
            ← Return to public storefront
          </button>
        </div>
      </div>
    </div>
  )
}
