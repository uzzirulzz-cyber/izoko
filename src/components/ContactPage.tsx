import React, { useState } from 'react'
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  Instagram,
  Facebook,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

interface ContactPageProps {
  contact: {
    email?: string
    supportEmail?: string
    whatsapp?: string
    phone?: string
    address?: string
    hours?: string
  }
  social?: {
    instagram?: string
    facebook?: string
    tiktok?: string
    telegram?: string
  }
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export const ContactPage: React.FC<ContactPageProps> = ({ contact, social }) => {
  const email = contact?.email || 'support@playbeat.digital'
  const supportEmail = contact?.supportEmail || 'playbeatdiigital@proton.me'
  const whatsapp = contact?.whatsapp || '923321049333'
  const phone = contact?.phone || '+92 332 1049333'
  const address =
    contact?.address ||
    'House 334, Street 6, Jinnahabad, Abbottabad, Khyber Pakhtunkhwa, Pakistan'
  const hours = contact?.hours || 'Support: 24/7 Automated — Live agents 10AM-10PM PKT'
  const company = 'Playbeat Digital Private Limited'
  const waLines = [
    { label: 'WhatsApp Line 1 — Orders', num: '923321049333', pretty: '+92 332 1049333' },
    { label: 'WhatsApp Line 2 — Support', num: '923321029333', pretty: '+92 332 1029333' },
    { label: 'WhatsApp Line 3 — Escalations', num: '923341079333', pretty: '+92 334 1079333' },
  ]
  const messagingHandle = '@playbeatdigital01'

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const waLink = `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Name, email, and message are required fields.')
      return
    }
    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject || 'Customer Inquiry',
          message: form.message,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        setSent(true)
        setForm({ name: '', email: '', subject: '', message: '' })
      } else {
        setError(data?.error || 'Failed to send message. Please try again.')
      }
    } catch {
      setError('Network error — please try again or reach us on WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-12">
        <button
          onClick={() => (window.location.href = '/storefront')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-yellow-300 transition mb-8"
        >
          <span className="rotate-180 inline-flex"><ArrowRight className="w-3.5 h-3.5" /></span>
          Back to Storefront
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-[#0A122E] border border-yellow-400/30 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Contact PlayBeat</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Real humans, real channels — pick whichever suits you best.
            </p>
          </div>
        </div>

        {/* Dynamic Contact Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 mb-4">
          <a
            href={`mailto:${email}`}
            className="group flex flex-col gap-2 p-4 rounded-2xl bg-[#0A122E] border border-slate-400/15 hover:border-yellow-400/50 transition"
          >
            <Mail className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-xs font-bold text-white">Email Us</div>
              <div className="text-[10px] text-slate-400 truncate">{email}</div>
            </div>
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-2 p-4 rounded-2xl bg-[#0A122E] border border-slate-400/15 hover:border-emerald-400/50 transition"
          >
            <Phone className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">WhatsApp 24/7</div>
              <div className="text-[10px] text-slate-400">+{whatsapp.replace(/[^\d]/g, '').replace(/^92/, '92 ')}</div>
            </div>
          </a>
          <a
            href={`tel:${phone.replace(/\s/g, '')}`}
            className="group flex flex-col gap-2 p-4 rounded-2xl bg-[#0A122E] border border-slate-400/15 hover:border-sky-400/50 transition"
          >
            <Phone className="w-5 h-5 text-sky-400" />
            <div>
              <div className="text-xs font-bold text-white">Call Support</div>
              <div className="text-[10px] text-slate-400">{phone}</div>
            </div>
          </a>
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-2 p-4 rounded-2xl bg-[#0A122E] border border-slate-400/15 hover:border-pink-400/50 transition"
          >
            <MapPin className="w-5 h-5 text-pink-400" />
            <div>
              <div className="text-xs font-bold text-white">Visit Office</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                Open in Maps <ExternalLink className="w-2.5 h-2.5" />
              </div>
            </div>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Address & info panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl bg-[#0A122E]/70 border border-slate-400/15 p-6 space-y-5 shadow-xl">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white mb-1">Registered Office</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{company}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{address}</p>
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-yellow-300 hover:text-yellow-200 transition"
                  >
                    Get Directions <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white mb-1.5">WhatsApp Order Lines</div>
                  <div className="space-y-1.5">
                    {waLines.map((l) => (
                      <a
                        key={l.num}
                        href={`https://wa.me/${l.num}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 hover:border-emerald-400/40 text-[10px] transition group"
                      >
                        <span className="text-slate-400">{l.label}</span>
                        <span className="font-mono font-bold text-emerald-300 group-hover:text-emerald-200">{l.pretty}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white mb-1">Quick Messaging</div>
                  <p className="text-xs text-slate-300">
                    WeChat / WhatsApp / Telegram:{' '}
                    <code className="text-amber-300 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded">{messagingHandle}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white mb-1">Support Hours</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{hours}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white mb-1">Departments</div>
                  <p className="text-xs text-slate-300">
                    General: <a className="text-yellow-300 hover:underline" href={`mailto:${email}`}>{email}</a>
                    <br />
                    Secure Support: <a className="text-yellow-300 hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-400/10">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Follow PlayBeat</div>
                <div className="flex flex-wrap gap-2">
                  {social?.instagram && (
                    <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 hover:border-pink-400/40 text-[10px] font-semibold text-slate-300 hover:text-pink-300 transition">
                      <Instagram className="w-3 h-3 text-pink-400" /> Instagram
                    </a>
                  )}
                  {social?.facebook && (
                    <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 hover:border-blue-400/40 text-[10px] font-semibold text-slate-300 hover:text-blue-300 transition">
                      <Facebook className="w-3 h-3 text-blue-400" /> Facebook
                    </a>
                  )}
                  {social?.tiktok && (
                    <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 hover:border-pink-500/40 text-[10px] font-semibold text-slate-300 hover:text-pink-300 transition">
                      TikTok
                    </a>
                  )}
                  {social?.telegram && (
                    <a href={social.telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#060B1E] border border-slate-400/15 hover:border-sky-400/40 text-[10px] font-semibold text-slate-300 hover:text-sky-300 transition">
                      <Send className="w-3 h-3 text-sky-400" /> Telegram
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl bg-[#0A122E]/70 border border-slate-400/15 p-6 sm:p-8 shadow-xl h-full">
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-10">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">Message received!</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Your message is saved in our support desk. A PlayBeat specialist will reply within 2-4 hours.
                    For anything urgent, WhatsApp is fastest.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setSent(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-slate-400/15 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
                    >
                      Send Another
                    </button>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl btn-gold-gradient text-slate-950 text-xs font-bold transition"
                    >
                      WhatsApp Us
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-sm font-bold text-white">Send us a message</h3>
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your full name"
                      className="bg-[#060B1E] border border-slate-400/20 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/60 transition"
                    />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="Your email address"
                      className="bg-[#060B1E] border border-slate-400/20 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/60 transition"
                    />
                  </div>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Subject (e.g. Order #PB-123456 — key not activating)"
                    className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/60 transition"
                  />
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us what happened — include your order number if you have one..."
                    className="w-full bg-[#060B1E] border border-slate-400/20 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/60 transition resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-gold-gradient text-slate-950 font-extrabold text-xs shadow-lg active:scale-95 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? 'Sending…' : 'Send Message'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500">
                    Messages are stored securely in our support desk and answered in the order received.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
