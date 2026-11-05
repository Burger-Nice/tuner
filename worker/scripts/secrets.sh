#!/usr/bin/env bash
# The Worker's secrets (design/ui-v1/accounts-v1/SPEC.md 7.2, with review 3's S6): PEPPER and TOKEN_SECRET made once,
# OWNER_CODE put once when the repository secret has one. Fails closed and prints no value (CI logs are public).
# Needs HOST (the Worker's https origin), CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment, and runs
# in worker/. WRANGLER overrides the command (the tests use a fake).
set -euo pipefail; set +x
: "${HOST:?HOST must be the https origin of the Worker}"
WR="${WRANGLER:-npx wrangler}"
list=$($WR secret list --format json)
echo "$list" | jq -e 'type == "array"' > /dev/null || { echo "secret list did not answer a JSON list: touching nothing"; exit 1; }
have=$(echo "$list" | jq -r '.[].name')
ready=""
for i in $(seq 1 18); do
  if out=$(curl -fsS --max-time 10 "$HOST/v1/health"); then ready=$(echo "$out" | jq -r '.ready'); break; fi
  [ -n "${FAST:-}" ] && break; sleep 10   # (a brand-new workers.dev host can take minutes to answer)
done
[ "$ready" = "true" ] || [ "$ready" = "false" ] || { echo "the Worker's health didn't answer: touching nothing"; exit 1; }
for name in PEPPER TOKEN_SECRET; do
  if ! grep -qx "$name" <<< "$have"; then
    [ "$ready" = "true" ] && { echo "health says ready but $name is missing: refusing to touch secrets"; exit 1; }
    openssl rand -base64 32 | tr -d '\n' | $WR secret put "$name" > /dev/null
    echo "made $name"
  fi
done
if ! grep -qx OWNER_CODE <<< "$have"; then
  if [ -n "${AIRGLOW_OWNER_CODE:-}" ]; then printf '%s' "$AIRGLOW_OWNER_CODE" | $WR secret put OWNER_CODE > /dev/null; echo "put OWNER_CODE"; else echo "no AIRGLOW_OWNER_CODE: skipped"; fi
fi
