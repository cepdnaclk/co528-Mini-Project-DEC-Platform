#!/bin/bash
set -e
BASE="http://localhost:8082"
PASS=0; FAIL=0

check() {
  local label="$1"
  local result="$2"
  local expected="$3"
  if echo "$result" | grep -q "$expected"; then
    echo "  ✅ $label"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label — got: $result"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Analytics Service Tests ==="

LOGIN=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decp.app","password":"secret123"}')
TOKEN=$(echo $LOGIN | jq -r '.data.accessToken')
USER_ID=$(echo $LOGIN | jq -r '.data.userId')

echo "--- Fetch current metrics (admin) ---"
METRICS=$(curl -s -X GET $BASE/api/v1/analytics/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret")
check "Metrics endpoint returns success" "$METRICS" '"success":true'
check "Data object present" "$METRICS" '"data"'

# Get current post count
BEFORE=$(echo $METRICS | jq -r '.data.totalPosts // 0')
echo "  📊 Current totalPosts: $BEFORE"

echo "--- Create a post to trigger pub/sub counter increment ---"
POST=$(curl -s -X POST $BASE/api/v1/feed/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" -H "x-user-role: admin" -H "x-internal-token: dev-secret" \
  -d '{"content":"Analytics counter test post","mediaUrls":[]}')
check "Post created for analytics test" "$POST" '"success":true'

echo "--- Waiting 12s for Pub/Sub delivery... ---"
sleep 12

echo "--- Re-fetch metrics to verify increment ---"
METRICS_AFTER=$(curl -s -X GET $BASE/api/v1/analytics/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret")
AFTER=$(echo $METRICS_AFTER | jq -r '.data.totalPosts // 0')
echo "  📊 Updated totalPosts: $AFTER"

if [ "$AFTER" -gt "$BEFORE" ] 2>/dev/null; then
  echo "  ✅ totalPosts incremented via Pub/Sub ($BEFORE → $AFTER)"
  PASS=$((PASS+1))
else
  echo "  ❌ totalPosts did NOT increment ($BEFORE → $AFTER)"
  FAIL=$((FAIL+1))
fi

echo "--- Non-admin should be forbidden ---"
REG=$(curl -s -X POST $BASE/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student_analytics@decp.app","password":"pass1234","role":"student","name":"Test Student"}') || true
STU_TOKEN=$(echo $REG | jq -r '.data.accessToken')
if [ "$STU_TOKEN" == "null" ]; then
  STU=$(curl -s -X POST $BASE/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"student_analytics@decp.app","password":"pass1234"}')
  STU_TOKEN=$(echo $STU | jq -r '.data.accessToken')
  STU_ID=$(echo $STU | jq -r '.data.userId')
else
  STU_ID=$(echo $REG | jq -r '.data.userId')
fi

FORBIDDEN=$(curl -s -X GET $BASE/api/v1/analytics/metrics \
  -H "Authorization: Bearer $STU_TOKEN" \
  -H "x-user-id: $STU_ID" -H "x-user-role: student" -H "x-internal-token: dev-secret")
check "Non-admin gets 403 Forbidden" "$FORBIDDEN" "Forbidden"

echo ""
echo "Analytics Service: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
