import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Folder,
  FolderPlus,
  FolderInput,
  Pencil,
  ChevronRight,
  Upload,
  Download,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  FileSpreadsheet,
  Presentation,
  Package,
  FileArchive,
  File,
  CloudUpload,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react'

interface DocumentsPanelProps {
  onToast: (msg: string) => void
}

interface DocMeta {
  id: string
  name: string
  ext: string
  group: string
  mime: string
  size: number
  folderId: string | null
  folderName: string | null
  uploadedBy: { name?: string; email?: string }
  uploadedAt: string
  downloads: number
}

interface FolderMeta {
  id: string
  name: string
  createdBy?: { name?: string; email?: string }
  createdAt: string
  fileCount: number
  totalBytes: number
}

interface VaultStats {
  count: number
  totalBytes: number
  byGroup: Record<string, { count: number; bytes: number }>
}

interface UploadJob {
  key: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'done' | 'error'
  error?: string
  dest?: string
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

/** 2MB raw chunks — base64-wrapped into a ~2.7MB JSON body, safely under the
 *  Vercel serverless 4.5MB request limit. */
const CHUNK_BYTES = 2 * 1024 * 1024
const MAX_FILE_BYTES = 50 * 1024 * 1024

const ALLOWED_EXT = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'apk', 'zip', 'rar', '7z', 'txt', 'csv',
]

const GROUP_META: Record<string, { label: string; icon: any; text: string; bg: string; ring: string }> = {
  pdf: { label: 'PDF', icon: FileText, text: 'text-rose-300', bg: 'bg-rose-500/15', ring: 'border-rose-400/30' },
  word: { label: 'Word', icon: FileText, text: 'text-blue-300', bg: 'bg-blue-500/15', ring: 'border-blue-400/30' },
  excel: { label: 'Excel', icon: FileSpreadsheet, text: 'text-emerald-300', bg: 'bg-emerald-500/15', ring: 'border-emerald-400/30' },
  slides: { label: 'Slides', icon: Presentation, text: 'text-orange-300', bg: 'bg-orange-500/15', ring: 'border-orange-400/30' },
  apk: { label: 'APK', icon: Package, text: 'text-lime-300', bg: 'bg-lime-500/15', ring: 'border-lime-400/30' },
  archive: { label: 'Archive', icon: FileArchive, text: 'text-amber-300', bg: 'bg-amber-500/15', ring: 'border-amber-400/30' },
  text: { label: 'Text', icon: File, text: 'text-zinc-300', bg: 'bg-zinc-500/15', ring: 'border-zinc-400/30' },
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pdf', label: 'PDF' },
  { key: 'word', label: 'Word' },
  { key: 'excel', label: 'Excel' },
  { key: 'slides', label: 'Slides' },
  { key: 'apk', label: 'APK' },
  { key: 'archive', label: 'ZIP / RAR' },
  { key: 'text', label: 'Text / CSV' },
]

const fmtBytes = (b: number) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`

const fmtDate = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '')

const isAllowed = (name: string) => ALLOWED_EXT.includes(extOf(name))

function newSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch { /* fall through */ }
  return `pb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Reads one slice of the file as base64 (avatar-upload proven path). */
function sliceToBase64(file: File, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result || '').split(',')[1] || '')
    fr.onerror = () => reject(new Error('Could not read the file from disk'))
    fr.readAsDataURL(file.slice(start, end))
  })
}

/** POST one chunk with real upload progress. */
function postChunk(sessionId: string, seq: number, data: string, onFrac: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/admin/documents/chunk`)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Authorization', `Bearer ${getAdminToken()}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onFrac(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let msg = `Chunk upload failed (${xhr.status})`
      try { msg = JSON.parse(xhr.responseText)?.message || msg } catch { /* keep */ }
      reject(new Error(msg))
    }
    xhr.onerror = () => reject(new Error('Network error while uploading'))
    xhr.send(JSON.stringify({ sessionId, seq, data }))
  })
}

