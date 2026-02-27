# DECP – Web Client Plan (Next.js 14)

---

## 1. Technology Decisions

| Concern              | Choice                          | Reason                                                        |
|----------------------|---------------------------------|---------------------------------------------------------------|
| Framework            | Next.js 14 (App Router)         | SSR + CSR hybrid, SEO for public pages, Vercel deployment     |
| Styling              | Tailwind CSS + shadcn/ui        | Fast to build, consistent, accessible components              |
| State management     | Zustand                         | Lightweight global state (auth, user), no boilerplate         |
| Server data fetching | SWR                             | Automatic revalidation, loading/error states, caching         |
| HTTP client          | Axios (with interceptor)        | Auto-attach token, auto-refresh on 401                        |
| Forms                | React Hook Form + Zod           | Type-safe validation, minimal re-renders                      |
| WebSocket            | native WebSocket API            | For real-time messaging                                       |
| Push Notifications   | Firebase JS SDK                 | FCM web push via service worker                               |
| Charts               | Recharts                        | React-native charting for analytics dashboard                 |
| Hosting              | Vercel (hobby free tier)        | Zero-config Next.js, global CDN, custom domain support        |

---

## 2. Project Structure

```
web/
├── app/
│   ├── layout.tsx                  # Root layout (providers, navbar)
│   ├── page.tsx                    # Landing / redirect to /feed
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (main)/                     # Protected layout (sidebar + navbar)
│   │   ├── layout.tsx
│   │   ├── feed/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   ├── [id]/page.tsx       # View any profile
│   │   │   └── edit/page.tsx       # Edit own profile
│   │   ├── jobs/
│   │   │   ├── page.tsx            # Job listings
│   │   │   └── [id]/page.tsx       # Job detail + apply
│   │   ├── events/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── research/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx            # Conversation list
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx        # Chat window
│   │   └── notifications/
│   │       └── page.tsx
│   └── (admin)/                    # Admin-only layout
│       └── analytics/
│           └── page.tsx
├── components/
│   ├── ui/                         # shadcn/ui base components
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileBottomNav.tsx
│   ├── feed/
│   │   ├── PostCard.tsx
│   │   ├── PostComposer.tsx
│   │   ├── CommentList.tsx
│   │   └── MediaUploader.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   └── ApplicationForm.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   └── RSVPButton.tsx
│   ├── research/
│   │   └── ProjectCard.tsx
│   ├── messaging/
│   │   ├── ConversationList.tsx
│   │   └── ChatWindow.tsx
│   └── analytics/
│       └── StatsCards.tsx
├── lib/
│   ├── api.ts                      # Axios instance with interceptors
│   ├── auth.ts                     # Token helpers (get/set/clear)
│   ├── store/
│   │   ├── authStore.ts            # Zustand auth store
│   │   └── notificationStore.ts   # Zustand notification store
│   ├── hooks/
│   │   ├── useFeed.ts
│   │   ├── useJobs.ts
│   │   ├── useEvents.ts
│   │   └── useAuth.ts
│   └── firebase.ts                 # Firebase init for push notifications
├── public/
│   └── firebase-messaging-sw.js    # FCM service worker
├── middleware.ts                   # Next.js route protection
├── .env.local
└── next.config.js
```

---

## 3. Auth Flow

### Token Storage
- `accessToken`: stored in memory (Zustand store) — not in localStorage to prevent XSS
- `refreshToken`: stored in `httpOnly` cookie via the API response (auth-service sets `Set-Cookie`)
- On app load: call `POST /api/v1/auth/refresh` (cookie-based) to restore session and issue a fresh access token
- Production cookie settings: `Domain=.decp.app`, `Secure`, `HttpOnly`, `SameSite=Lax`

### Axios Interceptor
```ts
// lib/api.ts
import axios from 'axios';
import { useAuthStore } from './store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // send cookies for refresh token
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isRefreshCall = error.config?.url?.includes('/api/v1/auth/refresh');
    if (error.response?.status === 401 && !error.config._retry && !isRefreshCall) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(error.config);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Route Protection Middleware
```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');

  if (!refreshToken && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (refreshToken && isAuthPage) {
    return NextResponse.redirect(new URL('/feed', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 4. Key Page Descriptions

### `/feed`
- SSR for first page of posts (`generateMetadata` for SEO)
- Infinite scroll with SWR's `useSWRInfinite`
- `PostComposer` at top: text area + media upload trigger
- Media upload flow: `POST /api/v1/feed/media/upload-url` → direct PUT to R2 pre-signed URL → save R2 URL in post body
- Like/comment via optimistic updates (SWR mutate)

### `/jobs`
- Filterable list: type (job/internship), active only
- Students see "Apply" button; alumni see "Post Job"
- Apply modal: cover letter text + CV upload (R2 pre-signed URL)

### `/events`
- Upcoming events sorted by date
- Detail page: RSVP button (POST/DELETE)
- Admin sees "Create Event" button

### `/messages/[conversationId]`
- Conversation list on left, chat window on right
- On mount: connect WebSocket `wss://api.decp.app/api/v1/messages/ws?token=<token>`
- Message input sends via WS
- History loaded via REST (paginated, scroll-to-load-older)

### `/admin/analytics` (admin only)
- Cards: total users, active users today, total posts, total applications
- Line chart: new users per week (Recharts)
- Bar chart: job applications per week
- Top posts table

---

## 5. SWR Data Fetching Hooks

```ts
// lib/hooks/useFeed.ts
import useSWRInfinite from 'swr/infinite';
import api from '../api';

const fetcher = (url: string) => api.get(url).then(r => r.data.data);

export function useFeed() {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.cursor) return null;
    if (pageIndex === 0) return '/api/v1/feed/posts?limit=20';
    return `/api/v1/feed/posts?cursor=${previousPageData.cursor}&limit=20`;
  };

  const { data, size, setSize, isLoading } = useSWRInfinite(getKey, fetcher);

  const posts = data ? data.flatMap(d => d.posts) : [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === 'undefined');
  const hasMore = data ? !!data[data.length - 1]?.cursor : true;

  return { posts, isLoadingMore, hasMore, loadMore: () => setSize(size + 1) };
}
```

---

## 6. Push Notifications (Web)

```ts
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import api from './api';

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

export const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    });
    // Register token with notification-service
    await api.post('/api/v1/notifications/device-token', { token, platform: 'web' });
  }
}
```

---

## 7. Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_API_URL=https://api.decp.app
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

---

## 8. Key npm Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "axios": "^1.6.0",
    "swr": "^2.2.4",
    "zustand": "^4.4.7",
    "react-hook-form": "^7.49.2",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.2",
    "tailwindcss": "^3.4.0",
    "firebase": "^10.7.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.303.0"
  }
}
```

---

## 9. Vercel Deployment

1. Connect GitHub monorepo to Vercel
2. Set root directory to `web/`
3. Add environment variables in Vercel project settings
4. Vercel automatically deploys on push to `main` branch
5. Custom domain: configure `decp.app` CNAME to Vercel
6. Preview deployments: every PR gets a unique preview URL

---

## 10. Role-Based UI Behaviour

| Feature                | Student      | Alumni       | Admin        |
|------------------------|--------------|--------------|--------------|
| View feed              | Yes          | Yes          | Yes          |
| Create post            | Yes          | Yes          | Yes          |
| Post a job             | No           | Yes          | Yes          |
| Apply for a job        | Yes          | No           | No           |
| Create event           | No           | No           | Yes          |
| RSVP event             | Yes          | Yes          | Yes          |
| View analytics         | No           | No           | Yes          |
| Manage users           | No           | No           | Yes          |
