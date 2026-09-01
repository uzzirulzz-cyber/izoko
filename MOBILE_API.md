# Playbeat Admin — Mobile API Reference

The Android admin app consumes the **same backend** as the web admin panel.
This document covers the endpoints that exist specifically for (or are used
prominently by) the mobile client. Every admin endpoint requires
`Authorization: Bearer <admin-jwt>` (or the `adminToken` cookie) and passes the
same `requireAdmin` / `requireSuperAdmin` gates as the web panel.

Base URL: `https://playbeat.digital`

---

## Authentication (shared with web)

### `POST /api/auth/admin/login`
Same endpoint, same credentials, same rules as the web admin login.

```json
{ "email": "admin@playbeat.digital", "password": "…" }
```

**200**
```json
{
  "success": true,
  "token": "<jwt, 7-day TTL>",
  "admin": { "email": "…", "name": "…", "role": "admin|staff" }
}
```

**Errors** — `401` invalid credentials · `403` suspended/deactivated staff ·
customer accounts are rejected (`401/403`). Suspended accounts are blocked
immediately; tokens are invalidated by expiry, password change or device revoke.

The response is also the web login — no separate app accounts exist.

### `POST /api/auth/admin/logout`
Authenticated. Records the logout in `admin_activity`.

---

## Version gate (public — no secrets)

### `GET /api/app/version?installed=x.y.z`
Called by the app **before login**. Returns release metadata and the update
decision. Controlled live by the super admin (see Release management).

**200**
```json
{
  "success": true,
  "app": {
    "name": "Playbeat Admin", "platform": "Android",
    "version": "2.0.0", "versionCode": 2,
    "apkUrl": "/downloads/playbeat-admin-v2.0.0.apk", "aabUrl": "",
    "sizeBytes": 0, "sha256": "",
    "minSupportedVersion": "1.0.0", "forceUpdate": false,
    "buildDate": "2026-09-02T00:00:00.000Z",
    "minAndroid": "7.0 (API 24)", "targetAndroid": "Android 14 (API 34)",
    "releaseNotes": ["…"],
    "installed": "1.0.0",
    "updateRequired": true,
    "updateAvailable": true
  }
}
```

- `updateRequired=true` → app shows the blocking “Update Required” screen.
- `updateAvailable=true` (and not required) → dismissible update banner.

---

## Live status

### `POST /api/admin/app/heartbeat` *(60s, while signed in)*
```json
{ "deviceId": "pb-and-…", "deviceModel": "Samsung SM-S918B",
  "androidVersion": "14", "appVersion": "2.0.0" }
```

Upserts the device into `admin_app_devices` (admin email, name, role, IP,
first/last seen). **Revoked devices get `403`** — the app then wipes the
session and locks to the login screen.

**200**
```json
{
  "success": true, "serverTime": "…", "onlineNow": 2,
  "ops": { "pendingOrders": 3, "ordersToday": 11, "unreadMessages": 0 }
}
```
The `ops` snapshot drives the native badge counts.

### `GET /api/admin/app/notifications`
Aggregated admin-relevant feed (72h): recent orders, admin activity, security
events (`app_device_control`, `password_change`), customer growth.

**200**
```json
{
  "success": true,
  "summary": { "pendingOrders": 3, "newUsers": 5, "devicesOnline": 2 },
  "notifications": [
    { "id": "order-…", "category": "order|security|admin|user",
      "title": "New order received", "body": "…",
      "deepLink": "orders", "createdAt": "…", "read": false }
  ]
}
```

---

## Device management (admin panel)

### `GET /api/admin/app/devices`
Live device list with computed status
(`online` <5m · `idle` <30m · `offline` · `revoked`) + totals.

### `POST /api/admin/app/devices/revoke` *(super admin)*
```json
{ "deviceId": "pb-and-…", "revoked": true }
```
Force-logout: blocks the device at the API instantly and writes
`app_device_control` to `admin_activity` (immutable audit log).

---

## Release management (super admin, no redeploy)

### `GET /api/admin/app/version`
Authenticated view of the same release metadata (also returns
`minSupportedVersion`, `forceUpdate`, `buildDate`).

### `PUT /api/admin/app/release`
```json
{ "minSupportedVersion": "2.0.0",
  "forceUpdate": true,
  "releaseNotes": ["line 1", "line 2"] }
```
Updatable fields: `version`, `versionCode`, `apkUrl`, `aabUrl`, `sizeBytes`,
`sha256`, `buildDate`, `minSupportedVersion`, `forceUpdate`, `releaseNotes`.
Persisted in `app_release` (`_id: "current"`), audited as `app_release_update`.

---

## Everything else

Dashboard stats, products, orders log, customers, staff, backups, CMS,
analytics — the app renders the **full web console** through the authenticated
WebView, so those actions use the exact same endpoints documented in
`api/admin/index.ts`. There is no mobile-specific duplication.

---

## Collections added

| Collection | Purpose |
|------------|---------|
| `app_release` | Single doc `_id:"current"` — release metadata + update enforcement |
| `admin_app_devices` | One doc per device — live status for the panel + revoke control |
