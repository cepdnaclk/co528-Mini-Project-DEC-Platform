# DECP – Implementation Task Checklist

**How to use this list:**
- Tasks are organised in phases. Within a phase, any task whose `Depends on` list is fully ✅ can be started immediately — including in parallel with other tasks in the same phase.
- Mark a task ✅ only when its **Done when** criteria are met.
- Never start a task whose dependency is not ✅.
- Cross-phase dependencies are written as full task IDs (e.g. T008).

**Status key:** `[ ]` = not started · `[~]` = in progress · `[x]` = done

---

## Phase 0 — Cloud Infrastructure (All parallel, no dependencies)

> Complete all of these before writing any service code. They are all independent.

---

### T001 — Create GCP project and enable APIs
- **Depends on:** nothing
- **Plan ref:** `06-cloud-deployment.md` §1
- **Done when:**
  - [ ] GCP project created (note the Project ID)
  - [ ] Billing account linked (free tier)
  - [ ] APIs enabled: Cloud Run, Cloud Build, Pub/Sub, Secret Manager, Artifact Registry
  - [ ] `gcloud` CLI authenticated and pointing to this project

---

### T002 — Create MongoDB Atlas cluster
- **Depends on:** nothing
- **Plan ref:** `06-cloud-deployment.md` §2
- **Done when:**
  - [ ] MongoDB Atlas account created
  - [ ] M0 free cluster created in a region close to Cloud Run region (e.g. `us-central1`)
  - [ ] Atlas IP Allowlist set to `0.0.0.0/0` (Cloud Run IPs are dynamic)
  - [ ] One Atlas DB user created with read/write permissions
  - [ ] `MONGODB_URI` connection string noted down (format: `mongodb+srv://user:pass@cluster.mongodb.net/`)

---

