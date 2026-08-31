import React, { useState } from 'react'
import {
  Users2,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Mail,
  IdCard,
  Building2,
  KeyRound,
  Copy,
  CheckCircle2,
  X,
} from 'lucide-react'

interface StaffAccountsPanelProps {
  staff: any[]
  users: any[]
  loading: boolean
  isSuperAdmin: boolean
  onChanged: () => void
  onToast: (msg: string) => void
}

const PERMISSION_OPTIONS = [
  { id: 'orders', label: 'Orders & Fulfillment' },
  { id: 'products', label: 'Catalog Products' },
  { id: 'customers', label: 'Customer Accounts' },
  { id: 'support', label: 'Support Tickets' },
  { id: 'campaigns', label: 'Marketing Campaigns' },
  { id: 'analytics', label: 'Analytics & Traffic' },
]

export const StaffAccountsPanel: React.FC<StaffAccountsPanelProps> = ({
  staff,
  users,
  loading,
  isSuperAdmin,
  onChanged,
  onToast,
}) => {
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    staffId: '',
    department: 'Operations',
  })
  const [permissions, setPermissions] = useState<string[]>(['orders', 'products', 'customers', 'support'])
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; staffId: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
  const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

  const togglePermission = (id: string) => {
    setPermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSuperAdmin) return
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    if (!name || !email || form.password.length < 6) {
      onToast('Name, email, and a password of at least 6 characters are required.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ ...form, permissions }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(`Employee account created — Staff ID ${data.staff?.staffId}`)
        setCreatedCreds({
          email,
          password: form.password,
          staffId: data.staff?.staffId || '',
        })
        setForm({ name: '', email: '', password: '', staffId: '', department: 'Operations' })
        setPermissions(['orders', 'products', 'customers', 'support'])
        onChanged()
      } else {
        onToast(data?.error || 'Failed to create staff account.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ userId: deleteTarget.id }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(`Staff account ${deleteTarget.email} deleted.`)
        onChanged()
      } else {
        onToast(data?.error || 'Failed to delete staff account.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setBusyId(null)
      setDeleteTarget(null)
    }
  }

  const handleToggleActive = async (s: any) => {
    setBusyId(s.id)
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ userId: s.id, active: !(s.active !== false) }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(s.active !== false ? `Account ${s.email} deactivated.` : `Account ${s.email} activated.`)
        onChanged()
      } else {
        onToast(data?.error || 'Failed to update staff account.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setBusyId(null)
    }
  }

  const copyCreds = () => {
    if (!createdCreds) return
    const text = `PlayBeat Staff Account\nStaff ID: ${createdCreds.staffId}\nLogin: ${createdCreds.email}\nPassword: ${createdCreds.password}\nPortal: /admin/login`
    navigator.clipboard?.writeText(text).then(
      () => onToast('Credentials copied — share securely with the employee.'),
      () => onToast('Copy failed — select the text manually.')
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        <span className="ml-3 text-xs font-mono text-zinc-400">Loading staff accounts…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-teal-400 inline-block" />
            Employee Staff Accounts
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Super-administrative control center — create employee logins, set permissions, activate or
            deactivate access instantly.
          </p>
        </div>
        {isSuperAdmin ? (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition shadow-lg shadow-amber-400/10 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            {showCreate ? 'Close Form' : 'Create Staff Account'}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-semibold shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" /> Super admin only
          </span>
        )}
      </div>

      {/* Create form */}
      {showCreate && isSuperAdmin && (
        <div className="rounded-2xl bg-[#0B0F19] border border-teal-500/25 p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold font-mono uppercase tracking-wider">
            <UserPlus className="w-4 h-4" /> New Employee Account
          </div>

          {createdCreds && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> Account created — share these credentials securely
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="rounded-lg bg-black/30 px-3 py-2">
                  <div className="text-zinc-500 text-[9px] uppercase">Staff ID</div>
                  <div className="text-emerald-200">{createdCreds.staffId}</div>
                </div>
                <div className="rounded-lg bg-black/30 px-3 py-2">
                  <div className="text-zinc-500 text-[9px] uppercase">Login Email</div>
                  <div className="text-emerald-200 break-all">{createdCreds.email}</div>
                </div>
                <div className="rounded-lg bg-black/30 px-3 py-2">
                  <div className="text-zinc-500 text-[9px] uppercase">Password</div>
                  <div className="text-emerald-200 break-all">{createdCreds.password}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCreds}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-400/25 transition"
                >
                  <Copy className="w-3 h-3" /> Copy Credentials
                </button>
                <button
                  onClick={() => setCreatedCreds(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-[11px] font-semibold hover:text-white transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                <Users2 className="w-3 h-3" /> Full Name *
              </span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Ahmed Raza"
                className="w-full bg-[#121622] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400/50 transition"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Work Email *
              </span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="employee@playbeat.digital"
                className="w-full bg-[#121622] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400/50 transition"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Password (min 6 chars) *
              </span>
              <input
                type="text"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Set an initial password"
                className="w-full bg-[#121622] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400/50 transition font-mono"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                  <IdCard className="w-3 h-3" /> Staff ID (auto)
                </span>
                <input
                  type="text"
                  value={form.staffId}
                  onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  placeholder="EMP-000123"
                  className="w-full bg-[#121622] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400/50 transition font-mono"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Department
                </span>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full bg-[#121622] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-400/50 transition"
                >
                  {['Operations', 'Support', 'Sales', 'Marketing', 'Fulfillment', 'Finance'].map((d) => (
                    <option key={d} value={d} className="bg-[#121622]">
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Permissions */}
            <div className="sm:col-span-2">
              <span className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1 mb-1.5">
                <ShieldCheck className="w-3 h-3" /> Panel Permissions
              </span>
              <div className="flex flex-wrap gap-2">
                {PERMISSION_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePermission(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                      permissions.includes(p.id)
                        ? 'bg-teal-400/15 border-teal-400/40 text-teal-300'
                        : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-black text-xs font-bold transition disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                {creating ? 'Creating…' : 'Create Account'}
              </button>
              <span className="text-[10px] text-zinc-500">
                Employee logs in via /admin/login with these credentials.
              </span>
            </div>
          </form>
        </div>
      )}

      {/* Staff list */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Team Roster ({staff.length})
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">{users.length} total accounts incl. customers</div>
        </div>
        {staff.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-zinc-500">
            No employee accounts yet — create the first one above.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {staff.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-teal-400/15 border border-teal-400/30 text-teal-300 font-bold flex items-center justify-center text-xs shrink-0">
                    {String(s.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{s.name}</span>
                      {s.role === 'admin' ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[9px] font-mono font-bold">
                          SUPER ADMIN
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-teal-400/15 border border-teal-400/30 text-teal-300 text-[9px] font-mono font-bold">
                          STAFF
                        </span>
                      )}
                      {s.role !== 'admin' && s.active === false && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[9px] font-mono font-bold">
                          DEACTIVATED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="truncate">{s.email}</span>
                      {s.staffId && <span className="text-teal-400">· {s.staffId}</span>}
                      {s.department && <span className="text-zinc-500">· {s.department}</span>}
                    </div>
                  </div>
                </div>
                {s.role !== 'admin' && isSuperAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleActive(s)}
                      disabled={busyId === s.id}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 text-[10px] font-semibold transition disabled:opacity-50"
                    >
                      {busyId === s.id ? '…' : s.active === false ? 'Activate' : 'Deactivate'}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
                      disabled={busyId === s.id}
                      className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
                      title="Delete staff account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#12151f] border border-rose-500/30 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Delete staff account?</div>
                <div className="text-[11px] text-zinc-400">{deleteTarget.name} · {deleteTarget.email}</div>
              </div>
            </div>
            <p className="text-[11px] text-zinc-400 mb-5">
              The employee will immediately lose access to the admin panel. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busyId === deleteTarget.id}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition disabled:opacity-60"
              >
                {busyId === deleteTarget.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
