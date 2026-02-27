# DECP – Non-Functional Requirements (Quality Attributes)

This document covers each required quality attribute with: the design choice made, why it supports that attribute, and the tradeoff introduced. This section is directly relevant to the **Justifications** deliverable and **Evaluation Criteria** for quality attribute consideration.

---

## 1. Scalability

### Design Choice
- Deploy all backend services on **GCP Cloud Run** with `min-instances=0`, `max-instances=5–10`
- Each service scales **independently** — a spike in feed requests does not affect the jobs service
- Stateless services (no in-memory session state) — any instance can handle any request
- MongoDB Atlas supports **connection pooling** — multiple Cloud Run instances share pooled connections

### Why It Supports Scalability
Cloud Run provides **horizontal auto-scaling** triggered by request concurrency. When traffic increases, new container instances are started automatically within seconds. Because each DECP service is independently deployable and stateless, the platform can scale the busiest services (e.g., feed-service) without scaling idle ones (e.g., analytics-service).

The SOA pattern itself is a scalability enabler — monolithic services cannot be partially scaled.

### Tradeoff
- **Cold start latency:** With `min-instances=0`, the first request after idle can take 1–3 seconds while a new container starts. For a prototype with low traffic this is acceptable; in production, set `min-instances=1` on critical services (gateway, auth, feed).
- **Shared MongoDB M0 cluster:** All services share one Atlas M0 free-tier cluster. Under high concurrent load this could become a bottleneck. In production, each service would have a dedicated cluster.

### Scalability Path to Production
| Current (Prototype)             | Production Upgrade                          |
|---------------------------------|---------------------------------------------|
| min-instances=0 (cold starts)   | min-instances=1 on critical services        |
| Shared Atlas M0 cluster         | Dedicated M10+ cluster per high-traffic DB  |
| No caching layer                | Redis (GCP Memorystore) for feed caching    |
| Single messaging instance       | Redis Pub/Sub for WS fan-out across instances|

---

## 2. Security

### Design Choice
- **Stateless JWT** authentication: 15-minute access tokens + 7-day refresh tokens with rotation
- **RBAC** enforced at service level using the role claim injected by the gateway
- **Bcrypt (12 rounds)** for password hashing
- **Network isolation**: core services use internal ingress; notification/analytics expose only Pub/Sub push endpoints and protect app routes with `X-Internal-Token`
- **Pre-signed R2 URLs** for file uploads: files never pass through application servers
- **Rate limiting** at gateway: 200 req/15min global, 10 req/15min on auth endpoints
- **GCP Secret Manager** for all secrets: no secrets in code or Docker images

### Why It Supports Security
Multiple independent layers mean that compromising one layer does not automatically compromise the system:
1. Even if an access token is stolen, it expires in 15 minutes
2. Even if a service is compromised, it cannot reach other internal services without the internal token
3. Even if the database is exposed, passwords are bcrypt-hashed and computationally expensive to crack
4. Even if a user tries to upload malware, the whitelist rejects non-media file types

### Tradeoff
- **Short access token lifetime** requires frequent refresh calls, adding minor network overhead
- **httpOnly cookies** for web refresh tokens require `withCredentials: true` on all axios requests and careful CORS configuration
- **bcrypt 12 rounds** adds ~250ms to login — acceptable for security but slightly slower login UX

---

## 3. Availability

### Design Choice
- **GCP Cloud Run SLA**: 99.95% uptime for Cloud Run services
- **MongoDB Atlas SLA**: 99.995% for M0+ tiers with replica sets
- **Health check endpoints** (`GET /health`) on every service — Cloud Run uses these for liveness probes
- **Graceful degradation**: If the notification-service is down, Pub/Sub retains messages and redelivers when it comes back up; other services are unaffected
- **Gateway error handling**: If a downstream service is unreachable, the gateway returns `502` (not a crash) and logs the error

### Why It Supports Availability
The **independent deployability** of SOA means that one failing service does not take down the whole platform. A user can still browse the feed and apply for jobs even if the analytics service is down. Pub/Sub provides **durable message queuing** — messages are retained for 7 days by default, ensuring no events are lost even if subscribers are temporarily unavailable.

### Tradeoff
- **Scale-to-zero cold starts** introduce brief unavailability (1–3s) for idle services. This is the direct cost of the free tier / cost-saving decision.
- **Single Atlas M0 cluster** is a single point of failure for all data. In production, Atlas provides multi-region failover with dedicated tiers.

---

## 4. Maintainability

### Design Choice
- **SOA with independent services**: each service has a single, well-defined responsibility — the "Single Responsibility Principle" at service level
- **Monorepo structure** with consistent directory layout: every service follows the same `src/routes`, `src/controllers`, `src/models`, `src/middleware` layout
- **Standard response envelope** (`{ success, data }` or `{ success, error }`) across all services — consistent for both consumers and developers
- **Versioned API prefix** (`/api/v1/`): allows introducing `v2` without breaking existing clients
- **Zod schemas** serve as living documentation for expected request shapes
- **GitHub Actions CI/CD**: automated builds prevent broken code from reaching production

