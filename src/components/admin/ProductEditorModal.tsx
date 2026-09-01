import React, { useEffect, useRef, useState } from 'react'
import {
  X, ImagePlus, Trash2, Star, UploadCloud, Link2, Save, Loader2,
  Package, DollarSign, Layers, Info, ImageIcon, ArrowUpCircle, Plus,
} from 'lucide-react'
import { Product } from '../../types'

interface ProductEditorModalProps {
  product: Product | null // null = create mode
  isOpen: boolean
  onClose: () => void
  onSave: (product: Product, isNew: boolean) => Promise<{ ok: boolean; error?: string }> | void
}

const CATEGORY_OPTIONS = [
  'Streaming',
  'Subscriptions',
  'Gift Cards',
  'Gaming',
  'Software',
  'Smart Projectors',
]

const DELIVERY_OPTIONS = [
  'Instant Auto-Email',
  'Courier Shipping (1-3 Days)',
  'Direct Activation',
]

const REGION_OPTIONS = ['Global', 'USA', 'Europe', 'Asia', 'Pakistan']

const emptyProduct = (): Product => ({
  id: `pb-${Date.now().toString(36)}`,
  sku: `PB-${Date.now().toString().slice(-6)}`,
  name: '',
  slug: '',
  category: 'Streaming',
  productType: 'digital',
  description: '',
  shortDescription: '',
  price: 0,
  originalPrice: undefined,
  image: '',
  galleryImages: [],
  tags: [],
  digital: true,
  stock: 50,
  status: 'in_stock',
  rating: 4.8,
  reviewCount: 10,
  isFeatured: false,
  isHot: false,
  active: true,
  deliveryType: 'Instant Auto-Email',
  deliveryInfo: 'Instant 15-Second Key Delivery',
  region: 'Global',
  features: [],
})

