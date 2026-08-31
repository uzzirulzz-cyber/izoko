import React, { useState } from 'react'
import {
  Mail,
  MessageSquare,
  ShieldCheck,
  Truck,
  RefreshCw,
  FileText,
  Lock,
  Phone,
  Send,
  Instagram,
  Facebook,
  Headphones,
  MapPin,
  ExternalLink,
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

  const email = cms?.contact?.email || 'support@playbeat.digital'
  const supportEmail = cms?.contact?.supportEmail || 'support@playbeat.pro'
  const whatsapp = cms?.contact?.whatsapp || '923000000000'
  const address = cms?.contact?.address || 'PlayBeat Digital Pvt Ltd, Gulberg III, Lahore, Punjab, Pakistan'
  const social = cms?.social || {}
  const uptimeNote = cms?.footer?.uptimeNote || 'Fulfillment Systems Active (99.99% Uptime)'
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <>
      <footer className="w-full bg-[#040816] border-t border-slate-400/10 text-slate-400 text-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
            {/* Brand Col */}
            <div className="md:col-span-4 space-y-3.5">
              <div className="flex items-center gap-3">
                <img
                  src="/playbeat-logo.png"
                  alt="PlayBeat"
                  className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                />
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm font-sans">
                Your premier digital license marketplace and official partner for Magcubic 4K smart projectors. Instant 24/7 automated delivery worldwide.
              </p>
              <div className="flex items-center gap-2 text-yellow-400 text-[11px] font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
                {uptimeNote}
              </div>

              {/* Office Address — dynamically managed via Website Builder CMS */}
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 transition group max-w-sm"
                title="Open office address in Google Maps"
              >
                <MapPin className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0 group-hover:scale-110 transition" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                    Head Office
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed group-hover:text-yellow-200 transition">
                    {address}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-yellow-300/90">
                    View on Google Maps <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                </div>
              </a>

              {/* Quick Contact Buttons */}
              <div className="pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 font-bold">
                  Quick Contact
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/40 hover:text-yellow-300 text-[10px] font-semibold text-slate-300 transition"
                    title="Email Support"
                  >
                    <Mail className="w-3 h-3 text-yellow-400" />
                    Email
                  </a>
                  <a
                    href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-emerald-400/40 hover:text-emerald-300 text-[10px] font-semibold text-slate-300 transition"
                    title="WhatsApp 24/7"
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                    WhatsApp
                  </a>
                  {social?.instagram && (
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-pink-400/40 hover:text-pink-300 text-[10px] font-semibold text-slate-300 transition"
                      title="Instagram"
                    >
                      <Instagram className="w-3 h-3 text-pink-400" />
                      Instagram
                    </a>
                  )}
                  {social?.facebook && (
                    <a
                      href={social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-blue-400/40 hover:text-blue-300 text-[10px] font-semibold text-slate-300 transition"
                      title="Facebook"
                    >
                      <Facebook className="w-3 h-3 text-blue-400" />
                      Facebook
                    </a>
                  )}
                  {social?.telegram && (
                    <a
                      href={social.telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A122E] border border-slate-400/15 hover:border-sky-400/40 hover:text-sky-300 text-[10px] font-semibold text-slate-300 transition"
                      title="Telegram"
                    >
                      <Send className="w-3 h-3 text-sky-400" />
                      Telegram
                    </a>
                  )}
                  {/* Dynamic Contact Button — navigates to full contact page */}
                  <a
                    href="/contact"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-gold-gradient text-slate-950 text-[10px] font-bold transition shadow-sm"
                    title="All contact channels & office address"
                  >
                    <Headphones className="w-3 h-3" />
                    Contact Us
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Categories */}
            <div className="md:col-span-2 space-y-2.5 font-sans">
              <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">Catalog</h4>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li className="hover:text-yellow-300 transition cursor-pointer">Smart 4K Projectors</li>
                <li className="hover:text-yellow-300 transition cursor-pointer">AI Subscriptions</li>
                <li className="hover:text-yellow-300 transition cursor-pointer">Steam & Game Keys</li>
                <li className="hover:text-yellow-300 transition cursor-pointer">Windows & Office</li>
                <li className="hover:text-yellow-300 transition cursor-pointer">Creative Software</li>
              </ul>
            </div>

            {/* Customer Care — Functional Buttons */}
            <div className="md:col-span-3 space-y-2.5 font-sans">
              <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">Support</h4>
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
                  <button
                    onClick={() => setInfoType('warranty')}
                    className="flex items-center gap-2 hover:text-yellow-300 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" /> Warranty & Replacement Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Payment Badges */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="font-mono text-slate-300 uppercase tracking-wider text-[10px] font-bold">Secure Gateways</h4>
              <div className="flex flex-wrap gap-1.5">
                {['Visa', 'Mastercard', 'EasyPaisa', 'JazzCash', 'Binance Pay', 'Apple Pay'].map(
                  (gateway) => (
                    <span
                      key={gateway}
                      className="px-2.5 py-1 rounded-lg bg-[#0A122E] border border-slate-400/15 text-[10px] text-slate-300 font-mono"
                    >
                      {gateway}
                    </span>
                  )
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-normal">
                256-Bit SSL military-grade encryption. Instant automated fulfillment to verified email.
              </p>
            </div>
          </div>

          {/* Bottom Bar — Policy Links (real pages) */}
          <div className="pt-6 border-t border-slate-400/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[10px] font-mono">
            <div>
              © {new Date().getFullYear()} PlayBeat Digital Commerce. All rights reserved.
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <a
                href="/privacy"
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 hover:text-yellow-300 transition"
              >
                <Lock className="w-3 h-3" />
                Privacy Policy
              </a>
              <span className="text-slate-700">•</span>
              <a
                href="/terms"
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 hover:text-yellow-300 transition"
              >
                <FileText className="w-3 h-3" />
                Terms of Service
              </a>
              <span className="text-slate-700">•</span>
              <a
                href="/refund-policy"
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 hover:text-yellow-300 transition"
              >
                <RefreshCw className="w-3 h-3" />
                Refund Policy
              </a>
              <span className="text-slate-700">•</span>
              <a
                href="/contact"
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 hover:text-yellow-300 transition"
              >
                <MapPin className="w-3 h-3" />
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      <FooterInfoModal type={infoType} onClose={() => setInfoType(null)} />
    </>
  )
}
