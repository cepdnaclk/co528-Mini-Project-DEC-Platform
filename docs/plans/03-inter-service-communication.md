# DECP – Inter-Service Communication Plan

---

## 1. Two Communication Patterns

DECP uses two communication patterns between services:

| Pattern       | Technology         | When to Use                                               |
|---------------|--------------------|-----------------------------------------------------------|
| Synchronous   | HTTP REST (internal) | Query data needed immediately to form a response          |
| Asynchronous  | Google Cloud Pub/Sub | Notify downstream services of domain events (fire & forget)|

Services never access another service's MongoDB database directly. All cross-service data access goes through APIs.

---

## 2. Synchronous (HTTP) Calls

### Service-to-Service Auth
Internal calls include a shared secret header to bypass JWT auth:
```
X-Internal-Token: <INTERNAL_SERVICE_SECRET>
```
Each service validates this header for routes marked as internal-only.
For notification/analytics public ingress services, the same token is required on `/api/v1/*` routes.

### Call Map

| Caller              | Callee              | Endpoint Called                          | Purpose                                                           |
|---------------------|---------------------|------------------------------------------|-------------------------------------------------------------------|
| analytics-service   | feed-service        | GET /api/v1/feed/posts/popular?limit=10  | Get top posts by likes for dashboard (internal endpoint)          |
| feed-service        | user-service        | GET /api/v1/users/:id                    | Denormalise author info on post creation                          |

> **Note:** notification-service reads recipient device tokens from its own `device_tokens` collection (source of truth), so no synchronous dependency on user-service is required for push delivery.

### HTTP Client Pattern (inside each service)
```js
// lib/internalClient.js
const axios = require('axios');

const internalClient = axios.create({
  timeout: 5000,
  headers: {
    'X-Internal-Token': process.env.INTERNAL_SERVICE_SECRET,
    'Content-Type': 'application/json'
  }
});

module.exports = internalClient;
```

### Timeout and Error Strategy
- Timeout: 5 seconds on all internal HTTP calls
- On timeout/error: log the error, return a graceful degraded response (do not crash the calling service)
- No retries in prototype (add exponential backoff in production)

---

## 3. Asynchronous (Google Cloud Pub/Sub)

### Why Pub/Sub
- Notification-service and analytics-service need to react to events without being called directly
- Prevents tight coupling: feed-service does not need to know notification-service exists
- Matches the "Advanced Notifications – Event Driven" requirement explicitly

### GCP Pub/Sub Free Tier
- First 10 GB of data per month: **free**
- Expected message payload: < 1 KB per event
- Expected volume: < 1,000 events/month for prototype
- **Estimated cost: $0**

---

## 4. Topic and Subscription Definitions

### Topics (Publishers → Subscribers)

| Topic Name                  | Published By      | Subscribed By                           |
|-----------------------------|-------------------|-----------------------------------------|
| `decp.post.created`         | feed-service      | notification-service, analytics-service |
| `decp.job.posted`           | jobs-service      | notification-service, analytics-service |
| `decp.job.applied`          | jobs-service      | notification-service, analytics-service |
| `decp.event.created`        | events-service    | notification-service, analytics-service |
| `decp.event.rsvp`           | events-service    | notification-service, analytics-service |
| `decp.user.registered`      | auth-service      | analytics-service                       |

### Subscriptions

| Subscription Name                    | Topic                       | Subscriber Service    |
|--------------------------------------|-----------------------------|-----------------------|
| `decp-notification-post-sub`         | `decp.post.created`         | notification-service  |
| `decp-notification-job-sub`          | `decp.job.posted`           | notification-service  |
| `decp-notification-applied-sub`      | `decp.job.applied`          | notification-service  |
| `decp-notification-event-sub`        | `decp.event.created`        | notification-service  |
| `decp-notification-rsvp-sub`         | `decp.event.rsvp`           | notification-service  |
| `decp-analytics-post-sub`            | `decp.post.created`         | analytics-service     |
| `decp-analytics-job-sub`             | `decp.job.posted`           | analytics-service     |
| `decp-analytics-applied-sub`         | `decp.job.applied`          | analytics-service     |
| `decp-analytics-event-sub`           | `decp.event.created`        | analytics-service     |
| `decp-analytics-rsvp-sub`            | `decp.event.rsvp`           | analytics-service     |
| `decp-analytics-user-sub`            | `decp.user.registered`      | analytics-service     |

---

## 5. Message Payload Schemas

### `decp.post.created`
```json
{
  "eventId": "evt-8f43076e-ec55-4b67-8f6d-4df9f681fa8e",
  "eventType": "post.created",
  "timestamp": "2025-03-01T10:00:00Z",
  "data": {
    "postId": "abc123",
    "authorId": "user456",
    "authorName": "Alice Perera",
    "contentPreview": "Just finished my research on..."
  }
}
```

### `decp.job.posted`
```json
{
  "eventId": "evt-c24f53dd-2f37-43ea-9a1f-7f6617cc2cb1",
  "eventType": "job.posted",
  "timestamp": "2025-03-01T10:00:00Z",
  "data": {
    "jobId": "job789",
    "title": "Software Engineer Intern",
    "company": "Dialog Axiata",
    "type": "internship",
    "postedBy": "user101"
  }
}
```