### Why It Supports Maintainability
Each service can be understood, modified, and tested in isolation. A new team member can onboard to a single service (e.g., jobs-service) without needing to understand the whole system. The consistent internal structure means patterns learned in one service apply to all others.

Feature additions follow a predictable pattern:
1. Add Mongoose model (if new data)
2. Add Zod validation schema
3. Add controller function
4. Register route with appropriate RBAC middleware
5. Publish Pub/Sub event (if other services need to react)

### Tradeoff
- **Service proliferation**: 10 services is significant overhead for a 4-person team. In a production environment this would have dedicated owners; in this prototype the team must context-switch between services.
- **Data duplication**: Denormalised fields (e.g., `authorName` on posts) avoid joins but mean the same name is stored in multiple places. If a user changes their name, old posts still show the old name — acceptable in a prototype.

---

## 5. Performance

### Design Choice
- **Cursor-based pagination** on the feed (not offset-based): `?cursor=<last_post_id>&limit=20`. This performs consistently at scale because it uses indexed `_id` comparisons, not `SKIP` operations.
- **Denormalisation**: Author name and avatar URL are stored on the post document itself, eliminating a cross-service join on every feed request
- **Cloudflare R2** for media: R2 has a global CDN with PoPs worldwide. Media (images, videos) is served directly from CDN without hitting Cloud Run
- **SWR/Riverpod caching** on clients: data is cached in-memory on both web and mobile, so navigating back to a page shows immediately cached data before revalidating
- **MongoDB indexes** on all query fields: see deployment plan for full index list

### Why It Supports Performance
Cursor-based pagination ensures the feed query is O(1) regardless of total post count (using `_id > cursor` with index). Serving media via Cloudflare R2's CDN reduces latency to the nearest edge node for users globally, and avoids Cloud Run bandwidth costs.

Denormalisation trades storage for query speed — instead of calling user-service to get author info on every post render, it's stored inline with the post.

### Tradeoff
- **Denormalisation inconsistency**: If a user changes their display name, old posts show the old name. In production, a background job would update denormalised fields.
- **No response caching layer**: In the prototype, every API request hits the database. In production, a Redis cache would store hot feed content and invalidate on new posts.
- **Cold start latency** (same as scalability tradeoff): first request after idle has elevated latency.

### Target Performance Metrics (Prototype)
| Endpoint                    | Target P95 Latency |
|-----------------------------|-------------------|
| GET /api/v1/feed/posts      | < 500ms            |
| POST /api/v1/auth/login     | < 400ms (bcrypt)  |
| GET /api/v1/jobs            | < 300ms            |
| GET /api/v1/events          | < 300ms            |
| Media load (R2 CDN)         | < 200ms            |

---

## 6. Interoperability

### Design Choice
- **Single REST API** consumed by both web (Next.js) and mobile (Flutter) clients — same base URLs, same endpoints, same JSON response format
- **JWT in `Authorization: Bearer` header** — a universal standard supported natively by both web and mobile HTTP clients
- **JSON throughout**: no custom binary formats, no GraphQL (keeps clients simple and debuggable)
- **API versioning** (`/api/v1/`): future clients (desktop app, third-party integrations) can consume the same API
- **Cloudflare R2 with S3-compatible API**: media storage is not vendor-locked to GCP; the R2 SDK is the standard AWS SDK configured with a different endpoint
- **Firebase FCM**: a cross-platform push notification standard that works on Android, iOS, and Web from a single server SDK

### Why It Supports Interoperability
The same REST + JWT + JSON contract means any HTTP client can consume the DECP backend. The web and mobile apps are architecturally identical from the backend's perspective — there is no web-only or mobile-only API. This is a direct demonstration of the Web-Oriented and Mobile Architecture requirements.

Using open standards (REST, JWT, JSON, S3 API) prevents vendor lock-in and allows future clients to be built without changes to the backend.

### Tradeoff
- **REST over gRPC**: REST with JSON is slightly less efficient than binary gRPC, but is universally supported by browsers without additional tooling. For a student project, REST is the right choice.
- **No API schema contract (OpenAPI)**: In production, all endpoints should be documented in an OpenAPI spec. For this prototype, the plans document serves as the contract. Adding Swagger/OpenAPI would improve interoperability for future consumers.
- **Shared JWT secret** (HS256): All services share one JWT secret for verification. In production, RS256 (public/private key pair) would allow services to verify tokens without knowing the signing secret.

---

## 7. Summary Table

| Quality Attribute | Key Decision                              | Tradeoff                                    |
|-------------------|-------------------------------------------|---------------------------------------------|
| Scalability       | Cloud Run independent auto-scaling        | Cold starts with min-instances=0            |
| Security          | JWT + RBAC + network isolation + bcrypt   | Short token lifetime adds refresh overhead  |
| Availability      | SOA fault isolation + Pub/Sub durability  | Cold starts; M0 shared cluster SPOF         |
| Maintainability   | Consistent SOA structure + monorepo       | Service proliferation overhead for small team|
| Performance       | Cursor pagination + CDN media + indexes   | Denormalisation inconsistency on name change|
| Interoperability  | REST + JWT + JSON standard across clients | REST less efficient than gRPC               |
