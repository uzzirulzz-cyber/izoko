import React, { useEffect, useState } from 'react'
import { MonitorSmartphone, X, ArrowDownToLine } from 'lucide-react'
import { isStandalonePwa } from '../../lib/appLinks'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA install chip — captures the browser's beforeinstallprompt and offers
 * a one-tap "Install web app" action. This is the WEB-APP install (PWA);
 * the native Android/iOS apps live on /download. Hidden when already
 * running as an installed PWA. Dismissal is remembered for 14 days.
 */
export const InstallPwaChip: React.FC = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (isStandalonePwa()) return // already installed
    const dismissedAt = Number(localStorage.getItem('playbeat_pwa_dismissed_at') || 0)
    if (dismissedAt && Date.now() - dismissedAt < 14 * 24 * 3600 * 1000) return

    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
      // small delay so it never fights the first paint
      setTimeout(() => setVisible(true), 2500)
    }
    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible || !deferred) return null

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('playbeat_pwa_dismissed_at', String(Date.now()))
  }

  const install = async () => {
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setVisible(false)
      } else {
        setExpanded(true)
      }
    } catch {
      /* prompt unavailable */
    }
  }

  return (
    <div
      role="complementary"
      aria-label="Install PlayBeat web app"
      className="fixed z-40 bottom-4 left-4 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#0A122E]/95 backdrop-blur border border-slate-400/20 shadow-[0_12px_40px_rgba(0,0,0,0.55)] p-3 pr-9 flex items-center gap-3 animate-in"
    >
      <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
        <MonitorSmartphone className="w-4.5 h-4.5 text-amber-400" style={{ width: 18, height: 18 }} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-white leading-tight">
          {expanded ? 'Install as a web app (PWA)' : 'Add PlayBeat to your device'}
        </p>
        <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
          {expanded
            ? 'Installs instantly from the browser — no store needed. Looking for the native apps? Visit /download.'
            : 'Lightweight web app · works offline · same account'}
        </p>
      </div>
      <button
        onClick={install}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-gold-gradient text-slate-950 text-[11px] font-extrabold active:scale-95 transition"
      >
        <ArrowDownToLine style={{ width: 12, height: 12 }} />
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-300 transition"
      >
        <X style={{ width: 13, height: 13 }} />
      </button>
    </div>
  )
}
