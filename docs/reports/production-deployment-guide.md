# DECP Platform — Production Deployment & FCM Guide

**Created:** 2026-02-28  
**Status:** Pending — to be executed after frontend implementation is complete  
**Prerequisite:** All backend services verified working locally (see `backend-verification-report-2026-02-28.md`)

---

## Track 1 — GCP Production Deployment

### Overview

The local Docker Compose cluster must be migrated to Google Cloud Platform. Each microservice becomes an independent **Cloud Run** service. The local emulators (MongoDB, Pub/Sub) are replaced with **MongoDB Atlas** and **real GCP Pub/Sub**.

```
Current (Local)                   Target (GCP)
──────────────────────────────    ─────────────────────────────────────
docker-compose.yml                Cloud Run (one service per container)
mongodb://mongodb:27017            MongoDB Atlas cluster URI
pubsub (emulator :8085)           GCP Pub/Sub (real)
docker-compose.env                GCP Secret Manager
0.0.0.0:8082 (gateway)           Cloud Run Gateway service URL (HTTPS)
decp-realtime :3010               Cloud Run Realtime (min-instances: 1)
```

---

### Step 1 — GCP Project Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **New Project**
2. Note your **Project ID** (e.g. `decp-platform-2026`)
3. Enable the following APIs in **APIs & Services → Library**:
   - Cloud Run Admin API
   - Artifact Registry API
   - Cloud Pub/Sub API
   - Secret Manager API
   - Cloud Build API
4. Install and initialise the CLI:
   ```bash
   gcloud auth login
   gcloud config set project decp-platform-2026
   gcloud auth configure-docker asia-south1-docker.pkg.dev
   ```

---

### Step 2 — MongoDB Atlas

> Replace the local MongoDB container with a managed Atlas cluster.

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Create a Free Cluster** (M0)
2. Choose **Asia Pacific (Singapore)** region for lowest latency from Sri Lanka
3. Create a database user with **Read and Write** permissions
4. Whitelist IPs: `0.0.0.0/0` *(allow all — Cloud Run has dynamic egress IPs)*
5. Click **Connect → Drivers → Node.js** and copy the URI:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/decp?retryWrites=true&w=majority
   ```
6. This value becomes the `MONGODB_URI` secret in GCP Secret Manager (Step 4)

---

### Step 3 — Google Artifact Registry (Container Images)

Create a Docker repository and push all images:

```bash
# Create the registry
gcloud artifacts repositories create decp-services \
  --repository-format=docker \
  --location=asia-south1 \
  --description="DECP microservice images"

# Build and push each service
REGION=asia-south1
PROJECT=decp-platform-2026
REPO=$REGION-docker.pkg.dev/$PROJECT/decp-services

services=(auth user feed jobs events messaging notification analytics research realtime gateway)
for svc in "${services[@]}"; do
  docker build -t $REPO/$svc:latest ./services/$svc
  docker push $REPO/$svc:latest
done

# Gateway is in a separate directory
docker build -t $REPO/gateway:latest ./gateway
docker push $REPO/gateway:latest
```

---

### Step 4 — GCP Secret Manager

Store all sensitive values as secrets instead of `.env` files:

```bash
# Helper function
create_secret() {
  echo -n "$2" | gcloud secrets create $1 --data-file=-
}

create_secret MONGODB_URI           "mongodb+srv://..."
create_secret JWT_SECRET            "your-strong-secret-here"
create_secret INTERNAL_SERVICE_SECRET "your-strong-internal-secret"
create_secret R2_ACCOUNT_ID         "07ca16f61d6ad7b4b0139e45bb7a6b82"
create_secret R2_ACCESS_KEY_ID      "your-r2-access-key"
create_secret R2_SECRET_ACCESS_KEY  "your-r2-secret"
create_secret R2_BUCKET_NAME        "decp-media"
create_secret R2_PUBLIC_URL         "https://pub-616c56e560c046bfb9941f46ef9961f5.r2.dev"
create_secret FIREBASE_SERVICE_ACCOUNT_JSON "$(cat firebase-service-account.json)"
```

Grant Cloud Run access to secrets:
```bash
PROJECT_NUMBER=$(gcloud projects describe decp-platform-2026 --format='value(projectNumber)')
SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding decp-platform-2026 \
  --member="serviceAccount:$SA" \
  --role="roles/secretmanager.secretAccessor"
