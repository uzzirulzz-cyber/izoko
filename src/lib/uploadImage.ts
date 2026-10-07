// Product image upload pipeline — the HTTP 413 fix.
//
// Root cause of "Sync failed (413)": the product editor embedded picked image
// files as base64 data URLs inside the product JSON (often duplicated across
// image/gallery/galleryImages/additionalImages). A single 2.5MB photo became
// ~13MB of request payload, past Vercel's ~4.5MB serverless body cap.
//
// Fix: compress client-side (canvas, max 1600px, JPEG ~0.85), then upload the
// single image through POST /api/admin/media (manager-gated) and reference
// only the returned "/api/media/<id>" URL inside the product payload.

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''

export const MAX_IMAGE_DIMENSION = 1600
export const MAX_HERO_DIMENSION = 1920 // hero uploads may keep artwork detail (perf task §7)
export const MAX_THUMB_DIMENSION = 600 // product-card thumbnails (perf task §7)
export const MAX_UPLOAD_BYTES = 600 * 1024 // matches the server ceiling
export const MAX_THUMB_BYTES = 200 * 1024 // thumbnails are small by definition

const getAdminToken = () => localStorage.getItem('playbeat_admin_token')

/** Read a File as a data URL (needed for canvas input). */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode the image.'))
    img.src = dataUrl
  })
}

function makeCanvas(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round((img.width || 1) * scale))
  canvas.height = Math.max(1, Math.round((img.height || 1) * scale))
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Encode a canvas as WebP q80-85 (perf task §7) with a JPEG fallback for
 * engines that cannot encode WebP (they silently return a PNG data URL).
 * Degrades quality until the payload fits `budgetBytes`.
 */
function encodeCanvas(canvas: HTMLCanvasElement, budgetBytes: number, quality = 0.85): string {
  const supportsWebP = (() => {
    try {
      return canvas.toDataURL('image/webp', 0.5).startsWith('data:image/webp')
    } catch {
      return false
    }
  })()
  const mime = supportsWebP ? 'image/webp' : 'image/jpeg'
  let q = quality
  let out = canvas.toDataURL(mime, q)
  while (out.length > budgetBytes * 1.35 && q > 0.5) {
    q -= 0.12
    out = canvas.toDataURL(mime, q)
  }
  return out
}

/**
 * Compress an image file for catalog storage:
 * - images larger than the purpose's max dimension are downscaled
 *   (products ≤1600px, hero artwork ≤1920px — perf task §7)
 * - re-encodes as WebP q0.85 when the browser can (else JPEG q0.85)
 * - small PNGs (logos, transparency) pass through untouched; GIFs ALWAYS
 *   pass through (re-encoding would drop animation); big PNGs flatten only
 *   when that actually shrinks them
 * Returns a data URL guaranteed to decode under MAX_UPLOAD_BYTES.
 */
export async function compressImageFile(file: File, purpose: string = 'product'): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImageElement(dataUrl)

  const maxDim = purpose === 'hero' ? MAX_HERO_DIMENSION : MAX_IMAGE_DIMENSION
  const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1))
  const needsResize = scale < 1
  const isPng = file.type === 'image/png'
  const isGif = file.type === 'image/gif'
  const alreadySmall = file.size <= 300 * 1024

  // Animated GIFs must never be re-encoded (canvas drops the animation)
  if (isGif) {
    return dataUrl
  }

  // Small PNG → keep as-is (preserves transparency; under every limit)
  if (isPng && alreadySmall && !needsResize && dataUrl.length <= MAX_UPLOAD_BYTES * 1.4) {
    return dataUrl
  }

  const canvas = makeCanvas(img, maxDim)
  if (!canvas.getContext('2d')) return dataUrl // canvas unavailable — send original and let the server judge

  const out = encodeCanvas(canvas, MAX_UPLOAD_BYTES, 0.85)
  // Rare: re-encode still bigger than the (transparent) source — fall back to source
  if (out.length >= dataUrl.length && dataUrl.length <= MAX_UPLOAD_BYTES * 1.35) {
    return dataUrl
  }
  return out
}

