# Project Status

## Infrastructure Mocking / Skipping
- **MongoDB**: Using a local Docker container (`docker-compose.yml`) instead of MongoDB Atlas. Will replace `MONGODB_URI` when Atlas credentials are ready.
- **GCP Project / Services**: GCP Cloud Run, Secret Manager, and real Pub/Sub are currently bypassed using Docker Compose local emulation. Ready to re-enable when GCP credentials are available.
- **GCP Pub/Sub**: Replaced by the official `gcr.io/google.com/cloudsdktool/cloud-sdk:emulators` Docker image running locally on port 8085. Push subscriptions point to internal container hostnames.
- **Cloudflare R2**: ✅ **LIVE** — real Cloudflare R2 bucket `decp-media` is fully integrated. Presigned PUT URLs used for direct browser-to-R2 uploads.
- **Firebase / FCM**: Blocked. Push notifications are logged locally but not sent externally.

---

## Phase Progress

### Backend — All Phases Complete ✅

| Phase | Status | Notes |
|---|---|---|
| 0 — Setup | ✅ Complete | Monorepo structure, Docker Compose, MongoDB container |
| 1 — Shared Patterns | ✅ Complete | `internalClient.js`, `pubsub.js`, standard Dockerfile |
| 2 — Auth Service | ✅ Complete | Register, login, JWT access + refresh tokens, logout |
| 3 — User Service | ✅ Complete | Profile CRUD, avatar upload (R2), search, follow/unfollow, followers/following |
| 4 — API Gateway | ✅ Complete | JWT validation, CORS (port 3100), proxy to all services |
| 5 — Core Services | ✅ Complete | Feed (edit/delete/media), Jobs (search/apply/status), Events (RSVP/cancel) |
| 6 — Secret Manager | ✅ Emulated | `docker-compose.env` simulates secrets |
| 7 — Cloud Run Deploy | ✅ Emulated | Full containerized local cluster via `docker-compose.yml` |
| 10 — Pub/Sub Setup | ✅ Complete | Emulator + `scripts/setup-pubsub.js` creates all topics & push subs |
| 11 — Secondary Services | ✅ Complete | Notification, Analytics, Research, Messaging |
| 12 — Testing Suite | ✅ Complete | Full E2E test scripts passing for all services |
| 13 — Realtime Service | ✅ Complete | WebSockets (socket.io) for chat, typing indicators, presence, feed broadcast |
| 14 — Backend Enhancements | ✅ Complete | All gap endpoints implemented (see table below) |

### Backend Gap Endpoints Added (Phase 14)

| Service | Endpoint | Description |
|---|---|---|
| Messaging | `GET /unread-count` | Total unread message count |
| Messaging | `PUT /:id/read` | Mark message read + emit `message:read` |
| Messaging | `DELETE /:id` | Delete message (sender only) |
| Messaging | Inbox `unreadCount` | Per-conversation unread count via aggregation |
| User | `GET /search?q=` | Search users by name/bio |
| User | `POST /me/avatar` | R2 presigned URL for avatar upload |
| User | `PUT /me/avatar` | Confirm avatar URL to profile |
| User | `POST /:id/follow` | Follow a user |
| User | `DELETE /:id/follow` | Unfollow a user |
| User | `GET /:id/followers` | Get follower list |
| User | `GET /:id/following` | Get following list |
| Feed | `PUT /posts/:id` | Edit own post |
| Feed | `DELETE /posts/:id` | Delete own post + R2 cleanup |
| Feed | `GET /posts?authorId=` | Filter posts by author |
| Feed | `POST /media/upload-url` | Multi-file R2 presigned URLs (`count` param) |
| Jobs | `GET /?search=` | Text search on title/company/description |
| Jobs | `PUT /:id/applications/:appId` | Accept / reject application |
| Events | `GET /:id/attendees` | Get RSVP'd participant list |
| Events | `DELETE /:id/rsvp` | Cancel RSVP |
| Research | `PUT /:id` | Update project (title/description/status) |
| Research | `DELETE /:id/leave` | Leave a project |
| Notifications | `GET /unread-count` | Unread notification count |
| Notifications | `PUT /read-all` | Mark all notifications read |
| Realtime | Typing relay | `typing:start/stop` forwarded to recipient |
| Realtime | Presence | `user:online/offline` broadcast on connect/disconnect |
| Realtime | Broadcast mode | `/emit` without `userId` → `io.emit()` to all clients |

### Frontend — All Phases Complete ✅

| Phase | Status | Scope |
|---|---|---|
| 1 — Auth Infrastructure | ✅ Complete | Refresh token store, refresh interceptor, socket lifecycle, admin guard |
| 2 — Jobs Page | ✅ Complete | Apply modal (CV URL), Post Job, Manage Applications, type filter chips |
| 3 — Messages Page | ✅ Complete | Typing indicators, read receipts, presence dots, user search, message delete, inbox upsert |
| 4 — Feed Page | ✅ Complete | Comments, media upload (R2), edit/delete posts, cursor pagination, new-post pill |
| 5 — Remaining Pages | ✅ Complete | Notifications, Events, Research, Profile (avatar), other-user profile, nav badges |

### Frontend Features Implemented

