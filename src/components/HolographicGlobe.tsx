import React, { useEffect, useRef, useState } from 'react'

// World continent coordinate paths (lat in [-90, 90], lon in [-180, 180])
const CONTINENTS: Array<Array<[number, number]>> = [
  // Africa
  [
    [37, 10], [36, 12], [32, 25], [31, 32], [28, 34], [22, 37], [12, 44], [11, 51],
    [5, 48], [0, 42], [-5, 39], [-11, 40], [-17, 38], [-25, 33], [-33, 28], [-34, 18],
    [-30, 17], [-20, 12], [-10, 13], [5, 9], [4, 7], [6, 2], [5, -4], [4, -8],
    [10, -14], [15, -17], [21, -17], [28, -13], [35, -6], [37, 10]
  ],
  // Madagascar
  [
    [-12, 49], [-16, 50], [-25, 47], [-25, 44], [-16, 44], [-12, 49]
  ],
  // Europe
  [
    [36, -6], [43, -9], [44, -1], [48, -4], [50, 1], [53, 5], [54, 9], [55, 12],
    [58, 6], [62, 5], [70, 28], [68, 44], [60, 30], [55, 21], [45, 14], [40, 18],
    [36, 23], [38, 24], [40, 26], [41, 29], [40, 38], [42, 42], [47, 39], [45, 36],
    [45, 30], [42, 28], [37, 15], [36, -6]
  ],
  // UK & Ireland
  [
    [50, -5], [54, -3], [58, -3], [58, -6], [55, -5], [51, 1], [50, -5]
  ],
  // Asia
  [
    [70, 30], [72, 70], [77, 105], [70, 135], [70, 180], [60, 165], [58, 160], [53, 142],
    [43, 132], [38, 128], [35, 129], [30, 122], [22, 114], [21, 108], [10, 106],
    [8, 103], [1, 104], [10, 98], [22, 90], [22, 88], [13, 80], [8, 77], [18, 73],
    [24, 68], [25, 57], [22, 59], [13, 48], [12, 44], [28, 34], [31, 35], [37, 36],
    [40, 45], [45, 50], [50, 60], [58, 60], [65, 60], [70, 30]
  ],
  // Japan
  [
    [45, 142], [43, 145], [35, 140], [33, 131], [35, 135], [40, 140], [45, 142]
  ],
  // Australia
  [
    [-11, 142], [-15, 145], [-24, 153], [-32, 152], [-38, 147], [-38, 140], [-35, 136],
    [-32, 132], [-35, 117], [-32, 115], [-22, 114], [-17, 122], [-14, 127], [-12, 132],
    [-11, 142]
  ],
  // New Zealand
  [
    [-35, 173], [-38, 178], [-41, 175], [-46, 168], [-44, 170], [-35, 173]
  ],
  // North America
  [
    [70, -165], [72, -155], [70, -130], [60, -85], [58, -64], [52, -56], [47, -53],
    [44, -66], [41, -71], [30, -81], [25, -80], [28, -96], [26, -97], [20, -97],
    [16, -93], [14, -87], [9, -79], [8, -83], [15, -93], [20, -105], [30, -114],
    [32, -117], [37, -122], [48, -125], [54, -130], [60, -145], [60, -165], [70, -165]
  ],
  // South America
  [
    [12, -72], [10, -62], [5, -52], [-2, -44], [-6, -35], [-13, -39], [-23, -42],
    [-33, -52], [-40, -62], [-52, -68], [-55, -66], [-52, -75], [-45, -75], [-35, -73],
    [-18, -71], [-5, -81], [5, -77], [10, -75], [12, -72]
  ],
  // Antarctica base rim
  [
    [-70, -180], [-68, -120], [-72, -60], [-65, 0], [-68, 60], [-66, 120], [-70, 180]
  ]
]

interface HolographicGlobeProps {
  className?: string
}

