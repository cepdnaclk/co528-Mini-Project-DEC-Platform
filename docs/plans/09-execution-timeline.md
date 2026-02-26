# DECP – 4-Week Execution Timeline

**Constraint:** 4 weeks, 4–5 team members, 3-minute demo at end.
**Strategy:** Architecture-first. Get core services running before adding secondary features. Diagrams must match the actual implementation.

---

## Role Assignments

| Role                  | Primary Responsibilities                                                  |
|-----------------------|---------------------------------------------------------------------------|
| Enterprise Architect  | High-level diagrams, business workflow, role definitions, research section|
| Solution Architect    | Technology decisions, API contracts, cross-service design consistency     |
| Application Architect | Service boundaries, API implementation, client integration                |
| Security Architect    | Auth implementation, RBAC, input validation, threat documentation        |
| DevOps Architect      | Docker, Cloud Run deployment, CI/CD, MongoDB Atlas, Cloudflare R2        |

*If only 4 members: Solution Architect also takes DevOps responsibilities.*

---

## Week 1: Architecture & Foundation (Days 1–7)

### Goal
Complete all architecture diagrams, agree on all API contracts, set up all infrastructure, start coding auth and user services.

### Day 1–2: Kickoff and Design
- [ ] **All:** Read project brief, review these plan documents, assign roles
- [ ] **Enterprise Architect:** Draft enterprise architecture diagram (roles, modules, departmental workflow)
- [ ] **Solution Architect:** Finalise tech stack decisions (confirm this plan), create API contract document listing all 9 services and their endpoints
- [ ] **DevOps Architect:** Create GCP project, enable Cloud Run + Pub/Sub + Secret Manager APIs, create MongoDB Atlas M0 cluster, create Cloudflare R2 bucket
- [ ] **Application Architect:** Create GitHub monorepo, set up folder structure for all services + web + mobile
- [ ] **Security Architect:** Document auth model, RBAC table, threat model

### Day 3–4: Diagrams
- [ ] **Enterprise Architect:** Complete SOA service-interaction diagram (ASCII or draw.io)
- [ ] **Enterprise Architect:** Complete product modularity diagram (core vs optional)
- [ ] **Solution Architect:** Complete deployment diagram (Cloud Run, Atlas, R2, Vercel, Firebase)
- [ ] **All:** Review and approve all diagrams — these must match the implementation

### Day 5–7: Foundation Code
- [ ] **Application Architect + Security Architect:** Implement `auth-service` (register, login, refresh, logout)
- [ ] **DevOps Architect:** Write `scripts/seed-admin.js` to seed the initial admin user into MongoDB (required before demo — run once after first deployment, see `01-backend-services.md` auth-service section for script)
- [ ] **Application Architect:** Implement `user-service` (profile CRUD, role management)
- [ ] **DevOps Architect:** Write `Dockerfile` template, test local Docker builds for auth + user
- [ ] **DevOps Architect:** Create `.github/workflows/deploy.yml` skeleton
- [ ] **Application Architect:** Bootstrap `web/` Next.js app with Tailwind + shadcn/ui + Zustand auth store
- [ ] **Application Architect:** Bootstrap `mobile/` Flutter app with Riverpod + go_router

### Week 1 Deliverables
- [ ] All 4 architecture diagrams drafted
- [ ] auth-service and user-service running locally
- [ ] MongoDB Atlas connected and tested
- [ ] Next.js and Flutter projects bootstrapped with login/register screens

---

## Week 2: Core Services Implementation (Days 8–14)

### Goal
Build and test the 5 core services. Web and mobile clients consume auth + feed + jobs + events APIs.

### Day 8–9: Feed Service
- [ ] **Application Architect:** Implement `feed-service` (posts CRUD, likes, comments)
- [ ] **Application Architect:** Implement R2 pre-signed URL endpoint for media upload
- [ ] **DevOps Architect:** Configure Cloudflare R2 bucket, test upload flow locally
- [ ] **Web team:** Build `/feed` page with `PostComposer` + `PostCard` + likes

### Day 10–11: Jobs and Events Services
- [ ] **Application Architect:** Implement `jobs-service` (listings, applications)
- [ ] **Application Architect:** Implement `events-service` (events, RSVP)
- [ ] **Web team:** Build `/jobs` and `/events` pages
- [ ] **Mobile team:** Build Feed screen, Jobs screen, Events screen

### Day 12–13: API Gateway
- [ ] **DevOps Architect + Security Architect:** Implement `gateway` service (routing, JWT validation, rate limiting, CORS)
- [ ] **All:** Update web and mobile clients to use gateway base URL (single URL)
- [ ] **DevOps Architect:** Deploy gateway to Cloud Run, test end-to-end HTTP through gateway

