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

echo "=== Research Service Tests ==="

LOGIN=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decp.app","password":"secret123"}')
TOKEN=$(echo $LOGIN | jq -r '.data.accessToken')
USER_ID=$(echo $LOGIN | jq -r '.data.userId')

echo "--- Create research project ---"
CREATE=$(curl -s -X POST $BASE/api/v1/research \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" -H "x-user-role: admin" -H "x-internal-token: dev-secret" \
  -d '{"title":"Deep Learning for NLP","description":"Applying transformers to Sinhala text","domain":"Machine Learning","tags":["NLP","AI","Sinhala"]}')
check "Create project succeeds" "$CREATE" '"success":true'
PROJECT_ID=$(echo $CREATE | jq -r '.data._id')
check "Project ID is returned" "$PROJECT_ID" "."

echo "--- List research projects ---"
LIST=$(curl -s -X GET "$BASE/api/v1/research" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" -H "x-internal-token: dev-secret")
check "List projects succeeds" "$LIST" '"success":true'
check "At least one project in list" "$LIST" '"_id"'

echo "--- Get project by ID ---"
GET=$(curl -s -X GET "$BASE/api/v1/research/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" -H "x-internal-token: dev-secret")
check "Get by ID succeeds" "$GET" '"success":true'
check "Correct project returned" "$GET" "Deep Learning for NLP"

echo "--- Join a research project (as second user) ---"
# Register or login as a student
STU=$(curl -s -X POST $BASE/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"researcher@decp.app","password":"pass1234","role":"student","name":"Researcher"}') || true
STU_TOKEN=$(echo $STU | jq -r '.data.accessToken')
if [ "$STU_TOKEN" == "null" ]; then
  STU=$(curl -s -X POST $BASE/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"researcher@decp.app","password":"pass1234"}')
  STU_TOKEN=$(echo $STU | jq -r '.data.accessToken')
fi
STU_ID=$(echo $STU | jq -r '.data.userId')

JOIN=$(curl -s -X POST "$BASE/api/v1/research/$PROJECT_ID/join" \
  -H "Authorization: Bearer $STU_TOKEN" \
  -H "x-user-id: $STU_ID" -H "x-internal-token: dev-secret")
check "Join project succeeds" "$JOIN" '"success":true'
check "Collaborator added" "$JOIN" '"collaboratorIds"'

echo "--- Filter by domain ---"
FILTER=$(curl -s -X GET "$BASE/api/v1/research?domain=Machine%20Learning" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" -H "x-internal-token: dev-secret")
check "Domain filter works" "$FILTER" '"success":true'

echo ""
echo "Research Service: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
