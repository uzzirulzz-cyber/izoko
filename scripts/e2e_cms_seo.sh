#!/usr/bin/env bash
# =============================================================================
# E2E verification — Product CMS + SEO Control Center (playbeat.digital)
# Covers: admin login, SEO dashboard API, product create (publish + draft),
# SEO persistence, public catalog visibility rules, redirect manager,
# merchant feed, media upload, 413 base64 wall, sitemap/robots, storefront.
# =============================================================================
set -u
BASE="https://playbeat.digital"
TS=$(date +%s)
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1"; }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 (got $2, want $3)"; fi; }
contains(){ if echo "$2" | grep -q "$3"; then ok "$1"; else bad "$1 — missing: $3"; fi; }

echo "=== 1. Admin login ==="
LOGIN=$(curl -s -X POST "$BASE/api/auth/admin/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@playbeat.digital","password":"playbeat1122"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token') or d.get('admin',{}).get('token',''))" 2>/dev/null)
AUTH="Authorization: Bearer $TOKEN"
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then ok "admin token acquired"; else bad "admin login failed: $LOGIN"; exit 1; fi

echo "=== 2. SEO Control Center API (GET /api/admin/seo) ==="
SEO=$(curl -s "$BASE/api/admin/seo" -H "$AUTH")
contains "seo overview has productRows" "$SEO" '"productRows"'
contains "seo overview has merchant" "$SEO" '"merchant"'
contains "seo overview has duplicateDescriptions" "$SEO" '"duplicateDescriptions"'

echo "=== 3. CREATE published product (no image) ==="
CREATE=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/admin/products" -H "$AUTH" -H 'Content-Type: application/json' -d "{
  \"name\":\"CMS Test Product $TS\",
  \"price\":1999,
  \"sku\":\"CMS-$TS\",
  \"category\":\"Streaming\",
  \"description\":\"E2E CMS verification product with real description content.\",
  \"cmsStatus\":\"published\",
  \"brand\":\"TestBrand\",
  \"seo\":{\"title\":\"CMS Test $TS — Premium Plan\",\"description\":\"Unique meta description for the CMS E2E product $TS with enough length to be realistic.\",\"index\":true,\"focusKeyword\":\"cms test\"}
}")
CREATE_CODE=$(echo "$CREATE" | tail -1); CREATE_BODY=$(echo "$CREATE" | sed '$d')
check "create published product" "$CREATE_CODE" "201"
PID=$(echo "$CREATE_BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['product']['_id'])" 2>/dev/null)
CSLUG=$(echo "$CREATE_BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['product']['slug'])" 2>/dev/null)
contains "create returns DB product with seo.title" "$CREATE_BODY" "CMS Test $TS — Premium Plan"
contains "create persists brand" "$CREATE_BODY" "TestBrand"

echo "=== 4. CREATE draft product (no price) ==="
DRAFT=$(curl -s -w '\n%{http_code}' -X POST "$BASE/api/admin/products" -H "$AUTH" -H 'Content-Type: application/json' -d "{
  \"name\":\"CMS Draft $TS\",\"category\":\"Streaming\",\"cmsStatus\":\"draft\",\"description\":\"Draft draft.\"
}")
DRAFT_CODE=$(echo "$DRAFT" | tail -1); DRAFT_BODY=$(echo "$DRAFT" | sed '$d')
check "draft create without price" "$DRAFT_CODE" "201"
DRAFT_ID=$(echo "$DRAFT_BODY" | python3 -c "import sys,json;print(json.load(sys.stdin)['product']['_id'])" 2>/dev/null)
contains "draft stored as draft" "$DRAFT_BODY" '"cmsStatus": *"draft"'

echo "=== 5. EDIT (PUT) published product — SEO update + galleryMeta ==="
EDIT=$(curl -s -w '\n%{http_code}' -X PUT "$BASE/api/admin/products/$PID" -H "$AUTH" -H 'Content-Type: application/json' -d "{
  \"seo\":{\"title\":\"CMS Test $TS — Updated Title\",\"description\":\"Updated meta description for $TS.\",\"index\":true},
  \"galleryMeta\":[{\"url\":\"/playbeat-logo.png\",\"alt\":\"Logo alt text $TS\",\"title\":\"Logo title\"}],
  \"costPrice\":900,\"backorder\":\"allow\"
}")
EDIT_CODE=$(echo "$EDIT" | tail -1); EDIT_BODY=$(echo "$EDIT" | sed '$d')
check "edit product" "$EDIT_CODE" "200"
contains "PUT persists seo.title" "$EDIT_BODY" "Updated Title"
contains "PUT persists galleryMeta alt" "$EDIT_BODY" "Logo alt text $TS"
contains "PUT persists costPrice" "$EDIT_BODY" '"costPrice": *900'

echo "=== 6. Public catalog visibility ==="
PUB=$(curl -s "$BASE/api/products?limit=300")
contains "published product visible publicly" "$PUB" "CMS Test Product $TS"
if echo "$PUB" | grep -q "CMS Draft $TS"; then bad "draft LEAKED into public catalog"; else ok "draft hidden from public catalog"; fi
ONE=$(curl -s "$BASE/api/products/$CSLUG")
contains "public product detail has seo" "$ONE" '"seo"'
contains "public product detail exposes cms fields" "$ONE" "TestBrand"

echo "=== 7. Redirect manager ==="
curl -s -X POST "$BASE/api/admin/seo" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"action\":\"redirect-add\",\"source\":\"/cms-old-url-$TS\",\"destination\":\"/streaming/$CSLUG\"}" > /dev/null
RED=$(curl -s "$BASE/api/products?pbRedirect=/cms-old-url-$TS")
contains "redirect resolves" "$RED" '"/streaming/'"$CSLUG"'"'
RDLIST=$(curl -s -X POST "$BASE/api/admin/seo" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"redirects-list"}')
contains "redirects-list includes entry" "$RDLIST" "/cms-old-url-$TS"

echo "=== 8. Merchant feed ==="
FEED=$(curl -s "$BASE/api/products?pbFeed=google")
contains "merchant feed is RSS" "$FEED" 'xmlns:g="http://base.google.com/ns/1.0"'
contains "feed contains published product" "$FEED" "CMS Test Product $TS"
if echo "$FEED" | grep -q "CMS Draft $TS"; then bad "draft LEAKED into merchant feed"; else ok "draft excluded from merchant feed"; fi

echo "=== 9. Media upload (image pipeline) ==="
PNG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
MEDIA=$(curl -s -X POST "$BASE/api/admin/media" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"dataUrl\":\"$PNG\",\"filename\":\"cms-e2e-$TS.png\",\"purpose\":\"product\"}")
MEDIA_URL=$(echo "$MEDIA" | python3 -c "import sys,json;print(json.load(sys.stdin).get('url',''))" 2>/dev/null)
if [ -n "$MEDIA_URL" ]; then ok "media upload returned URL: $MEDIA_URL"; else bad "media upload failed: $MEDIA"; fi
if [ -n "$MEDIA_URL" ]; then
  MCODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$MEDIA_URL")
  check "media URL publicly served" "$MCODE" "200"
fi

echo "=== 10. Base64 wall (413) still enforced ==="
B64=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/products" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Base64 Wall $TS\",\"price\":10,\"image\":\"$PNG\"}")
check "base64 product rejected" "$B64" "413"

