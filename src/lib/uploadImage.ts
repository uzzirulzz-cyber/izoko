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
export const MAX_UPLOAD_BYTES = 600 * 1024 // matches the server ceiling

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

/**
 * Compress an image file for catalog storage:
 * - images larger than MAX_IMAGE_DIMENSION are downscaled
 * - JPEG/WebP sources re-encode as JPEG q0.85 (photographic product shots)
 * - small PNGs (logos, transparency) pass through untouched; big PNGs flatten
 *   to JPEG only when that actually shrinks them
 * Returns a data URL guaranteed to decode under MAX_UPLOAD_BYTES.
 */
export async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImageElement(dataUrl)

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width || 1, img.height || 1))
  const needsResize = scale < 1
  const isPng = file.type === 'image/png'
  const alreadySmall = file.size <= 300 * 1024

  // Small PNG → keep as-is (preserves transparency; under every limit)
  if (isPng && alreadySmall && !needsResize && dataUrl.length <= MAX_UPLOAD_BYTES * 1.4) {
    return dataUrl
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round((img.width || 1) * scale))
  canvas.height = Math.max(1, Math.round((img.height || 1) * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl // canvas unavailable — send original and let the server judge
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  let quality = 0.85
  let out = canvas.toDataURL('image/jpeg', quality)
  // Degrade quality until the payload fits the server ceiling
  while (out.length > MAX_UPLOAD_BYTES * 1.35 && quality > 0.5) {
    quality -= 0.12
    out = canvas.toDataURL('image/jpeg', quality)
  }
  // Rare: JPEG still bigger than the (transparent) source — fall back to source
  if (out.length >= dataUrl.length && dataUrl.length <= MAX_UPLOAD_BYTES * 1.35) {
    return dataUrl
  }
  return out
}

export type MediaUploadResult = {
  ok: boolean
  url?: string
  publicId?: string
  size?: number
  error?: string
}

/** Upload one compressed data URL to the media endpoint; returns its URL. */
export async function uploadProductImage(
  dataUrl: string,
  filename: string,
  purpose: string = 'product'
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
      body: JSON.stringify({ dataUrl, filename, purpose }),
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.success && data?.url) {
      return {
        ok: true,
        url: String(data.url),
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

/** True when a string is an inline base64 image (must never reach the API). */
export function isDataImageUrl(value: unknown): boolean {
  return typeof value === 'string' && /^\s*data:image\//i.test(value)
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
