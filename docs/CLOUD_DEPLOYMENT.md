# DECP Platform — Cloud Deployment Guide

## Overview

This guide covers the complete deployment of the DECP Platform to AWS EC2 with automated
CI/CD via GitHub Actions. After completing this one-time setup, every push to `main`
automatically deploys the latest code to the server with zero manual intervention.

### Final Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Users (Browser / Mobile App)                                │
└─────────────┬─────────────────────────┬──────────────────────┘
              │ HTTPS                   │ WebSocket
              ▼                         ▼
┌─────────────────────┐   ┌─────────────────────────────────────┐
│  Vercel (free)      │   │  AWS EC2 t3.medium  (Ubuntu 22.04)  │
│  Next.js Web App    │   │                                     │
│                     │   │  :8082  API Gateway  (public)       │
│  GATEWAY_URL ───────┼──▶│  :3010  Realtime/Socket.IO (public) │
│  REALTIME_URL ──────┼──▶│                                     │
└─────────────────────┘   │  Internal Docker network:           │
                          │  ┌──────────────────────────────┐   │
                          │  │  auth  user  feed  jobs      │   │
                          │  │  events  messaging  research │   │
                          │  │  notification  analytics     │   │
                          │  │  realtime  pubsub            │   │
                          │  │  mongodb  ← runs here too    │   │
                          │  └──────────────────────────────┘   │
                          └─────────────────────────────────────┘

Cloudflare R2 (already live) — media storage, no changes needed
GitHub Actions — every push to main triggers auto-deploy via SSH
```

### What Changes From Local Dev to Production

| Component | Local (dev) | Production |
|---|---|---|
| MongoDB | Docker container (same) | Docker container on EC2 (identical) |
| Pub/Sub | Local emulator in Docker | Same emulator in Docker (unchanged) |
| docker-compose file | `docker-compose.yml` | Same `docker-compose.yml` |
| Environment secrets | `docker-compose.env` (local file) | Written by GitHub Actions from Secrets |
| Web frontend | `localhost:4000` | Vercel (free, auto-deploys from GitHub) |
| Deployment | Manual `docker compose up` | GitHub Actions on every `git push` |

The only things that change between local and production are the **secret values** in
`docker-compose.env` (JWT secret, R2 keys). Everything else — including MongoDB — runs
identically inside Docker.

---

## Prerequisites

- AWS account with EC2 access (university credits cover t3.medium for 6–12 months)
- GitHub account with access to this repository
- Vercel account (free — sign in with GitHub)

Estimated total setup time: **1.5–2 hours** (mostly waiting for things to provision).

---

## RAM Budget on t3.medium (4 GB)

| Component | RAM usage |
|---|---|
| Ubuntu 22.04 OS | ~350 MB |
| Docker daemon | ~50 MB |
| MongoDB container | ~300 MB |
| Pub/Sub emulator | ~200 MB |
| 12 microservices × ~80 MB | ~960 MB |
| **Total used** | **~1,860 MB** |
| **Free headroom** | **~2,140 MB** |

t3.medium is comfortably sufficient with ~2 GB to spare.

---

## Phase 1 — AWS EC2 Instance Setup (~20 minutes)

### Step 1.1 — Launch the Instance

1. Go to [AWS Console](https://console.aws.amazon.com) → **EC2 → Launch Instance**
2. Configure as follows:

   | Setting | Value |
   |---|---|
   | Name | `decp-platform` |
   | AMI | **Ubuntu Server 22.04 LTS** |
   | Instance type | **t3.medium** (2 vCPU / 4 GB RAM) |
   | Key pair | Create new → name it `decp-key` → **download the `.pem` file** |
   | Storage | 20 GB gp3 (default is fine) |

3. Under **"Network settings"** → click **"Edit"** → configure Security Group:

   | Type | Port | Source | Purpose |
   |---|---|---|---|
   | SSH | 22 | `0.0.0.0/0` | GitHub Actions + your SSH access |
   | Custom TCP | 8082 | `0.0.0.0/0` | API Gateway — all REST traffic |
   | Custom TCP | 3010 | `0.0.0.0/0` | Realtime — WebSocket connections |

   > Port 27017 (MongoDB) and all microservice ports (3001–3009) are **not** opened.
   > They are only reachable inside the Docker network — not from the internet.

4. Click **"Launch Instance"**
5. Wait ~2 minutes for the instance to show **"Running"**
6. Note the **Public IPv4 address** — you'll need it throughout this guide (e.g. `54.123.45.67`)

### Step 1.2 — Verify SSH Access

Test that you can connect from your local machine:

```bash
chmod 400 decp-key.pem
ssh -i decp-key.pem ubuntu@YOUR_EC2_IP
```

If you connect successfully, type `exit`. You're ready to continue.

### Step 1.3 — Prepare the SSH Key for GitHub

1. Open `decp-key.pem` in any text editor
2. Copy the **entire file contents** — including the header and footer lines:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   ...
   -----END RSA PRIVATE KEY-----
   ```
