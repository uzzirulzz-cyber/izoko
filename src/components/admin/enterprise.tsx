import React from 'react'

/* ============================================================
   PLAYBEAT ENTERPRISE ADMIN — SHARED THEME KIT
   Reusable deep-theme shells: numbered cards, view headers,
   KPI tiles, table shells and neon SVG illustrations.
   ============================================================ */

// ---------------------------------------------
// Numbered enterprise card (01-08 dashboard style)
// ---------------------------------------------
export const CARD_TONES = [
  'blue',
  'gold',
  'purple',
  'rose',
  'emerald',
  'teal',
  'amber',
  'sky',
  'fuchsia',
  'slate',
] as const

export type CardTone = (typeof CARD_TONES)[number]

export const EnterpriseCard: React.FC<{
  num: string
  tone: CardTone
  title: string
  desc: string
  className?: string
  children: React.ReactNode
}> = ({ num, tone, title, desc, className = '', children }) => (
  <div className={`pa-card pa-card--${tone} pa-card--hover p-5 space-y-4 flex flex-col justify-between ${className}`}>
    <div className='flex items-start justify-between gap-3 pb-3 border-b border-white/5'>
      <div className='flex items-center gap-2.5'>
        <span className={`pa-chip pa-chip--${tone}`}>{num}</span>
        <div>
          <h2 className='text-xs font-extrabold text-white uppercase tracking-wider font-mono'>{title}</h2>
          <p className='text-[10px] text-zinc-400 mt-0.5'>{desc}</p>
        </div>
      </div>
    </div>
    {children}
  </div>
)

// ---------------------------------------------
// View header for full pages (Catalog, Customers, ...)
// ---------------------------------------------
export const ViewHeader: React.FC<{
  icon: React.ReactNode
  tone?: CardTone
  chipA?: string
  chipB?: string
  chipGlow?: string
  title: string
  desc: string
  actions?: React.ReactNode
}> = ({ icon, tone = 'gold', chipA, chipB, chipGlow, title, desc, actions }) => (
  <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
    <div className='flex items-center gap-3'>
      <span
        className={`pa-viewchip ${tone !== 'gold' ? `pa-chip--${tone}` : ''}`}
        style={
          chipA
            ? ({ '--chip-a': chipA, '--chip-b': chipB, '--chip-glow': chipGlow } as React.CSSProperties)
            : undefined
        }
      >
        {icon}
      </span>
      <div>
        <h2 className='text-lg font-extrabold text-white tracking-tight'>{title}</h2>
        <p className='text-xs text-zinc-400 mt-0.5'>{desc}</p>
      </div>
    </div>
    {actions && <div className='flex items-center gap-2'>{actions}</div>}
  </div>
)

// ---------------------------------------------
// KPI stat tile with glowing left rail
// ---------------------------------------------
export const KpiTile: React.FC<{
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  rail?: string
  tint?: string
  edge?: string
  glow?: string
  icon?: React.ReactNode
}> = ({ label, value, sub, rail = '#3b82f6', tint, edge, glow, icon }) => (
  <div
    className='pa-kpi'
    style={
      {
        '--kpi-rail': rail,
        '--kpi-tint': tint,
        '--kpi-edge': edge,
        '--kpi-glow': glow,
      } as React.CSSProperties
    }
  >
    <div className='flex items-center justify-between mb-1.5 pl-2'>
      <span className='text-[10px] text-zinc-400 font-mono uppercase tracking-wider'>{label}</span>
      {icon}
    </div>
    <div className='pl-2'>
      <div className='text-2xl font-black text-white font-mono leading-none'>{value}</div>
      {sub && <div className='text-[10px] mt-1.5 font-mono'>{sub}</div>}
    </div>
  </div>
)

// ---------------------------------------------
// Neon SVG illustrations (dashboard cards 05-08)
// ---------------------------------------------
const NeonDefs = ({ id, color }: { id: string; color: string }) => (
  <defs>
    <filter id={`${id}-glow`} x='-60%' y='-60%' width='220%' height='220%'>
      <feGaussianBlur stdDeviation='4' result='b1' />
      <feGaussianBlur in='SourceGraphic' stdDeviation='1.6' result='b2' />
      <feMerge>
        <feMergeNode in='b1' />
        <feMergeNode in='b1' />
        <feMergeNode in='b2' />
      </feMerge>
    </filter>
    <linearGradient id={`${id}-grad`} x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stopColor='#ffffff' stopOpacity='0.95' />
      <stop offset='45%' stopColor={color} />
      <stop offset='100%' stopColor={color} stopOpacity='0.85' />
    </linearGradient>
  </defs>
)

/** Card 05 — neon shopping cart */
export const NeonCart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox='0 0 160 110' className={`${className} pa-neon-float`} fill='none' xmlns='http://www.w3.org/2000/svg'>
    <NeonDefs id='nc' color='#38bdf8' />
    <g filter='url(#nc-glow)' stroke='url(#nc-grad)' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M22 24h14l6 12m0 0 10 34h44l12-34H42z' />
      <path d='M52 88a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM96 88a5 5 0 1 0 0-10 5 5 0 0 0 0 10z' fill='rgba(56,189,248,0.25)' />
      <path d='M60 48v14M72 48v14M84 48v14' strokeWidth='2.4' />
      <path d='M118 30h20M128 20v20' strokeWidth='2.2' opacity='0.85' />
    </g>
    <g filter='url(#nc-glow)' opacity='0.5'>
      <circle cx='30' cy='86' r='1.6' fill='#7dd3fc' />
      <circle cx='140' cy='72' r='2' fill='#38bdf8' />
      <circle cx='120' cy='14' r='1.4' fill='#bae6fd' />
      <path d='M14 70l8-4M12 52l10 2' stroke='#38bdf8' strokeWidth='1.4' strokeLinecap='round' />
    </g>
  </svg>
)

