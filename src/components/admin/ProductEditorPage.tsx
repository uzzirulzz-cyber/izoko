// ProductEditorPage — WooCommerce/Shopify-style FULL-PAGE product editor.
//
// Real URLs: /admin/products/new and /admin/products/:id/edit
// (served by the existing /admin/:path* SPA rewrite in vercel.json — no new
// serverless functions, no storefront changes).
//
// Save contract (identical to the site-wide admin product pipeline):
//   1. every picked image is compressed client-side and uploaded through
//      POST /api/admin/media — the product payload carries media URLS ONLY
//      (base64 in product JSON caused the HTTP 413 outage)
//   2. save → POST/PUT /api/admin/products → the UI adopts ONLY the returned
//      MongoDB document
//   3. failure → the real error stays on screen, the form keeps its state,
//      nothing is faked and nothing is queued locally
//
// All React hooks live ABOVE the early returns (loading / not-found) — a hook
// below a conditional return changes hook order between renders and crashes
// React with error #310.

import React from 'react'
import {
  ArrowLeft, Package, DollarSign, Layers, ImageIcon, Truck, Search,
  Settings2, Save, Loader2, UploadCloud, Link2, Trash2, Star, ArrowUp,
  ArrowDown, Plus, X, ExternalLink, Copy, AlertTriangle, CheckCircle2,
  Info, Eye, EyeOff, FileText, Globe, ArrowRight,
} from 'lucide-react'
import { Product, ProductSeo, ProductVariant } from '../../types'
import {
  compressImageFile,
  uploadProductImage,
  ensureImageUrl,
  isDataImageUrl,
} from '../../lib/uploadImage'
import { HtmlEditor } from './HtmlEditor'

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const getAdminToken = () => localStorage.getItem('playbeat_admin_token')
const SITE = 'https://playbeat.digital'

const CATEGORY_OPTIONS = [
  'Streaming',
  'Subscriptions',
  'Gift Cards',
  'Gaming',
  'Software',
  'Smart Projectors',
  'Digital Products',
  'IPTV & Services',
  'AI & Productivity',
  'Bundles',
]

const PRODUCT_KINDS = [
  'Digital Product',
  'Subscription',
  'Gift Card',
  'Streaming Account',
  'Software Key',
  'IPTV',
  'Smart Projector',
  'Physical Product',
]

const DELIVERY_OPTIONS = [
  'Instant Auto-Email',
  'Courier Shipping (1-3 Days)',
  'Direct Activation',
]

const REGION_OPTIONS = ['Global', 'USA', 'Europe', 'Asia', 'Pakistan']
const CURRENCY_OPTIONS = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'CAD']

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

export interface ProductEditorPageProps {
  mode: 'new' | 'edit'
  /** edit mode: MongoDB _id, id, sku or slug — resolved against props then API */
  refId: string
  products: Product[]
  selectedCurrency: string
  onSaveProduct: (
    product: Product,
    isNew: boolean
  ) => Promise<{ ok: boolean; error?: string; saved?: Product }> | void
  onDeleteProduct: (productId: string) => Promise<{ ok: boolean; error?: string }> | Promise<void> | void
  onToast: (msg: string, ms?: number) => void
  onDone: () => void
  /** navigate to another admin URL (used after Duplicate) */
  onAdminNavigate: (path: string) => void
}

type ImageItem = { url: string; alt?: string; title?: string }

type SeoCheck = { level: 'error' | 'warning' | 'info' | 'ok'; message: string }

/**
 * Canonical JSON snapshot of every editable field — the baseline for the
 * unsaved-changes detection (dirty flag).
 */
function snapshot(
  p: Product,
  mainUrl: string,
  gallery: ImageItem[],
  tags: string,
  features: string
): string {
  return JSON.stringify({
    n: p.name, s: p.slug, sku: p.sku, cat: p.category, kind: (p as any).productKind ?? '',
    pt: p.productType ?? '', d: p.description, sd: p.shortDescription ?? '', dd: p.detailedDescription ?? '',
    price: p.price, op: p.originalPrice ?? null, cap: p.compareAtPrice ?? null, cost: (p as any).costPrice ?? null,
    cur: p.currency ?? '', ss: (p as any).saleStartsAt ?? null, se: (p as any).saleEndsAt ?? null,
    img: mainUrl,
    g: gallery.map((x) => [x.url, x.alt || '', x.title || '']),
    tags, features,
    region: p.region ?? '', brand: (p as any).brand ?? '', subcat: (p as any).subcategory ?? '',
    stock: p.stock, sm: p.stockMode ?? null, lst: p.lowStockThreshold ?? null, st: p.status ?? null,
    bo: (p as any).backorder ?? null, cms: (p as any).cmsStatus ?? null, active: p.active !== false,
    dt: p.deliveryType ?? '', di: p.deliveryInfo ?? '', de: (p as any).deliveryEstimate ?? '',
    dn: p.downloadUrl ?? '', an: p.activationNotes ?? '',
    hot: !!p.isHot, feat: !!p.isFeatured, rating: p.rating ?? 0, rc: p.reviewCount ?? 0,
    vLabel: p.variantLabel ?? '',
    variants: (p.variants || []).map((v) => [v.id, v.name, v.price, v.originalPrice ?? null, v.sku ?? '', v.badge ?? '']),
    seo: p.seo ?? null,
  })
}

const blankProduct = (): Product => ({
  id: `pb-${Date.now().toString(36)}`,
  sku: `PB-${Date.now().toString().slice(-6)}`,
  name: '',
  slug: '',
  category: 'Digital Products',
  productKind: 'Digital Product',
  productType: 'digital',
  description: '',
  shortDescription: '',
  price: 0,
  currency: 'PKR',
  image: '',
  galleryImages: [],
  tags: [],
  digital: true,
  stock: 50,
  stockMode: 'unlimited',
  lowStockThreshold: 5,
  status: 'in_stock',
  // Ratings stay 0 until the owner curates real ones — never fabricated.
  rating: 0,
  reviewCount: 0,
  isFeatured: false,
  isHot: false,
  active: true,
  cmsStatus: 'published',
  deliveryType: 'Instant Auto-Email',
  deliveryInfo: 'Instant 15-Second Key Delivery',
  deliveryEstimate: '',
  region: 'Global',
  features: [],
  variants: [],
  backorder: 'deny',
})

