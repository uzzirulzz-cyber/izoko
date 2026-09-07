import React from 'react'

/**
 * Official-style store badges — Apple "Download on the App Store" and
 * Google "GET IT ON Google Play" — rendered as inline SVG so they stay
 * crisp at any size, carry no external requests, and match the official
 * black-plate design (white hairline border, brand marks, two-line lockup).
 *
 * When `href` is empty the badge renders in a disabled "pending" state:
 * visually the official badge at reduced opacity with an availability chip,
 * never a fake link.
 */

interface BadgeProps {
  /** Destination URL — empty string renders the disabled Coming soon state */
  href?: string
  height?: number
  className?: string
  pendingLabel?: string
  ariaLabel?: string
}

const PLATE = {
  bg: '#000000',
  border: 'rgba(255,255,255,0.82)',
  text: '#FFFFFF',
}

function AppleLogo({ size }: { size: number }) {
  // Apple mark — standard FontAwesome apple path (viewBox 0 0 384 512)
  return (
    <svg width={size} height={size * (512 / 384)} viewBox="0 0 384 512" fill="#FFFFFF" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

function GooglePlayLogo({ size }: { size: number }) {
  // Google Play triangle — 4 region tiling with official gradient colors
  const W = 24
  const A = { x: 3.6, y: 1.8 } // top-left
  const B = { x: 3.6, y: 21.4 } // bottom-left
  const F = { x: 13.4, y: 11.6 } // center fold
  const G = { x: 18.9, y: 9.0 } // upper fold end
  const Y = { x: 18.9, y: 14.2 } // lower fold end
  const T = { x: 21.9, y: 11.6 } // right tip
  return (
    <svg width={size} height={size} viewBox={`0 0 ${W} ${W}`} aria-hidden="true">
      <defs>
        <linearGradient id="pb-play-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00A0FF" />
          <stop offset="100%" stopColor="#00E3FF" />
        </linearGradient>
        <linearGradient id="pb-play-green" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00E170" />
          <stop offset="100%" stopColor="#00F49B" />
        </linearGradient>
        <linearGradient id="pb-play-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFE000" />
          <stop offset="100%" stopColor="#FFBC00" />
        </linearGradient>
        <linearGradient id="pb-play-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF3A44" />
          <stop offset="100%" stopColor="#C31162" />
        </linearGradient>
      </defs>
      {/* left wedge */}
      <path
        d={`M${A.x} ${A.y} L${F.x} ${F.y} L${B.x} ${B.y} C${A.x - 0.6} ${B.y - 0.4} ${A.x - 0.6} ${A.y + 0.4} ${A.x} ${A.y} Z`}
        fill="url(#pb-play-blue)"
      />
      {/* top */}
      <path d={`M${A.x} ${A.y} L${G.x} ${G.y} L${F.x} ${F.y} Z`} fill="url(#pb-play-green)" />
      {/* bottom */}
      <path d={`M${F.x} ${F.y} L${Y.x} ${Y.y} L${B.x} ${B.y} Z`} fill="url(#pb-play-yellow)" />
      {/* right tip */}
      <path
        d={`M${G.x} ${G.y} C${T.x + 0.9} ${T.y - 1.1} ${T.x + 0.9} ${T.y + 1.1} ${Y.x} ${Y.y} L${F.x} ${F.y} Z`}
        fill="url(#pb-play-red)"
      />
    </svg>
  )
}

function BadgePlate({
  height,
  icon,
  eyebrow,
  title,
  titleSize,
  plateUnits = 118,
}: {
  height: number
  icon: React.ReactNode
  eyebrow: string
  title: string
  titleSize: number
  /** plate width in height-units — official plates are 118/40; longer titles need more */
  plateUnits?: number
}) {
  const width = height * (plateUnits / 40)
  const pad = height * 0.16
  const iconH = (icon as any)?.props?.height || height * 0.44
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <rect x="0.75" y="0.75" width={width - 1.5} height={height - 1.5} rx={height * 0.235} fill={PLATE.bg} />
      <rect
        x="0.75"
        y="0.75"
        width={width - 1.5}
        height={height - 1.5}
        rx={height * 0.235}
        fill="none"
        stroke={PLATE.border}
        strokeWidth="1"
      />
      <g transform={`translate(${pad * 1.1}, ${(height - iconH) / 2})`}>{icon}</g>
      <text
        x={pad * 1.1 + height * 0.62}
        y={height * 0.36}
        fill={PLATE.text}
        fontSize={height * 0.185}
        fontFamily="Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        fontWeight={400}
        letterSpacing={height * 0.004}
      >
        {eyebrow}
      </text>
      <text
        x={pad * 1.1 + height * 0.60}
        y={height * 0.74}
        fill={PLATE.text}
        fontSize={titleSize}
        fontFamily="Inter, -apple-system, 'Helvetica Neue', Arial, sans-serif"
        fontWeight={600}
        letterSpacing={height * 0.002}
      >
        {title}
      </text>
    </svg>
  )
}

/** Apple App Store badge. */
export function AppleAppStoreBadge({ href, height = 44, className, pendingLabel, ariaLabel }: BadgeProps) {
  const live = Boolean(href)
  const inner = (
    <BadgePlate
      height={height}
      icon={<AppleLogo size={height * 0.36} />}
      eyebrow="Download on the"
      title="App Store"
      titleSize={height * 0.38}
    />
  )
  if (!live) {
    return (
      <span className={className} aria-disabled="true" title={pendingLabel || 'Coming soon'}>
        <span style={{ display: 'block', opacity: 0.45, filter: 'grayscale(0.4)' }}>{inner}</span>
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel || 'Download on the App Store'}
    >
      {inner}
    </a>
  )
}

/** Google Play badge — or an honest "Download APK" plate when the target
 *  is a direct APK (GitHub release / self-hosted) rather than a Play listing. */
export function GooglePlayBadge({ href, height = 44, className, pendingLabel, ariaLabel }: BadgeProps) {
  const live = Boolean(href)
  const isApk = Boolean(href) && !/play\.google\.com/i.test(href)
  const inner = (
    <BadgePlate
      height={height}
      icon={<GooglePlayLogo size={height * 0.44} />}
      eyebrow={isApk ? 'ANDROID APP' : 'GET IT ON'}
      title={isApk ? 'Download APK' : 'Google Play'}
      titleSize={height * 0.38}
      plateUnits={isApk ? 134 : 118}
    />
  )
  if (!live) {
    return (
      <span className={className} aria-disabled="true" title={pendingLabel || 'Coming soon'}>
        <span style={{ display: 'block', opacity: 0.45, filter: 'grayscale(0.4)' }}>{inner}</span>
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={ariaLabel || (isApk ? 'Download the Android APK' : 'Get it on Google Play')}
    >
      {inner}
    </a>
  )
}