### T003 — Create Cloudflare R2 bucket
- **Depends on:** nothing
- **Plan ref:** `06-cloud-deployment.md` §3
- **Done when:**
  - [ ] Cloudflare account created (free tier)
  - [ ] R2 bucket named `decp-media` created
  - [ ] R2 API token created with read+write on the bucket
  - [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` noted down

---

### T004 — Create Firebase project and enable FCM
- **Depends on:** nothing
- **Plan ref:** `06-cloud-deployment.md` §7, `01-backend-services.md` §notification-service
- **Done when:**
  - [ ] Firebase project created (or linked to existing GCP project)
  - [ ] Android app registered in Firebase console (package name: `com.decp.app`)
  - [ ] iOS app registered (bundle ID: `com.decp.app`) — skip if iOS not targeted
  - [ ] Web app registered; VAPID key generated
  - [ ] `google-services.json` downloaded for Flutter Android
  - [ ] `GoogleService-Info.plist` downloaded for Flutter iOS (or skip)
  - [ ] Firebase service account JSON downloaded (for backend FCM calls via Admin SDK)
  - [ ] `FIREBASE_SERVICE_ACCOUNT_JSON` (base64 encoded): `base64 -w 0 service-account.json`
  - [ ] Firebase public config values noted: `apiKey`, `projectId`, `messagingSenderId`, `appId`, `vapidKey`

---

### T005 — Create GitHub monorepo structure
- **Depends on:** nothing
- **Plan ref:** `00-architecture-overview.md` §4
- **Done when:**
  - [ ] GitHub repository created and pushed
  - [ ] Top-level folders exist: `gateway/`, `services/auth/`, `services/user/`, `services/feed/`, `services/jobs/`, `services/events/`, `services/research/`, `services/messaging/`, `services/notification/`, `services/analytics/`, `web/`, `mobile/`, `scripts/`
  - [ ] Root `.gitignore` covers `node_modules/`, `.env`, `*.log`, `build/`, `.dart_tool/`
  - [ ] Each service folder has an empty `package.json` placeholder (just `{"name": "..."}`) so the structure is committed

---

## Phase 1 — Shared Patterns (Depends on T005)

> Write once, copy into each service. No service should be coded before these are settled.

---

### T006 — Write shared internal HTTP client pattern
- **Depends on:** T005
- **Plan ref:** `03-inter-service-communication.md` §2
- **Done when:**
  - [ ] `scripts/templates/internalClient.js` exists with the Axios-based internal client (5 s timeout, `X-Internal-Token` header)
  - [ ] Pattern is documented in a comment: "Copy to `lib/internalClient.js` inside each service that makes internal HTTP calls"

---

### T007 — Write shared Pub/Sub publisher pattern
- **Depends on:** T005
- **Plan ref:** `03-inter-service-communication.md` §6
- **Done when:**
  - [ ] `scripts/templates/pubsub.js` exists with the `publish(topicName, payload)` helper
  - [ ] Pattern is documented: "Copy to `lib/pubsub.js` inside each service that publishes events"

---

### T008 — Write Dockerfile template
- **Depends on:** T005
- **Plan ref:** `06-cloud-deployment.md` §4
- **Done when:**
  - [ ] `scripts/templates/Dockerfile` exists with the standard Node.js Dockerfile (node:18-alpine, non-root user, `npm ci --omit=dev`, `CMD ["node", "src/index.js"]`)
  - [ ] Template is documented: "Copy to each service root and adjust if needed"

---

## Phase 2 — Auth Service (Depends on T002, T005, T006, T007)

> The auth service is the foundation. Gateway and all clients depend on it.

---

### T009 — Implement auth-service
- **Depends on:** T002, T005, T006, T007
- **Plan ref:** `01-backend-services.md` §auth-service
- **Done when:**
  - [ ] `services/auth/` has `package.json`, `src/index.js`, `Dockerfile` (copied from T008), `.env.example`
  - [ ] Dependencies installed: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `zod`, `cookie-parser`
  - [ ] MongoDB connection to `decp_auth` database on Atlas works locally
  - [ ] `POST /api/v1/auth/register` — creates user with hashed password; returns `{ success, data: { userId, accessToken, refreshToken } }`
  - [ ] `POST /api/v1/auth/login` — validates credentials; returns tokens + sets `httpOnly` cookie for web; also returns `refreshToken` in body for mobile
  - [ ] `POST /api/v1/auth/refresh` — accepts cookie (web) or `{ refreshToken, client: 'mobile' }` body (mobile); rotates refresh token
  - [ ] `POST /api/v1/auth/logout` — invalidates refresh token from DB; clears cookie
  - [ ] JWT issued with payload `{ userId, role, email }`, 15 min expiry
  - [ ] Refresh token stored in `user.refreshTokens[]` array; rotation enforced
  - [ ] Zod validation on all inputs (email format, password min 8 chars, role enum: student/alumni)
  - [ ] X-Internal-Token header checked on any internal-only endpoints
  - [ ] `curl localhost:3001/api/v1/auth/register` returns `200` with tokens

---

### T010 — Write scripts/seed-admin.js
- **Depends on:** T009
- **Plan ref:** `01-backend-services.md` §Admin Bootstrap
- **Done when:**
  - [ ] `scripts/seed-admin.js` exists
  - [ ] Script connects to both `decp_auth` and `decp_users` databases using `MONGODB_URI` env var
  - [ ] Inserts admin user into `decp_auth.users` (email, hashed password, role: admin)
  - [ ] Inserts matching profile into `decp_users.users` (same `_id`, name, role: admin)
  - [ ] Script is idempotent — running it twice does not create duplicates (uses `upsert`)
  - [ ] Running `node scripts/seed-admin.js` locally with Atlas URI creates the admin successfully
  - [ ] Admin can log in via `POST /api/v1/auth/login` after seeding

---

## Phase 3 — User Service (Depends on T002, T005)

> Can be built in parallel with T009.

---

### T011 — Implement user-service
- **Depends on:** T002, T005
- **Plan ref:** `01-backend-services.md` §user-service
- **Done when:**
  - [ ] `services/user/` has `package.json`, `src/index.js`, `Dockerfile`, `.env.example`
  - [ ] MongoDB connects to `decp_users` database
  - [ ] Route ordering: `GET /api/v1/users/me` defined **before** `GET /api/v1/users/:id`
  - [ ] `GET /api/v1/users/me` — returns profile of authenticated user (reads `x-user-id` header set by gateway)
  - [ ] `PUT /api/v1/users/me` — updates name, bio, avatar URL, skills
  - [ ] `GET /api/v1/users/:id` — returns any user's public profile
  - [ ] `PUT /api/v1/users/:id/role` — Admin only (checks `x-user-role === 'admin'`); updates role
  - [ ] `GET /api/v1/users` — Admin only; lists users with pagination
  - [ ] X-Internal-Token checked; requests without it rejected with `403`
  - [ ] Zod validation on PUT body fields
  - [ ] `curl -H "x-user-id: test123" -H "x-internal-token: dev-secret" localhost:3002/api/v1/users/me` returns `200`

---

## Phase 4 — API Gateway (Depends on T009, T011)

> Gateway cannot be properly tested until at least auth and user services are running locally.

---

### T012 — Implement API gateway
- **Depends on:** T009, T011
- **Plan ref:** `02-api-gateway.md`
- **Done when:**
  - [ ] `gateway/` has `package.json`, `src/index.js`, `src/middleware/auth.js`, `src/middleware/rateLimit.js`, `src/middleware/cors.js`, `src/proxy/router.js`, `Dockerfile`, `.env.example`
  - [ ] Dependencies: `express`, `http-proxy-middleware`, `cors`, `express-rate-limit`, `jsonwebtoken`
  - [ ] `GET /health` responds `{ status: 'ok', service: 'gateway' }` without auth
  - [ ] Auth middleware reads `Authorization: Bearer <token>` header; falls back to `?token=` query param for WebSocket
  - [ ] Auth middleware injects `x-user-id`, `x-user-role`, `x-internal-token` headers on all proxied requests
  - [ ] `src/proxy/router.js` uses `pathRewrite: (path) => prefix + path` in every proxy call so downstream services receive the full `/api/v1/...` path
  - [ ] `/api/v1/auth/*` routes are proxied **without** JWT check
  - [ ] All other `/api/v1/*` routes require valid JWT
  - [ ] Rate limit: 200 requests per 15 min per IP
  - [ ] CORS allows `http://localhost:3000`, `WEB_CLIENT_URL`, `WEB_CLIENT_URL_PREVIEW`
  - [ ] End-to-end test: `POST gateway:8080/api/v1/auth/register` proxied correctly to auth-service; `GET gateway:8080/api/v1/users/me` with valid token proxied to user-service
  - [ ] `GET gateway:8080/api/v1/users/me` without token returns `401`

---

## Phase 5 — Core Backend Services (Depends on T002, T005, T006, T007)

> Can be built in parallel with T009, T011, T012. Each service is independent of the others.

---

### T013 — Implement feed-service
- **Depends on:** T002, T005, T006, T007
- **Plan ref:** `01-backend-services.md` §feed-service
- **Done when:**
  - [ ] `services/feed/` scaffolded with `package.json`, `src/index.js`, `Dockerfile`, `.env.example`
  - [ ] MongoDB connects to `decp_feed` database
  - [ ] Route ordering: `GET /api/v1/feed/posts/popular` defined **before** `GET /api/v1/feed/posts/:id`
  - [ ] `POST /api/v1/feed/posts` — creates post; denormalises `authorName`/`authorAvatar` via internal call to user-service using internalClient
  - [ ] `GET /api/v1/feed/posts` — cursor-based pagination (`?cursor=<last_id>&limit=20`)
  - [ ] `GET /api/v1/feed/posts/:id` — single post
  - [ ] `POST /api/v1/feed/posts/:id/like` / `DELETE /api/v1/feed/posts/:id/like` — toggle like
  - [ ] `POST /api/v1/feed/posts/:id/comments` — add comment
  - [ ] `GET /api/v1/feed/posts/:id/comments` — list comments
  - [ ] `POST /api/v1/feed/posts/:id/share` — increments `shareCount`
  - [ ] `POST /api/v1/feed/media/upload-url` — returns R2 pre-signed PUT URL + public URL (uses `@aws-sdk/s3-request-presigner`)
  - [ ] `GET /api/v1/feed/posts/popular?limit=10` — returns top posts by `likeCount` (internal endpoint, checked via X-Internal-Token only)
  - [ ] Posts schema includes: `authorId`, `authorName`, `authorAvatar`, `content`, `mediaUrls[]`, `likeCount`, `commentCount`, `shareCount`, timestamps
  - [ ] X-Internal-Token validated; missing token → `403`
  - [ ] Pub/Sub `publish()` called after post creation (topic: `PUBSUB_TOPIC_POST_CREATED`) — failure must not crash the request

---

### T014 — Implement jobs-service
- **Depends on:** T002, T005, T007
- **Plan ref:** `01-backend-services.md` §jobs-service
- **Done when:**
  - [ ] `services/jobs/` scaffolded
  - [ ] MongoDB connects to `decp_jobs` database
  - [ ] `POST /api/v1/jobs` — Alumni/Admin only (check `x-user-role`)
  - [ ] `GET /api/v1/jobs` — lists jobs with filter support (`?type=internship&active=true`)
  - [ ] `GET /api/v1/jobs/:id` — single job listing
  - [ ] `PUT /api/v1/jobs/:id` — poster or admin only
  - [ ] `DELETE /api/v1/jobs/:id` — poster or admin only
  - [ ] `POST /api/v1/jobs/:id/apply` — Student only; validates CV upload URL; creates application record
  - [ ] `GET /api/v1/jobs/:id/applications` — job poster or admin only
  - [ ] X-Internal-Token validated
  - [ ] Pub/Sub `publish()` after job posted (topic: `PUBSUB_TOPIC_JOB_POSTED`) and after application (topic: `PUBSUB_TOPIC_JOB_APPLIED`)
  - [ ] Env vars include: `GOOGLE_CLOUD_PROJECT_ID`, `PUBSUB_TOPIC_JOB_POSTED`, `PUBSUB_TOPIC_JOB_APPLIED`

---

### T015 — Implement events-service
- **Depends on:** T002, T005, T007
- **Plan ref:** `01-backend-services.md` §events-service
- **Done when:**
  - [ ] `services/events/` scaffolded
  - [ ] MongoDB connects to `decp_events` database
  - [ ] `POST /api/v1/events` — Admin only
  - [ ] `GET /api/v1/events` — lists upcoming events sorted by `eventDate`
  - [ ] `GET /api/v1/events/:id` — single event with RSVP count
  - [ ] `PUT /api/v1/events/:id` — Admin only
  - [ ] `POST /api/v1/events/:id/rsvp` — any authenticated user; idempotent
  - [ ] `DELETE /api/v1/events/:id/rsvp` — cancel RSVP
  - [ ] X-Internal-Token validated
  - [ ] Pub/Sub `publish()` after event created (topic: `PUBSUB_TOPIC_EVENT_CREATED`) and after RSVP (topic: `PUBSUB_TOPIC_EVENT_RSVP`)
  - [ ] Env vars include: `GOOGLE_CLOUD_PROJECT_ID`, `PUBSUB_TOPIC_EVENT_CREATED`, `PUBSUB_TOPIC_EVENT_RSVP`

---

## Phase 6 — GCP Secret Manager Setup (Depends on T001)

> Must be done before any Cloud Run deployment.

---

### T016 — Store all secrets in GCP Secret Manager
- **Depends on:** T001, T002, T003, T004
- **Plan ref:** `06-cloud-deployment.md` §5
- **Done when:**
  - [ ] Secret created for each entry in the table below (use `gcloud secrets create`):
    - `mongodb-uri` — full Atlas connection string
    - `jwt-secret` — random 64-char string
    - `internal-service-secret` — random 32-char string
    - `r2-account-id`
    - `r2-access-key-id`
    - `r2-secret-access-key`
    - `firebase-service-account` — base64-encoded service account JSON
    - `pubsub-verification-token` — random 32-char string
  - [ ] Each secret has at least one version (`gcloud secrets versions add ...`)
  - [ ] Cloud Run service account (default compute SA or a dedicated SA) has `roles/secretmanager.secretAccessor` IAM role

---

## Phase 7 — First Cloud Run Deployments (Depends on T008, T016)

> Deploy the services needed for the first end-to-end test: auth → gateway → user.
> Each deployment task is independent of the others within this phase.

---

### T017 — Copy Dockerfile into each service and build locally
- **Depends on:** T008, T009, T011, T013, T014, T015
- **Plan ref:** `06-cloud-deployment.md` §4
- **Done when:**
  - [ ] `Dockerfile` exists in: `gateway/`, `services/auth/`, `services/user/`, `services/feed/`, `services/jobs/`, `services/events/`
  - [ ] `docker build -t decp-auth services/auth/` completes without error for each service
  - [ ] `docker run --env-file services/auth/.env.local decp-auth` starts successfully (no crash on startup)

---

### T018 — Deploy auth-service to Cloud Run
- **Depends on:** T016, T017
- **Plan ref:** `06-cloud-deployment.md` §6
- **Done when:**
  - [ ] Image pushed to Artifact Registry: `gcloud builds submit --tag gcr.io/PROJECT/decp-auth services/auth/`
  - [ ] Deployed: `gcloud run deploy decp-auth --image ... --region us-central1 --no-allow-unauthenticated --ingress internal-and-cloud-load-balancing`
  - [ ] All secrets mounted from Secret Manager via `--set-secrets` or env var references
  - [ ] `gcloud run services describe decp-auth` shows `READY`
  - [ ] Health check via Cloud Run URL with internal auth returns expected response

---

### T019 — Deploy user-service to Cloud Run
- **Depends on:** T016, T017
- **Plan ref:** `06-cloud-deployment.md` §6
- **Done when:**
  - [ ] Same deploy pattern as T018 for `services/user/`
  - [ ] `gcloud run services describe decp-user` shows `READY`

---

### T020 — Deploy feed-service to Cloud Run
- **Depends on:** T016, T017
- **Plan ref:** `06-cloud-deployment.md` §6
- **Done when:**
  - [ ] `services/feed/` deployed as `decp-feed` on Cloud Run; ingress: internal
  - [ ] `gcloud run services describe decp-feed` shows `READY`

---

### T021 — Deploy jobs-service to Cloud Run
- **Depends on:** T016, T017
- **Plan ref:** `06-cloud-deployment.md` §6
- **Done when:**
  - [ ] `services/jobs/` deployed as `decp-jobs` on Cloud Run; ingress: internal
  - [ ] `gcloud run services describe decp-jobs` shows `READY`

---

### T022 — Deploy events-service to Cloud Run
- **Depends on:** T016, T017
- **Plan ref:** `06-cloud-deployment.md` §6
- **Done when:**
  - [ ] `services/events/` deployed as `decp-events` on Cloud Run; ingress: internal
  - [ ] `gcloud run services describe decp-events` shows `READY`

---

### T023 — Deploy gateway to Cloud Run (public)
- **Depends on:** T016, T017, T018, T019, T020, T021, T022
- **Plan ref:** `06-cloud-deployment.md` §6, `02-api-gateway.md`
- **Done when:**
  - [ ] Gateway env vars include all `*_SERVICE_URL` values pointing to the Cloud Run internal URLs from T018–T022
  - [ ] `gateway/` deployed as `decp-gateway` with `--allow-unauthenticated` (public) and `--ingress all`
  - [ ] `GET https://decp-gateway-<hash>-uc.a.run.app/health` returns `{ status: 'ok' }` from the public internet
  - [ ] `POST /api/v1/auth/register` through gateway returns a JWT
  - [ ] `GET /api/v1/users/me` with a valid JWT through gateway returns user profile
  - [ ] Custom domain `api.decp.app` mapped to this Cloud Run service (optional at this stage; can be done later)

---

### T024 — Run seed-admin.js against production Atlas
- **Depends on:** T023, T010
- **Plan ref:** `01-backend-services.md` §Admin Bootstrap, `09-execution-timeline.md` §Day 24
- **Done when:**
  - [ ] `MONGODB_URI=<atlas_uri> ADMIN_EMAIL=admin@decp.app ADMIN_PASSWORD=<secure_pw> node scripts/seed-admin.js` runs successfully
  - [ ] Admin can log in at `POST https://api.decp.app/api/v1/auth/login` with those credentials
  - [ ] Admin JWT contains `role: admin`

---

## Phase 8 — Web Client Core (Depends on T023)

> Can be started as soon as the gateway is live. Each page task is independent.

---

### T025 — Bootstrap Next.js web app
- **Depends on:** T005
- **Plan ref:** `04-web-client-nextjs.md` §2, §7
- **Done when:**
  - [ ] `web/` created with `npx create-next-app@14 . --typescript --tailwind --app`
  - [ ] `shadcn/ui` initialised
  - [ ] Dependencies installed: `axios`, `swr`, `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, `firebase`, `recharts`, `lucide-react`
  - [ ] Folder structure matches plan: `app/(auth)/`, `app/(main)/`, `app/(admin)/`, `components/`, `lib/`
  - [ ] `lib/api.ts` — Axios instance with base URL from `NEXT_PUBLIC_API_URL`, request interceptor attaches token, response interceptor handles 401 refresh + redirect
  - [ ] `lib/store/authStore.ts` — Zustand store with `accessToken`, `setAccessToken`, `clearAuth`
  - [ ] `middleware.ts` — redirects unauthenticated users to `/login`; redirects authenticated users away from auth pages
  - [ ] `.env.local` contains `NEXT_PUBLIC_API_URL=https://api.decp.app`
  - [ ] `npm run dev` starts without errors

---

### T026 — Web: auth screens (login + register)
- **Depends on:** T025, T023
- **Plan ref:** `04-web-client-nextjs.md` §3
- **Done when:**
  - [ ] `/login` page: email + password form using React Hook Form + Zod; calls `POST /api/v1/auth/login`; stores access token in Zustand; redirects to `/feed`
  - [ ] `/register` page: name + email + password + role selector; calls `POST /api/v1/auth/register`; same post-register flow
  - [ ] On app load: `POST /api/v1/auth/refresh` called (cookie-based) to restore session; if successful, access token stored in Zustand
  - [ ] Logout clears Zustand store, calls `POST /api/v1/auth/logout`, redirects to `/login`
  - [ ] Registration and login work end-to-end through the deployed gateway

---

### T027 — Web: feed page
- **Depends on:** T026, T020
- **Plan ref:** `04-web-client-nextjs.md` §4, `01-backend-services.md` §feed-service
- **Done when:**
  - [ ] `/feed` page loads with `useSWRInfinite` cursor-based pagination
  - [ ] `PostComposer` component: text area + media upload (calls `POST /api/v1/feed/media/upload-url`, then PUT to R2 URL directly)
  - [ ] `PostCard` component: shows author name, avatar, content, media, like count, comment count
  - [ ] Like button calls `POST /api/v1/feed/posts/:id/like` with optimistic update
  - [ ] Comment count links to post detail or inline comment list
  - [ ] Infinite scroll triggers `loadMore` when user nears bottom

---

### T028 — Web: jobs page
- **Depends on:** T026, T021
- **Plan ref:** `04-web-client-nextjs.md` §4
- **Done when:**
  - [ ] `/jobs` lists job postings from `GET /api/v1/jobs`
  - [ ] Filter UI for job type (job / internship)
  - [ ] Student sees "Apply" button on each job card → modal with cover letter textarea + CV upload
  - [ ] Alumni/Admin sees "Post Job" button → form to create a new job listing
  - [ ] `/jobs/[id]` detail page with full description and apply flow

---

### T029 — Web: events page
- **Depends on:** T026, T022
- **Plan ref:** `04-web-client-nextjs.md` §4
- **Done when:**
  - [ ] `/events` lists upcoming events sorted by date
  - [ ] `/events/[id]` shows details + RSVP button
  - [ ] RSVP button calls `POST /api/v1/events/:id/rsvp`; cancels with `DELETE`; button state reflects current RSVP status
  - [ ] Admin sees "Create Event" button → form

---

### T030 — Web: user profile page
- **Depends on:** T026, T019
- **Plan ref:** `04-web-client-nextjs.md` §2
- **Done when:**
  - [ ] `/profile/[id]` shows public profile (name, bio, role, avatar, skills)
  - [ ] `/profile/edit` lets the logged-in user update their profile; avatar upload via R2 pre-signed URL from feed-service or user-service media endpoint
  - [ ] Profile update calls `PUT /api/v1/users/me`

---

## Phase 9 — Mobile Client Core (Depends on T023)

> Independent of web client tasks. Can run in parallel with Phase 8.

---

### T031 — Bootstrap Flutter mobile app
- **Depends on:** T005, T004
- **Plan ref:** `05-mobile-client-flutter.md` §2, §9
- **Done when:**
  - [ ] `mobile/` created with `flutter create .`
  - [ ] `pubspec.yaml` includes all dependencies: `go_router`, `flutter_riverpod`, `riverpod_annotation`, `dio`, `flutter_secure_storage`, `firebase_core`, `firebase_messaging`, `flutter_local_notifications`, `image_picker`, `file_picker`, `cached_network_image`, `web_socket_channel`, `fl_chart`, `intl`, `flutter_dotenv`, `path`
  - [ ] `dev_dependencies` includes: `riverpod_generator`, `build_runner`
  - [ ] `google-services.json` placed in `android/app/`
  - [ ] Folder structure matches plan: `lib/app/`, `lib/core/`, `lib/features/`, `lib/shared/`
  - [ ] `lib/core/config.dart` with `AppConfig.apiBaseUrl` and `AppConfig.wsBaseUrl`
  - [ ] `flutter run` compiles and launches on an Android emulator/device

---

### T032 — Flutter: API client + auth
- **Depends on:** T031, T023
- **Plan ref:** `05-mobile-client-flutter.md` §4, §5
- **Done when:**
  - [ ] `lib/core/api/api_client.dart` — Dio with base URL, request interceptor attaches token from secure storage, error interceptor handles 401 by refreshing token (sends `{ refreshToken, client: 'mobile' }` body), retries original request
  - [ ] `lib/core/storage/secure_storage.dart` — wraps `flutter_secure_storage` with `saveTokens`, `getAccessToken`, `getRefreshToken`, `clearAll`
  - [ ] `lib/app/router.dart` — go_router with auth guard; redirects to `/login` if not logged in
  - [ ] Login screen: email + password fields, calls `POST /api/v1/auth/login`, saves both tokens to secure storage, navigates to `/feed`
  - [ ] Register screen: name + email + password + role dropdown, calls `POST /api/v1/auth/register`
  - [ ] `MainShell` widget with bottom navigation bar (Feed, Jobs, Events, Messages, Profile)
  - [ ] Login/register flow works end-to-end against the deployed gateway

---

### T033 — Flutter: feed screen
- **Depends on:** T032, T020
- **Plan ref:** `05-mobile-client-flutter.md` §features/feed
- **Done when:**
  - [ ] `FeedScreen` loads posts via `GET /api/v1/feed/posts`; infinite scroll pagination using cursor
  - [ ] `PostCard` widget: author avatar, name, content, media (cached_network_image), like count, comment count
  - [ ] Like button calls `POST /api/v1/feed/posts/:id/like`
  - [ ] FAB opens `PostComposer` bottom sheet: text field + image picker + submit
  - [ ] Media upload: calls presigned URL endpoint, PUT to R2, includes URL in post creation payload

---

### T034 — Flutter: jobs screen
- **Depends on:** T032, T021
- **Plan ref:** `05-mobile-client-flutter.md` §features/jobs
- **Done when:**
  - [ ] `JobsScreen` lists jobs; `JobDetailScreen` shows details
  - [ ] Student sees Apply button → bottom sheet with cover letter text + CV file picker + upload flow
  - [ ] Alumni sees Post Job button (role-gated)

---

### T035 — Flutter: events screen
- **Depends on:** T032, T022
- **Plan ref:** `05-mobile-client-flutter.md` §features/events
- **Done when:**
  - [ ] `EventsScreen` lists events; `EventDetailScreen` shows details + RSVP button
  - [ ] RSVP calls `POST /api/v1/events/:id/rsvp`; button toggles based on status

---

### T036 — Flutter: profile screen
- **Depends on:** T032, T019
- **Plan ref:** `05-mobile-client-flutter.md` §features/profile
- **Done when:**
  - [ ] `ProfileScreen` shows user profile from `GET /api/v1/users/:id`
  - [ ] `EditProfileScreen` updates profile via `PUT /api/v1/users/me`; avatar upload via image picker + R2 presigned URL

---

## Phase 10 — GCP Pub/Sub Infrastructure (Depends on T001)

> Can be done as soon as GCP project exists. Independent of all service code.

---

### T037 — Create Pub/Sub topics and subscriptions
- **Depends on:** T001
- **Plan ref:** `03-inter-service-communication.md` §4, `06-cloud-deployment.md` §Pub/Sub
- **Done when:**
  - [ ] Topics created: `decp.post.created`, `decp.job.posted`, `decp.job.applied`, `decp.event.created`, `decp.event.rsvp`, `decp.user.registered`
  - [ ] Dead-letter topics created: `decp.post.created.dlq`, etc. (one per topic)
  - [ ] Push subscriptions created for notification-service:
    - `decp-notification-post-sub` → `decp.post.created`
    - `decp-notification-job-sub` → `decp.job.posted`
    - `decp-notification-applied-sub` → `decp.job.applied`
    - `decp-notification-event-sub` → `decp.event.created`
    - `decp-notification-rsvp-sub` → `decp.event.rsvp`
  - [ ] Push subscriptions created for analytics-service:
    - `decp-analytics-post-sub`, `decp-analytics-job-sub`, `decp-analytics-applied-sub`, `decp-analytics-event-sub`, `decp-analytics-rsvp-sub`, `decp-analytics-user-sub`
  - [ ] All subscriptions use `--push-endpoint https://<service-url>/pubsub/push?token=<PUBSUB_VERIFICATION_TOKEN>`
  - [ ] All subscriptions use `--dead-letter-topic` and `--max-delivery-attempts 10`
  - [ ] Push subscription endpoint URLs will need updating after notification/analytics services are deployed (T041/T045)

---

## Phase 11 — Secondary Backend Services (Depends on T002, T005, T007, T037)

> Each service is independent of the others. Build them in parallel.

---

### T038 — Implement notification-service
- **Depends on:** T002, T005, T007, T004
- **Plan ref:** `01-backend-services.md` §notification-service, `03-inter-service-communication.md` §7
- **Done when:**
  - [ ] `services/notification/` scaffolded
  - [ ] MongoDB connects to `decp_notifications` database
  - [ ] `device_tokens` collection with fields: `userId`, `token`, `platform` (web/android/ios)
  - [ ] `POST /api/v1/notifications/device-token` — registers FCM device token for logged-in user (reads `x-user-id`)
  - [ ] `GET /api/v1/notifications` — lists notifications for the logged-in user (paginated)
  - [ ] `PUT /api/v1/notifications/:id/read` — marks a notification read
  - [ ] `POST /pubsub/push` — Pub/Sub push endpoint (NOT under `/api/v1/`; no X-Internal-Token guard; verified by `?token=PUBSUB_VERIFICATION_TOKEN` query param)
    - Validates `req.query.token === process.env.PUBSUB_VERIFICATION_TOKEN`; returns `403` if mismatch
    - Decodes base64 message body
    - Dispatches to: `handlePostCreated`, `handleJobPosted`, `handleJobApplied`, `handleEventCreated`, `handleEventRsvp`
    - Each handler: saves notification record in DB, calls `sendPush()` to target user(s)
    - Returns `204` on success; `500` on error (NACK → Pub/Sub retry)
  - [ ] `sendPush(userId, title, body)` function:
    - Looks up all device tokens for `userId` in `device_tokens` collection
    - Calls Firebase Admin SDK `messaging.sendEachForMulticast({ tokens: [...], notification: { title, body } })`
    - Removes tokens that returned `registration-token-not-registered` error
  - [ ] Firebase Admin SDK initialised from `FIREBASE_SERVICE_ACCOUNT_JSON` env var (base64 decode → parse JSON → `initializeApp({ credential: cert(serviceAccount) })`)
  - [ ] Env vars: `MONGODB_URI`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `PUBSUB_VERIFICATION_TOKEN`, `JWT_SECRET`, `INTERNAL_SERVICE_SECRET`
  - [ ] X-Internal-Token checked on `/api/v1/notifications/*` routes; NOT checked on `/pubsub/push`

---

### T039 — Implement research-service
- **Depends on:** T002, T005, T003
- **Plan ref:** `01-backend-services.md` §research-service
- **Done when:**
  - [ ] `services/research/` scaffolded
  - [ ] MongoDB connects to `decp_research` database
  - [ ] `POST /api/v1/research/projects` — creates research project (any authenticated user)
  - [ ] `GET /api/v1/research/projects` — lists all projects
  - [ ] `GET /api/v1/research/projects/:id` — single project with collaborators
  - [ ] `PUT /api/v1/research/projects/:id` — project creator or admin only
  - [ ] `POST /api/v1/research/projects/:id/collaborators` — invite a collaborator (by userId)
  - [ ] `DELETE /api/v1/research/projects/:id/collaborators/:userId` — remove collaborator
  - [ ] `POST /api/v1/research/projects/:id/documents` — upload document; returns R2 presigned upload URL
  - [ ] `GET /api/v1/research/projects/:id/documents` — list documents for a project
  - [ ] X-Internal-Token validated
  - [ ] Zod validation on inputs

---

### T040 — Implement messaging-service
- **Depends on:** T002, T005
- **Plan ref:** `01-backend-services.md` §messaging-service
- **Done when:**
  - [ ] `services/messaging/` scaffolded
  - [ ] MongoDB connects to `decp_messaging` database
  - [ ] REST endpoints:
    - `GET /api/v1/messages/conversations` — lists conversations for the user
    - `POST /api/v1/messages/conversations` — create/find DM conversation with another user
    - `GET /api/v1/messages/conversations/:id/messages` — paginated message history
  - [ ] WebSocket endpoint: `GET /api/v1/messages/ws` — upgrades to WS; token validated from `?token=` query param
    - On connect: authenticate user from token; join them to their conversation rooms
    - On message from client `{ type: 'message', conversationId, content }`: save to DB, broadcast to other participants in that conversation
    - On disconnect: remove from rooms
  - [ ] WebSocket server uses `ws` library; handles upgrade event on the Express HTTP server
  - [ ] X-Internal-Token validated on REST endpoints; WS validated via `?token=` query param
  - [ ] Env vars: `MONGODB_URI`, `JWT_SECRET`, `INTERNAL_SERVICE_SECRET`

---

### T041 — Implement analytics-service
- **Depends on:** T002, T005, T006
- **Plan ref:** `01-backend-services.md` §analytics-service, `03-inter-service-communication.md` §3
- **Done when:**
  - [ ] `services/analytics/` scaffolded
  - [ ] MongoDB connects to `decp_analytics` database
  - [ ] `POST /pubsub/push` — Pub/Sub push endpoint (same pattern as T038):
    - Validates `PUBSUB_VERIFICATION_TOKEN`
    - Handles: `post.created`, `job.posted`, `job.applied`, `event.created`, `event.rsvp`, `user.registered`
    - Increments counters in a `stats` collection (total posts, total jobs, total applications, total events, total users)
    - Returns `204` success, `500` NACK
  - [ ] REST endpoints (Admin only — check `x-user-role === 'admin'`):
    - `GET /api/v1/analytics/summary` — returns `{ totalUsers, activeUsers, totalPosts, totalApplications }`
    - `GET /api/v1/analytics/users/over-time` — returns new user counts grouped by week
    - `GET /api/v1/analytics/jobs/applications-over-time` — applications per week
    - `GET /api/v1/analytics/posts/popular` — delegates HTTP call to feed-service `GET /api/v1/feed/posts/popular` using internalClient
  - [ ] X-Internal-Token checked on `/api/v1/analytics/*` routes; NOT on `/pubsub/push`
  - [ ] Env vars include: `MONGODB_URI`, `PUBSUB_VERIFICATION_TOKEN`, `FEED_SERVICE_URL`, `INTERNAL_SERVICE_SECRET`, `JWT_SECRET`

---

## Phase 12 — Deploy Secondary Services (Depends on T016, T017, T038, T039, T040, T041)

> Each deploy is independent. Deploy in parallel.

---

### T042 — Deploy notification-service to Cloud Run (public ingress)
- **Depends on:** T016, T038
- **Plan ref:** `06-cloud-deployment.md` §notification-analytics-deploy
- **Done when:**
  - [ ] Image built and pushed to Artifact Registry
  - [ ] Deployed with `--allow-unauthenticated --ingress all` (must be public for Pub/Sub push delivery)
  - [ ] All secrets mounted
  - [ ] `gcloud run services describe decp-notifications` shows `READY`
  - [ ] Pub/Sub push subscription endpoint URLs updated to point to the deployed service URL (T037 subscriptions updated)
  - [ ] `curl https://decp-notifications-<hash>/health` returns `200`

---

### T043 — Deploy analytics-service to Cloud Run (public ingress)
- **Depends on:** T016, T041
- **Plan ref:** `06-cloud-deployment.md` §notification-analytics-deploy
- **Done when:**
  - [ ] Same pattern as T042 for analytics service
  - [ ] `gcloud run services describe decp-analytics` shows `READY`
  - [ ] Pub/Sub push subscription endpoint URLs for analytics updated (T037 subscriptions updated)

---

### T044 — Deploy messaging-service to Cloud Run
- **Depends on:** T016, T040
- **Plan ref:** `06-cloud-deployment.md` §messaging-deploy
- **Done when:**
  - [ ] Deployed with `--min-instances 1 --session-affinity` (required for WebSocket stickiness)
  - [ ] Ingress: internal (REST accessible via gateway; WS accessible via gateway ws: true proxy)
  - [ ] `gcloud run services describe decp-messaging` shows `READY`

---

### T045 — Deploy research-service to Cloud Run
- **Depends on:** T016, T039
- **Plan ref:** `06-cloud-deployment.md` §6
- **Done when:**
  - [ ] `decp-research` deployed with internal ingress
  - [ ] `gcloud run services describe decp-research` shows `READY`

---

### T046 — Update gateway with secondary service URLs
- **Depends on:** T042, T043, T044, T045, T023
- **Plan ref:** `02-api-gateway.md` §6
- **Done when:**
  - [ ] Gateway redeployed with updated env vars:
    - `MESSAGING_SERVICE_URL` → `decp-messaging` Cloud Run URL
    - `NOTIFICATION_SERVICE_URL` → `decp-notifications` Cloud Run URL
    - `ANALYTICS_SERVICE_URL` → `decp-analytics` Cloud Run URL
    - `RESEARCH_SERVICE_URL` → `decp-research` Cloud Run URL
  - [ ] `GET /api/v1/research/projects` through gateway returns a response from research-service
  - [ ] `GET /api/v1/analytics/summary` through gateway with admin JWT returns analytics data

---

## Phase 13 — Add Pub/Sub Publishing to Core Services (Depends on T037)

> Add publish calls to services that were deployed before Pub/Sub was ready. Redeploy each.

---

### T047 — Add Pub/Sub publish to auth-service + redeploy
- **Depends on:** T007, T018, T037
- **Plan ref:** `03-inter-service-communication.md` §6, `01-backend-services.md` §auth-service
- **Done when:**
  - [ ] `lib/pubsub.js` added to `services/auth/`
  - [ ] `POST /api/v1/auth/register` publishes `decp.user.registered` event after successful registration
  - [ ] Env vars added: `GOOGLE_CLOUD_PROJECT_ID`, `PUBSUB_TOPIC_USER_REGISTERED`
  - [ ] auth-service redeployed with new image and env vars
  - [ ] Registering a new user triggers the analytics-service to increment `totalUsers` counter

---

### T048 — Add Pub/Sub publish to feed-service + redeploy
- **Depends on:** T007, T020, T037
- **Plan ref:** `03-inter-service-communication.md` §6
- **Done when:**
  - [ ] `lib/pubsub.js` added to `services/feed/`
  - [ ] `POST /api/v1/feed/posts` publishes `decp.post.created` after saving post
  - [ ] Env vars added: `GOOGLE_CLOUD_PROJECT_ID`, `PUBSUB_TOPIC_POST_CREATED`
  - [ ] feed-service redeployed
  - [ ] Creating a post triggers a push notification delivery to followers (verify in notification-service logs)

---

### T049 — Add Pub/Sub publish to jobs-service + redeploy
- **Depends on:** T007, T021, T037
- **Plan ref:** `03-inter-service-communication.md` §6
- **Done when:**
  - [ ] `lib/pubsub.js` added to `services/jobs/`
  - [ ] `POST /api/v1/jobs` publishes `decp.job.posted` after creation
  - [ ] `POST /api/v1/jobs/:id/apply` publishes `decp.job.applied` after application created
  - [ ] Env vars already added in T014; confirm values set in Cloud Run
  - [ ] jobs-service redeployed

---

### T050 — Add Pub/Sub publish to events-service + redeploy
- **Depends on:** T007, T022, T037
- **Plan ref:** `03-inter-service-communication.md` §6
- **Done when:**
  - [ ] `lib/pubsub.js` added to `services/events/`
  - [ ] `POST /api/v1/events` publishes `decp.event.created`
  - [ ] `POST /api/v1/events/:id/rsvp` publishes `decp.event.rsvp`
  - [ ] Env vars already added in T015; confirm values set in Cloud Run
  - [ ] events-service redeployed

---

## Phase 14 — Web Client Secondary Features (Depends on T046)

> Each page/feature is independent. Build in parallel.

---

### T051 — Web: notifications page + FCM setup
- **Depends on:** T026, T042, T004
- **Plan ref:** `04-web-client-nextjs.md` §6
- **Done when:**
  - [ ] `lib/firebase.ts` — Firebase JS SDK initialised; `requestNotificationPermission()` calls `getToken()` and registers token via `POST /api/v1/notifications/device-token`
  - [ ] `public/firebase-messaging-sw.js` — FCM service worker for background push
  - [ ] Permission requested on first login (after auth)
  - [ ] `/notifications` page: lists notifications from `GET /api/v1/notifications`; marks read on click

---

### T052 — Web: messages page
- **Depends on:** T026, T044
- **Plan ref:** `04-web-client-nextjs.md` §4
- **Done when:**
  - [ ] `/messages` page lists conversations from `GET /api/v1/messages/conversations`
  - [ ] `/messages/[conversationId]` chat window:
    - Connects WebSocket to `wss://api.decp.app/api/v1/messages/ws?token=<accessToken>` on mount
    - Loads history from `GET /api/v1/messages/conversations/:id/messages`
    - Sends messages via WebSocket; receives incoming messages via WS stream and appends to UI

---

### T053 — Web: research page
- **Depends on:** T026, T045
- **Plan ref:** `04-web-client-nextjs.md` §2
- **Done when:**
  - [ ] `/research` lists projects from `GET /api/v1/research/projects`
  - [ ] `/research/[id]` shows project details, collaborators, and document list
  - [ ] Create project form; add collaborator by userId; document upload via presigned URL

---

### T054 — Web: admin analytics page
- **Depends on:** T026, T043
- **Plan ref:** `04-web-client-nextjs.md` §4
- **Done when:**
  - [ ] `/admin/analytics` — role-gated; redirects non-admins to `/feed`
  - [ ] Stats cards: total users, total posts, total job applications (from `GET /api/v1/analytics/summary`)
  - [ ] Line chart: new users per week (Recharts `LineChart`)
  - [ ] Bar chart: applications per week (Recharts `BarChart`)
  - [ ] Top posts table (from `GET /api/v1/analytics/posts/popular`)

---

## Phase 15 — Flutter Secondary Features (Depends on T046)

> Independent of web tasks. Build in parallel with Phase 14.

---

### T055 — Flutter: FCM push notifications
- **Depends on:** T032, T042, T004
- **Plan ref:** `05-mobile-client-flutter.md` §7
- **Done when:**
  - [ ] `FcmService.init()` called in `main.dart` after Firebase initialised
  - [ ] FCM token fetched and registered via `POST /api/v1/notifications/device-token`
  - [ ] Foreground messages shown via `flutter_local_notifications`
  - [ ] Background/terminated messages handled by Firebase

---

### T056 — Flutter: notifications screen
- **Depends on:** T032, T042
- **Plan ref:** `05-mobile-client-flutter.md` §features/notifications
- **Done when:**
  - [ ] `NotificationsScreen` loads from `GET /api/v1/notifications`
  - [ ] Notification bell in AppBar shows badge count of unread notifications
  - [ ] Tapping a notification marks it read via `PUT /api/v1/notifications/:id/read`

---

### T057 — Flutter: messages screen + WebSocket
- **Depends on:** T032, T044
- **Plan ref:** `05-mobile-client-flutter.md` §6
- **Done when:**
  - [ ] `ConversationsScreen` loads conversation list
  - [ ] `ChatScreen` connects `WebSocketService` on mount; disconnects on dispose
  - [ ] Messages sent via `WebSocketService.sendMessage()`; received messages appended in real time
  - [ ] History loaded from REST on screen open

---

### T058 — Flutter: research screen
- **Depends on:** T032, T045
- **Plan ref:** `05-mobile-client-flutter.md` §features/research
- **Done when:**
  - [ ] `ResearchScreen` lists projects
  - [ ] `ProjectDetailScreen` shows collaborators and documents

---

### T059 — Flutter: analytics screen (admin only)
- **Depends on:** T032, T043
- **Plan ref:** `05-mobile-client-flutter.md` §features/analytics
- **Done when:**
  - [ ] `AnalyticsScreen` visible only when `user.role == 'admin'`
  - [ ] Displays summary stats and at least one chart using `fl_chart`

---

## Phase 16 — CI/CD Pipeline (Depends on T023)

---

### T060 — Set up GitHub Actions CI/CD
- **Depends on:** T023, T016
- **Plan ref:** `06-cloud-deployment.md` §CI/CD
- **Done when:**
  - [ ] `.github/workflows/deploy.yml` created
  - [ ] Workflow triggers on push to `main`
  - [ ] Uses `dorny/paths-filter@v2` to detect which service directories changed
  - [ ] Matrix strategy: only changed services are rebuilt and redeployed
  - [ ] Each service job: `gcloud builds submit` + `gcloud run deploy`
  - [ ] GCP service account key stored as GitHub Actions secret
  - [ ] Push to `main` with a change in `services/auth/` triggers only `decp-auth` redeploy
  - [ ] Web client: Vercel auto-deploys from GitHub (connect in Vercel dashboard; no manual step needed)

---

## Phase 17 — Security Hardening (Depends on all services deployed)

---

### T061 — Add Zod validation to all services
- **Depends on:** T018, T019, T020, T021, T022, T042, T043, T044, T045
- **Plan ref:** `07-security-architecture.md` §5
- **Done when:**
  - [ ] Every POST/PUT endpoint in every service validates its request body with a Zod schema before hitting business logic
  - [ ] Validation errors return `400` with a structured error response listing invalid fields
  - [ ] Enum fields (role, job type, platform) reject unexpected values
  - [ ] String lengths are capped (e.g. post content ≤ 5000 chars, bio ≤ 500 chars)

---

### T062 — Add MongoDB indexes
- **Depends on:** T018, T019, T020, T021, T022
- **Plan ref:** `01-backend-services.md` (schema sections per service)
- **Done when:**
  - [ ] `decp_feed.posts`: index on `authorId`, index on `likeCount` (desc) for popular query, index on `_id` (desc) for cursor pagination
  - [ ] `decp_jobs.jobs`: index on `active`, `type`
  - [ ] `decp_events.events`: index on `eventDate` (asc)
  - [ ] `decp_notifications.notifications`: index on `userId`, `read`
  - [ ] `decp_notifications.device_tokens`: index on `userId`
  - [ ] Indexes created via Atlas UI or a `scripts/create-indexes.js` script

---

### T063 — Review RBAC on all endpoints
- **Depends on:** T018, T019, T020, T021, T022, T042, T043, T044, T045
- **Plan ref:** `07-security-architecture.md` §3
- **Done when:**
  - [ ] Every endpoint has an explicit role check (or is explicitly marked public with comment)
  - [ ] The RBAC table in `07-security-architecture.md` matches what is actually enforced in code
  - [ ] Attempt to POST a job as a student returns `403`
  - [ ] Attempt to access analytics as a student returns `403`
  - [ ] Attempt to create an event as alumni returns `403`

---

## Phase 18 — Integration Testing (Depends on all services deployed + all clients connected)

---

### T064 — Full end-to-end integration test
- **Depends on:** T026, T027, T028, T029, T030, T032, T033, T034, T035, T036, T046, T048, T050, T055
- **Plan ref:** `09-execution-timeline.md` §Day 14 + §Day 22-23
- **Done when:**
  - [ ] **Register → Login flow:** new student registers on web; same credentials work on Flutter mobile
  - [ ] **Feed flow:** create post with image on web → post appears in Flutter feed; like from mobile reflects on web (after SWR revalidation)
  - [ ] **Notification flow:** create post on web → FCM push notification arrives on mobile device within 30 seconds
  - [ ] **Jobs flow:** alumni posts a job on web → student applies via Flutter → application appears in job poster's dashboard
  - [ ] **Events flow:** admin creates event → student RSVPs from web → RSVP count updates
  - [ ] **Messaging flow:** open chat between two users; send message on web → appears in Flutter without page reload
  - [ ] **Research flow:** create project → add collaborator → upload document → document retrievable
  - [ ] **Analytics flow:** login as admin → analytics dashboard shows non-zero stats
  - [ ] **Pub/Sub flow verified:** notification-service Pub/Sub logs show messages received and processed without 500 errors

---

## Phase 19 — Documentation (Can be done from Week 3 onwards, final polish in Week 4)

> Documentation tasks are independent of each other. Assign one per team member.

---

### T065 — Architecture diagrams (finalise and match code)
- **Depends on:** T064 (diagrams must match final implemented code)
- **Plan ref:** `00-architecture-overview.md`, `09-execution-timeline.md` §Day 25-26
- **Done when:**
  - [ ] SOA service-interaction diagram showing all 9 services, the gateway, and the two clients — with API endpoints listed
  - [ ] Enterprise architecture diagram: roles (student, alumni, admin), departments, workflow
  - [ ] Product modularity diagram: core modules vs optional/bonus
  - [ ] Deployment diagram: Cloud Run services (internal vs public), Atlas, R2, Vercel, Firebase — with ingress model shown
  - [ ] All diagrams are in `docs/diagrams/` in a shareable format (draw.io XML, PNG export, or ASCII)
  - [ ] Diagrams verified to match actual implemented code (not the plan — the code)

---

### T066 — Research findings document
- **Depends on:** nothing (can start any time)
- **Plan ref:** `09-execution-timeline.md` §Day 21
- **Done when:**
  - [ ] `docs/research-findings.md` exists
  - [ ] Analyses Facebook and LinkedIn architectures (service decomposition, data storage, notification patterns)
  - [ ] Identifies features present in those platforms that DECP does not have (e.g. algorithmic feed, connection graph, InMail, LinkedIn Learning)
  - [ ] Proposes concrete improvements to DECP architecture to address those gaps
  - [ ] ~500–800 words, well-structured with headings

---

### T067 — Design justifications document (NFR)
- **Depends on:** T064
- **Plan ref:** `08-non-functional-requirements.md`, `09-execution-timeline.md` §Day 25
- **Done when:**
  - [ ] `docs/design-justifications.md` covers all 6 quality attributes: Performance, Scalability, Security, Availability, Maintainability, Cost
  - [ ] Each section references the actual technology choice and explains WHY it was chosen for that attribute
  - [ ] References CO528 brief requirements explicitly

---

### T068 — Implementation details document
- **Depends on:** T064
- **Plan ref:** `09-execution-timeline.md` §Day 25
- **Done when:**
  - [ ] `docs/implementation-details.md` covers:
    - All 8 functional features and which services implement them
    - API endpoint list (all services, all routes)
    - Inter-service communication description (HTTP calls + Pub/Sub topics)
    - Client integration (how web and mobile consume the APIs)
    - Media upload flow (R2 presigned URL process)

---

### T069 — Cloud deployment details document
- **Depends on:** T064
- **Plan ref:** `09-execution-timeline.md` §Day 25
- **Done when:**
  - [ ] `docs/cloud-deployment-details.md` covers:
    - Step-by-step setup from scratch (GCP, Atlas, R2, Firebase, GitHub Actions)
    - Cloud Run service configuration for each service (ingress, min-instances, secrets)
    - Scalability considerations (scale-to-zero, session affinity for messaging, Pub/Sub retry/DLQ)
    - Cost analysis (all free tiers used; estimated $0/month)

---

### T070 — Security architecture document
- **Depends on:** T063
- **Plan ref:** `07-security-architecture.md`, `09-execution-timeline.md` §Day 25
- **Done when:**
  - [ ] `docs/security-architecture.md` covers:
    - JWT token strategy (access + refresh, storage model for web vs mobile)
    - RBAC model (roles, what each can do)
    - Network security model (internal vs public ingress, X-Internal-Token, Pub/Sub token verification)
    - Input validation approach (Zod on all endpoints)
    - Threat model (XSS mitigated by httpOnly cookie; CSRF mitigated by SameSite=Lax; injection mitigated by Zod + Mongoose ODM)

---

### T071 — Top-level README
- **Depends on:** T064
- **Plan ref:** `09-execution-timeline.md` §Day 27
- **Done when:**
  - [ ] `README.md` at repo root covers:
    - Project overview (2–3 sentences)
    - Architecture summary with a simple diagram or link to the SOA diagram
    - Services list with one-line description each
    - Live demo links: web URL + APK download link / QR code
    - Setup instructions: prerequisites, how to run locally, how to deploy
    - Team roles table
  - [ ] README renders correctly on GitHub

---

## Phase 20 — Demo Preparation (Final week)

---

### T072 — Take screenshots of all key screens
- **Depends on:** T064
- **Plan ref:** `09-execution-timeline.md` §Day 25-26
- **Done when:**
  - [ ] Screenshots saved in `docs/screenshots/`:
    - Web: login, feed, post composer, job listing, job apply, events, event detail, research, messages, analytics dashboard
    - Mobile: login, feed, post card, jobs, job detail, events, messages chat, notifications, profile
  - [ ] Screenshots show real data (not empty states)

---

### T073 — Demo script + rehearsal
- **Depends on:** T064, T072
- **Plan ref:** `09-execution-timeline.md` §Demo Script
- **Done when:**
  - [ ] Demo script written and saved in `docs/demo-script.md` following the template in `09-execution-timeline.md`
  - [ ] Demo rehearsed end-to-end at least once with the full team watching
  - [ ] Total runtime ≤ 3 minutes (timed with a stopwatch)
  - [ ] All demo accounts pre-created in production (student, alumni, admin)
  - [ ] Demo flows tested on production URLs immediately before the demo date

---

## Submission Checklist (Final Verification)

Use this as the last check before submitting:

### Technical
- [ ] All 8 functional requirement areas working on both web and mobile
- [ ] Web client live on Vercel; custom domain `decp.app` resolving
- [ ] Flutter APK built and accessible (Google Drive link or QR code)
- [ ] All 10 Cloud Run services `READY` (9 backend + 1 gateway)
- [ ] MongoDB Atlas connected with seed data
- [ ] Cloudflare R2 media upload working end-to-end
- [ ] Pub/Sub events flowing: create post → notification-service logs message received → push notification on mobile
- [ ] FCM push notifications working on Android

### Architecture
- [ ] SOA service-interaction diagram ✅
- [ ] Enterprise architecture diagram ✅
- [ ] Product modularity diagram ✅
- [ ] Deployment diagram ✅
- [ ] All diagrams match actual deployed implementation ✅

### Documentation
- [ ] Implementation details ✅
- [ ] Cloud deployment details ✅
- [ ] Research findings ✅
- [ ] Design justifications (NFR) ✅
- [ ] Security architecture ✅
- [ ] Screenshots (web + mobile) ✅
- [ ] Demo links in README ✅
- [ ] GitHub repo public with clean README ✅

### Process
- [ ] GitHub Actions CI/CD pipeline working (push to main → auto deploy)
- [ ] Demo rehearsed and timed at ≤ 3 minutes ✅
- [ ] All role deliverables completed ✅

---

## Quick Dependency Reference

This table lets you quickly find which tasks become unblocked when a task completes.

| Task completed | Unblocks |
|----------------|----------|
| T001 | T016, T037 |
| T002 | T009, T011, T013, T014, T015, T038, T039, T040, T041 |
| T003 | T013, T039 |
| T004 | T038, T025 (firebase env vars), T031 |
| T005 | T006, T007, T008, T009, T011, T013, T014, T015, T025, T031 |
| T006 | T013, T041 |
| T007 | T013, T014, T015, T047, T048, T049, T050 |
| T008 | T017 |
| T009 | T010, T017 |
| T010 | T024 |
| T011 | T012, T017 |
| T012 | T023 |
| T013 | T017, T027 (after T020) |
| T014 | T017, T028 (after T021) |
| T015 | T017, T029 (after T022) |
| T016 | T018, T019, T020, T021, T022, T042, T043, T044, T045 |
| T017 | T018, T019, T020, T021, T022 |
| T018–T022 (all) | T023 |
| T023 | T025 (gateway URL ready), T024, T060 |
| T025 | T026 |
| T026 | T027, T028, T029, T030, T051, T052, T053, T054 |
| T031 | T032 |
| T032 | T033, T034, T035, T036, T055, T056, T057, T058, T059 |
| T037 | T042 (endpoint URL), T043 (endpoint URL), T047, T048, T049, T050 |
| T038 | T042 |
| T039 | T045 |
| T040 | T044 |
| T041 | T043 |
| T042, T043, T044, T045 | T046 |
| T046 | T052, T053, T054, T057, T058, T059 |
| T047–T050 | T064 (pub/sub flow test) |
| T061–T063 | T064 |
| T064 | T065, T067, T068, T069, T070, T071, T072 |
| T072 | T073 |
