import { io, Socket } from 'socket.io-client';
import { REALTIME_URL } from '@/lib/config';

let socket: Socket | null = null;
const onlineUsers = new Set<string>();
const presenceListeners = new Set<() => void>();

function notifyPresenceListeners() {
  presenceListeners.forEach((fn) => fn());
}

function replaceOnlineUsers(userIds: string[]) {
  onlineUsers.clear();
  userIds.forEach((userId) => onlineUsers.add(userId));
  notifyPresenceListeners();
}

function setUserOnlineState(userId: string, online: boolean) {
  if (online) onlineUsers.add(userId);
  else onlineUsers.delete(userId);
  notifyPresenceListeners();
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  disconnectSocket(); // clean up any stale socket

  socket = io(REALTIME_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('[WS] Connected:', socket?.id));
  socket.on('connect_error', (e) => console.warn('[WS] Error:', e.message));
  socket.on('disconnect', () => {
    console.log('[WS] Disconnected');
    replaceOnlineUsers([]);
  });

  socket.on('presence:init', ({ userIds }: { userIds: string[] }) => {
    replaceOnlineUsers(userIds);
  });

  socket.on('presence:sync', ({ userIds }: { userIds: string[] }) => {
    replaceOnlineUsers(userIds);
  });

  socket.on('user:online', ({ userId }: { userId: string }) => {
    setUserOnlineState(userId, true);
  });

  socket.on('user:offline', ({ userId }: { userId: string }) => {
    setUserOnlineState(userId, false);
  });

  return socket;
}

export function getSocket(): Socket | null {
  if (socket?.connected) return socket;

  try {
    const { useAuthStore } = require('@/store/authStore');
    const token = useAuthStore.getState().token;
    if (token) return connectSocket(token);
  } catch {
    // ignore
  }
  return null;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  replaceOnlineUsers([]);
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export async function refreshUserPresence(userId: string): Promise<boolean> {
  const ws = getSocket();
  if (!ws) return false;

  return new Promise<boolean>((resolve) => {
    const query = () => {
      ws.emit('presence:query', { targetUserId: userId }, (resp?: { online?: boolean }) => {
        const online = !!resp?.online;
        setUserOnlineState(userId, online);
        resolve(online);
      });
    };

    if (ws.connected) {
      query();
      return;
    }

    const timeout = setTimeout(() => resolve(false), 3000);
    ws.once('connect', () => {
      clearTimeout(timeout);
      query();
    });
  });
}

export async function fetchUserPresence(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${REALTIME_URL}/presence/${userId}`);
    const payload = await response.json();
    const online = !!payload?.data?.online;
    setUserOnlineState(userId, online);
    return online;
  } catch {
    return isUserOnline(userId);
  }
}

/** Subscribe to presence changes. Returns an unsubscribe function. */
export function onPresenceChange(fn: () => void): () => void {
  presenceListeners.add(fn);
  return () => presenceListeners.delete(fn);
}
