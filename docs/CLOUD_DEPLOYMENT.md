# DECP Platform — Cloud Deployment Guide

## Overview

This guide covers the complete deployment of the DECP Platform to AWS EC2 with automated
CI/CD via GitHub Actions. After completing this setup, every push to `main` automatically
deploys the latest code to the server with zero manual intervention.

### Final Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Users (Browser / Mobile App)                               │
└────────────┬────────────────────────┬───────────────────────┘
             │ HTTPS                  │ WebSocket
             ▼                        ▼
┌────────────────────┐   ┌────────────────────────────────────┐
│  Vercel (free)     │   │  AWS EC2 t3.medium                 │
│  Next.js Web App   │   │  Ubuntu 22.04                      │
│                    │   │                                    │
│  GATEWAY_URL ──────┼──▶│  :8082  API Gateway (public)      │
│  REALTIME_URL ─────┼──▶│  :3010  Realtime / Socket.IO      │
└────────────────────┘   │                                    │
                         │  Internal Docker network:          │
                         │  auth · user · feed · jobs         │
                         │  events · messaging · notification │
                         │  analytics · research · pubsub     │
                         └──────────────┬─────────────────────┘
                                        │
                         ┌──────────────▼─────────────────────┐
                         │  MongoDB Atlas (free M0 cluster)   │
                         │  Shared across all services        │
                         └────────────────────────────────────┘

Cloudflare R2 (already live) — media storage, unchanged
GitHub Actions — pushes to main auto-deploy via SSH
```

### What Changes From Local Dev to Production

| Component | Local (dev) | Production |
|---|---|---|
| MongoDB | Docker container on `mongodb:27017` | MongoDB Atlas (cloud, free) |
| Pub/Sub | Local emulator in Docker | Same emulator in Docker (unchanged) |
| Services | `docker-compose.yml` | `docker-compose.prod.yml` |
| Web frontend | `localhost:4000` | Vercel (free, auto-deploy) |
| Deployment | Manual `docker compose up` | GitHub Actions on every `git push` |

---

## Prerequisites

- AWS account with EC2 access (university credits or free tier)
- GitHub account with access to the repository
- Google Cloud account (free — for Pub/Sub emulator project ID only)
- MongoDB Atlas account (free)
- Vercel account (free — sign in with GitHub)

Estimated total setup time: **2–3 hours** (mostly waiting for things to provision).

---

## Phase 1 — MongoDB Atlas Setup (~15 minutes)

MongoDB Atlas provides a free cloud database. This replaces the local MongoDB Docker container
and saves ~300MB RAM on the EC2 instance.

### Step 1.1 — Create Atlas Account and Cluster

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up (free)
2. Click **"Build a Database"**
3. Choose **M0 Free** tier
4. Select **AWS** as the cloud provider
5. Pick region closest to your EC2 region (e.g. `us-east-1` if your EC2 is in N. Virginia)
6. Name the cluster: `decp-cluster`
7. Click **"Create"** — takes ~3 minutes to provision

### Step 1.2 — Create a Database User

1. In the left sidebar go to **Security → Database Access**
2. Click **"Add New Database User"**
3. Choose **Password authentication**
4. Username: `decp-app`
5. Password: generate a strong password and **save it** — you will need it later
6. Under "Database User Privileges" select **"Read and write to any database"**
7. Click **"Add User"**

### Step 1.3 — Allow Network Access

1. In the left sidebar go to **Security → Network Access**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** — this adds `0.0.0.0/0`
   > This is acceptable for a university demo. In production you would restrict this to your EC2 IP.
4. Click **"Confirm"**

### Step 1.4 — Get the Connection String

1. Go to **Database → Connect**
2. Choose **"Connect your application"**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://decp-app:<password>@decp-cluster.xxxxx.mongodb.net/
   ```
5. Replace `<password>` with the password you created in Step 1.2
6. **Save this string** — you will add it to GitHub Secrets in Phase 3

---

## Phase 2 — AWS EC2 Instance Setup (~20 minutes)

### Step 2.1 — Launch EC2 Instance