### Day 14: Integration Testing
- [ ] **All:** Test end-to-end flows: register → login → create post → like → apply for job → RSVP event
- [ ] **DevOps Architect:** Deploy auth-service, user-service, feed-service, jobs-service, events-service to Cloud Run
- [ ] **DevOps Architect:** Verify all internal services have `ingress: internal` set correctly

### Week 2 Deliverables
- [ ] 5 core services running on Cloud Run
- [ ] Web client consuming auth, feed, jobs, events APIs
- [ ] Mobile client consuming the same APIs
- [ ] Gateway deployed and routing correctly
- [ ] Media upload to R2 working end-to-end

---

## Week 3: Secondary Services, Integration & Hardening (Days 15–21)

### Goal
Add notification system, research collaboration, and begin messaging. Harden security. Complete research section.

### Day 15–16: Notification System (Pub/Sub + FCM)
- [ ] **Application Architect:** Implement `notification-service` (REST endpoints + Pub/Sub push handler)
- [ ] **DevOps Architect:** Create all Pub/Sub topics and subscriptions in GCP
- [ ] **Application Architect:** Add Pub/Sub `publish()` calls to feed-service, jobs-service, events-service
- [ ] **DevOps Architect:** Set up Firebase project, configure FCM
- [ ] **Web team:** Add FCM push notification registration to Next.js app
- [ ] **Mobile team:** Add `firebase_messaging` to Flutter app

### Day 17–18: Research Service + Messaging
- [ ] **Application Architect:** Implement `research-service` (projects, documents, collaborators)
- [ ] **Application Architect:** Implement `messaging-service` (REST + WebSocket)
- [ ] **Web team:** Build `/research` and `/messages` pages
- [ ] **Mobile team:** Build Messages screen with WebSocket client

### Day 19: Analytics Service
- [ ] **Application Architect:** Implement `analytics-service` (Pub/Sub subscriptions + REST endpoints)
- [ ] **Web team:** Build `/admin/analytics` page with Recharts
- [ ] **Mobile team:** Build Analytics screen for admin users

### Day 20: Security Hardening
- [ ] **Security Architect:** Add Zod validation to all remaining services
- [ ] **Security Architect:** Review all RBAC middleware — check every endpoint has correct role guards
- [ ] **Security Architect:** Test rate limiting, test invalid token rejection
- [ ] **Security Architect:** Verify httpOnly cookie behaviour on web
- [ ] **DevOps Architect:** Move all secrets to GCP Secret Manager, remove any plaintext secrets from code

### Day 21: Research & Documentation
- [ ] **Enterprise Architect:** Write "Research Findings" section: analyse Facebook + LinkedIn architectures, identify missing features, propose DECP improvements
- [ ] **Solution Architect:** Write "Design Justifications" section aligned with NFR plan (plan 08)
- [ ] **All:** Update architecture diagrams to match actual implemented code (critical — diagrams must match code)

### Week 3 Deliverables
- [ ] All 10 services deployed to Cloud Run
- [ ] Pub/Sub events flowing: post → notification → push
- [ ] Research section drafted
- [ ] All security measures in place
- [ ] Analytics dashboard working for admin

---

## Week 4: Stabilisation, Documentation & Demo Prep (Days 22–28)

### Goal
Fix bugs, finalise documentation, produce demo assets, rehearse demo.

### Day 22–23: Bug Fixes and Polish
- [ ] **All:** Fix any broken flows identified in week 3 integration testing
- [ ] **Web team:** Mobile-responsive styling on web client
- [ ] **Mobile team:** Polish UI — loading states, error messages, empty states
- [ ] **All:** Test all 8 functional requirements against both web and mobile clients

### Day 24: Deployment Verification
- [ ] **DevOps Architect:** Verify all 10 Cloud Run services are live and healthy
- [ ] **DevOps Architect:** Run `scripts/seed-admin.js` against production MongoDB to create the admin account
- [ ] **DevOps Architect:** Verify custom domain `api.decp.app` is resolving
- [ ] **DevOps Architect:** Write deployment instructions in README (step-by-step from scratch)
- [ ] **DevOps Architect:** Run smoke tests against production URLs

### Day 25–26: Documentation Package
- [ ] **Enterprise Architect:** Finalise all 4 architecture diagrams (clean, professional versions)
- [ ] **Solution Architect:** Write complete justifications document using NFR plan as base
- [ ] **Application Architect:** Write implementation details (features implemented, API list, inter-service communication description)
- [ ] **DevOps Architect:** Write cloud deployment details (infrastructure setup, scalability considerations)
- [ ] **Security Architect:** Write security architecture section (auth model, RBAC, threats)
- [ ] **All:** Take screenshots of all key screens (web + mobile)

