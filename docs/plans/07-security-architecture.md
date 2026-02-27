# DECP – Security Architecture Plan

**Role: Security Architect**

---

## 1. Security Overview

DECP follows a defence-in-depth approach. Security is layered:
1. **Transport** – HTTPS everywhere, enforced by Cloud Run and Vercel
2. **Authentication** – JWT with short-lived access tokens
3. **Authorization** – RBAC checked at service level
4. **Input validation** – All inputs validated before hitting business logic
5. **Data protection** – Passwords hashed, tokens stored securely
6. **Network** – Internal services not reachable from internet
7. **Upload security** – File type checking, size limits, pre-signed URLs

---

## 2. Authentication Model

### Token Strategy
| Token Type    | Expiry | Storage (Web)        | Storage (Mobile)           | Purpose                     |
|---------------|--------|----------------------|----------------------------|-----------------------------|
| Access Token  | 15 min | Zustand memory store | In-memory (Riverpod state) | Authorise API requests      |
| Refresh Token | 7 days | httpOnly cookie      | flutter_secure_storage     | Issue new access token      |

**Why 15-minute access tokens?**
Even if an access token is intercepted, it is valid for only 15 minutes. The refresh token never travels in an `Authorization` header — it's only sent to `/auth/refresh` via cookie (web) or secure storage (mobile).

**Why httpOnly cookie for web refresh token?**
`httpOnly` cookies are inaccessible to JavaScript. This prevents XSS attacks from stealing the refresh token.

### JWT Payload
```json
{
  "userId": "abc123",
  "role": "student",
  "email": "e20001@eng.pdn.ac.lk",
  "iat": 1704067200,
  "exp": 1704068100
}
```

### Token Issuance (auth-service)
```js
const jwt = require('jsonwebtoken');

function issueTokens(user) {
  const accessToken = jwt.sign(
    { userId: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m', algorithm: 'HS256' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString(), type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );

  return { accessToken, refreshToken };
}
```

### Refresh Token Rotation
When a client calls `/auth/refresh`:
1. Validate the refresh token (JWT verify + check it's in the user's `refreshTokens` array in MongoDB)
2. Issue a **new** access token AND a **new** refresh token
3. Remove the old refresh token from the array, add the new one
4. Return both tokens

This ensures a stolen refresh token can only be used once before it is rotated out.

---

## 3. Authorization Model (RBAC)

### Roles
| Role      | Description                                          |
|-----------|------------------------------------------------------|
| `student` | Current enrolled student — can post, apply for jobs, RSVP |
| `alumni`  | Graduate — can post, post jobs, collaborate         |
| `admin`   | Department staff — full access including analytics, user management, create events |

### Role Enforcement Pattern (each service)
```js
// middleware/rbac.js
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role']; // injected by gateway after JWT verification
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { requireRole };
```

Usage in routes:
```js
const { requireRole } = require('../middleware/rbac');

// Only alumni and admin can post jobs
router.post('/jobs', requireRole('alumni', 'admin'), createJobController);

// Only admin can create events
router.post('/events', requireRole('admin'), createEventController);

// Only admin can view analytics
router.get('/analytics/overview', requireRole('admin'), overviewController);
```

### Resource Ownership Check
Beyond role, ownership must be checked for edit/delete:
```js
// Example: only the post author or admin can delete a post
async function deletePost(req, res) {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ success: false, error: 'Not found' });

  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (post.authorId !== userId && userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorised' });
  }

  await post.deleteOne();
  res.json({ success: true, data: { message: 'Deleted' } });
}
```

---

## 4. Input Validation

### Tool: Zod (Node.js)
All incoming request bodies are validated against Zod schemas before reaching business logic.

```js
// Example: register schema
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100).trim(),
  role: z.enum(['student', 'alumni']),  // admin cannot self-register
});

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      });
    }
    req.body = result.data; // sanitised + parsed data
    next();
  };
}
```

### Validation Rules (key examples)
| Field         | Rule                                                  |
|---------------|-------------------------------------------------------|
| email         | Valid email format, max 255 chars                     |
| password      | Min 8 chars, max 128 chars                            |
| post content  | Max 5000 chars, strip dangerous HTML                  |
| job title     | Max 200 chars, alphanumeric + punctuation             |
| file type     | Whitelist: image/jpeg, image/png, image/webp, video/mp4, application/pdf |
| file size     | Max 10 MB for images, 100 MB for video, 20 MB for PDF |
| cover letter  | Max 3000 chars                                        |