export const HolographicGlobe: React.FC<HolographicGlobeProps> = ({
  className = 'w-full h-full max-w-[480px] max-h-[480px]',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const rotationRef = useRef<number>(0.4)
  const speedRef = useRef<number>(0.008)
  const isDraggingRef = useRef(false)
  const lastMouseXRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animationFrameId: number

    const render = () => {
      if (!isDraggingRef.current) {
        rotationRef.current += speedRef.current
      }

      const width = canvas.width
      const height = canvas.height
      const cx = width / 2
      const cy = height / 2 + 10
      const radius = Math.min(width, height) * 0.38
      const tilt = 0.28 // globe axial tilt (radians)

      ctx.clearRect(0, 0, width, height)

      // 1. Ambient Background Dark Sphere Depth with Faded Glow
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      bgGrad.addColorStop(0, 'rgba(6, 18, 48, 0.35)')
      bgGrad.addColorStop(0.65, 'rgba(4, 11, 30, 0.45)')
      bgGrad.addColorStop(0.9, 'rgba(2, 6, 18, 0.6)')
      bgGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = bgGrad
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()

      // 2. Project 3D coordinate function
      const project = (latDeg: number, lonDeg: number): { x: number; y: number; z: number; visible: boolean } => {
        const lat = (latDeg * Math.PI) / 180
        const lon = (lonDeg * Math.PI) / 180 + rotationRef.current

        // 3D coordinates on unit sphere
        const x0 = Math.cos(lat) * Math.sin(lon)
        const y0 = -Math.sin(lat)
        const z0 = Math.cos(lat) * Math.cos(lon)

        // Apply axial tilt around X axis
        const y1 = y0 * Math.cos(tilt) - z0 * Math.sin(tilt)
        const z1 = y0 * Math.sin(tilt) + z0 * Math.cos(tilt)
        const x1 = x0

        return {
          x: cx + x1 * radius,
          y: cy + y1 * radius,
          z: z1,
          visible: z1 > -0.15,
        }
      }

      // 3. Draw Cyber Latitude Rings (Parallel circles)
      const latitudes = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75]
      latitudes.forEach((lat) => {
        // Sample points along the latitude
        const points: Array<{ x: number; y: number; z: number }> = []
        for (let lon = -180; lon <= 180; lon += 6) {
          const p = project(lat, lon)
          points.push(p)
        }

        // Draw back lines first (dim cyan with soft fade)
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)'
        ctx.lineWidth = 0.7
        let first = true
        for (const pt of points) {
          if (pt.z <= 0) {
            if (first) {
              ctx.moveTo(pt.x, pt.y)
              first = false
            } else {
              ctx.lineTo(pt.x, pt.y)
            }
          } else {
            first = true
          }
        }
        ctx.stroke()

        // Draw front lines (bright cyan / blue with soft fade)
        ctx.beginPath()
        ctx.strokeStyle = lat === 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(56, 189, 248, 0.28)'
        ctx.lineWidth = lat === 0 ? 1.4 : 0.9
        first = true
        for (const pt of points) {
          if (pt.z > 0) {
            if (first) {
              ctx.moveTo(pt.x, pt.y)
              first = false
            } else {
              ctx.lineTo(pt.x, pt.y)
            }
          } else {
            first = true
          }
        }
        ctx.stroke()
      })

      // 4. Draw Longitude Meridians (Every 30 degrees)
      for (let lon = 0; lon < 360; lon += 30) {
        const points: Array<{ x: number; y: number; z: number }> = []
        for (let lat = -90; lat <= 90; lat += 5) {
          points.push(project(lat, lon))
        }

        // Back segment
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)'
        ctx.lineWidth = 0.6
        let first = true
        for (const pt of points) {
          if (pt.z <= 0) {
            if (first) {
              ctx.moveTo(pt.x, pt.y)
              first = false
            } else {
              ctx.lineTo(pt.x, pt.y)
            }
          } else {
            first = true
          }
        }
        ctx.stroke()

        // Front segment
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'
        ctx.lineWidth = 1.0
        first = true
        for (const pt of points) {
          if (pt.z > 0) {
            if (first) {
              ctx.moveTo(pt.x, pt.y)
              first = false
            } else {
              ctx.lineTo(pt.x, pt.y)
            }
          } else {
            first = true
          }
        }
        ctx.stroke()
      }

      // 5. Draw Continents with Luminous Gold / Amber Neon Glow (Like in the video!)
      CONTINENTS.forEach((polygon) => {
        // Collect projected vertices
        const projected = polygon.map(([lat, lon]) => project(lat, lon))

        // Check if any part is visible on front
        const hasFront = projected.some((p) => p.z > 0)
        if (!hasFront) return

        ctx.beginPath()
        let started = false

        for (let i = 0; i < projected.length; i++) {
          const pt = projected[i]
          if (pt.z > -0.15) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y)
              started = true
            } else {
              ctx.lineTo(pt.x, pt.y)
            }
          } else {
            started = false
          }
        }

        // Continent inner fill (semi-transparent warm glow)
        ctx.fillStyle = 'rgba(255, 179, 0, 0.07)'
        ctx.fill()

        // Continent Neon Gold Contour Line
        ctx.strokeStyle = '#FFC107'
        ctx.lineWidth = 1.7
        ctx.shadowColor = '#FF9800'
        ctx.shadowBlur = 10
        ctx.stroke()
        ctx.shadowBlur = 0 // Reset shadow blur
      })

      // 6. South Pole Radiant Beacon Base Ring (Exact from Video!)
      const southPole = project(-88, 0)
      if (southPole.z > -0.5) {
        // Glowing concentric beacon rings at the base
        const poleGrad = ctx.createRadialGradient(
          southPole.x,
          southPole.y,
          2,
          southPole.x,
          southPole.y,
          radius * 0.28
        )
        poleGrad.addColorStop(0, 'rgba(255, 235, 59, 0.85)')
        poleGrad.addColorStop(0.3, 'rgba(255, 152, 0, 0.6)')
        poleGrad.addColorStop(0.7, 'rgba(230, 81, 0, 0.2)')
        poleGrad.addColorStop(1, 'transparent')

        ctx.fillStyle = poleGrad
        ctx.beginPath()
        ctx.arc(southPole.x, southPole.y, radius * 0.25, 0, Math.PI * 2)
        ctx.fill()

        // Inner glowing ring
        ctx.beginPath()
        ctx.strokeStyle = '#FFE082'
        ctx.lineWidth = 1.8
        ctx.shadowColor = '#FFB300'
        ctx.shadowBlur = 12
        ctx.arc(southPole.x, southPole.y, radius * 0.12, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // 7. Outer Spherical Atmosphere Rim Glow (Cyan & Gold faded)
      const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.04)
      rimGrad.addColorStop(0, 'transparent')
      rimGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.2)')
      rimGrad.addColorStop(0.95, 'rgba(56, 189, 248, 0.55)')
      rimGrad.addColorStop(1, 'transparent')

      ctx.fillStyle = rimGrad
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.03, 0, Math.PI * 2)
      ctx.fill()

      // 8. Outer Holographic Thin Border Ring with Soft Fade
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
      ctx.lineWidth = 1.0
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // Mouse / Touch drag to spin the 3D globe interactively
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    lastMouseXRef.current = e.clientX
    setIsInteracting(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const deltaX = e.clientX - lastMouseXRef.current
    lastMouseXRef.current = e.clientX
    rotationRef.current += deltaX * 0.008
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    setIsInteracting(false)
  }

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Outer Holographic Energy Glow with Soft Radial Fade */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(56,189,248,0.18)_0%,_rgba(255,193,7,0.12)_45%,_transparent_72%)] blur-3xl pointer-events-none animate-pulse"></div>

      {/* Orbiting Ring Particles with Soft Fade */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" viewBox="0 0 500 500">
        <defs>
          <linearGradient id="orbitGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#FFC107" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Diagonal Orbit Ring */}
        <ellipse
          cx="250"
          cy="260"
          rx="220"
          ry="75"
          fill="none"
          stroke="url(#orbitGlow)"
          strokeWidth="1.5"
          transform="rotate(-22 250 260)"
          className="opacity-60 drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]"
        />
        <ellipse
          cx="250"
          cy="260"
          rx="210"
          ry="65"
          fill="none"
          stroke="#FFC107"
          strokeWidth="0.9"
          strokeDasharray="6 6"
          transform="rotate(28 250 260)"
          className="opacity-40"
        />

        {/* Orbiting Golden Particle Nodes */}
        <circle cx="430" cy="205" r="4.5" fill="#FFC107" className="drop-shadow-[0_0_8px_#FFC107]" />
        <circle cx="70" cy="315" r="3.5" fill="#38BDF8" className="drop-shadow-[0_0_6px_#38BDF8]" />
      </svg>

      {/* 3D Canvas Globe with Soft Feathered Edge Fade (Resolution: 520x520) */}
      <canvas
        ref={canvasRef}
        width={520}
        height={520}
        className="w-full h-full relative z-10 cursor-grab active:cursor-grabbing opacity-90 hover:opacity-100 transition-opacity duration-300 drop-shadow-[0_0_30px_rgba(56,189,248,0.28)] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_98%)]"
      />
    </div>
  )
}
