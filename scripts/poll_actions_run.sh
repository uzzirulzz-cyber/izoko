#!/usr/bin/env bash
# Poll the GitHub Actions deploy run for a given commit SHA until completion.
# Token is extracted from the git remote URL — never printed.
set -u
SHA="${1:?usage: poll_actions_run.sh <full-sha>}"
REPO="uzzirulzz-cyber/izoko"
TOKEN=$(git remote get-url origin | sed -n 's|https://[^@]*@\|https://\([^/]*\)@.*|\1|p')
TOKEN=$(git remote get-url origin | sed -E 's#https://(.+)@github.com.*#\1#')
if [ -z "$TOKEN" ]; then echo "no token in remote"; exit 1; fi

echo "Polling deploy run for $SHA ..."
for i in $(seq 1 120); do
  RESP=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.github.com/repos/$REPO/actions/runs?head_sha=$SHA&per_page=5")
  RUN=$(echo "$RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
runs=d.get('workflow_runs',[])
dep=[r for r in runs if r['name'].lower().startswith('deploy')]
print(json.dumps(dep[0]) if dep else 'null')
" 2>/dev/null)
  if [ "$RUN" != "null" ] && [ -n "$RUN" ]; then
    RID=$(echo "$RUN" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
    STATUS=$(echo "$RUN" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])")
    CONCL=$(echo "$RUN" | python3 -c "import sys,json;print(json.load(sys.stdin)['conclusion'])")
    echo "[$i] run $RID status=$STATUS conclusion=$CONCL"
    if [ "$STATUS" = "completed" ]; then
      # job-level detail
      curl -s -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/$REPO/actions/runs/$RID/jobs" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for j in d.get('jobs',[]):
    print(f\"  job {j['name']}: {j['status']} / {j['conclusion']}\")
"
      if [ "$CONCL" = "success" ]; then echo "DEPLOY SUCCESS"; exit 0
      else echo "DEPLOY FAILED"; exit 1; fi
    fi
  else
    echo "[$i] waiting for run to appear..."
  fi
  sleep 15
done
echo "TIMEOUT waiting for deploy"
exit 2
