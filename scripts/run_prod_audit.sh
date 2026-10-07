#!/bin/bash
# run_prod_audit.sh — resume + finalize the full live SEO audit through the
# REAL production admin API (crawl-batch loop identical to the admin UI).
set -euo pipefail
API="https://playbeat.digital/api/admin/seo/audit"
TOKEN=$(cat /tmp/pb_admin_token)

post() { curl -s --max-time 120 -X POST "$API" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "$1"; }

RUNID="6ac5a102292a411f0b3b85a4"
BATCH=10
TOTAL=$(curl -s --max-time 60 "$API" -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys;print(json.load(sys.stdin).get('run',{}).get('totalUrls',111))")
echo "resuming run $RUNID ($TOTAL urls)"

echo ""
echo "== crawling =="
for i in $(seq 1 40); do
  B=$(post "{\"action\":\"crawl-batch\",\"runId\":\"$RUNID\",\"batchSize\":$BATCH}" || echo '{}')
  C=$(echo "$B" | python3 -c "import json,sys;print(json.load(sys.stdin).get('crawled'))" 2>/dev/null || echo "?")
  D=$(echo "$B" | python3 -c "import json,sys;print(json.load(sys.stdin).get('done'))" 2>/dev/null || echo "False")
  echo "  crawled $C/$TOTAL done=$D"
  if [ "$D" = "True" ]; then break; fi
done

echo ""
echo "== finalize =="
FIN=$(post "{\"action\":\"finalize\",\"runId\":\"$RUNID\"}")
echo "$FIN" > /tmp/audit_finalize.json
echo "$FIN" | python3 -c "
import json,sys
d = json.load(sys.stdin)
s = d.get('score') or {}
print('SCORE:', s.get('total'), '(partial)' if s.get('partial') else '(full)')
for b in s.get('breakdown') or []:
    print(f\"  {b.get('component')}: {b.get('earned')}/{b.get('weight')} - {b.get('basis')}\")
print('counts:', json.dumps((d.get('summary') or {}).get('counts')))
print('severity:', json.dumps((d.get('summary') or {}).get('severityCounts')))
print()
fs = d.get('findings') or []
print('open findings:', len(fs))
for f in fs[:20]:
    print(f\"  [{(f.get('severity') or '').upper()}] {(f.get('title') or '')[:90]} ({len(f.get('urls') or [])} urls)\")
"
echo ""
echo "DONE — run $RUNID stored in production DB"
