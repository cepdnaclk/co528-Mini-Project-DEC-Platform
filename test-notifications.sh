#!/bin/bash
set -e

echo "Logging in as admin..."
LOGIN_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decp.app","password":"secret123"}')

TOKEN=$(echo $LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RES | grep -o '"userId":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Response: $LOGIN_RES"
  exit 1
fi

echo "Token: $TOKEN"
echo "UserId: $USER_ID"

echo "Creating a post to trigger a notification..."
POST_RES=$(curl -s -X POST http://localhost:8082/api/v1/feed/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret" \
  -d '{"content":"Notification Test Post","mediaUrls":[]}')

POST_ID=$(echo $POST_RES | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$POST_ID" ]; then
  echo "Post creation failed. Response: $POST_RES"
  exit 1
fi
echo "Created Post ID: $POST_ID"

echo "Registering a second user to like the post..."
USER2_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"liker@decp.app","password":"password123","role":"alumni","name":"Liker Profile"}') || true

USER2_TOKEN=$(echo $USER2_RES | jq -r '.data.accessToken')
if [ "$USER2_TOKEN" == "null" ]; then
  USER2_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"liker@decp.app","password":"password123"}')
  USER2_TOKEN=$(echo $USER2_RES | jq -r '.data.accessToken')
fi
USER2_ID=$(echo $USER2_RES | jq -r '.data.userId')

echo "Liking post as the second user..."
curl -s -X POST http://localhost:8082/api/v1/feed/posts/$POST_ID/like \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "x-user-id: $USER2_ID" \
  -H "x-internal-token: dev-secret"

echo "Waiting for Pub/Sub delivery..."
sleep 5

echo "Fetching notifications for admin..."
curl -s -X GET http://localhost:8082/api/v1/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-internal-token: dev-secret" | jq .

echo "Done."
