#!/usr/bin/env bash
set -u
set -o pipefail

BASE_URL="${BASE_URL:-}"
INVALID_TOKEN="${INVALID_TOKEN:-totally-invalid-token}"
TOKEN_NO_PATCH="${TOKEN_NO_PATCH:-}"
TOKEN_NO_CLAIM="${TOKEN_NO_CLAIM:-}"
TOKEN_NO_HEARTBEAT="${TOKEN_NO_HEARTBEAT:-}"
EXPIRED_OR_REVOKED_TOKEN="${EXPIRED_OR_REVOKED_TOKEN:-}"

if [ -z "$BASE_URL" ]; then
  echo "[FATAL] BASE_URL is required"
  exit 1
fi

PASS=0
FAIL=0
SKIP=0
LAST_STATUS=""
LAST_BODY=""

log() { echo "[$(date +"%H:%M:%S")] $*"; }
pass() { PASS=$((PASS+1)); log "PASS: $*"; }
fail() { FAIL=$((FAIL+1)); log "FAIL: $*"; }
skip() { SKIP=$((SKIP+1)); log "SKIP: $*"; }

http_request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local token="${4:-}"
  local url="${BASE_URL%/}${path}"
  local tmp
  tmp=$(mktemp)

  local -a args
  args=(-sS -o "$tmp" -w "%{http_code}" -X "$method" "$url")
  if [ -n "$token" ]; then
    args+=( -H "Authorization: Bearer $token" )
  fi
  if [ -n "$body" ]; then
    args+=( -H "Content-Type: application/json" --data "$body" )
  fi

  LAST_STATUS=$(curl "${args[@]}")
  LAST_BODY=$(cat "$tmp")
  rm -f "$tmp"
}

assert_status() {
  local test_name="$1"
  local expected="$2"
  if [ "$LAST_STATUS" = "$expected" ]; then
    pass "$test_name (status=$LAST_STATUS)"
  else
    fail "$test_name (expected=$expected got=$LAST_STATUS body=$LAST_BODY)"
  fi
}

json_field() {
  local json="$1"
  local field="$2"
  python - "$json" "$field" <<'PY'
import json,sys
text=sys.argv[1]
field=sys.argv[2]
try:
    obj=json.loads(text)
except Exception:
    print("")
    raise SystemExit(0)
val=obj
for part in field.split('.'):
    if isinstance(val, dict) and part in val:
        val=val[part]
    else:
        print("")
        raise SystemExit(0)
if isinstance(val,(dict,list)):
    print(json.dumps(val))
elif val is None:
    print("")
else:
    print(str(val))
PY
}

log "Starting security tests against: $BASE_URL"

# Create one prompt publicly for security checks
NAME="qa-sec-$(date +%s)"
CREATE_BODY=$(python - "$NAME" <<'PY'
import json,sys
name=sys.argv[1]
print(json.dumps({
  "provider":"claude",
  "name":name,
  "content":"security baseline",
  "target_folder":"C:/code/tmp",
  "status":"done",
  "worker_id":"injected-worker"
}))
PY
)
http_request POST "/prompts" "$CREATE_BODY"
if [ "$LAST_STATUS" = "200" ] || [ "$LAST_STATUS" = "201" ]; then
  pass "POST /prompts public create works"
else
  fail "POST /prompts public create failed (status=$LAST_STATUS body=$LAST_BODY)"
fi
PROMPT_ID=$(json_field "$LAST_BODY" "id")

if [ -z "$PROMPT_ID" ]; then
  fail "Could not parse prompt id for security checks"
  log "Summary: PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
  exit 1
fi

# Validate injected fields did not force terminal status
http_request GET "/prompts/$PROMPT_ID"
if [ "$LAST_STATUS" = "200" ]; then
  status=$(json_field "$LAST_BODY" "status")
  worker_id=$(json_field "$LAST_BODY" "worker_id")
  if [ "$status" = "pending" ]; then
    pass "Create ignores injected status=done"
  else
    fail "Create did not enforce pending status (status=$status)"
  fi
  if [ -z "$worker_id" ]; then
    pass "Create ignores injected worker_id"
  else
    fail "Create persisted injected worker_id=$worker_id"
  fi
else
  fail "Could not fetch created prompt (status=$LAST_STATUS body=$LAST_BODY)"
fi

# Unauthorized protected routes
http_request PATCH "/prompts/$PROMPT_ID" '{"status":"done"}'
assert_status "PATCH without token" "403"

http_request POST "/claim" '{"provider":"claude","limit":1,"worker_id":"qa-sec"}'
assert_status "POST /claim without token" "403"

http_request POST "/heartbeat" '{"provider":"claude","status":"active","worker_id":"qa-sec"}'
assert_status "POST /heartbeat without token" "403"

http_request POST "/worker-tokens" '{"worker_name":"qa-sec","scopes":["claim"]}'
assert_status "POST /worker-tokens without service role" "403"

# Invalid token should also be forbidden
http_request PATCH "/prompts/$PROMPT_ID" '{"status":"done"}' "$INVALID_TOKEN"
assert_status "PATCH with invalid token" "403"

http_request POST "/claim" '{"provider":"claude","limit":1,"worker_id":"qa-sec"}' "$INVALID_TOKEN"
assert_status "CLAIM with invalid token" "403"

# Optional scope-negative checks with real tokens
if [ -n "$TOKEN_NO_PATCH" ]; then
  http_request PATCH "/prompts/$PROMPT_ID" '{"status":"done"}' "$TOKEN_NO_PATCH"
  assert_status "PATCH with token missing patch scope" "403"
else
  skip "TOKEN_NO_PATCH not provided"
fi

if [ -n "$TOKEN_NO_CLAIM" ]; then
  http_request POST "/claim" '{"provider":"claude","limit":1,"worker_id":"qa-sec"}' "$TOKEN_NO_CLAIM"
  assert_status "CLAIM with token missing claim scope" "403"
else
  skip "TOKEN_NO_CLAIM not provided"
fi

if [ -n "$TOKEN_NO_HEARTBEAT" ]; then
  http_request POST "/heartbeat" '{"provider":"claude","status":"active","worker_id":"qa-sec"}' "$TOKEN_NO_HEARTBEAT"
  assert_status "HEARTBEAT with token missing heartbeat scope" "403"
else
  skip "TOKEN_NO_HEARTBEAT not provided"
fi

if [ -n "$EXPIRED_OR_REVOKED_TOKEN" ]; then
  http_request POST "/claim" '{"provider":"claude","limit":1,"worker_id":"qa-sec"}' "$EXPIRED_OR_REVOKED_TOKEN"
  assert_status "CLAIM with expired/revoked token" "403"
else
  skip "EXPIRED_OR_REVOKED_TOKEN not provided"
fi

# Pipeline tampering
http_request POST "/prompts" '{"provider":"claude","name":"tamper","content":"x","pipeline_id":"11111111-1111-1111-1111-111111111111","pipeline_step":3,"pipeline_total_steps":2}'
assert_status "Pipeline tampering step>total" "400"

log "Summary: PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
