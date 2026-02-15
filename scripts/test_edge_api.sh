#!/usr/bin/env bash
set -u
set -o pipefail

BASE_URL="${BASE_URL:-}"
SERVICE_TOKEN="${SERVICE_TOKEN:-}"
CLAIM_TOKEN="${CLAIM_TOKEN:-${SERVICE_TOKEN}}"
PATCH_TOKEN="${PATCH_TOKEN:-${SERVICE_TOKEN}}"
HEARTBEAT_TOKEN="${HEARTBEAT_TOKEN:-${SERVICE_TOKEN}}"
RUN_LARGE_PAYLOAD_TEST="${RUN_LARGE_PAYLOAD_TEST:-0}"

if [ -z "$BASE_URL" ]; then
  echo "[FATAL] BASE_URL is required"
  echo "Example: BASE_URL=https://<project>.supabase.co/functions/v1/nightworker-prompts"
  exit 1
fi

PASS=0
FAIL=0
SKIP=0
LAST_STATUS=""
LAST_BODY=""

log() {
  echo "[$(date +"%H:%M:%S")] $*"
}

pass() {
  PASS=$((PASS+1))
  log "PASS: $*"
}

fail() {
  FAIL=$((FAIL+1))
  log "FAIL: $*"
}

skip() {
  SKIP=$((SKIP+1))
  log "SKIP: $*"
}

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

status_in() {
  local expected_csv="$1"
  local got="$2"
  IFS=',' read -r -a arr <<< "$expected_csv"
  for s in "${arr[@]}"; do
    if [ "$s" = "$got" ]; then
      return 0
    fi
  done
  return 1
}

assert_status() {
  local test_name="$1"
  local expected_csv="$2"
  if status_in "$expected_csv" "$LAST_STATUS"; then
    pass "$test_name (status=$LAST_STATUS)"
  else
    fail "$test_name (expected=$expected_csv got=$LAST_STATUS body=$LAST_BODY)"
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
if isinstance(val, (dict,list)):
    print(json.dumps(val))
elif val is None:
    print("")
else:
    print(str(val))
PY
}

gen_uuid() {
  python - <<'PY'
import uuid
print(uuid.uuid4())
PY
}

build_pipeline_body() {
  local pipeline_id="$1"
  local step="$2"
  local total="$3"
  python - "$pipeline_id" "$step" "$total" <<'PY'
import json,sys
pipeline_id=sys.argv[1]
step=int(sys.argv[2])
total=int(sys.argv[3])
body={
  "provider": "claude",
  "name": f"qa-pipeline-step{step}",
  "content": "validate input",
  "target_folder": "C:/code/tmp",
  "queue_stage": "prioritized",
  "pipeline_id": pipeline_id,
  "pipeline_step": step,
  "pipeline_total_steps": total,
  "pipeline_template_name": "QA Pipeline",
  "pipeline_config": {
    "template_version": 1,
    "steps": [
      {"provider":"claude","role":"validate","instruction":"{input}"},
      {"provider":"claude","role":"review","instruction":"prev={previous_result} input={input}"}
    ],
    "original_input": "hello world"
  }
}
print(json.dumps(body))
PY
}

log "Starting API contract tests against: $BASE_URL"

# 1) Health
http_request GET "/health"
assert_status "GET /health" "200"

# 2) Create simple prompt
SIMPLE_NAME="qa-simple-$(date +%s)"
SIMPLE_BODY=$(python - "$SIMPLE_NAME" <<'PY'
import json,sys
name=sys.argv[1]
print(json.dumps({
  "provider":"gemini",
  "name":name,
  "content":"hello from qa test",
  "target_folder":"C:/code/tmp"
}))
PY
)
http_request POST "/prompts" "$SIMPLE_BODY"
assert_status "POST /prompts valid" "200,201"
SIMPLE_ID=$(json_field "$LAST_BODY" "id")

if [ -n "$SIMPLE_ID" ]; then
  http_request GET "/prompts/$SIMPLE_ID"
  assert_status "GET /prompts/:id" "200"
else
  fail "Could not parse id from simple create response"
fi

# 3) Invalid provider
http_request POST "/prompts" '{"provider":"invalid","name":"bad","content":"x"}'
assert_status "POST /prompts invalid provider" "400"

# 4) Pipeline metadata without pipeline_id -> 400
http_request POST "/prompts" '{"provider":"claude","name":"bad-pipeline","content":"x","pipeline_step":1,"pipeline_total_steps":2}'
assert_status "POST /prompts pipeline without pipeline_id" "400"

# 5) Pipeline create + idempotent duplicate
PIPELINE_ID=$(gen_uuid)
PIPELINE_BODY=$(build_pipeline_body "$PIPELINE_ID" 1 2)
http_request POST "/prompts" "$PIPELINE_BODY"
assert_status "POST /prompts pipeline create step1" "200,201"
PIPELINE_STEP1_ID=$(json_field "$LAST_BODY" "id")