| Page / Component | Features |
|---|---|
| `authStore.ts` | `refreshToken` field, updated `setAuth`, socket disconnect on logout |
| `api.ts` | Token refresh interceptor with request queue |
| `socket.ts` | `connectSocket`, `isUserOnline`, `onPresenceChange`, online user Set |
| `AppShell.tsx` | Live unread badges on Messages & Notifications nav items, socket reconnect |
| `admin/page.tsx` | Role guard — non-admin redirected to `/feed` |
| `jobs/page.tsx` | Apply modal, Post Job modal (alumni/admin), Manage Applications, type filters |
| `messages/page.tsx` | Typing indicators, double-tick read receipts, online presence, user search modal, message delete, auto-resize textarea |
| `feed/page.tsx` | Inline comments, R2 media upload with previews, edit/delete own posts, load more, new-post pill |
| `notifications/page.tsx` | Mark all read, click-to-navigate via `notification.link`, cursor pagination |
| `events/page.tsx` | RSVP / Cancel RSVP toggle, Create Event (admin), Event Detail modal |
| `research/page.tsx` | Create Project, join/leave, Project Detail modal, status update (creator) |
| `profile/page.tsx` | R2 avatar upload (optimistic preview), follower/following counts + expandable panel |
| `profile/[id]/page.tsx` | **NEW** — Other-user profile: follow/unfollow, their posts, message button |

---

## Running Services (Local Docker Cluster)

All 13 containers are running and healthy:

| Container | Port | Service |
|---|---|---|
| `decp-mongodb` | 27018 | MongoDB (shared) |
| `decp-pubsub` | 8085 | GCP Pub/Sub Emulator |
| `decp-auth` | 3001 | Authentication |
| `decp-user` | 3002 | User Profiles |
| `decp-feed` | 3003 | Social Feed (Posts, Likes, Comments, R2 Media) |
| `decp-jobs` | 3004 | Job Board + Applications |
| `decp-events` | 3005 | Events & RSVPs |
| `decp-messaging` | 3006 | 1:1 Messaging + Read Receipts |
| `decp-notification` | 3007 | In-App Notifications (Pub/Sub driven) |
| `decp-analytics` | 3008 | Platform Metrics (Pub/Sub driven) |
| `decp-research` | 3009 | Research Projects |
| `decp-realtime` | 3010 | WebSockets (socket.io) — chat, presence, feed |
| `decp-gateway` | 8082 (host) | API Gateway — single public entry point |

**Frontend dev server:** `http://localhost:3100` (Next.js 14)

---

## Reference Documents
- `docs/API_CONTRACT.md` — Full backend API reference (all endpoints, request/response shapes, socket events)
- `docs/FRONTEND_IMPLEMENTATION_PLAN.md` — Original frontend implementation plan (all phases)
- `docs/CLOUD_DEPLOYMENT.md` — EC2 + GitHub Actions CI/CD deployment guide (self-hosted MongoDB in Docker)
- `docs/report/DECP_Architecture_Report.docx` — CO528 architecture report with diagrams
- `scripts/demo.js` — Playwright demo script (all platform sections, idempotent cleanup)
- `run-demo.sh` — One-command demo runner

---

### Mobile (React Native / Expo) — Complete ✅

| Feature | Status | Notes |
|---|---|---|
| Auth (login/register) | ✅ Complete | JWT stored in SecureStore, refresh token support |
| Feed | ✅ Complete | Post listing, likes, comments |
| Jobs | ✅ Complete | Browse listings, apply |
| Events | ✅ Complete | RSVP toggle |
| Research | ✅ Complete | Browse + join projects |
| Notifications | ✅ Complete | In-app alerts with unread badge |
| Profile | ✅ Complete | Avatar, follower/following counts |
| Messages — Inbox | ✅ Complete | Conversation list with unread badges, real-time updates via socket |
| Messages — Compose | ✅ Complete | **NEW** — "+" compose button → user search modal → start new conversation |
| Messages — Thread | ✅ Complete | Real-time chat, typing indicators, read receipts |

### Demo Script — Complete ✅

| Item | Detail |
|---|---|
| Script | `scripts/demo.js` (Node.js Playwright) |
| Runner | `./run-demo.sh` (auto-installs Playwright + Chromium if needed) |
| Duration | ~40 seconds (headed browser, slowed for visibility) |
| Account | Omar Hassan (`omar.hassan@decp.io` / `Pass1234`) |
| Sections | Login → Feed (post + like) → Jobs (apply) → Events (RSVP) → Research (join) → Messages (3 msgs to Liam Foster) → Notifications → Profile |
| Cleanup | Fully idempotent — all created data deleted via API in `finally` block |
| Mobile | Log in as Liam Foster (`liam.foster@decp.io` / `Pass1234`) to see messages arrive in real-time |

---

## What's Remaining (Production Deployment)

1. **GCP Credentials**: Provide a service account JSON to unlock Secret Manager and real Cloud Run deployments.
2. **MongoDB**: Currently self-hosted in Docker on EC2. Replace with Atlas URI for managed production DB.
3. **Mentorship Matching**: Alumni ↔ Student pairing algorithm.
4. **File size enforcement**: Client-side MIME/size validation before R2 upload.
