# Digital Engineering Community Platform (DECP)

The DECP is a comprehensive microservices-based web application designed to connect students, alumni, and industry professionals. It supports a unified community feed, job postings, events, mentorship messaging, research project tracking, and real-time notifications.

## Architecture

This project is built using a modern microservices architecture:
- **Backend Services**: Node.js/Express APIs, separated by domain (Auth, Feed, Jobs, Events, Messages, Research, Notifications, Analytics).
- **Backend Infrastructure**: 
  - **MongoDB** for primary data persistence via Docker Compose.
  - **Firebase** (Emulated Pub/Sub) for asynchronous event-driven communication between services.
  - **API Gateway** (Express proxy) handling frontend routing and authentication middleware to the internal microservices.
  - **Cloudflare R2** (S3-compatible API) for robust media storage.
- **Frontend**: Next.js 14 Web App built with the App Router, leveraging Zustand for auth state and a modern CSS Grid Neumorphic design system.
- **Real-time Services**: WebSocket Service using `socket.io` for bi-directional live notifications and live messaging.
- **Testing**: End-to-End (E2E) UI testing powered by **Playwright**.

---

## 🛠 Prerequisites

Before starting, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Docker](https://www.docker.com/) & Docker Compose
- [npm](https://www.npmjs.com/) (comes with Node.js)

---

## 🚀 Local Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/cepdnaclk/co528-Mini-Project-DEC-Platform.git
cd co528-Mini-Project-DEC-Platform
```

### 2. Configure Environment Variables
Copy the example environment configuration to establish your local keys:
```bash
cp docker-compose.example.env docker-compose.env
```
*(Ensure all necessary JWT keys, R2 Cloudflare Object Storage credentials, and database URIs are correctly configured in `docker-compose.env`)*

### 3. Start Backend Microservices
We use Docker Compose to orchestrate all backend databases, infrastructure emulators, and API services:
```bash
docker compose --env-file docker-compose.env up -d --build
```
This will spin up:
- MongoDB Instance (`mongodb:27017`)
- Firebase Pub/Sub Emulator (`pubsub-emulator:8085`)
- API Gateway Proxy (`http://localhost:8082`)
- Realtime WebSocket Server (`http://localhost:3010`)
- 8 specialized Node.js Microservices

Verify the services are running:
```bash
docker compose ps
```

### 4. Setup Pub/Sub Topics
Initialize the local Pub/Sub emulator topics and subscriptions required for inter-service communication:
```bash
node scripts/setup-pubsub.js
```

### 5. Launch the Frontend Application
The Next.js web application is located in the `/web` directory.

```bash
cd web
npm install
# Run the application (defaulting to port 3100)
npm run dev -- -p 3100
```
**Access the app:** [http://localhost:3100](http://localhost:3100)

---

## 🧪 Testing

We have comprehensive test suites for validating the integrated systems.

### Backend Infrastructure Testing
A robust master testing script verifies that the database, Pub/Sub event bus, R2 uploads, and all functional microservices interact flawlessly:
```bash
# In the root directory:
chmod +x scripts/run-all-tests.sh
./scripts/run-all-tests.sh
```

### Frontend End-to-End (E2E) Testing with Playwright
The project includes a full End-to-End automated testing suite verifying critical user flows (Authentication, Posting, Messaging interactions). Tests are located in the `/e2e` directory.

**Setup Playwright:**
```bash
cd e2e
# Install testing dependencies
npm install
# Download the required Chromium Testing Browser
npx playwright install chromium
```

**Run Automated Tests:**
Make sure both your backend Docker containers and the Next.js `web` server (on port 3100) are actively running. 

```bash
cd e2e
npx playwright test
```

**View Test Results:**
If a test fails, you can visually trace exactly where the crash happened:
```bash
npx playwright show-report
```

#### How to Use Playwright CLI Interactively (Skill)
If you are developing new features and want to test them rapidly via CLI automation, you can utilize the `playwright-cli` tools directly from your terminal to mimic user actions without launching a visible browser:

```bash
# Example: Navigating and logging in
playwright-cli open --browser=chromium http://localhost:3100/login
playwright-cli fill 'input[type="email"]' "student@decp.app"
playwright-cli fill 'input[type="password"]' "Student@123"
playwright-cli click 'button[type="submit"]'

# Validate routing
playwright-cli goto http://localhost:3100/messages
playwright-cli snapshot --filename=/tmp/chat-ui.yml
playwright-cli close
```

## 🏗 Directory Structure

```plaintext
.
├── backend/            # Original monolith codebase (deprecated)
├── docs/               # System documentation & ADRs
├── e2e/                # Playwright End-to-End test suites
├── gateway/            # Express-based API routing proxy
├── lib/                # Shared utilities across services
├── scripts/            # Bash test scripts & initialization
├── services/           # The individual Microservices
│   ├── analytics/
│   ├── auth/
│   ├── events/
│   ├── feed/
│   ├── jobs/
│   ├── messaging/
│   ├── notification/
│   ├── realtime/       # WebSockets via socket.io
│   └── research/
└── web/                # Next.js 14 Frontend Application
```
