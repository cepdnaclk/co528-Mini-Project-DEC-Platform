# DECP – Cloud Deployment Plan

---

## 1. Deployment Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          INTERNET                                    │
└───────────┬──────────────────────────────────────┬───────────────────┘
            │                                      │
  ┌─────────▼──────────┐               ┌───────────▼──────────────┐
  │   Vercel (CDN)     │               │  GCP Cloud Run (us-central)│
  │  Next.js Web App   │               │  Custom Domain: api.decp.app│
  │  decp.vercel.app   │               │                           │
  └────────────────────┘               │  ┌─────────────────────┐  │
                                       │  │  decp-gateway       │  │
  ┌─────────────────────┐              │  │  (public endpoint)  │  │
  │  Flutter Mobile App │              │  └──────────┬──────────┘  │
  │  (APK / Play Store) │              │             │             │
  └─────────────────────┘              │  Internal services (private):
                                       │  ┌──────┐ ┌──────┐ ┌──────┐
                                       │  │ auth │ │users │ │ feed │
                                       │  └──────┘ └──────┘ └──────┘
                                       │  ┌──────┐ ┌──────┐ ┌──────┐
                                       │  │ jobs │ │evnts │ │resrch│
                                       │  └──────┘ └──────┘ └──────┘
                                       │  ┌──────┐ ┌──────┐ ┌──────┐
                                       │  │ msgs │ │notif │ │anlyt │
                                       │  └──────┘ └──────┘ └──────┘
                                       └───────────────────────────────┘
                                                    │
                  ┌─────────────────────────────────┼──────────────────┐
                  │                                 │                  │
     ┌────────────▼───────────┐     ┌───────────────▼────┐   ┌────────▼────────┐
     │   MongoDB Atlas M0     │     │  Cloudflare R2     │   │  GCP Pub/Sub    │
     │   9 logical databases  │     │  media + docs      │   │  event bus      │
     └────────────────────────┘     └────────────────────┘   └─────────────────┘
                  │
     ┌────────────▼───────────┐
     │  Firebase (FCM)        │
     │  push notifications    │
     └────────────────────────┘
```

---

## 2. GCP Cloud Run Services

### Service Configuration

| Service Name          | Ingress     | Min Instances | Max Instances | Memory | CPU  |
|-----------------------|-------------|---------------|---------------|--------|------|
| `decp-gateway`        | Public      | 0             | 10            | 256Mi  | 1    |
| `decp-auth`           | Internal    | 0             | 5             | 256Mi  | 1    |
| `decp-users`          | Internal    | 0             | 5             | 256Mi  | 1    |
| `decp-feed`           | Internal    | 0             | 5             | 512Mi  | 1    |
| `decp-jobs`           | Internal    | 0             | 5             | 256Mi  | 1    |
| `decp-events`         | Internal    | 0             | 5             | 256Mi  | 1    |
| `decp-research`       | Internal    | 0             | 5             | 256Mi  | 1    |
| `decp-messaging`      | Internal    | 1             | 5             | 512Mi  | 1    |
| `decp-notifications`  | Internal    | 0             | 5             | 256Mi  | 1    |
| `decp-analytics`      | Internal    | 0             | 3             | 256Mi  | 1    |

**Key settings:**
- `Min Instances = 0` → scale-to-zero when no traffic (free tier maximised)
- `Min Instances = 1` → messaging-service only: keeps one warm instance so existing WebSocket connections are not dropped mid-demo
- `Ingress = Internal` → internal services cannot be called from the internet, only from within GCP
- `Ingress = Public` → only the gateway is accessible from the internet
- `--allow-unauthenticated` → only on gateway (other services use IAM)

### Cloud Run YAML Example (`infra/cloud-run/gateway.yaml`)
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: decp-gateway
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
        - image: gcr.io/decp-project/gateway:latest
          resources:
            limits:
              memory: "256Mi"
              cpu: "1000m"
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: decp-secrets
                  key: jwt-secret
            - name: AUTH_SERVICE_URL
              value: "https://decp-auth-<hash>-uc.a.run.app"
            # ... other env vars
```

---

## 3. Deployment Steps (First Time)

### Prerequisites
```bash
# Install gcloud CLI and authenticate
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com containerregistry.googleapis.com pubsub.googleapis.com secretmanager.googleapis.com
```

### Step 1: Create GCP Secrets
```bash
# Store shared secrets in GCP Secret Manager
echo -n "<jwt_secret>" | gcloud secrets create jwt-secret --data-file=-
echo -n "<mongodb_uri>" | gcloud secrets create mongodb-uri-auth --data-file=-
echo -n "<cf_r2_access_key>" | gcloud secrets create cf-r2-access-key --data-file=-
echo -n "<internal_token>" | gcloud secrets create internal-service-secret --data-file=-
```

