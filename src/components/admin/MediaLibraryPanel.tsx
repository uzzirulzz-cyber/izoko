import React, { useMemo, useRef, useState } from 'react'
import {
  ImageIcon, Search, UploadCloud, Trash2, ArrowUpCircle, Check, Loader2, AlertTriangle,
} from 'lucide-react'
import { Product } from '../../types'

interface MediaLibraryPanelProps {
  products: Product[]
  onSaveProduct: (product: Product, isNew: boolean) => Promise<{ ok: boolean; error?: string }> | void
  triggerToast: (msg: string) => void
}

/**
 * MEDIA LIBRARY — central image management for every product in the catalog.
 * - Grid overview of all product images (main + gallery count)
 * - Inline editor per product: upload main image, add/remove gallery images
 * - Highlights products with missing or placeholder images
 */
export const MediaLibraryPanel: React.FC<MediaLibraryPanelProps> = ({
  products,
  onSaveProduct,
  triggerToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  const missingImageCount = useMemo(
    () =>
      products.filter(
        (p) =>
          !p.image ||
          p.image.includes('playbeat-logo') ||
          p.image.startsWith('brand:') ||
          p.image.includes('unsplash')
      ).length,
    [products]
  )

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleQuickReplace = async (product: Product, files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) {
      triggerToast('Please select a valid image file')
      return
    }
    if (file.size > 2.5 * 1024 * 1024) {
      triggerToast('Image too large — max 2.5MB')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const oldMain = product.image
      const updated: Product = {
        ...product,
        image: dataUrl,
        galleryImages: oldMain ? [oldMain, ...(product.galleryImages || [])] : product.galleryImages,
        gallery: [dataUrl, oldMain, ...(product.galleryImages || [])].filter(Boolean),
      }
      setSavingId(product.id)
      await onSaveProduct(updated, false)
      triggerToast(`Image updated for ${product.name}`)
    } catch {
      triggerToast('Failed to read image file')
    } finally {
      setSavingId(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemoveGalleryImage = async (product: Product, idx: number) => {
    const newGallery = (product.galleryImages || []).filter((_, i) => i !== idx)
    const updated: Product = {
      ...product,
      galleryImages: newGallery,
      gallery: [product.image, ...newGallery].filter(Boolean),
    }
    setSavingId(product.id)
    await onSaveProduct(updated, false)
    triggerToast('Gallery image removed')
    setSavingId(null)
  }

  const handleSetGalleryAsMain = async (product: Product, idx: number) => {
    const chosen = (product.galleryImages || [])[idx]
    if (!chosen) return
    const rest = (product.galleryImages || []).filter((_, i) => i !== idx)
    const newGallery = product.image ? [product.image, ...rest] : rest
    const updated: Product = {
      ...product,
      image: chosen,
      galleryImages: newGallery,
      gallery: [chosen, ...newGallery].filter(Boolean),
    }
    setSavingId(product.id)
    await onSaveProduct(updated, false)
    triggerToast('Main image swapped')
    setSavingId(null)
  }

  const isPlaceholder = (p: Product) =>
    !p.image ||
    p.image.includes('playbeat-logo') ||
    p.image.startsWith('brand:') ||
    p.image.includes('unsplash')

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="p-4 rounded-2xl bg-[#0F131D] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or SKU…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07090E] border border-white/5 text-xs text-white placeholder-zinc-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono text-zinc-300">
            {products.length} products
          </span>
          {missingImageCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 font-mono text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {missingImageCount} need images
            </span>
          )}
        </div>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const gallery = p.galleryImages || []
          const isSaving = savingId === p.id
          const editing = editingId === p.id
          return (
            <div
              key={p.id}
              className="rounded-2xl bg-[#0F131D] border border-white/5 overflow-hidden flex flex-col"
            >
              {/* Main image area */}
              <div className="relative aspect-video bg-[#07090E] group">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-[10px] font-mono">No main image</span>
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-black/70 text-zinc-300 border border-white/10">
                    {p.category}
                  </span>
                  {isPlaceholder(p) && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-400/90 text-black">
                      NEEDS REAL IMAGE
                    </span>
                  )}
                </div>

                {/* Quick replace overlay */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <input
                    ref={editing ? fileRef : undefined}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => handleQuickReplace(p, e.target.files)}
                  />
                  {isSaving ? (
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(p.id)
                        requestAnimationFrame(() => fileRef.current?.click())
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-4 h-4" /> Replace Main Image
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col">
                <div>
                  <div className="font-semibold text-white text-xs line-clamp-1">{p.name}</div>
                  <div className="text-[10px] font-mono text-zinc-500">{p.sku}</div>
                </div>

                {/* Gallery thumbnails */}
                <div className="flex-1">
                  <div className="text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-wider">
                    Gallery ({gallery.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {gallery.slice(0, 6).map((g, idx) => (
                      <div key={`${idx}-${g.slice(-20)}`} className="relative group/g">
                        <img
                          src={g}
                          alt={`${p.name} gallery ${idx + 1}`}
                          className="w-11 h-11 rounded-lg object-cover border border-white/10"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 rounded-lg bg-black/70 opacity-0 group-hover/g:opacity-100 transition flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSetGalleryAsMain(p, idx)}
                            title="Set as main"
                            className="p-1 rounded bg-amber-400 text-black"
                          >
                            <ArrowUpCircle className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveGalleryImage(p, idx)}
                            title="Remove"
                            className="p-1 rounded bg-red-500 text-white"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {gallery.length === 0 && (
                      <span className="text-[10px] text-zinc-600 font-mono">No gallery images</span>
                    )}
                    {gallery.length > 6 && (
                      <span className="text-[10px] text-zinc-500 font-mono self-center">
                        +{gallery.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Status footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span
                    className={`flex items-center gap-1 text-[10px] font-mono ${
                      isPlaceholder(p) ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {isPlaceholder(p) ? (
                      <>
                        <AlertTriangle className="w-3 h-3" /> placeholder image
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" /> official image set
                      </>
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {gallery.length} img · {p.digital ? 'digital' : 'physical'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center rounded-2xl bg-[#0F131D] border border-white/5">
          <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-xs text-zinc-400">No products match "{searchQuery}"</p>
        </div>
      )}
    </div>
  )
}
