# Project Status

## Infrastructure Mocking / Skipping
- **MongoDB**: Using a local Docker container (`docker-compose.yml`) instead of MongoDB Atlas for now, per user request. Will replace with `MONGODB_URI` string when ready.
- **GCP Project / Services**: GCP project creation, IAM, Pub/Sub, Cloud Run, and Secret Manager are currently blocked (lack of live GCP account credentials in this environment). We will implement the codebase and update this status when deployment or local emulators are handled.
- **Cloudflare R2**: R2 bucket creation blocked. Code will be written assuming it's available, but testing media upload may fail unless mocked.
- **Firebase / FCM**: Blocked. Code for push notifications will log locally or fail gracefully.

## Current Progress
- Starting **Phase 0** and **Phase 1**.
