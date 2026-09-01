import React from 'react'
import { Zap, ShieldCheck, Tag, Headphones } from 'lucide-react'

const ITEMS = [
  {
    icon: Zap,
    title: 'Instant Delivery',
    desc: 'Digital codes in minutes — 24/7 automated',
    color: 'text-amber-300',
    bg: 'bg-amber-400/10 border-amber-400/25',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Checkout',
    desc: 'Encrypted payments, 100% protected',
    color: 'text-emerald-300',
    bg: 'bg-emerald-400/10 border-emerald-400/25',
  },
  {
    icon: Tag,
    title: 'Best Market Prices',
    desc: 'Genuine products at unbeatable value',
    color: 'text-sky-300',
    bg: 'bg-sky-400/10 border-sky-400/25',
  },
  {
    icon: Headphones,
    title: '24/7 Human Support',
    desc: 'Real people on WhatsApp & live chat',
    color: 'text-rose-300',
    bg: 'bg-rose-400/10 border-rose-400/25',
  },
]

export const TrustFeatures: React.FC = () => {
  return (
    <section className="w-full pt-6 pb-8">
      <div className="rounded-3xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* hairline gold top edge */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {ITEMS.map((it) => (
            <div key={it.title} className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${it.bg} ${it.color}`}
              >
                <it.icon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{it.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