---

## 5. Password Security

```js
const bcrypt = require('bcrypt');
const ROUNDS = 12;

// Hash on register
const passwordHash = await bcrypt.hash(password, ROUNDS);

// Verify on login
const isValid = await bcrypt.compare(password, user.passwordHash);
```

Bcrypt with 12 rounds is intentionally slow (~250ms/hash), making brute-force attacks impractical.

---

## 6. HTTPS and Transport Security

- **Cloud Run**: All services are HTTPS-only by default. HTTP is automatically redirected to HTTPS. TLS 1.2+ with Google-managed certificates.
- **Vercel**: HTTPS by default with automatic Let's Encrypt certificates on custom domains.
- **MongoDB Atlas**: Connection string uses TLS (`mongodb+srv://` protocol enforces TLS).
- **Cloudflare R2**: All pre-signed URLs use HTTPS.
- **FCM**: All Firebase communications use HTTPS.

---

## 7. Network Security

| Layer                    | Mechanism                                                   |
|--------------------------|-------------------------------------------------------------|
| Internal services        | Core services use Cloud Run `ingress: internal`             |
| Public push services     | notification-service and analytics-service require `X-Internal-Token` on `/api/v1/*` routes |
| Service-to-service calls | `X-Internal-Token` header checked before processing        |
| Database access          | MongoDB Atlas IP allowlist (restrict to Cloud Run IP range in production) |
| R2 uploads               | Pre-signed URLs expire in 5 minutes                         |
| Pub/Sub push             | Push endpoint validates `PUBSUB_VERIFICATION_TOKEN` and returns non-2xx on failure |

---

## 8. Rate Limiting

Applied at the gateway level:
- **Global rate limit:** 200 requests per 15 minutes per IP
- **Auth endpoint stricter:** `/api/v1/auth/login` and `/api/v1/auth/register` limited to 10 requests per 15 minutes per IP (prevents brute force and spam registration)

```js
// Stricter limiter for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many auth attempts' }
});

app.use('/api/v1/auth/login', authRateLimit);
app.use('/api/v1/auth/register', authRateLimit);
```

---

## 9. CORS Policy

Only the web client domain and localhost are allowed as origins. Mobile clients do not use CORS (they use the `Authorization` header directly).

```js
const allowedOrigins = [
  'https://decp.app',
  'https://www.decp.app',
  'https://decp.vercel.app',
  'http://localhost:3000',
];
```

---

## 10. File Upload Security

1. **Never serve uploaded files directly from Cloud Run.** Files go to R2 via pre-signed URL.
2. **Pre-signed URL validation:** The backend generates a URL only after checking the user is authenticated and the file type/size is acceptable.
3. **File type whitelist:** Only allow `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `application/pdf`.
4. **File size limits:** Enforced before issuing the pre-signed URL and re-validated when metadata is saved.
5. **No executable types:** `.exe`, `.sh`, `.js`, `.php` etc. are explicitly rejected.

```js
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_DOC_SIZE = 20 * 1024 * 1024;    // 20 MB
```

---

## 11. Secrets Management

All secrets are stored in **GCP Secret Manager**, not in code or Docker image layers.
- Each Cloud Run service is granted access only to its own secrets via IAM Service Account
- No secrets in `.env` files committed to Git (`.env` files are in `.gitignore`)
- `.env.example` files contain placeholder values only

---

## 12. Security Threat Summary

| Threat                  | Mitigation                                                          |
|-------------------------|---------------------------------------------------------------------|
| XSS (web)               | httpOnly cookie for refresh token; Content-Security-Policy header  |
| CSRF                    | `SameSite=Strict` on refresh token cookie; JWT in header for API calls |
| Brute force login       | Rate limiting on auth endpoints; bcrypt slow hashing               |
| Token theft             | Short 15-min access token expiry; refresh token rotation           |
| SQL/NoSQL injection     | Mongoose + Zod validation; parameterised queries                   |
| Privilege escalation    | Role injected by gateway from verified JWT; RBAC per endpoint      |
| Insecure file upload    | Pre-signed URLs; type/size whitelist; no direct upload to server   |
| MITM                    | HTTPS enforced everywhere; HSTS header set at gateway               |
| Internal service abuse  | Internal ingress for core services + X-Internal-Token on app routes |
| Secret exposure         | GCP Secret Manager; no secrets in code or images                   |