```

---

### Step 5 — GCP Pub/Sub Topics & Subscriptions

Create the real Pub/Sub topics and push subscriptions. The push endpoint URLs will be the Cloud Run service URLs (known after Step 6):

```bash
# Create topics
topics=(decp.user.registered decp.post.created decp.post.liked decp.job.posted decp.job.applied decp.event.created decp.event.rsvp)
for topic in "${topics[@]}"; do
  gcloud pubsub topics create $topic
done

# Create push subscriptions (replace <SERVICE_URL> with actual Cloud Run URLs after Step 6)
NOTIFY_URL=https://notification-<hash>-uc.a.run.app
ANALYTICS_URL=https://analytics-<hash>-uc.a.run.app

gcloud pubsub subscriptions create decp.post.liked-notify \
  --topic=decp.post.liked \
  --push-endpoint=$NOTIFY_URL/pubsub/push \
  --push-auth-service-account=$SA

gcloud pubsub subscriptions create decp.post.liked-analytics \
  --topic=decp.post.liked \
  --push-endpoint=$ANALYTICS_URL/pubsub/push \
  --push-auth-service-account=$SA

# Repeat for all events in setup-pubsub.js
```

> **Reference:** `scripts/setup-pubsub.js` contains the full topic/subscription list to replicate.

---

### Step 6 — Deploy Microservices to Cloud Run

Deploy each service individually. Note: the Gateway must be deployed **last** because it needs the URLs of all other services.

```bash
REGION=asia-south1
PROJECT=decp-platform-2026
REPO=$REGION-docker.pkg.dev/$PROJECT/decp-services

# Deploy backend services
for svc in auth user feed jobs events messaging notification analytics research; do
  gcloud run deploy decp-$svc \
    --image=$REPO/$svc:latest \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --set-secrets="MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest,INTERNAL_SERVICE_SECRET=INTERNAL_SERVICE_SECRET:latest" \
    --set-env-vars="GOOGLE_CLOUD_PROJECT_ID=decp-platform-2026" \
    --min-instances=0 \
    --max-instances=10
  
  echo "Deployed $svc. Note the URL above."
done
```

#### ⚠️ Realtime Service — Special Configuration

The Realtime service uses WebSockets. Cloud Run supports WebSocket connections, **but** each instance has an independent in-memory socket registry. If multiple instances run, a user connected to Instance A cannot receive events emitted to Instance B.

**Required for production:**

```bash
# Deploy with min-instances=1 (no cold starts break WS connections)
gcloud run deploy decp-realtime \
  --image=$REPO/realtime:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=1 \  # Single instance until Redis adapter is added
  --set-secrets="JWT_SECRET=JWT_SECRET:latest,INTERNAL_SERVICE_SECRET=INTERNAL_SERVICE_SECRET:latest"
```

**For multi-instance scaling (future):** Install the Redis adapter:
```bash
npm install @socket.io/redis-adapter ioredis --prefix services/realtime
```
Then provision **Cloud Memorystore (Redis)** and configure in `services/realtime/src/index.js`:
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('ioredis');
const pub = createClient({ host: process.env.REDIS_HOST });
const sub = pub.duplicate();
io.adapter(createAdapter(pub, sub));
```

#### Deploy Gateway (last)

