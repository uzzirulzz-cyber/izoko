import React, { useState } from 'react'

interface AdminLoginPageProps {
  onSuccess: (admin: { email: string; name: string }) => void
  onCancel: () => void
}

const EXEC_AVATARS = {"qazi":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABYPEBMQDhYTEhMYFxYaIDYjIB4eIEIvMic2TkVSUU1FTEpWYXxpVlx1XUpMbJNtdYCEi4yLVGiZo5eHonyIi4b/2wBDARcYGCAcID8jIz+GWUxZhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhob/wAARCAAwACYDASIAAhEBAxEB/8QAGgABAAMBAQEAAAAAAAAAAAAABQADBAIGAf/EACcQAAIBAwMEAQUBAAAAAAAAAAECAwAEERIhMQUTIkFRFBUjMmGx/8QAFwEBAQEBAAAAAAAAAAAAAAAAAgABA//EABkRAAMBAQEAAAAAAAAAAAAAAAABEQIhA//aAAwDAQACEQMRAD8ALcgFzt/BWyxufpJtUwV9PA1CjpZDETGMHIwc1zGxeUKoLH0MVBPXpfW07IElGp/RHFZpndncs2EHG+1DW79pnMitlRsMYrfCpu1ijn8VOwVTzt7rnrXYPKKJbxi2m3GccmpX2XqNj09uyY3Lgb4WpVGIwPAZZwEQt62+TXdjC0F3hmDuAdKlvY/tJm2SKNpCmCATzQEFw0cqyj9kbNPPQvjF1vSGWLRmVjsgGc54q3uPHLCxXyD+WngUTPN3OpxnGTrQZpnX2l0EK2Wyc0N5SaK1h972nuZHVUYkgZZTxUra0VqZfxoVJGW8id6lRr6zQW1giTAFecukSKaRIwQoY4B5pO6uyrEH/KIlbMrE8k0vNQDdZb00r9xiLjVuefnFNzFXUgUBYEi9j+QadNxnAODn3Q9V2kVNJ2sHSQSMHFSqZpWeVsED4NSsRtZ//9k=","creed":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABYPEBMQDhYTEhMYFxYaIDYjIB4eIEIvMic2TkVSUU1FTEpWYXxpVlx1XUpMbJNtdYCEi4yLVGiZo5eHonyIi4b/2wBDARcYGCAcID8jIz+GWUxZhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhob/wAARCAAvADADASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAABAUGAwIA/8QALRAAAgEDAgQDCAMAAAAAAAAAAQIDAAQREiEFEzFBBiLBFGFxc4GhseEkUXL/xAAWAQEBAQAAAAAAAAAAAAAAAAACAAH/xAAZEQEBAQEBAQAAAAAAAAAAAAABABECMUH/2gAMAwEAAhEDEQA/AK2p6wGY3+Y35p6HzSPhxzE/zX/NVQ3Gh/Hb/PrSWIqy7EGn/FLYXQETTcpdOS3pSc2nsM6yQOsoGQ2oBqO4yxS505Fa2ogvJsahbjTkg743x+63Sa7lXVFCGHTKwg+lYve3SMVZtDDqNIBH2qdoKvklRAd9zUxFeFGKhgPMTj90+vZLWNSlw4V3HlyOuKk5opBCWXzSZI2YVsIqbjMckyxiEyZGDnpQl3fE2+pUCrqwcDAOe32ofh9rMbyHmRlRrBLHpge+mPiqGKFYBCMIctt0ztU8mzOkMsuG8YuIngt49HLeQAgrvud62Jim4rf8wKwU7Z+NT0cjJKrId1II+NFyMksjShHGs5ODmtsqrxEQ9vE6gnQ2CfcaQmXA/uqHi8ZjsZuYMjTtg96jjO+d1B+takRjy+a64jHPfWVoIlL8sMpx2370vFyR1U0RDfEQOi6sHt0+uaLvyZj7BTWslpJpmwCQCMHOQe9aW8g5ZzgYOxrKbW75ds4GBmvSFhEhIwO2KrL/2Q==","mahbuba":"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABYPEBMQDhYTEhMYFxYaIDYjIB4eIEIvMic2TkVSUU1FTEpWYXxpVlx1XUpMbJNtdYCEi4yLVGiZo5eHonyIi4b/2wBDARcYGCAcID8jIz+GWUxZhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhoaGhob/wAARCAAwABsDASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAgQFBgMB/8QAKBAAAgECBQMDBQAAAAAAAAAAAQIAAxEEBRIhMRNRgSJBcRRDUmHB/8QAFwEBAQEBAAAAAAAAAAAAAAAABAABA//EABwRAAMBAQEAAwAAAAAAAAAAAAABAhEDEiExQf/aAAwDAQACEQMRAD8ARweFfF1hTTyewloZPhERVdzrbglrX+BFMlIVKhB3vuJMzDErmOZjq1ekiNpUnhQPj9wle7tpPEjVCmU3+lHMMrOGXqUyWT3vyJNtNdURWoFSbqU2PiZVl3MuHV0sZXzX2gsHX6FUMb6fe0l4zp6qbU2JZ1LOOxJP8tGuoCux9RGwk4ox1E3uOYhT86Z62cNYcw14KklM/bAv4iBUE8xbAORhvVwDt8Qfrh+F/M4zzxtIS7nFosrC8DUDSqsRuTtOCuV4hBxoKkcxQPBo1iaSqBbbecoAqCwvPda95Ef/2Q=="};
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
    <div className="w-full max-w-3xl rounded-[28px] border border-blue-300/20 bg-[linear-gradient(145deg,#132440,#091329_85%)] p-6 sm:p-12 shadow-[0_35px_110px_rgba(0,0,0,.58),inset_0_1px_rgba(255,255,255,.07)]">
      <div className="text-center mb-8">
        <div className="text-sm font-bold tracking-[.2em] text-blue-300">PLAYBEAT DIGITAL</div>
        <h1 className="text-3xl font-bold mt-3">Select your profile</h1>
        <p className="text-slate-400 mt-2">Executive dashboard · Secure PIN access</p>
      </div>
      <section aria-label="Select executive profile" className="grid grid-cols-3 gap-3 sm:gap-6 mb-9">
        {PROFILES.map(person => <button key={person.id} type="button" onClick={() => { setProfile(person.id);setPin('');setError('') }}
          aria-pressed={profile === person.id}
          className={`rounded-2xl border p-3 sm:p-5 text-center transition ${profile === person.id ? 'border-sky-400 bg-blue-500/20 ring-2 ring-sky-400/40' : 'border-slate-600/60 bg-[#101f3f] hover:border-blue-400'}`}>
          <img src={EXEC_AVATARS[person.id]} alt={person.name} className="mx-auto h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover bg-slate-700 border-[3px] border-sky-300/70 ring-[5px] ring-blue-500/10 shadow-lg"
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
