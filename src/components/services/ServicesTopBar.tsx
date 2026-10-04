import React from 'react'
import { Store, Mail, Briefcase } from 'lucide-react'
import { go } from './servicesContent'

// Slim branded chrome for the standalone Business Solutions pages — keeps the
// section feeling native to PlayBeat Digital without pulling the full
// storefront header (which needs cart/search/auth context).
export const ServicesTopBar: React.FC = () => (
  <header className="sticky top-0 z-40 border-b border-[rgba(148,170,210,.15)] bg-[#050913]/85 backdrop-blur-xl">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault()
          go('/')
        }}
        className="flex items-center gap-2 font-bold text-white tracking-tight"
      >
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#3d8bff] flex items-center justify-center text-[13px] font-black">PB</span>
        PlayBeat <span className="hidden sm:inline text-slate-400 font-medium">Digital</span>
      </a>
      <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            go('/')
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition"
        >
          <Store className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Store</span>
        </a>
        <a
          href="/services"
          onClick={(e) => {
            e.preventDefault()
            go('/services')
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-[#7db4ff] bg-[#3d8bff]/10 border border-[#3d8bff]/25"
        >
          <Briefcase className="w-3.5 h-3.5" /> Business Solutions
        </a>
        <a
          href="/contact"
          onClick={(e) => {
            e.preventDefault()
            go('/contact')
          }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition"
        >
          <Mail className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Contact</span>
        </a>
      </nav>
    </div>
  </header>
)

export const ServicesFooter: React.FC = () => (
  <footer className="border-t border-[rgba(148,170,210,.15)] py-8 mt-4">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8190a8]">
      <p>© {new Date().getFullYear()} PlayBeat Digital · playbeat.digital</p>
      <nav className="flex items-center gap-4">
        {[
          ['/', 'Store'],
          ['/services', 'Business Solutions'],
          ['/services/portfolio', 'Case Studies'],
          ['/contact', 'Contact'],
        ].map(([path, label]) => (
          <a
            key={path}
            href={path}
            onClick={(e) => {
              e.preventDefault()
              go(path)
            }}
            className="hover:text-white transition"
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  </footer>
)

