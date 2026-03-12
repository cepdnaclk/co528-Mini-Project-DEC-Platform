# Frontend Implementation Plan

> **Stack:** Next.js 14 (App Router) · TypeScript · Zustand · React Query · Socket.IO · Axios · Neumorphic CSS
> **API Reference:** `docs/API_CONTRACT.md`
> **Priority order:** P0 = blocking / critical · P1 = core feature · P2 = enhancement

---

## Table of Contents

1. [Global Infrastructure](#1-global-infrastructure)
2. [Messages & Chat Page](#2-messages--chat-page) ← most complex
3. [Feed Page](#3-feed-page)
4. [Profile Page](#4-profile-page)
5. [Jobs Page](#5-jobs-page)
6. [Events Page](#6-events-page)
7. [Research Page](#7-research-page)
8. [Notifications](#8-notifications)
9. [Admin Page](#9-admin-page)
10. [Implementation Order Summary](#10-implementation-order-summary)

---

## 1. Global Infrastructure

These must be done first — everything else depends on them.

---

### 1.1 Token Refresh Interceptor `P0`

**File:** `src/lib/api.ts`

**Current state:** On 401 the app logs out immediately. No token refresh attempted.

**What to add:** An Axios response interceptor that:
1. Catches 401 responses
2. Calls `POST /api/v1/auth/refresh` with the stored `refreshToken`
3. On success — updates the auth store with new `accessToken` + `refreshToken`, retries the original request
4. On failure (refresh also 401) — calls `logout()` and redirects to `/login`

```typescript
// Pattern to implement in api.ts
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      // call refresh, update store, retry
    }
    return Promise.reject(error);
  }
);
```

---

### 1.2 Socket Lifecycle — Tie to Auth `P0`

**File:** `src/lib/socket.ts`

**Current state:** Socket connects on first `getSocket()` call. Not explicitly disconnected on logout.

**What to add:**
- Export a `connectSocket(token)` function called after login/register
- Export `disconnectSocket()` called from `authStore.logout()`
- Add listener for `user:online` / `user:offline` events — store a `Set<string>` of online user IDs in a Zustand slice or React context so any component can query presence

```typescript
// New exports needed
export function connectSocket(token: string): Socket
export function disconnectSocket(): void
export function isUserOnline(userId: string): boolean
```

---

### 1.3 Auth Store — Add `refreshToken` field `P0`

**File:** `src/store/authStore.ts`

**Current state:** Only stores `accessToken` and `user`.

**What to add:**
```typescript
interface AuthState {
  token: string | null;          // accessToken
  refreshToken: string | null;   // NEW
  user: User | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}
```
Update `setAuth` calls in `login/page.tsx` and `register/page.tsx` to pass `refreshToken` from `data.refreshToken`.

---

### 1.4 Nav Badge Counts `P1`

**File:** `src/components/layout/AppShell.tsx`

**What to add:** On mount (and on socket events), fetch two badge counts and display them on nav items:

| Nav Item | API Call | Socket Trigger |
|----------|----------|---------------|
| Messages icon | `GET /api/v1/messages/unread-count` | `message` event |
| Notifications bell | `GET /api/v1/notifications/unread-count` | `notification` event |

Show a small dot or number badge (e.g. `<span className="badge-dot">5</span>`) next to the nav icon. Clear the badge when the user navigates to that page.

---

### 1.5 User Search Modal / Command Palette `P1`

**File:** New `src/components/UserSearchModal.tsx`

Needed by: Messages (start new chat), Profile (view others), Follow system.

**Trigger:** A search icon button in the top bar of AppShell.

**Behaviour:**
1. Open a modal with a text input
2. On input change (debounce 300ms): `GET /api/v1/users/search?q={query}`
3. Render results as user cards (avatar + name + role)
4. On click → navigate to `/profile/{userId}` OR start a chat conversation

---

## 2. Messages & Chat Page

**File:** `src/app/(app)/messages/page.tsx`

This is the most complex page. Below is a complete breakdown of every sub-feature.

---

### 2.1 Current State Assessment

| Feature | Status |
|---------|--------|
| Inbox list (conversations) | ✅ Working |
| Load conversation thread | ✅ Working |
| Send message | ✅ Working |
| Real-time receive (`message` event) | ✅ Working |
| `unreadCount` per conversation in inbox | ❌ Not displayed |
| Total unread badge in nav | ❌ Missing |
| Start new conversation (find user) | ❌ Missing |
| Typing indicators | ❌ Missing |
| Read receipts | ❌ Missing |
| Online/offline presence | ❌ Missing |
| Mark messages as read | ❌ Missing |
| Delete message | ❌ Missing |
| Empty state (no conversations) | ❌ Missing |

---

### 2.2 Inbox Panel Upgrades `P1`

**Unread count badge on each conversation row:**
- The inbox API already returns `unreadCount` per conversation
- Render a count bubble: `<span className="badge">{conv.unreadCount}</span>` next to the last message preview
- Bold the last message text when `unreadCount > 0`

**Online presence dot:**
- Each conversation row should show a green/grey dot next to the avatar
- Sourced from the `onlineUsers` Set (populated by `user:online` / `user:offline` socket events)
- Derive the `otherUserId` from `conversationId` (split by `_`, pick the one that is not `myUserId`)

**New Conversation Button:**
- A `+` / compose icon button at the top of the conversations panel
- Opens the User Search Modal (section 1.5)
- On user select → set that user as `activeUserId` (even if no conversation exists yet), show empty chat panel ready to type

**Empty State:**
- If inbox is empty: render a centred illustration + "No conversations yet. Find someone to message." with a button to open user search.

---

### 2.3 Chat Panel Upgrades `P1`

#### 2.3.1 Chat Header
Show in the header area of the active conversation:
- User avatar + name (derive `otherUserId` from `conversationId` and look up from a local cache or small `GET /api/v1/users/:id` call)
- Online presence indicator (green dot or "Online" / "Last seen...")
- Typing indicator text: `"Jane is typing..."` (appears below name, replaces "Online" label temporarily)

#### 2.3.2 Mark Messages as Read `P0`
When a conversation is **opened** or when new messages arrive while it is open:
1. Find messages in the thread where `recipientId === myUserId && isRead === false`
2. For each: call `PUT /api/v1/messages/:id/read`
3. This triggers the backend to emit `message:read` to the sender

**Socket listener:** `message:read`
```typescript
socket.on('message:read', ({ messageId, conversationId }) => {
  // Find message in state by messageId, set isRead = true
  // Show double-tick icon on that message bubble
});
```

#### 2.3.3 Read Receipt UI
On each message bubble sent by the current user, show:
- Single tick: message sent (saved to DB)
- Double tick (grey): message delivered to the other person's inbox
- Double tick (blue/filled): message read (`isRead === true`)

Use `isRead` field from the message object and update it live on `message:read` event.

#### 2.3.4 Typing Indicators `P1`

**Emit on input:**
```typescript
// Inside the message input onChange handler
let typingTimeout: ReturnType<typeof setTimeout>;

function handleInputChange(value: string) {
  setInputText(value);
  socket.emit('typing:start', { recipientId: otherUserId, conversationId });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { recipientId: otherUserId, conversationId });
  }, 1500);
}
```

**Listen and display:**
```typescript
socket.on('typing:start', ({ senderId, conversationId }) => {
  if (senderId === otherUserId) setIsTyping(true);
});
socket.on('typing:stop', ({ senderId }) => {
  if (senderId === otherUserId) setIsTyping(false);
});
```

Show a typing bubble at the bottom of the messages list:
```tsx
{isTyping && (
  <div className="chat-bubble theirs typing-indicator">
    <span /><span /><span />  {/* animated dots */}
  </div>
)}
```

Add CSS animation for the three dots.

#### 2.3.5 Message Delete `P2`

On hover over a sent message bubble (only for `senderId === myUserId`):
- Show a small trash icon or `...` menu
- On confirm: `DELETE /api/v1/messages/:id`
- Remove message from local state immediately (optimistic)

#### 2.3.6 Message Input Improvements `P1`

- **Enter to send** — already implemented ✅
- **Shift+Enter for newline** — add `onKeyDown` check: if `e.key === 'Enter' && !e.shiftKey` → send; else allow default
- **Disabled state** — disable input and button while sending (prevent double-send)
- **Auto-resize textarea** — replace `<input>` with `<textarea>` that auto-grows up to 4 lines

#### 2.3.7 Empty Chat State `P1`
When `activeUserId` is set but no messages have been loaded yet (or thread is empty):
```tsx
<div className="empty-chat">
  <Avatar user={otherUser} size="lg" />
  <p>Start a conversation with {otherUser.name}</p>
</div>
```

#### 2.3.8 Real-time Inbox Update on New Message `P1`

**Current bug:** When a `message` event arrives for a conversation not in the inbox (brand new sender), the inbox doesn't update.

**Fix:**
```typescript
socket.on('message', (msg) => {
  // Update messages array if this conversation is open
  if (msg.conversationId === activeConversationId) {
    setMessages(prev => [...prev, msg]);
    markAsRead(msg._id);
  }
  // Always update inbox — upsert conversation with new latest message
  setInbox(prev => {
    const exists = prev.find(c => c.conversationId === msg.conversationId);
    if (exists) {
      return prev.map(c => c.conversationId === msg.conversationId
        ? { ...msg, unreadCount: c.conversationId === activeConversationId ? 0 : (c.unreadCount ?? 0) + 1 }
        : c
      ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      return [{ ...msg, unreadCount: 1 }, ...prev];
    }
  });
});
```

---

### 2.4 Full Messages Page State Shape

```typescript
interface MessagesPageState {
  inbox: ConversationPreview[];          // inbox list
  activeUserId: string | null;           // selected conversation partner
  messages: Message[];                   // current thread
  inputText: string;
  isTyping: boolean;                     // other user typing
  isSending: boolean;                    // sending in progress
  onlineUsers: Set<string>;              // presence (global)
}

interface ConversationPreview {
  _id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  unreadCount: number;
  createdAt: string;
}

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}
```

---

## 3. Feed Page

**File:** `src/app/(app)/feed/page.tsx`

### 3.1 Comments System `P1`

**Current state:** Comment button renders the count but has no interaction.

**What to add:**

**Inline comment section** (toggle-able below each post card):
1. A `<CommentSection postId={post._id} />` component — lazy-loaded when user clicks the comment button
2. On expand: `GET /api/v1/feed/posts/:id/comments`
3. Render each comment as a compact row: avatar + name + content + timestamp
4. Input + "Reply" button at the bottom: `POST /api/v1/feed/posts/:id/comments { content }`
5. New comment prepended to list on success

```typescript
// State per post (map of postId → expanded: bool)
const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
```

### 3.2 Media Upload `P1`

**Current state:** Photo button is a non-functional placeholder.

**What to add:**
1. Hidden `<input type="file" accept="image/*,video/mp4,video/webm" multiple>` triggered by the camera icon
2. On file select (up to 4 files):
   a. Validate MIME type client-side against allowed types
   b. `POST /api/v1/feed/media/upload-url { mimeType, count }` → get `files[]`
   c. For each file: `PUT uploadUrl` with the raw `File` object and `Content-Type` header
   d. Show upload progress per file (simple progress bar)
   e. After all uploads: store `publicUrl[]` in component state
3. Show image previews below the textarea (removable)
4. On "Post": include `mediaUrls` in the post body

### 3.3 Edit & Delete Posts `P1`

Only show for posts where `post.authorId === myUserId`.

**Three-dot menu on each own post card:**
- **Edit** → toggle post content into an inline `<textarea>`, show Save/Cancel buttons → `PUT /api/v1/feed/posts/:id { content }`
- **Delete** → confirmation dialog → `DELETE /api/v1/feed/posts/:id` → remove from local state

### 3.4 Cursor Pagination / Infinite Scroll `P1`

**Current state:** Hardcoded `limit=20`, no way to load more.

**What to add:**
1. Store `nextCursor` from the API response
2. An "Load more" button (or `IntersectionObserver` for true infinite scroll) at the bottom of the feed
3. On trigger: `GET /api/v1/feed/posts?limit=20&cursor={nextCursor}` — append results to the list
4. Hide the button when `nextCursor` is `null`

### 3.5 Real-time `feed:new_post` — Improve UX `P1`

**Current state:** New post socket event triggers a full feed re-fetch.

**Better approach:**
- Prepend the incoming post directly to the state array (no re-fetch)
- OR show a "1 new post" pill at the top of the feed — user clicks to reveal it (like Twitter/X)

### 3.6 Trending Topics & Suggested Connections `P2`

**Current state:** Hardcoded strings in the sidebar.

**Suggested connections:** `GET /api/v1/users/search?q=` (random or filtered by role/skills) — display 3 users.

---

## 4. Profile Page

**File:** `src/app/(app)/profile/page.tsx`

### 4.1 Avatar Upload `P1`

Replace the static avatar initials with a real upload flow:

1. Wrap the avatar circle with a clickable overlay (camera icon appears on hover)
2. On click → hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`
3. On file select:
   a. `POST /api/v1/users/me/avatar { mimeType }` → `{ uploadUrl, publicUrl }`
   b. `PUT uploadUrl` with the file binary
   c. `PUT /api/v1/users/me/avatar { avatarUrl: publicUrl }` → update profile
4. Show the new avatar immediately (optimistic via `URL.createObjectURL(file)`)

### 4.2 View Other Users' Profiles `P1`

**New route:** `src/app/(app)/profile/[id]/page.tsx`

This page fetches `GET /api/v1/users/:id` and renders a **read-only** version of the profile card plus:
- Follow / Unfollow button (calls `POST /DELETE /api/v1/users/:id/follow`)
- Follower count + Following count (links to lists)
- Their posts: `GET /api/v1/feed/posts?authorId={id}`
- Message button → navigates to `/messages` with that user pre-selected

### 4.3 Own Profile — Followers / Following Tabs `P1`

Below the edit form on `/profile`, add two tabs:

| Tab | API |
|-----|-----|
| Followers | `GET /api/v1/users/me/followers` (uses `myUserId`) |
| Following | `GET /api/v1/users/me/following` |

Each tab renders a list of user rows (avatar + name + role + Message button + Unfollow button).

### 4.4 Own Profile — Follower/Following Counts `P1`

Display on the profile header: `12 Followers · 5 Following`

Source: `user.followers.length` and `user.following.length` from `GET /users/me`.

### 4.5 Skills Input Improvement `P2`

**Current state:** Skills are entered as a comma-separated string, split on save.

**Better:** Tag-style input — press Enter or comma to add a chip tag, click `×` to remove.

---

## 5. Jobs Page

**File:** `src/app/(app)/jobs/page.tsx`

### 5.1 Fix Apply Flow — CV URL `P0`

**Current bug:** Apply sends a hardcoded `coverLetter: "I am interested..."` and no `cvUrl`. Backend requires both fields.

**What to add:** An **Apply Modal** that opens when "Apply" is clicked:
```
Fields:
  Cover Letter (textarea, min 10 chars)
  CV URL       (text input, URL validated, placeholder: "https://drive.google.com/...")

Buttons: Cancel | Submit Application
```
On submit: `POST /api/v1/jobs/:id/apply { coverLetter, cvUrl }`

### 5.2 Search — Already Wired `P0`

The `?search=` query param is now supported by the backend. The current frontend already calls `GET /api/v1/jobs?search={query}`. **This is already working** — just verify no bugs.

### 5.3 Job Type Filter `P1`

Add filter chips above the job grid:
```
All | Internship | Full-time | Part-time | Contract
```
Append `&type={type}` to the API call. Clear search when type filter changes.

### 5.4 Job Detail Modal `P1`

On clicking a job card (not the Apply button): open a modal/drawer with full details:
- Full description (not truncated)
- All requirements as a bulleted list
- Poster name + posted date
- Apply button inside the modal

### 5.5 Post a Job (Alumni/Admin) `P1`

**Current state:** No create job UI.

**What to add:** Show a "+ Post Job" button in the top-right for `role === 'alumni' || role === 'admin'`.

**Create Job Modal/Form:**
```
Fields:
  Title       (text, required)
  Company     (text, required)
  Location    (text, required)
  Type        (select: internship | full-time | part-time | contract)
  Description (textarea, required)
  Requirements (tag input, optional)
```
API: `POST /api/v1/jobs { title, company, location, type, description, requirements }`

### 5.6 Application Status Tracking (My Applications) `P1`

**New tab on Jobs page:** "My Applications"

- Keep a local list of job IDs the student has applied to (or fetch from the backend — since we don't have a `GET /my-applications` endpoint, track this in localStorage or Zustand persisted state)
- Show application date and current `status` (`pending` / `accepted` / `rejected`)

### 5.7 Manage Applications (Alumni/Admin) `P1`

On a job card that `posterId === myUserId`: show an "Applications (N)" button.

Opens a modal with the applications list from `GET /api/v1/jobs/:id/applications`. Each row has:
- Applicant name + CV link
- Cover letter (expandable)
- Status dropdown: `PUT /api/v1/jobs/:id/applications/:appId { status }` (pending → accepted / rejected)

---

## 6. Events Page

**File:** `src/app/(app)/events/page.tsx`

### 6.1 Cancel RSVP `P1`

**Current state:** Only "RSVP" button. No way to cancel.

After RSVP, the button should toggle to "Cancel RSVP":
- Track RSVP state: derive from `event.participantIds.includes(myUserId)` OR store locally after POST
- On cancel: `DELETE /api/v1/events/:id/rsvp`

To know which events the user has RSVP'd to: `GET /api/v1/events` returns the full `participantIds` array inside the event data from `GET /events/:id`. Use the list endpoint which includes `rsvpCount` but not `participantIds`, so either:
- Track RSVPs in local/Zustand state after each action
- OR call `GET /api/v1/events/:id` to get `participantIds` when showing the detail

### 6.2 Event Detail Modal `P1`

On clicking an event card: open a modal with:
- Full title + description
- Date (formatted), Location
- RSVP count + Attendees list (avatars, from `GET /api/v1/events/:id/attendees`)
- RSVP / Cancel RSVP button

### 6.3 Create Event (Admin only) `P1`

Show "+ Create Event" button for `role === 'admin'`.

**Create Event Modal:**
```
Fields:
  Title       (text, required, min 3)
  Description (textarea, required, min 10)
  Event Date  (datetime-local input)
  Location    (text, required)
```
API: `POST /api/v1/events { title, description, eventDate, location }`

After creation: prepend to events list.

### 6.4 Sort & Filter `P2`

- Sort by: Upcoming (default) | Newest
- Filter: Upcoming only (eventDate >= now) toggle

---

## 7. Research Page

**File:** `src/app/(app)/research/page.tsx`

### 7.1 Create Project `P1`

**Current state:** "+ New Project" button is a non-functional placeholder.

**Create Project Modal:**
```
Fields:
  Title       (text, required)
  Description (textarea, required)
  Domain      (text, required, e.g. "Machine Learning")
  Tags        (tag input, optional)
```
API: `POST /api/v1/research { title, description, domain, tags }`

### 7.2 Leave Project `P1`

For projects where `project.collaboratorIds.includes(myUserId)`:
- Change "Join" button to "Leave"
- On click: `DELETE /api/v1/research/:id/leave`
- Remove user from local collaborator list

### 7.3 Project Detail Modal `P1`

On click of project card: open modal with:
- Full title + description
- Domain + Tags
- Status badge + creator name
- Collaborator count + avatars (from `collaboratorIds`)
- Join / Leave button
- "Update Status" dropdown for creator: `PUT /api/v1/research/:id { status }` (open | in_progress | completed)

### 7.4 Filter by Status / Domain `P2`

Filter chips:
```
Status: All | Open | In Progress | Completed
```
Append `?status={status}` to the API call.

Domain filter: a dropdown or chips — map to `?domain={domain}`.

---

## 8. Notifications

**File:** `src/app/(app)/notifications/page.tsx`

### 8.1 Mark All as Read `P1`

**Current state:** Only per-notification "Mark as read" button.

Add a "Mark all as read" button at the top of the page:
- `PUT /api/v1/notifications/read-all`
- Set all `isRead = true` in local state
- Hide unread dot on all items

### 8.2 Notification Link Navigation `P1`

**Current state:** `notification.link` field is stored but not used.

Each notification card should be clickable — navigate to `notification.link` on click (e.g. `/posts/64f1...`).

### 8.3 Unread Count Badge in AppShell `P1`

See section 1.4. The bell icon in the sidebar and top bar should show the unread count.

- On mount: `GET /api/v1/notifications/unread-count` → store count
- On `notification` socket event: increment count
- On navigating to `/notifications`: reset count to 0

### 8.4 Cursor Pagination `P2`

The notifications API supports cursor pagination. Add "Load more" button:
- Track `nextCursor` from response
- On click: `GET /api/v1/notifications?limit=20&cursor={nextCursor}`, append results

---

## 9. Admin Page

**File:** `src/app/(app)/admin/page.tsx`

### 9.1 Route Guard `P0`

**Current state:** Admin page is accessible to any authenticated user. Role check is only on the nav link visibility.

**Add server-side or client-side guard:**
```typescript
// At top of admin page component
const { user } = useAuthStore();
if (user?.role !== 'admin') redirect('/feed');
```

### 9.2 Responsive Metrics Grid `P1`

The 5-column grid collapses poorly on smaller screens. Adjust to:
```css
/* 1 col mobile → 2 col tablet → 3 col desktop → 5 col wide */
grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
```

---

## 10. Implementation Order Summary

### Phase 1 — Blocking / Correctness (do first)

| # | Task | File(s) | API |
|---|------|---------|-----|
| 1 | Add `refreshToken` to auth store | `store/authStore.ts` | — |
| 2 | Implement token refresh interceptor | `lib/api.ts` | `POST /auth/refresh` |
| 3 | Fix job apply — CV URL modal | `jobs/page.tsx` | `POST /jobs/:id/apply` |
| 4 | Tie socket connect/disconnect to auth | `lib/socket.ts`, `authStore.ts` | — |
| 5 | Admin route guard | `admin/page.tsx` | — |

### Phase 2 — Core Chat Features

| # | Task | File(s) | API / Socket |
|---|------|---------|-------------|
| 6 | Display `unreadCount` on inbox rows | `messages/page.tsx` | inbox response |
| 7 | Mark messages as read on open | `messages/page.tsx` | `PUT /messages/:id/read` |
| 8 | `message:read` listener → double-tick UI | `messages/page.tsx` | `message:read` event |
| 9 | Typing indicators (emit + listen) | `messages/page.tsx` | `typing:start/stop` events |
| 10 | Online presence dot on inbox rows | `messages/page.tsx` | `user:online/offline` events |
| 11 | Fix inbox update for new conversation | `messages/page.tsx` | `message` event |
| 12 | New conversation button + user search | `messages/page.tsx`, new `UserSearchModal.tsx` | `GET /users/search` |
| 13 | Empty states (inbox + chat panel) | `messages/page.tsx` | — |
| 14 | Message delete (sender only) | `messages/page.tsx` | `DELETE /messages/:id` |

### Phase 3 — Core Social Features

| # | Task | File(s) | API |
|---|------|---------|-----|
| 15 | Comments expand/collapse + add comment | `feed/page.tsx`, new `CommentSection.tsx` | `GET/POST /feed/posts/:id/comments` |
| 16 | Edit/delete own posts | `feed/page.tsx` | `PUT/DELETE /feed/posts/:id` |
| 17 | Post media upload | `feed/page.tsx` | `POST /feed/media/upload-url` + R2 PUT |
| 18 | Feed cursor pagination / load more | `feed/page.tsx` | `GET /feed/posts?cursor=` |
| 19 | Mark all notifications read | `notifications/page.tsx` | `PUT /notifications/read-all` |
| 20 | Notification link navigation | `notifications/page.tsx` | — |
| 21 | Nav unread badges (messages + notifications) | `AppShell.tsx` | `GET /messages/unread-count`, `GET /notifications/unread-count` |

### Phase 4 — Profile & Social Graph

| # | Task | File(s) | API |
|---|------|---------|-----|
| 22 | Avatar upload flow | `profile/page.tsx` | `POST/PUT /users/me/avatar` + R2 PUT |
| 23 | Own profile — follower/following counts + tabs | `profile/page.tsx` | `GET /users/me` + `GET /users/:id/followers` |
| 24 | Other user profile page | new `profile/[id]/page.tsx` | `GET /users/:id`, `POST/DELETE /users/:id/follow` |
| 25 | User search modal (global) | new `UserSearchModal.tsx` | `GET /users/search` |
| 26 | Profile — their posts tab | `profile/[id]/page.tsx` | `GET /feed/posts?authorId=` |

### Phase 5 — Content Creation & Management

| # | Task | File(s) | API |
|---|------|---------|-----|
| 27 | Create event modal (admin) | `events/page.tsx` | `POST /events` |
| 28 | Cancel RSVP | `events/page.tsx` | `DELETE /events/:id/rsvp` |
| 29 | Event detail modal + attendees | `events/page.tsx` | `GET /events/:id/attendees` |
| 30 | Create research project modal | `research/page.tsx` | `POST /research` |
| 31 | Leave research project | `research/page.tsx` | `DELETE /research/:id/leave` |
| 32 | Research project detail modal + update status | `research/page.tsx` | `PUT /research/:id` |
| 33 | Post a job modal (alumni/admin) | `jobs/page.tsx` | `POST /jobs` |
| 34 | Job detail modal | `jobs/page.tsx` | `GET /jobs/:id` |
| 35 | Manage applications (alumni/admin) | `jobs/page.tsx` | `GET /jobs/:id/applications`, `PUT /jobs/:id/applications/:appId` |
| 36 | Job type filter chips | `jobs/page.tsx` | `GET /jobs?type=` |

---

## Appendix A — Reusable Components to Create

These components will be used across multiple pages:

| Component | Used By | Props |
|-----------|---------|-------|
| `UserSearchModal.tsx` | Messages, AppShell | `onSelect: (user) => void`, `isOpen`, `onClose` |
| `CommentSection.tsx` | Feed | `postId: string` |
| `MediaUploader.tsx` | Feed (post), Profile (avatar) | `onUpload: (urls: string[]) => void`, `accept`, `maxFiles` |
| `Modal.tsx` | Jobs, Events, Research | `title`, `children`, `isOpen`, `onClose` |
| `ConfirmDialog.tsx` | Delete post, Delete message | `message`, `onConfirm`, `onCancel` |
| `UserCard.tsx` | Profile page, Search results | `user`, `showFollow?`, `showMessage?` |
| `Avatar.tsx` | Everywhere | `user`, `size`, `showPresence?` |
| `InfiniteList.tsx` | Feed, Notifications | `fetchFn`, `renderItem` |

---

## Appendix B — Socket Event Subscription Map

Where each socket event should be subscribed:

| Event | Subscribe In | Action |
|-------|-------------|--------|
| `message` | `messages/page.tsx`, `AppShell` (badge) | Append to thread, update inbox, increment badge |
| `message:sent` | `messages/page.tsx` | Append sent message (multi-tab) |
| `message:read` | `messages/page.tsx` | Update `isRead` on sent message |
| `typing:start` | `messages/page.tsx` | Show typing bubble |
| `typing:stop` | `messages/page.tsx` | Hide typing bubble |
| `user:online` | Global context / AppShell | Add to `onlineUsers` Set |
| `user:offline` | Global context / AppShell | Remove from `onlineUsers` Set |
| `notification` | `notifications/page.tsx`, `AppShell` (badge) | Prepend notification, increment badge, show toast |
| `feed:new_post` | `feed/page.tsx` | Show "new post" pill or prepend |

---

## Appendix C — Environment & API URL Notes

```bash
# .env.local (already configured)
NEXT_PUBLIC_API_URL=http://localhost:8082      # all REST calls via gateway
NEXT_PUBLIC_REALTIME_URL=http://localhost:3010 # socket.io direct (not via gateway)
```

All REST calls use `src/lib/api.ts` (axios instance with JWT interceptor).
Socket.io uses `src/lib/socket.ts` which connects to `NEXT_PUBLIC_REALTIME_URL`.

---

*Plan generated March 2026 — based on API_CONTRACT.md and codebase audit*
