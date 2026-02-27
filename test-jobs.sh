#!/bin/bash
set -e

echo "Logging in as admin..."
LOGIN_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@decp.app","password":"secret123"}')

TOKEN=$(echo $LOGIN_RES | jq -r '.data.accessToken')
USER_ID=$(echo $LOGIN_RES | jq -r '.data.userId')

if [ -z "$TOKEN" ]; then
  echo "Login failed. Response: $LOGIN_RES"
  exit 1
fi

echo "Creating a job..."
JOB_RES=$(curl -s -X POST http://localhost:8082/api/v1/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret" \
  -d '{"title":"Software Engineer Intern","company":"Tech Corp","location":"Remote","type":"internship","description":"Looking for a great intern to build things.","requirements":["Node.js","React"]}')

JOB_ID=$(echo $JOB_RES | jq -r '.data._id')

if [ -z "$JOB_ID" ]; then
  echo "Job creation failed. Response: $JOB_RES"
  exit 1
fi

echo "Created Job ID: $JOB_ID"

echo "Fetching jobs..."
curl -s -X GET http://localhost:8082/api/v1/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-internal-token: dev-secret" | jq .

echo "Liking/Applying context requires student role. Registering a student..."
STU_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@decp.app","password":"studentpassword","role":"student","name":"Test Student"}') || true

STU_TOKEN=$(echo $STU_RES | jq -r '.data.accessToken')
if [ "$STU_TOKEN" == "null" ]; then
  STU_RES=$(curl -s -X POST http://localhost:8082/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"student1@decp.app","password":"studentpassword"}')
  STU_TOKEN=$(echo $STU_RES | jq -r '.data.accessToken')
fi
STU_ID=$(echo $STU_RES | jq -r '.data.userId')

echo "Applying for job..."
curl -s -X POST http://localhost:8082/api/v1/jobs/$JOB_ID/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STU_TOKEN" \
  -H "x-user-id: $STU_ID" \
  -H "x-user-role: student" \
  -H "x-internal-token: dev-secret" \
  -d '{"coverLetter":"I am very interested in this internship. Here is my cover letter detailing why I am a great fit.","cvUrl":"https://example.com/cv.pdf"}'

echo "Fetching applications as admin..."
curl -s -X GET http://localhost:8082/api/v1/jobs/$JOB_ID/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-user-id: $USER_ID" \
  -H "x-user-role: admin" \
  -H "x-internal-token: dev-secret" | jq .

echo "Done."