export const ProductEditorPage: React.FC<ProductEditorPageProps> = ({
  mode,
  refId,
  products,
  selectedCurrency,
  onSaveProduct,
  onDeleteProduct,
  onToast,
  onDone,
  onAdminNavigate,
}) => {
  const isNew = mode === 'new'

  // ---------------- state (ALL hooks above early returns) ----------------
  const [loading, setLoading] = React.useState<boolean>(!isNew)
  const [notFound, setNotFound] = React.useState<boolean>(false)
  const [form, setForm] = React.useState<Product>(() => blankProduct())
  const [slugTouched, setSlugTouched] = React.useState<boolean>(false)
  const [tagsInput, setTagsInput] = React.useState('')
  const [featuresInput, setFeaturesInput] = React.useState('')
  const [mainImage, setMainImage] = React.useState<ImageItem>({ url: '' })
  const [gallery, setGallery] = React.useState<ImageItem[]>([])
  const [imageUrlInput, setImageUrlInput] = React.useState('')
  const [galleryUrlInput, setGalleryUrlInput] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const [uploadNote, setUploadNote] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [publishWarnings, setPublishWarnings] = React.useState<SeoCheck[] | null>(null)
  const [activeTab, setActiveTab] = React.useState<
    'general' | 'pricing' | 'inventory' | 'images' | 'variants' | 'delivery' | 'seo' | 'advanced'
  >('general')
  const [baseline, setBaseline] = React.useState<string>('')
  const dragIdxRef = React.useRef<number | null>(null)

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))
  const setSeo = <K extends keyof ProductSeo>(key: K, value: ProductSeo[K]) =>
    setForm((prev) => ({ ...prev, seo: { ...(prev.seo || {}), [key]: value } }))

  // Initialize from a product document (adopt DB values verbatim)
  const adopt = React.useCallback((p: Product) => {
    const meta: ImageItem[] = Array.isArray(p.galleryMeta) ? p.galleryMeta.filter((m) => m && m.url) : []
    const urls: string[] = p.galleryImages || p.gallery || []
    const mainUrl = p.image || ''
    const items: ImageItem[] = urls.filter((u) => u && u !== mainUrl).map((u) => {
      const found = meta.find((m) => m.url === u)
      return { url: u, alt: found?.alt || '', title: found?.title || '' }
    })
    const mainMeta = meta.find((m) => m.url === mainUrl)
    setForm({ ...blankProduct(), ...p })
    setMainImage({ url: mainUrl, alt: mainMeta?.alt || '', title: mainMeta?.title || '' })
    setGallery(items)
    setTagsInput((p.tags || []).join(', '))
    setFeaturesInput((p.features || []).join('\n'))
    setSlugTouched(Boolean(p.slug))
    setBaseline(snapshot(p, mainUrl, items, (p.tags || []).join(', '), (p.features || []).join('\n')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load product for edit mode — from the catalog prop first, then the API
  React.useEffect(() => {
    let alive = true
    if (isNew) {
      adopt(blankProduct())
      setLoading(false)
      setNotFound(false)
      return
    }
    const wanted = String(refId || '').toLowerCase()
    const local = products.find(
      (p) =>
        (p._id || '').toLowerCase() === wanted ||
        (p.id || '').toLowerCase() === wanted ||
        (p.sku || '').toLowerCase() === wanted ||
        (p.slug || '').toLowerCase() === wanted
    )
    if (local) {
      adopt(local)
      setLoading(false)
      return
    }
    setLoading(true)
    setNotFound(false)
    fetch(`${API_BASE}/api/products/${encodeURIComponent(refId)}`, { credentials: 'include' })
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (!alive) return
        if (d?.success?.product) {
          adopt(d.success.product)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => alive && setNotFound(true))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, refId])

  const dirty = React.useMemo(() => {
    const snap = snapshot(form, mainImage.url, gallery, tagsInput, featuresInput)
    return baseline !== '' && snap !== baseline
  }, [form, mainImage, gallery, tagsInput, featuresInput, baseline])

  // Warn before leaving with unsaved changes
  React.useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  // Auto-slug from the name until the slug is edited manually
  React.useEffect(() => {
    if (!slugTouched && !isNew) return
    if (!slugTouched) set('slug', slugify(form.name || ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, slugTouched])

  // ---------------- image handling ----------------
  const uploadOne = async (file: File, hint: string): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg(`"${file.name}" is not an image file (PNG, JPG or WebP).`)
      return null
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg(`"${file.name}" is too large (max 15MB before compression).`)
      return null
    }
    const compressed = await compressImageFile(file)
    const uploaded = await uploadProductImage(compressed, file.name || hint)
    if (!uploaded.ok || !uploaded.url) {
      setErrorMsg(uploaded.error || 'Image upload failed — please try again.')
      return null
    }
    return uploaded.url
  }

  const handleMainFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setErrorMsg(null)
    try {
      const url = await uploadOne(files[0], 'product-main-image')
      if (url) setMainImage((m) => ({ ...m, url }))
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to process the image file.')
    } finally {
      setUploading(false)
    }
  }

  const handleGalleryFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setErrorMsg(null)
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'))
    let done = 0
    for (const file of picked) {
      try {
        const url = await uploadOne(file, 'product-gallery-image')
        if (url) setGallery((prev) => [...prev, { url, alt: '', title: '' }])
      } catch (e: any) {
        setErrorMsg(`${file.name}: ${e?.message || 'upload failed'}`)
      }
      done += 1
      setUploadNote(picked.length > 1 ? `Uploaded ${done} of ${picked.length} images…` : null)
    }
    setUploadNote(null)
    setUploading(false)
  }

  const promoteToMain = (idx: number) => {
    const chosen = gallery[idx]
    const rest = gallery.filter((_, i) => i !== idx)
    const oldMain = { ...mainImage }
    setGallery(oldMain.url ? [oldMain, ...rest] : rest)
    setMainImage(chosen)
  }

  const moveGallery = (idx: number, dir: -1 | 1) => {
    setGallery((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const onGalleryDrop = (targetIdx: number) => {
    const from = dragIdxRef.current
    dragIdxRef.current = null
    if (from === null || from === targetIdx) return
    setGallery((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(targetIdx, 0, moved)
      return next
    })
  }

  // ---------------- SEO validation (real checks, no fake score) ----------------
  const seoChecks: SeoCheck[] = React.useMemo(() => {
    const seo = form.seo || {}
    const effectiveTitle = seo.title || form.name || ''
    const effectiveDesc = (
      seo.description ||
      form.shortDescription ||
      form.description ||
      ''
    ).slice(0, 155)
    const checks: SeoCheck[] = []
    const add = (level: SeoCheck['level'], message: string) => checks.push({ level, message })

    // Title
    if (!form.name.trim()) add('error', 'Product name is missing — the page cannot be titled.')
    else if (!seo.title) add('info', `No custom SEO title — auto-generating "${form.name} | PlayBeat Digital".`)
    else if (seo.title.length > 60) add('warning', `SEO title is ${seo.title.length} characters — Google truncates around 60.`)
    else add('ok', `SEO title length is good (${seo.title.length} characters).`)

    // Description
    if (!effectiveDesc.trim()) add('error', 'Meta description is missing — Google will invent one from page text.')
    else if (effectiveDesc.length < 70) add('warning', `Meta description is short (${effectiveDesc.length}/155 characters) — aim for 70-155.`)
    else if (effectiveDesc.length > 160) add('warning', `Meta description is long (${effectiveDesc.length} characters) — it will be truncated.`)
    else add('ok', `Meta description length is good (${effectiveDesc.length} characters).`)

    // Slug
    const slug = form.slug || slugify(form.name || '')
    if (!slug) add('error', 'URL slug is missing.')
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) add('warning', `Slug "${slug}" contains unusual characters — keep it lowercase words separated by hyphens.`)
    else add('ok', `Clean product URL: /product/${slug}`)

    const slugLower = slug.toLowerCase()
    const slugClash = products.some(
      (p) =>
        p !== (form as Product) &&
        (p._id || p.id) !== (form._id || form.id) &&
        (p.slug || '').toLowerCase() === slugLower &&
        slugLower !== ''
    )
    if (slugClash) add('error', `Duplicate slug — another product already uses /product/${slug}. Saving will redirect-diffuse the URL.`)

    // Duplicates across the catalog (client-side, real catalog data)
    const others = products.filter((p) => (p._id || p.id) !== (form._id || form.id))
    const tNorm = (v: string) => v.trim().toLowerCase()
    if (seo.title && others.some((p) => tNorm(p.seo?.title || '') === tNorm(seo.title!)))
      add('warning', `Duplicate SEO title — another product uses "${seo.title}". Every page needs a unique title.`)
    if (effectiveDesc && others.some((p) => tNorm(p.seo?.description || p.shortDescription || p.description || '').slice(0, 155) === tNorm(effectiveDesc)))
      add('warning', 'Duplicate meta description — another page uses the same opening description.')

    // Canonical
    if (seo.canonicalUrl && !/^https:\/\/playbeat\.digital/.test(seo.canonicalUrl.trim()))
      add('error', 'Canonical override must point at https://playbeat.digital… — cross-domain canonicals deindex the page.')
    else if (seo.canonicalUrl) add('info', 'Canonical override set — make sure it matches this product URL.')

    // Indexing
    if (seo.index === false) add('info', 'Set to noindex — the product stays off Google and out of the sitemap.')
    if (seo.follow === false) add('info', 'Links on this page are nofollow.')

    // Focus keyword
    const kw = (seo.focusKeyword || '').trim().toLowerCase()
    if (kw) {
      const inTitle = effectiveTitle.toLowerCase().includes(kw)
      const inDesc = effectiveDesc.toLowerCase().includes(kw)
      const inSlug = slugLower.includes(kw.replace(/\s+/g, '-'))
      if (!inTitle) add('warning', `Focus keyword "${seo.focusKeyword}" is not in the title.`)
      if (!inDesc) add('info', `Focus keyword "${seo.focusKeyword}" is not in the meta description.`)
      if (!inSlug && !inTitle && !inDesc) add('warning', 'Focus keyword appears nowhere in title, description or slug.')
      if (inTitle && inDesc) add('ok', `Focus keyword present in title and description.`)
    }

    // Images / alt text
    const allImages = [mainImage, ...gallery].filter((g) => g.url)
    const missingAlt = allImages.filter((g) => !(g.alt || '').trim()).length
    if (missingAlt > 0) add('warning', `${missingAlt} image${missingAlt === 1 ? '' : 's'} without alt text — screen readers and Google Images need it.`)
    else if (allImages.length > 0) add('ok', 'Every image has descriptive alt text.')
    if (!mainImage.url) add('warning', 'No main product image — the placeholder logo will be used on the storefront and as OG image.')

    // Open Graph
    if (!seo.ogImage && !mainImage.url) add('warning', 'No OG image — social shares fall back to the marketplace banner.')

    // Merchant readiness (informational)
    if (!form.brand) add('info', 'Brand is empty — the merchant feed will use "PlayBeat Digital".')
    if (!form.sku) add('error', 'SKU is empty — required for product identity and the merchant feed.')

    return checks
  }, [form, mainImage, gallery, products])

  const publishBlockers = seoChecks.filter((c) => c.level === 'error')
  const publishSoftWarnings = seoChecks.filter((c) => c.level === 'warning' || c.level === 'info')

  // ---------------- save ----------------
  const buildPayload = (cmsStatus: 'draft' | 'published' | 'archived'): Product => {
    const finalTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    const finalFeatures = featuresInput.split('\n').map((f) => f.trim()).filter(Boolean)
    const galleryUrls = gallery.map((g) => g.url.trim()).filter(Boolean)
    const mainUrl = mainImage.url.trim()
    const seoIn = form.seo || {}
    const seoOut: ProductSeo = {
      title: seoIn.title?.trim() || undefined,
      description: seoIn.description?.trim() || undefined,
      canonicalUrl: seoIn.canonicalUrl?.trim() || undefined,
      index: seoIn.index === false ? false : true,
      follow: seoIn.follow === false ? false : true,
      ogTitle: seoIn.ogTitle?.trim() || undefined,
      ogDescription: seoIn.ogDescription?.trim() || undefined,
      ogImage: seoIn.ogImage?.trim() || undefined,
      twitterTitle: seoIn.twitterTitle?.trim() || undefined,
      twitterDescription: seoIn.twitterDescription?.trim() || undefined,
      twitterImage: seoIn.twitterImage?.trim() || undefined,
      focusKeyword: seoIn.focusKeyword?.trim() || undefined,
      secondaryKeywords: (seoIn.secondaryKeywords || []).map((k) => k.trim()).filter(Boolean),
    }
    const hasSeo = Object.entries(seoOut).some(
      ([k, v]) => v !== undefined && !(k === 'index' && v === true) && !(k === 'follow' && v === true)
    )
    const galleryMeta: { url: string; alt?: string; title?: string }[] = []
    if (mainUrl) {
      galleryMeta.push({
        url: mainUrl,
        ...(mainImage.alt?.trim() ? { alt: mainImage.alt.trim() } : {}),
        ...(mainImage.title?.trim() ? { title: mainImage.title.trim() } : {}),
      })
    }
    gallery.forEach((g) => {
      if (!g.url.trim()) return
      galleryMeta.push({
        url: g.url.trim(),
        ...(g.alt?.trim() ? { alt: g.alt.trim() } : {}),
        ...(g.title?.trim() ? { title: g.title.trim() } : {}),
      })
    })
    return {
      ...form,
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      sku: (form.sku || `PB-${Date.now().toString().slice(-6)}`).trim(),
      price: Number(form.price) || 0,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      currency: form.currency || 'PKR',
      image: mainUrl || '/playbeat-logo.png',
      galleryImages: galleryUrls,
      gallery: [mainUrl || '/playbeat-logo.png', ...galleryUrls],
      additionalImages: galleryUrls,
      galleryMeta: galleryMeta.length ? galleryMeta : undefined,
      tags: finalTags,
      features: finalFeatures,
      shortDescription: form.shortDescription || form.description.slice(0, 140),
      productType: form.digital ? 'digital' : 'physical',
      stock: Number(form.stock) || 0,
      status: form.stock === 0 ? 'out_of_stock' : form.status || 'in_stock',
      cmsStatus,
      active: cmsStatus === 'published',
      seo: hasSeo ? seoOut : undefined,
      variants: (form.variants || []).filter((v) => v && v.name && String(v.name).trim()),
      updatedAt: new Date(),
    }
  }

  const doSave = async (cmsStatus: 'draft' | 'published' | 'archived', force = false) => {
    if (saving || uploading) return
    if (publishWarnings && !force) return // must click "Publish anyway" (or fix)
    if (cmsStatus === 'published') {
      if (!form.name.trim()) {
        setErrorMsg('Product name is required.')
        setActiveTab('general')
        return
      }
      if (!form.price || form.price <= 0) {
        setErrorMsg('Price must be greater than 0 to publish. Use Save Draft if the pricing is not final.')
        setActiveTab('pricing')
        return
      }
      const blocking = publishBlockers
      if (blocking.length > 0 && !force) {
        setErrorMsg(`Fix ${blocking.length} SEO issue${blocking.length === 1 ? '' : 's'} before publishing (see the SEO tab): ${blocking[0].message}`)
        return
      }
      const soft = [...publishBlockers, ...publishSoftWarnings]
      if (soft.length > 0 && !force) {
        setPublishWarnings(soft)
        return
      }
    }
    if (cmsStatus !== 'published' && !form.name.trim()) {
      setErrorMsg('Product name is required even for drafts.')
      setActiveTab('general')
      return
    }

    setErrorMsg(null)
    setSaving(true)
    setPublishWarnings(null)

    try {
      // Every image value must be a URL before the payload is built — legacy
      // base64 data URLs (old DB rows) are uploaded to the media library here.
      let mainUrl = mainImage.url
      if (isDataImageUrl(mainUrl)) {
        setUploadNote('Uploading 1 legacy image to the media library…')
        const r = await ensureImageUrl(mainUrl, `${form.sku || form.name || 'product'}-main`)
        if (!r.ok) throw new Error(r.error || 'Image upload failed.')
        mainUrl = r.url
        setMainImage((m) => ({ ...m, url: r.url }))
      }
      const newGallery: ImageItem[] = []
      let legacyCount = 0
      for (const g of gallery) {
        if (isDataImageUrl(g.url)) {
          legacyCount += 1
          setUploadNote(`Uploading ${legacyCount} legacy image${legacyCount === 1 ? '' : 's'} to the media library…`)
          const r = await ensureImageUrl(g.url, `${form.sku || form.name || 'product'}-gallery`)
          if (!r.ok) throw new Error(r.error || 'Image upload failed.')
          newGallery.push({ ...g, url: r.url })
        } else {
          newGallery.push(g)
        }
      }
      if (legacyCount > 0) setGallery(newGallery)
      setUploadNote(null)

      const payload = buildPayload(cmsStatus)
      const result = await onSaveProduct(payload, isNew)
      if (result && result.ok === false) {
        setErrorMsg(result.error || 'The product could not be saved. Please retry.')
        setSaving(false)
        return
      }
      // Success — the DB document came back; refresh the baseline so the
      // editor is clean, then return to the products list.
      const saved = (result as any)?.saved as Product | undefined
      setBaseline(snapshot(saved || payload, mainUrl || payload.image, gallery, tagsInput, featuresInput))
      onToast(cmsStatus === 'draft' ? 'Draft saved to database' : isNew ? 'Product saved successfully.' : 'Product updated successfully.')
      setSaving(false)
      onDone()
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to save the product.')
      setSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (saving || isNew) return
    const payload = buildPayload((form.cmsStatus as any) || 'published')
    payload.name = `${form.name} (Copy)`
    payload.slug = slugify(payload.name)
    payload.sku = `${(form.sku || 'PB').slice(0, 20)}-C${Math.floor(Math.random() * 90 + 10)}`
    payload.slugHistory = []
    delete (payload as any)._id
    payload.id = `pb-${Date.now().toString(36)}`
    setSaving(true)
    setErrorMsg(null)
    try {
      const result = await onSaveProduct(payload, true)
      if (result && result.ok === false) {
        setErrorMsg(result.error || 'Could not duplicate the product.')
        setSaving(false)
        return
      }
      const saved = (result as any)?.saved as Product | undefined
      onToast('Product duplicated — now editing the copy.')
      setSaving(false)
      if (saved?._id) onAdminNavigate(`/admin/products/${encodeURIComponent(saved._id)}/edit`)
      else onDone()
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not duplicate the product.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isNew || saving) return
    if (!window.confirm(`Delete "${form.name}" permanently from MongoDB? The storefront URL will 404. This cannot be undone.`)) return
    const result = await onDeleteProduct((form._id || form.id) as string)
    if (result && result.ok === false) {
      setErrorMsg(result.error || 'The product could not be deleted. Please retry.')
      return
    }
    onToast('Product permanently deleted')
    onDone()
  }

  const handleCancel = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    onDone()
  }

  // ---------------- render helpers ----------------
  const inputCls =
    'w-full px-3 py-2 rounded-xl bg-[#07090E] border border-white/10 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-400/60'
  const labelCls = 'block text-zinc-400 mb-1 font-mono text-[10px] uppercase tracking-wider'
  const cardCls = 'rounded-2xl bg-[#0B0F19] border border-white/5 p-4 space-y-3'
  const tabBtn = (tab: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
      activeTab === tab ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'
    }`

  const statusChip = (() => {
    const s = (form.cmsStatus as string) || (form.active !== false ? 'published' : 'draft')
    if (s === 'published') return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
    if (s === 'draft') return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30'
    return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/15 text-zinc-300 border border-zinc-500/30'
  })()

  // ---------------- early returns (after ALL hooks) ----------------
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Loading product from MongoDB…</span>
      </div>
    )
  }
  if (notFound) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <Package className="w-10 h-10 text-zinc-600" />
        <div>
          <h2 className="text-base font-bold text-white">Product not found</h2>
          <p className="text-xs text-zinc-500 mt-1">
            No catalog record matches <span className="font-mono text-zinc-400">{refId}</span>. It may have been deleted.
          </p>
        </div>
        <button onClick={onDone} className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold">
          Back to Catalog Products
        </button>
      </div>
    )
  }

  const effectiveSeoTitle = (form.seo?.title || form.name || '').trim()
  const effectiveSeoDesc = (
    form.seo?.description ||
    form.shortDescription ||
    form.description ||
    ''
  ).slice(0, 165)
  const effectiveSlug = form.slug || slugify(form.name || '')
  const margin = form.costPrice ? Math.round(form.price - form.costPrice) : null

  return (
    <div className="space-y-4">
      {/* ============ STICKY HEADER ============ */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-[#0B0F19]/95 backdrop-blur border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleCancel}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
            title="Back to products"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-2 rounded-xl bg-amber-400/10 shrink-0">
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white truncate">
                {isNew ? 'Add New Product' : 'Edit Product'}
              </h1>
              <span className={statusChip}>
                {((form.cmsStatus as string) || (form.active !== false ? 'published' : 'draft')).toUpperCase()}
              </span>
              {dirty && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  UNSAVED
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 font-mono truncate">
              {form.sku} · MongoDB is the only source of truth — no local fallback
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {effectiveSlug && (
            <button
              onClick={() => window.open(`/product/${effectiveSlug}`, '_blank')}
              className="px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
              title={form.active === false ? 'Preview opens the URL — drafts are not visible on the storefront' : 'Preview on the storefront'}
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" /> Preview <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
          )}
          {!isNew && (
            <button
              onClick={handleDuplicate}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 disabled:opacity-60"
            >
              <Copy className="w-3.5 h-3.5 text-purple-400" /> Duplicate
            </button>
          )}
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-semibold text-rose-300 flex items-center gap-1.5 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
          <button
            onClick={handleCancel}
            className="px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-white/10 text-xs font-semibold text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={() => doSave('draft')}
            disabled={saving || uploading}
            className="px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2d] border border-amber-400/30 text-xs font-semibold text-amber-300 flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Save Draft
          </button>
          <button
            onClick={() => doSave(isNew || form.cmsStatus === 'draft' ? 'published' : (((form.cmsStatus as string) || 'published') as any))}
            disabled={saving || uploading}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isNew || form.cmsStatus === 'draft' ? 'Publish' : 'Update'}
          </button>
        </div>
      </div>

      {/* ============ ERRORS / UPLOAD NOTE ============ */}
      {(errorMsg || uploadNote) && (
        <div className="space-y-2">
          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Product could not be saved. </span>
                {errorMsg}
              </div>
              <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-300/70 hover:text-rose-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {uploadNote && (
            <div className="px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadNote}
            </div>
          )}
        </div>
      )}

      {/* ============ PRE-PUBLISH REVIEW (real validation findings) ============ */}
      {publishWarnings && (
        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Review before publishing — {publishWarnings.length} finding{publishWarnings.length === 1 ? '' : 's'}</h3>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-white/5 rounded-xl bg-[#07090E] border border-white/5">
            {publishWarnings.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2">
                {c.level === 'error' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                ) : c.level === 'warning' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                )}
                <span className="text-[11px] text-zinc-300">{c.message}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => doSave('published', true)}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-bold disabled:opacity-60"
            >
              Publish anyway
            </button>
            <button
              onClick={() => setPublishWarnings(null)}
              className="px-4 py-2 rounded-xl bg-[#121622] border border-white/10 text-xs font-semibold text-zinc-200"
            >
              Go back &amp; fix
            </button>
          </div>
        </div>
      )}

      {/* ============ TABS ============ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button className={tabBtn('general')} onClick={() => setActiveTab('general')}>
          <Package className="w-3.5 h-3.5" /> General
        </button>
        <button className={tabBtn('pricing')} onClick={() => setActiveTab('pricing')}>
          <DollarSign className="w-3.5 h-3.5" /> Pricing
        </button>
        <button className={tabBtn('inventory')} onClick={() => setActiveTab('inventory')}>
          <Layers className="w-3.5 h-3.5" /> Inventory
        </button>
        <button className={tabBtn('images')} onClick={() => setActiveTab('images')}>
          <ImageIcon className="w-3.5 h-3.5" /> Images
          <span className="text-[10px] opacity-70">({(mainImage.url ? 1 : 0) + gallery.length})</span>
        </button>
        <button className={tabBtn('variants')} onClick={() => setActiveTab('variants')}>
          <Layers className="w-3.5 h-3.5" /> Variants
          <span className="text-[10px] opacity-70">({(form.variants || []).length})</span>
        </button>
        <button className={tabBtn('delivery')} onClick={() => setActiveTab('delivery')}>
          <Truck className="w-3.5 h-3.5" /> Delivery
        </button>
        <button className={tabBtn('seo')} onClick={() => setActiveTab('seo')}>
          <Search className="w-3.5 h-3.5" /> SEO
        </button>
        <button className={tabBtn('advanced')} onClick={() => setActiveTab('advanced')}>
          <Settings2 className="w-3.5 h-3.5" /> Advanced
        </button>
      </div>

      {/* ============ GENERAL ============ */}
      {activeTab === 'general' && (
        <div className={cardCls}>
          <div>
            <label className={labelCls}>Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Netflix Premium 1 Month — Global"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>URL Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  set('slug', slugify(e.target.value))
                }}
                placeholder="netflix-premium-1-month-global"
                className={`${inputCls} font-mono`}
              />
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">/product/{effectiveSlug || '…'}</p>
            </div>
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
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Subcategory</label>
              <input
                type="text"
                value={(form as any).subcategory || ''}
                onChange={(e) => set('subcategory' as any, e.target.value)}
                placeholder="e.g. Entertainment"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <input
                type="text"
                value={(form as any).brand || ''}
                onChange={(e) => set('brand' as any, e.target.value)}
                placeholder="e.g. Netflix"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Product Type</label>
              <select
                value={(form as any).productKind || 'Digital Product'}
                onChange={(e) => set('productKind' as any, e.target.value)}
                className={inputCls}
              >
                {PRODUCT_KINDS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Region</label>
              <select value={form.region || 'Global'} onChange={(e) => set('region', e.target.value)} className={inputCls}>
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Short Description (storefront card + meta description fallback)</label>
            <textarea
              value={form.shortDescription || ''}
              onChange={(e) => set('shortDescription', e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="One or two sentences shown on product cards and in search results."
              className={inputCls}
            />
            <p className="text-[10px] text-zinc-500 mt-1">{(form.shortDescription || '').length}/300</p>
          </div>
          <div>
            <label className={labelCls}>Full Description</label>
            <HtmlEditor
              value={form.description}
              onChange={(html) => set('description', html)}
              placeholder="Write product description… Use H2 for sections, H3 for FAQs. Supports bold, italic, lists, links, tables & blockquotes."
              minHeight={280}
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Supports H1–H4, paragraphs, <strong>bold</strong>, <em>italic</em>, lists, links, tables &amp; blockquotes.
              Switch to <strong>HTML</strong> mode to paste raw HTML. Saved as-is to MongoDB.
            </p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Publication Status</label>
              <select
                value={(form.cmsStatus as string) || (form.active !== false ? 'published' : 'draft')}
                onChange={(e) => set('cmsStatus' as any, e.target.value)}
                className={inputCls}
              >
                <option value="published">Published — visible on the storefront</option>
                <option value="draft">Draft — admin only, hidden from customers</option>
                <option value="archived">Archived — hidden from the storefront</option>
              </select>
              <p className="text-[10px] text-zinc-500 mt-1">
                Draft and archived products are excluded from the sitemap and can never be seen by customers.
              </p>
            </div>
            <div>
              <label className={labelCls}>Homepage Placement</label>
              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.isHot}
                    onChange={(e) => set('isHot', e.target.checked)}
                    className="accent-amber-400"
                  />
                  Trending (Hot)
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.isFeatured}
                    onChange={(e) => set('isFeatured', e.target.checked)}
                    className="accent-amber-400"
                  />
                  Featured
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ PRICING ============ */}
      {activeTab === 'pricing' && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Selling Price (PKR) * — what the customer pays</label>
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
              <label className={labelCls}>Compare-At Price — struck-through "was" price</label>
              <input
                type="number"
                min={0}
                value={form.originalPrice ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : undefined
                  setForm((prev) => ({ ...prev, originalPrice: v, compareAtPrice: v }))
                }}
                placeholder="8000"
                className={`${inputCls} font-mono`}
              />
              {form.originalPrice && form.price > 0 && form.originalPrice > form.price && (
                <p className="text-[10px] text-emerald-400 mt-1 font-mono">
                  -{Math.round(((form.originalPrice - form.price) / form.originalPrice) * 100)}% discount shown on the card
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Cost Price (internal — margin only)</label>
              <input
                type="number"
                min={0}
                value={(form as any).costPrice ?? ''}
                onChange={(e) => set('costPrice' as any, e.target.value ? Number(e.target.value) : undefined)}
                placeholder="4500"
                className={`${inputCls} font-mono`}
              />
              {margin !== null && (
                <p className={`text-[10px] mt-1 font-mono ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Margin: PKR {margin.toLocaleString()} per unit
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select value={form.currency || 'PKR'} onChange={(e) => set('currency', e.target.value)} className={inputCls}>
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 mt-1">Storefront base currency is PKR — orders always settle in PKR.</p>
            </div>
            <div>
              <label className={labelCls}>Sale Window (informational + schema priceValidUntil)</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={(form as any).saleStartsAt || ''}
                  onChange={(e) => set('saleStartsAt' as any, e.target.value)}
                  className={inputCls}
                  title="Sale start"
                />
                <input
                  type="date"
                  value={(form as any).saleEndsAt || ''}
                  onChange={(e) => set('saleEndsAt' as any, e.target.value)}
                  className={inputCls}
                  title="Sale end"
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Checkout pricing is always re-verified server-side in PKR — these fields feed the storefront display, JSON-LD
            Offer and the Google Merchant feed. Existing pricing logic is untouched.
          </p>
        </div>
      )}

      {/* ============ INVENTORY ============ */}
      {activeTab === 'inventory' && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Stock Quantity</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set('stock', Number(e.target.value))}
                className={`${inputCls} font-mono`}
              />
              {form.stock === 0 && (
                <p className="text-[10px] text-amber-400 mt-1">Quantity 0 → product automatically shows as Out of Stock.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Inventory Tracking</label>
              <select
                value={form.stockMode || 'unlimited'}
                onChange={(e) => set('stockMode' as any, e.target.value)}
                className={inputCls}
              >
                <option value="unlimited">Unlimited — never decrements (digital products)</option>
                <option value="finite">Finite — track and decrement stock</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Low Stock Threshold</label>
              <input
                type="number"
                min={0}
                value={form.lowStockThreshold ?? 5}
                onChange={(e) => set('lowStockThreshold' as any, Number(e.target.value))}
                className={`${inputCls} font-mono`}
              />
              <p className="text-[10px] text-zinc-500 mt-1">Dashboard highlights products at or below this quantity.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Availability Status</label>
              <select value={form.status || 'in_stock'} onChange={(e) => set('status', e.target.value as any)} className={inputCls}>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="preorder">Preorder</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Backorders</label>
              <select
                value={(form as any).backorder || 'deny'}
                onChange={(e) => set('backorder' as any, e.target.value)}
                className={inputCls}
              >
                <option value="deny">Deny — block checkout when stock is 0</option>
                <option value="allow">Allow — accept orders below zero stock</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Stock is product-level (existing schema). Variant-level stock is not tracked — a shared pool is used for all
            variants of this product.
          </p>
        </div>
      )}

      {/* ============ IMAGES ============ */}
      {activeTab === 'images' && (
        <div className="space-y-5">
          {/* Main image */}
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <label className={`${labelCls} mb-0`}>Main Product Image *</label>
              <span className="text-[10px] text-zinc-500 font-mono">PNG / JPG / WebP — compressed &amp; uploaded to the media library</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="aspect-video rounded-xl bg-[#07090E] border border-white/10 overflow-hidden flex items-center justify-center">
                {mainImage.url ? (
                  <img
                    src={mainImage.url}
                    alt={mainImage.alt || 'Main product preview'}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.opacity = '0.2'
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs">No image yet</span>
                  </div>
                )}
              </div>
              <div className="space-y-2.5">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    handleMainFile(e.target.files)
                    e.currentTarget.value = ''
                  }}
                  className="hidden"
                  id="pep-main-file"
                />
                <button
                  onClick={() => document.getElementById('pep-main-file')?.click()}
                  disabled={uploading}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-amber-400/40 hover:border-amber-400 hover:bg-amber-400/5 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Upload Main Image
                </button>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && imageUrlInput.trim()) {
                          setMainImage((m) => ({ ...m, url: imageUrlInput.trim() }))
                          setImageUrlInput('')
                        }
                      }}
                      placeholder="…or paste an image URL (https://…)"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!imageUrlInput.trim()) return
                      setMainImage((m) => ({ ...m, url: imageUrlInput.trim() }))
                      setImageUrlInput('')
                    }}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold"
                  >
                    Use
                  </button>
                </div>
                {mainImage.url && (
                  <button
                    onClick={() => setMainImage({ url: '', alt: '', title: '' })}
                    className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove main image
                  </button>
                )}
              </div>
            </div>
            {mainImage.url && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Alt Text (Google Images + screen readers)</label>
                  <input
                    type="text"
                    value={mainImage.alt || ''}
                    onChange={(e) => setMainImage((m) => ({ ...m, alt: e.target.value }))}
                    placeholder={`e.g. ${form.name || 'Product'} official artwork`}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Image Title</label>
                  <input
                    type="text"
                    value={mainImage.title || ''}
                    onChange={(e) => setMainImage((m) => ({ ...m, title: e.target.value }))}
                    placeholder="Optional hover title"
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gallery */}
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <label className={`${labelCls} mb-0`}>
                Gallery Images ({gallery.length}) — drag to reorder
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => {
                  handleGalleryFiles(e.target.files)
                  e.currentTarget.value = ''
                }}
                className="hidden"
                id="pep-gallery-file"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => document.getElementById('pep-gallery-file')?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 text-amber-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Upload images
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={galleryUrlInput}
                  onChange={(e) => setGalleryUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && galleryUrlInput.trim()) {
                      setGallery((prev) => [...prev, { url: galleryUrlInput.trim(), alt: '', title: '' }])
                      setGalleryUrlInput('')
                    }
                  }}
                  placeholder="…or paste a gallery image URL"
                  className={`${inputCls} pl-8`}
                />
              </div>
              <button
                onClick={() => {
                  if (!galleryUrlInput.trim()) return
                  setGallery((prev) => [...prev, { url: galleryUrlInput.trim(), alt: '', title: '' }])
                  setGalleryUrlInput('')
                }}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-semibold"
              >
                Add
              </button>
            </div>

            {gallery.length === 0 ? (
              <p className="text-[11px] text-zinc-500 text-center py-4">
                No gallery images — the first image customers see is the main image above.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gallery.map((g, idx) => (
                  <div
                    key={`${g.url}-${idx}`}
                    draggable
                    onDragStart={() => {
                      dragIdxRef.current = idx
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onGalleryDrop(idx)}
                    className="rounded-xl bg-[#07090E] border border-white/10 p-2.5 flex gap-2.5 cursor-grab active:cursor-grabbing"
                  >
                    <img
                      src={g.url}
                      alt={g.alt || `Gallery image ${idx + 1}`}
                      className="w-16 h-16 rounded-lg object-cover bg-black/40 shrink-0"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.opacity = '0.2'
                      }}
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        type="text"
                        value={g.alt || ''}
                        onChange={(e) =>
                          setGallery((prev) => prev.map((x, i) => (i === idx ? { ...x, alt: e.target.value } : x)))
                        }
                        placeholder={`Alt text for image ${idx + 1}`}
                        className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60"
                      />
                      <input
                        type="text"
                        value={g.title || ''}
                        onChange={(e) =>
                          setGallery((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                        }
                        placeholder="Title (optional)"
                        className="w-full px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => promoteToMain(idx)}
                          className="p-1 rounded bg-amber-400/10 hover:bg-amber-400/20 text-amber-300"
                          title="Make main image"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveGallery(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-40"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveGallery(idx, 1)}
                          disabled={idx === gallery.length - 1}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-40"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-mono text-zinc-600 truncate flex-1">{g.url.slice(0, 42)}</span>
                        <button
                          onClick={() => setGallery((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              Product JSON stores media URLs only — base64/data-URLs are converted to media-library uploads on save.
            </p>
          </div>
        </div>
      )}

      {/* ============ VARIANTS ============ */}
      {activeTab === 'variants' && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className={labelCls}>Variant Selector Label</label>
              <input
                type="text"
                value={form.variantLabel || ''}
                onChange={(e) => set('variantLabel', e.target.value)}
                placeholder="Denomination / Plan / Region / Edition"
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2 text-[11px] text-zinc-500">
              Variants appear as purchase options on the product card (e.g. Region: Global / US / UK · Duration: 1 / 3 /
              12 Months · Plan: Basic / Premium). Prices are re-verified server-side at order time.
            </div>
          </div>
          {(form.variants || []).length === 0 ? (
            <p className="text-[11px] text-zinc-500 text-center py-3">
              No variants — the product sells at its base price with a single option.
            </p>
          ) : (
            <div className="space-y-2">
              {(form.variants || []).map((v, idx) => (
                <div key={v.id || idx} className="grid grid-cols-12 gap-2 items-center rounded-xl bg-[#07090E] border border-white/10 p-2.5">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) =>
                      set(
                        'variants',
                        (form.variants || []).map((x, i) => (i === idx ? { ...x, name: e.target.value } : x))
                      )
                    }
                    placeholder="Option value (e.g. 1 Month)"
                    className="col-span-3 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60"
                  />
                  <input
                    type="number"
                    min={0}
                    value={v.price}
                    onChange={(e) =>
                      set(
                        'variants',
                        (form.variants || []).map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x))
                      )
                    }
                    placeholder="Price"
                    className="col-span-2 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white font-mono focus:outline-none focus:border-amber-400/60"
                  />
                  <input
                    type="number"
                    min={0}
                    value={v.originalPrice ?? ''}
                    onChange={(e) =>
                      set(
                        'variants',
                        (form.variants || []).map((x, i) =>
                          i === idx ? { ...x, originalPrice: e.target.value ? Number(e.target.value) : undefined } : x
                        )
                      )
                    }
                    placeholder="Was"
                    className="col-span-2 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white font-mono focus:outline-none focus:border-amber-400/60"
                  />
                  <input
                    type="text"
                    value={v.sku || ''}
                    onChange={(e) =>
                      set(
                        'variants',
                        (form.variants || []).map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x))
                      )
                    }
                    placeholder="Variant SKU"
                    className="col-span-2 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-amber-400/60"
                  />
                  <input
                    type="text"
                    value={v.badge || ''}
                    onChange={(e) =>
                      set(
                        'variants',
                        (form.variants || []).map((x, i) => (i === idx ? { ...x, badge: e.target.value } : x))
                      )
                    }
                    placeholder="Badge"
                    className="col-span-2 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60"
                  />
                  <button
                    onClick={() => set('variants', (form.variants || []).filter((_, i) => i !== idx))}
                    className="col-span-1 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 justify-self-center"
                    title="Remove variant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() =>
              set('variants', [
                ...(form.variants || []),
                {
                  id: `var-${Date.now().toString(36)}`,
                  name: '',
                  price: form.price || 0,
                } as ProductVariant,
              ])
            }
            className="px-3 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/25 text-amber-300 text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Variant
          </button>
          <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Uses the existing variants schema (name / price / was-price / SKU / badge). No database migration is
            performed — variant stock shares the product-level pool.
          </p>
        </div>
      )}

      {/* ============ DELIVERY ============ */}
      {activeTab === 'delivery' && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Delivery Type (existing fulfillment logic)</label>
              <select value={form.deliveryType || 'Instant Auto-Email'} onChange={(e) => set('deliveryType', e.target.value)} className={inputCls}>
                {DELIVERY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 mt-1">
                Instant Auto-Email = automatic key delivery · Direct Activation = manual activation by the team · Courier =
                physical shipping. Existing order fulfillment rules apply unchanged.
              </p>
            </div>
            <div>
              <label className={labelCls}>Estimated Delivery Time</label>
              <input
                type="text"
                value={(form as any).deliveryEstimate || ''}
                onChange={(e) => set('deliveryEstimate' as any, e.target.value)}
                placeholder="e.g. within 2 minutes / 2-4 business days"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Delivery Info (shown on the product card)</label>
            <input
              type="text"
              value={form.deliveryInfo || ''}
              onChange={(e) => set('deliveryInfo', e.target.value)}
              placeholder="Instant 15-Second Key Delivery"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Customer Instructions (post-purchase)</label>
            <textarea
              value={form.activationNotes || ''}
              onChange={(e) => set('activationNotes', e.target.value)}
              rows={3}
              placeholder="How to activate / redeem, region restrictions, support contact…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Download URL (digital products — delivered after payment)</label>
            <input
              type="text"
              value={form.downloadUrl || ''}
              onChange={(e) => set('downloadUrl', e.target.value)}
              placeholder="https://…"
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>
      )}

      {/* ============ SEO ============ */}
      {activeTab === 'seo' && (
        <div className="space-y-5">
          {/* Live Google search preview */}
          <div className={cardCls}>
            <label className={labelCls}>Live Google Search Preview</label>
            <div className="rounded-xl bg-white p-4 shadow-inner">
              <div className="text-[18px] leading-snug text-[#1a0dab] truncate">
                {(effectiveSeoTitle || 'Untitled product').slice(0, 65)}
                {effectiveSeoTitle.length > 60 ? '…' : ''}
                <span className="text-[#4d5156]"> | PlayBeat Digital</span>
              </div>
              <div className="text-[13px] text-[#006621] truncate font-mono">
                playbeat.digital › product › {effectiveSlug || 'your-product'}
              </div>
              <div className="text-[13px] text-[#4d5156] mt-1 leading-snug">
                {(effectiveSeoDesc || 'No meta description yet — Google will generate one from the page text.').slice(0, 165)}
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Preview reflects what Google shows for /product/{effectiveSlug || '…'} — custom SEO fields override the
              generated defaults when filled.
            </p>
          </div>

          <div className={cardCls}>
            <div>
              <label className={labelCls}>SEO Title ({(form.seo?.title || '').length}/60 — blank = product name)</label>
              <input
                type="text"
                value={form.seo?.title || ''}
                onChange={(e) => setSeo('title', e.target.value)}
                maxLength={120}
                placeholder="Netflix Premium 1 Month — Global Private Profile"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Meta Description ({(form.seo?.description || '').length}/155 — blank = short description)</label>
              <textarea
                value={form.seo?.description || ''}
                onChange={(e) => setSeo('description', e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Official Netflix Premium private profile, 1 month, all regions. Instant delivery with warranty from PlayBeat Digital."
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Canonical URL (advanced — normally leave blank)</label>
                <input
                  type="text"
                  value={form.seo?.canonicalUrl || ''}
                  onChange={(e) => setSeo('canonicalUrl', e.target.value)}
                  placeholder={`${SITE}/product/${effectiveSlug}`}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>URL Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    set('slug', slugify(e.target.value))
                  }}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Robots — Indexing</label>
                <select
                  value={form.seo?.index === false ? 'noindex' : 'index'}
                  onChange={(e) => setSeo('index', e.target.value !== 'noindex')}
                  className={inputCls}
                >
                  <option value="index">Index — show in Google</option>
                  <option value="noindex">Noindex — exclude from Google</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Robots — Links</label>
                <select
                  value={form.seo?.follow === false ? 'nofollow' : 'follow'}
                  onChange={(e) => setSeo('follow', e.target.value !== 'nofollow')}
                  className={inputCls}
                >
                  <option value="follow">Follow — crawl linked pages</option>
                  <option value="nofollow">Nofollow</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Focus Keyword</label>
                <input
                  type="text"
                  value={form.seo?.focusKeyword || ''}
                  onChange={(e) => setSeo('focusKeyword', e.target.value)}
                  placeholder="netflix premium 1 month"
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Secondary Keywords (comma separated)</label>
              <input
                type="text"
                value={(form.seo?.secondaryKeywords || []).join(', ')}
                onChange={(e) =>
                  setSeo(
                    'secondaryKeywords',
                    e.target.value.split(',').map((k) => k.trim()).filter(Boolean)
                  )
                }
                placeholder="netflix subscription pakistan, netflix gift card"
                className={inputCls}
              />
            </div>
          </div>

          {/* Open Graph + Twitter */}
          <div className={cardCls}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-sky-400" /> Social Sharing (Open Graph + X/Twitter)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>OG Title (blank = SEO title)</label>
                <input
                  type="text"
                  value={form.seo?.ogTitle || ''}
                  onChange={(e) => setSeo('ogTitle', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>OG Description (blank = meta description)</label>
                <input
                  type="text"
                  value={form.seo?.ogDescription || ''}
                  onChange={(e) => setSeo('ogDescription', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>OG Image URL (blank = main product image)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={form.seo?.ogImage || ''}
                  onChange={(e) => setSeo('ogImage', e.target.value)}
                  placeholder={mainImage.url || `${SITE}/assets/images/playbeat/hero-marketplace.png`}
                  className={`${inputCls} font-mono`}
                />
                {mainImage.url && (
                  <button
                    onClick={() => setSeo('ogImage', mainImage.url)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 text-[11px] font-semibold whitespace-nowrap"
                  >
                    Use main image
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>X/Twitter Title (blank = OG title)</label>
                <input
                  type="text"
                  value={form.seo?.twitterTitle || ''}
                  onChange={(e) => setSeo('twitterTitle', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>X/Twitter Description</label>
                <input
                  type="text"
                  value={form.seo?.twitterDescription || ''}
                  onChange={(e) => setSeo('twitterDescription', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>X/Twitter Image</label>
                <input
                  type="text"
                  value={form.seo?.twitterImage || ''}
                  onChange={(e) => setSeo('twitterImage', e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">
              Twitter fields fall back to the Open Graph values, which fall back to the page defaults — fill only the
              overrides you actually want.
            </p>
          </div>

          {/* Real validation checks */}
          <div className={cardCls}>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-emerald-400" /> SEO Validation — real checks on this product
              <span className="ml-auto text-[10px] font-mono text-zinc-500">
                {seoChecks.filter((c) => c.level === 'ok').length} pass · {seoChecks.filter((c) => c.level === 'warning').length} warnings · {seoChecks.filter((c) => c.level === 'error').length} errors
              </span>
            </h3>
            <div className="divide-y divide-white/5 rounded-xl bg-[#07090E] border border-white/5">
              {seoChecks.map((c, i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-2">
                  {c.level === 'error' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                  ) : c.level === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  ) : c.level === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                  )}
                  <span className={`text-[11px] ${c.level === 'ok' ? 'text-zinc-400' : 'text-zinc-200'}`}>{c.message}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500">
              Checks run on real catalog data — duplicates are compared against every other product in MongoDB. No
              synthetic "SEO score" is shown because scores mislead; fix the findings instead.
            </p>
          </div>
        </div>
      )}

      {/* ============ ADVANCED ============ */}
      {activeTab === 'advanced' && (
        <div className={cardCls}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fulfillment Class</label>
              <div className="flex items-center gap-3 py-2">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    checked={!!form.digital}
                    onChange={() => setForm((prev) => ({ ...prev, digital: true, productType: 'digital' }))}
                    className="accent-amber-400"
                  />
                  ⚡ Digital (auto-delivered)
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.digital === false}
                    onChange={() => setForm((prev) => ({ ...prev, digital: false, productType: 'physical' }))}
                    className="accent-amber-400"
                  />
                  📦 Physical (courier)
                </label>
              </div>
            </div>
            <div>
              <label className={labelCls}>Visibility</label>
              <div className="py-2 text-xs text-zinc-300 flex items-center gap-2">
                {form.active !== false ? (
                  <>
                    <Eye className="w-4 h-4 text-emerald-400" /> Visible on the storefront (published)
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-amber-400" /> Hidden from customers (draft / archived)
                  </>
                )}
              </div>
              <p className="text-[10px] text-zinc-500">Visibility follows the Publication Status on the General tab.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Rating (only if you have real review data)</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={form.rating || ''}
                onChange={(e) => set('rating', Number(e.target.value))}
                placeholder="0"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Review Count (real verified reviews only)</label>
              <input
                type="number"
                min={0}
                value={form.reviewCount || ''}
                onChange={(e) => set('reviewCount', Number(e.target.value))}
                placeholder="0"
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>
          <p className="text-[10px] text-amber-400/80 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Google penalizes fabricated ratings. AggregateRating structured data is only emitted when both values are
            greater than zero — keep them 0 unless the reviews genuinely exist.
          </p>
          {(form as any).slugHistory?.length > 0 && (
            <div>
              <label className={labelCls}>Slug History (301 redirects active)</label>
              <div className="space-y-1">
                {((form as any).slugHistory as string[]).map((s: string) => (
                  <div key={s} className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 text-amber-400 rotate-180" />
                    /product/{s} → /product/{form.slug}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(form as any).consolidatedParentId && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
              This product is a consolidated variant child of {(form as any).consolidatedParentId} — it is hidden from
              the storefront and reachable only through its parent's variant selector.
            </div>
          )}
          {form.category === 'Smart Projectors' && (
            <div className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px]">
              Smart Projector hardware specs (resolution, brightness, OS…) are managed by the Hardware Specification
              Matrix — the projectorSpec record on this document is preserved as-is on save.
            </div>
          )}
          <div>
            <label className={labelCls}>Payload Preview (what reaches MongoDB)</label>
            <pre className="text-[10px] font-mono text-zinc-400 bg-[#07090E] border border-white/10 rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {JSON.stringify(buildPayload(((form.cmsStatus as string) || 'published') as any), (_k, v) => (v === undefined ? undefined : v), 2).slice(0, 2000)}
            </pre>
            <p className="text-[10px] text-zinc-500 mt-1">
              {JSON.stringify(buildPayload(((form.cmsStatus as string) || 'published') as any)).length.toLocaleString()} bytes —
              well under the 4.5MB serverless limit (images are URLs, never base64).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
