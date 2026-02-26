# DECP – Architecture Overview
## Department Engagement & Career Platform

---

## 1. Platform Summary

DECP is a cloud-deployed, service-oriented platform for the University of Peradeniya Department of Computer Engineering. It connects current students and alumni through social features, career tools, research collaboration, and departmental communication. Both a Next.js web client and a Flutter mobile client consume the same backend APIs, demonstrating SOA + Web-Oriented + Mobile architecture patterns simultaneously.

---

## 2. Final Technology Stack

| Layer              | Technology                          | Rationale                                                              |
|--------------------|-------------------------------------|------------------------------------------------------------------------|
| Backend Services   | Node.js + Express                   | Lightweight, fast to build, huge ecosystem, team familiarity           |
| Runtime Container  | Docker                              | Consistent across dev and cloud                                       |
| Cloud Runtime      | GCP Cloud Run                       | Serverless containers, scale-to-zero, free tier, per-service isolation |
| Database           | MongoDB Atlas M0 (free tier)        | Flexible schema, free tier adequate for prototype, easy setup          |
| Object Storage     | Cloudflare R2                       | S3-compatible, zero egress fee, free 10 GB, ideal for media/docs      |
| Async Messaging    | Google Cloud Pub/Sub                | Managed, free 10 GB/month, decouples notification events              |
| Push Notifications | Firebase Cloud Messaging (FCM)      | Free, supports both web and Flutter mobile                             |
| Web Client         | Next.js 14 (App Router)             | SSR + CSR, Vercel deployment, shared API layer                        |
| Web Hosting        | Vercel (free hobby tier)            | Zero-config Next.js deployment, global CDN                            |
| Mobile Client      | Flutter                             | Single codebase for Android/iOS, strong widget ecosystem              |
| CI/CD              | GitHub Actions                      | Free for public repos, automates build + deploy to Cloud Run          |
| Auth               | JWT (access + refresh tokens)       | Stateless, works across web and mobile                                |

---

## 3. Service Map

```
                        ┌─────────────────────────────────────┐
                        │         CLIENTS                     │
          ┌─────────────┴──────────┐        ┌────────────────┴──────────┐
          │   Next.js Web App      │        │   Flutter Mobile App       │
          │   (Vercel)             │        │   (Android / iOS)          │
          └─────────────┬──────────┘        └────────────────┬──────────┘
                        │                                     │
                        │  HTTPS REST (JSON)                  │
                        └───────────────┬─────────────────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │      API GATEWAY            │
                          │  (Cloud Run: gateway-svc)   │
                          │  - JWT validation           │
                          │  - Rate limiting            │
                          │  - Request routing          │
                          └──────────┬─────────────────┘
                                     │
        ┌──────────────────┬─────────┼───────────┬──────────────────────┐
        │                  │         │           │                      │
   ┌────▼────┐       ┌─────▼───┐ ┌──▼──────┐ ┌──▼──────┐        ┌──────▼─────┐
   │  auth   │       │  user   │ │  feed   │ │  jobs   │        │  events    │
   │ service │       │ service │ │ service │ │ service │        │  service   │
   └─────────┘       └─────────┘ └─────────┘ └─────────┘        └────────────┘
        │                  │         │           │                      │
        └──────────────────┴────┬────┴───────────┴──────────────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
  ┌─────▼──────┐       ┌────────▼────┐        ┌──────────▼──────┐
  │  research  │       │  messaging  │        │  notification   │
  │  service   │       │   service   │        │    service      │
  └────────────┘       └─────────────┘        └─────────────────┘
        │                       │                        │
        └───────────────────────┴──────────┬─────────────┘
                                           │
                                 ┌─────────▼──────────┐
                                 │  analytics service  │
                                 └────────────────────┘

  ──────────────────────────────────────────────────────────────────
  SHARED INFRASTRUCTURE
  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐
  │  MongoDB Atlas M0  │  │  Cloudflare R2     │  │  GCP Pub/Sub   │
  │  (9 logical DBs)   │  │  (media + docs)    │  │  (events bus)  │
  └────────────────────┘  └────────────────────┘  └────────────────┘
```

---

## 4. Services at a Glance

| Service              | Cloud Run Name        | Responsibility                                      | MongoDB DB         |
|----------------------|-----------------------|-----------------------------------------------------|--------------------|
| API Gateway          | `decp-gateway`        | Route, auth-check, rate-limit                       | none               |
| Auth Service         | `decp-auth`           | Register, login, JWT issue/refresh                  | `decp_auth`        |
| User Service         | `decp-users`          | Profile CRUD, role management                       | `decp_users`       |
| Feed Service         | `decp-feed`           | Posts, likes, comments, media upload                | `decp_feed`        |
| Jobs Service         | `decp-jobs`           | Job/internship postings, applications               | `decp_jobs`        |
| Events Service       | `decp-events`         | Events, announcements, RSVP                         | `decp_events`      |
| Research Service     | `decp-research`       | Projects, documents, collaborators                  | `decp_research`    |
| Messaging Service    | `decp-messaging`      | DM and group chat via WebSocket                     | `decp_messaging`   |
| Notification Service | `decp-notifications`  | In-app + push notifications via FCM                 | `decp_notifications`|
| Analytics Service    | `decp-analytics`      | Aggregate metrics for admin dashboard               | `decp_analytics`   |