const slugify = (text: string): string =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/&/g, '-and-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave,
}) => {
  const isNew = !product
  const buildForm = (): Product => (product ? { ...product } : emptyProduct())
  const [form, setForm] = useState<Product>(buildForm)
  const [mainImage, setMainImage] = useState<string>(product?.image || '')
  const [gallery, setGallery] = useState<string[]>(
    product?.galleryImages || product?.gallery?.filter((g) => g !== product.image) || []
  )
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [galleryUrlInput, setGalleryUrlInput] = useState('')
  const [tagsInput, setTagsInput] = useState((product?.tags || []).join(', '))
  const [featuresInput, setFeaturesInput] = useState((product?.features || []).join('\n'))
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'advanced'>('details')

  const mainFileRef = useRef<HTMLInputElement>(null)
  const galleryFileRef = useRef<HTMLInputElement>(null)

  // Re-initialize the whole form each time the modal opens (or a different
  // product is targeted) so Edit always shows fresh, correct values.
  useEffect(() => {
    if (!isOpen) return
    setForm(buildForm())
    setMainImage(product?.image || '')
    setGallery(
      product?.galleryImages || product?.gallery?.filter((g) => g !== product?.image) || []
    )
    setTagsInput((product?.tags || []).join(', '))
    setFeaturesInput((product?.features || []).join('\n'))
    setImageUrlInput('')
    setGalleryUrlInput('')
    setErrorMsg(null)
    setActiveTab('details')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id])

  if (!isOpen) return null

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // ---------- IMAGE HELPERS ----------
  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleMainFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).')
      return
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setErrorMsg('Image is too large. Maximum 2.5MB per image.')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setMainImage(dataUrl)
      setErrorMsg(null)
    } catch {
      setErrorMsg('Failed to read the image file.')
    }
    if (mainFileRef.current) mainFileRef.current.value = ''
  }

  const handleGalleryFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const newDataUrls: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 2.5 * 1024 * 1024) continue
      try {
        newDataUrls.push(await readFileAsDataUrl(file))
      } catch {
        /* skip unreadable file */
      }
    }
    setGallery((prev) => [...prev, ...newDataUrls])
    if (galleryFileRef.current) galleryFileRef.current.value = ''
  }

  const addMainImageUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return
    setMainImage(url)
    setImageUrlInput('')
  }

  const addGalleryImageUrl = () => {
    const url = galleryUrlInput.trim()
    if (!url) return
    setGallery((prev) => [...prev, url])
    setGalleryUrlInput('')
  }

  const promoteGalleryImage = (idx: number) => {
    const chosen = gallery[idx]
    const newGallery = gallery.filter((_, i) => i !== idx)
    if (mainImage) newGallery.unshift(mainImage)
    setGallery(newGallery)
    setMainImage(chosen)
  }

  // ---------- SAVE ----------
  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrorMsg('Product name is required.')
      setActiveTab('details')
      return
    }
    if (!form.price || form.price <= 0) {
      setErrorMsg('Price must be greater than 0.')
      setActiveTab('details')
      return
    }
    if (!mainImage.trim()) {
      setErrorMsg('Please add a main product image (upload a file or paste an image URL).')
      setActiveTab('images')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    const finalTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const finalFeatures = featuresInput
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)

    const savedProduct: Product = {
      ...form,
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      sku: form.sku.trim() || `PB-${Date.now().toString().slice(-6)}`,
      image: mainImage.trim(),
      galleryImages: gallery,
      gallery: [mainImage.trim(), ...gallery],
      additionalImages: gallery,
      tags: finalTags,
      features: finalFeatures,
      shortDescription: form.shortDescription || form.description.slice(0, 140),
      productType: form.digital ? 'digital' : 'physical',
      status: form.stock === 0 ? 'out_of_stock' : form.status || 'in_stock',
      updatedAt: new Date(),
    }

    try {
      const result = await onSave(savedProduct, isNew)
      if (result && result.ok === false) {
        setErrorMsg(result.error || 'Failed to save product.')
      }
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-400/60'
  const labelCls = 'block text-zinc-400 mb-1 font-mono text-[10px] uppercase tracking-wider'
  const tabBtnCls = (tab: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
      activeTab === tab ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'
    }`

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0F131D] border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isNew ? 'Add New Product' : 'Edit Product'}
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                {isNew ? 'Create a catalog listing with images' : `SKU: ${form.sku}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
          <button className={tabBtnCls('details')} onClick={() => setActiveTab('details')}>
            <Info className="w-3.5 h-3.5" /> Details
          </button>
          <button className={tabBtnCls('images')} onClick={() => setActiveTab('images')}>
            <ImageIcon className="w-3.5 h-3.5" /> Images
            <span className="text-[10px] opacity-70">
              ({(mainImage ? 1 : 0) + gallery.length})
            </span>
          </button>
          <button className={tabBtnCls('advanced')} onClick={() => setActiveTab('advanced')}>
            <Layers className="w-3.5 h-3.5" /> Advanced
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {errorMsg && (
            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* ============ DETAILS TAB ============ */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Product Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Netflix Premium 1 Month"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value)}
                    placeholder="PB-SUB-NETFLIX"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className={inputCls}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Region</label>
                  <select
                    value={form.region}
                    onChange={(e) => set('region', e.target.value)}
                    className={inputCls}
                  >
                    {REGION_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Price (PKR) *</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price || ''}
                    onChange={(e) => set('price', Number(e.target.value))}
                    placeholder="6800"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Compare-At Price</label>
                  <input
                    type="number"
                    min={0}
                    value={form.originalPrice ?? ''}
                    onChange={(e) =>
                      set('originalPrice', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="8000"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) => set('stock', Number(e.target.value))}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Delivery Type</label>
                  <select
                    value={form.deliveryType}
                    onChange={(e) => set('deliveryType', e.target.value)}
                    className={inputCls}
                  >
                    {DELIVERY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  placeholder="Ultra HD 4K streaming with private profile…"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="TOP RATED, 4K HDR, Instant"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Selling Points (one per line)</label>
                  <textarea
                    value={featuresInput}
                    onChange={(e) => setFeaturesInput(e.target.value)}
                    rows={2}
                    placeholder={'Instant delivery\nOfficial warranty'}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============ IMAGES TAB ============ */}
          {activeTab === 'images' && (
            <div className="space-y-5">
              {/* Main image */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`${labelCls} mb-0`}>Main Product Image *</label>
                  <span className="text-[10px] text-zinc-500 font-mono">PNG / JPG / WebP · max 2.5MB</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Preview */}
                  <div className="aspect-video rounded-xl bg-[#07090E] border border-white/10 overflow-hidden flex items-center justify-center">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt="Main product preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.opacity = '0.2'
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <ImagePlus className="w-8 h-8" />
                        <span className="text-xs">No image yet</span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="space-y-2.5">
                    <input
                      ref={mainFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleMainFileUpload(e.target.files)}
                      className="hidden"
                    />
                    <button
                      onClick={() => mainFileRef.current?.click()}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-amber-400/40 hover:border-amber-400 hover:bg-amber-400/5 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Upload Main Image (File)
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addMainImageUrl()}
                          placeholder="https://…/official-image.jpg"
                          className={`${inputCls} pl-8`}
                        />
                      </div>
                      <button
                        onClick={addMainImageUrl}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold"
                      >
                        Set
                      </button>
                    </div>

                    {mainImage && (
                      <button
                        onClick={() => setMainImage('')}
                        className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Main Image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`${labelCls} mb-0`}>
                    Gallery Images ({gallery.length})
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Click a gallery image to make it the main image
                  </span>
                </div>

                <input
                  ref={galleryFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => handleGalleryFilesUpload(e.target.files)}
                  className="hidden"
                />

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-3">
                  {gallery.map((img, idx) => (
                    <div
                      key={`${img.slice(-24)}-${idx}`}
                      className="relative group aspect-square rounded-xl overflow-hidden bg-[#07090E] border border-white/10"
                    >
                      <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => promoteGalleryImage(idx)}
                          title="Set as main image"
                          className="p-1.5 rounded-lg bg-amber-400 text-black"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setGallery((prev) => prev.filter((_, i) => i !== idx))}
                          title="Remove"
                          className="p-1.5 rounded-lg bg-red-500 text-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {gallery.length === 0 && (
                    <div className="col-span-3 sm:col-span-5 py-6 rounded-xl border border-dashed border-white/10 text-center text-zinc-500 text-xs">
                      No gallery images yet
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => galleryFileRef.current?.click()}
                    className="flex-1 py-2.5 rounded-xl border border-dashed border-white/15 hover:border-amber-400/50 hover:bg-amber-400/5 text-zinc-300 hover:text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <UploadCloud className="w-4 h-4" /> Upload Gallery Images
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={galleryUrlInput}
                      onChange={(e) => setGalleryUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addGalleryImageUrl()}
                      placeholder="…or paste image URL"
                      className={inputCls}
                    />
                    <button
                      onClick={addGalleryImageUrl}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ ADVANCED TAB ============ */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Rating (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={5}
                    value={form.rating}
                    onChange={(e) => set('rating', Number(e.target.value))}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Review Count</label>
                  <input
                    type="number"
                    min={0}
                    value={form.reviewCount}
                    onChange={(e) => set('reviewCount', Number(e.target.value))}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as Product['status'])}
                    className={inputCls}
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="preorder">Preorder</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Slug</label>
                  <input
                    type="text"
                    value={form.slug || ''}
                    onChange={(e) => set('slug', e.target.value)}
                    placeholder="auto-generated"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    { key: 'digital', label: 'Digital Product', desc: 'Instant key vs physical hardware' },
                    { key: 'isFeatured', label: 'Featured', desc: 'Show in featured sections' },
                    { key: 'isHot', label: 'Hot / Popular', desc: 'Boost in popular products row' },
                    { key: 'active', label: 'Active (Visible)', desc: 'Visible on the storefront' },
                  ] as { key: keyof Product; label: string; desc: string }[]
                ).map(({ key, label, desc }) => (
                  <button
                    key={String(key)}
                    onClick={() => set(key, !form[key] as never)}
                    className={`p-3 rounded-xl border text-left transition ${
                      form[key]
                        ? 'bg-amber-400/10 border-amber-400/50'
                        : 'bg-[#07090E] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${form[key] ? 'text-amber-300' : 'text-zinc-300'}`}>
                        {label}
                      </span>
                      <div
                        className={`w-8 h-4.5 rounded-full p-0.5 transition ${
                          form[key] ? 'bg-amber-400' : 'bg-zinc-700'
                        }`}
                        style={{ height: 18, width: 32 }}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            form[key] ? 'translate-x-3.5' : ''
                          }`}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">{desc}</p>
                  </button>
                ))}
              </div>

              {/* ============ VARIANTS EDITOR ============ */}
              <div className="rounded-xl bg-[#07090E] border border-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white font-mono uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Variants (choose-and-select options)
                  </div>
                  <button
                    onClick={() =>
                      set('variants', [
                        ...(form.variants || []),
                        {
                          id: `var-${Date.now().toString(36)}-${Math.floor(Math.random() * 900 + 100)}`,
                          name: '',
                          price: form.price,
                        },
                      ])
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold hover:bg-cyan-400/20 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Variant
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Variants let one product offer multiple purchasable options (e.g. regions, durations,
                  storage sizes). Customers pick a variant from the dropdown on the product card — each
                  variant can have its own price. Imports that match an existing product are attached here
                  automatically instead of creating duplicates.
                </p>
                {(form.variants || []).length === 0 ? (
                  <div className="text-[11px] text-zinc-500 text-center py-3 border border-dashed border-white/10 rounded-lg">
                    No variants yet — this product sells as a single option.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(form.variants || []).map((v, idx) => (
                      <div key={v.id || idx} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-[#0B0F19] border border-white/5">
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => {
                            const next = [...(form.variants || [])]
                            next[idx] = { ...v, name: e.target.value }
                            set('variants', next)
                          }}
                          placeholder="Variant name (e.g. 1 Month / USA)"
                          className="flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg bg-[#07090E] border border-white/10 text-white text-[11px] placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50"
                        />
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => {
                            const next = [...(form.variants || [])]
                            next[idx] = { ...v, price: Number(e.target.value) }
                            set('variants', next)
                          }}
                          placeholder="Price"
                          className="w-24 px-2.5 py-1.5 rounded-lg bg-[#07090E] border border-white/10 text-white text-[11px] font-mono focus:outline-none focus:border-cyan-400/50"
                        />
                        <input
                          type="text"
                          value={v.badge || ''}
                          onChange={(e) => {
                            const next = [...(form.variants || [])]
                            next[idx] = { ...v, badge: e.target.value }
                            set('variants', next)
                          }}
                          placeholder="Badge (opt.)"
                          className="w-28 px-2.5 py-1.5 rounded-lg bg-[#07090E] border border-white/10 text-white text-[11px] placeholder-zinc-500 focus:outline-none focus:border-cyan-400/50"
                        />
                        <button
                          onClick={() => set('variants', (form.variants || []).filter((_, i) => i !== idx))}
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition"
                          title="Remove variant"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#07090E] border border-white/5 flex items-start gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Changes are saved to the live catalog and synced to MongoDB when the backend is
                  reachable. If the database is offline, changes stay active in the storefront cache
                  and can be re-synced later via CSV / DB Importer.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
            <Star className="w-3 h-3 text-amber-400" />
            {isNew ? 'New product will appear instantly on the storefront' : 'Edits go live immediately'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 text-zinc-300 text-xs hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
