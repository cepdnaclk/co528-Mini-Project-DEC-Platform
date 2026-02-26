# CO528 Mini Project - Comprehensive Analysis

## 1. Project at a Glance

## 1.1 Module and Marks
- Module: CO528 Applied Software Architecture
- Assessment: Mini Project
- Marks: 15

## 1.2 Core Objective
Build a department engagement platform for current students and alumni with both web and mobile clients. The platform should support social interaction, opportunities, collaboration, and departmental communication.

## 1.3 What the examiners care about most
- Strong software architecture decisions
- Modular services and integration quality
- Cloud deployment readiness
- Both web and mobile consuming backend APIs
- Clear quality-attribute justifications

The brief explicitly says focus is **architecture and integration**, not full feature completeness.

## 2. Mandatory Team Setup

## 2.1 Group size
- 4-5 members

## 2.2 Required roles
- Enterprise Architect
- Solution Architect
- Application Architect
- Security Architect
- DevOps Architect

Note: If you have only 4 members, one member must handle two roles.

## 3. Functional Scope You Must Implement

The brief lists 8 required capability areas:

1. User Management
- Register/login
- Edit profile
- Roles: student, alumni, admin
- Authentication + authorization for web and mobile

2. Feed & Media Posts
- Text posts
- Image/video upload
- Like/comment/share

3. Jobs & Internships
- Post opportunities
- Apply through web/mobile

4. Events & Announcements
- Department events/workshops
- RSVP
- Notifications

5. Research Collaboration
- Create projects
- Share documents
- Invite collaborators

6. Messaging
- Direct messaging and/or group chat

7. Advanced Notifications
- Event-driven notifications
- Push notifications

8. Analytics Dashboard
- Active users
- Popular posts
- Job application metrics

## 4. Architecture Requirements (Strict)

Your submission must demonstrate all these architecture styles/concepts:

1. SOA
- Each module should be a separate service
- APIs must be clearly defined

2. Web-Oriented Architecture
- Web client consumes backend APIs

3. Mobile Architecture
- Mobile client consumes the same backend APIs

4. Cloud Architecture
- Backend + database deployed on cloud (AWS/GCP/Azure)

5. Enterprise Architecture
- High-level system diagram showing user roles, module integration, and departmental workflow

6. Product Architecture
- Modular product structure
- Core features vs optional features
- Reusable components and maintainability approach

## 5. Research Requirement (Often Missed)

You are required to analyze real-world platforms (explicitly Facebook, LinkedIn, similar networks) and include:
- What architectures/patterns they use (at high level)
- Missing features in those systems relevant to your department context
- Improvements your platform proposes
- How this research influenced your design choices

This must appear in both documentation and presentation.

## 6. Required Deliverables

## 6.1 Documentation package
1. Architecture diagrams
- SOA/service interaction and APIs
- Enterprise architecture
- Product modularity (core + optional)
- Deployment diagram (cloud, DB, media storage)

2. Implementation details
- Features implemented
- Web/mobile integration
- Inter-service communication

3. Cloud deployment details
- Where backend and DB are deployed
- Scalability considerations

4. Research findings
- Platform comparisons
- Missing features
- Proposed improvements

5. Justifications
- Design decisions
- Modularity decisions
- Quality attributes (performance, scalability, security, maintainability, availability, etc.)

6. Additional artifacts
- Screenshots
- Demo links
- README
- GitHub repository with code

## 6.2 Running system deliverables
- Functional web client for core features
- Functional mobile client for core features
- Live cloud backend and database

## 7. Demo Constraints and Implications

- One member presents
- Demo time: maximum 3 minutes
- Demo happens after 4 weeks from project start

Implication: you need a short, scripted demo path showing architecture + key end-to-end flows rather than many partially working features.

## 8. Evaluation Criteria Interpreted as Action Items

1. Architecture Design
- Produce clear, correct diagrams
- Keep services/modules consistent with implementation

2. Implementation and Functionality
- Ensure core services actually work
- Web and mobile must both integrate with backend
- Module communication must be visible and reliable

3. Cloud Deployment and Scalability
- Live cloud-hosted backend + DB is mandatory
- Explain scaling approach (horizontal scaling, caching, queueing, CDN/media strategy, etc.)

4. Documentation and Presentation
- Clear explanation of architecture and deployment steps
- Professional 3-minute demo

## 9. Minimum Viable Scope Strategy (Recommended)

Because time is 4 weeks and focus is architecture, implement a robust core slice:

1. Core services to prioritize first
- Auth/User service
- Feed service
- Jobs service
- Events service
- Notification service

2. Secondary services (if time permits)
- Messaging service
- Research collaboration service
- Analytics service

3. Optional/bonus
- Advanced push notification channels
- Better recommendation/insight features

## 10. Suggested 4-Week Execution Plan

## Week 1: Architecture and Foundations
- Finalize requirements and role ownership
- Complete architecture diagrams (first version)
- Decide service boundaries, API contracts, and data ownership
- Set up mono-repo or poly-repo structure
- Prepare CI/CD skeleton and cloud environments

## Week 2: Core Implementation
- Build auth, feed, jobs, events services
- Build web client integration for core flows
- Build mobile client integration for same API flows
- Add basic notification pipeline

## Week 3: Integration + Nonfunctional Quality
- Complete cross-service communication
- Add security hardening (JWT, RBAC, input validation)
- Add observability basics (logs, health checks)
- Deploy backend + DB + storage to cloud
- Start research comparison section and justifications

## Week 4: Stabilization + Submission Assets
- Fix defects and close critical missing flows
- Finalize documentation and diagrams aligned with actual implementation
- Produce screenshots, README, and demo script
- Rehearse 3-minute demo with strict timing

## 11. Role-by-Role Responsibility Mapping

## Enterprise Architect
- Enterprise diagram and business workflow
- Role definitions and module interactions

## Solution Architect
- End-to-end architecture consistency
- Technology selection and cross-cutting design decisions

## Application Architect
- Service boundaries, API design, and client integration
- Product modularity and maintainability structure

## Security Architect
- AuthN/AuthZ model
- Data protection, secure API practices, threat considerations

## DevOps Architect
- Cloud infrastructure and deployment pipeline
- Scalability, reliability, monitoring, and release flow

## 12. Quality Attributes You Should Explicitly Justify

At minimum include concise rationale for:
- Scalability
- Security
- Availability
- Maintainability
- Performance
- Interoperability (web/mobile shared API)

For each attribute, document:
- Design choice made
- Why it supports the attribute
- Tradeoff introduced

## 13. Submission-Readiness Checklist

Use this as final validation before demo/submission:

1. Team and role requirements satisfied
2. Web and mobile both run and consume backend APIs
3. Core modules implemented and integrated
4. Backend + DB live on cloud
5. All four diagram types completed
6. Research comparison section completed
7. Design and quality justifications completed
8. GitHub repo organized with clear README
9. Demo path rehearsed to <= 3 minutes
10. Documentation matches the implemented system

## 14. Common Failure Points to Avoid

- Strong UI but weak architecture evidence
- Diagrams not matching actual code/services
- Mobile app not actually consuming same backend API set
- Local-only backend/database (not cloud-hosted)
- Missing research + missing-feature analysis
- No explicit quality-attribute tradeoff discussion
- Overloading demo with too many unstable features

## 15. Final Interpretation of "What we have to do"

You need to deliver a **cloud-deployed, architecture-first, modular platform** with **working web + mobile clients**, backed by **clear architectural evidence**, **real-world platform research**, and a **tight 3-minute demo** after 4 weeks. Feature breadth matters, but architecture clarity, integration correctness, and justified design decisions matter most for marks.
