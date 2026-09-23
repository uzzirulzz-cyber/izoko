import React from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Zap,
  ShieldCheck,
  Headphones,
  User,
  Gem,
  Users,
  Globe,
} from 'lucide-react'

/* =========================================================
   STOREFRONT PREMIUM SHOWCASE SECTIONS (design-file match)
   Purely presentational blocks matching the approved PlayBeat
   design PDF: Premium Access banner, Stats bar, Why Choose
   tiles, "Ready to Level Up?" CTA band. No data fetching, no
   state, no routing logic — callbacks are passed by App.tsx.
   ========================================================= */

/* ---------- 1) Premium Access banner ---------- */
export const PremiumAccessBanner: React.FC<{ onCta?: () => void }> = ({ onCta }) => {
  const checklist = [
    '100% Genuine Products',
    'Instant Delivery',
    'Best Prices',
    'Secure Payments',
    '24/7 Support',
  ]

  return (
    <section className="w-full py-8">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0C1734] via-[#0A122E] to-[#081026] border border-blue-500/25 shadow-[0_0_45px_-10px_rgba(59,130,246,0.35)]">
        {/* ambient glows */}
        <div className="absolute -top-24 -right-16 w-[420px] h-[300px] bg-[radial-gradient(ellipse,_rgba(59,130,246,0.18)_0%,_transparent_65%)] blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-10 w-[380px] h-[260px] bg-[radial-gradient(ellipse,_rgba(250,204,21,0.08)_0%,_transparent_65%)] blur-3xl pointer-events-none"></div>
        {/* hairline gold top edge */}
        <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"></div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 p-7 sm:p-10 items-center">
          {/* Left narrative */}
          <div>
            <span className="pb-eyebrow">Unlock Premium Access</span>
            <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Premium Access
              <br />
              Worldwide
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-md">
              Get the best digital subscriptions, software, and entertainment — all in one
              place. Instant delivery, secure payments, and unbeatable prices.
            </p>
            <button
              onClick={onCta}
              className="group mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full btn-gold-gradient text-slate-950 font-bold text-sm shadow-lg active:scale-95 transition-all"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Right checklist */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-3.5 lg:max-w-xs lg:ml-auto w-full">
            {checklist.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-400 fill-amber-400/20 shrink-0" />
                <span className="text-sm font-semibold text-white/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ---------- 2) Stats bar ---------- */
const STATS = [
  { icon: Users, value: '100K+', label: 'Happy Customers' },
  { icon: Globe, value: '180+', label: 'Countries Covered' },
  { icon: Zap, value: '99%', label: 'Positive Reviews' },
  { icon: ShieldCheck, value: '100%', label: 'Secure & Guaranteed' },
]

export const StatsBar: React.FC = () => {
  return (
    <section className="w-full pb-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0C1734] to-[#0A122E] border border-blue-500/20 shadow-[0_0_35px_-12px_rgba(59,130,246,0.3)]">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/[0.06]">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center justify-center gap-3.5 px-4 py-6">
              <span className="w-11 h-11 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                <s.icon className="w-5 h-5 text-amber-400" />
              </span>
              <div>
                <div className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none">
                  {s.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- 3) Why Choose PlayBeat ---------- */
const WHY_TILES = [
  { icon: Crown, title: 'Premium Quality', desc: '100% original products' },
  { icon: Zap, title: 'Instant Delivery', desc: 'Get access in minutes' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Multiple payment options' },
  { icon: Headphones, title: '24/7 Support', desc: "We're always here" },
  { icon: User, title: 'User Friendly', desc: 'Simple & easy to use' },
  { icon: Gem, title: 'Best Prices', desc: 'More value, less cost' },
]

export const WhyChoosePlayBeat: React.FC<{ onExploreCategories?: () => void }> = ({
  onExploreCategories,
}) => {
  return (
    <section className="w-full py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left narrative */}
        <div className="lg:col-span-4">
          <span className="pb-eyebrow">Why Choose PlayBeat?</span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Built for a Smarter
            <br />
            Digital Life
          </h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-sm">
            From entertainment to productivity, gaming to gadgets — Playbeat brings the
            digital world closer to you.
          </p>
          <button
            onClick={onExploreCategories}
            className="group mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full btn-gold-gradient text-slate-950 font-bold text-sm shadow-lg active:scale-95 transition-all"
          >
            Explore All Categories
            <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Right tiles 2 x 3 */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {WHY_TILES.map((t) => (
            <div
              key={t.title}
              className="flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-b from-[#0C1734]/90 to-[#0A122E]/90 border border-blue-500/20 hover:border-blue-400/45 transition-colors"
            >
              <span className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                <t.icon className="w-5 h-5 text-amber-400" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white truncate">{t.title}</span>
                <span className="block text-[11px] text-slate-400 truncate">{t.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- 4) "Ready to Level Up?" CTA band ---------- */
export const LevelUpCta: React.FC<{ onCta?: () => void }> = ({ onCta }) => {
  return (
    <section className="w-full py-8">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#081026] via-[#0C1734] to-[#1A1038] border border-blue-500/25 shadow-[0_0_45px_-10px_rgba(99,102,241,0.35)]">
        {/* purple / blue ambient glows (ref: gadget collage glow) */}
        <div className="absolute -top-20 right-0 w-[460px] h-[280px] bg-[radial-gradient(ellipse,_rgba(139,92,246,0.22)_0%,_transparent_65%)] blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 right-40 w-[420px] h-[240px] bg-[radial-gradient(ellipse,_rgba(59,130,246,0.18)_0%,_transparent_65%)] blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 px-7 sm:px-10 py-8">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ready to Level Up?
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Join Playbeat today and unlock a world of endless possibilities.
            </p>
          </div>
          <button
            onClick={onCta}
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full btn-gold-gradient text-slate-950 font-bold text-sm shadow-lg active:scale-95 transition-all shrink-0"
          >
            Get Started Now
            <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  )
}
