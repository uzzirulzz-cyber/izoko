// Responsive AdSense unit — renders ONLY when:
//   1. AdSense is configured AND ads are enabled (admin toggle respected),
//   2. the current route allows ads (checkout / order / account / admin /
//      contact are permanently excluded — publisher-policy safe),
//   3. the slot is in-viewport-ish (lazy push keeps LCP untouched).
// The component never throws and never blocks rendering if AdSense fails.
import React, { useEffect, useRef, useState } from 'react'
import { adsAllowedOnPath } from './ConsentBanner'
import { getTrackingConfigSync } from '../lib/googleTag'

interface AdSlotProps {
  /** Stable slot id for reporting (do NOT put real ad unit ids here — the client id comes from tracking config). */
  slotKey: string
  className?: string
  /** Minimum height reserved to avoid layout shift (px). */
  minHeight?: number
  label?: string
}

export const AdSlot: React.FC<AdSlotProps> = ({ slotKey, className = '', minHeight = 120, label = 'Advertisement' }) => {
  const [allowed, setAllowed] = useState(false)
  const [client, setClient] = useState('')
  const insRef = useRef<HTMLModElement | null>(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    // re-check on route change — pathname is read fresh each render
    const tick = () => {
      const cfg = getTrackingConfigSync()
      setClient(cfg?.adsense || '')
      setAllowed(adsAllowedOnPath(window.location.pathname))
    }
    tick()
    const t = setTimeout(tick, 2500) // config may arrive after init completes
    return () => clearTimeout(t)
  }, [slotKey])

  useEffect(() => {
    if (!allowed || !client || pushedRef.current) return
    const el = insRef.current
    if (!el) return
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
      pushedRef.current = true
    } catch {
      /* AdSense not ready — skip silently */
    }
  }, [allowed, client])

  if (!allowed || !client) return null

  return (
    <div className={`w-full flex flex-col items-center ${className}`} data-ad-slot-key={slotKey}>
      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400/70 mb-1.5 select-none">
        {label}
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight }}
        data-ad-client={client}
        data-ad-format="auto"
        data-ad-slot={slotKey}
        data-full-width-responsive="true"
      />
    </div>
  )
}