3. You will paste this into GitHub Secrets in the next phase

---

## Phase 2 — GitHub Secrets Setup (~10 minutes)

GitHub Secrets are encrypted variables injected into the workflow at runtime.
They are never visible in logs or to other users.

### Step 2.1 — Navigate to Secrets

1. Go to your GitHub repository
2. Click **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"** for each secret below

### Step 2.2 — Add All Required Secrets

| Secret Name | Value | Notes |
|---|---|---|
| `EC2_HOST` | Your EC2 Public IPv4 | e.g. `54.123.45.67` |
| `EC2_USER` | `ubuntu` | Default user for Ubuntu AMI |
| `EC2_SSH_KEY` | Full contents of `decp-key.pem` | Include header/footer lines |
| `JWT_SECRET` | A strong random string | Run: `openssl rand -hex 32` |
| `INTERNAL_SERVICE_SECRET` | A strong random string | Run: `openssl rand -hex 16` |
| `PUBSUB_VERIFICATION_TOKEN` | Any random string | Run: `openssl rand -hex 16` |
| `R2_ACCOUNT_ID` | `07ca16f61d6ad7b4b0139e45bb7a6b82` | From `docker-compose.env` |
| `R2_ACCESS_KEY_ID` | `a2cecfd6fa1f3ff3a28bcc568d130a4e` | From `docker-compose.env` |
| `R2_SECRET_ACCESS_KEY` | (your R2 secret key) | From `docker-compose.env` |
| `R2_BUCKET_NAME` | `decp-media` | From `docker-compose.env` |
| `R2_PUBLIC_URL` | `https://pub-616c56...r2.dev` | From `docker-compose.env` |

**11 secrets total.** After adding all of them your Secrets page should list 11 entries.

> To generate a strong random secret in your terminal:
> ```bash
> openssl rand -hex 32
> ```

> **Note on MongoDB:** There is no `MONGODB_URI` secret because MongoDB runs inside Docker
> on the same EC2. The workflow hardcodes `mongodb://mongodb:27017` — the same value used
> locally. No Atlas account or external database is needed.

---

## Phase 3 — First Deployment (~15–30 minutes)

The workflow at `.github/workflows/deploy.yml` triggers on every push to `main`.
The **first run takes 15–25 minutes** because it installs Docker and builds all 12 container
images from scratch. Subsequent deployments take 3–5 minutes.

### Step 3.1 — Trigger the Deployment

Merge your branch into `main` or push directly:

```bash
git checkout main
git merge feat/backendServices
git push origin main
```

### Step 3.2 — Watch the Live Logs

1. Go to your GitHub repository
2. Click the **"Actions"** tab
3. Click the running **"Deploy to AWS EC2"** workflow
4. Click **"SSH Deploy"** to expand the live log output

You will see these steps progress in real time:

```
[1/7] Installing Docker...          ← first run only, ~3 min
[2/7] Cloning repository...         ← first run only
[3/7] Writing docker-compose.env... ← injects your secrets
[4/7] Pulling base images...        ← mongo, pubsub emulator
[5/7] Building and starting services... ← builds all 12 services, ~10-15 min first time
[6/7] Setting up Pub/Sub topics...  ← creates topics + push subscriptions
[7/7] Running health checks...      ← verifies gateway and realtime are up
```

### Step 3.3 — What Success Looks Like

At the end of the log you will see:

