# DECP – API Gateway Plan

---

## 1. Purpose

The API Gateway is the single entry point for all web and mobile client requests. It:
- Validates JWT access tokens before forwarding requests
- Routes requests to the correct downstream microservice
- Applies rate limiting to prevent abuse
- Handles CORS in one place (no CORS config needed on individual services)
- Provides a single base URL to clients: `https://api.decp.app`

---

## 2. Technology Choice

**Express.js + `http-proxy-middleware`**

Reasons:
- Lightweight and simple — the gateway does not contain business logic
- `http-proxy-middleware` is battle-tested for proxying in Node.js
- Runs as a Docker container on Cloud Run just like other services
- No cost (unlike GCP API Gateway which charges per call after 2M/month)
- Easy to add custom middleware (auth, rate limit, logging)

---

## 3. Route Table

| Incoming Path Prefix       | Downstream Service URL              | Auth Required |
|----------------------------|-------------------------------------|---------------|
| `/api/v1/auth/*`           | `https://decp-auth-<hash>-uc.a.run.app`    | No (handled inside auth-service) |
| `/api/v1/users/*`          | `https://decp-users-<hash>-uc.a.run.app`   | Yes           |
| `/api/v1/feed/*`           | `https://decp-feed-<hash>-uc.a.run.app`    | Yes |
| `/api/v1/jobs/*`           | `https://decp-jobs-<hash>-uc.a.run.app`    | Yes           |
| `/api/v1/events/*`         | `https://decp-events-<hash>-uc.a.run.app`  | Yes           |
| `/api/v1/research/*`       | `https://decp-research-<hash>-uc.a.run.app`| Yes           |
| `/api/v1/messages/*`       | `https://decp-messaging-<hash>-uc.a.run.app`| Yes          |
| `/api/v1/notifications/*`  | `https://decp-notifications-<hash>-uc.a.run.app`| Yes     |
| `/api/v1/analytics/*`      | `https://decp-analytics-<hash>-uc.a.run.app`| Yes (Admin)  |
| `GET /health`              | — (gateway responds directly)       | No            |

**Important:** Proxy routes preserve the original path (`/api/v1/...`) when forwarding. Do not strip the prefix.

---

## 4. Gateway Source Code Structure

```
gateway/
├── src/
│   ├── middleware/
│   │   ├── auth.js          # JWT validation middleware
│   │   ├── rateLimit.js     # Rate limiting (express-rate-limit)
│   │   └── cors.js          # CORS configuration
│   ├── proxy/
│   │   └── router.js        # createProxyMiddleware route definitions
│   └── index.js             # Express app + server startup
├── Dockerfile
├── package.json
└── .env.example
```

---

## 5. Code Design

### `src/index.js`
```js
const express = require('express');
const cors = require('./middleware/cors');
const rateLimit = require('./middleware/rateLimit');
const authMiddleware = require('./middleware/auth');
const proxyRouter = require('./proxy/router');

const app = express();

app.use(cors);
app.use(rateLimit);

// Health check — no auth
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'gateway' }));

// Public auth routes — no JWT check
app.use(proxyRouter.auth);

// All other routes require valid JWT
app.use('/api/v1', authMiddleware);
app.use(proxyRouter.protected);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
```

### `src/middleware/auth.js`
```js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.query.token; // WebSocket browser fallback

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Forward user context to downstream services
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-internal-token'] = process.env.INTERNAL_SERVICE_SECRET;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
```

### `src/middleware/rateLimit.js`
```js
const rateLimit = require('express-rate-limit');

module.exports = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,                  // 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
```

### `src/middleware/cors.js`
```js
const cors = require('cors');

const allowedOrigins = [
  process.env.WEB_CLIENT_URL,        // https://decp.app
  process.env.WEB_CLIENT_URL_PREVIEW,// https://decp.vercel.app
  'http://localhost:3000',           // local dev
];

module.exports = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### `src/proxy/router.js`
```js
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

const router = express.Router();