### Step 2: Create Pub/Sub Topics and Subscriptions
```bash
# Create topics
for topic in post.created job.posted job.applied event.created event.rsvp user.registered; do
  gcloud pubsub topics create decp.$topic
done

# Create subscriptions (push to notification-service)
gcloud pubsub subscriptions create decp-notification-post-sub \
  --topic=decp.post.created \
  --push-endpoint=https://decp-notifications-<hash>-uc.a.run.app/pubsub/push

gcloud pubsub subscriptions create decp-analytics-post-sub \
  --topic=decp.post.created \
  --push-endpoint=https://decp-analytics-<hash>-uc.a.run.app/pubsub/push

# Repeat for all topics/subscriptions (see plan 03)
```

### Step 3: Build and Push Docker Images
```bash
# For each service (replace <service> with actual service name)
cd services/<service>
docker build -t gcr.io/<PROJECT_ID>/decp-<service>:latest .
docker push gcr.io/<PROJECT_ID>/decp-<service>:latest
```

### Step 4: Deploy to Cloud Run
```bash
# Deploy each service (example for auth-service)
gcloud run deploy decp-auth \
  --image gcr.io/<PROJECT_ID>/decp-auth:latest \
  --region us-central1 \
  --no-allow-unauthenticated \
  --ingress internal \
  --memory 256Mi \
  --min-instances 0 \
  --max-instances 5 \
  --set-secrets JWT_SECRET=jwt-secret:latest,MONGODB_URI=mongodb-uri-auth:latest

# Deploy gateway (public)
gcloud run deploy decp-gateway \
  --image gcr.io/<PROJECT_ID>/decp-gateway:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --ingress all \
  --memory 256Mi \
  --set-env-vars AUTH_SERVICE_URL=https://decp-auth-<hash>-uc.a.run.app,...
```

### Messaging-Service: Special Deploy Command

The messaging-service needs `--min-instances 1` (to keep WebSocket connections alive) and `--session-affinity` (to route WebSocket clients to the same container instance):

```bash
gcloud run deploy decp-messaging \
  --image gcr.io/<PROJECT_ID>/decp-messaging:latest \
  --region us-central1 \
  --no-allow-unauthenticated \
  --ingress internal \
  --memory 512Mi \
  --min-instances 1 \
  --max-instances 5 \
  --session-affinity \
  --set-secrets MONGODB_URI=mongodb-uri-messaging:latest,INTERNAL_SERVICE_SECRET=internal-service-secret:latest
```

> Without `--session-affinity`, WebSocket clients may be routed to a different container instance on each request, breaking the persistent connection.

### Step 5: Configure Custom Domain
```bash
gcloud run domain-mappings create \
  --service decp-gateway \
  --domain api.decp.app \
  --region us-central1
# Then add CNAME record in your DNS: api → ghs.googlehosted.com
```

---

## 4. CI/CD with GitHub Actions

### `.github/workflows/deploy.yml`
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1

jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            gateway: services/gateway/**
            auth: services/auth-service/**
            users: services/user-service/**
            feed: services/feed-service/**
            jobs: services/jobs-service/**
            events: services/events-service/**
            research: services/research-service/**
            messaging: services/messaging-service/**
            notifications: services/notification-service/**
            analytics: services/analytics-service/**
            web: web/**

  deploy-services:
    needs: detect-changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker

      - name: Build and Deploy Changed Services
        run: |
          SERVICES='${{ needs.detect-changes.outputs.services }}'
          for service in $(echo $SERVICES | jq -r '.[]'); do
            echo "Deploying $service..."
            SERVICE_DIR="services/${service}-service"
            [ "$service" = "gateway" ] && SERVICE_DIR="services/gateway"

            docker build -t gcr.io/$PROJECT_ID/decp-$service:$GITHUB_SHA $SERVICE_DIR
            docker push gcr.io/$PROJECT_ID/decp-$service:$GITHUB_SHA

            gcloud run deploy decp-$service \
              --image gcr.io/$PROJECT_ID/decp-$service:$GITHUB_SHA \
              --region $REGION \
              --quiet
          done

  deploy-web:
    needs: detect-changes
    if: contains(needs.detect-changes.outputs.services, 'web')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./web
```

This pipeline only rebuilds and redeploys services whose files changed, saving build time and Cloud Run deployments.

---

## 5. MongoDB Atlas Setup

### Steps
1. Create free M0 cluster at `cloud.mongodb.com`
2. Create database user: `decp-app` with password
3. Whitelist IPs: Add `0.0.0.0/0` (allow all — acceptable for prototype, use Cloud Run IP range in production)
4. Get connection string: `mongodb+srv://decp-app:<password>@cluster0.xxxxx.mongodb.net/`
5. Each service appends its own DB name: `.../decp_auth`, `.../decp_feed`, etc.

### Index Strategy
```js
// auth-service: index on email
db.users.createIndex({ email: 1 }, { unique: true });

// feed-service: index on createdAt for pagination
db.posts.createIndex({ createdAt: -1 });
db.comments.createIndex({ postId: 1, createdAt: -1 });

// jobs-service: index for filtering
db.jobs.createIndex({ isActive: 1, type: 1, createdAt: -1 });
db.applications.createIndex({ jobId: 1 });
db.applications.createIndex({ applicantId: 1 });

// events-service
db.events.createIndex({ eventDate: 1 });
db.rsvps.createIndex({ eventId: 1, userId: 1 }, { unique: true });

// notifications
db.notifications.createIndex({ recipientId: 1, createdAt: -1 });
db.notifications.createIndex({ recipientId: 1, isRead: 1 });
```

---

## 6. Cloudflare R2 Setup

### Steps
1. Create Cloudflare account (free)
2. Navigate to R2 → Create bucket: `decp-media`
3. Create API token with R2 read/write permissions
4. Note: `Account ID`, `Access Key ID`, `Secret Access Key`
5. Enable public access for the bucket (for direct URL delivery)

### Pre-signed URL Generation (in feed-service / research-service)
```js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
  },
});

async function getUploadUrl(fileName, fileType) {
  const key = `${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: process.env.CF_R2_BUCKET,
    Key: key,
    ContentType: fileType,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 min
  const publicUrl = `${process.env.CF_R2_PUBLIC_URL}/${key}`;
  return { uploadUrl, publicUrl };
}
```

---

## 7. Vercel Deployment (Next.js)

### Steps
1. Push monorepo to GitHub
2. Import project in Vercel → set Root Directory: `web`
3. Add environment variables in Vercel project settings (all `NEXT_PUBLIC_*` vars)
4. Connect custom domain `decp.app` → Vercel will manage TLS automatically
5. Every push to `main` auto-deploys; every PR gets a preview URL

---

## 8. Firebase Setup (FCM)

1. Create Firebase project at `console.firebase.google.com`
2. Add Android app (package name: `com.decp.app`)
3. Add iOS app (bundle ID: `com.decp.app`)
4. Add Web app → get config object for Next.js
5. Download `google-services.json` → `mobile/android/app/`
6. Download `GoogleService-Info.plist` → `mobile/ios/Runner/`
7. Generate a service account key for the notification-service: Project Settings → Service Accounts → Generate new private key → download the JSON file → base64-encode it → store in GCP Secret Manager as `firebase-service-account`
   ```bash
   # Encode and store the service account JSON
   base64 -w 0 firebase-service-account.json | \
     gcloud secrets create firebase-service-account --data-file=-
   ```
   > **Do NOT use the Firebase Server Key** from Cloud Messaging settings — that legacy API was shut down in June 2024. The service account JSON approach uses the current FCM v1 API via the `firebase-admin` SDK.

---

## 9. Environment Variables Summary

### GCP Secret Manager Keys
| Secret Name              | Used By                        |
|--------------------------|-------------------------------|
| `jwt-secret`             | gateway, auth-service         |
| `mongodb-uri-auth`       | auth-service                  |
| `mongodb-uri-users`      | user-service                  |
| `mongodb-uri-feed`       | feed-service                  |
| `mongodb-uri-jobs`       | jobs-service                  |
| `mongodb-uri-events`     | events-service                |
| `mongodb-uri-research`   | research-service              |
| `mongodb-uri-messaging`  | messaging-service             |
| `mongodb-uri-notifications` | notification-service       |
| `mongodb-uri-analytics`  | analytics-service             |
| `cf-r2-access-key`       | feed-service, research-service, user-service |
| `cf-r2-secret-key`       | feed-service, research-service, user-service |
| `internal-service-secret`| all services                  |
| `firebase-service-account` | notification-service         |

---

## 10. Scalability Considerations (for Documentation)

| Concern                  | Current Approach (Prototype)         | Production Upgrade Path                    |
|--------------------------|--------------------------------------|--------------------------------------------|
| Horizontal scaling       | Cloud Run auto-scales per service    | Increase max-instances, add min-instances  |
| Database scaling         | Shared M0 Atlas cluster              | Dedicated M10+ clusters per service        |
| Media delivery           | Cloudflare R2 public URLs            | Already CDN-backed globally                |
| Message queue            | GCP Pub/Sub push                     | Already managed and scalable               |
| Real-time messaging      | Single Cloud Run instance (WS)       | Add Redis Pub/Sub + multiple instances     |
| Cold start latency       | Scale-to-zero (may cold start)       | Set min-instances=1 on critical services   |
| Caching                  | None in prototype                    | Add Redis (Memorystore) for feed caching   |
