import React, { useState } from 'react'

interface AdminLoginPageProps {
  onSuccess: (admin: { email: string; name: string }) => void
  onCancel: () => void
}
const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const PROFILES = [
  { id: 'qazi', name: 'Qazi', title: 'CEO' },
  { id: 'creed', name: 'Creed', title: 'Founder' },
  { id: 'mahbuba', name: 'Mahbuba', title: 'Director' },
] as const

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess, onCancel }) => {
  const [profile, setProfile] = useState<string>('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const selected = PROFILES.find(x => x.id === profile)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selected || !/^\d{5}$/.test(pin)) { setError('Select a profile and enter the five-digit PIN.'); return }
    if (Date.now() < lockedUntil) { setError('Too many attempts. Try again later.'); return }
    setLoading(true);setError('')
    try {
      const response = await fetch(`${API_BASE}/api/auth/admin/executive-pin`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, pin })
      })
      const result = await response.json().catch(() => null)
      setPin('')
      if (!response.ok || !result?.success || !result?.token) {
        const count = attempts + 1
        setAttempts(count)
        if (count >= 5) setLockedUntil(Date.now() + 15 * 60_000)
        setError(result?.error || 'Incorrect PIN or server unavailable.')
        return
      }
      localStorage.setItem('playbeat_admin_token', result.token)
      localStorage.setItem('playbeat_admin_session', JSON.stringify({
        email: result.admin.email, name: result.admin.name, ts: Date.now()
      }))
      onSuccess({ email: result.admin.email, name: result.admin.name })
    } catch {
      setPin('')
      setError('Authentication service unavailable.')
    } finally { setLoading(false) }
  }
  return <main className="min-h-screen bg-[#050b1c] text-white flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-2xl rounded-3xl border border-blue-400/20 bg-[#0a1530] p-6 sm:p-10 shadow-2xl">
      <div className="text-center mb-8">
        <div className="text-sm font-bold tracking-[.2em] text-blue-300">PLAYBEAT DIGITAL</div>
        <h1 className="text-3xl font-bold mt-3">Select your profile</h1>
        <p className="text-slate-400 mt-2">Executive dashboard · Secure PIN access</p>
      </div>
      <section aria-label="Select executive profile" className="grid grid-cols-3 gap-3 sm:gap-5 mb-8">
        {PROFILES.map(person => <button key={person.id} type="button" onClick={() => { setProfile(person.id);setPin('');setError('') }}
          aria-pressed={profile === person.id}
          className={`rounded-2xl border p-3 sm:p-5 text-center transition ${profile === person.id ? 'border-sky-400 bg-blue-500/20 ring-2 ring-sky-400/40' : 'border-slate-600/60 bg-[#101f3f] hover:border-blue-400'}`}>
          <img src={`/executives/${person.id}.jpg`} alt={person.name} className="mx-auto h-16 w-16 sm:h-24 sm:w-24 rounded-full object-cover bg-slate-700 border-2 border-white/15"
            onError={e => { e.currentTarget.style.opacity = '0.2' }} />
          <span className="block font-bold mt-3 text-sm sm:text-lg">{person.name}</span>
          <span className="block text-slate-400 text-xs sm:text-sm">{person.title}</span>
        </button>)}
      </section>
      {selected && <form onSubmit={submit} className="max-w-xs mx-auto">
        <label htmlFor="admin-pin" className="block text-sm text-slate-300 mb-2">{selected.name} — Enter PIN</label>
        <input id="admin-pin" autoFocus type="password" inputMode="numeric" pattern="[0-9]{5}" autoComplete="off" required maxLength={5} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,5))}
          className="w-full rounded-xl border border-blue-400/40 bg-[#050d21] px-4 py-4 text-center text-2xl tracking-[.6em] outline-none focus:border-sky-400"
          placeholder="•••••" aria-label="Five-digit PIN" />
        {error && <p className="text-rose-300 text-sm mt-3" role="alert">{error}</p>}
        <button type="submit" disabled={loading || pin.length !== 5 || Date.now() < lockedUntil}
          className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50">
          {loading ? 'Verifying…' : 'Unlock dashboard'}
        </button>
      </form>}
      <button type="button" onClick={onCancel} className="block mx-auto mt-7 text-sm text-slate-400 hover:text-white">Back to store</button>
    </div>
  </main>
}