const serviceUrls = {
  auth:          process.env.AUTH_SERVICE_URL,
  users:         process.env.USER_SERVICE_URL,
  feed:          process.env.FEED_SERVICE_URL,
  jobs:          process.env.JOBS_SERVICE_URL,
  events:        process.env.EVENTS_SERVICE_URL,
  research:      process.env.RESEARCH_SERVICE_URL,
  messages:      process.env.MESSAGING_SERVICE_URL,
  notifications: process.env.NOTIFICATION_SERVICE_URL,
  analytics:     process.env.ANALYTICS_SERVICE_URL,
};

// Helper
// IMPORTANT: Express strips the path prefix when using router.use('/prefix', fn).
// e.g. a request to /api/v1/users/me arrives at the proxy as /me.
// pathRewrite re-attaches the stripped prefix so the downstream service
// receives the full /api/v1/... path it expects.
const proxy = (target, prefix) => createProxyMiddleware({
  target,
  changeOrigin: true,
  ws: true,
  xfwd: true,
  pathRewrite: (path) => prefix + path, // e.g. '/me' → '/api/v1/users/me'
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('X-Internal-Token', process.env.INTERNAL_SERVICE_SECRET);
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ success: false, error: 'Service temporarily unavailable' });
    }
  }
});

// Auth proxy (public)
const authRouter = express.Router();
authRouter.use('/api/v1/auth', proxy(serviceUrls.auth, '/api/v1/auth'));
module.exports.auth = authRouter;

// Protected proxies
const protectedRouter = express.Router();
protectedRouter.use('/api/v1/users',         proxy(serviceUrls.users,         '/api/v1/users'));
protectedRouter.use('/api/v1/feed',          proxy(serviceUrls.feed,          '/api/v1/feed'));
protectedRouter.use('/api/v1/jobs',          proxy(serviceUrls.jobs,          '/api/v1/jobs'));
protectedRouter.use('/api/v1/events',        proxy(serviceUrls.events,        '/api/v1/events'));
protectedRouter.use('/api/v1/research',      proxy(serviceUrls.research,      '/api/v1/research'));
protectedRouter.use('/api/v1/messages',      proxy(serviceUrls.messages,      '/api/v1/messages'));
protectedRouter.use('/api/v1/notifications', proxy(serviceUrls.notifications, '/api/v1/notifications'));
protectedRouter.use('/api/v1/analytics',     proxy(serviceUrls.analytics,     '/api/v1/analytics'));
module.exports.protected = protectedRouter;
```

---

## 6. Gateway Environment Variables

```env
PORT=8080
JWT_SECRET=<same_secret_as_auth_service>
INTERNAL_SERVICE_SECRET=<shared_service_secret_checked_by_downstream_services>
WEB_CLIENT_URL=https://decp.app
WEB_CLIENT_URL_PREVIEW=https://decp.vercel.app

# Downstream service URLs (Cloud Run service URLs)
AUTH_SERVICE_URL=https://decp-auth-<hash>-uc.a.run.app
USER_SERVICE_URL=https://decp-users-<hash>-uc.a.run.app
FEED_SERVICE_URL=https://decp-feed-<hash>-uc.a.run.app
JOBS_SERVICE_URL=https://decp-jobs-<hash>-uc.a.run.app
EVENTS_SERVICE_URL=https://decp-events-<hash>-uc.a.run.app
RESEARCH_SERVICE_URL=https://decp-research-<hash>-uc.a.run.app
MESSAGING_SERVICE_URL=https://decp-messaging-<hash>-uc.a.run.app
NOTIFICATION_SERVICE_URL=https://decp-notifications-<hash>-uc.a.run.app
ANALYTICS_SERVICE_URL=https://decp-analytics-<hash>-uc.a.run.app
```

---

## 7. WebSocket Handling

Cloud Run supports WebSocket upgrades. The `http-proxy-middleware` handles upgrade headers when `ws: true` is enabled in the proxy config.

For the messaging WebSocket:
```
WS handshake: GET /api/v1/messages/ws?token=<access_token>
```
The gateway auth middleware checks the token from the query string for WebSocket upgrades (since WebSocket doesn't send Authorization headers in the browser).

---

## 8. Gateway npm Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^3.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "jsonwebtoken": "^9.0.2"
  }
}
```
