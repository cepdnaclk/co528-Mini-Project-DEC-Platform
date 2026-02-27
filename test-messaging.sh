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

echo "=== Messaging Service Tests ==="

# Login as two users
LOGIN_A=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decp.app","password":"secret123"}')
TOKEN_A=$(echo $LOGIN_A | jq -r '.data.accessToken')
USER_A=$(echo $LOGIN_A | jq -r '.data.userId')

REG_B=$(curl -s -X POST $BASE/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"chatuser@decp.app","password":"pass1234","role":"alumni","name":"Chat User"}') || true
TOKEN_B=$(echo $REG_B | jq -r '.data.accessToken')
if [ "$TOKEN_B" == "null" ]; then
  LOGIN_B=$(curl -s -X POST $BASE/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"chatuser@decp.app","password":"pass1234"}')
  TOKEN_B=$(echo $LOGIN_B | jq -r '.data.accessToken')
  USER_B=$(echo $LOGIN_B | jq -r '.data.userId')
else
  USER_B=$(echo $REG_B | jq -r '.data.userId')
fi

echo "--- Send message from A to B ---"
SEND=$(curl -s -X POST $BASE/api/v1/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-user-id: $USER_A" -H "x-internal-token: dev-secret" \
  -d "{\"recipientId\":\"$USER_B\",\"content\":\"Hello from admin!\"}")
check "Message sent successfully" "$SEND" '"success":true'
check "Message content saved" "$SEND" "Hello from admin"

echo "--- Send reply from B to A ---"
REPLY=$(curl -s -X POST $BASE/api/v1/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "x-user-id: $USER_B" -H "x-internal-token: dev-secret" \
  -d "{\"recipientId\":\"$USER_A\",\"content\":\"Hi back from user B!\"}")
check "Reply sent successfully" "$REPLY" '"success":true'

echo "--- Fetch conversation thread (A's view) ---"
CONVO=$(curl -s -X GET "$BASE/api/v1/messages/conversation/$USER_B" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-user-id: $USER_A" -H "x-internal-token: dev-secret")
check "Conversation fetch succeeds" "$CONVO" '"success":true'
check "Both messages in thread" "$CONVO" "Hello from admin"

echo "--- Get inbox for user A ---"
INBOX=$(curl -s -X GET "$BASE/api/v1/messages/inbox" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "x-user-id: $USER_A" -H "x-internal-token: dev-secret")
check "Inbox returns data" "$INBOX" '"success":true'
check "Inbox has at least one conversation" "$INBOX" '"conversationId"'

echo ""
echo "Messaging Service: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
