// Customer mobile app configuration — data layer for the storefront.
//
// Single source of truth is GET /api/app/storefront (public, no secrets):
//   config = MongoDB `mobile_apps_config`  (Admin → Mobile Apps, no redeploy)
//          → environment variables          (ANDROID_APP_URL / IOS_APP_URL…)
//          → safe defaults                  (empty URL = "Coming soon" state)
//
// If the API is unreachable the storefront falls back to build-time Vite env
// vars (VITE_ANDROID_APP_URL / VITE_IOS_APP_URL) so the UI still renders;
// URLs are re-validated here before anything is rendered as a link.

export interface AppPlatformInfo {
  url: string
  version: string
  buildNumber: number
  minOsVersion: string
  available: boolean
  packageName: string
  source?: string
}

export interface StorefrontAppsConfig {
  android: AppPlatformInfo
  ios: AppPlatformInfo
  downloadPageVisible: boolean
  footerVisible: boolean
  homeSectionVisible: boolean
  promoBanner: string
  releaseNotes: string[]
  qrDestination: 'download' | 'android' | 'ios'
  qrValue: string
  deepLinkScheme: string
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const SITE = 'https://playbeat.digital'

/** Build-time fallbacks (Vite convention). Optional — DB/admin config wins.
 *  Android defaults to the signed release APK on the public GitHub repo —
 *  same default as the server (api/_lib/mobileApps.ts). */
const DEFAULT_ANDROID_APK_URL =
  'https://github.com/uzzirulzz-cyber/Playbeat-Digital-apk/releases/latest/download/PlayBeat.apk'

const ENV_FALLBACK: StorefrontAppsConfig = {
  android: {
    url: sanitizeUrl((import.meta as any).env?.VITE_ANDROID_APP_URL || DEFAULT_ANDROID_APK_URL),
    version: '1.0.0',
    buildNumber: 1,
    minOsVersion: '7.0 (API 24)',
    available: (import.meta as any).env?.VITE_ANDROID_APP_URL !== 'off',
    packageName: 'digital.playbeat.app',
  },
  ios: {
    url: sanitizeUrl((import.meta as any).env?.VITE_IOS_APP_URL || ''),
    version: '1.0.0',
    buildNumber: 1,
    minOsVersion: '16.0',
    available: false,
    packageName: 'digital.playbeat.app',
  },
  downloadPageVisible: true,
  footerVisible: true,
  homeSectionVisible: true,
  promoBanner: '',
  releaseNotes: [],
  qrDestination: 'download',
  qrValue: `${SITE}/download`,
  deepLinkScheme: 'playbeat',
}

/** Defensive URL validation for anything we render into an href. */
export function sanitizeUrl(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s || s.length > 600) return ''
  if (/[\s"'<>\\]/.test(s)) return ''
  if (s.startsWith('/')) return /^\/[A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=%]*$/.test(s) ? s : ''
  try {
    const u = new URL(s)
    if (u.protocol !== 'https:') return ''
    return u.toString()
  } catch {
    return ''
  }
}

/** True when the platform can render a real download link. */
export function isListable(p?: AppPlatformInfo | null): boolean {
  return Boolean(p?.available && p?.url && sanitizeUrl(p.url))
}

let cache: { config: StorefrontAppsConfig; at: number } | null = null
let inflight: Promise<StorefrontAppsConfig> | null = null
const CACHE_TTL_MS = 60_000

/**
 * Fetch the live customer-app config. Never throws — falls back to the
 * env-fallback config so UI sections can always render an honest state.
 */
export async function fetchAppsConfig(): Promise<StorefrontAppsConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.config
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/app/storefront`, { credentials: 'omit' })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success && data?.apps) {
        const a = data.apps
        const cfg: StorefrontAppsConfig = {
          android: {
            url: sanitizeUrl(a.android?.url),
            version: String(a.android?.version || '1.0.0'),
            buildNumber: Number(a.android?.buildNumber) || 1,
            minOsVersion: String(a.android?.minOsVersion || ''),
            available: Boolean(a.android?.available) && Boolean(sanitizeUrl(a.android?.url)),
            packageName: String(a.android?.packageName || 'digital.playbeat.app'),
            source: a.android?.source,
          },
          ios: {
            url: sanitizeUrl(a.ios?.url),
            version: String(a.ios?.version || '1.0.0'),
            buildNumber: Number(a.ios?.buildNumber) || 1,
            minOsVersion: String(a.ios?.minOsVersion || ''),
            available: Boolean(a.ios?.available) && Boolean(sanitizeUrl(a.ios?.url)),
            packageName: String(a.ios?.packageName || 'digital.playbeat.app'),
            source: a.ios?.source,
          },
          downloadPageVisible: a.downloadPageVisible !== false,
          footerVisible: a.footerVisible !== false,
          homeSectionVisible: a.homeSectionVisible !== false,
          promoBanner: String(a.promoBanner || ''),
          releaseNotes: Array.isArray(a.releaseNotes) ? a.releaseNotes.map(String) : [],
          qrDestination: ['download', 'android', 'ios'].includes(a.qrDestination) ? a.qrDestination : 'download',
          qrValue: sanitizeUrl(a.qrValue) || `${SITE}/download`,
          deepLinkScheme: String(a.deepLinkScheme || 'playbeat'),
        }
        cache = { config: cfg, at: Date.now() }
        return cfg
      }
    } catch {
      /* fall through to env fallback */
    }
    cache = { config: ENV_FALLBACK, at: Date.now() }
    return ENV_FALLBACK
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

// ---------------------------------------------------------------- device
export type DeviceKind = 'android' | 'ios' | 'desktop'

export function detectDevice(ua: string = navigator.userAgent): DeviceKind {
  if (/android/i.test(ua)) return 'android'
  // iPadOS 13+ masquerades as desktop Safari — check for touch + mac
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document)) return 'ios'
  return 'desktop'
}

/** Best-effort detection of an already-installed PWA (standalone display). */
export function isStandalonePwa(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    (navigator as any).standalone === true
  )
}
