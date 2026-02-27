#!/bin/bash
set -e

echo "Logging in as admin..."
LOGIN_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decp.app","password":"secret123"}')

TOKEN=$(echo $LOGIN_RES | jq -r '.data.accessToken')
USER_ID=$(echo $LOGIN_RES | jq -r '.data.userId')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "Login failed. Response: $LOGIN_RES"
  exit 1
fi

echo "Creating an event..."
EVENT_RES=$(curl -s -X POST http://localhost:8082/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret" \
  -d '{"title":"Annual Tech Meetup","description":"Join us for a great tech meetup where we discuss the future!","location":"Main Hall","eventDate":"2026-10-15T10:00:00Z"}')

EVENT_ID=$(echo $EVENT_RES | jq -r '.data._id')

if [ -z "$EVENT_ID" ] || [ "$EVENT_ID" == "null" ]; then
  echo "Event creation failed. Response: $EVENT_RES"
  exit 1
fi

echo "Created Event ID: $EVENT_ID"

echo "Fetching events..."
curl -s -X GET http://localhost:8082/api/v1/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-internal-token: dev-secret" | jq .

echo "Registering a new participant..."
STU_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"participant1@decp.app","password":"studentpassword","role":"student","name":"Test Participant"}') || true
  
# If register fails (already exists), attempt to login
STU_TOKEN=$(echo $STU_RES | jq -r '.data.accessToken')
if [ "$STU_TOKEN" == "null" ]; then
  STU_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"participant1@decp.app","password":"studentpassword"}')
  STU_TOKEN=$(echo $STU_RES | jq -r '.data.accessToken')
fi
STU_ID=$(echo $STU_RES | jq -r '.data.userId')

echo "RSVPing for event..."
curl -s -X POST http://localhost:8082/api/v1/events/$EVENT_ID/rsvp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $STU_ID" \
  -H "x-user-role: student" \
  -H "x-internal-token: dev-secret"

echo "Fetching updated event..."
curl -s -X GET http://localhost:8082/api/v1/events/$EVENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-internal-token: dev-secret" | jq .

echo "Done."