/** Card 06 — neon shield with check */
export const NeonShield: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox='0 0 160 110' className={`${className} pa-neon-float`} fill='none' xmlns='http://www.w3.org/2000/svg'>
    <NeonDefs id='ns' color='#34d399' />
    <g filter='url(#ns-glow)'>
      <path
        d='M80 12l34 12v26c0 22-14 38-34 46-20-8-34-24-34-46V24l34-12z'
        stroke='url(#ns-grad)'
        strokeWidth='3'
        fill='rgba(52,211,153,0.07)'
        strokeLinejoin='round'
      />
      <path d='M66 52l10 10 20-22' stroke='url(#ns-grad)' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round' />
    </g>
    <g filter='url(#ns-glow)' opacity='0.55'>
      <circle cx='28' cy='30' r='1.8' fill='#6ee7b7' />
      <circle cx='134' cy='42' r='2' fill='#34d399' />
      <circle cx='128' cy='88' r='1.5' fill='#a7f3d0' />
      <path d='M20 74l9-5M136 66l-8 3' stroke='#34d399' strokeWidth='1.4' strokeLinecap='round' />
    </g>
    {/* heartbeat line */}
    <path
      d='M36 98h24l5-8 7 14 6-10h46'
      stroke='rgba(52,211,153,0.6)'
      strokeWidth='1.6'
      strokeLinecap='round'
      filter='url(#ns-glow)'
    />
  </svg>
)

/** Card 07 — neon lightning bolt */
export const NeonBolt: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox='0 0 160 110' className={`${className} pa-neon-float`} fill='none' xmlns='http://www.w3.org/2000/svg'>
    <NeonDefs id='nb' color='#fbbf24' />
    <g filter='url(#nb-glow)'>
      <path
        d='M86 8L48 62h22l-10 40 44-56H80l14-38z'
        stroke='url(#nb-grad)'
        strokeWidth='3'
        fill='rgba(251,191,36,0.1)'
        strokeLinejoin='round'
      />
    </g>
    <g filter='url(#nb-glow)' opacity='0.6'>
      <path d='M24 34l12-6M20 58l10 1M136 28l-10 8M140 66l-12-4' stroke='#fcd34d' strokeWidth='1.5' strokeLinecap='round' />
      <circle cx='30' cy='84' r='1.8' fill='#fde68a' />
      <circle cx='132' cy='90' r='1.6' fill='#fbbf24' />
    </g>
    {/* speed lines */}
    <g filter='url(#nb-glow)' opacity='0.45'>
      <path d='M34 74h18M28 82h14' stroke='#fbbf24' strokeWidth='1.4' strokeLinecap='round' />
    </g>
  </svg>
)

/** Card 08 — neon brain with circuit */
export const NeonBrain: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox='0 0 160 110' className={`${className} pa-neon-float`} fill='none' xmlns='http://www.w3.org/2000/svg'>
    <NeonDefs id='nr' color='#818cf8' />
    <g filter='url(#nr-glow)' stroke='url(#nr-grad)' strokeWidth='2.6' strokeLinecap='round' strokeLinejoin='round'>
      {/* left hemisphere */}
      <path
        d='M76 22c-8-8-24-7-30 2-7-1-13 5-12 12-6 3-7 12-2 16-3 6 0 14 7 16 0 8 8 13 15 11 3 6 12 8 17 3V22z'
        fill='rgba(129,140,248,0.08)'
      />
      {/* right hemisphere */}
      <path
        d='M84 22c8-8 24-7 30 2 7-1 13 5 12 12 6 3 7 12 2 16 3 6 0 14-7 16 0 8-8 13-15 11-3 6-12 8-17 3V22z'
        fill='rgba(129,140,248,0.08)'
      />
      {/* circuit traces */}
      <path d='M80 30v50M66 40c4 2 6 6 6 10M94 40c-4 2-6 6-6 10M64 60h10M86 60h10' strokeWidth='1.8' opacity='0.9' />
      <circle cx='80' cy='46' r='2.4' fill='#a5b4fc' stroke='none' />
      <circle cx='80' cy='66' r='2.4' fill='#a5b4fc' stroke='none' />
    </g>
    <g filter='url(#nr-glow)' opacity='0.55'>
      <path d='M22 26h14M18 84h16M124 24h16M128 86h14' stroke='#818cf8' strokeWidth='1.4' strokeLinecap='round' />
      <circle cx='140' cy='52' r='1.8' fill='#a5b4fc' />
      <circle cx='22' cy='52' r='1.6' fill='#818cf8' />
      <path d='M136 52h-12M26 52h12' stroke='#818cf8' strokeWidth='1.2' strokeDasharray='3 3' />
    </g>
  </svg>
)

// ---------------------------------------------
// Trend badge (↗ +18.4%)
// ---------------------------------------------
export const TrendBadge: React.FC<{ value: string; up?: boolean; className?: string }> = ({
  value,
  up = true,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-0.5 font-mono font-semibold text-[10px] ${
      up ? 'text-emerald-400' : 'text-rose-400'
    } ${className}`}
  >
    <svg viewBox='0 0 10 10' className='w-2.5 h-2.5' fill='none'>
      {up ? (
        <path d='M1 8l3-3 2 2 3-4M6 3h3v3' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
      ) : (
        <path d='M1 2l3 3 2-2 3 4M6 7h3V4' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round' strokeLinejoin='round' />
      )}
    </svg>
    {value}
  </span>
)
