import React, { useState } from 'react'
import { Sparkles, ShieldCheck, Zap, Gift, CheckCircle2, ArrowRight, Lock } from 'lucide-react'

interface SocialSignUpSectionProps {
  onSocialAuth: (provider: 'Google' | 'Facebook' | 'TikTok' | 'Instagram', user: { name: string; email: string }) => void
  user: { name: string; email: string } | null
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export const SocialSignUpSection: React.FC<SocialSignUpSectionProps> = ({
  onSocialAuth,
  user,
}) => {
  const [emailInput, setEmailInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeProvider, setActiveProvider] = useState<string | null>(null)

  const handleProviderClick = async (provider: 'Google' | 'Facebook' | 'TikTok' | 'Instagram') => {
    setActiveProvider(provider)
    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          profile: { name: `${provider} Member`, email: `${provider.toLowerCase()}.member@playbeat.digital` },
        }),
      })
      const data = await res.json()
      if (data?.success && data?.user) {
        // Persist token
        if (data.token) localStorage.setItem('playbeat_user_token', data.token)
        localStorage.setItem('playbeat_user', JSON.stringify({ name: data.user.name, email: data.user.email }))
        onSocialAuth(provider, { name: data.user.name, email: data.user.email })
      } else {
        // fallback gracefully
        onSocialAuth(provider, { name: `${provider} Member`, email: `${provider.toLowerCase()}@playbeat.digital` })
      }
    } catch {
      // network failure — fall back to local account
      onSocialAuth(provider, { name: `${provider} Member`, email: `${provider.toLowerCase()}@playbeat.digital` })
    } finally {
      setIsSubmitting(false)
      setActiveProvider(null)
    }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) return
    setIsSubmitting(true)
    setTimeout(() => {
      const cleanName = emailInput.split('@')[0] || 'PlayBeat Member'
      onSocialAuth('Google', { name: cleanName, email: emailInput.trim() })
      setEmailInput('')
      setIsSubmitting(false)
    }, 600)
  }

  return (
    <section id="social-signup-section" className="w-full py-10 my-4">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#0B132B] via-[#070D1F] to-[#040814] border border-amber-400/25 p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,193,7,0.12)]">
        {/* Background Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>JOIN PLAYBEAT CLUB</span>
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Sign Up in Seconds & Unlock VIP Perks
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Connect your preferred social account for 1-click registration, instant 15-second digital license delivery, and automated warranty tracking.
          </p>
        </div>

        {/* Already Logged In State */}
        {user ? (
          <div className="max-w-xl mx-auto p-6 rounded-2xl bg-[#091026] border border-emerald-500/30 text-center space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                You're Signed in as <span className="text-amber-400">{user.name}</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> VIP Member Pricing Active
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Instant Delivery Enabled
              </span>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 4 Social Sign Up Buttons Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Google Button */}
              <button
                id="social-signup-google-btn"
                type="button"
                disabled={isSubmitting}
                onClick={() => handleProviderClick('Google')}
                className="group relative flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-[#0A1224] hover:bg-[#0F1C38] border border-slate-700/60 hover:border-blue-400/60 text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-[0_0_20px_rgba(66,133,244,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider font-mono">
                    Sign up with
                  </div>
                  <span className="font-extrabold group-hover:text-blue-300 transition">Google</span>
                </div>
              </button>

              {/* 2. Facebook Button */}
              <button
                id="social-signup-facebook-btn"
                type="button"
                disabled={isSubmitting}
                onClick={() => handleProviderClick('Facebook')}
                className="group relative flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-[#0A1224] hover:bg-[#0E1A3D] border border-slate-700/60 hover:border-[#1877F2]/60 text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-[0_0_20px_rgba(24,119,242,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <svg className="w-5 h-5 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider font-mono">
                    Sign up with
                  </div>
                  <span className="font-extrabold group-hover:text-blue-400 transition">Facebook</span>
                </div>
              </button>

              {/* 3. TikTok Button */}
              <button
                id="social-signup-tiktok-btn"
                type="button"
                disabled={isSubmitting}
                onClick={() => handleProviderClick('TikTok')}
                className="group relative flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-[#0A1224] hover:bg-[#161228] border border-slate-700/60 hover:border-pink-500/60 text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-[0_0_20px_rgba(255,0,80,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <div className="relative w-5 h-5 shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-.85-.06A6.34 6.34 0 0 0 3.15 15.7a6.34 6.34 0 0 0 10.82 4.48c1.77-1.74 2.34-4.14 2.34-6.51V8.65c1.47 1.05 3.27 1.68 5.28 1.72V6.92a4.85 4.85 0 0 1-2-.23z" />
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider font-mono">
                    Sign up with
                  </div>
                  <span className="font-extrabold group-hover:text-pink-300 transition">TikTok</span>
                </div>
              </button>

              {/* 4. Instagram Button */}
              <button
                id="social-signup-instagram-btn"
                type="button"
                disabled={isSubmitting}
                onClick={() => handleProviderClick('Instagram')}
                className="group relative flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-[#0A1224] hover:bg-[#1C1028] border border-slate-700/60 hover:border-pink-500/60 text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-[0_0_20px_rgba(225,48,108,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="ig-grad-sec" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#fdf497" />
                      <stop offset="5%" stopColor="#fdf497" />
                      <stop offset="45%" stopColor="#fd5949" />
                      <stop offset="60%" stopColor="#d6249f" />
                      <stop offset="90%" stopColor="#285AEB" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad-sec)" strokeWidth="2" fill="none" />
                  <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad-sec)" strokeWidth="2" fill="none" />
                  <circle cx="18" cy="6" r="1.2" fill="url(#ig-grad-sec)" />
                </svg>
                <div className="text-left leading-tight">
                  <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider font-mono">
                    Sign up with
                  </div>
                  <span className="font-extrabold group-hover:text-purple-300 transition">Instagram</span>
                </div>
              </button>
            </div>

            {/* Email Alternative Form */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-700/50"></div>
                <span className="flex-shrink mx-4 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Or Sign Up with Email
                </span>
                <div className="flex-grow border-t border-slate-700/50"></div>
              </div>

              <form onSubmit={handleEmailSubmit} className="mt-3 flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email for instant sign up..."
                  className="flex-1 bg-[#060B1E] border border-slate-700/70 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition font-sans"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl btn-gold-gradient text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition disabled:opacity-50 shrink-0"
                >
                  <span>{isSubmitting ? 'Connecting...' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* 4 Feature Pillars under the Sign Up */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-[11px]">
              <div className="flex items-center gap-2 text-slate-300">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>15s Instant Key Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Genuine Licenses</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Gift className="w-4 h-4 text-purple-400 shrink-0" />
                <span>VIP Member Discounts</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Encrypted Cloud Vault</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
