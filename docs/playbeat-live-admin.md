# PlayBeat.live in the PlayBeat Digital admin

Open `/admin#playbeat-live`, the sidebar's **PlayBeat.live** section, the main
dashboard shortcut, or the command palette. Existing storefront, login,
PlayBeat Digital analytics and orders keep their current behavior.

The section reports the current channel catalogue plus GA4 visitors, sessions,
page views, engagement, daily traffic, sources, countries, devices, pages,
events, purchases and revenue. A separate commerce connection supplies
operational orders and paid revenue. Missing or failed sources show an
unavailable state, never fabricated zeroes. The catalogue response is a
reachability check, not proof that every channel plays smoothly.

## Google Analytics

1. PlayBeat.live must already send events to its GA4 web stream. Adding this
   admin report does not install a tracking tag or recover historical visits.
2. Enable the Google Analytics Data API in the service account's Cloud project.
3. Add the service account as a **Viewer** on the GA4 property.
4. Set `PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_EMAIL` and
   `PLAYBEAT_LIVE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` in the server environment.
   The existing `GOOGLE_SERVICE_ACCOUNT_EMAIL` and
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are fallback credentials if appropriate.
   Do not put keys in frontend variables, git, or the admin form.
5. Save the numeric property ID in the section's **Google Analytics connection**
   form (super admin only), or set `PLAYBEAT_LIVE_GA4_PROPERTY_ID` on the server.
   A saved value takes precedence; saving an empty value disconnects reporting.

Each report filters the hostname to `playbeat.live` or `www.playbeat.live`.
This prevents Digital's traffic appearing when both sites use one property.
Reporting ranges include today and use the GA4 property's timezone. Recent
events can still be processing. Monetary GA4 metrics use the property currency,
not a presumed PKR currency. GA4 purchase events are not order fulfillment data.
Connecting ChatGPT's GSC Wizard does not configure this application's server.

## Operational orders and paid revenue

PlayBeat.live currently broadcasts free channels. Its checked Worker checkout
and daily-report routes return “service is not configured”. This change does
not count PlayBeat Digital orders as PlayBeat.live orders or invent a checkout.

When a real commerce reporting service is available, configure
`PLAYBEAT_LIVE_COMMERCE_ENDPOINT` and the server-only
`PLAYBEAT_LIVE_REPORT_TOKEN`. The server makes a GET with `?days=1|7|14|30|90`
and `Authorization: Bearer <token>`. Only HTTPS on `playbeat.live` or
`www.playbeat.live` is allowed; redirects are refused so the token cannot be
forwarded to a different service. The reporting endpoint must enforce its own
read-only token and return this schema for that exact period, including today:

```json
{
  "schemaVersion": 1,
  "site": "playbeat.live",
  "days": 7,
  "orderCount": 2,
  "paidRevenueByCurrency": [{ "currency": "PKR", "amount": 1200 }],
  "recentOrders": [
    { "id": "example-order", "status": "paid", "total": 1200,
      "currency": "PKR", "createdAt": "2026-10-09T08:00:00Z" }
  ]
}
```

The example is a contract illustration, not seeded data. `orderCount` counts
orders in the requested period, `paidRevenueByCurrency` totals completed paid
orders in that period per currency, and `recentOrders` lists newest orders
first. Return empty arrays / zero counts only after successfully querying the
authoritative order store. Do not combine different currencies into one total.

## API and access

- `GET /api/admin/playbeat-live?days=7` requires an admin session and the
  `analytics` permission. IT-scoped staff remain blocked. Operational commerce
  data additionally requires the `orders` or `payments` permission.
- `PUT /api/admin/playbeat-live/config` with `{ "propertyId": "123456789" }`
  requires a super admin. Property selection is stored in `site_integrations`.
- Browser responses are `private, no-store`; server report results cache for
  up to 60 seconds to limit API calls. Failed connections remain independent
  so a Google outage does not hide the public catalogue.
- Secrets and provider response bodies never appear in browser responses.

Validation: `npm run test:playbeat-live`, `npm run lint`, `npm run build`.
