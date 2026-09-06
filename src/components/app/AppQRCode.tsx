import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * Storefront QR code — encodes whatever the admin configured as the QR
 * destination (by default the adaptive /download page). Renders crisp
 * inline SVG via the `qrcode` package; falls back to the static PNG at
 * /pwa/qr-download.png if generation fails.
 */
export const AppQRCode: React.FC<{
  value: string
  size?: number
  className?: string
  dark?: string
}> = ({ value, size = 132, className, dark = '#050814' }) => {
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    let alive = true
    if (!value) return
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      color: { dark, light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then((s) => {
        if (alive) setSvg(s)
      })
      .catch(() => {
        if (alive) setSvg('')
      })
    return () => {
      alive = false
    }
  }, [value, size, dark])

  return svg ? (
    <div
      className={`${className || ''} [&>svg]:w-full [&>svg]:h-full [&>svg]:block`}
      role="img"
      aria-label={`QR code — scan to open ${value}`}
      style={{ width: size, height: size }}
      // qrcode SVG output is generated locally from a sanitized, https-validated string
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  ) : (
    <div className={className} role="img" aria-label={`QR code — scan to open ${value}`} style={{ width: size, height: size }}>
      <img
        src="/pwa/qr-download.png"
        alt="QR code — scan to get the PlayBeat app"
        style={{ width: '100%', height: '100%', borderRadius: 8, display: 'block' }}
      />
    </div>
  )
}