```
  Gateway  /health → HTTP 200
  Realtime /health → HTTP 200
========================================
 Deploy complete!
 API Gateway : http://54.123.45.67:8082
 Realtime    : http://54.123.45.67:3010
========================================
NAME                  STATUS
decp-mongodb          Up 3 minutes
decp-pubsub           Up 3 minutes
decp-auth             Up 3 minutes
decp-user             Up 3 minutes
decp-feed             Up 3 minutes
decp-jobs             Up 3 minutes
decp-events           Up 3 minutes
decp-messaging        Up 3 minutes
decp-notification     Up 3 minutes
decp-analytics        Up 3 minutes
decp-research         Up 3 minutes
decp-realtime         Up 3 minutes
decp-gateway          Up 3 minutes
```

A green tick ✅ on the workflow run means all steps passed.

### Step 3.4 — Verify the API From Your Browser

Open these URLs in your browser (replace with your EC2 IP):

```
http://YOUR_EC2_IP:8082/health
→ {"status":"ok","service":"api-gateway"}

http://YOUR_EC2_IP:3010/health
→ {"status":"ok","service":"realtime-service","connectedUsers":0}
```

---

## Phase 4 — Deploy Web Frontend to Vercel (~10 minutes)

Vercel is purpose-built for Next.js — free on the Hobby plan, auto-deploys from GitHub.

### Step 4.1 — Connect Repo to Vercel

