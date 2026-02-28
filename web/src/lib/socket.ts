import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token;
    const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3010';

    socket = io(REALTIME_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => console.log('[WS] Connected:', socket?.id));
    socket.on('connect_error', (e) => console.warn('[WS] Error:', e.message));
    socket.on('disconnect', () => console.log('[WS] Disconnected'));
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
