# DECP – Backend Services Plan

All services are Node.js + Express, containerised with Docker, deployed on GCP Cloud Run.
Each listens on `process.env.PORT` (Cloud Run injects `8080`).
All responses are JSON. All authenticated endpoints expect `Authorization: Bearer <access_token>` header (validated at the gateway before forwarding).

---

## Common Patterns Across All Services

### Dockerfile (identical template)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 8080
CMD ["node", "src/index.js"]
```

### Standard Response Envelope
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

### Shared Environment Variables (all services)
```
MONGODB_URI=mongodb+srv://...@cluster0.mongodb.net/decp_<service>?retryWrites=true
JWT_SECRET=<shared_secret_for_verification>
PORT=8080
NODE_ENV=production
```

---

## Service 1: auth-service

### Responsibility
Issues and validates JWTs. Owns credentials. No business logic beyond auth.

### Endpoints
| Method | Path                   | Auth Required | Description                          |
|--------|------------------------|---------------|--------------------------------------|
| POST   | /api/v1/auth/register  | No            | Create new account                   |
| POST   | /api/v1/auth/login     | No            | Validate credentials, return tokens  |
| POST   | /api/v1/auth/refresh   | No            | Exchange refresh token for new access token |
| POST   | /api/v1/auth/logout    | Yes           | Invalidate refresh token             |
| GET    | /api/v1/auth/verify    | Internal only | Validate token (called by gateway)   |
| GET    | /api/v1/auth/health    | No            | Health check                         |

### Request / Response Examples

**POST /api/v1/auth/register**
```json
Request:  { "email": "e20001@eng.pdn.ac.lk", "password": "...", "name": "Alice", "role": "student" }
Response: { "success": true, "data": { "userId": "...", "message": "Registered. Please log in." } }
```

**POST /api/v1/auth/login**
```json
Request:  { "email": "...", "password": "..." }
Response: { "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "...", "user": { "id": "...", "role": "student" } } }
```

### MongoDB Schema (`decp_auth`)
```js
// Collection: users
{
  _id: ObjectId,
  email: String,          // unique, indexed
  passwordHash: String,   // bcrypt, 12 rounds
  role: String,           // "student" | "alumni" | "admin"
  refreshTokens: [String],// array of valid refresh tokens (hashed)
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Dependencies
- None (lowest-level service, no upstream calls)

### Extra Environment Variables
```
BCRYPT_ROUNDS=12
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
```

### Admin Bootstrap (Required Before Demo)

The registration endpoint correctly blocks self-registration as `admin` (by design). An initial admin user must be seeded directly into MongoDB before the demo.

**Seed script:** `scripts/seed-admin.js`
```js
// Run once after first deploy: node scripts/seed-admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);

  const db = mongoose.connection.db;
  const email = 'admin@eng.pdn.ac.lk';

  const existing = await db.collection('users').findOne({ email });
  if (existing) { console.log('Admin already exists'); process.exit(0); }

  const passwordHash = await bcrypt.hash('Admin@DECP2025', 12);
  await db.collection('users').insertOne({
    email,
    passwordHash,
    role: 'admin',
    refreshTokens: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Also seed user-service profile for the admin
  await mongoose.disconnect();
  console.log('Admin user created: admin@eng.pdn.ac.lk / Admin@DECP2025');
}

seedAdmin().catch(console.error);
```

Run after first Cloud Run deployment:
```bash
MONGODB_URI=<decp_auth_connection_string> node scripts/seed-admin.js
```

> After seeding, the admin can log in at `/api/v1/auth/login` and use the admin token to promote other users via `PUT /api/v1/users/:id/role`.

---

## Service 2: user-service

### Responsibility
Owns user profile data (name, bio, photo, skills, graduation year). Role management by admin.

### Endpoints
| Method | Path                          | Auth    | Role       | Description              |
|--------|-------------------------------|---------|------------|--------------------------|
| GET    | /api/v1/users/:id             | Yes     | Any        | Get user profile         |
| PUT    | /api/v1/users/me              | Yes     | Any        | Update own profile       |
| GET    | /api/v1/users/me              | Yes     | Any        | Get own profile          |
| GET    | /api/v1/users                 | Yes     | Admin      | List all users           |
| PUT    | /api/v1/users/:id/role        | Yes     | Admin      | Change user role         |
| POST   | /api/v1/users/me/avatar       | Yes     | Any        | Get R2 pre-signed URL for avatar upload |
| GET    | /api/v1/users/health          | No      | -          | Health check             |

### MongoDB Schema (`decp_users`)
```js
// Collection: profiles
{
  _id: ObjectId,
  userId: String,         // matches auth-service user._id (indexed, unique)
  name: String,
  email: String,          // denormalised for display
  role: String,           // "student" | "alumni" | "admin"
  bio: String,
  avatarUrl: String,      // Cloudflare R2 public URL
  graduationYear: Number,
  skills: [String],
  linkedInUrl: String,
  githubUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Dependencies
- Cloudflare R2 (for pre-signed avatar upload URLs)

### Extra Environment Variables
```
CF_R2_ACCOUNT_ID=
CF_R2_ACCESS_KEY_ID=
CF_R2_SECRET_ACCESS_KEY=
CF_R2_BUCKET_AVATARS=decp-avatars
CF_R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

---

## Service 3: feed-service

### Responsibility
Manages posts, comments, likes, shares. Generates pre-signed R2 URLs for media upload. Publishes `post.created` event to Pub/Sub.

### Endpoints
| Method | Path                                  | Auth | Role       | Description                        |
|--------|---------------------------------------|------|------------|------------------------------------|
| GET    | /api/v1/feed/posts                    | Yes  | Any        | Paginated feed (cursor-based)      |
| POST   | /api/v1/feed/posts                    | Yes  | Any        | Create a new post                  |
| GET    | /api/v1/feed/posts/:id                | Yes  | Any        | Get single post                    |
| PUT    | /api/v1/feed/posts/:id                | Yes  | Owner/Admin| Edit post                          |
| DELETE | /api/v1/feed/posts/:id                | Yes  | Owner/Admin| Delete post                        |
| POST   | /api/v1/feed/posts/:id/like           | Yes  | Any        | Like a post                        |
| DELETE | /api/v1/feed/posts/:id/like           | Yes  | Any        | Unlike a post                      |
| POST   | /api/v1/feed/posts/:id/share          | Yes  | Any        | Share a post (increments shareCount, returns updated count) |
| GET    | /api/v1/feed/posts/:id/comments       | Yes  | Any        | Get comments                       |
| POST   | /api/v1/feed/posts/:id/comments       | Yes  | Any        | Add a comment                      |
| DELETE | /api/v1/feed/posts/:id/comments/:cid  | Yes  | Owner/Admin| Delete a comment                   |
| POST   | /api/v1/feed/media/upload-url         | Yes  | Any        | Get R2 pre-signed URL for media    |
| GET    | /api/v1/feed/posts/popular            | Internal | -     | Top N posts by likes (called by analytics-service only, validated by X-Internal-Token) |
| GET    | /api/v1/feed/health                   | No   | -          | Health check                       |

### Pagination Convention
`GET /api/v1/feed/posts?cursor=<last_post_id>&limit=20`

### MongoDB Schema (`decp_feed`)
```js
// Collection: posts
{
  _id: ObjectId,
  authorId: String,       // user ID
  authorName: String,     // denormalised for display
  authorAvatarUrl: String,
  content: String,
  mediaUrls: [String],    // R2 public URLs
  mediaTypes: [String],   // "image" | "video"
  likeCount: Number,
  commentCount: Number,
  shareCount: Number,
  likedBy: [String],      // array of userIds (for like toggle)
  createdAt: Date,
  updatedAt: Date
}

// Collection: comments
{
  _id: ObjectId,
  postId: String,         // indexed
  authorId: String,
  authorName: String,
  content: String,
  createdAt: Date
}
```

### Pub/Sub Events Published
| Topic               | Payload                                          | Trigger        |
|---------------------|--------------------------------------------------|----------------|
| `decp.post.created` | `{ postId, authorId, authorName, preview }`      | New post saved |

### Extra Environment Variables
```
CF_R2_BUCKET_MEDIA=decp-media
PUBSUB_TOPIC_POST_CREATED=decp.post.created
GOOGLE_CLOUD_PROJECT_ID=
```

---

## Service 4: jobs-service

### Responsibility
Job/internship listings posted by alumni or admin. Application submission by students. Publishes `job.posted` event.

### Endpoints
| Method | Path                              | Auth | Role              | Description                     |
|--------|-----------------------------------|------|-------------------|---------------------------------|
| GET    | /api/v1/jobs                      | Yes  | Any               | List jobs (filter: type, active)|
| POST   | /api/v1/jobs                      | Yes  | Alumni/Admin      | Post a new job                  |
| GET    | /api/v1/jobs/:id                  | Yes  | Any               | Get job details                 |
| PUT    | /api/v1/jobs/:id                  | Yes  | Poster/Admin      | Edit job                        |
| DELETE | /api/v1/jobs/:id                  | Yes  | Poster/Admin      | Remove job                      |
| POST   | /api/v1/jobs/:id/apply            | Yes  | Student           | Apply for a job                 |
| GET    | /api/v1/jobs/:id/applications     | Yes  | Poster/Admin      | View applicants                 |
| GET    | /api/v1/jobs/my-applications      | Yes  | Student           | View own applications           |
| GET    | /api/v1/jobs/health               | No   | -                 | Health check                    |

### MongoDB Schema (`decp_jobs`)
```js
// Collection: jobs
{
  _id: ObjectId,
  postedBy: String,       // userId of poster
  title: String,
  company: String,
  type: String,           // "job" | "internship"
  description: String,
  requirements: [String],
  location: String,
  deadline: Date,
  isActive: Boolean,
  applicationCount: Number,
  createdAt: Date
}

// Collection: applications
{
  _id: ObjectId,
  jobId: String,          // indexed
  applicantId: String,    // indexed
  applicantName: String,
  coverLetter: String,
  cvUrl: String,          // R2 URL (optional)
  status: String,         // "pending" | "reviewed" | "accepted" | "rejected"
  appliedAt: Date
}
```

### Pub/Sub Events Published
| Topic              | Payload                                    | Trigger        |
|--------------------|--------------------------------------------|----------------|
| `decp.job.posted`  | `{ jobId, title, company, postedBy }`      | New job saved  |
| `decp.job.applied` | `{ jobId, applicantId, posterId }`         | Application submitted |

---

## Service 5: events-service

### Responsibility
Department events, workshops, announcements. RSVP tracking. Publishes events to Pub/Sub for notifications.

### Endpoints
| Method | Path                              | Auth | Role        | Description                         |
|--------|-----------------------------------|------|-------------|-------------------------------------|
| GET    | /api/v1/events                    | Yes  | Any         | List upcoming events                |
| POST   | /api/v1/events                    | Yes  | Admin       | Create event/announcement           |
| GET    | /api/v1/events/:id                | Yes  | Any         | Get event details                   |
| PUT    | /api/v1/events/:id                | Yes  | Admin       | Edit event                          |
| DELETE | /api/v1/events/:id                | Yes  | Admin       | Cancel event                        |
| POST   | /api/v1/events/:id/rsvp           | Yes  | Any         | RSVP (attend)                       |
| DELETE | /api/v1/events/:id/rsvp           | Yes  | Any         | Cancel RSVP                         |
| GET    | /api/v1/events/:id/attendees      | Yes  | Admin       | View RSVP list                      |
| GET    | /api/v1/events/health             | No   | -           | Health check                        |

### MongoDB Schema (`decp_events`)
```js
// Collection: events
{
  _id: ObjectId,
  createdBy: String,
  title: String,
  description: String,
  type: String,           // "event" | "announcement" | "workshop"
  venue: String,
  eventDate: Date,
  rsvpDeadline: Date,
  maxAttendees: Number,
  rsvpCount: Number,
  imageUrl: String,       // R2 URL
  createdAt: Date
}

// Collection: rsvps
{
  _id: ObjectId,
  eventId: String,        // indexed
  userId: String,         // indexed
  userName: String,
  rsvpAt: Date
}
```

### Pub/Sub Events Published
| Topic                 | Payload                                         | Trigger         |
|-----------------------|-------------------------------------------------|-----------------|
| `decp.event.created`  | `{ eventId, title, eventDate, createdBy }`      | Event created   |
| `decp.event.rsvp`     | `{ eventId, userId, title }`                    | RSVP confirmed  |

---

## Service 6: research-service

### Responsibility
Research project collaboration: create projects, upload documents to R2, invite collaborators.

### Endpoints
| Method | Path                                           | Auth | Role        | Description                      |
|--------|------------------------------------------------|------|-------------|----------------------------------|
| GET    | /api/v1/research/projects                      | Yes  | Any         | List research projects           |
| POST   | /api/v1/research/projects                      | Yes  | Any         | Create project                   |
| GET    | /api/v1/research/projects/:id                  | Yes  | Any         | Get project details              |
| PUT    | /api/v1/research/projects/:id                  | Yes  | Owner       | Edit project                     |
| POST   | /api/v1/research/projects/:id/collaborators    | Yes  | Owner       | Invite collaborator by userId    |
| DELETE | /api/v1/research/projects/:id/collaborators/:uid | Yes | Owner     | Remove collaborator              |
| POST   | /api/v1/research/projects/:id/documents        | Yes  | Collaborator| Get R2 pre-signed URL for doc    |
| GET    | /api/v1/research/projects/:id/documents        | Yes  | Collaborator| List project documents           |
| DELETE | /api/v1/research/projects/:id/documents/:did   | Yes  | Owner       | Delete document                  |
| GET    | /api/v1/research/health                        | No   | -           | Health check                     |

### MongoDB Schema (`decp_research`)
```js
// Collection: projects
{
  _id: ObjectId,
  ownerId: String,
  title: String,
  description: String,
  tags: [String],
  status: String,         // "active" | "completed" | "seeking"
  collaboratorIds: [String],
  createdAt: Date
}

// Collection: documents
{
  _id: ObjectId,
  projectId: String,      // indexed
  uploadedBy: String,
  fileName: String,
  fileUrl: String,        // R2 URL
  fileType: String,
  uploadedAt: Date
}
```

---

## Service 7: messaging-service

### Responsibility
Real-time direct messages and group conversations. Uses WebSocket (ws library) in addition to REST for polling/history.

### REST Endpoints
| Method | Path                                        | Auth | Description                        |
|--------|---------------------------------------------|------|------------------------------------|
| GET    | /api/v1/messages/conversations              | Yes  | List user's conversations          |
| POST   | /api/v1/messages/conversations              | Yes  | Create/find DM with another user   |
| GET    | /api/v1/messages/conversations/:id/messages | Yes  | Paginated message history          |
| GET    | /api/v1/messages/health                     | No   | Health check                       |

### WebSocket
```
WS: wss://api.decp.app/api/v1/messages/ws?token=<access_token>

Client → Server events:
  { "type": "join",    "conversationId": "..." }
  { "type": "message", "conversationId": "...", "content": "Hello" }
  { "type": "typing",  "conversationId": "..." }

Server → Client events:
  { "type": "message", "conversationId": "...", "from": "...", "content": "...", "sentAt": "..." }
  { "type": "typing",  "conversationId": "...", "from": "..." }
```

**Note on WebSocket + Cloud Run:** Cloud Run supports WebSocket connections natively (HTTP/2 or session affinity). Set `--session-affinity` flag in Cloud Run service config to maintain WebSocket connections.

### MongoDB Schema (`decp_messaging`)
```js
// Collection: conversations
{
  _id: ObjectId,
  type: String,           // "dm" | "group"
  participantIds: [String],
  name: String,           // group name (optional)
  lastMessage: String,
  lastMessageAt: Date,
  createdAt: Date
}

// Collection: messages
{
  _id: ObjectId,
  conversationId: String, // indexed
  senderId: String,
  senderName: String,
  content: String,
  sentAt: Date
}
```

---

## Service 8: notification-service

### Responsibility
Stores in-app notifications. Subscribes to all Pub/Sub topics and dispatches push notifications via FCM. Exposes REST for clients to read/mark notifications.

### Endpoints
| Method | Path                                   | Auth | Description                             |
|--------|----------------------------------------|------|-----------------------------------------|
| GET    | /api/v1/notifications                  | Yes  | Get user's notifications (paginated)    |
| PUT    | /api/v1/notifications/:id/read         | Yes  | Mark one notification as read           |
| PUT    | /api/v1/notifications/read-all         | Yes  | Mark all as read                        |
| POST   | /api/v1/notifications/device-token     | Yes  | Register FCM token for push             |
| DELETE | /api/v1/notifications/device-token     | Yes  | Remove FCM token (logout)               |
| GET    | /api/v1/notifications/health           | No   | Health check                            |

### Pub/Sub Subscriptions
| Topic                 | Action on Receive                                              |
|-----------------------|----------------------------------------------------------------|
| `decp.post.created`   | Create notification for followers; send push via FCM          |
| `decp.job.posted`     | Notify all students                                           |
| `decp.job.applied`    | Notify poster that someone applied                            |
| `decp.event.created`  | Notify all users                                              |
| `decp.event.rsvp`     | Confirm RSVP to attendee                                      |

### MongoDB Schema (`decp_notifications`)
```js
// Collection: notifications
{
  _id: ObjectId,
  recipientId: String,    // indexed
  type: String,           // "post", "job", "event", "application", "rsvp"
  title: String,
  body: String,
  data: Object,           // contextual data { entityId, entityType }
  isRead: Boolean,
  createdAt: Date
}

// Collection: device_tokens
{
  _id: ObjectId,
  userId: String,         // indexed
  fcmToken: String,
  platform: String,       // "web" | "android" | "ios"
  updatedAt: Date
}
```

### Extra Environment Variables
```
FIREBASE_SERVICE_ACCOUNT_JSON=<base64-encoded service account JSON from Firebase Console>
GOOGLE_CLOUD_PROJECT_ID=
PUBSUB_SUBSCRIPTION_NOTIFICATIONS=decp-notification-sub
```

> **Important:** Do NOT use the legacy FCM server key (`FCM_SERVER_KEY`). Google shut down the
> legacy FCM HTTP API on June 20, 2024. Use the **Firebase Admin SDK** (`firebase-admin` npm
> package) which authenticates via a service account JSON file. Obtain this from Firebase Console →
> Project Settings → Service Accounts → Generate new private key. Store the downloaded JSON content
> (base64-encoded) in GCP Secret Manager as `firebase-service-account` and load it at runtime:
>
> ```js
> const admin = require('firebase-admin');
> const serviceAccount = JSON.parse(
>   Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8')
> );
> admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
>
> // Send push notification via FCM v1 API
> async function sendPush(fcmToken, title, body, data = {}) {
>   await admin.messaging().send({
>     token: fcmToken,
>     notification: { title, body },
>     data,
>   });
> }
> ```

---

## Service 9: analytics-service

### Responsibility
Aggregates metrics for the admin dashboard. Subscribes to Pub/Sub events and maintains counters. Also fetches data from other services via internal HTTP.

### Endpoints
| Method | Path                              | Auth | Role  | Description                        |
|--------|-----------------------------------|------|-------|------------------------------------|
| GET    | /api/v1/analytics/overview        | Yes  | Admin | Overall platform stats             |
| GET    | /api/v1/analytics/active-users    | Yes  | Admin | Active user count (daily/weekly)   |
| GET    | /api/v1/analytics/popular-posts   | Yes  | Admin | Top N posts by likes               |
| GET    | /api/v1/analytics/job-applications| Yes  | Admin | Job application counts             |
| GET    | /api/v1/analytics/events          | Yes  | Admin | Event attendance stats             |
| GET    | /api/v1/analytics/health          | No   | -     | Health check                       |

### Analytics Overview Response
```json
{
  "totalUsers": 245,
  "activeUsersToday": 42,
  "totalPosts": 1320,
  "totalJobApplications": 87,
  "totalEvents": 18,
  "popularPosts": [{ "postId": "...", "likes": 120 }],
  "jobApplicationsByWeek": [{ "week": "2025-W01", "count": 12 }]
}
```

### MongoDB Schema (`decp_analytics`)
```js
// Collection: daily_stats
{
  _id: ObjectId,
  date: Date,             // indexed, daily bucket
  activeUserIds: [String],
  newUsers: Number,
  postsCreated: Number,
  jobsPosted: Number,
  applicationsSubmitted: Number,
  eventsCreated: Number,
  rsvpsCount: Number
}
```

### Pub/Sub Subscriptions
| Topic                 | Action                          |
|-----------------------|---------------------------------|
| `decp.post.created`   | Increment postsCreated counter  |
| `decp.job.posted`     | Increment jobsPosted counter    |
| `decp.job.applied`    | Increment applicationsSubmitted |
| `decp.event.created`  | Increment eventsCreated counter |
| `decp.event.rsvp`     | Increment rsvpsCount            |

---

## Cross-Cutting: Internal Service Auth Header

When services call each other directly (e.g., analytics fetching popular posts from feed-service), they use an internal service token:
```
X-Internal-Token: <INTERNAL_SERVICE_SECRET>
```
Each service validates this header and bypasses JWT auth for internal calls.

```
INTERNAL_SERVICE_SECRET=<shared_secret_between_services>
```
