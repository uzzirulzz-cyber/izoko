import React, { useState } from 'react'
import {
  DatabaseBackup,
  Plus,
  RotateCcw,
  Trash2,
  Loader2,
  ShieldCheck,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

interface BackupPanelProps {
  backups: any[]
  loading: boolean
  isSuperAdmin: boolean
  onToast: (msg: string) => void
  onChanged: () => void
}

export const BackupPanel: React.FC<BackupPanelProps> = ({
  backups,
  loading,
  isSuperAdmin,
  onToast,
  onChanged,
}) => {
  const [creating, setCreating] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [busy, setBusy] = useState(false)
  const [restoreName, setRestoreName] = useState('')

  const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
  const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify(restoreName.trim() ? { name: restoreName.trim() } : {}),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(data.message || 'Restore point created.')
        setRestoreName('')
        onChanged()
      } else {
        onToast(data?.error || 'Failed to create restore point.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async () => {
    if (!restoreTarget) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/backup/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ backupId: restoreTarget.id }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast(data.message || 'Database restored successfully.')
        onChanged()
      } else {
        onToast(data?.error || 'Restore failed.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setBusy(false)
      setRestoreTarget(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/backup/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify({ backupId: deleteTarget.id }),
      })
      const data = await res.json()
      if (data?.success) {
        onToast('Restore point deleted.')
        onChanged()
      } else {
        onToast(data?.error || 'Failed to delete restore point.')
      }
    } catch (err: any) {
      onToast(err.message || 'Network error')
    } finally {
      setBusy(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-sky-400 inline-block" />
            Database Restore Points
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Snapshot the full catalog, orders, and accounts. Roll the entire database back to any point with one click.
          </p>
        </div>
      </div>

      {/* Create restore point */}
      <div className="rounded-2xl bg-[#0B0F19] border border-sky-500/25 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sky-300 text-xs font-bold font-mono uppercase tracking-wider">
          <DatabaseBackup className="w-4 h-4" /> Create New Restore Point
        </div>
        <p className="text-[11px] text-zinc-400">
          Captures every product, order, user account, and CMS setting currently in MongoDB. A safety snapshot is
          also taken automatically before any restore or replace-all import.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={restoreName}
            onChange={(e) => setRestoreName(e.target.value)}
            placeholder="Label (optional) — e.g. Before flash-sale price update"
            className="flex-1 bg-[#121622] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-400/50 transition"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-black text-xs font-bold transition disabled:opacity-60 shrink-0"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {creating ? 'Snapshotting…' : 'Create Restore Point'}
          </button>
        </div>
      </div>

      {/* Restore points list */}
      <div className="rounded-2xl bg-[#0B0F19] border border-white/5 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Available Restore Points ({backups.length})
          </div>
          {!isSuperAdmin && (
            <span className="text-[10px] text-amber-300/80 font-mono">Restore & delete require super admin</span>
          )}
        </div>

        {loading ? (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading restore points…
          </div>
        ) : backups.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-zinc-500">
            No restore points yet — create the first snapshot above.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {backups.map((b) => (
              <div key={b.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-xs font-bold text-white">{b.name}</span>
                    {b.type !== 'manual' && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[9px] font-mono font-bold uppercase">
                        {String(b.type).replace('auto_', 'auto ')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}
                    </span>
                    <span>{b.counts?.products ?? 0} products</span>
                    <span>{b.counts?.orders ?? 0} orders</span>
                    <span>{b.counts?.users ?? 0} users</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {b.sizeKB ? `${b.sizeKB} KB` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setRestoreTarget(b)}
                    disabled={!isSuperAdmin}
                    title={isSuperAdmin ? 'Restore database to this point' : 'Super admin only'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-400/10 border border-sky-400/30 text-sky-300 hover:bg-sky-400/20 text-[10px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    disabled={!isSuperAdmin}
                    title={isSuperAdmin ? 'Delete this restore point' : 'Super admin only'}
                    className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore confirmation */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#12151f] border border-sky-500/30 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Restore database?</div>
                <div className="text-[11px] text-zinc-400">{restoreTarget.name}</div>
              </div>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-relaxed">
                Products, orders, users, and CMS settings will be rolled back to this snapshot. A safety restore
                point of the current state is created first, so this action is reversible.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRestoreTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-black text-xs font-bold transition disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#12151f] border border-rose-500/30 p-6 shadow-2xl">
            <div className="text-sm font-bold text-white mb-1">Delete restore point?</div>
            <div className="text-[11px] text-zinc-400 mb-5">{deleteTarget.name}</div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