1. Go to [AWS Console](https://console.aws.amazon.com) → **EC2 → Launch Instance**
2. Configure as follows:

   | Setting | Value |
   |---|---|
   | Name | `decp-platform` |
   | AMI | **Ubuntu Server 22.04 LTS** (free tier eligible) |
   | Instance type | **t3.medium** (4GB RAM) — recommended with credits |
   | Key pair | Create new → name it `decp-key` → download the `.pem` file |
   | Storage | 20 GB gp3 (default is fine) |

3. Under **"Network settings"** click **"Edit"** and configure the Security Group:

   | Type | Protocol | Port | Source | Purpose |
   |---|---|---|---|---|
   | SSH | TCP | 22 | My IP | GitHub Actions + your SSH access |
   | Custom TCP | TCP | 8082 | 0.0.0.0/0 | API Gateway (public) |
   | Custom TCP | TCP | 3010 | 0.0.0.0/0 | Realtime / Socket.IO (public) |

   > **Important:** Port 22 should only allow "My IP" for security. GitHub Actions needs SSH access
   > too — see Step 2.3 for how to handle this.

4. Click **"Launch Instance"**
5. Wait ~2 minutes for the instance to reach "running" state
6. Note the **Public IPv4 address** — you will need it later (e.g. `54.123.45.67`)

### Step 2.2 — Allow GitHub Actions to SSH

GitHub Actions runners use IP ranges published by GitHub. The simplest approach for a demo
is to temporarily set port 22 source to `0.0.0.0/0` (open to all), then lock it down after
deployment is confirmed. Alternatively:

1. In EC2 → Security Groups → find your group → **Inbound Rules → Edit**
2. Change the SSH rule source from "My IP" to **`0.0.0.0/0`**

This is acceptable for a university demo environment.

### Step 2.3 — Prepare the SSH Private Key

The `.pem` file you downloaded needs to be added to GitHub Secrets so Actions can SSH in.

1. Open the `.pem` file in a text editor
2. Copy the **entire contents** including the `-----BEGIN RSA PRIVATE KEY-----` header and footer
3. You will paste this into GitHub Secrets in Phase 3

### Step 2.4 — Verify SSH Access (Optional but Recommended)

Test that you can SSH in from your local machine before relying on GitHub Actions:

```bash
chmod 400 decp-key.pem
ssh -i decp-key.pem ubuntu@YOUR_EC2_IP
```

If you connect successfully, type `exit`. You're ready to continue.

---

## Phase 3 — GitHub Secrets Setup (~10 minutes)

GitHub Secrets are encrypted environment variables that GitHub Actions can inject into
workflows at runtime. They are never visible in logs.

### Step 3.1 — Navigate to Secrets

1. Go to your GitHub repository
2. Click **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"** for each secret below

### Step 3.2 — Add All Required Secrets

Add each of the following secrets one by one:

| Secret Name | Value | Where to find it |
|---|---|---|
| `EC2_HOST` | Your EC2 Public IPv4 address | EC2 console (e.g. `54.123.45.67`) |
| `EC2_USER` | `ubuntu` | Default user for Ubuntu AMI |
| `EC2_SSH_KEY` | Full contents of `decp-key.pem` | The .pem file you downloaded |
| `MONGODB_URI` | Atlas connection string | Phase 1 Step 1.4 |
| `JWT_SECRET` | A strong random string | Generate: `openssl rand -hex 32` |
| `INTERNAL_SERVICE_SECRET` | Another strong random string | Generate: `openssl rand -hex 16` |
| `PUBSUB_VERIFICATION_TOKEN` | Any random string | Generate: `openssl rand -hex 16` |
| `R2_ACCOUNT_ID` | `07ca16f61d6ad7b4b0139e45bb7a6b82` | From docker-compose.env |
| `R2_ACCESS_KEY_ID` | `a2cecfd6fa1f3ff3a28bcc568d130a4e` | From docker-compose.env |
| `R2_SECRET_ACCESS_KEY` | (your R2 secret key) | From docker-compose.env |
| `R2_BUCKET_NAME` | `decp-media` | From docker-compose.env |
| `R2_PUBLIC_URL` | `https://pub-616c56...r2.dev` | From docker-compose.env |

> **Tip:** To generate a strong random secret in your terminal:
> ```bash
> openssl rand -hex 32
> ```

After adding all secrets, your Secrets page should show 12 secrets.

---

## Phase 4 — Trigger the First Deployment (~10–30 minutes)

The GitHub Actions workflow at `.github/workflows/deploy.yml` runs automatically on every
push to `main`. The first run takes longer because it installs Docker and builds all container
images from scratch (~15–25 minutes). Subsequent deployments take ~3–5 minutes.

### Step 4.1 — Push to Main to Trigger Deployment

```bash
git add .
git commit -m "chore: trigger cloud deployment"
git push origin main
```

### Step 4.2 — Monitor the Workflow

1. Go to your GitHub repository
2. Click the **"Actions"** tab
3. You will see "Deploy to AWS EC2" running
4. Click on it to see live logs for each step:
   - `[1/7]` Installing Docker
   - `[2/7]` Cloning / pulling repository
   - `[3/7]` Writing environment file
   - `[4/7]` Pulling base images
   - `[5/7]` Building and starting services
   - `[6/7]` Setting up Pub/Sub topics
   - `[7/7]` Health checks

### Step 4.3 — What a Successful Deployment Looks Like

At the end of the logs you should see:

```
========================================
 Deploy complete!
 API Gateway : http://54.123.45.67:8082
 Realtime    : http://54.123.45.67:3010
========================================
NAME                STATUS
decp-pubsub         Up 2 minutes
decp-auth           Up 2 minutes
decp-user           Up 2 minutes
decp-feed           Up 2 minutes
decp-jobs           Up 2 minutes
decp-events         Up 2 minutes
decp-messaging      Up 2 minutes
decp-notification   Up 2 minutes
decp-analytics      Up 2 minutes
decp-research       Up 2 minutes
decp-realtime       Up 2 minutes
decp-gateway        Up 2 minutes
```

If the workflow shows a green tick ✅ the deployment succeeded.

### Step 4.4 — Verify the API is Live

From your browser or terminal, hit the gateway health check:

```bash
curl http://YOUR_EC2_IP:8082/health
# Expected: {"status":"ok","service":"api-gateway"}
```

And the realtime service:

```bash
curl http://YOUR_EC2_IP:3010/health
# Expected: {"status":"ok","service":"realtime-service","connectedUsers":0}
```

---

## Phase 5 — Deploy Web Frontend to Vercel (~10 minutes)

Vercel is purpose-built for Next.js and deploys automatically from GitHub. Free forever on
the Hobby plan.

### Step 5.1 — Connect Repository to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import the `co528-Mini-Project-DEC-Platform` repository
4. Vercel will auto-detect Next.js
5. Set **Root Directory** to `web`

### Step 5.2 — Set Environment Variables in Vercel

In the Vercel project settings before deploying, add these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_GATEWAY_URL` | `http://YOUR_EC2_IP:8082` |
| `NEXT_PUBLIC_REALTIME_URL` | `http://YOUR_EC2_IP:3010` |

Replace `YOUR_EC2_IP` with your actual EC2 public IP address.

### Step 5.3 — Deploy

Click **"Deploy"**. Vercel will build and deploy the Next.js app in ~2 minutes.

You will get a URL like: `https://co528-mini-project-dec-platform.vercel.app`

### Step 5.4 — Verify Frontend

1. Open the Vercel URL in your browser
2. You should see the DECP login page
3. Log in with a seeded account (e.g. `omar.hassan@decp.io` / `Pass1234`)
4. Navigate through the app — Feed, Jobs, Events, etc.

> **Note:** Vercel redeploys automatically whenever you push to `main`, just like EC2.

---

## Phase 6 — Update Mobile App (~5 minutes)

The mobile app has the EC2 IP hardcoded in `mobile/app.json`. Update it to point to your
live server.

### Step 6.1 — Update app.json

Edit `mobile/app.json` and update the `extra` section:

```json
"extra": {
  "apiUrl": "http://YOUR_EC2_IP:8082",
  "realtimeUrl": "http://YOUR_EC2_IP:3010"
}
```

### Step 6.2 — Restart Expo with Cache Clear

```bash
cd mobile
npx expo start -c
```

Scan the QR code on your device. The mobile app now connects to the live EC2 server.

---

## Phase 7 — Seed Demo Data (First Time Only)

The production database is empty. Run the seed scripts once to populate demo users, posts,
jobs, events, and messages for the demo.

### Step 7.1 — Update Seed Script Config

The seed scripts need to point to the live gateway. Set the API URL before running:

```bash
cd scripts
API_URL=http://YOUR_EC2_IP:8082 node populate.js
API_URL=http://YOUR_EC2_IP:8082 node populate-phase2.js
API_URL=http://YOUR_EC2_IP:8082 node populate-messages.js
```

> This creates 15 users, 20 posts, 5 jobs, 3 events, 3 research projects, and 54 messages.
> All seeded users have password: `Pass1234`

---

## How Ongoing Deployments Work

After this initial setup, the workflow for every future change is:

```bash
# 1. Make your code changes locally
# 2. Commit and push to main
git add .
git commit -m "feat: your change"
git push origin main

# 3. GitHub Actions automatically:
#    - SSHs into EC2
#    - Pulls latest code
#    - Rebuilds changed containers
#    - Restarts services
#    - Vercel auto-redeploys the web frontend

# 4. Check the Actions tab for live deployment logs
```

**Zero manual intervention after the initial setup.**

---

## Troubleshooting

### GitHub Action fails at SSH step

**Error:** `ssh: connect to host ... port 22: Connection timed out`

**Fix:** Check the EC2 Security Group. Port 22 must allow inbound from `0.0.0.0/0` (or
GitHub's IP ranges). Go to EC2 → Security Groups → Inbound Rules → Edit.

---

### GitHub Action fails at Docker build step

**Error:** `no space left on device`

**Fix:** EC2 disk is full from old images. SSH into the instance and run:
```bash
sudo docker system prune -a -f
```
Then re-trigger the workflow.

---

### Gateway health check returns HTTP 000

**Error:** `Gateway /health → HTTP 000`

**Fix:** One of the services the gateway depends on failed to start. Check logs:
```bash
ssh -i decp-key.pem ubuntu@YOUR_EC2_IP
cd ~/app
sudo docker compose -f docker-compose.prod.yml logs gateway --tail 50
sudo docker compose -f docker-compose.prod.yml ps
```

The most common cause is MongoDB Atlas connection failure. Verify:
1. The `MONGODB_URI` secret is correct and includes the password
2. Atlas Network Access allows `0.0.0.0/0`

---

### Services crash immediately after startup

**Possible cause:** Not enough RAM (t3.small with 2GB can be tight).

**Check memory usage:**
```bash
free -h
sudo docker stats --no-stream
```

**Fix options:**
1. Upgrade to t3.medium (4GB) in AWS console — stop instance, change type, start again
2. Add a 2GB swap file on the instance:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### Pub/Sub topics not created (notifications not working)

The Pub/Sub setup step runs after a 15-second wait for the emulator. If it fails:

```bash
ssh -i decp-key.pem ubuntu@YOUR_EC2_IP
cd ~/app/scripts
PUBSUB_EMULATOR_HOST=localhost:8085 GOOGLE_CLOUD_PROJECT_ID=decp-project node setup-pubsub.js
```

---

### Frontend shows CORS errors

The gateway CORS config allows `localhost:3000`, `localhost:4000`, etc. for local dev.
In production add the Vercel URL to the CORS allowed origins in `gateway/src/middleware/cors.js`:

```js
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4000',
  'https://YOUR-PROJECT.vercel.app',  // add this
];
```

Then push to main — the Action will redeploy automatically.

---

### Vercel build fails

Vercel must know the root directory is `web/`. Check:
1. Vercel project settings → Root Directory → set to `web`
2. Build command: `npm run build` (default, auto-detected)
3. Output directory: `.next` (auto-detected)

---

## Cost Summary

| Service | Plan | Monthly Cost |
|---|---|---|
| AWS EC2 t3.medium | Free with university credits | $0 |
| MongoDB Atlas M0 | Free tier (512MB) | $0 |
| Vercel (web frontend) | Hobby free tier | $0 |
| Cloudflare R2 (media) | Already live | ~$0 (free up to 10GB) |
| GitHub Actions | Free for public repos | $0 |
| **Total** | | **$0/month** |

> EC2 t3.medium is ~$30/month at standard pricing. With AWS Educate / university credits
> this is covered. Credits typically last 6–12 months depending on your credit balance.

---

## Architecture Notes for Documentation

When writing your architecture documentation, note the following design decisions:

**Why single EC2 instead of Cloud Run per service:**
- Reduces operational complexity for a university demo
- All services share a Docker network — internal communication is zero-latency
- Cloud Run would require service-to-service authentication and URL management for 12 services
- Target production architecture would use Cloud Run / ECS with a load balancer

**Why Pub/Sub emulator instead of real GCP Pub/Sub:**
- Real GCP Pub/Sub push subscriptions require HTTPS endpoints with valid certificates
- The emulator is functionally identical for push-based event delivery
- Zero code changes required — services cannot tell the difference
- Target production architecture would replace with real Pub/Sub once HTTPS/domain is set up

**Why MongoDB Atlas instead of self-hosted MongoDB:**
- Offloads ~300MB RAM from the EC2 instance
- Automatic backups, monitoring, and connection pooling
- Free M0 tier sufficient for demo with seed data
- Single Atlas cluster shared across all services (each service uses its own DB name)

**Scalability path (for documentation):**
- Each microservice is stateless → can run multiple replicas behind a load balancer
- Realtime service requires Redis for shared presence state across replicas
- MongoDB Atlas supports vertical and horizontal scaling (sharding)
- Gateway can be replaced with AWS API Gateway or nginx for production load