echo "=== 11. Sitemap / robots / storefront regression ==="
SCODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/sitemap.xml"); check "sitemap.xml" "$SCODE" "200"
SPCODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/sitemap-products.xml"); check "sitemap-products.xml" "$SPCODE" "200"
SITEMAP=$(curl -s "$BASE/sitemap-products.xml")
if [ -n "$CSLUG" ]; then
  if echo "$SITEMAP" | grep -q "$CSLUG"; then ok "published product in sitemap"; else bad "published product MISSING from sitemap"; fi
fi
RBCODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/robots.txt"); check "robots.txt" "$RBCODE" "200"
HOME=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/"); check "storefront homepage" "$HOME" "200"
PROD=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/product/$CSLUG"); check "product deep-link URL" "$PROD" "200"
CAT=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/streaming"); check "category page" "$CAT" "200"

echo "=== 12. GSC honest status ==="
GSC=$(curl -s -X POST "$BASE/api/admin/seo" -H "$AUTH" -H 'Content-Type: application/json' -d '{"action":"gsc-status"}')
contains "gsc status reports configuration" "$GSC" '"configured"'

echo "=== 13. Cleanup ==="
for ID in "$PID" "$DRAFT_ID"; do
  [ -n "$ID" ] && DC=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/admin/products/$ID" -H "$AUTH")
  [ -n "$ID" ] && check "delete test product $ID" "$DC" "200"
done
RDID=$(echo "$RDLIST" | python3 -c "import sys,json;d=json.load(sys.stdin);print([r['id'] for r in d.get('redirects',[]) if r['source']=='/cms-old-url-$TS'][0])" 2>/dev/null)
if [ -n "$RDID" ]; then
  RDC=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/admin/seo" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"action\":\"redirect-delete\",\"id\":\"$RDID\"}")
  check "delete test redirect" "$RDC" "200"
fi

echo ""
echo "======================================"
echo "RESULT: $PASS PASS / $FAIL FAIL"
echo "======================================"