/**
 * Compress an image AND produce a ≤600px product-card thumbnail (perf task
 * §7: thumbnails 600px q75-80). The thumbnail is best-effort — null when the
 * browser cannot encode one; the server then falls back to the main bytes.
 */
export async function compressImageFileWithThumb(
  file: File,
  purpose: string = 'product'
): Promise<{ dataUrl: string; thumbDataUrl: string | null }> {
  const dataUrl = await compressImageFile(file, purpose)
  if (file.type === 'image/gif') return { dataUrl, thumbDataUrl: null }
  try {
    const img = await loadImageElement(dataUrl)
    if (Math.max(img.width || 1, img.height || 1) <= MAX_THUMB_DIMENSION) {
      // Main image is already ≤600px — it IS its own thumbnail
      return { dataUrl, thumbDataUrl: dataUrl.length <= MAX_THUMB_BYTES * 1.35 ? dataUrl : null }
    }
    const canvas = makeCanvas(img, MAX_THUMB_DIMENSION)
    if (!canvas.getContext('2d')) return { dataUrl, thumbDataUrl: null }
    const thumb = encodeCanvas(canvas, MAX_THUMB_BYTES, 0.78)
    if (thumb.length > MAX_THUMB_BYTES * 1.35) return { dataUrl, thumbDataUrl: null }
    return { dataUrl, thumbDataUrl: thumb }
  } catch {
    return { dataUrl, thumbDataUrl: null }
  }
}

export type MediaUploadResult = {
  ok: boolean
  url?: string
  thumbUrl?: string
  publicId?: string
  size?: number
  error?: string
}

/** Upload one compressed data URL (plus optional ≤600px thumbnail) to the
 *  media endpoint; returns its URL. */
export async function uploadProductImage(
  dataUrl: string,
  filename: string,
  purpose: string = 'product',
  thumbDataUrl?: string | null
): Promise<MediaUploadResult> {
  const token = getAdminToken()
  if (!token) {
    return { ok: false, error: 'Admin session missing — sign in again to upload images.' }
  }
  try {
    const res = await fetch(`${API_BASE}/api/admin/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      credentials: 'include',
      body: JSON.stringify({ dataUrl, filename, purpose, thumbDataUrl: thumbDataUrl || undefined }),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.success && data?.url) {
      return {
        ok: true,
        url: String(data.url),
        thumbUrl: data.thumbUrl ? String(data.thumbUrl) : undefined,
        publicId: String(data.publicId || ''),
        size: Number(data.size || 0),
      }
    }
    if (res.status === 401) {
      return { ok: false, error: 'Admin session expired — sign in again, then re-pick the image.' }
    }
    return { ok: false, error: data?.error || `Image upload failed (${res.status}).` }
  } catch {
    return { ok: false, error: 'Network error while uploading the image — try again.' }
  }
}

/**
 * True when a string is an inline base64 image (must never reach the API).
 */
export function isDataImageUrl(value: unknown): boolean {
  return typeof value === 'string' && /^\s*data:image\//i.test(value)
}

/**
 * The card-size variant URL of a stored media asset (perf task §7). The
 * server serves the stored 600px thumbnail when the asset has one and the
 * ORIGINAL bytes otherwise — so appending &t=1 is always safe for media
 * URLs and never applies to external/legacy URLs.
 */
export function mediaThumbUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/api/admin/media?id=')) return null
  return value.includes('?') ? `${value}&t=1` : `${value}?t=1`
}

/**
 * Upload a single image value (if it is still a base64 data URL) and return
 * its stored URL. Already-URL values pass through untouched — this is what
 * makes legacy products that carry data URLs editable again.
 */
export async function ensureImageUrl(
  value: string,
  filenameHint: string,
  purpose: string = 'product'
): Promise<{ ok: boolean; url: string; unchanged?: boolean; error?: string }> {
  if (!isDataImageUrl(value)) return { ok: true, url: value, unchanged: true }
  const uploaded = await uploadProductImage(value, filenameHint || 'product-image', purpose)
  if (!uploaded.ok || !uploaded.url) {
    return { ok: false, url: '', error: uploaded.error || 'Image upload failed.' }
  }
  return { ok: true, url: uploaded.url }
}
