import React, { useEffect, useState } from 'react'

/**
 * AdminAvatar — the single source of truth for rendering an administrator /
 * staff avatar anywhere in the dashboard (top bar, sidebar, profile dropdown,
 * messaging, notifications, activity logs) and support surfaces.
 *
 * - Renders the uploaded profile picture via /api/admin/avatar?email=…&v=…
 * - Server-probed: the image is attempted whenever an email is present —
 *   a 404 falls back to the colored initials disc. The avatar is therefore
 *   visible on ANY device/session, even if localStorage has never seen it.
 * - Cache-safe: version persisted in localStorage per email as a cache-buster;
 *   every mounted avatar refreshes instantly when `bumpAvatarVersion()` fires
 *   after an upload (version > 0) or a remove (version 0 → initials at once).
 */

const AVATAR_BG: Record<string, string> = {
  amber: 'bg-amber-400 text-black',
  blue: 'bg-blue-500 text-white',
  emerald: 'bg-emerald-500 text-black',
  purple: 'bg-purple-500 text-white',
  rose: 'bg-rose-500 text-white',
  cyan: 'bg-cyan-500 text-black',
}

const AVATAR_GLOW: Record<string, string> = {
  amber: 'shadow-[0_0_16px_-2px_rgba(251,191,36,0.55)]',
  blue: 'shadow-[0_0_16px_-2px_rgba(59,130,246,0.55)]',
  emerald: 'shadow-[0_0_16px_-2px_rgba(16,185,129,0.55)]',
  purple: 'shadow-[0_0_16px_-2px_rgba(168,85,247,0.55)]',
  rose: 'shadow-[0_0_16px_-2px_rgba(244,63,94,0.55)]',
  cyan: 'shadow-[0_0_16px_-2px_rgba(34,211,238,0.55)]',
}

const AVATAR_EVENT = 'pb-avatar-changed'

/** Session-scoped memory of emails confirmed to have NO avatar on the server.
 *  Prevents one 404 probe per mounted avatar on every dashboard visit.
 *  Cleared per-email whenever a bump event reports a new picture. */
const NO_AVATAR_SEEN = new Set<string>()

/** Persist a new avatar version and refresh every mounted AdminAvatar live. */
export function bumpAvatarVersion(email: string, version: number) {
  if (!email) return
  try {
    localStorage.setItem(`pb_avatar_v_${email.toLowerCase()}`, String(version || 0))
  } catch {
    /* storage unavailable */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(AVATAR_EVENT, { detail: { email: email.toLowerCase(), version: version || 0 } })
    )
  } catch {
    /* events unsupported */
  }
}

function readVersion(email: string): number {
  try {
    return parseInt(localStorage.getItem(`pb_avatar_v_${(email || '').toLowerCase()}`) || '0', 10) || 0
  } catch {
    return 0
  }
}

function initialsOf(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'P'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

interface AdminAvatarProps {
  name: string
  email?: string
  color?: string
  /** pixel size of the square disc */
  size?: number
  /** show a live green status dot at the bottom-right */
  status?: 'online' | 'none'
  /** disable hover scale/glow animation (tiny inline usages) */
  still?: boolean
  className?: string
  title?: string
}

export const AdminAvatar: React.FC<AdminAvatarProps> = ({
  name,
  email,
  color = 'amber',
  size = 36,
  status = 'none',
  still = false,
  className = '',
  title,
}) => {
  const [version, setVersion] = useState(() => readVersion(email || ''))
  const [imgOk, setImgOk] = useState(true)
  const [noAvatar, setNoAvatar] = useState(() => NO_AVATAR_SEEN.has(email || ''))
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setVersion(readVersion(email || ''))
    setImgOk(true)
    setNoAvatar(NO_AVATAR_SEEN.has(email || ''))
    setLoaded(false)
  }, [email])

  useEffect(() => {
    if (!email) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.email === email.toLowerCase()) {
        if (detail.version === 0) {
          // Picture removed — restore initials instantly, no refetch needed
          NO_AVATAR_SEEN.add(email.toLowerCase())
          setNoAvatar(true)
          setVersion(0)
        } else {
          // New/updated picture — probe the server right away
          NO_AVATAR_SEEN.delete(email.toLowerCase())
          setNoAvatar(false)
          setImgOk(true)
          setVersion(readVersion(email))
          setLoaded(false)
        }
      }
    }
    window.addEventListener(AVATAR_EVENT, handler)
    return () => window.removeEventListener(AVATAR_EVENT, handler)
  }, [email])

  const bg = AVATAR_BG[color] || AVATAR_BG.amber
  const glow = AVATAR_GLOW[color] || AVATAR_GLOW.amber
  // Server probe: attempt the image whenever an email exists. A 404 response
  // (no picture stored) flips imgOk/noAvatar so the initials disc takes over.
  const hasImage = Boolean(email) && imgOk && !noAvatar
  const fontSize = Math.max(9, Math.round(size * (initialsOf(name).length > 1 ? 0.34 : 0.42)))

  return (
    <div
      className={`relative rounded-full shrink-0 ${still ? '' : 'transition-transform duration-200 hover:scale-105'} ${className}`}
      style={{ width: size, height: size }}
      title={title}
    >
      {/* Soft aura ring */}
      <div
        className={`absolute -inset-[3px] rounded-full ${hasImage ? 'bg-gradient-to-br from-white/25 via-white/5 to-transparent opacity-70' : 'opacity-0'}`}
      />
      {hasImage ? (
        <img
          src={`/api/admin/avatar?email=${encodeURIComponent(email || '')}&v=${version || 'probe'}`}
          alt={name || 'Admin avatar'}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setImgOk(false)
            setNoAvatar(true)
            NO_AVATAR_SEEN.add((email || '').toLowerCase())
          }}
          className={`absolute inset-0 w-full h-full rounded-full object-cover ${glow} ${
            loaded ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-300`}
          referrerPolicy="no-referrer"
        />
      ) : null}
      {/* Initials fallback — always mounted underneath (graceful while loading) */}
      <div
        className={`absolute inset-0 rounded-full ${bg} ${glow} font-extrabold flex items-center justify-center font-mono select-none ${
          hasImage && loaded ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-300`}
        style={{ fontSize }}
        aria-hidden={hasImage && loaded}
      >
        {initialsOf(name)}
      </div>
      {status === 'online' && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A0E1A] shadow-[0_0_8px_rgba(52,211,153,0.9)]"
          title="Online"
        />
      )}
    </div>
  )
}

export default AdminAvatar