### `decp.job.applied`
```json
{
  "eventId": "evt-28cde7a6-e139-4a79-a0ca-58e903fd0128",
  "eventType": "job.applied",
  "timestamp": "2025-03-01T10:00:00Z",
  "data": {
    "jobId": "job789",
    "applicantId": "user456",
    "applicantName": "Alice Perera",
    "posterId": "user101"
  }
}
```

### `decp.event.created`
```json
{
  "eventId": "evt-9be6f97e-28be-45ad-a5e2-2ec8f5723f66",
  "eventType": "event.created",
  "timestamp": "2025-03-01T10:00:00Z",
  "data": {
    "eventId": "evt001",
    "title": "AI Workshop 2025",
    "eventDate": "2025-04-15T09:00:00Z",
    "createdBy": "admin001"
  }
}
```

### `decp.event.rsvp`
```json
{
  "eventId": "evt-7c5efd2b-ea1d-4890-885d-ed538f94b2ca",
  "eventType": "event.rsvp",
  "timestamp": "2025-03-01T10:00:00Z",
  "data": {
    "eventId": "evt001",
    "title": "AI Workshop 2025",
    "userId": "user456",
    "userName": "Alice Perera"
  }
}
```

### `decp.user.registered`
```json
{
  "eventId": "evt-134c5144-f070-45ea-a313-57d9d45395d4",
  "eventType": "user.registered",
  "timestamp": "2025-03-01T10:00:00Z",
  "data": {
    "userId": "user999",
    "role": "student",
    "registeredAt": "2025-03-01T10:00:00Z"
  }
}
```

---

## 6. Publisher Implementation Pattern

```js
// lib/pubsub.js (shared pattern in each service)
const { PubSub } = require('@google-cloud/pubsub');

const pubsub = new PubSub({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID });

async function publish(topicName, payload) {
  try {
    const messageId = await pubsub
      .topic(topicName)
      .publishMessage({ json: payload });
    console.log(`Published to ${topicName}: messageId=${messageId}`);
  } catch (err) {
    // Log but don't throw — publishing failure must not crash the main request
    console.error(`Pub/Sub publish error on ${topicName}:`, err.message);
  }
}

module.exports = { publish };
```

Usage in feed-service after saving a post:
```js
const crypto = require('node:crypto');
const { publish } = require('../lib/pubsub');

// After post saved to DB:
await publish(process.env.PUBSUB_TOPIC_POST_CREATED, {
  eventId: crypto.randomUUID(),
  eventType: 'post.created',
  timestamp: new Date().toISOString(),
  data: { postId: post._id, authorId: post.authorId, authorName: post.authorName, contentPreview: post.content.slice(0, 100) }
});
```

---

## 7. Subscriber Implementation Pattern

Subscriptions use **push delivery** — GCP Pub/Sub sends HTTP POST requests to a Cloud Run endpoint. This is more Cloud Run-friendly than pull (no need for a polling loop).

```js
// In notification-service: src/routes/pubsub.js
const express = require('express');
const router = express.Router();

// GCP Pub/Sub push endpoint (not exposed through gateway; protected by verification token)
router.post('/pubsub/push', express.json(), async (req, res) => {
  try {
    if (req.query.token !== process.env.PUBSUB_VERIFICATION_TOKEN) {
      return res.status(403).send();
    }

    const message = req.body.message;
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    await handleEvent(data); // dispatch to appropriate handler

    res.status(204).send(); // ACK only on success
  } catch (err) {
    console.error('Pub/Sub handler error:', err);
    res.status(500).send(); // NACK -> retry by Pub/Sub
  }
});

async function handleEvent(data) {
  switch (data.eventType) {
    case 'post.created':   return handlePostCreated(data.data);
    case 'job.posted':     return handleJobPosted(data.data);
    case 'job.applied':    return handleJobApplied(data.data);
    case 'event.created':  return handleEventCreated(data.data);
    case 'event.rsvp':     return handleEventRsvp(data.data);
  }
}
```

Configure push subscription endpoint in GCP:
```
Subscription push endpoint: https://decp-notifications-<hash>-uc.a.run.app/pubsub/push?token=<PUBSUB_VERIFICATION_TOKEN>
```

Reliability rules:
- Do not ACK failed events.
- Configure dead-letter topics with max delivery attempts (for example 10).
- Use `eventId` as an idempotency key in subscriber storage to prevent double-processing on retries.

---

## 8. Communication Diagram

```
feed-service ──publishes──► decp.post.created ──► notification-service (push)
                                               └──► analytics-service    (push)

jobs-service ──publishes──► decp.job.posted   ──► notification-service (push)
                                               └──► analytics-service    (push)

jobs-service ──publishes──► decp.job.applied  ──► notification-service (push)
                                               └──► analytics-service    (push)

events-service ─publishes─► decp.event.created ─► notification-service (push)
                                                └──► analytics-service   (push)

events-service ─publishes─► decp.event.rsvp   ──► notification-service (push)
                                                └──► analytics-service   (push)

analytics-service ──HTTP──► feed-service       (GET /api/v1/feed/posts/popular — top posts by likes)
feed-service ─────HTTP──► user-service         (GET /api/v1/users/:id — denormalise author info)
```
