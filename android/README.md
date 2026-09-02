# Playbeat Admin — Official Android App (v2.0.0, Enterprise)

The official **native Android administration client** for the Playbeat admin platform
(`digital.playbeat.adminapp`). It is a secure mobile companion to the **same backend,
database, authentication and permissions** used by the web admin panel — no separate
system, no duplicated business logic, no local data store.

```
Web Admin Panel  ↔  Shared Backend/API  ↔  Android Admin App
(playbeat.digital)   (Vercel functions)     (this APK)
                          ↕
                    MongoDB (playbeat)
```

## What's in v2.0.0 (enterprise release)

| Area | Capability |
|------|------------|
| **Native login** | Branded enterprise sign-in — *exactly* the same email/password as the web panel. Super admin + staff IDs only (enforced server-side). |
| **Session security** | JWT sealed with **AES-256-GCM**; key lives in the **Android Keystore** (non-exportable). No plaintext tokens anywhere. |
| **Biometric unlock** | Fingerprint / face gate on app resume (framework BiometricPrompt API 28+, FingerprintManager 24–27). Fallback = password re-entry. |
| **Version gate** | Launch-time check against `/api/app/version` → blocking **“Update Required”** screen or optional update banner. Controlled live from the admin panel (no app-store review). |
| **Bottom navigation** | Native Dashboard / Orders / Products / More bar with **live badge counts** (pending orders) that deep-link into the console (`/admin#orders` etc.). |
| **Notifications** | Real backend feed (`/api/admin/app/notifications`) — new orders, security events, admin activity. Bell badge + heads-up alerts. |
| **Live status** | 60s native heartbeat → `admin_app_devices` collection → the admin panel shows LIVE/IDLE/OFFLINE per device, with role + app version + IP. |
| **Device control** | Super admin can **force-logout / revoke / restore** any device from the panel; revoked devices are blocked by the API instantly and the app locks itself out. |
| **Hardening** | `FLAG_SECURE` (screenshots + recents thumbnail off), root-detection warning, HTTPS-only, `allowBackup=false`, session wipe on 401/403, secure logout (Keystore erase). |
| **Mobile productivity** | Gallery/file **image upload** (product editor), **DownloadManager** downloads (reports, APK), pull-to-refresh, offline auto-retry, dark enterprise theme. |

## Install

1. Open the admin panel → **Mobile App (Android)** → *Download APK* (or scan the QR).
2. On the phone: allow *Install unknown apps* for the browser, install the APK.
3. Sign in with the **web admin credentials** (super admin or staff).
4. The device appears in the admin panel's *Connected Devices* table within a minute.

Minimum Android 5.0 (API 21) · Target Android 14 (API 34) · Signed release build.

## Architecture

Framework-only native layers (no Gradle, no androidx — see *Build* below):

```
android/
├── AndroidManifest.xml                     # v2 permissions + FLAG_SECURE defaults
├── build.sh                                # aapt2 + ECJ + d8 + apksigner pipeline
├── playbeat-release.keystore               # release signing key
├── res/                                    # brand icons, splash, theme
└── src/digital/playbeat/adminapp/
    ├── AdminApp.java                       # Application entry
    ├── BuildConfig.java                    # version identity (synced with manifest)
    ├── MainActivity.java                   # shell: version gate, biometric lock,
    │                                       #   bottom nav, WebView console, heartbeat,
    │                                       #   notifications, downloads, offline handling
    ├── LoginActivity.java                  # native enterprise sign-in
    ├── SecureStore.java                    # Keystore-backed AES-256-GCM session vault
    ├── BiometricGate.java                  # fingerprint/face unlock (API 23–34, guarded)
    ├── Security.java                       # root detection + integrity checks
    └── Api.java                            # HTTPS JSON client (login/version/heartbeat/feed)
```

### Security model (summary)

- **Authorization lives on the server.** The app never hard-codes permissions.
  Every request hits the same `requireAdmin` / `requireSuperAdmin` gates as the web.
- **Same credentials** — `/api/auth/admin/login` is shared with the web panel; staff
  tokens carry their real `staff` role with identical restrictions.
- **Session tokens** are sealed at rest (AES-256-GCM, Keystore key) and wiped on
  logout, revocation, expiry or keystore invalidation (device lockscreen change).
- **Device revocation** is immediate: the heartbeat (and every other admin API call)
  fails with 403 → the app erases the session and returns to the login screen.
- **Update enforcement** is server-driven: `minSupportedVersion` + `forceUpdate` are
  stored in MongoDB (`app_release`) and edited from the admin panel.
- **Screenshot/recents protection** via `FLAG_SECURE` on both activities.

## Build

### Scripted release build (used for the shipped APK)

```bash
bash android/build.sh
# → public/downloads/playbeat-admin-v2.0.0.apk  (signed, zip-aligned)
```

Requires the toolchain under `/home/z/my-project/scripts/android-sdk`
(build-tools 34, platform-34 `android.jar`, ECJ 3.33 — fetch with
`scripts/fetch_android_toolchain.sh`). Bump `versionCode`/`versionName` in
`AndroidManifest.xml` **and** `BuildConfig.APP_VERSION` together.

### Android Studio / Gradle (optional modernization path)

The source layout is Gradle-ready: create a standard project with
`namespace digital.playbeat.adminapp`, `minSdk 21`, `targetSdk 34`, drop
`src/` + `res/` + `AndroidManifest.xml` in, and add the splash/vector polish.
A future release may migrate to Kotlin + Jetpack Compose — the backend contract
(`/api/app/*`, `/api/admin/app/*`) is version-gated and will not change.

## Release management (super admin)

Admin panel → **Mobile App (Android)** → *Release Management*:

- **Min supported version** — semver; devices below it get the blocking gate.
- **Force update** — ON = hard block at launch; OFF = optional banner only.
- **Release notes** — one line each, rendered in the in-app update dialog.

Stored in `app_release` (`_id: "current"`) via `PUT /api/admin/app/release`;
changes take effect on the next app launch — no redeploy required.

## Backend contract

See [`MOBILE_API.md`](../MOBILE_API.md) for the full endpoint reference
(auth, version gate, heartbeat, notifications, devices, release management).
