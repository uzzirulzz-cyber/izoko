import React from 'react'
import {
  Tv,
  CheckCircle2,
  Zap,
  ArrowRight,
  Shield,
  Eye,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { Product, CurrencyCode } from '../types'
import { formatPrice } from '../lib/currency'

interface ProjectorSpecMatrixProps {
  projectors: Product[]
  currency: CurrencyCode
  onAddToCart: (p: Product) => void
  onQuickView: (p: Product) => void
}

export const ProjectorSpecMatrix: React.FC<ProjectorSpecMatrixProps> = ({
  projectors,
  currency,
  onAddToCart,
  onQuickView,
}) => {
  return (
    <section className="py-14 border-b border-slate-400/10 bg-[#050814] relative overflow-hidden">
      {/* Water-Glow Background Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] water-glow-layer blur-3xl opacity-30 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[10px] font-mono font-bold badge-gold uppercase tracking-wider mb-2.5">
            <Tv className="w-3.5 h-3.5" /> Hardware Specification Matrix
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Compare Smart <span className="text-gold-gradient font-serif italic font-normal">4K Cinema Projectors</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 font-sans">
            Evaluate ANSI lumens brightness, decoding capabilities, optical clarity, and wireless bandwidth across the PlayBeat lineup.
          </p>
        </div>

        {/* Scrollable Comparison Table in Navy Glass */}
        <div className="overflow-x-auto rounded-[22px] border border-slate-400/20 bg-[#0A122E]/90 backdrop-blur-xl shadow-2xl">
          <table className="w-full text-left text-xs text-slate-200 border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-400/15 bg-[#060B1E]">
                <th className="p-4 sm:p-5 font-mono text-[10px] uppercase tracking-wider text-slate-400 w-48">
                  Hardware Parameter
                </th>
                {projectors.map((p) => (
                  <th key={p.id} className="p-4 sm:p-5 font-medium text-white min-w-[190px]">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-yellow-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                        {p.sku}
                      </span>
                      <span className="font-bold text-sm line-clamp-1">{p.name}</span>
                      <span className="text-white font-mono font-black text-base mt-0.5">
                        {formatPrice(p.price, currency)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400/10">
              {/* Brightness ANSI */}
              <tr className="hover:bg-white/[0.02] transition">
                <td className="p-4 sm:p-5 font-medium text-slate-400 bg-[#060B1E]/60 font-mono text-[11px]">
                  ANSI Lumens Brightness
                </td>
                {projectors.map((p) => (
                  <td key={p.id} className="p-4 sm:p-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-yellow-400/10 text-yellow-300 border border-yellow-400/30">
                      {p.projectorSpec?.brightnessAnsi} ANSI LM
                    </span>
                  </td>
                ))}
              </tr>

              {/* Native Resolution */}
              <tr className="hover:bg-white/[0.02] transition">
                <td className="p-4 sm:p-5 font-medium text-slate-400 bg-[#060B1E]/60 font-mono text-[11px]">
                  Native Resolution
                </td>
                {projectors.map((p) => (
                  <td key={p.id} className="p-4 sm:p-5 font-mono text-slate-100 font-semibold">
                    {p.projectorSpec?.nativeResolution || '1080P Native (4K/8K Support)'}
                  </td>
                ))}
              </tr>

              {/* Operating System */}
              <tr className="hover:bg-white/[0.02] transition">
                <td className="p-4 sm:p-5 font-medium text-slate-400 bg-[#060B1E]/60 font-mono text-[11px]">
                  Smart Operating System
                </td>
                {projectors.map((p) => (
                  <td key={p.id} className="p-4 sm:p-5 text-slate-300 font-mono">
                    {p.projectorSpec?.os || 'Android 14'}
                  </td>
                ))}
              </tr>

              {/* Processor & Memory */}
              <tr className="hover:bg-white/[0.02] transition">
                <td className="p-4 sm:p-5 font-medium text-slate-400 bg-[#060B1E]/60 font-mono text-[11px]">
                  Processor & Memory
                </td>
                {projectors.map((p) => (
                  <td key={p.id} className="p-4 sm:p-5 font-mono text-[11px] text-slate-300">
                    {p.projectorSpec?.cpu} ({p.projectorSpec?.ramRom})
                  </td>
                ))}
              </tr>

              {/* Wireless Connectivity */}
              <tr className="hover:bg-white/[0.02] transition">
                <td className="p-4 sm:p-5 font-medium text-slate-400 bg-[#060B1E]/60 font-mono text-[11px]">
                  Wireless Connectivity
                </td>
                {projectors.map((p) => (
                  <td key={p.id} className="p-4 sm:p-5 font-mono">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-yellow-400 font-bold">
                        {p.projectorSpec?.wifi || 'Dual WiFi 6'}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {p.projectorSpec?.bluetooth || 'Bluetooth 5.4'}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Auto Keystone & Focus */}
              <tr className="hover:bg-white/[0.02] transition">
                <td className="p-4 sm:p-5 font-medium text-slate-400 bg-[#060B1E]/60 font-mono text-[11px]">
                  Keystone & Focus
                </td>
                {projectors.map((p) => (
                  <td key={p.id} className="p-4 sm:p-5 text-[11px] text-slate-300 font-mono">
                    {p.projectorSpec?.keystone} • {p.projectorSpec?.focus}
                  </td>
                ))}
              </tr>

              {/* Action Buttons */}
              <tr className="bg-[#060B1E]">
                <td className="p-4 sm:p-5 font-mono text-[10px] uppercase text-slate-400">Order Allocation</td>
                {projectors.map((p) => (
                  <td key={p.id} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onAddToCart(p)}
                        className="w-full py-2 px-3 rounded-xl btn-gold-gradient text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add to Cart</span>
                      </button>
                      <button
                        onClick={() => onQuickView(p)}
                        className="w-full py-1.5 px-3 rounded-xl btn-silver-metallic text-slate-200 text-[11px] font-semibold transition flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Inspect Specs</span>
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
