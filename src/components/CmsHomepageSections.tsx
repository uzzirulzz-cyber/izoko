// CmsHomepageSections — DB-driven homepage builder blocks (Section 4.9).
// Renders the enabled sections from GET /api/cms/homepage — banners,
// testimonials and FAQ blocks created/reordered in Admin → Website & CMS →
// Homepage Builder. When nothing is configured the component renders nothing,
// so the storefront is identical to the pre-builder layout by default.

import React, { useEffect, useState } from 'react'
import { Star, ChevronDown, Sparkles } from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

interface CmsItem {
  title?: string
  body?: string
  author?: string
  rating?: number
  image?: string
  link?: string
}

interface CmsSection {
  id: string
  type: 'hero' | 'banner' | 'featured' | 'faq' | 'testimonial'
  order: number
  title: string
  subtitle: string
  body: string
  image: string | null
  link: string | null
  linkLabel: string | null
  badge: string | null
  items: CmsItem[]
}

export const CmsHomepageSections: React.FC = () => {
  const [sections, setSections] = useState<CmsSection[] | null>(null)
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`${API_BASE}/api/cms/homepage`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.success && Array.isArray(d.sections)) {
          setSections(d.sections.filter((s: CmsSection) => s.type !== 'hero' && s.type !== 'featured'))
        }
      })
      .catch(() => alive && setSections([]))
    return () => {
      alive = false
    }
  }, [])

  if (!sections || sections.length === 0) return null

  const banners = sections.filter((s) => s.type === 'banner')
  const testimonials = sections.filter((s) => s.type === 'testimonial')
  const faqs = sections.filter((s) => s.type === 'faq')

  return (
    <div className="w-full bg-[#050814]">
      {/* Banner blocks */}
      {banners.map((s) => (
        <section key={s.id} className="w-full py-6">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl border border-[#FFC107]/25 bg-gradient-to-r from-[#0A122E] via-[#0d1734] to-[#0A122E] px-6 py-7 sm:px-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  {s.badge && (
                    <span className="inline-block mb-2 px-3 py-1 rounded-full bg-[#FFC107]/15 border border-[#FFC107]/30 text-[#FFC107] text-[11px] font-bold uppercase tracking-wide">
                      {s.badge}
                    </span>
                  )}
                  <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight">{s.title}</h3>
                  {s.subtitle && <p className="text-sm text-slate-300 mt-1 max-w-2xl">{s.subtitle}</p>}
                </div>
                {s.link && (
                  <a
                    href={s.link}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFC107] text-[#0b1020] text-sm font-bold hover:bg-[#ffd54d] transition shrink-0"
                  >
                    {s.linkLabel || 'Learn More'}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Testimonials */}
      {testimonials.map((s) => (
        <section key={s.id} className="w-full py-10">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-1.5 h-5 rounded-full bg-[#FFC107] inline-block"></span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {s.title || 'What Our Customers Say'}
              </h2>
              {s.subtitle && <span className="text-xs text-slate-400 hidden sm:inline">— {s.subtitle}</span>}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {s.items.map((t, i) => (
                <figure
                  key={i}
                  className="rounded-2xl border border-slate-400/15 bg-[#0A122E] p-5 flex flex-col gap-3"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star
                        key={k}
                        className={`w-3.5 h-3.5 ${k < Math.round(t.rating || 5) ? 'text-[#FFC107] fill-[#FFC107]' : 'text-slate-600'}`}
                      />
                    ))}
                  </div>
                  <blockquote className="text-sm text-slate-200 leading-relaxed">"{t.body}"</blockquote>
                  <figcaption className="text-xs text-slate-400 mt-auto">
                    — {t.author || t.title || 'Verified PlayBeat customer'}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* FAQ blocks */}
      {faqs.map((s) => (
        <section key={s.id} className="w-full py-10">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-5 rounded-full bg-[#FFC107] inline-block"></span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {s.title || 'Frequently Asked Questions'}
              </h2>
            </div>
            {s.subtitle && <p className="text-sm text-slate-400 mb-5">{s.subtitle}</p>}
            <div className="space-y-3">
              {s.items.map((f, i) => {
                const key = `${s.id}-${i}`
                const open = openFaq === key
                return (
                  <div key={key} className="rounded-xl border border-slate-400/15 bg-[#0A122E] overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? null : key)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-sm font-semibold text-white">{f.title}</span>
                      <ChevronDown className={`w-4 h-4 text-[#FFC107] transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed">{f.body}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