---

## 5. Monorepo Structure

```
decp/
├── services/
│   ├── gateway/
│   ├── auth-service/
│   ├── user-service/
│   ├── feed-service/
│   ├── jobs-service/
│   ├── events-service/
│   ├── research-service/
│   ├── messaging-service/
│   ├── notification-service/
│   └── analytics-service/
├── web/                    # Next.js 14 app
├── mobile/                 # Flutter app
├── infra/                  # Cloud Run YAML, deploy scripts
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions CI/CD
└── README.md
```

Each backend service follows this internal structure:
```
<service-name>/
├── src/
│   ├── routes/             # Express route definitions
│   ├── controllers/        # Request/response handlers
│   ├── models/             # Mongoose schemas
│   ├── middleware/         # Input validation, auth
│   ├── services/           # Business logic
│   └── index.js            # App entry point (PORT = process.env.PORT || 8080)
├── Dockerfile
├── package.json
└── .env.example
```

---

## 6. Architecture Styles Demonstrated

| Required Style            | How DECP Demonstrates It                                                 |
|---------------------------|--------------------------------------------------------------------------|
| SOA                       | 9 independent services, each with well-defined REST APIs                 |
| Web-Oriented Architecture | Next.js web client consumes all 9 backend services via API gateway       |
| Mobile Architecture       | Flutter app consumes the same API endpoints as the web client            |
| Cloud Architecture        | All services deployed on GCP Cloud Run; DB on MongoDB Atlas              |
| Enterprise Architecture   | Gateway + role-based access + departmental workflow across all modules   |
| Product Architecture      | Core modules (auth, feed, jobs, events) vs optional (research, messaging, analytics) |

---

## 7. Key Architectural Decisions

### Decision 1: API Gateway over Direct Service Access
**Choice:** All clients talk to a single gateway service, not individual services directly.
**Rationale:** Single entry point for auth validation, rate limiting, and CORS. Clients need only one base URL. Matches SOA enterprise integration patterns.
**Tradeoff:** Gateway is a single point of failure; mitigated by Cloud Run's auto-scaling and health checks.

### Decision 2: Shared MongoDB Atlas Cluster, Logical DB Separation
**Choice:** One M0 Atlas cluster, but each service uses its own database (`decp_auth`, `decp_feed`, etc.).
**Rationale:** M0 free tier has a single cluster; logical separation ensures each service owns its data and no service directly queries another's database.
**Tradeoff:** All services share the same cluster resources; in production this would be one cluster per service.

### Decision 3: Cloudflare R2 for Media
**Choice:** Clients upload media directly to R2 using pre-signed URLs generated by the feed/research service.
**Rationale:** Zero egress cost, S3-compatible API, avoids bandwidth costs through Cloud Run. Free tier: 10 GB storage, 1M Class A operations/month.
**Tradeoff:** More complex upload flow (get pre-signed URL → upload directly → save R2 URL to DB).

### Decision 4: GCP Pub/Sub for Async Events
**Choice:** Services publish domain events (post created, job posted, event RSVP) to Pub/Sub topics; notification-service and analytics-service subscribe.
**Rationale:** Decouples event-producing services from notification/analytics consumers. Prevents tight coupling. Matches the "Advanced Notifications – Event Driven" requirement explicitly.
**Tradeoff:** Adds operational complexity; free tier (10 GB/month) is more than sufficient for prototype.

### Decision 5: JWT (Stateless Auth)
**Choice:** Auth service issues short-lived access tokens (15 min) + long-lived refresh tokens (7 days) stored in httpOnly cookies on web and secure storage on mobile.
**Rationale:** Stateless verification — each service can verify tokens independently without calling auth-service on every request. The gateway performs token validation before forwarding.
**Tradeoff:** Access tokens cannot be individually revoked before expiry; mitigated by short expiry window.

---

## 8. API Base URL Convention

| Environment | Base URL                                      |
|-------------|-----------------------------------------------|
| Production  | `https://api.decp.app` (custom domain on GCP) |
| Web         | `NEXT_PUBLIC_API_URL` in Vercel env vars       |
| Mobile      | `API_BASE_URL` constant in Flutter             |

All API endpoints follow the pattern: `{BASE_URL}/api/v1/{service}/{resource}`

Example:
- `POST /api/v1/auth/login`
- `GET  /api/v1/feed/posts`
- `POST /api/v1/jobs/apply`

---

## 9. Cost Estimate (Monthly, Prototype Traffic)

| Service               | Free Tier                          | Expected Usage       | Cost     |
|-----------------------|------------------------------------|----------------------|----------|
| GCP Cloud Run         | 2M requests, 180K vCPU-sec/month   | ~5K requests/month   | $0       |
| MongoDB Atlas M0      | 512 MB storage                     | < 50 MB for demo     | $0       |
| Cloudflare R2         | 10 GB storage, 1M ops/month        | < 500 MB             | $0       |
| GCP Pub/Sub           | 10 GB/month                        | < 1 MB               | $0       |
| Firebase FCM          | Unlimited basic push notifications | < 1K notifications   | $0       |
| Vercel                | 100 GB bandwidth/month             | < 1 GB               | $0       |
| **Total**             |                                    |                      | **$0**   |
