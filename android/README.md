# Playbeat Admin — Android App

Official Android client for the Playbeat admin dashboard (https://playbeat.digital/admin).

## Security model

- **Same credentials as the web admin** — super admin and staff email/password only.
  Customer accounts are rejected (server-side `requireAdmin` on every route).
- **Role-restricted access** — staff tokens carry role `staff`; permissions match the
  web panel exactly (staff cannot access super-admin features).
- **Live status** — while signed in, the app heartbeats `POST /api/admin/app/heartbeat`
  every 60s with device model, Android version and app version. The web panel
  (`Admin → Mobile App`) shows every device with LIVE / IDLE / OFFLINE status.
- **Device control** — a super admin can revoke any device from the panel; revoked
  devices are blocked by the API immediately (403 on heartbeat).

## Release

| Field | Value |
|---|---|
| Version | 1.0.0 (versionCode 1) |
| Package | `digital.playbeat.adminapp` |
| Min Android | 7.0 (API 24) |
| Target | Android 14 (API 34) |
| Download URL | `/downloads/playbeat-admin-v1.0.0.apk` (served statically from `public/downloads/`) |
| SHA-256 | `294325bcb0c913902baef9f7cd7a9f717ec434cef3951fb629231d8a9decf9c3` |

The APK is downloaded and installed directly on the phone ("install unknown apps"
permission required — it is distributed outside the Play Store).

## Rebuilding

No Gradle needed — the build uses aapt2 + ECJ + d8 + apksigner directly:

```bash
# prerequisites (one-time)
#   android platform-34  -> $SDK/platforms/android-34/android.jar
#   build-tools 34       -> $SDK/build-tools-tmp/android-14/{aapt2,d8,zipalign,apksigner}
#   ecj compiler jar     -> $SDK/dl/ecj.jar

./build.sh
```

`build.sh` compiles resources, links the APK, compiles `src/` + generated `R.java`,
dexes, zipaligns and signs with `playbeat-release.keystore`
(store/key password: `playbeat2026`). **Keep the keystore** — Android requires
updates to be signed with the same key.

## Shipping a new version

1. Bump `android:versionCode` / `android:versionName` in `AndroidManifest.xml`
2. `./build.sh`
3. Update the `APP_RELEASE` block at the bottom of `api/admin/index.ts`
   (version, sizeBytes, sha256, changelog)
4. Commit + deploy