### Day 27: README and GitHub
- [ ] **All:** Organise GitHub repo: clean commit history, meaningful commit messages
- [ ] **Application Architect:** Write top-level README (project overview, architecture summary, setup instructions, live demo links)
- [ ] **DevOps Architect:** Ensure CI/CD pipeline is working (push to main → auto deploy)

### Day 28: Demo Rehearsal
- [ ] **Demo presenter:** Write and rehearse 3-minute demo script (see below)
- [ ] **All:** Run through demo once and time it
- [ ] **All:** Final review of submission checklist

### Week 4 Deliverables
- [ ] All bugs fixed, all core flows working on web + mobile
- [ ] Complete documentation package
- [ ] GitHub repo clean and public with README
- [ ] Demo rehearsed and timed at ≤ 3 minutes
- [ ] Screenshots taken and included in docs

---

## 3-Minute Demo Script

**Objective:** Show architecture + end-to-end flows, not feature tours.

```
[0:00–0:20] Introduction (20 sec)
"DECP is a Department Engagement & Career Platform built on a Service-Oriented
Architecture with 9 independent microservices deployed on GCP Cloud Run. Both
a Next.js web client and a Flutter mobile app consume the same REST APIs."

[Show: architecture diagram briefly]

[0:20–1:00] Authentication + Profile (40 sec)
- Register a student account on web → shows JWT token being issued
- Log in on Flutter mobile with the same credentials → same backend
- Edit profile → photo uploads directly to Cloudflare R2 via pre-signed URL

[1:00–1:30] Feed + Notifications (30 sec)
- Create a post with an image on web
- Show the same post appearing on the Flutter app (same feed-service API)
- Show a push notification arriving on mobile (FCM via Pub/Sub event)

[1:30–2:00] Jobs + Events (30 sec)
- Alumni posts a job on web
- Student applies via Flutter mobile
- Admin creates an event; user RSVPs from web

[2:00–2:30] Architecture Evidence (30 sec)
"Each of these flows goes through our API gateway to a dedicated microservice.
Each service has its own MongoDB logical database. Events are propagated
asynchronously via GCP Pub/Sub to the notification service."
[Show: Cloud Run services dashboard with all 10 services live]

[2:30–3:00] Cloud + Closing (30 sec)
"All 10 services are live on GCP Cloud Run with scale-to-zero,
MongoDB Atlas is our database, Cloudflare R2 stores all media.
Total infrastructure cost: $0 per month on free tiers."
[Show: GCP Cloud Run dashboard]
```

---

## Submission Checklist

### Technical
- [ ] All 8 functional requirement areas working (at least partially)
- [ ] Web client (Next.js) live on Vercel and consuming backend APIs
- [ ] Flutter mobile app connecting to same backend APIs
- [ ] All backend services live on GCP Cloud Run
- [ ] MongoDB Atlas connected with data
- [ ] Cloudflare R2 media upload working
- [ ] Pub/Sub events flowing to notification-service
- [ ] FCM push notifications working on mobile

### Architecture
- [ ] SOA diagram (service interactions + API endpoints)
- [ ] Enterprise architecture diagram (roles, modules, workflow)
- [ ] Product modularity diagram (core vs optional)
- [ ] Deployment diagram (Cloud Run, Atlas, R2, Vercel)
- [ ] All diagrams match the actual implementation

### Documentation
- [ ] Implementation details (features, client integration, module communication)
- [ ] Cloud deployment details (setup steps, scalability considerations)
- [ ] Research findings (Facebook/LinkedIn analysis, missing features, improvements)
- [ ] Design justifications for all 6 quality attributes
- [ ] Screenshots of all key screens (web + mobile)
- [ ] Demo links (web URL + APK download / QR code)
- [ ] GitHub repository with clean README

### Process
- [ ] GitHub Actions CI/CD pipeline working
- [ ] Demo rehearsed and under 3 minutes
- [ ] All role deliverables completed

---

## Core vs Optional Feature Classification

### Core (must work for demo)
1. Register / Login / Profile edit
2. Feed: create post, view feed, like
3. Jobs: post job, apply for job
4. Events: create event, RSVP
5. Basic notifications (in-app)

### Secondary (demonstrate if time permits)
6. Research collaboration (projects + documents)
7. Direct messaging (WebSocket chat)
8. Push notifications (FCM)
9. Analytics dashboard

### Optional / Bonus
10. Group chat
11. Feed comments + shares
12. Job CV upload
13. Research collaborator invitations
