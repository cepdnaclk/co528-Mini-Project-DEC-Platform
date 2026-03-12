import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { disconnectSocket } from '@/lib/socket';

interface User {
  userId: string;
  role: 'student' | 'alumni' | 'admin';
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  patchUser: (patch: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) => set({ token, refreshToken, user }),
      patchUser: (patch) => set(s => ({ user: s.user ? { ...s.user, ...patch } : null })),
      logout: () => { disconnectSocket(); set({ token: null, refreshToken: null, user: null }); },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'decp-auth' }
  )
);
