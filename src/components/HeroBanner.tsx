import React, { useRef, useState } from 'react'
import { ShieldCheck, Zap, Headphones, Globe, ShoppingCart, ChevronRight, LayoutGrid } from 'lucide-react'

interface HeroBannerProps {
  onExploreProducts: () => void
  onExploreSubscriptions: () => void
  onBrowseCategories?: () => void
  productsCount?: number
  categoriesCount?: number
}

/**
 * HeroBanner — "PlayBeat Digital — Hero Header" design implementation.
 * Left: eyebrow, Unbounded H1 (gradient DIGITAL), category tagline, four
 * trust stats, Shop Now / Explore Categories CTAs.
 * Right: animated 3D brand stage — floating service tiles (Netflix, ChatGPT,
 * Prime Video, Disney+, YouTube Premium, NordVPN, Adobe, Spotify, CapCut,
 * Canva Pro) around the PlayBeat core tile + gold VIP crown, gamepad,
 * laptop and projector on a glowing pod, with pointer-tilt parallax
 * (hero-3d interaction spec).
 */
export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreProducts,
  onBrowseCategories,
}) => {
  // Pointer tilt on the whole stage (desktop, skipped for reduced motion —
  // the CSS handles the reduced-motion case for the idle float animations)
  const stageRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState('')

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt(`rotateY(${(x * 12).toFixed(2)}deg) rotateX(${(-y * 9).toFixed(2)}deg)`)
  }

  return (
    <section className="pb-mont relative overflow-hidden bg-[#040a1c] border-b border-[#172a57]">
      {/* Deep-navy backdrop glows (design body gradient) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] right-[5%] w-[800px] h-[520px] bg-[radial-gradient(closest-side,rgba(36,26,110,0.55),transparent)] blur-2xl"></div>
        <div className="absolute -top-10 left-[2%] w-[600px] h-[300px] bg-[radial-gradient(closest-side,rgba(11,42,107,0.35),transparent)] blur-2xl"></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-14 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-6 items-center">
          {/* ============ Left — narrative ============ */}
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3.5">
              <span className="text-[10.5px] sm:text-[12.5px] font-bold tracking-[0.28em] sm:tracking-[0.4em] text-[#c9d5fa]">
                PREMIUM DIGITAL PRODUCTS &amp; SUBSCRIPTIONS
              </span>
              <span className="pb-eyebrow-line hidden xl:block" aria-hidden></span>
            </div>

            {/* H1 — Unbounded 900, DIGITAL in gold→orange gradient */}
            <h1
              className="pb-unbounded mt-6 font-black uppercase leading-[1.05] tracking-tight text-white text-[clamp(34px,4.6vw,66px)]"
              style={{ textShadow: '0 4px 30px rgba(58,107,255,0.2)' }}
            >
              <span className="block">Your world of</span>
              <span className="block pb-h1-y">Digital</span>
              <span className="block">Possibilities</span>
            </h1>

            {/* Category tagline */}
            <p className="mt-5 text-lg sm:text-xl text-[#dfe7ff] font-semibold flex flex-wrap items-center gap-x-3.5 gap-y-1">
              {['Movies', 'Streaming', 'Software', 'Games', 'AI Tools', 'Gadgets'].map((c, i) => (
                <React.Fragment key={c}>
                  {i > 0 && <span className="text-[#6b7fb5] not-italic">•</span>}
                  <span>{c}</span>
                </React.Fragment>
              ))}
            </p>

            {/* Trust stats */}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-5">
              {[
                {
                  icon: <ShieldCheck className="w-9 h-9 text-[#ffc21a]" strokeWidth={1.6} />,
                  big: '100%',
                  small: 'Genuine Products',
                },
                {
                  icon: <Zap className="w-9 h-9 text-[#ff8a1f]" strokeWidth={1.6} />,
                  big: 'Instant',
                  small: 'Digital Delivery',
                },
                {
                  icon: <Headphones className="w-9 h-9 text-[#ffa21f]" strokeWidth={1.6} />,
                  big: '24/7',
                  small: 'Customer Support',
                },
                {
                  icon: <Globe className="w-9 h-9 text-[#3f95ff]" strokeWidth={1.6} />,
                  big: 'Worldwide',
                  small: 'Access',
                },
              ].map((t) => (
                <div key={t.small} className="flex items-center gap-3">
                  {t.icon}
                  <span className="text-[13px] leading-tight text-[#9db0dc]">
                    <b className="block text-[17px] font-bold text-[#eef2ff]">{t.big}</b>
                    {t.small}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-9 flex flex-wrap gap-4">
              <button
                id="hero-explore-products-btn"
                onClick={onExploreProducts}
                className="group flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-b from-[#ffd43d] to-[#f6a700] text-[#1b1300] font-extrabold text-[17px] shadow-[0_10px_34px_rgba(255,179,0,0.33)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                Shop Now
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                id="hero-view-subscriptions-btn"
                onClick={onBrowseCategories}
                className="flex items-center gap-3 px-8 py-4 rounded-full border border-[#2b3f78] bg-[#091431] text-[#eef2ff] font-bold text-[17px] hover:-translate-y-0.5 hover:border-[#3f5ba8] active:translate-y-0 active:scale-[0.98] transition-all"
              >
                <LayoutGrid className="w-5 h-5 text-[#4aa8ff]" />
                Explore Categories
                <ChevronRight className="w-5 h-5 text-[#9db0dc]" />
              </button>
            </div>
          </div>

          {/* ============ Right — animated 3D brand stage ============ */}
          <div className="pb-stage-wrap hidden md:block justify-self-center lg:justify-self-end w-full max-w-[560px] lg:max-w-[720px]">
            <div
              ref={stageRef}
              aria-hidden="true"
              className="pb-stage"
              style={tilt ? { transform: tilt } : undefined}
              onMouseMove={handleTilt}
              onMouseLeave={() => setTilt('')}
            >
              <div className="pb-ring pb-ring-1"></div>
              <div className="pb-ring pb-ring-2"></div>
              <div className="pb-pod"></div>

              {/* Netflix */}
              <div className="pb-tile" style={{ left: '20%', top: '8%', '--r': '-9deg', '--c1': '#1a0a18', '--g': 'rgba(229,9,20,0.33)' } as React.CSSProperties}>
                <svg viewBox="0 0 24 24">
                  <path d="M6 2h4l4 11V2h4v20h-4L10 11v11H6z" fill="#e50914" />
                </svg>
              </div>

              {/* ChatGPT */}
              <div className="pb-tile" style={{ left: '41%', top: 0, '--w': '18%', '--c1': '#0d2146', '--d': '.8s' } as React.CSSProperties}>
                <div className="pb-col">
                  <svg viewBox="0 0 24 24" style={{ width: '60%' }} fill="none" stroke="#fff" strokeWidth="1.7">
                    <path d="M12 3l7 4v8l-7 4-7-4V7z" />
                    <path d="M12 3v8l7 4M5 7l7 4v8M19 7l-7 4" />
                  </svg>
                  <span className="pb-tx">ChatGPT</span>
                </div>
              </div>

              {/* Prime Video */}
              <div className="pb-tile" style={{ left: '60%', top: '3%', '--r': '7deg', '--c1': '#0a3a8f', '--c2': '#07194a', '--g': 'rgba(58,168,255,0.53)', '--d': '1.6s' } as React.CSSProperties}>
                <div className="pb-col">
                  <span className="pb-tx" style={{ color: '#6fd0ff', fontSize: 'clamp(12px,2.1vw,28px)', fontStyle: 'italic' }}>
                    prime
                    <br />
                    video
                  </span>
                  <svg viewBox="0 0 40 10" style={{ width: '60%' }}>
                    <path d="M3 3c12 7 26 7 34 0" stroke="#6fd0ff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Disney+ */}
              <div className="pb-tile" style={{ left: '79%', top: '15%', '--w': '19%', '--r': '8deg', '--c1': '#0c2a85', '--c2': '#07123b', '--d': '2.2s' } as React.CSSProperties}>
                <div className="pb-col">
                  <span className="pb-tx" style={{ font: 'italic 800 clamp(12px,2.2vw,30px) Georgia, serif' }}>
                    Disney+
                  </span>
                  <svg viewBox="0 0 40 10" style={{ width: '70%' }}>
                    <path d="M3 8C10 1 30 1 37 8" stroke="#fff" strokeWidth="1.8" fill="none" />
                  </svg>
                </div>
              </div>

              {/* YouTube Premium */}
              <div className="pb-tile" style={{ left: '3%', top: '30%', '--r': '-9deg', '--c1': '#1d1226', '--d': '1.2s' } as React.CSSProperties}>
                <div className="pb-col">
                  <svg viewBox="0 0 32 22" style={{ width: '56%' }}>
                    <rect width="32" height="22" rx="6" fill="#ff1a1a" />
                    <path d="M13 6l9 5-9 5z" fill="#fff" />
                  </svg>
                  <span className="pb-tx">
                    YouTube
                    <br />
                    Premium
                  </span>
                </div>
              </div>

              {/* NordVPN */}
              <div className="pb-tile" style={{ left: '77%', top: '35%', '--r': '5deg', '--c1': '#0c2158', '--d': '.4s' } as React.CSSProperties}>
                <div className="pb-col">
                  <svg viewBox="0 0 32 24" style={{ width: '58%' }}>
                    <path d="M2 22L12 4l5 8 3-4 10 14z" fill="#fff" />
                  </svg>
                  <span className="pb-tx" style={{ fontSize: 'clamp(8px,1.3vw,17px)' }}>
                    NordVPN
                  </span>
                </div>
              </div>

              {/* Adobe */}
              <div className="pb-tile" style={{ left: '88%', top: '47%', '--w': '15%', '--r': '9deg', '--c1': '#240a14', '--g': 'rgba(255,42,58,0.4)', '--d': '1.9s' } as React.CSSProperties}>
                <svg viewBox="0 0 24 24" style={{ width: '60%' }}>
                  <path d="M0 22V2h7.5zM24 22V2h-7.5zM12 9l5 13h-3.4l-1.6-4.2h-3.3z" fill="#ff1f2d" />
                </svg>
              </div>

              {/* Spotify */}
              <div className="pb-tile" style={{ left: '13%', top: '51%', '--w': '22%', '--r': '-4deg', '--c1': '#0e1d30', '--c2': '#06101e', '--d': '2.6s' } as React.CSSProperties}>
                <div className="pb-col">
                  <svg viewBox="0 0 24 24" style={{ width: '52%' }}>
                    <circle cx="12" cy="12" r="11" fill="#1ed760" />
                    <path
                      d="M5.5 9c4-1.2 9-.9 13 1.2M6.5 12.5c3.5-1 7-.7 10.5 1M7.5 15.8c3-.8 6-.5 8.7.9"
                      stroke="#08130d"
                      strokeWidth="1.7"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="pb-tx">Spotify</span>
                </div>
              </div>

              {/* CapCut */}
              <div className="pb-tile" style={{ left: '72%', top: '57%', '--w': '20%', '--r': '6deg', '--c1': '#171c2e', '--d': '.2s' } as React.CSSProperties}>
                <div className="pb-col">
                  <svg viewBox="0 0 24 24" style={{ width: '48%' }} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <path d="M4 5l16 14M4 19L9 14M20 5l-5 5" />
                  </svg>
                  <span className="pb-tx" style={{ fontSize: 'clamp(8px,1.3vw,17px)' }}>
                    CapCut
                  </span>
                </div>
              </div>

              {/* Canva Pro */}
              <div className="pb-tile" style={{ left: '-1%', top: '64%', '--w': '21%', '--r': '-10deg', '--c1': '#3b5bff', '--c2': '#8a3bff', '--g': 'rgba(122,75,255,0.53)', '--d': '1.4s' } as React.CSSProperties}>
                <span className="pb-tx" style={{ font: 'italic 700 clamp(10px,1.8vw,24px) Georgia, serif' }}>
                  Canva Pro
                </span>
              </div>

              {/* Gamepad */}
              <svg className="pb-gear" viewBox="0 0 120 80" style={{ left: '17%', top: '68%', width: '19%' }}>
                <path
                  d="M16 22c-9 0-14 12-12 28 2 12 8 14 14 6l8-10h40l8 10c6 8 12 6 14-6 2-16-3-28-12-28z"
                  fill="#1b2a55"
                  stroke="#4a6bd0"
                  strokeWidth="2"
                />
                <circle cx="34" cy="38" r="9" fill="#0b1432" />
                <path d="M34 33v10M29 38h10" stroke="#8fb0ff" strokeWidth="3" />
                <circle cx="88" cy="32" r="3.5" fill="#ff5a5a" />
                <circle cx="98" cy="40" r="3.5" fill="#5adf8a" />
                <circle cx="78" cy="40" r="3.5" fill="#5ab0ff" />
              </svg>

              {/* Laptop */}
              <svg className="pb-gear" viewBox="0 0 160 110" style={{ left: '28%', top: '56%', width: '30%' }}>
                <defs>
                  <linearGradient id="pb-pgrad-hero" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#3b82ff" />
                    <stop offset=".5" stopColor="#b44bff" />
                    <stop offset="1" stopColor="#ff7a00" />
                  </linearGradient>
                </defs>
                <path d="M30 8h100a5 5 0 0 1 5 5v68H25V13a5 5 0 0 1 5-5z" fill="#0b1432" stroke="#6a8bff" strokeWidth="2.5" />
                <rect x="32" y="15" width="96" height="60" fill="url(#pb-pgrad-hero)" opacity=".85" />
                <path d="M12 84h136l8 14H4z" fill="#2b3a6a" stroke="#6a8bff" strokeWidth="2" />
              </svg>

              {/* Projector */}
              <svg className="pb-gear" viewBox="0 0 130 100" style={{ left: '68%', top: '66%', width: '25%' }}>
                <path d="M20 40l70-22 12 30-70 22z" fill="#e8eefc" />
                <circle cx="26" cy="64" r="20" fill="#cfd8f0" />
                <circle cx="26" cy="64" r="13" fill="#0c1a44" stroke="#4aa8ff" strokeWidth="3" />
                <circle cx="26" cy="64" r="5" fill="#6fd0ff" />
                <rect x="60" y="76" width="36" height="12" rx="3" fill="#8fa0c8" />
              </svg>

              {/* Core PlayBeat tile */}
              <div className="pb-tile pb-tile-core">
                <img
                  src="/playbeat-logo-3d.png"
                  alt="PlayBeat Digital"
                  style={{ width: '88%', filter: 'drop-shadow(0 0 18px rgba(63,149,255,0.53))' }}
                />
              </div>

              {/* Gold VIP crown */}
              <svg className="pb-crown" viewBox="0 0 100 80">
                <defs>
                  <linearGradient id="pb-gold-hero" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff0a0" />
                    <stop offset=".5" stopColor="#ffb800" />
                    <stop offset="1" stopColor="#b86a00" />
                  </linearGradient>
                </defs>
                <path d="M6 66L2 20l25 20 23-34 23 34 25-20-4 46z" fill="url(#pb-gold-hero)" stroke="#8a5200" strokeWidth="2" />
                <circle cx="2" cy="20" r="4" fill="#ffe27a" />
                <circle cx="50" cy="6" r="4" fill="#ffe27a" />
                <circle cx="98" cy="20" r="4" fill="#ffe27a" />
                <text x="50" y="60" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="24" fill="#7a3f00">
                  VIP
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
