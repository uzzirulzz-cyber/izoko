import React, { useState, useEffect } from 'react'
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'signup'
  onSuccess: (user: { name: string; email: string }, token?: string) => void
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signup',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // Anti-autofill: credentials stay readOnly until user focus, so browsers
  // never preview/autosave email or password in this modal.
  const [credsLocked, setCredsLocked] = useState(true)
  // Which providers have real OAuth keys configured server-side? Fetched from
  // the backend so unconfigured providers get honest inline guidance instead
  // of a full-page redirect that bounces straight back with an error.
  const [oauthProviders, setOauthProviders] = useState<Record<string, boolean>>({})
  const [socialNotice, setSocialNotice] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSocialNotice('')
    fetch(`${API_BASE}/api/auth/oauth-config`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.providers) setOauthProviders(d.providers)
      })
      .catch(() => setOauthProviders({}))
  }, [isOpen])

  if (!isOpen) return null

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match — please re-enter them.')
      return
    }

    if (mode === 'signup' && !agreeTerms) {
      setError('Please accept the Terms & Conditions and Privacy Policy to continue.')
      return
    }

    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const payload =
        mode === 'signup'
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Authentication failed. Please try again.')
        setLoading(false)
        return
      }

      onSuccess(
        {
          name: data.user?.name || (email.split('@')[0] || 'PlayBeat Member'),
          email: data.user?.email || email.trim(),
        },
        data.token,
      )
      // reset form
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setAgreeTerms(false)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Network error during authentication.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialAuth = (provider: 'Google' | 'Facebook' | 'Instagram') => {
    // REAL OAuth sign-up/sign-in — full-page redirect to the backend start route,
    // which 302s to the provider's consent screen. On approval the provider
    // returns to /api/auth/oauth/:provider/callback where the REAL profile is
    // fetched server-side, a real account is created/linked in MongoDB, the
    // session cookie is set, and the user lands back on /storefront?social_success=Provider.
    setError('')
    setSocialNotice('')
    if (oauthProviders[provider] === false) {
      // Keys not configured on the backend yet — honest inline guidance,
      // no pointless redirect round-trip.
      setSocialNotice(
        `${provider} sign-in is being activated right now. Use the email form below — it takes 10 seconds and works identically.`
      )
      return
    }
    setLoading(true)
    window.location.href = `${API_BASE}/api/auth/oauth/${provider.toLowerCase()}/start`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040714]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-[24px] bg-[#0B1220] border border-slate-400/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(255,193,7,0.15)] overflow-hidden p-6 sm:p-8">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-sky-400/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#060B1E] border border-yellow-400/30 shadow-lg mb-3">
            <img
              src="/playbeat-logo.png"
              alt="PlayBeat"
              className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
            />
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {mode === 'signup' ? 'Create Your PlayBeat Account' : 'Welcome Back to PlayBeat'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            {mode === 'signup'
              ? 'Get instant 15s license deliveries and member discounts'
              : 'Sign in to access your digital library and active subscriptions'}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {!error && socialNotice && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{socialNotice}</span>
          </div>
        )}

        {/* Social Sign In / Sign Up Buttons — Google & Facebook */}
        <div className="space-y-2 mb-5">
          <div className="grid grid-cols-2 gap-2">
            {/* Google */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialAuth('Google')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#060B1E] border border-slate-700/80 hover:border-blue-400/60 hover:bg-[#0E1A38] text-white text-xs font-semibold transition group shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialAuth('Facebook')}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#060B1E] border border-slate-700/80 hover:border-[#1877F2]/60 hover:bg-[#0C1838] text-white text-xs font-semibold transition group shadow-sm"
            >
              <svg className="w-4 h-4 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          {/* Instagram — full-width row so the label never squeezes */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSocialAuth('Instagram')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#060B1E] border border-slate-700/80 hover:border-[#D62976]/60 hover:bg-[#1A0E24] text-white text-xs font-semibold transition group shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <linearGradient id="ig-grad-modal" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FEDA75" />
                  <stop offset="25%" stopColor="#FA7E1E" />
                  <stop offset="50%" stopColor="#D62976" />
                  <stop offset="75%" stopColor="#962FBF" />
                  <stop offset="100%" stopColor="#4F5BD5" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-grad-modal)" />
              <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
              <circle cx="17.2" cy="6.8" r="1.15" fill="#fff" />
            </svg>
            <span>Instagram</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-700/60"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Or with email
            </span>
            <div className="flex-grow border-t border-slate-700/60"></div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailSubmit} autoComplete="off" className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ali Khan"
                  className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition font-sans"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setCredsLocked(false)}
                autoComplete="off"
                readOnly={credsLocked}
                placeholder="you@example.com"
                className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition font-sans"
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
                onFocus={() => setCredsLocked(false)}
                autoComplete="new-password"
                readOnly={credsLocked}
                placeholder="••••••••••••"
                className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition font-sans"
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

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1.5 tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setCredsLocked(false)}
                  autoComplete="new-password"
                  readOnly={credsLocked}
                  placeholder="••••••••••••"
                  className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-500 bg-[#060B1E] accent-yellow-400 shrink-0"
              />
              <span className="text-[11px] text-slate-400 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">Terms &amp; Conditions</a>
                {' '}and the{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">Privacy Policy</a>.
              </span>
            </label>
          )}

          {/* Submit Button with Hover Water Glow */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Free Account' : 'Sign In to Store'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Mode Toggle */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'signup' ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError('')
                }}
                className="text-yellow-400 hover:text-yellow-300 font-semibold underline underline-offset-2 ml-1"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New to PlayBeat?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError('')
                }}
                className="text-yellow-400 hover:text-yellow-300 font-semibold underline underline-offset-2 ml-1"
              >
                Sign Up Free
              </button>
            </span>
          )}
        </div>

        {/* Security Assurance */}
        <div className="mt-5 pt-4 border-t border-slate-400/10 flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          <span>256-Bit Encrypted Secure Authentication</span>
        </div>
      </div>
    </div>
  )
}
