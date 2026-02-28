# DECP Platform — Backend API Reference

**Version:** 1.0.0 | **Last Updated:** February 2026  
**Base URL (Local Dev):** `http://localhost:8082`  
**Base URL (Production):** `https://<your-cloud-run-gateway-url>`

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication & Headers](#authentication--headers)
3. [Standard Response Format](#standard-response-format)
4. [Service Map & Ports](#service-map--ports)
5. [Event-Driven Architecture (Pub/Sub)](#event-driven-architecture-pubsub)
6. [API Reference](#api-reference)
   - [Auth Service](#1-auth-service)
   - [User Service](#2-user-service)
   - [Feed Service](#3-feed-service)
   - [Jobs Service](#4-jobs-service)
   - [Events Service](#5-events-service)
   - [Notification Service](#6-notification-service)
   - [Messaging Service](#7-messaging-service)
   - [Research Service](#8-research-service)
   - [Analytics Service](#9-analytics-service)
7. [Frontend Integration Guide](#frontend-integration-guide)
8. [Error Codes Reference](#error-codes-reference)

---

## Architecture Overview

The DECP platform is built as a microservices architecture, with all client traffic routed through a single **API Gateway**. Services communicate internally via HTTP using a shared `X-Internal-Token` header.

```
Client (Web / Mobile)
        │
        ▼
   ┌──────────┐
   │ Gateway  │ :8082  ← Single public entry point
   │ (JWT     │         JWT verification, header injection
   │  verify) │
   └────┬─────┘
        │ Internal Docker Network
   ┌────┴───────────────────────────────────────┐
   │                                            │
Auth :3001   User :3002   Feed :3003   Jobs :3004
Events :3005  Messaging :3006  Notification :3007
Analytics :3008   Research :3009
        │
        ▼
   Pub/Sub Emulator :8085
   (Topics → Push → Services)
        │
        ▼
   MongoDB :27017 (shared, separate databases per service)
```

### Key Design Principles

- **All requests go through the Gateway** — clients never call individual services directly.
- **JWT is verified once at the Gateway** — downstream services trust the injected headers.
- **Events are asynchronous** — actions like liking a post trigger Pub/Sub events that fan out to Notification and Analytics services.
- **No real-time WebSockets** — polling is used for notifications; WebSocket upgrade is a future enhancement.

---

## Authentication & Headers

### Client → Gateway

All authenticated requests must include a JWT access token:

```http
Authorization: Bearer <accessToken>
```

The Gateway validates the JWT and injects the following headers into every downstream request:

| Header | Value | Description |
|---|---|---|
| `x-user-id` | User's MongoDB ObjectId | Authenticated user |
| `x-user-role` | `student` \| `alumni` \| `admin` | Role for RBAC checks |
| `x-internal-token` | Secret string | Proves the request came via the gateway |

### Gateway → Internal Services

Internal service-to-service calls use:

```http
x-internal-token: <INTERNAL_SERVICE_SECRET>
```

> **Security Note:** All internal service routes are protected by `internalAuth` middleware. Direct calls that bypass the gateway will be rejected unless the correct internal token is provided.

---

## Standard Response Format

All endpoints return JSON. The envelope structure is consistent across all services:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Success with pagination:**
```json
{
  "success": true,
  "data": [ ... ],
  "nextCursor": "<objectId or null>"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

**Validation error:**
```json
{
  "success": false,
  "error": [
    { "path": ["fieldName"], "message": "Required" }
  ]
}
```

---

## Service Map & Ports

| Service | Container | Internal Port | External Port (local dev) | MongoDB DB |
|---|---|---|---|---|
| API Gateway | `decp-gateway` | 8080 | **8082** | — |
| Auth | `decp-auth` | 3001 | 3001 | `decp_auth` |
| User | `decp-user` | 3002 | 3002 | `decp_users` |
| Feed | `decp-feed` | 3003 | 3003 | `decp_feed` |
| Jobs | `decp-jobs` | 3004 | 3004 | `decp_jobs` |
| Events | `decp-events` | 3005 | 3005 | `decp_events` |
| Messaging | `decp-messaging` | 3006 | 3006 | `decp_messaging` |
| Notification | `decp-notification` | 3007 | 3007 | `decp_notifications` |
| Analytics | `decp-analytics` | 3008 | 3008 | `decp_analytics` |
| Research | `decp-research` | 3009 | 3009 | `decp_research` |
| Realtime (WS) | `decp-realtime` | 3010 | 3010 | — |

---

## Event-Driven Architecture (Pub/Sub)

The platform uses **Google Cloud Pub/Sub** (locally emulated) for asynchronous event delivery using an **HTTP Push** model.

### Topics & Subscriptions

| Topic | Publisher | Subscriber Services |
|---|---|---|
| `decp.user.registered` | Auth | Analytics |
| `decp.post.created` | Feed | Analytics |
| `decp.post.liked` | Feed | Notification, Analytics |
| `decp.job.posted` | Jobs | Analytics |
| `decp.job.applied` | Jobs | Notification, Analytics |
| `decp.event.created` | Events | Analytics |
| `decp.event.rsvp` | Events | Notification, Analytics |

### Push Endpoint Pattern

All services that receive Pub/Sub events expose:

```
POST /pubsub/push?token=<PUBSUB_VERIFICATION_TOKEN>
```

The Pub/Sub emulator delivers a JSON payload of the form:
```json
{
  "message": {
    "data": "<base64-encoded JSON>",
    "attributes": {},
    "messageId": "..."
  },
  "subscription": "projects/dummy-project/subscriptions/<sub-name>"
}
```

The service decodes `message.data` from base64 and processes the event. A `204 No Content` response acknowledges delivery; `5xx` causes a retry.

### Notification Events Created

| Pub/Sub Topic | Notification Type | Recipient | Content |
|---|---|---|---|
| `decp.post.liked` | `post_like` | Post author | "Someone liked your post." |
| `decp.job.applied` | `job_application` | Job poster | "A new student applied to your job posting." |
| `decp.event.rsvp` | `event_rsvp` | Event creator | "Someone RSVP'd to your event." |

---

## API Reference

### 1. Auth Service

**Base path:** `/api/v1/auth`  
**Authentication:** None required (these are the login/register endpoints)

---

#### `POST /api/v1/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "student"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | Min 6 chars |
| `name` | string | ✅ | Display name |
| `role` | string | ✅ | `student` \| `alumni` \| `admin` |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "userId": "64abc123def456",
    "role": "student"
  }
}
```

---

#### `POST /api/v1/auth/login`

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "userId": "64abc123def456",
    "role": "student"
  }
}
```

> The `accessToken` is valid for **15 minutes**. Use `/auth/refresh` before it expires.

---

#### `POST /api/v1/auth/refresh`

Refresh an expired access token using the refresh token (stored in an HTTP-only cookie).

**Request Body:**
```json
{
  "refreshToken": "<refresh-token-string>"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

---

#### `POST /api/v1/auth/logout`

Invalidate the current session. Clears the refresh token cookie.

**Response `200`:**
```json
{ "success": true }
```

---

### 2. User Service

**Base path:** `/api/v1/users`  
**Authentication:** Required (JWT via Gateway)

---

#### `GET /api/v1/users/me`

Fetch the authenticated user's profile. Auto-creates the profile document if it doesn't exist yet (lazy initialization).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64abc123def456",
    "role": "student",
    "name": "John Doe",
    "bio": "Computer Science student at UoP",
    "skills": ["Node.js", "React", "Docker"],
    "avatarUrl": "https://example.com/avatar.jpg",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

#### `PUT /api/v1/users/me`

Update the authenticated user's profile.

**Request Body (all fields optional):**
```json
{
  "name": "John Doe",
  "bio": "Updated bio",
  "avatarUrl": "https://cdn.example.com/avatar.jpg",
  "skills": ["Python", "Machine Learning"]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

#### `GET /api/v1/users`

List all registered users. **Admin only.**

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Results per page |

**Response `200`:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8
  }
}
```

---

#### `GET /api/v1/users/:id`

Get a specific user by their MongoDB ID. Used internally by Feed/Events to enrich author data.

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "...", "name": "...", "avatarUrl": "..." }
}
```

---

#### `PUT /api/v1/users/:id/role`

Update a user's role. **Admin only.**

**Request Body:**
```json
{ "role": "alumni" }
```

**Response `200`:**
```json
{ "success": true, "data": { ... } }
```

---

### 3. Feed Service

**Base path:** `/api/v1/feed`  
**Authentication:** Required (JWT via Gateway)

---

#### `POST /api/v1/feed/posts`

Create a new post.

**Request Body:**
```json
{
  "content": "This is my post content.",
  "mediaUrls": ["https://cdn.example.com/image.jpg"]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64abc...",
    "authorId": "...",
    "authorName": "John Doe",
    "content": "This is my post content.",
    "mediaUrls": [],
    "likeCount": 0,
    "commentCount": 0,
    "shareCount": 0,
    "likes": [],
    "comments": [],
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

> **Pub/Sub Side Effect:** Publishes `decp.post.created` event.

---

#### `GET /api/v1/feed/posts`

Fetch the feed (all posts), newest first. Supports cursor-based pagination.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | number | Max results (default: 20) |
| `cursor` | string | Last `_id` from previous page |

**Response `200`:**
```json
{
  "success": true,
  "data": [ ... ],
  "nextCursor": "64abc123..."
}
```

---

#### `GET /api/v1/feed/posts/:id`

Fetch a single post by ID.

---

#### `POST /api/v1/feed/posts/:id/like`

Like a post. Idempotent (liking twice has no effect).

> **Pub/Sub Side Effect:** Publishes `decp.post.liked` event → triggers a notification to the post author.

---

#### `DELETE /api/v1/feed/posts/:id/like`

Remove a like from a post.

---

#### `POST /api/v1/feed/posts/:id/comments`

Add a comment to a post.

**Request Body:**
```json
{ "content": "Great post!" }
```

---

#### `GET /api/v1/feed/posts/:id/comments`

Get all comments on a post.

---

#### `POST /api/v1/feed/posts/:id/share`

Increment the share count of a post.

---

#### `POST /api/v1/feed/media/upload-url`

Get a pre-signed URL for media upload to cloud storage (currently returns a mock URL in local dev).

**Response `200`:**
```json
{
  "success": true,
  "url": "https://r2.example.com/upload/signed-url",
  "publicUrl": "https://cdn.example.com/file.jpg"
}
```

---

#### `GET /api/v1/feed/posts/popular`

Get the most-liked posts. **Internal use only** (requires `x-internal-token`).

---

### 4. Jobs Service

**Base path:** `/api/v1/jobs`  
**Authentication:** Required (JWT via Gateway)

---

#### `POST /api/v1/jobs`

Create a new job posting. **Alumni/Admin only.**

**Request Body:**
```json
{
  "title": "Software Engineer Intern",
  "company": "Tech Corp",
  "location": "Remote",
  "type": "internship",
  "description": "We are looking for...",
  "requirements": ["Node.js", "React"],
  "salaryRange": "USD 2000-3000/month"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `title` | string | ✅ | — |
| `company` | string | ✅ | — |
| `location` | string | ✅ | — |
| `type` | string | ✅ | `full-time` \| `part-time` \| `internship` \| `contract` |
| `description` | string | ✅ | — |
| `requirements` | string[] | ❌ | — |
| `salaryRange` | string | ❌ | — |

> **Pub/Sub Side Effect:** Publishes `decp.job.posted` event.

---

#### `GET /api/v1/jobs`

List all active job postings.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `type` | string | Filter by job type |
| `search` | string | Search in title/company/description |
| `limit` | number | Max results (default: 20) |

---

#### `GET /api/v1/jobs/:id`

Get a specific job by ID.

---

#### `PUT /api/v1/jobs/:id`

Update a job posting. Only the original poster or admin can update.

---

#### `DELETE /api/v1/jobs/:id`

Delete (deactivate) a job posting.

---

#### `POST /api/v1/jobs/:id/apply`

Apply for a job. **Students only.**

**Request Body:**
```json
{
  "coverLetter": "I am very interested in this role...",
  "cvUrl": "https://example.com/my-cv.pdf"
}
```

> **Pub/Sub Side Effect:** Publishes `decp.job.applied` event → triggers a notification to the job poster.

---

#### `GET /api/v1/jobs/:id/applications`

View all applications for a job posting. **Job poster or Admin only.**

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "studentId": "...",
      "studentName": "Jane Smith",
      "coverLetter": "...",
      "cvUrl": "https://...",
      "createdAt": "..."
    }
  ]
}
```

---

### 5. Events Service

**Base path:** `/api/v1/events`  
**Authentication:** Required (JWT via Gateway)

---

#### `POST /api/v1/events`

Create a new event. **Alumni/Admin only.**

**Request Body:**
```json
{
  "title": "Annual Alumni Meetup",
  "description": "Join us for a networking event...",
  "eventDate": "2026-10-15T10:00:00.000Z",
  "location": "Peradeniya, Main Hall"
}
```

> **Pub/Sub Side Effect:** Publishes `decp.event.created` event.

---

#### `GET /api/v1/events`

List all upcoming events.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `limit` | number | Max results |
| `cursor` | string | Cursor for pagination |

---

#### `GET /api/v1/events/:id`

Get a specific event by ID, including participant list and RSVP count.

---

#### `PUT /api/v1/events/:id`

Update an event. Only the creator or admin can update.

---

#### `DELETE /api/v1/events/:id`

Delete an event. Only the creator or admin can delete.

---

#### `POST /api/v1/events/:id/rsvp`

RSVP for an event. Idempotent.

> **Pub/Sub Side Effect:** Publishes `decp.event.rsvp` event → triggers a notification to the event creator.

---

#### `DELETE /api/v1/events/:id/rsvp`

Cancel an RSVP.

---

### 6. Notification Service

**Base path:** `/api/v1/notifications`  
**Authentication:** Required (JWT via Gateway)

Notifications are **created automatically** by the Notification service via Pub/Sub push events. Clients only need the read/mark-read endpoints.

---

#### `GET /api/v1/notifications`

Fetch the authenticated user's notifications, newest first.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `20` | Results per page (max 50) |
| `cursor` | string | — | Last `_id` from previous page |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64abc...",
      "recipientId": "...",
      "type": "post_like",
      "content": "Someone liked your post.",
      "link": "/posts/64xyz...",
      "isRead": false,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

**Notification Types:**

| `type` | Trigger | `link` Pattern |
|---|---|---|
| `post_like` | Someone liked your post | `/posts/:postId` |
| `job_application` | Someone applied to your job | `/jobs/:jobId/applications` |
| `event_rsvp` | Someone RSVP'd to your event | `/events/:eventId` |

---

#### `PUT /api/v1/notifications/:id/read`

Mark a specific notification as read. Only the notification's recipient can mark it.

**Response `200`:**
```json
{
  "success": true,
  "data": { "_id": "...", "isRead": true, ... }
}
```

---

### 7. Messaging Service

**Base path:** `/api/v1/messages`  
**Authentication:** Required (JWT via Gateway)

The messaging service supports **1:1 chat** between any two users. Conversation threads are identified by a deterministic `conversationId` derived from sorting and joining the two user IDs.

---

#### `POST /api/v1/messages/send`

Send a message to another user.

**Request Body:**
```json
{
  "recipientId": "64xyz...",
  "content": "Hello! Are you interested in collaborating?"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "senderId": "...",
    "recipientId": "...",
    "conversationId": "64abc_64xyz",
    "content": "Hello!...",
    "isRead": false,
    "createdAt": "..."
  }
}
```

---

#### `GET /api/v1/messages/inbox`

Get the latest message from each unique conversation (inbox view).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "senderId": "...",
      "recipientId": "...",
      "conversationId": "...",
      "content": "Latest message preview",
      "createdAt": "..."
    }
  ]
}
```

---

#### `GET /api/v1/messages/conversation/:otherUserId`

Fetch the full message thread between the authenticated user and another user.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | `50` | Max messages to return |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "_id": "...", "senderId": "...", "content": "Hello!", "createdAt": "..." },
    { "_id": "...", "senderId": "...", "content": "Hi back!", "createdAt": "..." }
  ]
}
```

> Messages are returned in **chronological order** (oldest first).

---

### 8. Research Service

**Base path:** `/api/v1/research`  
**Authentication:** Required (JWT via Gateway)

The Research & Innovation service allows users to post research projects and recruit collaborators.

---

#### `POST /api/v1/research`

Create a new research project.

**Request Body:**
```json
{
  "title": "AI for Sinhala NLP",
  "description": "Applying transformer models to low-resource Sinhala text classification.",
  "domain": "Machine Learning",
  "tags": ["NLP", "Transformers", "Sinhala"]
}
```

| Field | Type | Required |
|---|---|---|
| `title` | string | ✅ |
| `description` | string | ✅ |
| `domain` | string | ✅ |
| `tags` | string[] | ❌ |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "...",
    "domain": "Machine Learning",
    "creatorId": "...",
    "collaboratorIds": [],
    "status": "open",
    "tags": ["NLP"]
  }
}
```

---

#### `GET /api/v1/research`

List all research projects. Supports domain and status filtering.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `domain` | string | Filter by research domain |
| `status` | string | `open` \| `in_progress` \| `completed` |
| `limit` | number | Max results (default 20) |

---

#### `GET /api/v1/research/:id`

Get a specific research project by ID.

---

#### `POST /api/v1/research/:id/join`

Join a research project as a collaborator. Idempotent.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "collaboratorIds": ["64abc...", "64xyz..."]
  }
}
```

---

### 9. Analytics Service

**Base path:** `/api/v1/analytics`  
**Authentication:** Required (JWT via Gateway) | **Admin Only**

The Analytics service exposes aggregated platform metrics collected from Pub/Sub events.

---

#### `GET /api/v1/analytics/metrics`

Fetch all platform metric counters. **Admin role required.**

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 42,
    "totalPosts": 183,
    "totalLikes": 610,
    "totalJobsPosted": 27,
    "totalApplications": 95,
    "totalEvents": 15,
    "totalRSVPs": 204
  }
}
```

> Counters are incremented in real-time as Pub/Sub events arrive. Values are eventually consistent (typically within 5–15 seconds of the action).

---

## Frontend Integration Guide

### Recommended HTTP Client Setup (Axios)

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082',
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const { data } = await api.post('/api/v1/auth/refresh', {
        refreshToken: localStorage.getItem('refreshToken')
      });
      localStorage.setItem('accessToken', data.data.accessToken);
      error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Authentication Flow

```
1. User submits login form
2. POST /api/v1/auth/login → { accessToken, userId, role }
3. Store accessToken in memory / secure storage
4. Store userId and role in global state (Zustand / Redux)
5. Attach Authorization: Bearer <token> to all subsequent requests
6. On 401 response → call /auth/refresh → update token → retry original request
7. On logout → POST /auth/logout → clear all local state
```

### Real-Time WebSocket Integration (Notifications & Chat)

The platform supports true push real-time delivery via `socket.io` through the API Gateway. Once authenticated, the frontend should establish a WebSocket connection to receive events instantly, eliminating the need for REST polling.

```bash
npm install socket.io-client
```

```typescript
// hooks/useRealtime.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useRealtime(accessToken: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Connect to gateway — it automatically proxies /realtime/socket.io to the decp-realtime service
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082', {
      path: '/realtime/socket.io',
      auth: { token: accessToken },
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => console.log('WebSocket connected'));

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [accessToken]);

  return socket;
}
```

**Using the connection for Chat:**
```typescript
const socket = useRealtime(token);

useEffect(() => {
  if (!socket) return;
  
  // Listen for incoming messages
  socket.on('message', (message) => {
    if (message.conversationId === activeConversationId) {
      setMessages(prev => [...prev, message]);
    }
    // Update inbox preview...
  });

  // Listen for sync of messages YOU sent (useful for multi-tab sync)
  socket.on('message:sent', (message) => {
    setMessages(prev => [...prev, message]);
  });
}, [socket]);
```

**Using the connection for Notifications:**
```typescript
const socket = useRealtime(token);

useEffect(() => {
  if (!socket) return;
  
  socket.on('notification', (newNotif) => {
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);
    toast(`New notification: ${newNotif.content}`);
  });
}, [socket]);
```

### Feed Pagination Pattern

The Feed API uses cursor-based pagination for efficient data fetching:

```typescript
async function loadMorePosts(cursor?: string) {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);

  const { data } = await api.get(`/api/v1/feed/posts?${params}`);
  // data.data = array of posts
  // data.nextCursor = ID of the oldest post (or null if no more pages)
  return data;
}
```

### Role-Based UI Rendering

The user's `role` (from login response and persisted in state) controls what UI elements are shown:

| Role | Capabilities |
|---|---|
| `student` | Browse feed, like/comment, apply for jobs, RSVP events, join research, 1:1 messaging |
| `alumni` | All student capabilities + post jobs, create events, create research projects |
| `admin` | All alumni capabilities + manage users, view analytics dashboard, moderate content |

```typescript
// Example: Only show "Post a Job" button to alumni/admin
{(role === 'alumni' || role === 'admin') && (
  <Button onClick={openPostJobModal}>Post a Job</Button>
)}
```

### Media Upload Flow

```
1. POST /api/v1/feed/media/upload-url
   → { url: "<pre-signed-upload-url>", publicUrl: "<cdn-url>" }

2. PUT <pre-signed-upload-url>  (direct to R2/S3, not via gateway)
   Body: binary file data

3. Use publicUrl in your post/profile creation request
   POST /api/v1/feed/posts { mediaUrls: [publicUrl] }
```

---

## Error Codes Reference

| HTTP Status | Meaning | Common Cause |
|---|---|---|
| `400` | Bad Request | Validation failure (Zod schema) — check `error` array |
| `401` | Unauthorized | Missing or expired JWT token |
| `403` | Forbidden | Role insufficient (e.g., student posting a job) |
| `404` | Not Found | Resource ID does not exist |
| `409` | Conflict | Duplicate resource (e.g., email already registered) |
| `500` | Internal Server Error | Unexpected server-side error |

---

## Local Development Quick Reference

### Start the full stack
```bash
docker compose down
docker compose build
docker compose up -d
node scripts/setup-pubsub.js   # Initialize Pub/Sub topics & subscriptions
```

### Run the full test suite
```bash
bash run-all-tests.sh
```

### Service URLs (local)
| Service | URL |
|---|---|
| API Gateway | http://localhost:8082 |
| Individual services | http://localhost:3001 – 3009 |
| Pub/Sub Emulator | http://localhost:8085 |

### Environment Variables (`docker-compose.env`)
```env
MONGODB_URI=mongodb://mongodb:27017
JWT_SECRET=supersecret123
INTERNAL_SERVICE_SECRET=dev-secret
PUBSUB_EMULATOR_HOST=pubsub:8085
PUBSUB_VERIFICATION_TOKEN=dummy-token-123
```

> In production, all secrets must be stored in **Google Cloud Secret Manager** and injected at Cloud Run deploy time.
