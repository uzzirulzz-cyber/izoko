# PlayBeat Digital — Customer Mobile App (Android + iOS)

React Native (Expo, TypeScript) app for **playbeat.digital** customers. It talks to the
**same backend APIs** and the **same MongoDB customer database** as the storefront —
there is **no separate mobile customer database**. One account works on web and app.

## Feature map (all served by the existing playbeat.digital API)

| Feature | App screen | Backend endpoint (shared with website) |
|---|---|---|
| Register / login | Auth (Account tab, modal) | `POST /api/auth/register`, `POST /api/auth/login` |
| Google / Facebook sign-in | Auth (system browser + deep link) | `GET /api/auth/oauth/{google\|facebook}/start?mobile=1` |
| Session persistence + sync | SecureStore (device keystore) | `GET /api/auth/me` (same JWT as web) |
| Catalog + search | Shop tab | `GET /api/products`, `GET /api/categories` |
| Product details + variants | ProductDetail | (catalog payload) |
| Cart | Cart tab | local + `POST /api/orders` (server-authoritative pricing) |
| Checkout (2-stage, coupon, legal gates) | Checkout | `GET /api/payments/methods`, `POST /api/payments/coupon` |
| Rapid Gateway payment | opens hosted payment URL | `POST /api/payments/rapid/create` |
| Orders + license keys | Orders tab / OrderDetail | `GET /api/orders/me`, `GET /api/orders/mine/:num` |
| Notifications | Alerts tab | derived from `/api/orders/me` (poll) + Expo push |
| Push token registration | automatic after sign-in | `POST /api/app/push-token` |
| Customer support chat | Support (via Admin Message Box) | `/api/messages/start`, `/api/messages/mine` |

Auth tokens are stored in **SecureStore** (iOS Keychain / Android Keystore) under the
same key names the website uses (`playbeat_user_token` / `playbeat_user`).

## Deep-link OAuth (Google / Facebook)

1. App opens the system browser at `/api/auth/oauth/<provider>/start?mobile=1`
2. Server runs the standard OAuth flow (same state-cookie CSRF protection)
3. Callback redirects to `playbeat://oauth/callback?token=…` (the `.m` state suffix marks a mobile flow)
4. App validates the token via `/api/auth/me` and stores the session

This reuses the EXACT same provider configuration and user records as the website.

## Prerequisites

- Node 20+
- Expo CLI: `npm i -g eas-cli expo-cli` (or use `npx`)
- An Expo account (free) for EAS Build: `eas login`

## Local run

```bash
cd mobile
npm install
npx expo start            # scan the QR with Expo Go (iOS/Android)
```

## Production builds (EAS Build — Google Play .aab / Apple .ipa)

```bash
eas build:configure                          # links the project (creates projectId in app.json)
eas build -p android --profile production    # → app.aab for Google Play
eas build -p android --profile preview       # → installable .apk for testing
eas build -p ios    --profile production     # → .ipa (requires Apple Developer account)
eas submit -p android                        # submit to Google Play (after store setup)
eas submit -p ios                            # submit to App Store Connect
```

Build outputs are downloadable from https://expo.dev — upload the `.aab`/`.ipa`
to the stores, then set the live listing URLs in **Admin → Mobile Apps** on the
storefront (or via `ANDROID_APP_URL` / `IOS_APP_URL` env vars). The /download
page, footer badges and homepage section update automatically — no redeploy.

## Store listing identities

- Android package: `digital.playbeat.app`
- iOS bundle id: `digital.playbeat.app`
- Deep link scheme: `playbeat://`
- Versioning: `app.json` version / versionCode, auto-incremented by EAS (`autoIncrement: true`)

## Google Play / App Store checklist

1. Google Play Console → create app → upload the production `.aab`
   - Data safety: collects email (account), order info (purchases). No data sold.
2. App Store Connect → create app (bundle id above) → upload the `.ipa` via EAS submit
3. Add the OAuth redirect URIs in Google/Facebook developer consoles
   (already needed only for the web flow — mobile reuses it, no extra URIs)
4. After review, set the store URLs in **Admin → Mobile Apps** → save

## Type-check

```bash
npm run typecheck    # tsc --noEmit (strict)
```
