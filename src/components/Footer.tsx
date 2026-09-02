import React, { useState } from 'react'
import {
  Mail,
  MessageSquare,
  ShieldCheck,
  Truck,
  FileText,
  Lock,
  Headphones,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { FooterInfoModal } from './FooterInfoModal'

type InfoType = 'privacy' | 'terms' | 'refund' | 'track' | 'warranty' | 'contact'

export interface FooterCms {
  contact: {
    email?: string
    supportEmail?: string
    whatsapp?: string
    phone?: string
    address?: string
    hours?: string
    wechat?: string
    whatsappBusiness?: string
    telegram?: string
  }
  social: {
    instagram?: string
    facebook?: string
    tiktok?: string
    telegram?: string
  }
  footer?: {
    uptimeNote?: string
  }
}

export const Footer: React.FC<{ cms?: FooterCms | null }> = ({ cms }) => {
  const [infoType, setInfoType] = useState<InfoType | null>(null)
  const supportEmail = cms?.contact?.supportEmail || 'support@playbeat.pro'
  const whatsapp = cms?.contact?.whatsapp || '923321049333'
  const uptimeNote = cms?.footer?.uptimeNote || 'Fulfillment Systems Active (99.99% Uptime)'

  return (
    <>
      <footer className="w-full bg-[#040816] border-t border-slate-400/10 text-slate-400 text-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
            {/* Brand Col */}
            <div className="md:col-span-5 space-y-3.5">
              <div className="flex items-center gap-3">
                <img
                  src="/playbeat-logo.png"
                  alt="PlayBeat"
                  className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                />
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm font-sans">
                Your premier digital license marketplace and official partner for Magcubic 4K smart
                projectors. Instant 24/7 automated delivery worldwide.
              </p>
              <div className="flex items-center gap-2 text-yellow-400 text-[11px] font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                {uptimeNote}
              </div>
            </div>

            {/* Quick Categories — every link is a real, indexable URL */}
            <div className="md:col-span-3 space-y-2.5 font-sans">
              <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                Catalog
              </h4>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <a href="/smart-4k-projectors" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Smart 4K Projectors
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/ai-subscriptions" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    AI Subscriptions
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/steam-game-keys" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Steam & Game Keys
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/windows-office" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Windows & Office
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/creative-software" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Creative Software
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/compare" className="inline-flex items-center gap-1.5 hover:text-yellow-300 transition group">
                    Projector Comparison
                    <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Customer Care — Functional Buttons */}
            <div className="md:col-span-4 space-y-2.5 font-sans">
              <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                Support
              </h4>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="flex items-center gap-2 hover:text-yellow-300 transition"
                  >
                    <Mail className="w-3.5 h-3.5 text-yellow-400" /> {supportEmail}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-yellow-300 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-yellow-400" /> WhatsApp Support (24/7)
                  </a>
                </li>
                <li>
                  <a href="/shipping-policy" className="flex items-center gap-2 hover:text-yellow-300 transition">
                    <Truck className="w-3.5 h-3.5 text-yellow-400" /> Track Courier Dispatch
                  </a>
                </li>
                <li>
                  <a href="/warranty" className="flex items-center gap-2 hover:text-yellow-300 transition">
                    <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> Warranty & Replacement Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Enhanced Dynamic Buttons — Policies & Contact (all real indexable URLs) */}
          <div className="pt-8 pb-6 border-t border-slate-400/10">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {
                [
                  {
                    href: '/warranty',
                    icon: <ShieldCheck className="w-4 h-4" />,
                    title: 'Warranty & Replacement',
                    subtitle: 'Coverage & how to claim',
                    chip: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-300',
                    glow: 'hover:border-yellow-400/60 hover:shadow-[0_0_28px_rgba(255,193,7,0.25)]',
                  },
                  {
                    href: '/privacy',
                    icon: <Lock className="w-4 h-4" />,
                    title: 'Privacy Policy',
                    subtitle: 'How your data is protected',
                    chip: 'bg-violet-500/15 border-violet-400/30 text-violet-300',
                    glow: 'hover:border-violet-400/60 hover:shadow-[0_0_28px_rgba(139,92,246,0.25)]',
                  },
                  {
                    href: '/terms',
                    icon: <FileText className="w-4 h-4" />,
                    title: 'Terms of Service',
                    subtitle: 'Fair usage & licensing terms',
                    chip: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
                    glow: 'hover:border-sky-400/60 hover:shadow-[0_0_28px_rgba(56,189,248,0.25)]',
                  },
                  {
                    href: '/refund-policy',
                    icon: <RefreshCw className="w-4 h-4" />,
                    title: 'Refund Policy',
                    subtitle: 'Fast, transparent resolutions',
                    chip: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
                    glow: 'hover:border-emerald-400/60 hover:shadow-[0_0_28px_rgba(52,211,153,0.25)]',
                  },
                  {
                    href: '/contact',
                    icon: <Headphones className="w-4 h-4" />,
                    title: 'Contact',
                    subtitle: '24/7 channels & office address',
                    chip: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
                    glow: 'hover:border-amber-400/60 hover:shadow-[0_0_28px_rgba(255,193,7,0.25)]',
                  },
                ].map((btn) => (
                <a
                  key={btn.href}
                  href={btn.href}
                  className={`group relative flex items-center gap-3 p-3.5 rounded-2xl bg-[#0A122E]/80 border border-slate-400/15 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 ${btn.glow}`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${btn.chip}`}
                  >
                    {btn.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white truncate font-sans">
                      {btn.title}
                    </span>
                    <span className="block text-[10px] text-slate-500 truncate font-sans group-hover:text-slate-400 transition">
                      {btn.subtitle}
                    </span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-yellow-300 group-hover:translate-x-1 transition-all duration-300" />
                </a>
              ))}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-slate-400/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[10px] font-mono">
            <div>© {new Date().getFullYear()} PlayBeat Digital Commerce. All rights reserved.</div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Secure checkout · Instant delivery
              </span>
            </div>
          </div>
        </div>
      </footer>

      <FooterInfoModal type={infoType} onClose={() => setInfoType(null)} />
    </>
  )
}