export function DocumentsPanel({ onToast }: DocumentsPanelProps) {
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [folders, setFolders] = useState<FolderMeta[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [currentFolderName, setCurrentFolderName] = useState('')
  const [stats, setStats] = useState<VaultStats>({ count: 0, totalBytes: 0, byGroup: {} })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const [uploads, setUploads] = useState<UploadJob[]>([])
  const [dragging, setDragging] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<DocMeta | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- folder management state ----
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [renameTarget, setRenameTarget] = useState<FolderMeta | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderMeta | null>(null)
  const [moveFilesToRoot, setMoveFilesToRoot] = useState(true)
  const [deletingFolder, setDeletingFolder] = useState(false)
  const [moveTarget, setMoveTarget] = useState<DocMeta | null>(null)
  const [moveDest, setMoveDest] = useState<string>('root')
  const [moving, setMoving] = useState(false)

  const searching = Boolean(query.trim()) || typeFilter !== 'all'
  const liveFolderName = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)?.name || currentFolderName
    : ''

  const loadVault = useCallback(async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (typeFilter !== 'all') params.set('type', typeFilter)
      // scoped listing only when browsing; search/type filters span the whole
      // vault so files inside folders are never hidden from results
      if (!searching) params.set('folder', currentFolderId || 'root')
      const [docRes, folRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/documents?${params.toString()}`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        }),
        fetch(`${API_BASE}/api/admin/documents/folders`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        }),
      ])
      const data = await docRes.json().catch(() => null)
      if (data?.success) {
        setDocs(data.documents || [])
        setStats(data.stats || { count: 0, totalBytes: 0, byGroup: {} })
      } else {
        onToast(data?.message || 'Could not load the document vault')
      }
      const fdata = await folRes.json().catch(() => null)
      if (fdata?.success) setFolders(fdata.folders || [])
    } catch {
      onToast('Network error while loading the document vault')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [query, typeFilter, currentFolderId, searching, onToast])

  useEffect(() => {
    const t = setTimeout(loadVault, query ? 350 : 0)
    return () => clearTimeout(t)
  }, [loadVault, query])

  const patchJob = (key: string, patch: Partial<UploadJob>) =>
    setUploads((prev) => prev.map((j) => (j.key === key ? { ...j, ...patch } : j)))

  const uploadOne = async (file: File, key: string) => {
    const sessionId = newSessionId()
    const total = Math.max(1, Math.ceil(file.size / CHUNK_BYTES))
    try {
      for (let i = 0; i < total; i++) {
        const b64 = await sliceToBase64(file, i * CHUNK_BYTES, Math.min(file.size, (i + 1) * CHUNK_BYTES))
        await postChunk(sessionId, i, b64, (frac) => {
          patchJob(key, { progress: Math.min(99, Math.round(((i + frac) / total) * 100)) })
        })
      }
      const fin = await fetch(`${API_BASE}/api/admin/documents/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({
          sessionId, name: file.name, size: file.size, mime: file.type || undefined,
          folderId: currentFolderId || undefined,
        }),
      })
      const data = await fin.json().catch(() => null)
      if (!fin.ok || !data?.success) {
        throw new Error(data?.message || `Upload failed (${fin.status})`)
      }
      patchJob(key, { progress: 100, status: 'done' })
      setTimeout(() => setUploads((prev) => prev.filter((j) => j.key !== key)), 2500)
      loadVault()
    } catch (err: any) {
      patchJob(key, { status: 'error', error: err?.message || 'Upload failed' })
    }
  }

  const handleFiles = (list: FileList | File[] | null) => {
    if (!list) return
    const files = Array.from(list)
    const dest = currentFolderId ? liveFolderName : undefined
    const jobs: UploadJob[] = []
    const valid: { file: File; key: string }[] = []
    for (const f of files) {
      const key = newSessionId()
      if (!isAllowed(f.name)) {
        jobs.push({ key, name: f.name, size: f.size, progress: 0, status: 'error', error: 'Unsupported type — allowed: PDF, Word, Excel, Slides, APK, ZIP/RAR/7Z, TXT, CSV', dest })
        continue
      }
      if (f.size > MAX_FILE_BYTES) {
        jobs.push({ key, name: f.name, size: f.size, progress: 0, status: 'error', error: 'Too large — vault limit is 50 MB per file', dest })
        continue
      }
      jobs.push({ key, name: f.name, size: f.size, progress: 0, status: 'uploading', dest })
      valid.push({ file: f, key })
    }
    if (files.length > 0) setUploads((prev) => [...jobs, ...prev].slice(0, 12))
    // sequential per file, parallel across files (max keeps server load sane)
    ;(async () => {
      for (const v of valid) await uploadOne(v.file, v.key)
    })()
  }

  const downloadDoc = async (d: DocMeta) => {
    setDownloadingId(d.id)
    try {
      const res = await fetch(`${API_BASE}/api/admin/documents/${d.id}/download`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      })
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = d.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, downloads: x.downloads + 1 } : x)))
    } catch (err: any) {
      onToast(err?.message || 'Download failed')
    } finally {
      setDownloadingId(null)
    }
  }

  const deleteDoc = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/documents/${confirmTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        onToast(`Deleted ${confirmTarget.name}`)
        setConfirmTarget(null)
        loadVault()
      } else {
        onToast(data?.message || 'Could not delete the file')
      }
    } catch {
      onToast('Network error while deleting')
    } finally {
      setDeleting(false)
    }
  }

  // ---- folder actions ----
  const createFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreatingFolder(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/documents/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        onToast(`Folder "${name}" created`)
        setShowNewFolder(false)
        setNewFolderName('')
        loadVault()
      } else {
        onToast(data?.message || 'Could not create the folder')
      }
    } catch {
      onToast('Network error while creating the folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  const renameFolder = async () => {
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) return
    setRenaming(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/documents/folders/${renameTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        onToast(`Folder renamed to "${name}"`)
        if (currentFolderId === renameTarget.id) setCurrentFolderName(name)
        setRenameTarget(null)
        loadVault()
      } else {
        onToast(data?.message || 'Could not rename the folder')
      }
    } catch {
      onToast('Network error while renaming the folder')
    } finally {
      setRenaming(false)
    }
  }

  const deleteFolder = async () => {
    if (!deleteFolderTarget) return
    setDeletingFolder(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/documents/folders/${deleteFolderTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ moveFilesToRoot }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        onToast(data?.message || `Folder "${deleteFolderTarget.name}" deleted`)
        if (currentFolderId === deleteFolderTarget.id) {
          setCurrentFolderId(null)
          setCurrentFolderName('')
        }
        setDeleteFolderTarget(null)
        loadVault()
      } else {
        onToast(data?.message || 'Could not delete the folder')
      }
    } catch {
      onToast('Network error while deleting the folder')
    } finally {
      setDeletingFolder(false)
    }
  }

  const openMoveModal = (d: DocMeta) => {
    setMoveTarget(d)
    setMoveDest(d.folderId || 'root')
  }

  const moveDoc = async () => {
    if (!moveTarget) return
    setMoving(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/documents/${moveTarget.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ folderId: moveDest === 'root' ? null : moveDest }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        onToast(`Moved "${moveTarget.name}" to ${moveDest === 'root' ? 'All Files' : folders.find((f) => f.id === moveDest)?.name || 'folder'}`)
        setMoveTarget(null)
        loadVault()
      } else {
        onToast(data?.message || 'Could not move the file')
      }
    } catch {
      onToast('Network error while moving the file')
    } finally {
      setMoving(false)
    }
  }

  const enterFolder = (f: FolderMeta) => {
    setCurrentFolderId(f.id)
    setCurrentFolderName(f.name)
  }

  const meta = (d: DocMeta) => GROUP_META[d.group] || GROUP_META.text

  return (
    <div className="space-y-5">
      {/* ================= SECTION HEADER ================= */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
            <Folder className="w-5 h-5 text-cyan-400" />
            Documents &amp; Files
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Secure vault — organize PDF, Word, Excel, Slides, APK and ZIP files into folders (up to 50 MB each)
          </p>
        </div>
        <button
          onClick={loadVault}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-zinc-300 hover:border-cyan-400/40 transition"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ================= STORAGE STATS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#0A122E]/80 border border-cyan-400/20 p-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            <Folder className="w-3.5 h-3.5 text-cyan-400" /> Files stored
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1.5">{stats.count}</div>
        </div>
        <div className="rounded-2xl bg-[#0A122E]/80 border border-cyan-400/20 p-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Vault size
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1.5">{fmtBytes(stats.totalBytes)}</div>
        </div>
        <div className="rounded-2xl bg-[#0A122E]/80 border border-white/10 p-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            <FolderPlus className="w-3.5 h-3.5 text-cyan-400" /> Folders
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1.5">{folders.length}</div>
        </div>
        <div className="rounded-2xl bg-[#0A122E]/80 border border-white/10 p-4">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">By type</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(stats.byGroup).length === 0 && (
              <span className="text-[10px] font-mono text-zinc-600">No files yet</span>
            )}
            {Object.entries(stats.byGroup).map(([g, v]) => {
              const m = GROUP_META[g] || GROUP_META.text
              const Icon = m.icon
              return (
                <span key={g} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${m.bg} border ${m.ring} ${m.text} text-[10px] font-mono font-bold`}>
                  <Icon className="w-3 h-3" /> {m.label} × {v.count} · {fmtBytes(v.bytes)}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* ================= UPLOAD DROPZONE ================= */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer?.files || null)
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragging
            ? 'border-cyan-400/60 bg-cyan-500/10'
            : 'border-slate-400/20 bg-[#0A122E]/60 hover:border-cyan-400/35'
        }`}
      >
        <CloudUpload className={`w-9 h-9 mx-auto ${dragging ? 'text-cyan-300' : 'text-zinc-500'}`} />
        <div className="text-sm font-bold text-white font-mono mt-2">
          {dragging ? `Drop files to upload${currentFolderId ? ` into ${liveFolderName}` : ''}` : 'Drag & drop files here'}
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-1">
          PDF · Word · Excel · PowerPoint · APK · ZIP / RAR / 7Z · TXT · CSV — max 50 MB per file
          {currentFolderId && (
            <span className="text-cyan-300"> · uploading into {liveFolderName}</span>
          )}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-gold-gradient text-slate-950 font-extrabold text-xs active:scale-[0.98] transition"
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
          <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline">or</span>
          <button
            onClick={() => setShowNewFolder(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#060B1E] border border-cyan-400/30 text-cyan-300 font-extrabold text-xs hover:bg-cyan-500/10 hover:border-cyan-400/60 active:scale-[0.98] transition"
          >
            <FolderPlus className="w-4 h-4" />
            Create Folder
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.apk,.zip,.rar,.7z,.txt,.csv"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.currentTarget.value = ''
          }}
        />
      </div>

      {/* ================= ACTIVE UPLOADS ================= */}
      {uploads.length > 0 && (
        <div className="rounded-2xl bg-[#0A122E]/80 border border-white/10 p-4 space-y-2.5">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Uploads</div>
          {uploads.map((j) => (
            <div key={j.key} className="rounded-xl bg-[#060B1E] border border-white/5 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {j.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />}
                {j.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {j.status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                <span className="text-xs text-white font-semibold truncate flex-1">{j.name}</span>
                {j.dest && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-px rounded bg-cyan-500/10 border border-cyan-400/25 text-cyan-300 text-[9px] font-mono shrink-0">
                    <Folder className="w-2.5 h-2.5" /> {j.dest}
                  </span>
                )}
                <span className="text-[9px] font-mono text-zinc-500 shrink-0">{fmtBytes(j.size)}</span>
                <button
                  onClick={() => setUploads((prev) => prev.filter((x) => x.key !== j.key))}
                  className="text-zinc-600 hover:text-zinc-300 transition shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {j.status === 'uploading' && (
                <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-200"
                    style={{ width: `${Math.max(3, j.progress)}%` }}
                  />
                </div>
              )}
              {j.status === 'error' && (
                <div className="mt-1 text-[10px] font-mono text-rose-300">{j.error}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================= BREADCRUMB ================= */}
      <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
        <button
          onClick={() => { setCurrentFolderId(null); setCurrentFolderName('') }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition ${
            currentFolderId
              ? 'bg-[#060B1E] border-slate-400/15 text-zinc-400 hover:text-cyan-300 hover:border-cyan-400/40'
              : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
          }`}
        >
          <Folder className="w-3 h-3" /> All Files
        </button>
        {currentFolderId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold">
              <Folder className="w-3 h-3" /> {liveFolderName || '…'}
            </span>
          </>
        )}
        {searching && (
          <span className="ml-auto text-[10px] font-mono text-cyan-300/80">
            Searching all folders
          </span>
        )}
      </div>

      {/* ================= FOLDERS GRID (root only) ================= */}
      {!currentFolderId && folders.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">Folders</div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {folders.map((f) => (
              <div
                key={f.id}
                onClick={() => enterFolder(f)}
                className="group cursor-pointer rounded-2xl bg-[#0A122E]/80 border border-white/10 hover:border-cyan-400/40 p-4 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                    <Folder className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate group-hover:text-cyan-200 transition" title={f.name}>
                      {f.name}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      {f.fileCount} file{f.fileCount === 1 ? '' : 's'} · {fmtBytes(f.totalBytes)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setRenameTarget(f)
                      setRenameValue(f.name)
                    }}
                    className="p-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-zinc-500 hover:text-cyan-300 hover:border-cyan-400/40 transition"
                    title="Rename folder"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteFolderTarget(f)
                      setMoveFilesToRoot(true)
                    }}
                    className="p-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-zinc-500 hover:text-rose-300 hover:border-rose-400/40 transition"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TOOLBAR ================= */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-md pa-search rounded-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all folders by name..."
            className="w-full bg-[#060B1E] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition ${
                typeFilter === f.key
                  ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                  : 'bg-[#060B1E] border-slate-400/15 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= FILE LIST ================= */}
      <div className="rounded-2xl bg-[#0A122E]/80 border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-zinc-500 font-mono text-xs">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading vault…
          </div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center">
            <Folder className="w-10 h-10 mx-auto text-zinc-700" />
            <div className="text-sm font-bold text-white font-mono mt-2">
              {currentFolderId ? `No files in ${liveFolderName || 'this folder'} yet` : 'The vault is empty'}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">
              {currentFolderId
                ? 'Drop files above to upload them straight into this folder.'
                : 'Upload contracts, catalogs, installers — or create a folder to keep things organized.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {docs.map((d) => {
              const m = meta(d)
              const Icon = m.icon
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition group">
                  <div className={`w-10 h-10 rounded-xl ${m.bg} border ${m.ring} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${m.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{d.name}</div>
                    <div className="text-[10px] font-mono text-zinc-500 flex flex-wrap items-center gap-x-2 mt-0.5">
                      <span className={`px-1 py-px rounded ${m.bg} ${m.text} font-bold uppercase`}>{d.ext}</span>
                      <span>{fmtBytes(d.size)}</span>
                      <span className="text-zinc-700">•</span>
                      <span>{d.uploadedBy?.name || 'Administrator'}</span>
                      <span className="text-zinc-700">•</span>
                      <span>{fmtDate(d.uploadedAt)}</span>
                      {d.downloads > 0 && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span>{d.downloads} download{d.downloads === 1 ? '' : 's'}</span>
                        </>
                      )}
                      {searching && (
                        <span className="inline-flex items-center gap-1 px-1 py-px rounded bg-cyan-500/10 border border-cyan-400/25 text-cyan-300 font-bold">
                          <Folder className="w-2.5 h-2.5" /> {d.folderName || 'All Files'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openMoveModal(d)}
                      className="p-2 rounded-lg bg-[#060B1E] border border-slate-400/15 text-zinc-500 hover:text-cyan-300 hover:border-cyan-400/40 transition"
                      title="Move to folder"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadDoc(d)}
                      disabled={downloadingId === d.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 text-[10px] font-mono text-zinc-300 hover:border-cyan-400/40 hover:text-cyan-300 transition disabled:opacity-50"
                      title="Download"
                    >
                      {downloadingId === d.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                      onClick={() => setConfirmTarget(d)}
                      className="p-2 rounded-lg bg-[#060B1E] border border-slate-400/15 text-zinc-500 hover:text-rose-300 hover:border-rose-400/40 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= NEW FOLDER MODAL ================= */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F131D] border border-cyan-400/25 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <FolderPlus className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white font-mono">Create a new folder</h3>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Group related files — contracts, installers, catalogs — inside the vault.
                </p>
              </div>
            </div>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim() && !creatingFolder) createFolder() }}
              placeholder="Folder name (e.g. Contracts 2026)"
              maxLength={60}
              className="mt-4 w-full bg-[#060B1E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                className="py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className="py-2.5 rounded-xl btn-gold-gradient text-slate-950 text-xs font-extrabold transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {creatingFolder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RENAME FOLDER MODAL ================= */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F131D] border border-cyan-400/25 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <Pencil className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white font-mono">Rename folder</h3>
                <p className="text-[11px] text-zinc-400 mt-1 break-all">
                  <span className="font-bold text-white">{renameTarget.name}</span> · {renameTarget.fileCount} file{renameTarget.fileCount === 1 ? '' : 's'} inside keep their place.
                </p>
              </div>
            </div>
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && renameValue.trim() && !renaming) renameFolder() }}
              placeholder="New folder name"
              maxLength={60}
              className="mt-4 w-full bg-[#060B1E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setRenameTarget(null)}
                className="py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={renameFolder}
                disabled={!renameValue.trim() || renaming}
                className="py-2.5 rounded-xl btn-gold-gradient text-slate-950 text-xs font-extrabold transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {renaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE FOLDER CONFIRM ================= */}
      {deleteFolderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F131D] border border-rose-400/25 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white font-mono">Delete folder?</h3>
                <p className="text-[11px] text-zinc-400 mt-1 break-all">
                  <span className="font-bold text-white">{deleteFolderTarget.name}</span>
                  {deleteFolderTarget.fileCount > 0
                    ? ` contains ${deleteFolderTarget.fileCount} file${deleteFolderTarget.fileCount === 1 ? '' : 's'}.`
                    : ' is empty and will be removed.'}
                </p>
              </div>
            </div>
            {deleteFolderTarget.fileCount > 0 && (
              <label className="mt-3 flex items-start gap-2 rounded-xl bg-[#060B1E] border border-white/10 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moveFilesToRoot}
                  onChange={(e) => setMoveFilesToRoot(e.target.checked)}
                  className="mt-0.5 accent-cyan-400"
                />
                <span className="text-[11px] text-zinc-300">
                  Move the {deleteFolderTarget.fileCount} file{deleteFolderTarget.fileCount === 1 ? '' : 's'} back to <span className="font-bold text-white">All Files</span> — nothing is deleted.
                </span>
              </label>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setDeleteFolderTarget(null)}
                className="py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteFolder}
                disabled={deletingFolder || (deleteFolderTarget.fileCount > 0 && !moveFilesToRoot)}
                className="py-2.5 rounded-xl bg-rose-500/90 border border-rose-400/40 text-xs font-extrabold text-white hover:bg-rose-500 transition disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
              >
                {deletingFolder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Folder
              </button>
            </div>
            {deleteFolderTarget.fileCount > 0 && !moveFilesToRoot && (
              <p className="mt-2 text-[10px] font-mono text-zinc-500 text-center">
                Tick the box above (or empty the folder first) to enable deletion.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================= MOVE FILE MODAL ================= */}
      {moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F131D] border border-cyan-400/25 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                <FolderInput className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white font-mono">Move file</h3>
                <p className="text-[11px] text-zinc-400 mt-1 break-all truncate">
                  Choose a destination for <span className="font-bold text-white">{moveTarget.name}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 max-h-56 overflow-y-auto space-y-1.5 pr-1">
              <button
                onClick={() => setMoveDest('root')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition ${
                  moveDest === 'root'
                    ? 'bg-cyan-500/15 border-cyan-400/40'
                    : 'bg-[#060B1E] border-white/10 hover:border-cyan-400/30'
                }`}
              >
                <Folder className={`w-4 h-4 ${moveDest === 'root' ? 'text-cyan-300' : 'text-zinc-500'}`} />
                <span className={`text-xs font-bold flex-1 ${moveDest === 'root' ? 'text-cyan-200' : 'text-zinc-300'}`}>All Files</span>
                {moveTarget.folderId === null && (
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">current</span>
                )}
              </button>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMoveDest(f.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition ${
                    moveDest === f.id
                      ? 'bg-cyan-500/15 border-cyan-400/40'
                      : 'bg-[#060B1E] border-white/10 hover:border-cyan-400/30'
                  }`}
                >
                  <Folder className={`w-4 h-4 ${moveDest === f.id ? 'text-cyan-300' : 'text-zinc-500'}`} />
                  <span className={`text-xs font-bold flex-1 truncate ${moveDest === f.id ? 'text-cyan-200' : 'text-zinc-300'}`}>{f.name}</span>
                  {moveTarget.folderId === f.id && (
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">current</span>
                  )}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setMoveTarget(null)}
                className="py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={moveDoc}
                disabled={moving || moveDest === (moveTarget.folderId || 'root')}
                className="py-2.5 rounded-xl btn-gold-gradient text-slate-950 text-xs font-extrabold transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {moving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE FILE CONFIRM ================= */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0F131D] border border-rose-400/25 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white font-mono">Delete from vault?</h3>
                <p className="text-[11px] text-zinc-400 mt-1 break-all">
                  <span className="font-bold text-white">{confirmTarget.name}</span> ({fmtBytes(confirmTarget.size)}) will be
                  permanently removed for every admin. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setConfirmTarget(null)}
                className="py-2.5 rounded-xl bg-[#060B1E] border border-slate-400/15 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteDoc}
                disabled={deleting}
                className="py-2.5 rounded-xl bg-rose-500/90 border border-rose-400/40 text-xs font-extrabold text-white hover:bg-rose-500 transition disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
