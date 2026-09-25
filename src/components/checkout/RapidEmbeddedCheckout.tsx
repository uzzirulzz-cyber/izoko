// RapidEmbeddedCheckout — mounts Rapid Gateway's hosted payment widget
// inside our checkout / order-retry flow.
//
// Protocol (reverse-engineered from the gateway's own widget bundle and
// verified live — see worklog Task 56):
//   1. Parent renders an iframe pointing at {gateway}/embedded?boot
//   2. Widget postMessages { type: "rp:ready" } to the parent window
//   3. Parent postMessages { type: "rp:init", clientSecret } into the iframe
//      (the widget recovers the session id as clientSecret.split("_secret_")[0])
//   4. Widget fetches boot-config + checkout-token with the clientSecret,
//      renders the payment UI (card / account / wallet / Raast), finalizes
//      itself and reports:
//        { type: "rp:pending", sessionId }   awaiting customer approval
//        { type: "rp:success", sessionId }   paid / settled on the gateway
//        { type: "rp:error",   sessionId }   failed or declined
//
// TRUST BOUNDARY: rp:success only ever triggers navigation to the order
// page. The order itself is marked paid exclusively by the VERIFIED WEBHOOK
// (api/_lib/rapidWebhook.ts) — this component never mutates payment state.
import { useEffect, useRef, useState } from 'react'

const FALLBACK_ORIGIN = 'https://secure.rapid-gateway.com'

type Phase = 'booting' | 'active' | 'pending' | 'error'

export default function RapidEmbeddedCheckout({
  embeddedUrl,
  clientSecret,
  onPaid,
  onExit,
}: {
  embeddedUrl: string
  clientSecret: string
  /** called after the widget reports rp:success (navigation to the order page) */
  onPaid: () => void
  /** called when the customer dismisses the widget or it fails to boot */
  onExit: () => void
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const sentRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('booting')
  const [errMsg, setErrMsg] = useState('')
  const phaseRef = useRef<Phase>('booting')
  phaseRef.current = phase
  // The widget reports its natural height via rp:resize (observed 232 → 539+).
  const [frameHeight, setFrameHeight] = useState(260)

  useEffect(() => {
    let expected = FALLBACK_ORIGIN
    try {
      expected = new URL(embeddedUrl).origin
    } catch {
      /* keep fallback */
    }

    const sendInit = () => {
      if (sentRef.current) return
      sentRef.current = true
      frameRef.current?.contentWindow?.postMessage(
        { type: 'rp:init', clientSecret },
        expected
      )
    }

    const bootTimer = window.setTimeout(() => {
      sendInit() // fallback — also covers rp:ready never arriving
      if (!sentRef.current) return
      window.setTimeout(() => {
        if (phaseRef.current === 'booting') {
          setPhase('error')
          setErrMsg(
            'The payment gateway did not load in time. Your order is saved — please retry in a moment or pick another payment method.'
          )
        }
      }, 12000)
    }, 1500)

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== expected) return
      const d: any = e.data || {}
      if (d.type === 'rp:resize' && Number(d.height) > 0) {
        setFrameHeight(Math.min(760, Math.max(240, Math.round(Number(d.height)) + 8)))
        // First resize = the payment form mounted inside the widget.
        setPhase((p) => (p === 'booting' ? 'active' : p))
        return
      }
      if (d.type === 'rp:ready') {
        sendInit()
        return
      }
      if (d.type === 'rp:pending') {
        setPhase('pending')
        return
      }
      if (d.type === 'rp:success') {
        setPhase('pending')
        window.setTimeout(onPaid, 900)
        return
      }
      if (d.type === 'rp:error') {
        setPhase('error')
        setErrMsg(
          'The payment was declined or did not go through. Your order is saved as PENDING and you have NOT been charged — you can retry.'
        )
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      window.clearTimeout(bootTimer)
    }
  }, [embeddedUrl, clientSecret, onPaid])

  return (
    <div className="pbx-scope min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="pbx-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Complete your payment</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Secure checkout powered by Rapid Gateway — card, wallet or Raast.
              </p>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Back
            </button>
          </div>

          {phase === 'pending' && (
            <div className="mt-3 rounded-lg bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
              Awaiting payment approval — follow the instructions in the window below. This page
              updates automatically.
            </div>
          )}
          {phase === 'error' && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
              {errMsg}
            </div>
          )}
          {phase === 'booting' && (
            <div className="mt-3 rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500">
              Connecting to the secure payment window…
            </div>
          )}

          <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <iframe
              ref={frameRef}
              src={embeddedUrl}
              title="Rapid Gateway secure checkout"
              className="w-full transition-[height] duration-300"
              style={{ height: frameHeight }}
              allow="payment *; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
            Your order is confirmed automatically once Rapid Gateway notifies our server. Never
            share card details outside this window.
          </p>
        </div>
      </div>
    </div>
  )
}
