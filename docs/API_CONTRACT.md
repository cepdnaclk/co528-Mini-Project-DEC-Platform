# DEC Platform — Backend API Contract

> **Base URL:** `http://localhost:8082` (API Gateway)
> **Version:** Current as of March 2026
> All requests go through the gateway which handles JWT validation and header injection.

---

## Table of Contents

1. [Authentication & Headers](#1-authentication--headers)
2. [Auth Service](#2-auth-service)
3. [User Service](#3-user-service)
4. [Feed Service](#4-feed-service)
5. [Jobs Service](#5-jobs-service)
6. [Events Service](#6-events-service)
7. [Messaging Service](#7-messaging-service)
8. [Notifications Service](#8-notifications-service)
9. [Research Service](#9-research-service)
10. [Analytics Service](#10-analytics-service)
11. [Realtime Service (WebSocket)](#11-realtime-service-websocket)
12. [Media Uploads (R2)](#12-media-uploads-r2)
13. [Error Format](#13-error-format)
14. [Role Permissions Matrix](#14-role-permissions-matrix)

---

## 1. Authentication & Headers

### How Auth Works

1. Call `POST /api/v1/auth/login` to receive an `accessToken` (15-min TTL) and `refreshToken` (7-day TTL).
2. Include the access token in every subsequent request:
   ```
   Authorization: Bearer <accessToken>
   ```
3. When the access token expires, call `POST /api/v1/auth/refresh` with the refresh token to get a new pair.
4. The gateway validates the JWT and injects two headers into every downstream request:
   - `x-user-id` — the authenticated user's MongoDB ID
   - `x-user-role` — `student` | `alumni` | `admin`

### User Roles

| Role | Description |
|------|-------------|
| `student` | Default role. Can apply for jobs, RSVP events, join research, send messages. |
| `alumni` | Can additionally post jobs. |
| `admin` | Full access including creating events, managing users, viewing analytics. |

---

## 2. Auth Service

**Base path:** `/api/v1/auth`
**Authentication:** None required on these endpoints.

---

### `POST /api/v1/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "minLength8",
  "name": "Jane Doe",
  "role": "student"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | ✅ | Valid email format |
| `password` | string | ✅ | Min 8 characters |
| `name` | string | ❌ | Passed to user profile via Pub/Sub |
| `role` | string | ❌ | `student` (default) or `alumni` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | `"Email already exists"` |
| 400 | Zod validation error |

---

### `POST /api/v1/auth/login`

Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "client": "web"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `email` | string | ✅ | Valid email |
| `password` | string | ✅ | — |
| `client` | string | ❌ | `"web"` or `"mobile"` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 401 | `"Invalid credentials"` |

---

### `POST /api/v1/auth/refresh`

Rotate tokens. Old refresh token is invalidated immediately (rotation).

**Request Body:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

> Alternatively, the refresh token is read from the `refreshToken` HttpOnly cookie set at login.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 401 | `"No refresh token"` |
| 401 | `"Invalid refresh token"` |

---

### `POST /api/v1/auth/logout`

Invalidate the refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Logged out"
}
```

---

## 3. User Service

**Base path:** `/api/v1/users`
**Authentication:** Required on all endpoints (gateway JWT).

---

### `GET /api/v1/users/me`

Get the currently authenticated user's profile. Creates a profile record on first call if one doesn't exist yet.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Jane Doe",
    "bio": "Computer Science student",
    "avatarUrl": "https://pub-xxx.r2.dev/avatars/64f1a2b.jpg",
    "skills": ["JavaScript", "React"],
    "role": "student",
    "following": ["64f1..."],
    "followers": [],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### `PUT /api/v1/users/me`

Update the current user's profile.

**Request Body** (all fields optional):
```json
{
  "name": "Jane Doe",
  "bio": "Updated bio",
  "avatarUrl": "https://pub-xxx.r2.dev/avatars/userid.jpg",
  "skills": ["Python", "TensorFlow"]
}
```

| Field | Type | Validation |
|-------|------|------------|
| `name` | string | — |
| `bio` | string | — |
| `avatarUrl` | string | Must be a valid URL |
| `skills` | string[] | — |

**Response `200`:** Same shape as `GET /me`.

---

### `POST /api/v1/users/me/avatar`

**Step 1 of 2 for avatar upload.** Get a pre-signed R2 PUT URL for uploading the avatar image directly from the browser.

The key is always `avatars/{userId}.{ext}` — re-uploading overwrites the previous avatar.

**Request Body:**
```json
{
  "mimeType": "image/jpeg"
}
```

| Field | Type | Values |
|-------|------|--------|
| `mimeType` | string | `image/jpeg`, `image/png`, `image/webp` |

**Response `200`:**
```json
{
  "success": true,
  "uploadUrl": "https://decp-media.xxx.r2.cloudflarestorage.com/avatars/userid.jpg?X-Amz-...",
  "publicUrl": "https://pub-xxx.r2.dev/avatars/userid.jpg",
  "key": "avatars/64f1a2b3c4d5e6f7a8b9c0d1.jpg"
}
```

**Frontend flow:**
```
1. POST /me/avatar  → get uploadUrl + publicUrl
2. PUT <uploadUrl>  (binary file, Content-Type header) → upload directly to R2
3. PUT /me/avatar   { avatarUrl: publicUrl } → save to profile
```

---

### `PUT /api/v1/users/me/avatar`

**Step 3 of 3.** Confirm the avatar was uploaded and save the public URL to the user's profile.

**Request Body:**
```json
{
  "avatarUrl": "https://pub-xxx.r2.dev/avatars/userid.jpg"
}
```

**Response `200`:** Full user profile object.

---

### `GET /api/v1/users/search`

Search users by name or bio. Returns up to 20 results.

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `q` | ✅ | Search string (case-insensitive, partial match) |

**Example:** `GET /api/v1/users/search?q=ahmed`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "name": "Ahmed Ali",
      "bio": "Backend developer",
      "avatarUrl": "https://...",
      "role": "alumni",
      "skills": ["Node.js"]
    }
  ]
}
```

---

### `GET /api/v1/users/:id`

Get a specific user's public profile.

**Response `200`:** Full user profile object including `following` and `followers` arrays.

**Errors:**
| Status | Error |
|--------|-------|
| 404 | `"User not found"` |

---

### `POST /api/v1/users/:id/follow`

Follow a user.

**No request body required.**

**Errors:**
| Status | Error |
|--------|-------|
| 400 | `"Cannot follow yourself"` |
| 404 | `"User not found"` |

**Response `200`:**
```json
{ "success": true }
```

---

### `DELETE /api/v1/users/:id/follow`

Unfollow a user.

**Response `200`:**
```json
{ "success": true }
```

---

### `GET /api/v1/users/:id/followers`

Get the list of users following the specified user.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "...", "avatarUrl": "...", "role": "student" }
  ]
}
```

---

### `GET /api/v1/users/:id/following`

Get the list of users the specified user follows.

**Response `200`:** Same shape as `/followers`.

---

### `GET /api/v1/users` _(Admin only)_

List all users with pagination.

**Query Parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `limit` | 20 | Items per page |

**Response `200`:**
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 100, "page": 1, "pages": 5 }
}
```

---

### `PUT /api/v1/users/:id/role` _(Admin only)_

Update a user's role.

**Request Body:**
```json
{
  "role": "alumni"
}
```

| Field | Values |
|-------|--------|
| `role` | `student`, `alumni`, `admin` |

**Response `200`:** Updated user profile.

---

## 4. Feed Service

**Base path:** `/api/v1/feed`
**Authentication:** Required on all endpoints.

---

### `POST /api/v1/feed/posts`

Create a new post. Media URLs must exist in R2 (validated server-side via `HeadObject`).

**Request Body:**
```json
{
  "content": "Check out my new project!",
  "mediaUrls": [
    "https://pub-xxx.r2.dev/posts/uuid.jpg"
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `content` | string | ✅ | Post text body |
| `mediaUrls` | string[] | ❌ | Must be R2 public URLs from `/media/upload-url`. Each URL is verified to exist in the bucket before save. |

**Side effects:**
- Publishes `decp.post.created` to Pub/Sub
- Broadcasts `feed:new_post` socket event to all connected clients (real-time feed update)

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1...",
    "authorId": "64f1a2b3...",
    "authorName": "Jane Doe",
    "authorAvatar": "https://...",
    "content": "Check out my new project!",
    "mediaUrls": ["https://pub-xxx.r2.dev/posts/uuid.jpg"],
    "likes": [],
    "likeCount": 0,
    "comments": [],
    "commentCount": 0,
    "shareCount": 0,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | `"Invalid media URL: <url>"` — URL not from this R2 bucket |
| 400 | `"Media not found in storage: <url>"` — File was never uploaded |

---

### `GET /api/v1/feed/posts`

Get paginated feed posts (newest first).

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Items per page (default: 20) |
| `cursor` | string | Post `_id` — returns posts older than this ID (cursor pagination) |
| `authorId` | string | Filter posts by a specific user ID |

**Example:** `GET /api/v1/feed/posts?limit=20&authorId=64f1...`

**Response `200`:**
```json
{
  "success": true,
  "data": [...],
  "nextCursor": "64f1a2b3c4d5e6f7a8b9c0d0"
}
```

> Pass `nextCursor` as `cursor` in the next request to load older posts. `null` means no more pages.

---

### `GET /api/v1/feed/posts/:id`

Get a single post by ID.

**Response `200`:**
```json
{
  "success": true,
  "data": { /* full post object */ }
}
```

---

### `PUT /api/v1/feed/posts/:id`

Edit a post. Author only.

**Request Body** (all optional):
```json
{
  "content": "Updated post content",
  "mediaUrls": ["https://pub-xxx.r2.dev/posts/new-uuid.jpg"]
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 403 | `"Forbidden"` — not the post author |
| 404 | `"Not found"` |

**Response `200`:** Updated post object.

---

### `DELETE /api/v1/feed/posts/:id`

Delete a post. Author only. Also deletes all associated R2 media objects.

**Errors:**
| Status | Error |
|--------|-------|
| 403 | `"Forbidden"` |
| 404 | `"Not found"` |

**Response `200`:**
```json
{ "success": true }
```

---

### `POST /api/v1/feed/posts/:id/like`

Like a post. Silently ignored if already liked.

**Side effects:** Publishes `decp.post.liked` to Pub/Sub → Notification service sends notification to post author.

**Response `200`:** Updated post object.

---

### `DELETE /api/v1/feed/posts/:id/like`

Unlike a post.

**Response `200`:** Updated post object.

---

### `POST /api/v1/feed/posts/:id/comments`

Add a comment to a post.

**Request Body:**
```json
{
  "content": "Great post!"
}
```

**Response `200`:** Updated post object including the new comment.

**Comment object shape:**
```json
{
  "_id": "64f1...",
  "authorId": "64f1...",
  "authorName": "Jane Doe",
  "authorAvatar": "https://...",
  "content": "Great post!",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

### `GET /api/v1/feed/posts/:id/comments`

Get all comments on a post.

**Response `200`:**
```json
{
  "success": true,
  "data": [ /* array of comment objects */ ]
}
```

---

### `POST /api/v1/feed/posts/:id/share`

Increment the share count on a post.

**Response `200`:** Updated post object with incremented `shareCount`.

---

### `POST /api/v1/feed/media/upload-url`

**Step 1 of media upload.** Get pre-signed R2 PUT URL(s) for uploading media files directly from the browser.

**Request Body:**
```json
{
  "mimeType": "image/jpeg",
  "count": 3
}
```

| Field | Type | Default | Values |
|-------|------|---------|--------|
| `mimeType` | string | `image/jpeg` | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm` |
| `count` | number | 1 | 1–10 |

**Response `200`:**
```json
{
  "success": true,
  "files": [
    {
      "uploadUrl": "https://decp-media.xxx.r2.cloudflarestorage.com/posts/uuid1.jpg?X-Amz-...",
      "publicUrl": "https://pub-xxx.r2.dev/posts/uuid1.jpg",
      "key": "posts/uuid1.jpg"
    },
    {
      "uploadUrl": "https://decp-media.xxx.r2.cloudflarestorage.com/posts/uuid2.jpg?X-Amz-...",
      "publicUrl": "https://pub-xxx.r2.dev/posts/uuid2.jpg",
      "key": "posts/uuid2.jpg"
    }
  ]
}
```

**Upload flow:**
```
1. POST /media/upload-url { mimeType, count }    → get files[]
2. PUT files[i].uploadUrl  (raw binary, set Content-Type header)  → upload to R2
3. POST /posts  { content, mediaUrls: files.map(f => f.publicUrl) }
```

> Pre-signed URLs expire in **5 minutes**.

---

## 5. Jobs Service

**Base path:** `/api/v1/jobs`
**Authentication:** Required on all endpoints.

---

### `POST /api/v1/jobs`

Create a job listing. Alumni and admin only.

**Request Body:**
```json
{
  "title": "Software Engineer Intern",
  "company": "Acme Corp",
  "location": "Remote",
  "type": "internship",
  "description": "Join our team and build amazing software.",
  "requirements": ["JavaScript", "Node.js"]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | ✅ | Min 3 chars |
| `company` | string | ✅ | Min 2 chars |
| `location` | string | ✅ | Min 2 chars |
| `type` | string | ✅ | `internship`, `full-time`, `part-time`, `contract` |
| `description` | string | ✅ | Min 10 chars |
| `requirements` | string[] | ❌ | — |

**Side effects:** Publishes `decp.job.posted` to Pub/Sub.

**Response `201`:** Full job object (excluding `applications` array).

**Errors:**
| Status | Error |
|--------|-------|
| 403 | `"Only alumni and admins can post jobs"` |

---

### `GET /api/v1/jobs`

Get all job listings.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Text search across title, company, description, location (case-insensitive) |
| `type` | string | Filter by type: `internship`, `full-time`, `part-time`, `contract` |
| `active` | boolean | `true` / `false` |

**Example:** `GET /api/v1/jobs?search=backend&type=internship`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "posterId": "64f1...",
      "posterName": "John Smith",
      "title": "Backend Engineer Intern",
      "company": "TechCo",
      "location": "Remote",
      "type": "internship",
      "description": "...",
      "requirements": ["Node.js"],
      "active": true,
      "applicationCount": 3,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/v1/jobs/:id`

Get a single job listing (without applications).

**Response `200`:** Single job object.

---

### `PUT /api/v1/jobs/:id`

Update a job listing. Poster or admin only.

**Request Body:** Same fields as `POST /jobs` (all required by schema).

**Response `200`:** Updated job object.

---

### `DELETE /api/v1/jobs/:id`

Delete a job listing. Poster or admin only.

**Response `200`:**
```json
{ "success": true, "message": "Job deleted" }
```

---

### `POST /api/v1/jobs/:id/apply`

Apply to a job. Students only. Cannot apply twice.

**Request Body:**
```json
{
  "coverLetter": "I am very interested in this position because...",
  "cvUrl": "https://example.com/my-cv.pdf"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `coverLetter` | string | ✅ | Min 10 chars |
| `cvUrl` | string | ✅ | Valid URL |

**Side effects:** Publishes `decp.job.applied` to Pub/Sub → Notification service notifies job poster.

**Response `201`:**
```json
{ "success": true, "message": "Application submitted successfully" }
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | `"You have already applied for this job"` |
| 400 | `"Job is no longer active"` |
| 403 | `"Only students can apply for jobs"` |

---

### `GET /api/v1/jobs/:id/applications`

Get all applications for a job. Poster or admin only.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "studentId": "64f1...",
      "studentName": "Jane Doe",
      "coverLetter": "...",
      "cvUrl": "https://...",
      "status": "pending",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `PUT /api/v1/jobs/:id/applications/:appId`

Update the status of a job application. Poster or admin only.

**Request Body:**
```json
{
  "status": "accepted"
}
```

| Field | Values |
|-------|--------|
| `status` | `pending`, `accepted`, `rejected` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1...",
    "studentId": "64f1...",
    "studentName": "Jane Doe",
    "status": "accepted",
    ...
  }
}
```

---

## 6. Events Service

**Base path:** `/api/v1/events`
**Authentication:** Required on all endpoints.

---

### `POST /api/v1/events` _(Admin only)_

Create an event.

**Request Body:**
```json
{
  "title": "Annual Alumni Meet 2026",
  "description": "Join us for networking and updates from the department.",
  "eventDate": "2026-06-15T18:00:00.000Z",
  "location": "Main Auditorium, Block A"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | ✅ | Min 3 chars |
| `description` | string | ✅ | Min 10 chars |
| `eventDate` | string | ✅ | ISO 8601 datetime |
| `location` | string | ✅ | Min 2 chars |

**Side effects:** Publishes `decp.event.created` to Pub/Sub.

**Response `201`:** Full event object.

---

### `GET /api/v1/events`

Get all events sorted by event date (ascending).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "title": "Annual Alumni Meet 2026",
      "description": "...",
      "eventDate": "2026-06-15T18:00:00.000Z",
      "location": "Main Auditorium",
      "creatorId": "64f1...",
      "creatorName": "Admin User",
      "rsvpCount": 42,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

> `participantIds` array is excluded from the list response. Use `/attendees` to get it.

---

### `GET /api/v1/events/:id`

Get a single event including `participantIds`.

**Response `200`:** Full event object.

---

### `PUT /api/v1/events/:id` _(Admin only)_

Update event details.

**Request Body:** Same fields as `POST /events`.

**Response `200`:** Updated event object.

---

### `DELETE /api/v1/events/:id` _(Admin only)_

Delete an event.

**Response `200`:**
```json
{ "success": true, "message": "Event deleted" }
```

---

### `POST /api/v1/events/:id/rsvp`

RSVP to an event. Silently ignored if already RSVP'd.

**Side effects:** Publishes `decp.event.rsvp` to Pub/Sub → Notification service notifies event creator.

**Response `200`:**
```json
{ "success": true, "message": "RSVP confirmed" }
```

---

### `DELETE /api/v1/events/:id/rsvp`

Cancel RSVP.

**Response `200`:**
```json
{ "success": true, "message": "RSVP cancelled" }
```

---

### `GET /api/v1/events/:id/attendees`

Get attendee list for an event.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "participantIds": ["64f1...", "64f2..."],
    "rsvpCount": 2
  }
}
```

---

## 7. Messaging Service

**Base path:** `/api/v1/messages`
**Authentication:** Required on all endpoints.

---

### `POST /api/v1/messages/send`

Send a direct message to another user.

**Request Body:**
```json
{
  "recipientId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "content": "Hey, are you free to chat?"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `recipientId` | string | ✅ | Valid user ID |
| `content` | string | ✅ | Min 1 char |

**Side effects:**
- Emits `message` socket event to recipient (if connected)
- Emits `message:sent` socket event to sender (for multi-tab sync)

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1...",
    "senderId": "64f1...",
    "recipientId": "64f1...",
    "conversationId": "64f1a2b3_64f1c4d5",
    "content": "Hey, are you free to chat?",
    "isRead": false,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

> `conversationId` is always the two user IDs sorted and joined with `_`. Use this as a stable chat room identifier.

---

### `GET /api/v1/messages/inbox`

Get the user's conversation list — one entry per unique conversation, showing the latest message and unread count.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "senderId": "64f1...",
      "recipientId": "64f2...",
      "conversationId": "64f1a2b3_64f2c4d5",
      "content": "Hey, are you free to chat?",
      "isRead": false,
      "unreadCount": 3,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

> Sorted newest first. Limited to 50 conversations.

---

### `GET /api/v1/messages/unread-count`

Get total number of unread messages across all conversations. Use for nav badge.

**Response `200`:**
```json
{
  "success": true,
  "count": 7
}
```

---

### `GET /api/v1/messages/conversation/:otherUserId`

Get message history with a specific user.

**Query Parameters:**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | 50 | Number of messages to return (oldest → newest) |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "senderId": "64f1...",
      "recipientId": "64f2...",
      "conversationId": "64f1a2b3_64f2c4d5",
      "content": "Hello!",
      "isRead": true,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `PUT /api/v1/messages/:id/read`

Mark a specific message as read. Only the **recipient** can mark a message as read.

**Side effects:** Emits `message:read` socket event to the original sender (read receipt).

**Response `200`:**
```json
{
  "success": true,
  "data": { /* updated message object with isRead: true */ }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 404 | `"Message not found"` — either doesn't exist or caller is not the recipient |

---

### `DELETE /api/v1/messages/:id`

Delete a message. Only the **sender** can delete.

**Response `200`:**
```json
{ "success": true }
```

**Errors:**
| Status | Error |
|--------|-------|
| 403 | `"Forbidden"` |
| 404 | `"Message not found"` |

---

## 8. Notifications Service

**Base path:** `/api/v1/notifications`
**Authentication:** Required on all endpoints.

Notifications are created automatically by the backend via Pub/Sub. You cannot create them manually. The following events create notifications:

| Pub/Sub Event | Notification Created For |
|---------------|--------------------------|
| `decp.post.liked` | Post author (when someone likes their post) |
| `decp.job.applied` | Job poster (when a student applies) |
| `decp.event.rsvp` | Event creator (when someone RSVPs) |

---

### `GET /api/v1/notifications`

Get the user's notifications (cursor-paginated, newest first).

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Default 20, max 50 |
| `cursor` | string | Notification `_id` — returns items older than this |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "recipientId": "64f1...",
      "type": "post_like",
      "content": "Someone liked your post.",
      "link": "/posts/64f1...",
      "isRead": false,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": "64f1..."
}
```

**Notification types:**

| `type` | Trigger |
|--------|---------|
| `post_like` | Someone liked your post |
| `job_application` | A student applied to your job |
| `event_rsvp` | Someone RSVP'd to your event |

---

### `GET /api/v1/notifications/unread-count`

Get count of unread notifications. Use for nav badge.

**Response `200`:**
```json
{
  "success": true,
  "count": 5
}
```

---

### `PUT /api/v1/notifications/read-all`

Mark all unread notifications as read.

**Response `200`:**
```json
{
  "success": true,
  "updated": 5
}
```

---

### `PUT /api/v1/notifications/:id/read`

Mark a single notification as read.

**Response `200`:**
```json
{
  "success": true,
  "data": { /* updated notification object with isRead: true */ }
}
```

**Errors:**
| Status | Error |
|--------|-------|
| 404 | `"Notification not found"` |

---

## 9. Research Service

**Base path:** `/api/v1/research`
**Authentication:** Required on all endpoints.

---

### `GET /api/v1/research`

Get all research projects.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `domain` | string | Exact match filter (e.g. `"Machine Learning"`) |
| `status` | string | `open`, `in_progress`, `completed` |
| `limit` | number | Default 20 |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1...",
      "title": "AI-Powered Irrigation System",
      "description": "Using ML to optimise water usage.",
      "domain": "Machine Learning",
      "creatorId": "64f1...",
      "creatorName": "Dr. Ahmed",
      "collaboratorIds": ["64f2..."],
      "tags": ["IoT", "Python"],
      "status": "open",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/v1/research`

Create a new research project.

**Request Body:**
```json
{
  "title": "AI-Powered Irrigation System",
  "description": "Using ML to optimise water usage in agriculture.",
  "domain": "Machine Learning",
  "tags": ["IoT", "Python", "TensorFlow"]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | ✅ | Min 1 char |
| `description` | string | ✅ | Min 1 char |
| `domain` | string | ✅ | Min 1 char |
| `tags` | string[] | ❌ | — |

**Response `201`:** Full project object. Creator is automatically added as creator (not in `collaboratorIds`).

---

### `GET /api/v1/research/:id`

Get a single research project.

**Response `200`:** Full project object.

---

### `PUT /api/v1/research/:id`

Update a research project. Creator or admin only.

**Request Body** (all optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "domain": "Embedded Systems",
  "tags": ["C++", "RTOS"],
  "status": "in_progress"
}
```

| `status` values | Description |
|----------------|-------------|
| `open` | Accepting collaborators |
| `in_progress` | Active, may or may not accept more |
| `completed` | Closed — `joinProject` will be rejected |

**Response `200`:** Updated project object.

---

### `POST /api/v1/research/:id/join`

Join a research project as a collaborator. Cannot join a `completed` project.

**Response `200`:** Full project object with updated `collaboratorIds`.

**Errors:**
| Status | Error |
|--------|-------|
| 400 | `"Project is closed"` |

---

### `DELETE /api/v1/research/:id/leave`

Leave a research project. The creator cannot leave their own project.

**Response `200`:**
```json
{ "success": true }
```

**Errors:**
| Status | Error |
|--------|-------|
| 400 | `"Creator cannot leave their own project"` |

---

## 10. Analytics Service

**Base path:** `/api/v1/analytics`
**Authentication:** Required. Admin only.

---

### `GET /api/v1/analytics/metrics`

Get aggregated platform metrics.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 120,
    "totalPosts": 340,
    "totalJobs": 45,
    "totalEvents": 12,
    "totalApplications": 89,
    "totalRsvps": 210
  }
}
```

> Metrics are updated asynchronously via Pub/Sub as events occur.

---

## 11. Realtime Service (WebSocket)

**URL:** `ws://localhost:8082/realtime` (proxied by gateway)
**Protocol:** Socket.IO v4

---

### Connection

Connect with a valid JWT access token:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8082', {
  path: '/realtime/socket.io',
  auth: { token: accessToken }
});

socket.on('connect', () => console.log('Connected'));
socket.on('connect_error', (err) => console.error(err.message));
```

The socket connection will be rejected if the token is missing or invalid.

---

### Events: Server → Client

These are events your frontend should **listen** for:

| Event | Payload | When |
|-------|---------|------|
| `message` | `{ _id, senderId, recipientId, conversationId, content, isRead, createdAt }` | New incoming message |
| `message:sent` | `{ _id, senderId, recipientId, conversationId, content, createdAt }` | Your own message confirmed (multi-tab) |
| `message:read` | `{ messageId, conversationId, readBy }` | Recipient read your message (read receipt) |
| `notification` | `{ _id, type, content, link, isRead, createdAt }` | New notification delivered |
| `feed:new_post` | `{ _id, authorId, authorName, authorAvatar, content, mediaUrls, likeCount, commentCount, shareCount, createdAt }` | New post created by anyone |
| `typing:start` | `{ senderId, conversationId }` | Another user started typing |
| `typing:stop` | `{ senderId, conversationId }` | Another user stopped typing |
| `user:online` | `{ userId }` | A user connected |
| `user:offline` | `{ userId }` | A user disconnected (all tabs) |

---

### Events: Client → Server

These are events your frontend should **emit**:

| Event | Payload | Effect |
|-------|---------|--------|
| `typing:start` | `{ recipientId, conversationId }` | Forwards `typing:start` to recipient |
| `typing:stop` | `{ recipientId, conversationId }` | Forwards `typing:stop` to recipient |

---

### Presence Pattern

```javascript
// Track who is online
const onlineUsers = new Set();

socket.on('user:online',  ({ userId }) => onlineUsers.add(userId));
socket.on('user:offline', ({ userId }) => onlineUsers.delete(userId));
```

---

### Typing Indicator Pattern

```javascript
let typingTimer;

function onInputChange() {
  socket.emit('typing:start', { recipientId, conversationId });
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing:stop', { recipientId, conversationId });
  }, 1500);
}

socket.on('typing:start', ({ senderId }) => showTypingIndicator(senderId));
socket.on('typing:stop',  ({ senderId }) => hideTypingIndicator(senderId));
```

---

### Read Receipt Pattern

```javascript
// When user opens a conversation, mark messages as read
async function openConversation(otherUserId) {
  const { data } = await api.get(`/messages/conversation/${otherUserId}`);
  const unread = data.filter(m => !m.isRead && m.recipientId === myUserId);
  for (const m of unread) {
    await api.put(`/messages/${m._id}/read`);
  }
}

// Sender: update UI when read receipt arrives
socket.on('message:read', ({ messageId }) => {
  markMessageAsRead(messageId);
});
```

---

## 12. Media Uploads (R2)

All media is stored in Cloudflare R2. Uploads are **direct from browser** — no file data goes through the gateway.

### Supported MIME Types

| MIME Type | Extension | Endpoint |
|-----------|-----------|----------|
| `image/jpeg` | `.jpg` | feed, avatar |
| `image/png` | `.png` | feed, avatar |
| `image/gif` | `.gif` | feed only |
| `image/webp` | `.webp` | feed, avatar |
| `video/mp4` | `.mp4` | feed only |
| `video/webm` | `.webm` | feed only |

### Key Paths in Bucket

| Path | Used For |
|------|----------|
| `posts/{uuid}.{ext}` | Post media (images/videos) |
| `avatars/{userId}.{ext}` | User profile avatar (overwritten on re-upload) |

### Upload Flow (Post Media)

```
1.  POST /api/v1/feed/media/upload-url
    Body: { mimeType: "image/jpeg", count: 2 }
    → Response: { files: [{ uploadUrl, publicUrl, key }] }

2.  PUT <uploadUrl>
    Headers: Content-Type: image/jpeg
    Body: <binary file>
    → 200 OK (directly from R2, no server)

3.  POST /api/v1/feed/posts
    Body: { content: "...", mediaUrls: ["<publicUrl>"] }
    → Server verifies file exists in R2, saves post
```

### Upload Flow (Avatar)

```
1.  POST /api/v1/users/me/avatar
    Body: { mimeType: "image/jpeg" }
    → Response: { uploadUrl, publicUrl, key }

2.  PUT <uploadUrl>
    Headers: Content-Type: image/jpeg
    Body: <binary file>

3.  PUT /api/v1/users/me/avatar
    Body: { avatarUrl: "<publicUrl>" }
    → Saves URL to user profile
```

> Pre-signed URLs expire in **5 minutes**. Generate them just before upload.

---

## 13. Error Format

All error responses follow this shape:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

Zod validation errors return an array:
```json
{
  "success": false,
  "error": [
    { "path": ["email"], "message": "Invalid email" }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (validation, business logic) |
| `401` | Unauthenticated — missing or invalid token |
| `403` | Forbidden — authenticated but insufficient role/ownership |
| `404` | Resource not found |
| `500` | Internal server error |

---

## 14. Role Permissions Matrix

| Endpoint | student | alumni | admin |
|----------|:-------:|:------:|:-----:|
| Register / Login / Refresh | ✅ | ✅ | ✅ |
| View/Update own profile | ✅ | ✅ | ✅ |
| Upload avatar | ✅ | ✅ | ✅ |
| Search users | ✅ | ✅ | ✅ |
| Follow/Unfollow | ✅ | ✅ | ✅ |
| View user profiles | ✅ | ✅ | ✅ |
| List all users | ❌ | ❌ | ✅ |
| Update user role | ❌ | ❌ | ✅ |
| Create post | ✅ | ✅ | ✅ |
| Edit/Delete own post | ✅ | ✅ | ✅ |
| Like/Comment/Share | ✅ | ✅ | ✅ |
| Upload post media | ✅ | ✅ | ✅ |
| Create job | ❌ | ✅ | ✅ |
| Edit/Delete own job | ❌ | ✅ | ✅ |
| View jobs | ✅ | ✅ | ✅ |
| Apply for job | ✅ | ❌ | ❌ |
| View/Update applications | ❌ | ✅ (own) | ✅ |
| Create/Edit/Delete event | ❌ | ❌ | ✅ |
| View events | ✅ | ✅ | ✅ |
| RSVP / Cancel RSVP | ✅ | ✅ | ✅ |
| View attendees | ✅ | ✅ | ✅ |
| Create research project | ✅ | ✅ | ✅ |
| Update own research project | ✅ (creator) | ✅ (creator) | ✅ |
| Join research project | ✅ | ✅ | ✅ |
| Leave research project | ✅ | ✅ | ✅ |
| Send/Read/Delete messages | ✅ | ✅ | ✅ |
| View notifications | ✅ | ✅ | ✅ |
| Mark notifications read | ✅ | ✅ | ✅ |
| View analytics metrics | ❌ | ❌ | ✅ |
| Connect WebSocket | ✅ | ✅ | ✅ |

---

*Generated from source — March 2026*