Once all service URLs are known, update them in the gateway environment:
```bash
gcloud run deploy decp-gateway \
  --image=$REPO/gateway:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --set-secrets="JWT_SECRET=JWT_SECRET:latest,INTERNAL_SERVICE_SECRET=INTERNAL_SERVICE_SECRET:latest" \
  --set-env-vars="\
AUTH_SERVICE_URL=https://decp-auth-<hash>.run.app,\
USER_SERVICE_URL=https://decp-user-<hash>.run.app,\
FEED_SERVICE_URL=https://decp-feed-<hash>.run.app,\
JOBS_SERVICE_URL=https://decp-jobs-<hash>.run.app,\
EVENTS_SERVICE_URL=https://decp-events-<hash>.run.app,\
MESSAGING_SERVICE_URL=https://decp-messaging-<hash>.run.app,\
NOTIFICATION_SERVICE_URL=https://decp-notification-<hash>.run.app,\
ANALYTICS_SERVICE_URL=https://decp-analytics-<hash>.run.app,\
RESEARCH_SERVICE_URL=https://decp-research-<hash>.run.app,\
REALTIME_SERVICE_URL=https://decp-realtime-<hash>.run.app"
```

---

### Step 7 — Cloudflare R2 CORS Update

Update the CORS policy on the `decp-media` bucket to include the production frontend domain:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type", "*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

### Step 8 — Verify Production Deployment

```bash
GATEWAY_URL=https://decp-gateway-<hash>.run.app

# Health check
curl $GATEWAY_URL/health

# Auth
curl -X POST $GATEWAY_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@decp.app","password":"test123","name":"Test User","role":"student"}'

# Run the full E2E test suite against production
GATEWAY_BASE_URL=$GATEWAY_URL bash run-all-tests.sh
```

---

### Track 1 Summary Checklist

```
[ ] GCP Project created, APIs enabled
[ ] MongoDB Atlas cluster created, URI copied
[ ] Artifact Registry repository created
[ ] All Docker images built and pushed
[ ] All secrets stored in Secret Manager
[ ] Real Pub/Sub topics and push subscriptions created
[ ] Backend services deployed to Cloud Run
[ ] Realtime service deployed with min-instances=1
[ ] Gateway deployed with all service URLs
[ ] R2 CORS policy updated for production domain
[ ] Production E2E tests passing
```

---
---

## Track 2 — Firebase FCM Push Notifications

### Overview

Currently, the Notification service saves notifications to MongoDB and emits them via WebSocket (socket.io). Firebase Cloud Messaging adds a **native mobile push notification layer** — notifications are delivered to the user's device even when the app is closed or in the background.

```
Event (Pub/Sub) → Notification Service
                        │
                        ├── Save to MongoDB       (always)
                        ├── Emit via socket.io    (if user online)
                        └── Send FCM push         (if FCM token registered) ← NEW
```

---

### Step 1 — Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it `DECP Platform`
3. Disable Google Analytics if you don't need it
4. In **Project Settings → Service Accounts** → **Generate new private key**
5. Save the downloaded JSON file as `firebase-service-account.json`
6. Store in Secret Manager:
   ```bash
   gcloud secrets create FIREBASE_SERVICE_ACCOUNT_JSON \
     --data-file=firebase-service-account.json
   ```

---

### Step 2 — Enable FCM in Firebase

1. In Firebase Console → **Cloud Messaging** tab
2. Note your **Sender ID** and **Server Key** (used by mobile clients)
3. For **Next.js web app**: generate a **VAPID key** in FCM Web configuration

---

### Step 3 — Backend: Update Notification Service

#### Install Firebase Admin SDK

```bash
npm install firebase-admin --prefix services/notification
```

#### Create `services/notification/lib/fcm.js`

```javascript
const admin = require('firebase-admin');

let app;

function getApp() {
  if (!app) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return app;
}

/**
 * Send a push notification to a specific device token.
 * Fails silently if FCM token is missing or invalid.
 */
async function sendPushNotification(fcmToken, { title, body, link }) {
  if (!fcmToken || process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'dummy') {
    console.log('[FCM] Skipping push — no token or dummy config');
    return;
  }
  try {
    await getApp().messaging().send({
      token: fcmToken,
      notification: { title, body },
      webpush: {
        fcmOptions: { link },
      },
    });
    console.log('[FCM] Push sent successfully');
  } catch (err) {
    console.warn('[FCM] Failed to send push:', err.message);
    // Don't throw — notification is already saved to DB
  }
}

module.exports = { sendPushNotification };
```

#### Update Notification Controller

In `services/notification/src/controllers/notificationController.js`, after saving the notification:

