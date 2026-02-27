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

echo "=== User Service Tests ==="

# Register or login
REG=$(curl -s -X POST $BASE/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"usertest@decp.app","password":"pass1234","role":"alumni","name":"Test User"}') || true
TOKEN=$(echo $REG | jq -r '.data.accessToken')
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  LOGIN=$(curl -s -X POST $BASE/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"usertest@decp.app","password":"pass1234"}')
  TOKEN=$(echo $LOGIN | jq -r '.data.accessToken')
  USER_ID=$(echo $LOGIN | jq -r '.data.userId')
else
  USER_ID=$(echo $REG | jq -r '.data.userId')
fi
check "Auth returns token" "$TOKEN" "eyJ"
echo "  UserId: $USER_ID"

echo "--- GET /api/v1/users/me (auto-creates profile if missing) ---"
PROFILE=$(curl -s -X GET $BASE/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: alumni" \
  -H "x-internal-token: dev-secret")
check "Get /me succeeds" "$PROFILE" '"success":true'
check "Profile has _id field" "$PROFILE" '"_id"'

echo "--- PUT /api/v1/users/me (update bio and skills) ---"
UPDATE=$(curl -s -X PUT $BASE/api/v1/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: alumni" \
  -H "x-internal-token: dev-secret" \
  -d '{"bio":"I am a test user","skills":["Node.js","Docker"]}')
check "Update /me succeeds" "$UPDATE" '"success":true'
check "Bio is saved" "$UPDATE" "I am a test user"
check "Skills are saved" "$UPDATE" "Docker"

echo "--- GET /me again verifies persistence ---"
PROFILE2=$(curl -s -X GET $BASE/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: alumni" \
  -H "x-internal-token: dev-secret")
check "Updated bio persists" "$PROFILE2" "I am a test user"

echo "--- GET /users (admin only) ---"
ADMIN_LOGIN=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decp.app","password":"secret123"}')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.data.accessToken')
ADMIN_ID=$(echo $ADMIN_LOGIN | jq -r '.data.userId')

USERS=$(curl -s -X GET $BASE/api/v1/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "x-user-id: $ADMIN_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret")
check "Admin GET /users succeeds" "$USERS" '"success":true'
check "Users list has pagination" "$USERS" '"pagination"'

echo "--- Non-admin cannot list users ---"
FORBIDDEN=$(curl -s -X GET $BASE/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: alumni" \
  -H "x-internal-token: dev-secret")
check "Non-admin gets Forbidden" "$FORBIDDEN" "Forbidden"

echo ""
echo "User Service: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
