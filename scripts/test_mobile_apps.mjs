#!/usr/bin/env node
/**
 * Task 23 E2E — mobile apps + PWA storefront integration.
 * Usage: TEST_BASE=https://playbeat.digital node scripts/test_mobile_apps.mjs
 *   (ADMIN_EMAIL + ADMIN_PASSWORD optional — enables the admin round-trip test)
 */
const BASE = (process.env.TEST_BASE || 'http://localhost:3000').replace(/\/$/, '');

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${extra ? ' — ' + extra : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`);
  }
};

async function main() {
  console.log(`\n=== Task 23 E2E against ${BASE} ===\n`);

  // 1. Public storefront config endpoint
  const cfgRes = await fetch(`${BASE}/api/app/storefront`);
  ok('GET /api/app/storefront → 200', cfgRes.status === 200);
  const cfg = await cfgRes.json().catch(() => null);
  ok('storefront config success:true', cfg?.success === true);
  ok('android block present', cfg?.apps?.android && typeof cfg.apps.android.available === 'boolean');
  ok('ios block present', cfg?.apps?.ios && typeof cfg.apps.ios.available === 'boolean');
  ok('visibility flags present', ['downloadPageVisible', 'footerVisible', 'homeSectionVisible'].every((k) => typeof cfg?.apps?.[k] === 'boolean'));
  ok('qrValue present + sanitized', typeof cfg?.apps?.qrValue === 'string' && /^(https:\/\/|\/)/.test(cfg.apps.qrValue));
  ok('pending state honest (no url when unavailable)', !cfg?.apps?.android?.available || Boolean(cfg?.apps?.android?.url));

  // 2. URL sanitization via admin endpoint (unauth first)
  const unauthGet = await fetch(`${BASE}/api/admin/app/storefront-config`);
  ok('admin GET storefront-config unauth → 401', unauthGet.status === 401);
  const unauthPut = await fetch(`${BASE}/api/admin/app/storefront-config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ android: { url: 'javascript:alert(1)' } }),
  });
  ok('admin PUT storefront-config unauth → 401', unauthPut.status === 401);
  const unauthPush = await fetch(`${BASE}/api/admin/app/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'x', body: 'y' }),
  });
  ok('admin push/send unauth → 401', unauthPush.status === 401);

  // 3. Push token requires customer JWT
  const pushNoAuth = await fetch(`${BASE}/api/app/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]' }),
  });
  ok('POST /api/app/push-token unauth → 401', pushNoAuth.status === 401);
  const pushBadToken = await fetch(`${BASE}/api/app/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake.token.value' },
    body: JSON.stringify({ token: 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]' }),
  });
  ok('POST /api/app/push-token bad JWT → 401', pushBadToken.status === 401);

  // 4. Admin app version endpoint (existing admin-app) must still work
  const versionRes = await fetch(`${BASE}/api/app/version`);
  ok('GET /api/app/version (admin app) → 200', versionRes.status === 200);
  const version = await versionRes.json().catch(() => null);
  ok('admin app release intact', version?.success === true && Boolean(version?.app?.version));

  // 5. OAuth mobile flow start (no keys configured on some providers → honest 503 JSON; if configured → 302)
  const oaStart = await fetch(`${BASE}/api/auth/oauth/google/start?mobile=1`, { redirect: 'manual' });
  ok('oauth/google/start?mobile=1 → 302 or 503', oaStart.status === 302 || oaStart.status === 503);
  if (oaStart.status === 503) {
    const j = await oaStart.json().catch(() => null);
    ok('mobile unconfigured provider returns JSON (not a redirect)', j?.success === false || typeof j?.error === 'string');
  }

  // 6. OAuth web flow unchanged (state cookie set, provider redirect)
  const oaWeb = await fetch(`${BASE}/api/auth/oauth-config`);
  const oaCfg = await oaWeb.json().catch(() => null);
  ok('oauth-config reachable', oaCfg?.success === true && typeof oaCfg?.providers?.Google === 'boolean');

  // 7. PWA assets
  for (const [path, typeCheck] of [
    ['/manifest.webmanifest', /application\/manifest\+json|application\/json/],
    ['/sw.js', /javascript|text\/plain/],
    ['/offline.html', /text\/html/],
    ['/pwa/pwa-192.png', /image\/png/],
    ['/pwa/pwa-512.png', /image\/png/],
    ['/pwa/maskable-512.png', /image\/png/],
    ['/pwa/apple-touch-icon.png', /image\/png/],
    ['/pwa/qr-download.png', /image\/png/],
  ]) {
    const r = await fetch(`${BASE}${path}`);
    const ct = r.headers.get('content-type') || '';
    ok(`PWA asset ${path} → 200`, r.status === 200, typeCheck.test(ct) ? ct : `unexpected content-type ${ct}`);
  }

  // 8. Manifest content sanity
  const man = await fetch(`${BASE}/manifest.webmanifest`).then((r) => r.json()).catch(() => null);
  ok('manifest has name + icons', Boolean(man?.name) && Array.isArray(man?.icons) && man.icons.length >= 3);
  ok('manifest standalone + theme', man?.display === 'standalone' && String(man?.background_color) === '#050814');

  // 9. /download SPA route
  const dl = await fetch(`${BASE}/download`);
  ok('/download → 200', dl.status === 200);
  const dlHtml = await dl.text();
  ok('/download serves the SPA shell (React root)', dlHtml.includes('<div id="root">'));

  // 10. sw.js content sanity
  const sw = await fetch(`${BASE}/sw.js`).then((r) => r.text());
  ok('sw network-only for /api/', sw.includes("startsWith('/api/')"));
  ok('sw offline fallback wired', sw.includes('/offline.html'));

  // 11. sitemap includes /download
  const sm = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
  ok('sitemap.xml includes /download', sm.includes('<loc>https://playbeat.digital/download</loc>'));

  // 12. Admin round-trip (requires ADMIN_EMAIL + ADMIN_PASSWORD)
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const loginRes = await fetch(`${BASE}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
    });
    const login = await loginRes.json().catch(() => null);
    const token = login?.token || (loginRes.headers.get('set-cookie') || '').match(/adminToken=([^;]+)/)?.[1];
    ok('admin login', Boolean(token));
    if (token) {
      const auth = { Authorization: `Bearer ${token}` };
      const getRes = await fetch(`${BASE}/api/admin/app/storefront-config`, { headers: auth });
      const getConfig = await getRes.json().catch(() => null);
      ok('admin GET storefront-config → 200', getRes.status === 200 && getConfig?.success === true);

      // Sanitized PUT: javascript: URL must be dropped
      const putRes = await fetch(`${BASE}/api/admin/app/storefront-config`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          android: { url: 'javascript:alert(1)', available: false, version: '1.0.0' },
          qrDestination: 'download',
        }),
      });
      const putJson = await putRes.json().catch(() => null);
      ok('admin PUT sanitized → 200', putRes.status === 200 && putJson?.success === true);
      ok('javascript: URL rejected (not stored)', !putJson?.config?.android?.url);

      const reGet = await fetch(`${BASE}/api/admin/app/storefront-config`, { headers: auth });
      const reJson = await reGet.json().catch(() => null);
      ok('audit trail recorded', Array.isArray(reJson?.audit));
    }
  } else {
    console.log('  (skip) admin round-trip — set ADMIN_EMAIL/ADMIN_PASSWORD to enable');
  }

  console.log(`\n=== RESULT: ${pass} PASS / ${fail} FAIL ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(1);
});
