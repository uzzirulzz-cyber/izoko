import React, { useState, useEffect, useRef } from 'react'
import { X, Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff, LockKeyhole, LogOut, Shield, User } from 'lucide-react'

interface AdminLoginProps {
  onSuccess: (admin: { email: string; name: string }) => void
  onCancel: () => void
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  // Use uncontrolled inputs with refs to defeat browser autofill/credential managers.
  // We never store the password in React state, never persist it, and clear it from
  // the DOM immediately after submit.
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  // Real OAuth availability from the backend (honest: the Google button only
  // appears when the server reports Google keys configured).
  const [googleReady, setGoogleReady] = useState<boolean | null>(null)

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

  // Which social providers are actually configured server-side?
  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/api/auth/oauth-config`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setGoogleReady(Boolean(d?.providers?.Google))
      })
      .catch(() => {
        if (alive) setGoogleReady(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // Defeat browser autofill/credential manager:
  // 1. Set autocomplete="off" on the entire form via attribute
  // 2. Use fake hidden honeypot fields to confuse password managers
  // 3. Randomize input names so browsers can't recognize them as login fields
  // 4. Clear fields after every submit attempt
  const formRef = useRef<HTMLFormElement>(null)
  const [fieldNonce] = useState(() => Math.random().toString(36).slice(2, 10))

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

  // On unmount, scrub any values that might have been typed
  useEffect(() => {
    return () => {
      if (emailRef.current) emailRef.current.value = ''
      if (passwordRef.current) passwordRef.current.value = ''
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const email = emailRef.current?.value || ''
    const password = passwordRef.current?.value || ''

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

      // ALWAYS clear the password field immediately, regardless of outcome
      if (passwordRef.current) passwordRef.current.value = ''

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

      // Persist admin token ONLY (never the password). Token is JWT, expires in 7d,
      // and is verified against /api/auth/admin/me on every admin route visit.
      if (data.token) {
        localStorage.setItem('playbeat_admin_token', data.token)
      }
      localStorage.setItem(
        'playbeat_admin_session',
        JSON.stringify({
          email: data.admin?.email || email,
          name: data.admin?.name || 'Super Administrator',
          ts: Date.now(),
          // NO password stored anywhere
        })
      )

      // Also clear email field for good measure
      if (emailRef.current) emailRef.current.value = ''

      onSuccess({
        email: data.admin?.email || email.trim(),
        name: data.admin?.name || 'PlayBeat Super Administrator',
      })
    } catch (err: any) {
      if (passwordRef.current) passwordRef.current.value = ''
      setError(err.message || 'Network error during admin authentication.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // Real OAuth — the server sets the httpOnly adminToken cookie for authorized
    // accounts and bounces back to /?admin_oauth=Google (handled by App.tsx).
    window.location.href = `${API_BASE}/api/auth/oauth/google/start`
  }

  const handleLogout = async () => {
    // Tell backend to clear the adminToken cookie too
    try {
      await fetch(`${API_BASE}/api/auth/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // ignore
    }
    localStorage.removeItem('playbeat_admin_token')
    localStorage.removeItem('playbeat_admin_session')
    onCancel()
  }

  const isLocked = !!lockedUntil && Date.now() < lockedUntil

  return (
    <div className="pb-adminlogin fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden bg-[#020617] animate-in fade-in duration-200">
      {/* Premium dark backdrop — layered glows + tech grid (matches the brand login art) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(14,165,233,0.16),transparent_50%)] pointer-events-none" />
      <div className="absolute top-[-10%] left-[-5%] w-[34rem] h-[34rem] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[30rem] h-[30rem] bg-sky-500/15 rounded-full blur-[110px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.13] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(96,165,250,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.35) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Brand block above the card — PlayBeat 3D mark + eyebrow */}
        <div className="text-center mb-5">
          <img
            src="/assets/images/playbeat/playbeat-3d-mark.png"
            alt="PlayBeat Digital"
            className="h-16 mx-auto object-contain drop-shadow-[0_0_22px_rgba(59,130,246,0.55)] animate-[adminLogoFloat_5s_ease-in-out_infinite]"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 backdrop-blur">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-300">Admin Panel</span>
          </div>
          <p className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-blue-200/50">
            Authorized Personnel Only
          </p>
        </div>

        <div className="relative rounded-[24px] bg-[#0b1226]/90 border border-blue-400/20 shadow-[0_30px_80px_-20px_rgba(2,8,32,0.9),0_0_60px_-10px_rgba(37,99,235,0.35)] backdrop-blur-xl overflow-hidden">
          {/* Top security banner */}
          <div className="px-6 py-3 bg-gradient-to-r from-blue-600/15 via-sky-500/10 to-blue-600/15 border-b border-blue-400/15 flex items-center justify-center gap-2">
            <LockKeyhole className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-sky-300 font-bold">
              Restricted Administrative Zone
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 p-2 text-slate-500 hover:text-slate-200 rounded-xl hover:bg-white/5 transition"
              title="Return to storefront"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-6">
              <h3 className="text-2xl font-extrabold text-white tracking-tight">Sign In</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Access your PlayBeat Digital admin panel
              </p>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">
                Credentials are never saved, autofilled, or persisted by this form.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="space-y-4"
            >
              {/* Honeypot #1 — fake username to confuse Chrome */}
              <input
                type="text"
                name={`user_${fieldNonce}`}
                autoComplete="off"
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
                aria-label="ignore"
              />
              {/* Honeypot #2 — fake password to soak up credential manager */}
              <input
                type="password"
                name={`pwd_${fieldNonce}`}
                autoComplete="new-password"
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
                aria-label="ignore"
              />

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 tracking-wider">
                  Administrator Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={emailRef}
                    type="text"
                    name={`adm_${fieldNonce}`}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    required
                    placeholder="playbeat.digital"
                    className="w-full bg-[#0a0f22] border border-blue-400/20 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    name={`key_${fieldNonce}`}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    placeholder="Enter your password"
                    className="w-full bg-[#0a0f22] border border-blue-400/20 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || isLocked}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2563eb] via-[#3d7ff7] to-[#0ea5e9] text-white font-bold text-xs sm:text-sm shadow-[0_10px_35px_-8px_rgba(59,130,246,0.65)] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>{isLocked ? 'Locked' : 'Login'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Real Google OAuth — rendered only when the backend reports it configured */}
            {googleReady !== null && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-blue-400/15" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">or</span>
                  <div className="h-px flex-1 bg-blue-400/15" />
                </div>
                {googleReady ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 rounded-xl bg-white text-slate-800 font-semibold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2.5 hover:bg-slate-100 active:scale-[0.98] transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z" />
                      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.97 11.97 0 0 0 0 10.76l3.98-3.09Z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                ) : (
                  <p className="text-center text-[10px] text-slate-500 font-mono">
                    Google sign-in activates automatically once OAuth keys are configured.
                  </p>
                )}
              </>
            )}

            <div className="mt-5 pt-4 border-t border-blue-400/15 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Secure Access • JWT Secured • Rate Limited • Audit Logged</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onCancel}
                className="flex-1 text-center text-[11px] text-slate-500 hover:text-slate-200 transition py-2 rounded-lg hover:bg-white/5"
              >
                ← Return to public storefront
              </button>
              <button
                onClick={handleLogout}
                className="text-[11px] text-rose-400/70 hover:text-rose-300 transition py-2 px-3 rounded-lg hover:bg-rose-500/10 flex items-center gap-1"
                title="Clear any saved admin session and return to storefront"
              >
                <LogOut className="w-3 h-3" />
                Force Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
