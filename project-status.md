# Project Status

## Infrastructure Mocking / Skipping
- **MongoDB**: Using a local Docker container (`docker-compose.yml`) instead of MongoDB Atlas. Will replace `MONGODB_URI` when Atlas credentials are ready.
- **GCP Project / Services**: GCP Cloud Run, Secret Manager, and real Pub/Sub are currently bypassed using Docker Compose local emulation. Ready to re-enable when GCP credentials are available.
- **GCP Pub/Sub**: Replaced by the official `gcr.io/google.com/cloudsdktool/cloud-sdk:emulators` Docker image running locally on port 8085. Push subscriptions point to internal container hostnames.
- **Cloudflare R2**: Blocked. Media upload endpoints return a mock URL for now.
- **Firebase / FCM**: Blocked. Push notifications are logged locally but not sent externally.

## Current Progress — All Backend Phases Complete ✅

| Phase | Status | Notes |
|---|---|---|
| 0 — Setup | ✅ Complete | Monorepo structure, Docker Compose, MongoDB container |
| 1 — Shared Patterns | ✅ Complete | `internalClient.js`, `pubsub.js`, standard Dockerfile |
| 2 — Auth Service | ✅ Complete | Register, login, JWT, refresh token |
| 3 — User Service | ✅ Complete | Profile get/update, admin role management |
| 4 — API Gateway | ✅ Complete | JWT validation, proxy to all services, port 8082 |
| 5 — Core Services | ✅ Complete | Feed, Jobs, Events — all with E2E test scripts |
| 6 — Secret Manager | ✅ Emulated | `docker-compose.env` simulates secrets |
| 7 — Cloud Run Deploy | ✅ Emulated | Full containerized local cluster via `docker-compose.yml` |
| 10 — Pub/Sub Setup | ✅ Complete | Emulator + `scripts/setup-pubsub.js` creates all topics & push subs |
| 11 — Secondary Services | ✅ Complete | Notification, Analytics, Research, Messaging |

## Running Services (Local Docker Cluster)

All 13 containers are running and healthy:

| Container | Port | Service |
|---|---|---|
| `decp-mongodb` | 27018 | MongoDB (shared) |
| `decp-pubsub` | 8085 | GCP Pub/Sub Emulator |
| `decp-auth` | 3001 | Authentication |
| `decp-user` | 3002 | User Profiles |
| `decp-feed` | 3003 | Social Feed (Posts, Likes, Comments) |
| `decp-jobs` | 3004 | Job Board |
| `decp-events` | 3005 | Events & RSVPs |
| `decp-messaging` | 3006 | 1:1 Messaging |
| `decp-notification` | 3007 | In-App Notifications (Pub/Sub driven) |
| `decp-analytics` | 3008 | Platform Metrics (Pub/Sub driven) |
| `decp-research` | 3009 | Research Projects |
| `decp-gateway` | 8082 (host) | API Gateway — single public entry point |

## E2E Test Scripts Available

| Script | Tests |
|---|---|
| `test-feed.sh` | Create post, like, comment, fetch feed |
| `test-jobs.sh` | Post job, search, apply |
| `test-events.sh` | Create event, RSVP, fetch |
| `test-notifications.sh` | Like → Pub/Sub → Notification delivery |

## What's Remaining (Production Deployment)

1. **GCP Credentials**: Provide a service account JSON to unlock Secret Manager and real Cloud Run deployments.
2. **MongoDB Atlas URI**: Replace local `mongodb://mongodb:27017` with Atlas connection string.
3. **Client Development**: Next.js web app and Flutter mobile app against the stable API.
4. **Mentorship Matching**: Alumni ↔ Student pairing algorithm in the User/Research services.
