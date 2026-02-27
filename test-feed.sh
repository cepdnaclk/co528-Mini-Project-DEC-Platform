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

echo "Creating a post..."
POST_RES=$(curl -s -X POST http://localhost:8082/api/v1/feed/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret" \
  -d '{"content":"Hello world from bash script!","mediaUrls":[]}')

POST_ID=$(echo $POST_RES | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$POST_ID" ]; then
  echo "Post creation failed. Response: $POST_RES"
  exit 1
fi

echo "Created Post ID: $POST_ID"

echo "Liking post..."
curl -s -X POST http://localhost:8082/api/v1/feed/posts/$POST_ID/like \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-internal-token: dev-secret"

echo "Adding comment..."
curl -s -X POST http://localhost:8082/api/v1/feed/posts/$POST_ID/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-internal-token: dev-secret" \
  -d '{"content":"First comment!"}'

echo "Fetching feed..."
curl -s -X GET http://localhost:8082/api/v1/feed/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-internal-token: dev-secret" | jq .

echo "Done."