```javascript
const { sendPushNotification } = require('../../lib/fcm');

// After: await notification.save() and emitToUser()

// Fetch the user's FCM token from User service
try {
  const userRes = await internalClient.get(
    `${process.env.USER_SERVICE_URL}/api/v1/users/${notification.recipientId}`
  );
  const fcmToken = userRes.data?.data?.fcmToken;
  await sendPushNotification(fcmToken, {
    title: 'New Notification',
    body: notification.content,
    link: notification.link,
  });
} catch (e) {
  console.warn('[FCM] Could not fetch user FCM token:', e.message);
}
```

---

### Step 4 — User Service: Store FCM Token

The frontend must register the device FCM token and send it to the backend.

#### Add `fcmToken` to User Model

In `services/user/src/models/UserProfile.js`:
```javascript
fcmToken: { type: String, default: null },
```

#### Add PUT /api/v1/users/fcm-token endpoint

In `services/user/src/controllers/userController.js`:
```javascript
exports.updateFcmToken = async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { fcmToken } = req.body;

  await UserProfile.findOneAndUpdate(
    { userId },
    { fcmToken },
    { upsert: true }
  );
  res.json({ success: true });
};
```

Register the route in `services/user/src/routes/userRoutes.js`:
```javascript
router.put('/fcm-token', userController.updateFcmToken);
```

---

### Step 5 — Frontend: Request Notification Permission & Register Token

#### Next.js Web App

```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

```typescript
// hooks/usePushNotifications.ts
import { messaging } from '../lib/firebase';
import { getToken } from 'firebase/messaging';

export async function registerPushToken(apiClient) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });

  // Store token in your backend
  await apiClient.put('/api/v1/users/fcm-token', { fcmToken: token });
  console.log('FCM token registered:', token);
}
```

#### Flutter Mobile App

In `pubspec.yaml`:
```yaml
dependencies:
  firebase_core: latest
  firebase_messaging: latest
```

In `main.dart`:
```dart
await Firebase.initializeApp();
final fcmToken = await FirebaseMessaging.instance.getToken();

// Register with backend
await apiClient.put('/api/v1/users/fcm-token', body: {'fcmToken': fcmToken});
```

---

### Step 6 — Firebase Web Service Worker (Next.js only)

Create `public/firebase-messaging-sw.js` in the Next.js project:
```javascript
importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "...",
  projectId: "decp-platform-2026",
  messagingSenderId: "...",
  appId: "..."
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192.png',
  });
});
```

---

### Track 2 Summary Checklist

```
[ ] Firebase project created
[ ] Service account JSON downloaded and stored in Secret Manager
[ ] FCM enabled in Firebase console, VAPID key generated
[ ] firebase-admin installed in notification service
[ ] services/notification/lib/fcm.js created
[ ] notificationController.js updated to send FCM push
[ ] UserProfile model updated with fcmToken field
[ ] PUT /api/v1/users/fcm-token endpoint added
[ ] Notification service redeployed
[ ] User service redeployed
[ ] Frontend Firebase SDK integrated (Next.js / Flutter)
[ ] FCM token registration flow implemented in frontend
[ ] Service worker added for background push (Next.js)
[ ] End-to-end push notification tested on real device
```

---

## Environment Variables Required for Both Tracks

The following values must be set in GCP Secret Manager before deployment:

| Variable | Source | Track |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | 1 |
| `JWT_SECRET` | Strong random string | 1 |
| `INTERNAL_SERVICE_SECRET` | Strong random string | 1 |
| `GOOGLE_CLOUD_PROJECT_ID` | GCP Project ID | 1 |
| `R2_ACCOUNT_ID` | Already have it | 1 |
| `R2_ACCESS_KEY_ID` | Already have it | 1 |
| `R2_SECRET_ACCESS_KEY` | Already have it | 1 |
| `R2_BUCKET_NAME` | `decp-media` | 1 |
| `R2_PUBLIC_URL` | Already have it | 1 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account JSON | 2 |

> **Note:** All Pub/Sub topic/subscription env vars are set at Cloud Run deploy time as `--set-env-vars` flags since they are not sensitive.