http_request POST "/prompts" "$PIPELINE_BODY"
assert_status "POST /prompts pipeline duplicate idempotent" "200"
IDEMPOTENT_FLAG=$(json_field "$LAST_BODY" "idempotent")
if [ "$IDEMPOTENT_FLAG" = "true" ]; then
  pass "Duplicate pipeline create returned idempotent=true"
else
  fail "Duplicate pipeline create did not return idempotent=true (body=$LAST_BODY)"
fi

# 6) Pipeline list filter
http_request GET "/prompts?pipeline_id=$PIPELINE_ID&limit=50"
assert_status "GET /prompts?pipeline_id" "200"

# 7) Invalid pipeline_id format
http_request GET "/prompts?pipeline_id=not-a-uuid"
assert_status "GET /prompts invalid pipeline_id" "400"

# 8) Move/reorder/edit for pending prompt if still pending
if [ -n "$SIMPLE_ID" ]; then
  http_request GET "/prompts/$SIMPLE_ID"
  SIMPLE_STATUS=$(json_field "$LAST_BODY" "status")
  if [ "$SIMPLE_STATUS" = "pending" ]; then
    http_request POST "/prompts/$SIMPLE_ID/move" '{"stage":"prioritized"}'
    assert_status "POST /prompts/:id/move pending->prioritized" "200"

    http_request POST "/prompts/reorder" "{\"ids\":[\"$SIMPLE_ID\"]}"
    assert_status "POST /prompts/reorder" "200"

    http_request POST "/prompts/$SIMPLE_ID/edit" '{"name":"qa-edited","content":"edited content","target_folder":"C:/code/new"}'
    assert_status "POST /prompts/:id/edit pending" "200"
  else
    skip "Skipping move/reorder/edit because prompt is no longer pending (status=$SIMPLE_STATUS)"
  fi
fi

# 9) Protected endpoints (optional if tokens provided)
if [ -n "$CLAIM_TOKEN" ]; then
  http_request POST "/claim" '{"provider":"claude","limit":2,"worker_id":"qa-api-script"}' "$CLAIM_TOKEN"
  assert_status "POST /claim with token" "200"
else
  skip "CLAIM_TOKEN/SERVICE_TOKEN not set; skipping authenticated claim test"
fi

if [ -n "$HEARTBEAT_TOKEN" ]; then
  http_request POST "/heartbeat" '{"provider":"claude","status":"active","worker_id":"qa-api-script"}' "$HEARTBEAT_TOKEN"
  assert_status "POST /heartbeat with token" "200"
else
  skip "HEARTBEAT_TOKEN/SERVICE_TOKEN not set; skipping heartbeat test"
fi

if [ -n "$PATCH_TOKEN" ] && [ -n "$SIMPLE_ID" ]; then
  http_request PATCH "/prompts/$SIMPLE_ID" '{"status":"done","result_content":"ok from api test","attempts":1,"event_type":"done","event_message":"qa"}' "$PATCH_TOKEN"
  if status_in "200,204" "$LAST_STATUS"; then
    pass "PATCH /prompts/:id with patch token"
  else
    fail "PATCH /prompts/:id with patch token (expected 200/204 got=$LAST_STATUS body=$LAST_BODY)"
  fi
else
  skip "PATCH_TOKEN/SERVICE_TOKEN not set or SIMPLE_ID missing; skipping patch success test"
fi

# 10) Reprocess from terminal if available
if [ -n "$SIMPLE_ID" ]; then
  http_request GET "/prompts/$SIMPLE_ID"
  SIMPLE_STATUS=$(json_field "$LAST_BODY" "status")
  if [ "$SIMPLE_STATUS" = "done" ] || [ "$SIMPLE_STATUS" = "failed" ]; then
    http_request POST "/prompts/$SIMPLE_ID/reprocess" '{}'
    assert_status "POST /prompts/:id/reprocess terminal" "200,201"
  else
    skip "Skipping reprocess; prompt not terminal (status=$SIMPLE_STATUS)"
  fi
fi

# 11) Large payload check (optional)
if [ "$RUN_LARGE_PAYLOAD_TEST" = "1" ]; then
  LARGE_BODY=$(python - <<'PY'
import json
content='x'*(1024*1024 + 200)
print(json.dumps({"provider":"claude","name":"qa-large","content":content}))
PY
)
  http_request POST "/prompts" "$LARGE_BODY"
  assert_status "POST /prompts payload >1MB" "413"
else
  skip "RUN_LARGE_PAYLOAD_TEST!=1; skipping >1MB payload test"
fi

log "Summary: PASS=$PASS FAIL=$FAIL SKIP=$SKIP"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
