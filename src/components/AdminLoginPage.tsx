import React, { useRef, useState, useEffect } from 'react'

/**
 * AdminLoginPage — "PlayBeat Digital — Admin Login" design implementation.
 * The page is ONE pixel-perfect artwork (1536×1024, webp) with the real
 * username/password fields, status line and login button overlaid at the
 * design's exact coordinates. Wired to the production admin auth API
 * (POST /api/auth/admin/login) with the same hardening as AdminLogin:
 * 5-attempt lockout (60s), password scrub, token-only persistence.
 */

interface AdminLoginPageProps {
  onSuccess: (admin: { email: string; name: string }) => void
  onCancel: () => void
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState('playbeat.digital')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)
  const [errField, setErrField] = useState<'' | 'user' | 'pass'>('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Lockout countdown
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

  // Scrub typed values on unmount
  useEffect(() => {
    return () => {
      if (passwordRef.current) passwordRef.current.value = ''
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setMessageOk(false)

    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
      setMessage(`Too many failed attempts. Try again in ${secs}s.`)
      return
    }

    const email = username.trim()
    if (!email || !password) {
      setErrField(!email ? 'user' : 'pass')
      setMessage('Enter your username and password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => null)

      // Always scrub the password, whatever the outcome
      setPassword('')
      if (passwordRef.current) passwordRef.current.value = ''

      if (!res.ok || !data?.success) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= 5) {
          setLockedUntil(Date.now() + 60_000)
          setMessage('Maximum login attempts exceeded. Account locked for 60 seconds.')
        } else {
          setMessage(data?.error || 'Invalid credentials or server unavailable.')
        }
        return
      }

      // Persist token + session (never the password)
      if (data.token) localStorage.setItem('playbeat_admin_token', data.token)
      localStorage.setItem(
        'playbeat_admin_session',
        JSON.stringify({
          email: data.admin?.email || email,
          name: data.admin?.name || 'Super Administrator',
          ts: Date.now(),
        })
      )
      if (usernameRef.current) usernameRef.current.value = ''

      setMessageOk(true)
      setMessage('Access granted. Redirecting…')
      onSuccess({
        email: data.admin?.email || email,
        name: data.admin?.name || 'PlayBeat Super Administrator',
      })
    } catch (err: any) {
      setPassword('')
      if (passwordRef.current) passwordRef.current.value = ''
      setMessage(err?.message || 'Invalid credentials or server unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const isLocked = !!lockedUntil && Date.now() < lockedUntil

  return (
    <div className="pb-al-min min-h-screen bg-[#020817] overflow-x-hidden">
      <main className="pb-al-stage" style={{ backgroundImage: 'url(/admin_login_design.webp)' }}>
        <h1 className="sr-only">PlayBeat Digital Admin Panel — Sign In</h1>

        <form noValidate onSubmit={handleSubmit}>
          {/* Username overlay */}
          <div className={`pb-al-fld pb-al-u ${errField === 'user' ? 'pb-al-err' : ''}`}>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setErrField('')
                setMessage('')
              }}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Username or email"
              autoComplete="username"
              spellCheck={false}
            />
          </div>

          {/* Password overlay + eye toggle */}
          <div className={`pb-al-fld pb-al-p ${errField === 'pass' ? 'pb-al-err' : ''}`}>
            <input
              ref={passwordRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrField('')
                setMessage('')
              }}
              placeholder="Enter your password"
              aria-label="Password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="pb-al-eye"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </svg>
              )}
            </button>
          </div>

          {/* Status line */}
          <div className={`pb-al-msg ${messageOk ? 'pb-al-msg-ok' : ''}`} role="alert">
            {message}
          </div>

          {/* Login button */}
          <button
            className={`pb-al-go ${loading ? 'pb-al-go-ld' : ''}`}
            type="submit"
            aria-label="Login"
            disabled={loading || isLocked}
          >
            <i />
            <span>{loading ? 'Signing in…' : isLocked ? 'Locked' : 'Login'}</span>
          </button>
        </form>

        {/* Footer link back to the storefront */}
        <button type="button" className="pb-al-lnk" aria-label="playbeat.digital" onClick={onCancel} />
      </main>
    </div>
  )
}