1. Go to [https://vercel.com](https://vercel.com) → sign in with GitHub
2. Click **"Add New Project"**
3. Import `co528-Mini-Project-DEC-Platform`
4. Set **Root Directory** to `web`
5. Vercel will auto-detect Next.js — do not change the build settings

### Step 4.2 — Set Environment Variables

Before clicking Deploy, add these two environment variables in Vercel:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | `http://YOUR_EC2_IP:8082` |
| `NEXT_PUBLIC_REALTIME_URL` | `http://YOUR_EC2_IP:3010` |

### Step 4.3 — Deploy

Click **"Deploy"**. Vercel builds and deploys in ~2 minutes.

You will get a permanent URL like:
```
https://co528-mini-project-dec-platform.vercel.app
```

### Step 4.4 — Verify the Frontend

1. Open the Vercel URL
2. You should see the DECP login page
3. Log in (after seeding data in Phase 5) with `omar.hassan@decp.io` / `Pass1234`

> Vercel redeploys automatically on every push to `main` — same as EC2.

---

## Phase 5 — Seed Demo Data (One Time Only)

The EC2 MongoDB is empty on first deployment. Run the seed scripts once to populate
demo users, posts, jobs, events, research projects, and messages.

```bash
cd scripts
API_URL=http://YOUR_EC2_IP:8082 node populate.js
API_URL=http://YOUR_EC2_IP:8082 node populate-phase2.js
API_URL=http://YOUR_EC2_IP:8082 node populate-messages.js
```

This creates:
- 15 users (5 alumni + 10 students) — all with password `Pass1234`
- 20 feed posts with likes and comments
- 5 jobs with 14 applications
- 3 events with RSVPs
- 3 research projects with members
- 54 messages across 9 conversations

---

## Phase 6 — Update Mobile App (~5 minutes)

Update `mobile/app.json` to point to the live EC2 server:

```json
"extra": {
  "apiUrl": "http://YOUR_EC2_IP:8082",
  "realtimeUrl": "http://YOUR_EC2_IP:3010"
}
```

Restart Expo with cache clear:

```bash
cd mobile
npx expo start -c
```

Scan the QR code — the mobile app now connects to the live server.

---

## How Ongoing Deployments Work

After this initial setup, the entire deployment workflow is:

```bash
# Make changes, commit, push
git add .
git commit -m "feat: your change"
git push origin main

# GitHub Actions automatically:
#   ✓ SSHs into EC2
#   ✓ Pulls latest code from main
#   ✓ Rebuilds only changed containers
#   ✓ Restarts all services
#   ✓ Runs health checks
#   ✓ Reports success/failure in Actions tab
#
# Vercel also automatically redeploys the web frontend.
```

**Zero manual intervention after the initial setup.**

---

## Troubleshooting

### GitHub Action fails at SSH step

**Error:** `ssh: connect to host ... port 22: Connection timed out`

**Fix:** Port 22 in the EC2 Security Group must allow `0.0.0.0/0`.
Go to EC2 → Security Groups → your group → Inbound Rules → Edit → set SSH source to `0.0.0.0/0`.

---

### GitHub Action fails at Docker build step

**Error:** `no space left on device`

**Fix:** Old Docker images filled the disk. SSH in and clean up:
```bash
ssh -i decp-key.pem ubuntu@YOUR_EC2_IP
sudo docker system prune -a -f
```
Then re-run the workflow from the Actions tab (click **"Re-run all jobs"**).

---

### Gateway health check returns HTTP 000

**Error:** `Gateway /health → HTTP 000`

**Fix:** A service the gateway depends on failed to start. SSH in and check:
```bash
ssh -i decp-key.pem ubuntu@YOUR_EC2_IP
cd ~/app
sudo docker compose ps
sudo docker compose logs gateway --tail 50
sudo docker compose logs mongodb --tail 30
```

If MongoDB failed to start, it is usually a volume permission issue:
```bash
sudo docker compose down -v
sudo docker compose up -d
```

---

### Services crash immediately — out of memory

**Check:**
```bash
free -h
sudo docker stats --no-stream
```

**Fix — add a 2 GB swap file** (useful if on t3.small):
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### Pub/Sub topics not created (notifications not working)

The setup script runs after a 20-second wait. If it still failed, run it manually:
```bash
ssh -i decp-key.pem ubuntu@YOUR_EC2_IP
cd ~/app/scripts
PUBSUB_EMULATOR_HOST=localhost:8085 GOOGLE_CLOUD_PROJECT_ID=decp-project node setup-pubsub.js
```

---

### Frontend shows CORS errors in browser console

Add your Vercel URL to the allowed origins in `gateway/src/middleware/cors.js`:

```js
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4000',
  'https://YOUR-PROJECT.vercel.app',  // ← add this line
];
```

Push to `main` — the GitHub Action will redeploy automatically.

---

### Vercel build fails

1. Confirm **Root Directory** is set to `web` in Vercel project settings
2. Build command: `npm run build` (auto-detected, do not change)
3. Node.js version: 18.x or 20.x (set under Project Settings → General)

---

## Cost Summary

| Service | Plan | Monthly Cost |
|---|---|---|
| AWS EC2 t3.medium | Free with university/Educate credits | **$0** |
| MongoDB | Docker on EC2 (no external service needed) | **$0** |
| Pub/Sub emulator | Docker on EC2 (no GCP billing) | **$0** |
| Vercel (web frontend) | Hobby free tier | **$0** |
| Cloudflare R2 (media) | Already live, free up to 10 GB/month | **$0** |
| GitHub Actions | Free for public repos | **$0** |
| **Total** | | **$0 / month** |

> Standard EC2 t3.medium pricing is ~$30/month. AWS Educate / university credits cover this.
> Credits typically last 6–12 months depending on your credit balance.

---

## Architecture Notes for Documentation

**Why single EC2 instead of individual Cloud Run services:**
- Reduces operational complexity for a university demo
- All services communicate over Docker's internal network with zero latency
- No inter-service authentication or service discovery required
- Target production architecture would use ECS/Cloud Run with an Application Load Balancer

**Why MongoDB runs on EC2 (not Atlas):**
- t3.medium has 4 GB RAM — plenty of headroom for MongoDB alongside all microservices
- Zero configuration overhead — identical to local development
- Data persists via a Docker named volume (`mongodb_data`)
- Atlas would be the right choice when scaling to production or needing managed backups

**Why Pub/Sub emulator instead of real GCP Pub/Sub:**
- Real GCP Pub/Sub push subscriptions require HTTPS endpoints with valid SSL certificates
- The emulator is functionally identical for push-based event delivery within Docker
- Zero code changes required — services cannot tell the difference at runtime
- Target production would replace with real Pub/Sub once a domain + SSL is configured

**Scalability path (for documentation):**
- Each microservice is stateless → can scale horizontally behind an Application Load Balancer
- Realtime service uses in-memory presence state → needs Redis for multi-instance scaling
- MongoDB volume can be migrated to Atlas for managed scaling and automatic backups
- Gateway can be replaced with AWS API Gateway or nginx for higher throughput
