# DECP Implementation Plans Index

**Project:** Department Engagement & Career Platform (CO528 Mini Project)
**Module:** CO528 Applied Software Architecture – University of Peradeniya
**Marks:** 15

---

## Plan Files

| File | Contents | Primary Role |
|------|----------|-------------|
| [00-architecture-overview.md](./00-architecture-overview.md) | Full tech stack, service map, monorepo structure, key architectural decisions, cost estimate | Solution Architect |
| [01-backend-services.md](./01-backend-services.md) | All 9 backend services: API endpoints, MongoDB schemas, environment variables, Pub/Sub events | Application Architect |
| [02-api-gateway.md](./02-api-gateway.md) | Gateway design, route table, JWT middleware, rate limiting, CORS, WebSocket handling, full code | Application Architect / DevOps |
| [03-inter-service-communication.md](./03-inter-service-communication.md) | Synchronous HTTP calls map, Pub/Sub topics + subscriptions, message payload schemas, publisher/subscriber code patterns | Application Architect |
| [04-web-client-nextjs.md](./04-web-client-nextjs.md) | Next.js 14 project structure, auth flow, axios interceptor, page descriptions, SWR hooks, push notifications, Vercel deployment | Application Architect |
| [05-mobile-client-flutter.md](./05-mobile-client-flutter.md) | Flutter project structure, go_router navigation, Dio interceptor, Riverpod state, WebSocket messaging, FCM, pubspec.yaml | Application Architect |
| [06-cloud-deployment.md](./06-cloud-deployment.md) | GCP Cloud Run config, step-by-step deployment, GitHub Actions CI/CD, MongoDB Atlas setup, Cloudflare R2, Vercel, Firebase, scalability path | DevOps Architect |
| [07-security-architecture.md](./07-security-architecture.md) | JWT strategy, RBAC implementation, password hashing, input validation (Zod), file upload security, rate limiting, secrets management, threat table | Security Architect |
| [08-non-functional-requirements.md](./08-non-functional-requirements.md) | 6 quality attributes (scalability, security, availability, maintainability, performance, interoperability) each with: design choice, justification, tradeoff | All roles |
| [09-execution-timeline.md](./09-execution-timeline.md) | 4-week day-by-day plan, role assignments, demo script, submission checklist, core vs optional features | All roles |

---

## Tech Stack Summary

| Layer             | Technology                |
|-------------------|---------------------------|
| Backend (9 services) | Node.js + Express       |
| Cloud Runtime     | GCP Cloud Run             |
| Database          | MongoDB Atlas M0          |
| Object Storage    | Cloudflare R2             |
| Async Events      | GCP Pub/Sub               |
| Push Notifications| Firebase FCM              |
| Web Client        | Next.js 14 (App Router)   |
| Web Hosting       | Vercel                    |
| Mobile Client     | Flutter                   |
| CI/CD             | GitHub Actions            |
| Auth              | JWT (access + refresh)    |

**Estimated Monthly Cost: $0** (all free tiers)

---

## The 9 Backend Services

```
gateway → auth → users → feed → jobs → events → research → messaging → notifications → analytics
```

All services are deployed on GCP Cloud Run.
`decp-gateway` is the only client-facing public entry point.
`decp-auth`, `decp-users`, `decp-feed`, `decp-jobs`, `decp-events`, `decp-research`, and `decp-messaging` use internal ingress.
`decp-notifications` and `decp-analytics` expose public ingress only to receive Pub/Sub push delivery, and protect application routes using `X-Internal-Token`.

---

## Where to Start

1. Read `00-architecture-overview.md` first — it gives the full picture
2. Assign roles using `09-execution-timeline.md`
3. Start Week 1 tasks immediately on Day 1
4. Use `01-backend-services.md` as the API reference during implementation
5. Use `08-non-functional-requirements.md` for the Justifications documentation deliverable
